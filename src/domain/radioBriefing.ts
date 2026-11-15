// Kiryana Radio briefing (Rule 1: every number here is computed in code, never by AI).
//
// The same briefing is written in four forms, sentence for sentence:
//   en / latin        English
//   ur / latin        Roman Urdu with everyday English shop words (shown on screen)
//   ur / urdu         Urdu script, for an Urdu speech voice
//   ur / devanagari   Hindustani in Devanagari, so a Hindi voice reads it as natural spoken Urdu
// Sentence lists line up, so the on-screen Roman line can be highlighted while the
// voice reads its counterpart in another script.

import type { Customer, Product, Sale, Shop } from "@/types";
import { customerOverdueDays, toLocalYmd } from "@/domain/credit";
import { saleDay } from "@/domain/insights";

export type RadioLanguage = "en" | "ur";
export type RadioScript = "latin" | "urdu" | "devanagari";

export interface RadioFacts {
  shopName: string;
  city: string;
  mandi: string;
  salesCount: number;
  revenue: number;
  productCount: number;
  lowStockCount: number;
  /** Up to two low-stock items, English and (when known) Urdu names. */
  lowStock: Array<{ en: string; ur: string | null }>;
  udhaarTotal: number;
  overdueCount: number;
  topDebtor: { name: string; balance: number } | null;
}

const MANDI: Record<string, string> = {
  Islamabad: "Grain Market I-9, Islamabad",
  Rawalpindi: "Ganj Mandi, Rawalpindi",
  Lahore: "Akbari Mandi, Lahore",
  Karachi: "Jodia Bazar, Karachi",
  Faisalabad: "Ghalla Mandi, Faisalabad",
};

export function mandiFor(city: string): string {
  return MANDI[city] ?? `${city} wholesale mandi`;
}

export function radioFacts(input: {
  shop: Pick<Shop, "name" | "city">;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  today?: string;
}): RadioFacts {
  const today = input.today ?? toLocalYmd();
  const todaySales = input.sales.filter((s) => s.status === "completed" && saleDay(s) === today);
  const low = input.products.filter((p) => p.quantity <= p.minQuantity);
  const owing = input.customers.filter((c) => c.creditBalance > 0);
  const top = [...owing].sort((a, b) => b.creditBalance - a.creditBalance)[0];
  const city = input.shop.city || "Islamabad";
  return {
    shopName: input.shop.name,
    city,
    mandi: mandiFor(city),
    salesCount: todaySales.length,
    revenue: Math.round(todaySales.reduce((sum, s) => sum + s.totalAmount, 0)),
    productCount: input.products.length,
    lowStockCount: low.length,
    lowStock: low.slice(0, 2).map((p) => ({ en: p.nameEn, ur: p.nameUr?.trim() || null })),
    udhaarTotal: Math.round(owing.reduce((sum, c) => sum + c.creditBalance, 0)),
    overdueCount: owing.filter((c) => customerOverdueDays(c, today) > 0).length,
    topDebtor: top ? { name: top.name, balance: Math.round(top.creditBalance) } : null,
  };
}

interface Phrases {
  money: (n: number) => string;
  join: (a: string, b?: string) => string;
  greeting: (shop: string, city: string) => string;
  salesNone: string;
  sales: (count: number, total: string) => string;
  lowOne: (item: string, mandi: string) => string;
  lowMany: (count: number, items: string, mandi: string) => string;
  stockOk: (count: number) => string;
  udhaar: (total: string) => string;
  topDebtor: (name: string, amount: string) => string;
  udhaarNone: string;
  overdue: (count: number) => string;
  tipIntro: string;
  closing: string;
}

const grouped = (n: number) => n.toLocaleString("en-US");

const EN: Phrases = {
  money: (n) => `${grouped(n)} rupees`,
  join: (a, b) => (b ? `${a} and ${b}` : a),
  greeting: (shop, city) => `Assalam-o-Alaikum! This is Kiryana Radio with today's briefing for ${shop}, ${city}.`,
  salesNone: "No sales have been recorded yet today.",
  sales: (n, total) => `So far today: ${n} ${n === 1 ? "sale" : "sales"}, worth ${total}.`,
  lowOne: (item, mandi) => `Stock alert: ${item} is running low. Reorder from ${mandi} soon.`,
  lowMany: (n, items, mandi) => `Stock alert: ${n} items are running low, including ${items}. Reorder from ${mandi} soon.`,
  stockOk: (n) => `Stock is healthy: all ${n} products are above their minimum level.`,
  udhaar: (total) => `Customers owe you ${total} in udhaar.`,
  topDebtor: (name, amount) => `The largest balance is ${name}, at ${amount}.`,
  udhaarNone: "No udhaar is outstanding. Well done!",
  overdue: (n) => `${n} ${n === 1 ? "customer is" : "customers are"} past the due date. A polite WhatsApp reminder can help.`,
  tipIntro: "Today's tip.",
  closing: "Have a blessed and profitable day!",
};

