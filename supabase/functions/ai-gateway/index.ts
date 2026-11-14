/**
 * Tallyn AI Gateway (Supabase Edge Function, Deno)
 *
 * POST { question, history[], snapshot }  →  200 { answer }
 *
 * - The AI key lives only here (GEMINI_API_KEY secret). The browser never sees it.
 * - `snapshot` is computed by the app in tested code (src/domain/storeSnapshot.ts) and is
 *   re-validated/clamped here (schema.ts). The model is told to quote only those
 *   numbers and never calculate new ones (Rule 1).
 * - Names inside the snapshot are untrusted text, sanitised and fenced as data.
 * - Read-only: this function never writes to the shop's books.
 * - Abuse control (table ai_chat_usage, migration 007), per rolling 24 h:
 *     signed-in user: USER_DAILY_LIMIT questions
 *     demo visitor:   DEMO_IP_DAILY_LIMIT per IP, DEMO_GLOBAL_DAILY_LIMIT in total
 *
 * Secrets (shared with bill-scan): GEMINI_API_KEY, GEMINI_MODEL, optional AI_BASE_URL /
 * AI_TIMEOUT_MS. SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected.
 * Deploy with "Verify JWT" OFF — callers are authenticated here so demo visitors can ask.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AskRequestSchema, AnswerSchema } from "./schema.ts";
import { askModel, DEFAULT_MODEL } from "./chat.ts";

const USER_DAILY_LIMIT = 150;
const DEMO_IP_DAILY_LIMIT = 30;
const DEMO_GLOBAL_DAILY_LIMIT = 1500;
const MAX_BODY_BYTES = 200_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

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
  if (!token || token === anonKey || token.split(".").length !== 3) return null;
  const { data, error } = await createClient(supabaseUrl, anonKey).auth.getUser(token);
  return error || !data?.user?.id ? null : data.user.id;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
  const baseUrl = Deno.env.get("AI_BASE_URL") || undefined;

  if (!supabaseUrl || !anonKey || !serviceKey || !apiKey) {
    return json(503, { error: "Tallyn AI isn't configured on the server yet." });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "Request too large." });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, {
      error: "Request rejected by the Tallyn AI contract.",
      details: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }

  // ---- rate limits ----
  const admin = createClient(supabaseUrl, serviceKey);
  const userId = await verifiedUserId(req, supabaseUrl, anonKey);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let ipHash: string | null = null;

  if (userId) {
    const { count, error } = await admin.from("ai_chat_usage").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", since);
    if (error) return json(503, { error: "Usage check failed. Please try again." });
    if ((count ?? 0) >= USER_DAILY_LIMIT) {
      return json(429, { error: `You've asked ${USER_DAILY_LIMIT} questions today. Tallyn AI will be back tomorrow.` });
    }
  } else {
    ipHash = await sha256Hex(`${clientIp(req)}|${serviceKey.slice(-16)}`);
    const [perIp, global] = await Promise.all([
      admin.from("ai_chat_usage").select("id", { count: "exact", head: true })
        .is("user_id", null).eq("ip_hash", ipHash).gte("created_at", since),
      admin.from("ai_chat_usage").select("id", { count: "exact", head: true })
        .is("user_id", null).gte("created_at", since),
    ]);
    if (perIp.error || global.error) return json(503, { error: "Usage check failed. Please try again." });
    if ((perIp.count ?? 0) >= DEMO_IP_DAILY_LIMIT) {
      return json(429, { error: `The demo allows ${DEMO_IP_DAILY_LIMIT} questions a day. Sign up to keep asking.` });
    }
    if ((global.count ?? 0) >= DEMO_GLOBAL_DAILY_LIMIT) {
      return json(429, { error: "The demo assistant is busy today. Sign up to keep asking." });
    }
  }

  const { data: usageRow } = await admin.from("ai_chat_usage")
    .insert({ user_id: userId, ip_hash: ipHash, status: "started" })
    .select("id").single();
  const finish = (status: string, chars = 0) =>
    usageRow?.id
      ? admin.from("ai_chat_usage").update({ status, answer_chars: chars }).eq("id", usageRow.id).then(() => undefined, () => undefined)
      : Promise.resolve();

  // ---- model ----
  let text: string;
  try {
    text = await askModel({ apiKey, model, baseUrl, req: parsed.data });
  } catch (err) {
    console.error("ask-tallyn model error:", err instanceof Error ? err.message : err);
    await finish("model_error");
    return json(502, { error: "Tallyn AI couldn't answer right now." });
  }

  const answer = AnswerSchema.safeParse(text.replace(/```/g, "").replace(/<\/?[a-z][^>]*>/gi, ""));
  if (!answer.success) {
    await finish("empty_answer");
    return json(502, { error: "Tallyn AI returned an empty answer." });
  }

  await finish("ok", answer.data.length);
  return json(200, { answer: answer.data });
});
