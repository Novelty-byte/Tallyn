/**
 * Tallyn AI Gateway (Supabase Edge Function, Deno)
 *
 * POST { question, history[], snapshot }                 →  200 { answer }
 * POST { question, history[], snapshot, refs }           →  200 { answer, action, notFound }
 *   (refs = products/customers; the model may propose ONE action for the shopkeeper to approve)
 * POST { ..., mode: "radio", radio: { language, script } } →  200 { answer, spoken }
 *   (one Kiryana Radio tip; `spoken` is the same tip in the listener voice's script, or null)
 * POST { mode: "order", transcript, alternatives[], catalog[], customers[] } → 200 { order }
 *   (voice checkout: maps what the cashier said onto catalogue ids; see order.ts)
 *
 * - The AI key lives only here (GEMINI_API_KEY secret). The browser never sees it.
 * - `snapshot` is computed by the app in tested code (src/domain/storeSnapshot.ts) and is
 *   re-validated/clamped here (schema.ts). The model is told to quote only those
 *   numbers and never calculate new ones (Rule 1).
 * - Names inside the snapshot are untrusted text, sanitised and fenced as data.
 * - Read-only: this function never writes to the shop's books.
 * - Abuse control (table ai_chat_usage, migration 007), per rolling 24 h. Voice orders
 *   are counted separately (status "order_…") so a busy counter can't use up the chat quota:
 *     questions: USER_DAILY_LIMIT per user; demo DEMO_IP_DAILY_LIMIT per IP, DEMO_GLOBAL_DAILY_LIMIT total
 *     orders:    ORDER_USER_DAILY_LIMIT per user; demo ORDER_DEMO_IP_DAILY_LIMIT per IP, ORDER_DEMO_GLOBAL_DAILY_LIMIT total
 *
 * Secrets (shared with bill-scan): GEMINI_API_KEY, GEMINI_MODEL, AI_BASE_URL (primary), and
 * OPENROUTER_API_KEY (backups; optional OPENROUTER_MODELS), optional AI_TIMEOUT_MS. Every call
 * tries the primary first, then each backup model (providers.ts). SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected.
 * Deploy with "Verify JWT" OFF — callers are authenticated here so demo visitors can ask.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AskRequestSchema, AnswerSchema } from "./schema.ts";
import { askModel, generate, parseRadioTip } from "./chat.ts";
import { providersFromEnv, type AttemptLog } from "./providers.ts";
import { buildOrderPrompt, buildOrderUserTurn, OrderRequestSchema, resolveOrder } from "./order.ts";
import { parseAgentReply } from "./agent.ts";

// deno-lint-ignore no-explicit-any
type UsageQuery = any; // supabase-js filter builder; its generics don't survive a helper signature

const USER_DAILY_LIMIT = 150;
const DEMO_IP_DAILY_LIMIT = 30;
const DEMO_GLOBAL_DAILY_LIMIT = 1500;
const ORDER_USER_DAILY_LIMIT = 600;
const ORDER_DEMO_IP_DAILY_LIMIT = 60;
const ORDER_DEMO_GLOBAL_DAILY_LIMIT = 2000;
/** A voice order must come back fast; the app falls back to its offline matcher after this. */
const ORDER_TIMEOUT_MS = 40_000;
/** Per provider, so a slow primary still leaves time for a backup. */
const ORDER_ATTEMPT_MS = 20_000;

