import { describe, it, expect } from "vitest";
import { parseVoiceOrder, normalize, clampToStock, type VoiceProduct } from "./voiceParser";

const products: VoiceProduct[] = [
  { id: "tea", nameEn: "Tapal Danedar Tea 450g", nameUr: "ٹاپال دانے دار چائے", quantity: 20, sellPrice: 650 },
  { id: "sugar", nameEn: "White Refined Sugar (Cheeni) 1kg", nameUr: "سفید چینی 1 کلو", quantity: 65, sellPrice: 155 },
  { id: "ghee", nameEn: "Dalda Ghee 1L", nameUr: "دالدا گھی", quantity: 12, sellPrice: 540 },
  { id: "milk", nameEn: "MilkPak Milk 1L", nameUr: "ملک پیک دودھ", quantity: 30, sellPrice: 290 },
  { id: "atta", nameEn: "Fine Wheat Flour (Aata) 10kg Bag", nameUr: "فائن آٹا", quantity: 18, sellPrice: 1350 },
];
const customers = [{ id: "c1", name: "Asif Mehmood" }, { id: "c2", name: "Bilal Ahmed" }];

describe("normalize", () => {
  it("lowercases, strips punctuation and converts Urdu digits", () => {
    expect(normalize("Do kilo CHEENI!!")).toBe("do kilo cheeni");
    expect(normalize("۲ چینی")).toBe("2 چینی");
  });
});

describe("parseVoiceOrder", () => {
  it("parses digit quantities without separators", () => {
    const r = parseVoiceOrder("2 chai 1 ghee", products);
    expect(r.lines.map((l) => [l.productId, l.qty])).toEqual([["tea", 2], ["ghee", 1]]);
    expect(r.paymentType).toBe("cash");
  });

  it("parses Roman Urdu number words, units and 'aur'", () => {
    const r = parseVoiceOrder("do kilo cheeni aur teen doodh", products);
    expect(r.lines.map((l) => [l.productId, l.qty])).toEqual([["sugar", 2], ["milk", 3]]);
  });

  it("does not treat the verb 'de do' as the number two", () => {
    const r = parseVoiceOrder("ghee de do", products);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatchObject({ productId: "ghee", qty: 1 });
  });

  it("parses Urdu script", () => {
    const r = parseVoiceOrder("دو چینی اور ایک دودھ", products);
    expect(r.lines.map((l) => [l.productId, l.qty])).toEqual([["sugar", 2], ["milk", 1]]);
  });

  it("detects udhaar and resolves the named customer", () => {
    const r = parseVoiceOrder("2 chai 1 ghee udhaar Asif", products, customers);
    expect(r.paymentType).toBe("credit");
    expect(r.customerId).toBe("c1");
    expect(r.lines).toHaveLength(2);
  });

  it("detects credit intent without a customer name", () => {
    const r = parseVoiceOrder("ek atta baad mein", products, customers);
    expect(r.paymentType).toBe("credit");
    expect(r.customerId).toBeNull();
    expect(r.lines[0]).toMatchObject({ productId: "atta", qty: 1 });
  });

  it("keeps unknown items as unmatched lines instead of guessing", () => {
    const r = parseVoiceOrder("3 spaceship", products);
    expect(r.lines[0].productId).toBeNull();
    expect(r.lines[0].qty).toBe(3);
  });

  it("never matches on mid-word substrings", () => {
    const r = parseVoiceOrder("one week", products); // 'ek' inside 'week' must not become a number
    expect(r.lines[0].qty).toBe(1);
    expect(r.lines[0].productId).toBeNull();
  });
});

describe("clampToStock", () => {
  it("never exceeds shelf stock", () => {
    expect(clampToStock(8, 5)).toBe(5);
    expect(clampToStock(2, 5)).toBe(2);
    expect(clampToStock(3, 0)).toBe(0);
  });
});
