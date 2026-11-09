// Vitest / Unit Test for Deterministic Financial & Inventory Math Engine
// Module 3.1 & Phase 5 Quality Assurance

import { computeDailyPulse, computeRunRate, computeRecommendedReorder } from "./deterministicMath";
import { Sale, Product } from "@/types";

export function runDeterministicMathTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, desc: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${desc}`);
    }
  }

  // Test 1: computeDailyPulse with mixed cash and credit sales
  const mockSales: Sale[] = [
    {
      id: "s1",
      shopId: "shop1",
      createdAt: new Date().toISOString(),
      paymentType: "cash",
      totalAmount: 1000,
      items: [{ productId: "p1", productName: "Tea", quantity: 2, unitPrice: 500, unitCost: 400 }],
      status: "completed",
    },
    {
      id: "s2",
      shopId: "shop1",
      createdAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
      paymentType: "cash",
      totalAmount: 800,
      items: [{ productId: "p1", productName: "Tea", quantity: 1, unitPrice: 800, unitCost: 650 }],
      status: "undone", // Should be excluded!
    },
  ];

  const pulse = computeDailyPulse(mockSales);
  assert(pulse.totalRevenue === 2500, "Total revenue is 2500 (ignores undone)");
  assert(pulse.cashReceived === 1000, "Cash received is 1000");
  assert(pulse.creditExtended === 1500, "Credit extended is 1500");
  assert(pulse.costOfGoodsSold === (2 * 400) + (3 * 420), "COGS is 2060");
  assert(pulse.grossProfit === 2500 - 2060, "Gross profit is 440");
  assert(pulse.transactionCount === 2, "Transaction count is 2");

  // Test 2: computeRunRate depletion formula
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

  const runRate = computeRunRate(mockProduct, mockSales);
  assert(runRate.avgDailyUnits >= 0.5, "Avg daily units enforces minimum floor 0.5");
  assert(runRate.daysLeft > 0, "Days left is positive number");

  // Test 3: computeRecommendedReorder
  const reorderQty = computeRecommendedReorder(mockProduct, 10, 2, 3);
  // Target inventory = 10 * (2 + 3) = 50. Current quantity = 28. Needed = 22.
  assert(reorderQty === 22, `Reorder quantity is 22 (got ${reorderQty})`);

  // Test 4: Zero sales edge case
  const emptyPulse = computeDailyPulse([]);
  assert(emptyPulse.totalRevenue === 0, "Empty pulse returns 0 revenue");
  assert(emptyPulse.grossProfit === 0, "Empty pulse returns 0 profit");
  assert(emptyPulse.netMarginPercent === 0, "Empty pulse handles zero division gracefully");

  return { passed, failed, errors };
}
