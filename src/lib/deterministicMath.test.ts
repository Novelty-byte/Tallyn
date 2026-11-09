// Vitest / Unit Test for Deterministic Financial & Inventory Math Engine
// Module 3.1 & Phase 5 Quality Assurance — Inviolable Rule 1: Zero Hallucinated Numbers.

import { describe, it, expect } from "vitest";
import { computeDailyPulse, computeRunRate, computeRecommendedReorder } from "./deterministicMath";
import { Sale, Product } from "@/types";

const today = new Date().toISOString();

const mockSales: Sale[] = [
  {
    id: "s1",
    shopId: "shop1",
    createdAt: today,
    paymentType: "cash",
    totalAmount: 1000,
    items: [{ productId: "p1", productName: "Tea", quantity: 2, unitPrice: 500, unitCost: 400 }],
    status: "completed",
  },
  {
    id: "s2",
    shopId: "shop1",
    createdAt: today,
    paymentType: "credit",
    customerId: "c1",
    customerName: "Ali",
    totalAmount: 1500,
    items: [{ productId: "p2", productName: "Oil", quantity: 3, unitPrice: 500, unitCost: 420 }],
    status: "completed",
  },
  {
    id: "s3",
    shopId: "shop1",
    createdAt: today,
    paymentType: "cash",
    totalAmount: 800,
    items: [{ productId: "p1", productName: "Tea", quantity: 1, unitPrice: 800, unitCost: 650 }],
    status: "undone", // must be excluded from every metric
  },
];

const mockProduct: Product = {
  id: "p1",
  nameEn: "Tapal Tea",
  nameUr: "ٹاپل چائے",
  category: "staples",
  quantity: 28,
  buyPrice: 400,
  sellPrice: 500,
  minQuantity: 10,
  unit: "pack",
};

describe("computeDailyPulse", () => {
  it("computes revenue from completed sales only", () => {
    const pulse = computeDailyPulse(mockSales);
    expect(pulse.totalRevenue).toBe(2500); // 1000 + 1500, undone s3 excluded
    expect(pulse.transactionCount).toBe(2);
  });

  it("splits cash received vs credit extended", () => {
    const pulse = computeDailyPulse(mockSales);
    expect(pulse.cashReceived).toBe(1000);
    expect(pulse.creditExtended).toBe(1500);
  });

  it("computes COGS and gross profit from unit costs", () => {
    const pulse = computeDailyPulse(mockSales);
    expect(pulse.costOfGoodsSold).toBe(2 * 400 + 3 * 420); // 2060
    expect(pulse.grossProfit).toBe(2500 - 2060); // 440
  });

  it("handles empty sales without division errors", () => {
    const pulse = computeDailyPulse([]);
    expect(pulse.totalRevenue).toBe(0);
    expect(pulse.grossProfit).toBe(0);
    expect(pulse.netMarginPercent).toBe(0);
    expect(pulse.transactionCount).toBe(0);
  });
});

describe("computeRunRate", () => {
  it("enforces the 0.5 units/day minimum floor", () => {
    const rate = computeRunRate(mockProduct, mockSales);
    expect(rate.avgDailyUnits).toBeGreaterThanOrEqual(0.5);
  });

  it("returns positive days-left for in-stock products", () => {
    const rate = computeRunRate(mockProduct, mockSales);
    expect(rate.daysLeft).toBeGreaterThan(0);
  });

  it("depletes faster as units sold increase", () => {
    const heavySale: Sale = {
      id: "s4",
      shopId: "shop1",
      createdAt: today,
      paymentType: "cash",
      totalAmount: 5000,
      items: [{ productId: "p1", productName: "Tea", quantity: 14, unitPrice: 500, unitCost: 400 }],
      status: "completed",
    };
    const rate = computeRunRate(mockProduct, [heavySale]);
    // 14 units over 14 days = 1/day floor applies? No: 1 >= 0.5, so 28/1 = 28 days
    expect(rate.avgDailyUnits).toBe(1);
    expect(rate.daysLeft).toBe(28);
  });
});

describe("computeRecommendedReorder", () => {
  it("reorders up to target inventory (rate × lead+buffer − stock)", () => {
    // Target = 1 × (2 + 3) = 5... using avgDailyUnits=10: 10 × 5 = 50 − 28 = 22
    expect(computeRecommendedReorder(mockProduct, 10, 2, 3)).toBe(22);
  });

  it("never recommends a negative quantity", () => {
    expect(computeRecommendedReorder(mockProduct, 1, 2, 3)).toBe(0);
  });
});
