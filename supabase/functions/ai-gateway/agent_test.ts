// Run: deno test --allow-env supabase/functions/ai-gateway/
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseAgentReply, renderRefs, RefsSchema } from "./agent.ts";
import { buildSystemPrompt } from "./chat.ts";
import { AskRequestSchema, SnapshotSchema } from "./schema.ts";

const refs = RefsSchema.parse({
  products: [
    { id: "p-tea", name: "Tapal Danedar 450g", nameUr: "ٹپال" },
    { id: "p-rooh", name: "Rooh Afza <b>800ml</b>" },
  ],
  customers: [{ id: "c-asif", name: "Asif Bhai" }, { id: "c-tariq", name: "Tariq" }],
});

Deno.test("refs render as codes only, with names sanitised", () => {
  const text = renderRefs(refs);
  assertStringIncludes(text, "P1: Tapal Danedar 450g / ٹپال");
  assertStringIncludes(text, "C2: Tariq");
  assertEquals(text.includes("p-tea"), false);
  assertEquals(text.includes("<b>"), false);
});

Deno.test("action rules and JSON output are added only when refs are sent", () => {
  const snap = SnapshotSchema.parse({
    shopName: "S", city: "Lahore", currency: "PKR", date: "2026-11-15",
    today: { revenue: 0, salesCount: 0, cash: 0, credit: 0, grossProfit: 0 },
    last7Days: { revenue: 0, salesCount: 0, grossProfit: 0 },
    udhaar: { total: 0, customersOwing: 0, overdueCustomers: 0 },
    stock: { productCount: 0, lowStockCount: 0 }, expensesThisMonth: 0,
    products: [], customers: [], topSellers7d: [], notSold30d: [], notSold30dSummary: { itemCount: 0, valueAtCost: 0 },
  });
  assertEquals(buildSystemPrompt(snap).includes("ACTIONS."), false);
  const withRefs = buildSystemPrompt(snap, "English", refs);
  assertStringIncludes(withRefs, "ACTIONS.");
  assertStringIncludes(withRefs, "nothing is saved until the shopkeeper taps Approve");
  assertStringIncludes(withRefs, '"type":"payment"');
  // The request contract accepts refs and rejects unknown fields inside them.
  const base = { question: "hi", snapshot: snap };
  assertEquals(AskRequestSchema.safeParse({ ...base, refs }).success, true);
  assertEquals(AskRequestSchema.safeParse({ ...base, refs: { ...refs, extra: 1 } }).success, false);
});

Deno.test("parseAgentReply maps codes to ids and clamps", () => {
  const r = parseAgentReply(JSON.stringify({
    reply: "Asif ke liye 2 chai tayyar hai. Approve dabayein.",
    action: { type: "sale", payment: "credit", customer: "C1", items: [{ product: "P1", qty: 2 }, { product: "P9", qty: 1 }, { product: "p2", qty: "5000" }] },
    notFound: ["pepsi"],
  }), refs);
  assertEquals(r, {
    answer: "Asif ke liye 2 chai tayyar hai. Approve dabayein.",
    action: { type: "sale", paymentType: "credit", customerId: "c-asif", items: [{ productId: "p-tea", qty: 2 }, { productId: "p-rooh", qty: 999 }] },
    notFound: ["pepsi"],
  });
});

Deno.test("purchase, payment and reminder shapes", () => {
  const purchase = parseAgentReply(JSON.stringify({ reply: "ok", action: { type: "purchase", supplier: "Al Rehman", items: [{ product: "P2", qty: 12, unitCost: "520" }, { product: "P1", qty: 3, unitCost: -1 }] } }), refs);
  assertEquals(purchase.action, { type: "purchase", supplier: "Al Rehman", items: [{ productId: "p-rooh", qty: 12, unitCost: 520 }, { productId: "p-tea", qty: 3, unitCost: null }] });
  assertEquals(parseAgentReply(JSON.stringify({ reply: "ok", action: { type: "payment", customer: "C2", amount: "1,000" } }), refs).action,
    { type: "payment", customerId: "c-tariq", amount: 1000 });
  assertEquals(parseAgentReply(JSON.stringify({ reply: "ok", action: { type: "payment", customer: "C7", amount: -5 } }), refs).action,
    { type: "payment", customerId: null, amount: null });
  assertEquals(parseAgentReply(JSON.stringify({ reply: "ok", action: { type: "reminder", customer: "C1" } }), refs).action,
    { type: "reminder", customerId: "c-asif" });
});

Deno.test("internal codes are removed from the reply", () => {
  assertEquals(parseAgentReply(JSON.stringify({ reply: "Asif Bhai (C1) ke liye Tapal (P8) tayyar hai.", action: null }), refs).answer,
    "Asif Bhai ke liye Tapal tayyar hai.");
});

Deno.test("anything unexpected becomes a plain answer with no action", () => {
  assertEquals(parseAgentReply("Just a normal answer.", refs), { answer: "Just a normal answer.", action: null, notFound: [] });
  assertEquals(parseAgentReply(JSON.stringify({ reply: "x", action: { type: "delete_shop" } }), refs).action, null);
  assertEquals(parseAgentReply(JSON.stringify({ reply: "x", action: { type: "sale", items: [{ product: "P99" }] } }), refs).action, null);
  assertEquals(parseAgentReply("[1,2,3]", refs).action, null);
});
