// Regression test on a REAL model answer: gemini-3.5-flash-lite reading a synthetic
// Al-Rehman Traders bill (captured 2026-11-14). It checks the whole deterministic
// pipeline after the AI step: response check → catalog match → unit cost → total check.
import { describe, it, expect } from "vitest";
import { parseBillScanResponse } from "@/services/billScan";
import { matchProduct, deriveUnitCost, lineTotalMismatch, costChangePercent } from "@/domain/billMatching";
import { getBranchSeedData } from "@/data/seedData";

const REAL_MODEL_OUTPUT = {
  readable: true,
  supplier: "AL-REHMAN TRADERS",
  invoiceNumber: "AR-4471",
  billDate: "2026-11-12",
  billTotal: 23872,
  lines: [
    { name: "Tapal Danedar 450gm", nameEnglish: "Tapal Danedar Tea 450g", quantity: 12, unit: null, unitPrice: 585, lineTotal: 7020 },
    { name: "Dalda Cooking Oil 1 Ltr", nameEnglish: "Dalda Cooking Oil 1L", quantity: 10, unit: "Ltr", unitPrice: 525, lineTotal: 5250 },
    { name: "Cheeni 1 kg", nameEnglish: "Sugar 1kg", quantity: 50, unit: "kg", unitPrice: 145, lineTotal: 7250 },
    { name: "Shan Biryani Masala", nameEnglish: "Shan Biryani Masala", quantity: 24, unit: null, unitPrice: 98, lineTotal: 2352 },
    { name: "Lifebuoy Soap 115g", nameEnglish: "Lifebuoy Soap 115g", quantity: 20, unit: null, unitPrice: 112, lineTotal: 2000 },
  ],
};

describe("real scan → demo catalog", () => {
  const { products } = getBranchSeedData("shop-al-madina-01");
  const scan = parseBillScanResponse(REAL_MODEL_OUTPUT);
  const rows = scan.lines.map((l) => ({
    line: l,
    match: matchProduct([l.nameEnglish, l.name], products),
  }));

  it("keeps the header fields", () => {
    expect(scan.supplier).toBe("AL-REHMAN TRADERS");
    expect(scan.invoiceNumber).toBe("AR-4471");
    expect(scan.billDate).toBe("2026-11-12");
  });

  it("matches every line to the right demo product with high confidence", () => {
    const name = (id: string | null) => products.find((p) => p.id === id)?.nameEn;
    expect(rows.map((r) => name(r.match.productId))).toEqual([
      "Tapal Danedar Tea 450g",
      "Dalda Cooking Oil 1L Pouch",
      "White Refined Sugar (Cheeni) 1kg",
      "Shan Special Biryani Masala",
      "Lifebuoy Total Soap 115g",
    ]);
    expect(rows.every((r) => r.match.confidence === "high")).toBe(true);
  });

  it("flags only the Lifebuoy line, whose printed amount ≠ 20 × 112", () => {
    expect(rows.map((r) => lineTotalMismatch(r.line.quantity, r.line.unitPrice, r.line.lineTotal)))
      .toEqual([false, false, false, false, true]);
  });

  it("computes cost changes vs the demo buy prices", () => {
    const changes = rows.map((r) => {
      const p = products.find((x) => x.id === r.match.productId)!;
      return costChangePercent(deriveUnitCost(r.line.quantity, r.line.unitPrice, r.line.lineTotal)!, p.buyPrice);
    });
    // Tea 570→585, Oil 480→525 (Mahngai alert > 5%), Sugar 140→145, Masala 105→98, Soap 110→112
    expect(changes).toEqual([2.6, 9.4, 3.6, -6.7, 1.8]);
  });
});
