/**
 * Tallyn Edge Function Gateway Client
 * Sends authenticated requests to /functions/v1/ai-gateway with the
 * caller's Supabase session JWT. The server verifies the JWT, derives
 * the shop_id itself, calls Gemini server-side, and Zod-validates its
 * own output. On any failure the caller falls back to deterministic
 * local advice (CLAUDE.md Rule 5: fail-open graceful degradation).
 */

export type GatewayFeature = "advisor" | "restock" | "udhaar" | "mahngai";
export type GatewayLanguage = "en" | "ur" | "roman-ur";

export interface GatewayContext {
  shopName: string;
  shopCity: string;
  shopAddress?: string;
  totalProducts: number;
  lowStockItems: Array<{ name: string; stock: number; unit: string }>;
  topDebtors: Array<{ name: string; balance: number; phone?: string }>;
  totalUdhaar: number;
  todaySalesCount: number;
  todayRevenue: number;
}

export interface GatewayCallProps {
  accessToken: string;
  feature: GatewayFeature;
  query: string;
  language: GatewayLanguage;
  context: GatewayContext;
  history?: Array<{ role: "user" | "model"; text: string }>;
}

export interface GatewayAnswer {
  answer: string;
  language: GatewayLanguage;
  referenced_metrics: string[];
  numbersProvidedByApp: boolean;
}

/**
 * Calls the ai-gateway Edge Function. Throws on network/validation
 * failure — callers must catch and render local fallback advice.
 */
export async function callGateway({
  accessToken,
  feature,
  query,
  language,
  context,
  history = [],
}: GatewayCallProps): Promise<GatewayAnswer> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL for gateway call");
  }
  if (!accessToken) {
    throw new Error("No Supabase session token available");
  }

  // Clamp client-side so the strict gateway contract never rejects us.
  const payload = {
    feature,
    query: query.slice(0, 1000),
    language,
    context: {
      shopName: (context.shopName || "Store").slice(0, 120),
      shopCity: (context.shopCity || "Pakistan").slice(0, 120),
      ...(context.shopAddress ? { shopAddress: context.shopAddress.slice(0, 200) } : {}),
      totalProducts: Math.max(0, Math.round(context.totalProducts)),
      lowStockItems: context.lowStockItems.slice(0, 5).map((i) => ({
        name: (i.name || "item").slice(0, 100),
        stock: Math.max(0, Math.round(i.stock)),
        unit: (i.unit || "unit").slice(0, 20),
      })),
      topDebtors: context.topDebtors.slice(0, 4).map((d) => ({
        name: (d.name || "customer").slice(0, 100),
        balance: Math.max(0, Math.round(d.balance)),
        ...(d.phone ? { phone: d.phone.slice(0, 20) } : {}),
      })),
      totalUdhaar: Math.max(0, Math.round(context.totalUdhaar)),
      todaySalesCount: Math.max(0, Math.round(context.todaySalesCount)),
      todayRevenue: Math.max(0, Math.round(context.todayRevenue)),
    },
    history: history
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) })),
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-gateway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gateway error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const body = await response.json();
  // Light client-side shape check (the gateway already Zod-validated its own output).
  if (typeof body?.answer !== "string" || !body.answer) {
    throw new Error("Gateway returned a malformed AI response");
  }

  return {
    answer: body.answer,
    language: (body.language as GatewayLanguage) ?? language,
    referenced_metrics: Array.isArray(body.referenced_metrics) ? body.referenced_metrics : [],
    numbersProvidedByApp: body.numbersProvidedByApp === true,
  };
}
