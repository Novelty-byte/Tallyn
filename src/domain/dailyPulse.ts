// Deterministic Financial & Inventory Math Engine (Module 3.1)
// Inviolable Rule 1: Zero Hallucinated Numbers. Pure TypeScript calculation.

import { Sale } from "@/types";

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
