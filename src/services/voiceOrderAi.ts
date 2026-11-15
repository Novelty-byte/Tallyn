/**
 * Voice checkout through Gemini (ai-gateway, mode "order").
 *
 * The AI only proposes which catalogue products were meant and how many were spoken.
 * Every product id it returns is checked again here against the catalogue on this device,
 * prices always come from that catalogue, and the cashier confirms in VoiceConfirmSheet.
 * Callers keep the offline matcher (domain/voiceParser) as the fallback (Rule 5).
 */
import { parseVoiceOrder, type VoiceCandidate, type VoiceCustomer, type VoiceLine, type VoiceProduct } from "@/domain/voiceParser";
import { AskTallynError, postGateway } from "@/services/tallynAi";

/** A spoken order should come back quickly; after this the cashier keeps the offline match. */
const ORDER_TIMEOUT_MS = 45_000; // a little over the gateway's own 40 s limit

export interface AiVoiceOrder {
  lines: VoiceLine[];
  paymentType: "cash" | "credit" | null;
  customerId: string | null;
}

interface RawLine {
  heard?: unknown;
  productId?: unknown;
  qty?: unknown;
  confidence?: unknown;
  alternatives?: unknown;
}

/** Validate the gateway's `order` against the local catalogue. Exported for tests. */
export function toAiVoiceOrder(
  raw: unknown,
  products: VoiceProduct[],
  customers: VoiceCustomer[],
): AiVoiceOrder {
  const obj = (raw ?? {}) as { lines?: unknown; paymentType?: unknown; customerId?: unknown };
  if (!Array.isArray(obj.lines)) throw new AskTallynError("bad_response", "Tallyn AI returned an unreadable order.");
  const known = new Set(products.map((p) => p.id));

  const lines: VoiceLine[] = (obj.lines as RawLine[]).slice(0, 30).map((l, i) => {
    const heard = typeof l.heard === "string" ? l.heard.slice(0, 120) : "";
    const productId = typeof l.productId === "string" && known.has(l.productId) ? l.productId : null;
    const qtyNum = typeof l.qty === "number" && Number.isFinite(l.qty) ? Math.round(l.qty) : 1;
    const qty = Math.min(99, Math.max(1, qtyNum));
    const conf = typeof l.confidence === "number" && Number.isFinite(l.confidence) ? l.confidence : 0;
    const confidence = productId ? Math.min(1, Math.max(0, conf)) : 0;

    // "Best matches" in the sheet: the AI's pick and alternatives first, then the offline
    // matcher's suggestions for the same words, so a wrong pick is one tap from right.
    const aiAlts = Array.isArray(l.alternatives)
      ? l.alternatives.filter((a): a is string => typeof a === "string" && known.has(a) && a !== productId)
      : [];
    const offline = heard ? parseVoiceOrder(heard, products).lines.flatMap((x) => x.candidates) : [];
    const candidates: VoiceCandidate[] = [];
    const add = (id: string, score: number) => {
      if (!candidates.some((c) => c.id === id)) candidates.push({ id, score });
    };
    if (productId) add(productId, confidence);
    aiAlts.forEach((id) => add(id, Math.min(confidence, 0.5)));
    offline.forEach((c) => add(c.id, Math.min(c.score, 0.4)));

    return { key: `ai${i}`, segment: heard, productId, qty, confidence, candidates: candidates.slice(0, 5) };
  });

  const paymentType = obj.paymentType === "credit" || obj.paymentType === "cash" ? obj.paymentType : null;
  const customerId = typeof obj.customerId === "string" && customers.some((c) => c.id === obj.customerId) ? obj.customerId : null;
  return { lines, paymentType, customerId };
}

export async function readVoiceOrderWithAi(opts: {
  transcript: string;
  alternatives?: string[];
  products: Array<VoiceProduct & { unit?: string }>;
  customers: VoiceCustomer[];
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<AiVoiceOrder> {
  const body = await postGateway(
    {
      mode: "order",
      transcript: opts.transcript.slice(0, 500),
      alternatives: (opts.alternatives ?? []).filter(Boolean).slice(0, 4).map((a) => a.slice(0, 500)),
      catalog: opts.products.slice(0, 600).map((p) => ({
        id: p.id,
        name: (p.nameEn || p.name || "").slice(0, 120),
        ...(p.nameUr ? { nameUr: p.nameUr.slice(0, 120) } : {}),
        ...(p.unit ? { unit: p.unit.slice(0, 16) } : {}),
      })),
      customers: opts.customers.slice(0, 400).map((c) => ({ id: c.id, name: c.name.slice(0, 80) })),
    },
    opts.accessToken,
    opts.signal,
    ORDER_TIMEOUT_MS,
  );
  return toAiVoiceOrder(body.order, opts.products, opts.customers);
}
