/**
 * Deterministic voice-order parser for the counter POS.
 *
 * Understands English, Roman Urdu and Urdu script, e.g.
 *   "do kilo cheeni aur ek ghee udhaar Asif"
 *   "2 chai 1 ghee"
 *   "دو چینی اور ایک دودھ ادھار"
 *
 * Rule 1 (zero hallucinated numbers): NO AI is involved here. Quantities come only
 * from digits / number words actually spoken, and prices always come from the
 * product catalogue. The result is a *proposal* the cashier confirms by tap.
 */

export interface VoiceProduct {
  id: string;
  nameEn: string;
  nameUr?: string;
  name?: string;
  quantity: number;
  sellPrice: number;
}

export interface VoiceCustomer {
  id: string;
  name: string;
}

export interface VoiceCandidate {
  id: string;
  score: number;
}

export interface VoiceLine {
  key: string;
  /** The words the cashier said for this line (normalised). */
  segment: string;
  productId: string | null;
  qty: number;
  /** 0..1 – how sure the matcher is about productId. */
  confidence: number;
  candidates: VoiceCandidate[];
}

export interface VoiceParseResult {
  transcript: string;
  lines: VoiceLine[];
  paymentType: "cash" | "credit";
  customerId: string | null;
}

/* ----------------------------- vocabulary ------------------------------ */

const NUMBER_WORDS: Record<string, number> = {
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
  // Roman Urdu
  ek: 1, aik: 1, do: 2, teen: 3, tin: 3, char: 4, chaar: 4, paanch: 5, panch: 5, paanc: 5,
  chhe: 6, che: 6, chay: 6, chhay: 6, saat: 7, sat: 7, aath: 8, ath: 8, nau: 9, no: 9, das: 10,
  gyarah: 11, barah: 12,
  // Urdu script
  "ایک": 1, "دو": 2, "تین": 3, "چار": 4, "پانچ": 5, "چھ": 6, "سات": 7, "آٹھ": 8, "نو": 9, "دس": 10,
  "گیارہ": 11, "بارہ": 12,
};

/** Words that never name a product. */
const NOISE = new Set([
  "and", "or", "plus", "then", "please", "pls", "give", "me", "i", "want", "need", "add", "the", "a", "an", "of", "some", "also",
  "aur", "phir", "mujhe", "hamein", "chahiye", "chahie", "dena", "dedo", "dijiye", "dijiyega", "de", "dein", "lena", "lo", "ka", "ki", "ke",
  "wala", "wali", "wale", "bhi", "aap", "ap", "sirf", "bas",
  "اور", "مجھے", "چاہیے", "دیں", "دیجیے", "کا", "کی", "کے", "بھی", "پلیز",
]);

const UNITS = new Set([
  "kg", "kgs", "kilo", "kilos", "kilogram", "kilograms", "gm", "gram", "grams", "ltr", "liter", "litre", "liters", "litres", "l",
  "pack", "packs", "packet", "packets", "bag", "bags", "tin", "tins", "piece", "pieces", "pcs", "pc", "bottle", "bottles",
  "box", "boxes", "dozen", "carton", "sachet",
  "کلو", "گرام", "لیٹر", "پیکٹ", "تھیلا", "ڈبہ", "بوتل", "درجن",
]);

const CREDIT_WORDS = new Set(["udhaar", "udhar", "credit", "khata", "ادھار", "ادھر", "کھاتہ", "khaata"]);
const CREDIT_PHRASES = ["baad mein", "baad main", "later", "on credit", "بعد میں"];
const CASH_WORDS = new Set(["cash", "naqad", "نقد", "kaish"]);

/** Roman Urdu / Urdu-script → English catalogue tokens. */
const ALIASES: Record<string, string[]> = {
  chai: ["tea", "chai"], chay: ["tea"], "چائے": ["tea"], "چاے": ["tea"],
  cheeni: ["sugar", "cheeni"], chini: ["sugar"], "چینی": ["sugar", "cheeni"],
  doodh: ["milk"], dood: ["milk"], "دودھ": ["milk"],
  aata: ["flour", "atta", "aata"], atta: ["flour", "atta", "aata"], "آٹا": ["flour", "atta", "aata"], "آٹے": ["flour", "atta"],
  chawal: ["rice"], chaawal: ["rice"], "چاول": ["rice"],
  namak: ["salt"], "نمک": ["salt"],
  tel: ["oil"], "تیل": ["oil"], oil: ["oil", "cooking"],
  ghee: ["ghee"], "گھی": ["ghee"],
  daal: ["dal", "daal", "lentil"], dal: ["daal", "lentil"], "دال": ["dal", "daal"],
  sabun: ["soap"], "صابن": ["soap"],
  surf: ["detergent", "surf"], "سرف": ["detergent", "surf"],
  mirch: ["chilli", "chili", "pepper"], "مرچ": ["chilli", "chili"],
  haldi: ["turmeric"], "ہلدی": ["turmeric"],
  biscuit: ["biscuit", "biscuits"], biscut: ["biscuit"], "بسکٹ": ["biscuit"],
  pani: ["water"], "پانی": ["water"],
  makhan: ["butter"], "مکھن": ["butter"],
  anda: ["egg", "eggs"], ande: ["egg", "eggs"], "انڈے": ["egg", "eggs"],
  roti: ["bread"], double: ["bread"], "ڈبل": ["bread"],
  cola: ["cola", "coke", "pepsi"], "کولا": ["cola"],
};

/* ------------------------------ helpers -------------------------------- */

