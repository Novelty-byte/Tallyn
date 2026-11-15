// Run: deno test --allow-env supabase/functions/ai-gateway/order_test.ts
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildOrderPrompt, buildOrderUserTurn, OrderRequestSchema, resolveOrder } from "./order.ts";
import { nativeModelName } from "./chat.ts";

const req = OrderRequestSchema.parse({
  mode: "order",
  transcript: "do roof afza aur ek dalda udhaar asif",
  alternatives: ["do roof afza aur ek dalda udhaar asif", "do rooh afza aur ek dalda udhaar asif"],
  catalog: [
    { id: "p-rooh", name: "Rooh Afza 800ml", nameUr: "روح افزا", unit: "bottle" },
    { id: "p-dalda", name: "Dalda Cooking Oil 1L", unit: "pouch" },
    { id: "p-sugar", name: "Sugar <b>1kg</b>" },
  ],
  customers: [{ id: "c-asif", name: "Asif Bhai" }, { id: "c-tariq", name: "Tariq" }],
});

Deno.test("prompt uses short codes, never database ids, and sanitises names", () => {
  const prompt = buildOrderPrompt(req);
  assertStringIncludes(prompt, "P1: Rooh Afza 800ml / روح افزا (sold per bottle)");
  assertStringIncludes(prompt, "C1: Asif Bhai");
  assertEquals(prompt.includes("p-rooh"), false);
  assertEquals(prompt.includes("<b>"), false);
  // The duplicate hypothesis is dropped, the different one kept.
  assertEquals(buildOrderUserTurn(req), `Transcript: "do roof afza aur ek dalda udhaar asif"\nOther possible hearings: "do rooh afza aur ek dalda udhaar asif"`);
});

Deno.test("resolveOrder maps codes back to ids and clamps everything", () => {
  const r = resolveOrder(
    "```json\n" + JSON.stringify({
      lines: [
        { heard: "do roof afza", product: "P1", qty: 2, confidence: 0.95, alternatives: ["P1", "P3", "P9"] },
        { heard: "ek dalda", product: "p2", qty: 250, confidence: 7 },
        { heard: "pepsi", product: "P7", qty: 1, confidence: 0.9, alternatives: [] },
        { heard: "aadha", product: null, qty: 0.5, confidence: 0 },
      ],
      payment: "credit",
      customer: "C1",
    }) + "\n```",
    req,
  );
  assertEquals(r, {
    lines: [
      { heard: "do roof afza", productId: "p-rooh", qty: 2, confidence: 0.95, alternatives: ["p-sugar"] },
      { heard: "ek dalda", productId: "p-dalda", qty: 99, confidence: 1, alternatives: [] },
      { heard: "pepsi", productId: null, qty: 1, confidence: 0, alternatives: [] }, // P7 doesn't exist
      { heard: "aadha", productId: null, qty: 1, confidence: 0, alternatives: [] },
    ],
    paymentType: "credit",
    customerId: "c-asif",
  });
});

Deno.test("resolveOrder rejects junk and ignores unknown payment / customer codes", () => {
  assertEquals(resolveOrder("not json", req), null);
  assertEquals(resolveOrder(JSON.stringify({ nope: true }), req), null);
  assertEquals(
    resolveOrder(JSON.stringify({ lines: [], payment: "bitcoin", customer: "C9" }), req),
    { lines: [], paymentType: null, customerId: null },
  );
});

Deno.test("order requests are validated", () => {
  const base = { mode: "order", transcript: "ek chai", catalog: [{ id: "a", name: "Tea" }] };
  assertEquals(OrderRequestSchema.safeParse(base).success, true);
  assertEquals(OrderRequestSchema.safeParse({ ...base, transcript: "  " }).success, false);
  assertEquals(OrderRequestSchema.safeParse({ ...base, catalog: [] }).success, false);
  assertEquals(OrderRequestSchema.safeParse({ ...base, catalog: [{ id: "bad id!", name: "x" }] }).success, false);
  assertEquals(OrderRequestSchema.safeParse({ ...base, price: 5 }).success, false);
});

Deno.test("nativeModelName strips the models/ prefix", () => {
  assertEquals(nativeModelName("models/gemini-3.5-flash"), "gemini-3.5-flash");
  assertEquals(nativeModelName("gemini-3.5-flash"), "gemini-3.5-flash");
});
