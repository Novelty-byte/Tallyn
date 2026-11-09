/**
 * Tallyn AI Gateway — Supabase Edge Function
 *
 * Guards ALL LLM interaction. Never exposes the API key, never lets the
 * model compute numbers.
 *
 * Flow:
 *   1. Client sends Authorization: Bearer <supabase-user-jwt> + JSON body
 *   2. We VERIFY the JWT via supabase.auth.getUser() (signature-checked)
 *   3. Derive shop_id from shops.owner_id for that verified user
 *   4. Build prompt from ONLY schema-validated, deterministic inputs
 *   5. Call Gemini server-side (key stays on the edge)
 *   6. Zod-validate the model output (GeminiAnswerSchema) before returning
 *   7. Track usage in ai_usage with the service role key (bypasses RLS)
 *
 * Required env vars (deployment-time, set in Dashboard -> Secrets):
 *   - GEMINI_API_KEY
 *   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto-injected
 *     by Supabase on deploy, but read defensively here)
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  GatewayRequestSchema,
  GeminiAnswerSchema,
  type GatewayRequest,
  type GeminiAnswer,
} from "./schema.ts";

/** Gemini call timeout. */
const GEMINI_TIMEOUT_MS = 25_000;

/* ------------------------------------------------------------------ */
/* 1. Auth: verify the caller's Supabase JWT properly                  */
/* ------------------------------------------------------------------ */

async function getVerifiedUserId(req: Request, supabaseUrl: string, anonKey: string): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === anonKey) {
    // Must be a USER session JWT, not the bare anon key.
    return null;
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

/* ------------------------------------------------------------------ */
/* 2. Shop lookup (tenant isolation)                                   */
/* ------------------------------------------------------------------ */

async function getFirstShopId(_supabaseUrl: string, _anonKey: string, userId: string): Promise<string | null> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey) return null;
  const admin = createClient(_supabaseUrl, serviceKey);
  const { data, error } = await admin
    .from("shops")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (!error && data?.id) return data.id as string;
  return null;
}

/* ------------------------------------------------------------------ */
/* 3. Gemini call                                                      */
/* ------------------------------------------------------------------ */