/** Lower-case, unify digits (Arabic-Indic & Persian → ASCII) and strip punctuation. */
export function normalize(input: string): string {
  const digitMap: Record<string, string> = {};
  "٠١٢٣٤٥٦٧٨٩".split("").forEach((d, i) => { digitMap[d] = String(i); });
  "۰۱۲۳۴۵۶۷۸۹".split("").forEach((d, i) => { digitMap[d] = String(i); });
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[٠-٩۰-۹]/g, (d) => digitMap[d] ?? d)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const isDigits = (t: string) => /^\d+$/.test(t);
const numberValue = (t: string): number | null => {
  if (isDigits(t)) return Math.min(parseInt(t, 10), 99);
  return Object.prototype.hasOwnProperty.call(NUMBER_WORDS, t) ? NUMBER_WORDS[t] : null;
};

/** Content tokens of a product name (drops pack sizes like 10kg / 450g / 1l and noise). */
function productTokens(p: VoiceProduct): string[] {
  const raw = [p.nameEn, p.name ?? "", p.nameUr ?? ""].join(" ");
  const toks = normalize(raw).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (const t of toks) {
    if (/^\d+(kg|g|gm|l|ltr|ml|pcs|pc)?$/.test(t)) continue;
    if (t.length < 2 || NOISE.has(t) || UNITS.has(t)) continue;
    out.add(t);
  }
  return [...out];
}

function tokenMatches(spoken: string, catalogue: string): boolean {
  if (spoken === catalogue) return true;
  const short = spoken.length < catalogue.length ? spoken : catalogue;
  const long = short === spoken ? catalogue : spoken;
  return short.length >= 4 && long.startsWith(short);
}

function expand(word: string): string[] {
  return [word, ...(ALIASES[word] ?? [])];
}

function scoreProduct(words: string[], p: VoiceProduct): number {
  if (words.length === 0) return 0;
  const ptoks = productTokens(p);
  if (ptoks.length === 0) return 0;
  let matchedWords = 0;
  const hitProductTokens = new Set<string>();
  for (const w of words) {
    let hit = false;
    for (const variant of expand(w)) {
      for (const pt of ptoks) {
        if (tokenMatches(variant, pt)) { hit = true; hitProductTokens.add(pt); }
      }
    }
    if (hit) matchedWords += 1;
  }
  if (matchedWords === 0) return 0;
  const precision = matchedWords / words.length;
  const recall = hitProductTokens.size / ptoks.length;
  return Math.min(1, 0.7 * precision + 0.3 * Math.min(1, recall * 1.6));
}

/* ------------------------------- parser -------------------------------- */

export function parseVoiceOrder(
  transcript: string,
  products: VoiceProduct[],
  customers: VoiceCustomer[] = [],
): VoiceParseResult {
  let text = normalize(transcript);

  // Payment intent
  let paymentType: "cash" | "credit" = "cash";
  for (const phrase of CREDIT_PHRASES) {
    if (text.includes(phrase)) { paymentType = "credit"; text = text.replace(phrase, " "); }
  }
  // "de do" / "dedo" = "give" (verb), not the number two.
  text = text.replace(/\bde do\b/g, " ").replace(/\bdedo\b/g, " ").replace(/\bdo de\b/g, " ");

  const tokens = text.split(" ").filter(Boolean);

  type Draft = { qty: number | null; words: string[] };
  const drafts: Draft[] = [];
  let cur: Draft = { qty: null, words: [] };
  const flush = () => {
    if (cur.words.length > 0) drafts.push(cur);
    cur = { qty: null, words: [] };
  };

  const customerTokens: string[] = [];
  let captureCustomer = false;

  for (const tok of tokens) {
    if (CREDIT_WORDS.has(tok)) {
      paymentType = "credit";
      flush();
      captureCustomer = true;
      continue;
    }
    if (CASH_WORDS.has(tok)) { paymentType = "cash"; captureCustomer = false; continue; }
    if (captureCustomer) {
      // Words after "udhaar" name the customer, until a number starts a new item.
      if (numberValue(tok) !== null) { captureCustomer = false; } else { customerTokens.push(tok); continue; }
    }
    const n = numberValue(tok);
    if (n !== null) {
      if (cur.words.length > 0) flush();      // a number after a product name starts a new line
      if (cur.qty === null) cur.qty = n;
      continue;
    }
    if (NOISE.has(tok) || UNITS.has(tok)) {
      if (tok === "aur" || tok === "and" || tok === "اور" || tok === "plus" || tok === "phir" || tok === "then") flush();
      continue;
    }
    cur.words.push(tok);
  }
  flush();

  const lines: VoiceLine[] = drafts.map((d, i) => {
    const scored = products
      .map((p) => ({ id: p.id, score: scoreProduct(d.words, p) }))
      .filter((c) => c.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    const top = scored[0];
    const second = scored[1];
    const matched = !!top && top.score >= 0.45;
    let confidence = matched ? top.score : 0;
    if (matched && second && top.score - second.score < 0.1) confidence = Math.min(confidence, 0.6); // ambiguous
    return {
      key: `v${i}`,
      segment: d.words.join(" "),
      productId: matched ? top.id : null,
      qty: d.qty ?? 1,
      confidence,
      candidates: scored,
    };
  });

  // Customer hint → known customer (token-wise, first match wins)
  let customerId: string | null = null;
  if (paymentType === "credit" && customerTokens.length > 0) {
    const hit = customers.find((c) => {
      const ctoks = normalize(c.name).split(" ").filter(Boolean);
      return customerTokens.some((t) => ctoks.some((ct) => tokenMatches(t, ct)));
    });
    customerId = hit?.id ?? null;
  }

  return { transcript, lines, paymentType, customerId };
}

/** Clamp a requested quantity to what the shelf actually holds. */
export function clampToStock(qty: number, stock: number): number {
  return Math.max(0, Math.min(Math.floor(qty), Math.floor(stock)));
}
