// Deterministic Financial & Inventory Math Engine (Module 3.1)
// Inviolable Rule 1: Zero Hallucinated Numbers. Pure TypeScript calculation.

import { Sale, Product } from "@/types";

export interface DailyPulseMetrics {
  totalRevenue: number;
  cashReceived: number;
  creditExtended: number;
  costOfGoodsSold: number;
  grossProfit: number;
  netMarginPercent: number;
  transactionCount: number;
}

export function computeDailyPulse(sales: Sale[]): DailyPulseMetrics {
  const completedSales = sales.filter((s) => s.status === "completed");

  let totalRevenue = 0;
  let cashReceived = 0;
  let creditExtended = 0;
  let costOfGoodsSold = 0;

  for (const sale of completedSales) {
    totalRevenue += sale.totalAmount;
    if (sale.paymentType === "cash") {
      cashReceived += sale.totalAmount;
    } else {
      creditExtended += sale.totalAmount;
    }

    for (const item of sale.items) {
      costOfGoodsSold += item.unitCost * item.quantity;
    }
  }

  const grossProfit = totalRevenue - costOfGoodsSold;
  const netMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    cashReceived,
    creditExtended,
    costOfGoodsSold,
    grossProfit,
    netMarginPercent: Math.round(netMarginPercent * 10) / 10,
    transactionCount: completedSales.length,
  };
}

export function computeRunRate(product: Product, sales: Sale[]): { daysLeft: number; avgDailyUnits: number } {
  // Aggregate sales for this product
  let unitsSold = 0;
  for (const sale of sales) {
    if (sale.status !== "completed") continue;
    for (const item of sale.items) {
      if (item.productId === product.id) {
        unitsSold += item.quantity;
      }
    }
  }

  // Assume 14-day window for calculation
  const avgDailyUnits = Math.max(unitsSold / 14, 0.5);
  const daysLeft = Math.round(product.quantity / avgDailyUnits);

  return {
    daysLeft,
    avgDailyUnits: Math.round(avgDailyUnits * 10) / 10,
  };
}

export function computeRecommendedReorder(
  product: Product,
  avgDailyUnits: number,
  leadDays: number = 2,
  bufferDays: number = 3
): number {
  const targetInventory = avgDailyUnits * (leadDays + bufferDays);
  const reorderQty = Math.ceil(targetInventory - product.quantity);
  return Math.max(reorderQty, 0);
}