const ROMAN: Phrases = {
  money: (n) => `${grouped(n)} rupay`,
  join: (a, b) => (b ? `${a} aur ${b}` : a),
  greeting: (shop, city) => `Assalam-o-Alaikum! Yeh Kiryana Radio hai, aur yeh ${shop}, ${city} ki aaj ki briefing hai.`,
  salesNone: "Aaj abhi tak koi sale record nahi hui.",
  sales: (n, total) => `Aaj abhi tak ${n} ${n === 1 ? "sale hui hai" : "sales hui hain"}, total ${total}.`,
  lowOne: (item, mandi) => `Stock alert: ${item} kam reh gaya hai. Jaldi ${mandi} se order kar lein.`,
  lowMany: (n, items, mandi) => `Stock alert: ${n} items kam reh gaye hain, jaise ${items}. Jaldi ${mandi} se order kar lein.`,
  stockOk: (n) => `Stock theek hai, saare ${n} items minimum se upar hain.`,
  udhaar: (total) => `Customers par total ${total} udhaar hai.`,
  topDebtor: (name, amount) => `Sab se zyada udhaar ${name} ka hai, ${amount}.`,
  udhaarNone: "Koi udhaar baqi nahi. Shabash!",
  overdue: (n) => `${n} ${n === 1 ? "customer" : "customers"} ki payment ki date guzar chuki hai. WhatsApp par pyaar se yaad dila dein.`,
  tipIntro: "Aaj ka mashwara.",
  closing: "Aap ka din mubarak ho, aur karobar mein barkat ho!",
};

// Urdu and Devanagari voices read plain digits more reliably than "25,145".
const URDU: Phrases = {
  money: (n) => `${n} روپے`,
  join: (a, b) => (b ? `${a} اور ${b}` : a),
  greeting: (shop, city) => `السلام علیکم! یہ کریانہ ریڈیو ہے، اور یہ ${shop}، ${city} کی آج کی بریفنگ ہے۔`,
  salesNone: "آج ابھی تک کوئی سیل ریکارڈ نہیں ہوئی۔",
  sales: (n, total) => `آج ابھی تک ${n} ${n === 1 ? "سیل ہوئی ہے" : "سیلز ہوئی ہیں"}، ٹوٹل ${total}۔`,
  lowOne: (item, mandi) => `اسٹاک الرٹ: ${item} کم رہ گیا ہے۔ جلدی ${mandi} سے آرڈر کر لیں۔`,
  lowMany: (n, items, mandi) => `اسٹاک الرٹ: ${n} آئٹمز کم رہ گئے ہیں، جیسے ${items}۔ جلدی ${mandi} سے آرڈر کر لیں۔`,
  stockOk: (n) => `اسٹاک ٹھیک ہے، سارے ${n} آئٹمز مِنیمم سے اوپر ہیں۔`,
  udhaar: (total) => `کسٹمرز پر ٹوٹل ${total} اُدھار ہے۔`,
  topDebtor: (name, amount) => `سب سے زیادہ اُدھار ${name} کا ہے، ${amount}۔`,
  udhaarNone: "کوئی اُدھار باقی نہیں۔ شاباش!",
  overdue: (n) => `${n} ${n === 1 ? "کسٹمر" : "کسٹمرز"} کی پیمنٹ کی تاریخ گزر چکی ہے۔ واٹس ایپ پر پیار سے یاد دلا دیں۔`,
  tipIntro: "آج کا مشورہ۔",
  closing: "آپ کا دن مبارک ہو، اور کاروبار میں برکت ہو!",
};

