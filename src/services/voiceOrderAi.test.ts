import { describe, it, expect } from "vitest";
import { toAiVoiceOrder } from "@/services/voiceOrderAi";
import type { VoiceCustomer, VoiceProduct } from "@/domain/voiceParser";

const products: VoiceProduct[] = [
  { id: "rooh", nameEn: "Rooh Afza Herbal Syrup 800ml", quantity: 6, sellPrice: 450 },
  { id: "sugar", nameEn: "White Refined Sugar (Cheeni) 1kg", nameUr: "چینی", quantity: 40, sellPrice: 145 },
  { id: "oil", nameEn: "Dalda Cooking Oil 1L Pouch", quantity: 20, sellPrice: 560 },
];
const customers: VoiceCustomer[] = [{ id: "asif", name: "Asif Bhai" }];

describe("toAiVoiceOrder", () => {
  it("keeps only ids from this catalogue and clamps quantities", () => {
    const r = toAiVoiceOrder(
      {
        lines: [
          { heard: "do roof afza", productId: "rooh", qty: 2, confidence: 0.95, alternatives: ["ghost", "rooh"] },
          { heard: "ek ghost item", productId: "not-in-catalogue", qty: 1, confidence: 0.9 },
          { heard: "cheeni", productId: "sugar", qty: 500, confidence: 3, alternatives: ["oil"] },
          { heard: "x", productId: "oil", qty: "two", confidence: "high" },
        ],
        paymentType: "credit",
        customerId: "asif",
      },
      products,
      customers,
    );
    expect(r.paymentType).toBe("credit");
    expect(r.customerId).toBe("asif");
    expect(r.lines.map((l) => [l.productId, l.qty, l.confidence])).toEqual([
      ["rooh", 2, 0.95],
      [null, 1, 0],
      ["sugar", 99, 1],
      ["oil", 1, 0],
    ]);
    expect(r.lines[0].candidates[0]).toEqual({ id: "rooh", score: 0.95 });
    expect(r.lines[0].candidates.some((c) => c.id === "ghost")).toBe(false);
    expect(r.lines[2].candidates.map((c) => c.id)).toContain("oil"); // AI alternative offered
  });

  it("offers offline suggestions for a line the AI couldn't place", () => {
    const r = toAiVoiceOrder({ lines: [{ heard: "cheeni", productId: null, qty: 1 }] }, products, customers);
    expect(r.lines[0].productId).toBeNull();
    expect(r.lines[0].candidates.map((c) => c.id)).toContain("sugar");
  });

  it("drops unknown customers and payment values, and rejects a missing order", () => {
    const r = toAiVoiceOrder({ lines: [], paymentType: "bitcoin", customerId: "nobody" }, products, customers);
    expect(r).toEqual({ lines: [], paymentType: null, customerId: null });
    expect(() => toAiVoiceOrder(undefined, products, customers)).toThrow();
  });
});
