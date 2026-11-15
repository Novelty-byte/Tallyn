/**
 * Tallyn — Supplier Bill Scanner (Supabase Edge Function, Deno)
 *
 * POST { image: { mimeType: "image/jpeg" | "image/png" | "image/webp", data: <base64> } }
 *  → 200 { readable, supplier, invoiceNumber, billDate, billTotal, lines[] }
 *
 * - The Gemini key stays here (GEMINI_API_KEY secret); the browser never sees it.
 * - The model only READS the bill. It is told to copy numbers exactly as printed and
 *   never to calculate; unit-cost derivation, catalog matching and price-rise alerts
 *   happen in tested app code (src/domain/billMatching.ts). Rule 1: zero hallucinated numbers.
 * - Output is Zod-validated; anything malformed is rejected, never passed through.
 * - Text inside the photo is untrusted data, never instructions.
 * - Nothing is written to the shop's books here. The app shows an editable review
 *   sheet and only the shopkeeper's confirmation calls record_purchase.
 * - Abuse control (table ai_scan_usage, migration 006):
 *     signed-in user: USER_DAILY_LIMIT scans / 24h
 *     demo visitor (no session): DEMO_IP_DAILY_LIMIT per IP / 24h and
 *     DEMO_GLOBAL_DAILY_LIMIT across all demo visitors / 24h.
 *
 * Secrets: GEMINI_API_KEY (required). A key starting "AIza" calls Gemini's native API; any
 * other key is sent to the OpenAI-compatible endpoint AI_BASE_URL (default Google's
 * https://generativelanguage.googleapis.com/v1beta/openai/). GEMINI_MODEL (optional, default
 * gemini-3.5-flash; "models/gemini-3.5-flash" also works), AI_BASE_URL, SUPABASE_URL,
 * SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase).
 * Deploy with "Verify JWT" OFF — this function authenticates callers itself so demo
 * visitors (who only hold the publishable key) can be served under the demo limits.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  RequestSchema, extractBillText, parseModelText, DEFAULT_MODEL,
} from "./extract.ts";

const USER_DAILY_LIMIT = 40;
const DEMO_IP_DAILY_LIMIT = 6;
const DEMO_GLOBAL_DAILY_LIMIT = 200;
const MAX_BODY_BYTES = 7 * 1024 * 1024; // ~5 MB image after base64 overhead

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* -------------------------------- helpers -------------------------------- */

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function verifiedUserId(req: Request, supabaseUrl: string, anonKey: string): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  // Only a 3-part JWT that Supabase Auth accepts counts as a signed-in user;
  // the anon/publishable key or an expired session is served as a demo visitor.
  if (!token || token === anonKey || token.split(".").length !== 3) return null;
  const { data, error } = await createClient(supabaseUrl, anonKey).auth.getUser(token);
  return error || !data?.user?.id ? null : data.user.id;
}

/* -------------------------------- handler -------------------------------- */

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
  const aiBaseUrl = Deno.env.get("AI_BASE_URL") || undefined;

  if (!supabaseUrl || !anonKey || !serviceKey || !geminiKey) {
    return json(503, { error: "Bill scanning isn't configured on the server yet." });
  }

  // ---- body (size-capped before parsing) ----
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "That photo is too large. Please retake it." });
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const reqParse = RequestSchema.safeParse(parsedBody);
  if (!reqParse.success) return json(400, { error: "Request rejected: expected one JPEG/PNG/WebP image." });
  const { mimeType, data } = reqParse.data.image;

  // ---- who is asking + rate limits ----
  const admin = createClient(supabaseUrl, serviceKey);
  const userId = await verifiedUserId(req, supabaseUrl, anonKey);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let ipHash: string | null = null;

  if (userId) {
    const { count, error } = await admin
      .from("ai_scan_usage").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", since);
    if (error) return json(503, { error: "Scanner usage check failed. Please try again." });
    if ((count ?? 0) >= USER_DAILY_LIMIT) {
      return json(429, { error: `You've used today's ${USER_DAILY_LIMIT} bill scans. Enter this bill by hand, or scan again tomorrow.` });
    }
  } else {
    ipHash = await sha256Hex(`${clientIp(req)}|${serviceKey.slice(-16)}`);
    const [perIp, global] = await Promise.all([
      admin.from("ai_scan_usage").select("id", { count: "exact", head: true })
        .is("user_id", null).eq("ip_hash", ipHash).gte("created_at", since),
      admin.from("ai_scan_usage").select("id", { count: "exact", head: true })
        .is("user_id", null).gte("created_at", since),
    ]);
    if (perIp.error || global.error) return json(503, { error: "Scanner usage check failed. Please try again." });
    if ((perIp.count ?? 0) >= DEMO_IP_DAILY_LIMIT) {
      return json(429, { error: `The demo allows ${DEMO_IP_DAILY_LIMIT} bill scans a day. Sign up to scan more, or enter the bill by hand.` });
    }
    if ((global.count ?? 0) >= DEMO_GLOBAL_DAILY_LIMIT) {
      return json(429, { error: "The demo scanner is busy today. Sign up to scan your own bills, or enter this one by hand." });
    }
  }

  // Count the attempt BEFORE calling the model so failed/abusive calls still count.
  const { data: usageRow } = await admin
    .from("ai_scan_usage")
    .insert({ user_id: userId, ip_hash: ipHash, status: "started", image_bytes: Math.round((data.length * 3) / 4) })
    .select("id").single();
  const finish = (status: string, lineCount = 0) =>
    usageRow?.id
      ? admin.from("ai_scan_usage").update({ status, line_count: lineCount }).eq("id", usageRow.id).then(() => undefined, () => undefined)
      : Promise.resolve();

  // ---- model ----
  let modelText: string;
  try {
    modelText = await extractBillText({
      apiKey: geminiKey, model, baseUrl: aiBaseUrl, mimeType, data: data.replace(/\s+/g, ""),
    });
  } catch (err) {
    console.error("bill-scan model error:", err instanceof Error ? err.message : err);
    await finish("model_error");
    return json(502, { error: "The scanner couldn't read the bill right now. Please try again or enter it by hand." });
  }

  const scan = parseModelText(modelText);
  if (!scan.ok) {
    console.error("bill-scan rejected model output:", scan.reason, "issues" in scan ? scan.issues : "");
    await finish(scan.reason);
    return json(502, { error: "The scanner returned an unexpected answer. Please try again." });
  }

  const lines = scan.data.lines.filter((l) => l.name.length > 0);
  if (!scan.data.readable || lines.length === 0) {
    await finish("unreadable");
    return json(422, {
      error: "Couldn't find any items on this photo. Lay the bill flat in good light with the whole bill in frame.",
    });
  }

  await finish("ok", lines.length);
  return json(200, { ...scan.data, lines });
});