async function callGemini(apiKey: string, model: string, contents: unknown[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 1024 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const json = await res.json();
    const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) throw new Error("Gemini returned empty text");
    return answer as string;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Strip code fences / ask the model output to be JSON-parseable. */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Remove markdown fences if the model added them despite instructions.
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(withoutFences);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 4. Local deterministic fallback (graceful degradation)              */
/* ------------------------------------------------------------------ */

function buildFallbackAnswer(reqData: GatewayRequest): GeminiAnswer {
  const c = reqData.context;
  let text: string;

  switch (reqData.feature) {
    case "restock":
      text = c.lowStockItems.length > 0
        ? `${c.shopName ?? "Aapka store"}: yeh items low stock par hain: ${c.lowStockItems
            .map((i) => `${i.name} (${i.stock} ${i.unit} baaki)`)
            .join(", ")}. Wholesale mandi se foran order karein.`
        : `${c.shopName ?? "Aapka store"}: tamam ${c.totalProducts} items healthy stock levels par hain.`;
      break;
    case "udhaar": {
      const total = c.totalUdhaar.toLocaleString();
      const top = c.topDebtors
        .slice(0, 5)
        .map((d) => `${d.name}: Rs ${d.balance.toLocaleString()}`)
        .join(", ");
      text = `Total udhaar Rs ${total} hai.${top ? ` Sab se zyada: ${top}.` : ""} Mehribani kar ke WhatsApp reminder bhejein.`;
      break;
    }
    case "mahngai":
      text = `Aaj ke wholesale benchmark: ${c.totalProducts} SKUs track ho rahe hain, total udhaar Rs ${c.totalUdhaar.toLocaleString()}. Inflation alerts ke liye Mahngai Watchdog panel dekhein.`;
      break;
    default:
      text = `Aaj ki sale Rs ${c.todayRevenue.toLocaleString()} (${c.todaySalesCount} transactions), total udhaar Rs ${c.totalUdhaar.toLocaleString()}. Aap inventory, udhaar ya wholesale pricing ke bare mein pooch sakte hain.`;
  }

  // Sanitize: strip any fence/script markers defensively.
  text = text.replace(/```/g, "").replace(/<script/gi, "").trim().slice(0, 3900);

  return {
    answer: text,
    language: reqData.language === "ur" ? "ur" : reqData.language === "en" ? "en" : "roman-ur",
    referenced_metrics: [],
    numbersProvidedByApp: true,
  };
}

/* ------------------------------------------------------------------ */
/* 5. Usage tracking (service role, RLS-bypassing, non-fatal)          */
/* ------------------------------------------------------------------ */

async function trackUsage(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  feature: string,
  estimatedTokens: number,
): Promise<void> {
  if (!serviceKey) return;
  try {
    const admin = createClient(supabaseUrl, serviceKey);
    await admin.from("ai_usage").insert({
      user_id: userId,
      feature_name: feature,
      tokens_used: estimatedTokens,
    });
  } catch {
    // Non-fatal: never block the answer because of analytics.
  }
}

/* ------------------------------------------------------------------ */
/* 6. Main handler                                                     */
/* ------------------------------------------------------------------ */

serve(async (req: Request) => {
  // CORS for browser clients.
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

  if (!supabaseUrl || !anonKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: SUPABASE_URL / SUPABASE_ANON_KEY missing" }),
      { status: 500, headers: corsHeaders },
    );
  }

  // ---- 1. Verify the user JWT (signature-checked via auth.getUser) ----
  const userId = await getVerifiedUserId(req, supabaseUrl, anonKey);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Unauthenticated: valid Supabase user session required" }),
      { status: 401, headers: corsHeaders },
    );
  }

  // ---- 2. Parse + validate inbound body ----
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
  }

  const parsedReq = GatewayRequestSchema.safeParse(body);
  if (!parsedReq.success) {
    // Never echo raw client data back.
    return new Response(
      JSON.stringify({
        error: "Validation failed: request rejected by gateway contract.",
        details: parsedReq.error.errors.map((e) => e.message).join("; ").slice(0, 500),
      }),
      { status: 400, headers: corsHeaders },
    );
  }
  const reqData = parsedReq.data;

  // ---- 3. Tenant isolation: shop must belong to the verified user ----
  const shopId = await getFirstShopId(supabaseUrl, anonKey, userId);
  if (!shopId) {
    return new Response(
      JSON.stringify({ error: "Forbidden: no shop record belongs to this user" }),
      { status: 403, headers: corsHeaders },
    );
  }

  // ---- 4. Build the prompt: deterministic values only, model never computes ----
  const c = reqData.context;
  const langName = reqData.language === "ur"
    ? "Urdu (اردو, in Arabic script)"
    : reqData.language === "en"
      ? "English"
      : "Roman Urdu (Urdu written in Latin letters)";

  const systemPrompt = [
    `You are "Tallyn AI", a warm retail advisor for Pakistani kiryana (neighbourhood grocery) merchants.`,
    `You are assisting the owner of "${c.shopName ?? "their store"}" in ${c.shopCity ?? "their city"}.`,
    ``,
    `Store metrics (pre-computed by the app; repeat them verbatim, NEVER calculate, estimate or derive new numbers):`,
    `- Total product SKUs: ${c.totalProducts}`,
    `- Today's revenue: Rs ${c.todayRevenue.toLocaleString()} across ${c.todaySalesCount} transactions`,
    `- Total outstanding udhaar (customer credit): Rs ${c.totalUdhaar.toLocaleString()}`,
    c.lowStockItems.length > 0
      ? `- Low stock: ${c.lowStockItems.map((i) => `${i.name} (${i.stock} ${i.unit} left)`).join(", ")}`
      : `- Low stock: none recorded`,
    c.topDebtors.length > 0
      ? `- Top debtors: ${c.topDebtors.map((d) => `${d.name} (Rs ${d.balance.toLocaleString()})`).join(", ")}`
      : `- Top debtors: none recorded`,
    ``,
    `Rules:`,
    `1. Reply ONLY in ${langName}.`,
    `2. Use ONLY the metrics above. Do not invent, compute or estimate any number.`,
    `3. Keep the reply under 120 words, warm, practical, kiryana-appropriate.`,
    `4. Respond with ONLY a JSON object, no markdown, matching exactly:`,
    `   {"answer": "<your reply>", "language": "${reqData.language}", "referenced_metrics": ["<metric names you used>"], "numbersProvidedByApp": true}`,
  ].join("\n");

  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    ...reqData.history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: reqData.query }] },
  ];

  // ---- 5. Call Gemini; fall back locally on any failure ----
  let rawModelText: string | null = null;
  let modelError: string | null = null;

  if (geminiKey) {
    try {
      rawModelText = await callGemini(geminiKey, "gemini-3.7-flash", contents);
    } catch (err) {
      modelError = err instanceof Error ? err.message : "unknown Gemini error";
    }
  } else {
    modelError = "GEMINI_API_KEY not configured";
  }

  let finalAnswer: GeminiAnswer | null = null;

  if (rawModelText) {
    const candidate = extractJson(rawModelText);
    if (candidate) {
      const parsedAnswer = GeminiAnswerSchema.safeParse(candidate);
      if (parsedAnswer.success) {
        finalAnswer = parsedAnswer.data;
      }
    }
    // If the model wrapped the answer in prose instead of JSON, fall back.
  }

  if (!finalAnswer) {
    finalAnswer = buildFallbackAnswer(reqData);
  }

  // ---- 6. Track usage (non-fatal) ----
  await trackUsage(supabaseUrl, serviceKey, userId, reqData.feature, Math.ceil(finalAnswer.answer.length / 4));

  // ---- 7. Return ----
  return new Response(
    JSON.stringify({
      answer: finalAnswer.answer,
      language: finalAnswer.language,
      referenced_metrics: finalAnswer.referenced_metrics,
      numbersProvidedByApp: true,
      ...(modelError && rawModelText === null ? { generation_meta: { method: "local_fallback", error: modelError.slice(0, 200) } } : {}),
    }),
    { status: 200, headers: corsHeaders },
  );
});
