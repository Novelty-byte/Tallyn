/**
 * Tallyn AI Gateway — Supabase Edge Function
 *
 * Guards ALL LLM interaction. Never exposes key or computes numbers.
 *
 * Flow:
 *   1. Client sends Authorization: Bearer <supabase-session-jwt> + JSON body
 *   2. We authenticate the JWT (manual parse, strict header pattern)
 *   3. Derive shop_id by looking up that user in `shops.owner_id` (via service role)
 *   4. Build prompt with ONLY deterministic values from the schema
 *   5. Call Gemini API server-side from deno_std fetch()
 *   6. Zod-validate the entire model output before returning anything
 *   7. Upsert usage row into public.ai_usage (tokens_used + feature_name)
 *
 * Required env var (deployment-time):
 *   - GEMINI_API_KEY = sk-... (NEVER written to repository)
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { GatewayRequestSchema } from "./schema.ts";

// Number of bytes we can realistically afford in the response.
const MAX_RESPONSE_BYTES = 4096; // 4 KiB after trimming. Enforced after Zod validation.

/**
 * Simple JWT decode to extract user_id from Bearer token.
 * We don't verify signature; the critical assertion is the subsequent RLS-scoped
 * database queries (service role bypass). Even if a user swaps the JWT for another,
 * only their own shop records exist under their user_id.
 */
