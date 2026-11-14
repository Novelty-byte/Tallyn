import { describe, it, expect } from "vitest";
import type { Customer, Product, Sale, Shop } from "@/types";
import { buildStoreSnapshot } from "@/domain/storeSnapshot";

const shop: Shop = {
  id: "s1", name: "Madina Store", ownerName: "A", currency: "PKR", phone: "", address: "",
  city: "Islamabad", lowStockThreshold: 5, leadTimeDays: 2,
};
const prod = (id: string, nameEn: string, quantity: number, minQuantity = 5, buyPrice = 100): Product => ({
  id, nameEn, category: "staples", quantity, buyPrice, sellPrice: buyPrice + 20, minQuantity, unit: "pc",
});
const at = (ymd: string, h = 12) => new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)), h).toISOString();
const sale = (id: string, ymd: string, productId: string, qty: number, price: number, cost: number, type: "cash" | "credit" = "cash", status: "completed" | "undone" = "completed"): Sale => ({
  id, shopId: "s1", createdAt: at(ymd), paymentType: type, totalAmount: qty * price, status,
  items: [{ productId, productName: productId, quantity: qty, unitPrice: price, unitCost: cost }],
});

const products = [prod("tea", "Tea", 3), prod("oil", "Oil", 20), prod("soap", "Soap", 10, 5, 50), prod("salt", "Salt", 0)];
const sales: Sale[] = [
  sale("a", "2026-11-15", "tea", 2, 120, 100),           // today, cash
  sale("b", "2026-11-15", "oil", 1, 120, 100, "credit"), // today, credit
  sale("c", "2026-11-15", "oil", 5, 120, 100, "cash", "undone"), // undone: ignored everywhere
  sale("d", "2026-11-10", "oil", 3, 120, 100),           // in last 7 days
  sale("e", "2026-11-01", "tea", 1, 120, 100),           // older than 7 days, within 30
  sale("f", "2026-09-01", "soap", 4, 70, 50),            // older than 30 days
];
const customers: Customer[] = [
  { id: "c1", name: "Asif", phone: "", creditBalance: 500, creditLimit: 0, nextDueDate: "2026-11-10" },
  { id: "c2", name: "Bilal", phone: "", creditBalance: 900, creditLimit: 0, nextDueDate: "2026-11-20" },
  { id: "c3", name: "Clear", phone: "", creditBalance: 0, creditLimit: 0 },
];

const snap = buildStoreSnapshot(
  { shop, products, customers, sales, expenses: [
    { id: "e1", title: "Bill", amount: 3000, category: "Electricity", date: "2026-11-03" },
    { id: "e2", title: "Old", amount: 999, category: "Rent", date: "2026-10-30" },
  ] },
  "2026-11-15",
);

describe("buildStoreSnapshot", () => {
  it("today means today only, never all-time", () => {
    expect(snap.today).toEqual({ revenue: 360, salesCount: 2, cash: 240, credit: 120, grossProfit: 60 });
  });
  it("last 7 days includes today and the previous 6 days", () => {
    expect(snap.last7Days).toEqual({ revenue: 720, salesCount: 3, grossProfit: 120 });
  });
  it("summarises udhaar from customers who owe", () => {
    expect(snap.udhaar).toEqual({ total: 1400, customersOwing: 2, overdueCustomers: 1 });
    expect(snap.customers.map((c) => [c.name, c.overdueDays])).toEqual([["Bilal", 0], ["Asif", 5]]);
  });
  it("counts this month's expenses only", () => {
    expect(snap.expensesThisMonth).toBe(3000);
  });
  it("lists low stock first", () => {
    expect(snap.stock).toEqual({ productCount: 4, lowStockCount: 2 });
    expect(snap.products.slice(0, 2).every((p) => p.low)).toBe(true);
  });
  it("ranks top sellers over the last 7 days", () => {
    expect(snap.topSellers7d).toEqual([
      { name: "Oil", units: 4, revenue: 480 },
      { name: "Tea", units: 2, revenue: 240 },
    ]);
  });
  it("lists in-stock items with no sale in 30 days, with their value at cost", () => {
    expect(snap.notSold30d).toEqual([{ name: "Soap", stock: 10, stockValueAtCost: 500 }]);
    expect(snap.notSold30dSummary).toEqual({ itemCount: 1, valueAtCost: 500 });
  });
  it("totals stuck stock across ALL unsold items, not just the listed ten", () => {
    const many = Array.from({ length: 15 }, (_, i) => prod(`x${i}`, `Item ${i}`, 2, 1, 10));
    const s = buildStoreSnapshot({ shop, products: many, customers: [], sales: [], expenses: [] }, "2026-11-15");
    expect(s.notSold30d).toHaveLength(10);
    expect(s.notSold30dSummary).toEqual({ itemCount: 15, valueAtCost: 300 });
  });
});