/** Log which providers failed before one answered (only when a backup was needed). */
function logFallback(what: string, attempts: AttemptLog[]) {
  if (attempts.length > 1) {
    console.warn(`${what}: answered by ${attempts[attempts.length - 1].provider} after`, attempts.slice(0, -1).map((a) => `${a.provider}: ${a.error}`).join("; "));
  }
}
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
  const providers = providersFromEnv();

  if (!supabaseUrl || !anonKey || !serviceKey || providers.length === 0) {
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
  const isOrder = (body as { mode?: unknown } | null)?.mode === "order";
  const parsed = isOrder ? OrderRequestSchema.safeParse(body) : AskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, {
      error: "Request rejected by the Tallyn AI contract.",
      details: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  const limits = isOrder
    ? { user: ORDER_USER_DAILY_LIMIT, ip: ORDER_DEMO_IP_DAILY_LIMIT, global: ORDER_DEMO_GLOBAL_DAILY_LIMIT, noun: "voice orders" }
    : { user: USER_DAILY_LIMIT, ip: DEMO_IP_DAILY_LIMIT, global: DEMO_GLOBAL_DAILY_LIMIT, noun: "questions" };
  // Orders and questions are counted in separate buckets of the same table ("order_…" statuses).
  const st = (status: string) => (isOrder ? `order_${status}` : status);

  // ---- rate limits ----
  const admin = createClient(supabaseUrl, serviceKey);
  const userId = await verifiedUserId(req, supabaseUrl, anonKey);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let ipHash: string | null = null;
  const usageCount = (filter: (q: UsageQuery) => UsageQuery) => {
    const q = admin.from("ai_chat_usage").select("id", { count: "exact", head: true }).gte("created_at", since);
    const scoped = isOrder ? q.like("status", "order%") : q.not("status", "like", "order%");
    return filter(scoped);
  };

  if (userId) {
    const { count, error } = await usageCount((q) => q.eq("user_id", userId));
    if (error) return json(503, { error: "Usage check failed. Please try again." });
    if ((count ?? 0) >= limits.user) {
      return json(429, { error: `You've used ${limits.user} ${limits.noun} today. Tallyn AI will be back tomorrow.` });
    }
  } else {
    ipHash = await sha256Hex(`${clientIp(req)}|${serviceKey.slice(-16)}`);
    const [perIp, global] = await Promise.all([
      usageCount((q) => q.is("user_id", null).eq("ip_hash", ipHash!)),
      usageCount((q) => q.is("user_id", null)),
    ]);
    if (perIp.error || global.error) return json(503, { error: "Usage check failed. Please try again." });
    if ((perIp.count ?? 0) >= limits.ip) {
      return json(429, { error: `The demo allows ${limits.ip} ${limits.noun} a day. Sign up to keep going.` });
    }
    if ((global.count ?? 0) >= limits.global) {
      return json(429, { error: "The demo AI is busy today. Sign up to keep going." });
    }
  }

  const { data: usageRow } = await admin.from("ai_chat_usage")
    .insert({ user_id: userId, ip_hash: ipHash, status: st("started") })
    .select("id").single();
  const finish = (status: string, chars = 0) =>
    usageRow?.id
      ? admin.from("ai_chat_usage").update({ status: st(status), answer_chars: chars }).eq("id", usageRow.id).then(() => undefined, () => undefined)
      : Promise.resolve();

  // ---- voice order ----
  if (parsed.data.mode === "order") {
    const orderReq = parsed.data;
    let text: string;
    try {
      const r = await generate(providers, {
        system: buildOrderPrompt(orderReq),
        turns: [{ role: "user", text: buildOrderUserTurn(orderReq) }],
        // Matching a short order needs no long reasoning; thinking off is several times faster
        // and was just as accurate in tests (misheard brands, Urdu script, udhaar + customer).
        json: true, temperature: 0, maxTokens: 4096, thinking: "off",
      }, {
        perAttemptMs: ORDER_ATTEMPT_MS,
        budgetMs: ORDER_TIMEOUT_MS,
        // A reply we can't turn into an order counts as a failure: try the next model.
        accept: (t) => resolveOrder(t, orderReq) !== null,
      });
      text = r.text;
      logFallback("voice-order", r.attempts);
    } catch (err) {
      console.error("voice-order: no provider answered:", err instanceof Error ? err.message : err);
      await finish("model_error");
      return json(502, { error: "Tallyn AI couldn't read this order right now." });
    }
    const order = resolveOrder(text, orderReq)!;
    await finish("ok", text.length);
    return json(200, { order });
  }

  // ---- question / radio tip ----
  let text: string;
  try {
    const r = await askModel({ providers, req: parsed.data });
    text = r.text;
    logFallback(parsed.data.mode === "radio" ? "radio-tip" : "ask-tallyn", r.attempts);
  } catch (err) {
    console.error("ask-tallyn: no provider answered:", err instanceof Error ? err.message : err);
    await finish("model_error");
    return json(502, { error: "Tallyn AI couldn't answer right now." });
  }

  const agent = parsed.data.mode === "chat" && parsed.data.refs ? parseAgentReply(text, parsed.data.refs) : null;
  const replyText = agent
    ? agent.answer || (agent.action ? "I've prepared this for you. Please check it and tap Approve." : "")
    : text;
  const answer = AnswerSchema.safeParse(replyText.replace(/```/g, "").replace(/<\/?[a-z][^>]*>/gi, ""));
  if (!answer.success) {
    await finish("empty_answer");
    return json(502, { error: "Tallyn AI returned an empty answer." });
  }

  await finish("ok", answer.data.length);
  if (parsed.data.mode === "radio") {
    const tip = parseRadioTip(answer.data);
    return json(200, { answer: tip.text, spoken: tip.spoken });
  }
  if (agent) return json(200, { answer: answer.data, action: agent.action, notFound: agent.notFound });
  return json(200, { answer: answer.data });
});