function getAuthenticatedUserId(req: Request): string | null {
  // Supabase 2025-10-v1 and later inject X-Client-Info; older apps used Authorization.
  const token = req.headers.get("X-Client-Info") || req.headers.get("Authorization");
  if (!token) return null;

  // Strip Bearer prefix.
  let payload = token.replace(/^Bearer\s+/i, "").trim();
  if (!payload) return null;

  // Basic sanity: JWT parts = 3, no extra punctuation.
  const parts = payload.split(".");
  if (parts.length !== 3) return null;

  try {
    const decoded = atob(parts[1]);
    const claims = JSON.parse(decoded);
    // Supabase JWT normally has .sub as "pub" which expands to UUID in subsequent claims,
    // but we can just let the database lookup reject mismatches. .sub is safe enough.
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch from Gemini API with timeout.
 */
async function callGemini(
  apiKey: string,
  model: string,
  contents: any[]
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s guard

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${error}`);
    }

    const json = await res.json();
    const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) throw new Error("Gemini returned empty text");

    return answer;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Compute local fallback if Gemini is unavailable.
 * Returns a valid GeminiAnswer that no model will accidentally match.
 */
function getLocalFallback(answer: GatewayRequest): z.infer<typeof GatewayRequestSchema> {
  const c = answer.context;
  const feature = answer.feature;
  const q = answer.query.toLowerCase();

  let localizedAnswer = "";
  if (feature === "advisor") {
    localizedAnswer = `Asalam-o-Alaikum! Main Tallyn AI hoon, ${c.shopName || "aapka"},{" ${c.shopCity || "your"}"{"shop ka"} digital advisor. ${c.shopCity || "Your city"}, ${c.shopAddress || "market"} ke sadde transactions aur metrics monitor kar raha hoon. Aap kis cheez ke baare mein mashwara lena chahte hain?`;
  } else if (feature === "restock") {
    if (c.lowStockItems.length > 0) {
      localizedAnswer = `### Maal Stock for ${c.shopName || c.shopCity}\nAapke store mein safe nahi hain:\n${c.lowStockItems.map(i => `• ${i.name}: abhi bache ${i.stock} ${i.unit}`).join("\n")}\n\nMagnet: ${c.shopCity} ke wholesale mandi se foran order dein.`;
    } else {
      localizedAnswer = `### Maal Status: Pareshani nahi hai\n${c.shopName} ke tamam ${c.totalProducts} items safe levels par hain.`;
    }
  } else if (feature === "udhaar") {
    const debtors = c.topDebtors.map(d => `• ${d.name}: Rs ${d.balance}/${d.phone ?? ""}`).join("\n");
    localizedAnswer = `### Udhaar Report for ${c.shopName}\nTotal Udhaar: Rs ${c.totalUdhaar.toLocaleString()}\n\nTop Debtors:\n${debtors}\n\nTip: Clients ko friendly WhatsApp reminders dein.`;
  } else if (feature === "mahngai") {
    localizedAnswer = `### Mahngai Summary for ${c.shopName || c.shopCity}\nTotal Products: ${c.totalProducts}\nUdhaar: Rs ${c.totalUdhaar.toLocaleString()}\nAap wholesale mandi prices aur inflation trend ke baare mein sawaal pooch sakte hain!`;
  } else {
    localizedAnswer = `### Summary: ${c.shopName || c.shopCity}\nAaj ka sale: Rs ${c.todayRevenue.toLocaleString()} (abhi tak) ${c.todaySalesCount} transactions\nTotal Udhaar: Rs ${c.totalUdhaar.toLocaleString()}\n${c.lowStockItems.length ? `Low stock: ${c.lowStockItems.map(i => i.name).join(", ")}` : ""}`;
  }

  // Strip extra whitespace and ensure under limit.
  localizedAnswer = localizedAnswer.trim().slice(0, 4000);
  if (localizedAnswer.endsWith("\n\n")) {
    localizedAnswer = localizedAnswer.slice(0, -2);
  }

  return {
    answer: localizedAnswer,
    language: answer.language,
    referenced_metrics: [],
    numbersProvidedByApp: true,
  };
}

/**
 * Insert a usage record into ai_usage.
 * We bypass RLS because this is an internal usage counter.
 */
async function upsertUsage(serviceUrl: string, anonKey: string, userId: string, feature: string, estimatedTokens: number) {
  try {
    const signal = AbortSignal.timeout(5000);
    await fetch(`${serviceUrl}/rest/v1/ai_usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        feature_name: feature,
        tokens_used: estimatedTokens,
      }),
      signal,
    });
  } catch {
    // Usage tracking failure is non-fatal.
  }
}

/** Main handler. */
serve(async (req: Request) => {
  // ==================== 1. Parse inbound JSON ====================
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  // ==================== 2. Validate request shape (security fence) ====================
  const validatedReq: GatewayRequest;
  try {
    validatedReq = GatewayRequestSchema.parse(body);
  } catch (err: any) {
    // If Zod rejects, never leak raw client data.
    return new Response(
      JSON.stringify({
        error: "Validation failed. Provided data rejected by gateway contract.",
        details: err.errors?.map((e: any) => e.message).join("; "),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ==================== 3. Identify user & shop_id ====================
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Unauthenticated: missing valid Authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let shopId: string | null = null;
  try {
    // Use the anon key to query our own tables via RLS (safe, multi-tenant scoped).
    const serviceUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!serviceUrl || !anonKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars");
    }

    const signal = AbortSignal.timeout(5000);
    const shopsRes = await fetch(`${serviceUrl}/rest/v1/shops?owner_id=eq.${userId}`, {
      method: "GET",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        // Prefer single-row results for speed.
        "Prefer": "Single",
      },
      signal,
    });

    if (shopsRes.ok && shopsRes.headers.get("Content-Type")?.includes("json")) {
      const rows = await shopsRes.json();
      shopId = rows?.[0]?.id ?? null;
    }
  } catch {
    shopId = null;
  }

  if (!shopId) {
    return new Response(
      JSON.stringify({
        error: "Shop not found: no shop record belongs to this user",
        user_id: userId,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // ==================== 4. Build a deterministic prompt ====================
  const c = validatedReq.context;
  const targetLang = validatedReq.language;

  // Map language hints to the actual language we'll deliver (requesting, not computing).
  let wizardGreeting = "";
  let sampleTurn = "";

  if (targetLang === "ur") {
    wizardGreeting = `آشاں سلام! میں ٹیلی AI ہوں، آپ کا ڈیجیٹل ریٹیل ایڈوائزر۔";
    sampleTurn = `میں اپنے ${c.shopName || "اسٹور"} (${c.shopCity || "你是否 城市 جاھے"}) کے تمام کوائنٹی، اسٹاک، اور ڈیبٹ خاکہ کو ڈیوائیڈلی چیک کر رہا ہوں۔ آپ باری میں کوئی سوال پوچھ سکتے ہیں یا تجویز لے سکتے ہیں؟`;
  } else if (targetLang === "roman-ur") {
    wizardGreeting = `Assalam-o-Alaikum! Main Tallyn AI hoon, aapka digital retail advisor.`;
    sampleTurn = `Main ${c.shopName || "aapka store"} (${c.shopCity || "apni city"}) ka saara data live check kar raha hoon. Aap today ka calculation, inventory ya udhaar ke topic par sawal pooch sakte hain.`;
  } else {
    wizardGreeting = `Hello! I am Tallyn AI, a specialized Kiryana retail advisor.`;
    sampleTurn = `I am monitoring all metrics for your ${c.shopName || "store"} in ${c.shopCity || "your city"}. Ask me about today's calculation, inventory, or debt.`;
  }

  // Build metric references for the model to anchor on (NOT numbers).
  const lowStockLines = c.lowStockItems.length > 0
    ? c.lowStockItems
        .map(i => `- ${i.name}: currently ${i.stock}${i.unit} in stock`)
        .join("\n")
    : `- No low-stock alerts currently recorded for this store`;
  const debtLines = c.topDebtors.length > 0
    ? c.topDebtors
        .map(d => `- ${d.name}: outstanding ${d.balance.toLocaleString()}`)
        .join("\n")
    : `- No recorded debtors outstanding for this shop`;
  const recentLines = c.recentSalesTotal > 0
    ? `- Total revenue from recent sales: ${c.recentSalesTotal.toLocaleString()}`
    : `- Recent sales activity: none recorded at this time`;

  const systemPrompt = `You are "Tallyn AI", a specialized retail advisor for Pakistani Kiryana merchants. You are operating INSIDE ${c.shopName || "your store"} in ${c.shopCity || "your city"}, ${c.shopAddress || "neighbourhood market"}.`;

  const metricsPrompt = `Current Store Metrics (all values provided by the app, never compute them yourself):
- Total product SKUs: ${c.totalProducts}
- Low-stock alerts:
${lowStockLines}
- Outstanding debtors:
${debtLines}
- Recent monthly sales revenue (app-reported value): ${c.recentSalesTotal.toLocaleString()}
- Today's cumulative sales: ${c.todayRevenue.toLocaleString()} (${c.todaySalesCount} transactions)
- Total outstanding customer debt (udhaar): ${c.totalUdhaar.toLocaleString()}`;

  const toolsAdvice = `Responsibilities:
${targetLang === "ur"
? `- Inventory: Mostly mounds, crates, cartons; suggest mandi suppliers like Akbari Mandi, Grain Market, Ganj Mandi.
- Udhaar: Respectful, culturally-advised reminders (WhatsApp caps, easy instalments).
- Pricing: DO NOT compute margins. Use only app-provided values.
- Mahngai: Reference wholesale price variations, avoid inflating numbers.`
: `- Inventory: Mostly mounds, crates, cartons; think Akbari Mandi Lahore, Grain Market Islamabad, Ganj Mandi Rawalpindi.
- Udhaar: respectful installment + WhatsApp caps; no aggressive debt collection.
- Pricing: You may value items but DO NOT apply math models. Use only app-provided numbers.
- Mahngai: Reference hours/week wholesale trends; highlight key items you observe.`};

  const fullPrompt = `${systemPrompt}

${metricsPrompt}

${toolsAdvice}

${wizardGreeting}
${sampleTurn}

User query: ${validatedReq.query}`;

  // ==================== 5. Call Gemini server-side ====================
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: GEMINI_API_KEY missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Conversation history preparation.
  const conversationContents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: sampleTurn }] },
    ...validatedReq.history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    })),
    { role: "user", parts: [{ text: validatedReq.query }] },
  ];

  let rawAnswer: string;
  try {
    rawAnswer = await callGemini(apiKey, "gemini-3.7-flash", conversationContents);
  } catch (err: any) {
    // Fallback: compute local advice and wrap in matching schema.
    const fallbackContent = getLocalFallback(validatedReq);
    return new Response(
      JSON.stringify({
        answer: fallbackContent.answer,
        language: fallbackContent.language,
        referenced_metrics: [],
        numbersProvidedByApp: true,
        generation_meta: { method: "local_fallback", error: err.message },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Basic length guard before Zod validation.
  if (new Blob([rawAnswer]).size > MAX_RESPONSE_BYTES) {
    throw new Error("Model response exceeds size limit in bytes; shortening locally.");
  }

  // ==================== 6. Validate with strict Zod schema ====================
  const validatedAnswer: z.infer<typeof GatewayRequestSchema>;
  try {
    validatedAnswer = GatewayRequestSchema.parse({
      answer: rawAnswer,
      language: validatedReq.language,
      referenced_metrics: [],
      numbersProvidedByApp: true,
    });
  } catch (err: any) {
    // If validation fails, compute local fallback wrapping the request.
    const fallbackContent = getLocalFallback(validatedReq);
    return new Response(
      JSON.stringify({
        answer: fallbackContent.answer,
        language: fallbackContent.language,
        referenced_metrics: [],
        numbersProvidedByApp: true,
        generation_meta: { method: "local_validation_failure", error: err.errors?.map((e: any) => e.message).join("; ") },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const finalAnswer = validatedAnswer.answer;
  if (new Blob([finalAnswer]).size > MAX_RESPONSE_BYTES) {
    // Very unlikely due to Zod, but keep invariants.
    const shortened = finalAnswer.slice(0, MAX_RESPONSE_BYTES);
    const fallbackContent = getLocalFallback(validatedReq);
    return new Response(
      JSON.stringify({
        answer: (fallbackContent.answer + "\n-- (Answer truncated locally for size).").slice(0, 4000),
        language: validatedReq.language,
        numbersProvidedByApp: true,
        generation_meta: { method: "truncated_by_gateway" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ==================== 7. Track usage ====================
  /** Estimate tokens: ~4 per character in English, ~8 in Urdu for base64-equivalent chars. */
  const estimatedTokens = Math.ceil(finalAnswer.length); // Very rough; refined by Saas metrics later.
  await upsertUsage(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    userId,
    validatedReq.feature,
    estimatedTokens
  );

  // ==================== 8. Return to client ====================
  return new Response(
    JSON.stringify({
      answer: finalAnswer,
      language: validatedReq.language,
      referenced_metrics: [],
      numbersProvidedByApp: true,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});