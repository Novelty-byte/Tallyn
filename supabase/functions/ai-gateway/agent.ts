/**
 * Tallyn AI actions ("Ask can do things").
 *
 * When the shopkeeper asks Tallyn to DO something — "Udhaar mein Asif ko 2 chai likh do",
 * "add 10 Rooh Afza to purchases", "Asif ne 500 diye", "Bashir ko reminder bhejo" — the
 * model proposes ONE action alongside its reply. Safety:
 * - The model sees products and customers as short codes (P1…, C1…); every code is mapped
 *   back here and unknown codes are dropped, so it cannot invent a product or customer.
 * - Quantities and amounts are the numbers the shopkeeper said (Rule 1: no arithmetic);
 *   prices and totals are worked out by the app from its own catalogue.
 * - Nothing is written here. The app shows an editable confirmation card and only the
 *   shopkeeper's "Approve" calls the existing, tested record_* functions.
 */
import { z } from "https://esm.sh/zod@3.23.8";

const Text = (max: number) =>
  z.string().transform((s) => s.replace(/[\u0000-\u001f<>`]/g, " ").replace(/\s+/g, " ").trim().slice(0, max));
const Id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_.:-]+$/, "invalid id");

/** Product and customer lists the model may refer to (by code) when proposing an action. */
export const RefsSchema = z.object({
  products: z.array(z.object({ id: Id, name: Text(120), nameUr: Text(120).optional() }).strict()).max(600),
  customers: z.array(z.object({ id: Id, name: Text(80) }).strict()).max(400),
}).strict();

export type Refs = z.infer<typeof RefsSchema>;

export type AgentAction =
  | { type: "sale"; items: Array<{ productId: string; qty: number }>; paymentType: "cash" | "credit"; customerId: string | null }
  | { type: "purchase"; items: Array<{ productId: string; qty: number; unitCost: number | null }>; supplier: string | null }
  | { type: "payment"; customerId: string | null; amount: number | null }
  | { type: "reminder"; customerId: string | null };

export interface AgentReply {
  answer: string;
  action: AgentAction | null;
  /** Item words the model couldn't find in the catalogue. */
  notFound: string[];
}

export function renderRefs(refs: Refs): string {
  const products = refs.products.length
    ? refs.products.map((p, i) => `P${i + 1}: ${p.name}${p.nameUr ? ` / ${p.nameUr}` : ""}`).join("\n")
    : "(none)";
  const customers = refs.customers.length ? refs.customers.map((c, i) => `C${i + 1}: ${c.name}`).join("\n") : "(none)";
  return `PRODUCTS (codes for actions):\n${products}\n\nCUSTOMERS (codes for actions):\n${customers}`;
}

export const ACTION_RULES = `ACTIONS. Besides answering, you can PREPARE one action in Tallyn when the shopkeeper asks you to do something. The app shows it as a confirmation card and nothing is saved until the shopkeeper taps Approve. So NEVER say it is done, recorded, saved or added (not "record kar diya", "ho gaya", "add kar diya"): say you have prepared it ("tayyar kar diya hai", "I've prepared") and ask them to check it and tap Approve. Never mention product or customer codes (P1, C1) in your reply; use the names.
Actions:
- "sale": record a sale. Udhaar, udhar, khata, credit, "likh do", "baad mein dega" → payment "credit" with that customer; otherwise "cash". Example: "Udhaar mein Asif ko 2 chai likh do" → sale, credit, customer Asif, 2 of the tea product.
- "purchase": stock bought from a supplier ("add 10 Rooh Afza to purchases", "10 Dalda aaye hain", "restock"). "unitCost" only if the shopkeeper said a price per unit, otherwise null (the app uses the product's buying price).
- "payment": a customer paid back udhaar ("Asif ne 500 rupay diye", "Tariq paid 1000"). "amount" is the amount they said.
- "reminder": send a customer a WhatsApp reminder about their udhaar.
Use product codes from PRODUCTS and customer codes from CUSTOMERS. Match by meaning, brand, sound and Urdu names, tolerating misspellings ("chai" → a tea product, "roof afza" → Rooh Afza). If several products fit, pick the best one and mention the other in your reply. Put items you can't find in "notFound".
Quantities and amounts are exactly the numbers the shopkeeper said (digits or number words: ek 1, do 2, teen 3, char 4, paanch 5, das 10, bees 20, pachaas 50, sau 100, hazaar 1000). No count said → qty 1. Never calculate totals, change or prices.
If something essential is missing (which customer, how much was paid), still propose the action with null for it and ask for it in your reply.
Questions, advice and small talk get action null.`;

export const JSON_OUTPUT = `OUTPUT: reply with only a JSON object, nothing else:
{"reply": "your message to the shopkeeper (reply language and style rules above; use \\n for new lines)",
 "action": null or one of
   {"type":"sale","items":[{"product":"P1","qty":2}],"payment":"cash or credit","customer":"C1 or null"}
   {"type":"purchase","items":[{"product":"P1","qty":10,"unitCost":null}],"supplier":"name or null"}
   {"type":"payment","customer":"C1 or null","amount":500}
   {"type":"reminder","customer":"C1 or null"},
 "notFound": []}`;

/* ------------------------------ parsing ------------------------------ */

function codeIndex(code: unknown, prefix: "P" | "C", size: number): number | null {
  const m = String(code ?? "").trim().toUpperCase().match(new RegExp(`^${prefix}(\\d{1,4})$`));
  if (!m) return null;
  const i = Number(m[1]) - 1;
  return i >= 0 && i < size ? i : null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(/[, ]/g, "")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
const clean = (s: unknown, max: number) =>
  typeof s === "string" ? s.replace(/[\u0000-\u001f<>`]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

function toAction(raw: unknown, refs: Refs): AgentAction | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const customerId = (() => {
    const i = codeIndex(a.customer, "C", refs.customers.length);
    return i === null ? null : refs.customers[i].id;
  })();
  const rawItems = Array.isArray(a.items) ? (a.items as Array<Record<string, unknown>>).slice(0, 30) : [];
  const itemsWith = <T>(fn: (it: Record<string, unknown>, productId: string, qty: number) => T): T[] => {
    const out: T[] = [];
    for (const it of rawItems) {
      const pi = codeIndex(it?.product, "P", refs.products.length);
      if (pi === null) continue;
      const q = num(it.qty);
      const qty = q === null ? 1 : Math.min(9999, Math.max(1, Math.round(q)));
      out.push(fn(it, refs.products[pi].id, qty));
    }
    return out;
  };

  switch (a.type) {
    case "sale": {
      const items = itemsWith((_it, productId, qty) => ({ productId, qty: Math.min(qty, 999) }));
      if (!items.length) return null;
      return { type: "sale", items, paymentType: a.payment === "credit" ? "credit" : "cash", customerId };
    }
    case "purchase": {
      const items = itemsWith((it, productId, qty) => {
        const c = num(it.unitCost);
        return { productId, qty, unitCost: c !== null && c > 0 && c <= 10_000_000 ? c : null };
      });
      if (!items.length) return null;
      const supplier = clean(a.supplier, 80);
      return { type: "purchase", items, supplier: supplier || null };
    }
    case "payment": {
      const amt = num(a.amount);
      return { type: "payment", customerId, amount: amt !== null && amt > 0 && amt <= 100_000_000 ? amt : null };
    }
    case "reminder":
      return { type: "reminder", customerId };
    default:
      return null;
  }
}

/**
 * Parse the model's JSON reply. If it isn't JSON (some providers ignore JSON mode), the
 * whole text is treated as a plain answer with no action — never a guessed action.
 */
export function parseAgentReply(text: string, refs: Refs): AgentReply {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let raw: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) raw = parsed as Record<string, unknown>;
  } catch {
    /* plain text */
  }
  if (!raw) return { answer: text.trim(), action: null, notFound: [] };

  const reply = typeof raw.reply === "string" ? raw.reply : typeof raw.answer === "string" ? raw.answer : "";
  const notFound = Array.isArray(raw.notFound)
    ? raw.notFound.map((s) => clean(s, 60)).filter(Boolean).slice(0, 10)
    : [];
  // Models sometimes echo the internal codes ("Tapal (P8)"); the shopkeeper should only see names.
  const answer = reply.replace(/\s*\((?:[PC]\d{1,4})(?:\s*,\s*[PC]\d{1,4})*\)/g, "").trim();
  return { answer, action: toAction(raw.action, refs), notFound };
}
