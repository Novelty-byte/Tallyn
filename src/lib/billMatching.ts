// Supplier-bill line → catalog product matching, plus the per-line numbers the
// review sheet shows. Pure and deterministic (Rule 1): the AI only *reads* the bill;
// matching, unit costs, total checks and price-rise alerts are all computed here.

import type { Product } from "@/types";

/* ------------------------------ normalisation ------------------------------ */

const UNIT_ALIASES: Record<string, string> = {
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", gr: "g",
  l: "l", lt: "l", ltr: "l", ltrs: "l", litre: "l", litres: "l", liter: "l", liters: "l",
  ml: "ml",
};

/** Roman-Urdu / Urdu-English shop words → one canonical token. */
const SYNONYMS: Record<string, string> = {
  atta: "flour", aata: "flour", ata: "flour", maida: "flour",
  cheeni: "sugar", chini: "sugar", cheni: "sugar",
  chai: "tea", patti: "tea", pati: "tea",
  doodh: "milk", dudh: "milk",
  dal: "daal", dhal: "daal", dhaal: "daal",
  chawal: "rice", chaawal: "rice",
  namak: "salt",
  sabun: "soap", saboon: "soap",
  mirch: "chilli", chili: "chilli", chilly: "chilli",
  tel: "oil",
  banaspati: "ghee", ghi: "ghee",
  anday: "eggs", ande: "eggs", anda: "eggs", egg: "eggs",
  biscuits: "biscuit", biskut: "biscuit",
};

const STOPWORDS = new Set([
  "the", "and", "of", "with", "for", "a", "an", "x", "pcs", "pc", "piece", "pieces",
  "pack", "packet", "pkt", "pouch", "bag", "bottle", "box", "carton", "ctn", "tin", "jar",
  "new", "special", "brand", "nos", "no", "qty",
]);

/** Size tokens look like "1l", "450g", "10kg". */
const isSizeToken = (t: string) => /^\d+(\.\d+)?(kg|g|l|ml)$/.test(t);

export function normalizeName(raw: string): string[] {
  let s = raw.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  // Join number + unit ("1 ltr" → "1l", "450 gms" → "450g", "1.5ltr" → "1.5l").
  s = s.replace(/(\d+(?:\.\d+)?)\s*([a-z]+)\b/g, (m, n: string, u: string) =>
    UNIT_ALIASES[u] ? `${Number(n)}${UNIT_ALIASES[u]}` : m,
  );
  const tokens = s
    .replace(/[^a-z0-9.]+/g, " ")
    .split(" ")
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean)
    .map((t) => SYNONYMS[t] ?? t)
    .filter((t) => !STOPWORDS.has(t) && !(t.length === 1 && !/\d/.test(t)));
  return Array.from(new Set(tokens));
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

function dice<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return (2 * inter) / (a.size + b.size);
}

/**
 * Similarity in [0, 1] between a bill line name and a product name.
 * Word overlap (60%) + character trigrams (40%, tolerates OCR typos),
 * with a penalty when both names state a size and the sizes differ (1L vs 5L).
 */
export function nameSimilarity(billName: string, productName: string): number {
  const a = normalizeName(billName);
  const b = normalizeName(productName);
  if (a.length === 0 || b.length === 0) return 0;

  const wordScore = dice(new Set(a.filter((t) => !isSizeToken(t))), new Set(b.filter((t) => !isSizeToken(t))));
  const charScore = dice(trigrams(a.join(" ")), trigrams(b.join(" ")));
  let score = 0.6 * wordScore + 0.4 * charScore;

  const sizesA = a.filter(isSizeToken);
  const sizesB = b.filter(isSizeToken);
  if (sizesA.length > 0 && sizesB.length > 0) {
    score *= sizesA.some((s) => sizesB.includes(s)) ? 1.1 : 0.6;
  }
  return Math.min(Math.round(score * 1000) / 1000, 1);
}

/* -------------------------------- matching -------------------------------- */

export const MATCH_HIGH = 0.55;
export const MATCH_LOW = 0.35;

export type MatchConfidence = "high" | "low" | "none";

export interface ProductMatch {
  productId: string | null;
  score: number;
  confidence: MatchConfidence;
}

/** Best catalog product for a bill line (tries the printed name and the English reading). */
export function matchProduct(names: Array<string | null | undefined>, products: Product[]): ProductMatch {
  let best: { id: string; score: number } | null = null;
  for (const p of products) {
    for (const n of names) {
      if (!n) continue;
      const score = Math.max(nameSimilarity(n, p.nameEn), p.name ? nameSimilarity(n, p.name) : 0);
      if (!best || score > best.score) best = { id: p.id, score };
    }
  }
  if (!best || best.score < MATCH_LOW) return { productId: null, score: best?.score ?? 0, confidence: "none" };
  return { productId: best.id, score: best.score, confidence: best.score >= MATCH_HIGH ? "high" : "low" };
}

/* --------------------------- deterministic figures --------------------------- */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Cost per unit: the printed unit price, else line total ÷ quantity, else null. */
export function deriveUnitCost(quantity: number | null, unitPrice: number | null, lineTotal: number | null): number | null {
  if (unitPrice !== null && unitPrice >= 0) return round2(unitPrice);
  if (lineTotal !== null && quantity !== null && quantity > 0) return round2(lineTotal / quantity);
  return null;
}

/** True when qty × unit price disagrees with the printed line total by more than Rs 1 and 1%. */
export function lineTotalMismatch(quantity: number | null, unitPrice: number | null, lineTotal: number | null): boolean {
  if (quantity === null || unitPrice === null || lineTotal === null) return false;
  const diff = Math.abs(quantity * unitPrice - lineTotal);
  return diff > 1 && diff > lineTotal * 0.01;
}

/** Mahngai threshold from the plan: a supplier cost jump above 5% is flagged. */
export const PRICE_RISE_ALERT_PCT = 5;

/** % change of the new unit cost vs the product's last buy price (null if no baseline). */
export function costChangePercent(newUnitCost: number, lastBuyPrice: number): number | null {
  if (!(lastBuyPrice > 0)) return null;
  return Math.round(((newUnitCost - lastBuyPrice) / lastBuyPrice) * 1000) / 10;
}

/** Retail price that keeps the product's current margin % at the new cost (rounded up to Rs 5). */
export function marginKeepingPrice(newUnitCost: number, lastBuyPrice: number, sellPrice: number): number | null {
  if (!(lastBuyPrice > 0) || !(sellPrice > 0)) return null;
  const markup = sellPrice / lastBuyPrice;
  return Math.ceil((newUnitCost * markup) / 5) * 5;
}
