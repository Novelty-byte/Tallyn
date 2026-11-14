// Vitest / Unit Test for Deterministic Financial & Inventory Math Engine
// Module 3.1 & Phase 5 Quality Assurance — Inviolable Rule 1: Zero Hallucinated Numbers.

import { describe, it, expect } from "vitest";
import { computeDailyPulse } from "@/domain/dailyPulse";
import { Sale } from "@/types";
// Run-rate / reorder math now lives in domain/insights.ts (tested in insights.test.ts).

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
