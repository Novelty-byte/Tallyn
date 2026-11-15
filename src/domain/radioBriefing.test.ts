import { describe, it, expect } from "vitest";
import type { Customer, Product, Sale } from "@/types";
import { pickRadioVoice, radioBriefing, radioFacts, type RadioFacts } from "@/domain/radioBriefing";

const prod = (id: string, nameEn: string, quantity: number, minQuantity = 5, nameUr?: string): Product => ({
  id, nameEn, nameUr, category: "staples", quantity, buyPrice: 100, sellPrice: 120, minQuantity, unit: "pc",
});
const at = (ymd: string) => new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)), 12).toISOString();
const sale = (id: string, ymd: string, total: number, status: "completed" | "undone" = "completed"): Sale => ({
  id, shopId: "s1", createdAt: at(ymd), paymentType: "cash", totalAmount: total, status, items: [],
});
const cust = (id: string, name: string, creditBalance: number, nextDueDate?: string): Customer =>
  ({ id, name, creditBalance, nextDueDate } as Customer);

const facts = radioFacts({
  shop: { name: "Madina Store", city: "Lahore" },
  products: [prod("a", "Rooh Afza", 2, 5, "روح افزا"), prod("b", "Sugar", 1), prod("c", "Salt", 0), prod("d", "Oil", 50)],
  customers: [cust("x", "Asif", 1500.4, "2026-11-01"), cust("y", "Bashir", 3200, "2026-12-01"), cust("z", "Paid", 0, "2026-10-01")],
  sales: [sale("1", "2026-11-15", 1200), sale("2", "2026-11-15", 800.6), sale("3", "2026-11-15", 999, "undone"), sale("4", "2026-11-14", 5000)],
  today: "2026-11-15",
});

describe("radioFacts", () => {
  it("computes today's numbers in code", () => {
    expect(facts.salesCount).toBe(2);
    expect(facts.revenue).toBe(2001);
    expect(facts.lowStockCount).toBe(3);
    expect(facts.lowStock.map((l) => l.en)).toEqual(["Rooh Afza", "Sugar"]);
    expect(facts.udhaarTotal).toBe(4700);
    expect(facts.overdueCount).toBe(1); // Asif only; a zero balance is never overdue
    expect(facts.topDebtor).toEqual({ name: "Bashir", balance: 3200 });
    expect(facts.mandi).toBe("Akbari Mandi, Lahore");
  });
});

describe("radioBriefing", () => {
  it("says the same numbers in every language and script, sentence for sentence", () => {
    const en = radioBriefing(facts, "en");
    const roman = radioBriefing(facts, "ur", "latin");
    const urdu = radioBriefing(facts, "ur", "urdu");
    const deva = radioBriefing(facts, "ur", "devanagari");
    expect(new Set([en, roman, urdu, deva].map((b) => b.sentences.length)).size).toBe(1);
    expect(en.sentences[1]).toBe("So far today: 2 sales, worth 2,001 rupees.");
    expect(roman.sentences[1]).toBe("Aaj abhi tak 2 sales hui hain, total 2,001 rupay.");
    expect(urdu.sentences[1]).toContain("2001 روپے");
    expect(deva.sentences[1]).toContain("2001 रुपये");
    expect(urdu.sentences[2]).toContain("روح افزا"); // Urdu product name when known
    expect(deva.sentences[2]).toContain("Rooh Afza");
    for (const b of [en, roman, urdu, deva]) expect(b.sentences.join(" ").replace(/,/g, "")).toContain("3200");
  });

  it("handles a quiet day with no udhaar", () => {
    const quiet: RadioFacts = { ...facts, salesCount: 0, revenue: 0, lowStockCount: 0, lowStock: [], udhaarTotal: 0, overdueCount: 0, topDebtor: null };
    expect(radioBriefing(quiet, "en").sentences).toEqual([
      "Assalam-o-Alaikum! This is Kiryana Radio with today's briefing for Madina Store, Lahore.",
      "No sales have been recorded yet today.",
      "Stock is healthy: all 4 products are above their minimum level.",
      "No udhaar is outstanding. Well done!",
    ]);
    expect(radioBriefing({ ...quiet, salesCount: 1, revenue: 50 }, "ur").sentences[1]).toBe("Aaj abhi tak 1 sale hui hai, total 50 rupay.");
  });
});

describe("pickRadioVoice", () => {
  const v = (name: string, lang: string) => ({ name, lang });
  it("prefers an Urdu voice, then Hindi (Devanagari), then English reading Roman Urdu", () => {
    expect(pickRadioVoice([v("Zira", "en-US"), v("Uzma", "ur-PK"), v("Google हिन्दी", "hi-IN")], "ur").script).toBe("urdu");
    expect(pickRadioVoice([v("Zira", "en-US"), v("Google हिन्दी", "hi-IN")], "ur")).toEqual({ voice: v("Google हिन्दी", "hi-IN"), script: "devanagari" });
    expect(pickRadioVoice([v("Zira", "en-US"), v("Ravi", "en-IN")], "ur")).toEqual({ voice: v("Ravi", "en-IN"), script: "latin" });
  });
  it("picks a South Asian English voice first, and better-quality voices within a language", () => {
    expect(pickRadioVoice([v("David", "en-US"), v("Ravi", "en-IN")], "en").voice?.name).toBe("Ravi");
    expect(pickRadioVoice([v("David", "en-US"), v("Microsoft Aria Online (Natural)", "en-US")], "en").voice?.name).toContain("Natural");
    expect(pickRadioVoice([], "ur")).toEqual({ voice: null, script: "latin" });
  });
});
