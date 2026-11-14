import { describe, it, expect } from "vitest";
import type { Product } from "@/types";
import {
  normalizeName, nameSimilarity, matchProduct, deriveUnitCost, lineTotalMismatch,
  costChangePercent, marginKeepingPrice, MATCH_HIGH,
} from "./billMatching";

const p = (id: string, nameEn: string, buyPrice = 100, sellPrice = 120): Product => ({
  id, nameEn, category: "staples", quantity: 10, buyPrice, sellPrice, minQuantity: 2, unit: "pc",
});

const catalog: Product[] = [
  p("flour", "Fine Wheat Flour (Aata) 10kg Bag", 1240, 1350),
  p("sugar", "White Refined Sugar (Cheeni) 1kg", 140, 155),
  p("tea", "Tapal Danedar Tea 450g", 570, 650),
  p("oil1", "Dalda Cooking Oil 1L Pouch", 480, 540),
  p("oil5", "Dalda Cooking Oil 5L Tin", 2300, 2550),
  p("milk", "MilkPak Dairy Milk 1L", 260, 290),
  p("soap", "Lifebuoy Total Soap 115g", 110, 130),
];

describe("normalizeName", () => {
  it("joins sizes and canonicalises units", () => {
    expect(normalizeName("Dalda Oil 1 Ltr")).toEqual(["dalda", "oil", "1l"]);
    expect(normalizeName("Tapal Danedar 450 gms")).toEqual(["tapal", "danedar", "450g"]);
    expect(normalizeName("Atta 10 KG")).toEqual(["flour", "10kg"]);
  });
  it("maps Roman-Urdu shop words to English", () => {
    expect(normalizeName("cheeni 1kg")).toEqual(["sugar", "1kg"]);
    expect(normalizeName("Doodh pack")).toEqual(["milk"]);
  });
});

describe("matchProduct", () => {
  it.each([
    ["TAPAL DANEDAR 450GM", "tea"],
    ["Dalda Cooking Oil 1 Ltr", "oil1"],
    ["Dalda oil 5 litre", "oil5"],
    ["Cheeni 1 kg", "sugar"],
    ["Atta 10kg", "flour"],
    ["Milk Pak 1L", "milk"],
    ["Lifebouy Soap 115g", "soap"], // OCR typo
  ])("%s → %s", (bill, expected) => {
    expect(matchProduct([bill], catalog).productId).toBe(expected);
  });

  it("uses the English reading when the printed name is in Urdu script", () => {
    const m = matchProduct(["چینی", "Sugar 1kg"], catalog);
    expect(m.productId).toBe("sugar");
    expect(m.confidence).toBe("high");
  });

  it("does not force a match for unknown items", () => {
    const m = matchProduct(["Shan Biryani Masala"], catalog);
    expect(m.productId).toBeNull();
    expect(m.confidence).toBe("none");
  });

  it("penalises a different pack size", () => {
    expect(nameSimilarity("Dalda Cooking Oil 1L", "Dalda Cooking Oil 5L Tin"))
      .toBeLessThan(nameSimilarity("Dalda Cooking Oil 1L", "Dalda Cooking Oil 1L Pouch"));
  });

  it("an exact name is a high-confidence match", () => {
    expect(nameSimilarity("Tapal Danedar Tea 450g", "Tapal Danedar Tea 450g")).toBeGreaterThanOrEqual(MATCH_HIGH);
  });
});

describe("deterministic line figures", () => {
  it("prefers the printed unit price", () => {
    expect(deriveUnitCost(12, 580, 6960)).toBe(580);
  });
  it("derives unit cost from line total ÷ qty when no unit price is printed", () => {
    expect(deriveUnitCost(3, null, 1000)).toBe(333.33);
  });
  it("returns null when nothing usable is printed", () => {
    expect(deriveUnitCost(null, null, 500)).toBeNull();
    expect(deriveUnitCost(0, null, 500)).toBeNull();
  });
  it("flags a line total that disagrees with qty × price", () => {
    expect(lineTotalMismatch(12, 580, 6960)).toBe(false);
    expect(lineTotalMismatch(12, 580, 6000)).toBe(true);
    expect(lineTotalMismatch(3, 333.33, 1000)).toBe(false); // rounding is fine
  });
  it("computes cost change vs last buy price", () => {
    expect(costChangePercent(520, 480)).toBe(8.3);
    expect(costChangePercent(470, 480)).toBe(-2.1);
    expect(costChangePercent(100, 0)).toBeNull();
  });
  it("suggests a retail price that keeps the margin", () => {
    // 540/480 markup = 1.125 → 520 × 1.125 = 585
    expect(marginKeepingPrice(520, 480, 540)).toBe(585);
  });
});
