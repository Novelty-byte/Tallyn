// Store snapshot for Ask Tallyn — every number the AI may quote is computed HERE,
// in tested code, from the shop's own records (Rule 1: zero hallucinated numbers).
// The server validates and clamps this snapshot; the model only reads and explains it.

import type { Customer, Expense, Product, Sale, Shop } from "@/types";
import { addDays, customerOverdueDays, toLocalYmd } from "@/lib/credit";

export interface StoreSnapshot {
  shopName: string;
  city: string;
  currency: string;
  /** YYYY-MM-DD the snapshot was taken (shop-local). */
  date: string;
  today: { revenue: number; salesCount: number; cash: number; credit: number; grossProfit: number };
  last7Days: { revenue: number; salesCount: number; grossProfit: number };
  udhaar: { total: number; customersOwing: number; overdueCustomers: number };
  stock: { productCount: number; lowStockCount: number };
  expensesThisMonth: number;
  products: Array<{
    name: string; category: string; stock: number; unit: string;
    buyPrice: number; sellPrice: number; minStock: number; low: boolean;
  }>;
  customers: Array<{ name: string; balance: number; overdueDays: number; nextDueDate: string | null }>;
  topSellers7d: Array<{ name: string; units: number; revenue: number }>;
  notSold30d: Array<{ name: string; stock: number; stockValueAtCost: number }>;
  /** Across ALL in-stock items with no sale in 30 days (not just the listed ones). */
  notSold30dSummary: { itemCount: number; valueAtCost: number };
}

export const SNAPSHOT_LIMITS = { products: 80, customers: 40, topSellers: 8, notSold: 10 } as const;

const round2 = (n: number) => Math.round(n * 100) / 100;
const saleDay = (s: Sale) => toLocalYmd(new Date(s.createdAt));

function summarize(sales: Sale[]) {
  let revenue = 0, cash = 0, credit = 0, cost = 0;
  for (const s of sales) {
    revenue += s.totalAmount;
    if (s.paymentType === "cash") cash += s.totalAmount; else credit += s.totalAmount;
    for (const i of s.items) cost += i.unitCost * i.quantity;
  }
  return {
    revenue: round2(revenue), salesCount: sales.length, cash: round2(cash),
    credit: round2(credit), grossProfit: round2(revenue - cost),
  };
}

export function buildStoreSnapshot(
  input: { shop: Shop; products: Product[]; customers: Customer[]; sales: Sale[]; expenses: Expense[] },
  todayYmd: string = toLocalYmd(),
): StoreSnapshot {
  const { shop, products, customers, expenses } = input;
  const completed = input.sales.filter((s) => s.status === "completed");

  const weekStart = addDays(todayYmd, -6); // today + previous 6 days
  const monthStart = `${todayYmd.slice(0, 7)}-01`;
  const day30Start = addDays(todayYmd, -29);

  const todaySales = completed.filter((s) => saleDay(s) === todayYmd);
  const weekSales = completed.filter((s) => { const d = saleDay(s); return d >= weekStart && d <= todayYmd; });
  const t = summarize(todaySales);
  const w = summarize(weekSales);

  // Units/revenue per product over the last 7 days.
  const sold7 = new Map<string, { units: number; revenue: number }>();
  for (const s of weekSales) for (const i of s.items) {
    const cur = sold7.get(i.productId) ?? { units: 0, revenue: 0 };
    cur.units += i.quantity;
    cur.revenue += i.quantity * i.unitPrice;
    sold7.set(i.productId, cur);
  }
  const soldIn30 = new Set<string>();
  for (const s of completed) {
    const d = saleDay(s);
    if (d >= day30Start && d <= todayYmd) for (const i of s.items) soldIn30.add(i.productId);
  }

  const name = (p: Product) => p.nameEn || p.name || "Item";
  const owing = customers.filter((c) => c.creditBalance > 0);
  const notSold = products
    .filter((p) => p.quantity > 0 && !soldIn30.has(p.id))
    .map((p) => ({ name: name(p), stock: p.quantity, stockValueAtCost: round2(p.quantity * p.buyPrice) }))
    .sort((a, b) => b.stockValueAtCost - a.stockValueAtCost);

  return {
    shopName: shop.name,
    city: shop.city || "",
    currency: shop.currency || "PKR",
    date: todayYmd,
    today: t,
    last7Days: { revenue: w.revenue, salesCount: w.salesCount, grossProfit: w.grossProfit },
    udhaar: {
      total: round2(owing.reduce((s, c) => s + c.creditBalance, 0)),
      customersOwing: owing.length,
      overdueCustomers: owing.filter((c) => customerOverdueDays(c, todayYmd) > 0).length,
    },
    stock: {
      productCount: products.length,
      lowStockCount: products.filter((p) => p.quantity <= p.minQuantity).length,
    },
    expensesThisMonth: round2(
      expenses.filter((e) => e.date >= monthStart && e.date <= todayYmd).reduce((s, e) => s + e.amount, 0),
    ),
    // Low-stock items first so they survive the size cap.
    products: [...products]
      .sort((a, b) => Number(b.quantity <= b.minQuantity) - Number(a.quantity <= a.minQuantity))
      .slice(0, SNAPSHOT_LIMITS.products)
      .map((p) => ({
        name: name(p), category: p.category, stock: p.quantity, unit: p.unit,
        buyPrice: p.buyPrice, sellPrice: p.sellPrice, minStock: p.minQuantity, low: p.quantity <= p.minQuantity,
      })),
    customers: [...owing]
      .sort((a, b) => b.creditBalance - a.creditBalance)
      .slice(0, SNAPSHOT_LIMITS.customers)
      .map((c) => ({
        name: c.name,
        balance: round2(c.creditBalance),
        overdueDays: customerOverdueDays(c, todayYmd),
        nextDueDate: c.nextDueDate ?? null,
      })),
    topSellers7d: products
      .filter((p) => sold7.has(p.id))
      .map((p) => ({ name: name(p), units: sold7.get(p.id)!.units, revenue: round2(sold7.get(p.id)!.revenue) }))
      .sort((a, b) => b.units - a.units)
      .slice(0, SNAPSHOT_LIMITS.topSellers),
    notSold30d: notSold.slice(0, SNAPSHOT_LIMITS.notSold),
    notSold30dSummary: {
      itemCount: notSold.length,
      valueAtCost: round2(notSold.reduce((s, n) => s + n.stockValueAtCost, 0)),
    },
  };
}