const DEVANAGARI: Phrases = {
  money: (n) => `${n} रुपये`,
  join: (a, b) => (b ? `${a} और ${b}` : a),
  greeting: (shop, city) => `अस्सलाम अलैकुम! यह किरयाना रेडियो है, और यह ${shop}, ${city} की आज की ब्रीफ़िंग है।`,
  salesNone: "आज अभी तक कोई सेल रिकॉर्ड नहीं हुई।",
  sales: (n, total) => `आज अभी तक ${n} ${n === 1 ? "सेल हुई है" : "सेल्स हुई हैं"}, टोटल ${total}।`,
  lowOne: (item, mandi) => `स्टॉक अलर्ट: ${item} कम रह गया है। जल्दी ${mandi} से ऑर्डर कर लें।`,
  lowMany: (n, items, mandi) => `स्टॉक अलर्ट: ${n} आइटम्स कम रह गए हैं, जैसे ${items}। जल्दी ${mandi} से ऑर्डर कर लें।`,
  stockOk: (n) => `स्टॉक ठीक है, सारे ${n} आइटम्स मिनिमम से ऊपर हैं।`,
  udhaar: (total) => `कस्टमर्स पर टोटल ${total} उधार है।`,
  topDebtor: (name, amount) => `सब से ज़्यादा उधार ${name} का है, ${amount}।`,
  udhaarNone: "कोई उधार बाक़ी नहीं। शाबाश!",
  overdue: (n) => `${n} ${n === 1 ? "कस्टमर" : "कस्टमर्स"} की पेमेंट की तारीख़ गुज़र चुकी है। व्हाट्सऐप पर प्यार से याद दिला दें।`,
  tipIntro: "आज का मशवरा।",
  closing: "आप का दिन मुबारक हो, और कारोबार में बरकत हो!",
};

function phrasesFor(lang: RadioLanguage, script: RadioScript): Phrases {
  if (lang === "en") return EN;
  return script === "urdu" ? URDU : script === "devanagari" ? DEVANAGARI : ROMAN;
}

export interface RadioScriptText {
  /** The data sentences, in order. Same length for every language/script given the same facts. */
  sentences: string[];
  tipIntro: string;
  closing: string;
}

export function radioBriefing(f: RadioFacts, lang: RadioLanguage, script: RadioScript = "latin"): RadioScriptText {
  const p = phrasesFor(lang, script);
  const name = (item: { en: string; ur: string | null }) => (lang === "ur" && script === "urdu" && item.ur ? item.ur : item.en);
  const s: string[] = [p.greeting(f.shopName, f.city)];

  s.push(f.salesCount === 0 ? p.salesNone : p.sales(f.salesCount, p.money(f.revenue)));

  if (f.lowStockCount === 1 && f.lowStock[0]) s.push(p.lowOne(name(f.lowStock[0]), f.mandi));
  else if (f.lowStockCount > 1) {
    s.push(p.lowMany(f.lowStockCount, p.join(name(f.lowStock[0]), f.lowStock[1] ? name(f.lowStock[1]) : undefined), f.mandi));
  } else if (f.productCount > 0) s.push(p.stockOk(f.productCount));

  if (f.udhaarTotal > 0) {
    s.push(p.udhaar(p.money(f.udhaarTotal)));
    if (f.topDebtor) s.push(p.topDebtor(f.topDebtor.name, p.money(f.topDebtor.balance)));
  } else s.push(p.udhaarNone);

  if (f.overdueCount > 0) s.push(p.overdue(f.overdueCount));

  return { sentences: s, tipIntro: p.tipIntro, closing: p.closing };
}

/* ------------------------------ voice choice ------------------------------ */

export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
}

/** Natural / online / Google voices sound far better than legacy desktop voices. */
const quality = (v: VoiceLike) => (/natural|online|neural|google|premium|enhanced/i.test(v.name) ? 1 : 0);
const langIs = (v: VoiceLike, prefix: string) => v.lang.replace("_", "-").toLowerCase().startsWith(prefix);

function best<T extends VoiceLike>(voices: T[], prefixes: string[]): T | null {
  for (const prefix of prefixes) {
    const matches = voices.filter((v) => langIs(v, prefix)).sort((a, b) => quality(b) - quality(a));
    if (matches.length) return matches[0];
  }
  return null;
}

/**
 * Pick a voice and the script to speak in.
 * Urdu: an Urdu voice reads Urdu script; otherwise a Hindi voice reads the Devanagari
 * version (spoken Hindustani sounds the same as everyday Urdu); otherwise an English
 * voice (South Asian accent first) reads the Roman Urdu text.
 */
export function pickRadioVoice<T extends VoiceLike>(voices: T[], lang: RadioLanguage): { voice: T | null; script: RadioScript } {
  if (lang === "ur") {
    const ur = best(voices, ["ur"]);
    if (ur) return { voice: ur, script: "urdu" };
    const hi = best(voices, ["hi"]);
    if (hi) return { voice: hi, script: "devanagari" };
  }
  return { voice: best(voices, ["en-pk", "en-in", "en-gb", "en-us", "en"]) ?? voices[0] ?? null, script: "latin" };
}
