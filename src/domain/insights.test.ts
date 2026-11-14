import { describe, it, expect } from "vitest";
import type { Expense, Product, Sale } from "@/types";
import {
  windowEnding, previousWindow, dailySeries, periodSummary, percentChange, productPerformance,
  reorderPlan, expenseBreakdown, detectInsights, nextRamadan, ramadanStaples,
} from "@/domain/insights";
import { generateDemoHistory, DEMO_HISTORY_DAYS } from "@/data/demoHistory";
import { getBranchSeedData } from "@/data/seedData";
import { addDays, toLocalYmd } from "@/domain/credit";

const TODAY = "2026-11-15";
const at = (ymd: string, h = 12) =>
  new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)), h).toISOString();
const prod = (id: string, quantity: number, minQuantity = 2, buyPrice = 100, extra: Partial<Product> = {}): Product => ({
  id, nameEn: id, category: "staples", quantity, buyPrice, sellPrice: buyPrice * 1.2, minQuantity, unit: "pc", ...extra,
});
const sale = (ymd: string, productId: string, qty: number, price = 120, cost = 100, type: "cash" | "credit" = "cash", status: "completed" | "undone" = "completed"): Sale => ({
  id: `${ymd}-${productId}-${qty}-${type}-${status}`, shopId: "s", createdAt: at(ymd), paymentType: type,
  totalAmount: qty * price, status, items: [{ productId, productName: productId, quantity: qty, unitPrice: price, unitCost: cost }],
});

describe("windows", () => {
  it("are inclusive and chain backwards", () => {
    const w = windowEnding(TODAY, 7);
    expect(w).toEqual({ from: "2026-11-09", to: "2026-11-15", days: 7 });
    expect(previousWindow(w)).toEqual({ from: "2026-11-02", to: "2026-11-08", days: 7 });
  });
});

describe("dailySeries & periodSummary", () => {
  const sales = [
    sale("2026-11-15", "a", 2), sale("2026-11-15", "b", 1, 120, 100, "credit"),
    sale("2026-11-14", "a", 1), sale("2026-11-15", "a", 9, 120, 100, "cash", "undone"),
    sale("2026-11-01", "a", 5),
  ];
  const expenses: Expense[] = [
    { id: "1", title: "Bill", amount: 50, category: "Electricity", date: "2026-11-14" },
    { id: "2", title: "Old", amount: 999, category: "Rent", date: "2026-10-01" },
  ];
  const w = windowEnding(TODAY, 2);

  it("has one point per day, zero-filled, undone sales excluded", () => {
    expect(dailySeries(sales, w)).toEqual([
      { date: "2026-11-14", revenue: 120, cash: 120, credit: 0, grossProfit: 20, salesCount: 1 },
      { date: "2026-11-15", revenue: 360, cash: 240, credit: 120, grossProfit: 60, salesCount: 2 },
    ]);
  });
  it("sums profit and expenses inside the window only", () => {
    expect(periodSummary(sales, expenses, w)).toEqual({
      revenue: 480, cash: 360, credit: 120, costOfGoods: 400, grossProfit: 80,
      expenses: 50, netProfit: 30, salesCount: 3, grossMarginPct: 16.7,
    });
  });
  it("percentChange needs a baseline", () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe("productPerformance & expenseBreakdown", () => {
  it("ranks what sold in the window", () => {
    const perf = productPerformance([prod("a", 5), prod("b", 5)], [sale(TODAY, "a", 3), sale(TODAY, "b", 1)], windowEnding(TODAY, 7));
    expect(perf.map((p) => [p.productId, p.unitsSold, p.revenue, p.grossProfit])).toEqual([["a", 3, 360, 60], ["b", 1, 120, 20]]);
  });
  it("groups expenses by category, largest first", () => {
    const e = (amount: number, category: Expense["category"], date = TODAY): Expense => ({ id: `${amount}`, title: "x", amount, category, date });
    expect(expenseBreakdown([e(100, "Rent"), e(300, "Staff"), e(50, "Rent"), e(999, "Rent", "2026-01-01")], windowEnding(TODAY, 30)))
      .toEqual([{ category: "Staff", amount: 300 }, { category: "Rent", amount: 150 }]);
  });
});

describe("reorderPlan", () => {
  // 28 units over the last 14 days → 2 / day
  const sales = Array.from({ length: 14 }, (_, i) => sale(addDays(TODAY, -i), "fast", 2));
  sales.push(sale(addDays(TODAY, -20), "fast", 100)); // outside the 14-day window: ignored

  it("uses only the last 14 days and the shop's lead time", () => {
    const [r] = reorderPlan([prod("fast", 10, 2)], sales, TODAY, 2, 3);
    expect(r.avgDailyUnits).toBe(2);
    expect(r.daysLeft).toBe(5);
    expect(r.reorderQty).toBe(0);            // 2 × (2 + 3) − 10 = 0
    expect(r.status).toBe("reorder");        // runs out within lead + buffer
    const [r2] = reorderPlan([prod("fast", 10, 2)], sales, TODAY, 7, 3);
    expect(r2.reorderQty).toBe(10);          // 2 × (7 + 3) − 10
  });
  it("never invents a run-rate for items with no recent sales", () => {
    const [r] = reorderPlan([prod("slow", 10, 2)], [], TODAY, 2);
    expect(r).toMatchObject({ avgDailyUnits: 0, daysLeft: null, reorderQty: 0, status: "ok" });
  });
  it("flags low and out of stock", () => {
    const plan = reorderPlan([prod("x", 0, 2), prod("y", 2, 2)], [], TODAY, 2);
    expect(plan.map((r) => r.status)).toEqual(["out", "low"]);
  });
});

describe("detectInsights", () => {
  it("catches a weekday sales drop against the same weekday", () => {
    const y = addDays(TODAY, -1);
    const sales = [sale(y, "a", 1), ...[7, 14, 21, 28].map((d) => sale(addDays(y, -d), "a", 10))];
    const ins = detectInsights({ products: [], sales, expenses: [], customers: [], today: TODAY, leadTimeDays: 2 });
    expect(ins.find((i) => i.kind === "sales_drop")?.headline).toBe("Yesterday's sales were 90% lower than a normal Saturday.");
  });
  it("catches an expense spike vs the previous bills", () => {
    const e = (amount: number, date: string): Expense => ({ id: date, title: "IESCO", amount, category: "Electricity", date });
    const ins = detectInsights({
      products: [], sales: [], customers: [], today: TODAY, leadTimeDays: 2,
      expenses: [e(24800, "2026-11-05"), e(14000, "2026-10-05"), e(15000, "2026-09-05"), e(14500, "2026-08-05")],
    });
    expect(ins.find((i) => i.kind === "expense_spike")?.headline).toBe("Electricity is 71% above normal.");
  });
  it("reports dead stock with the money tied up", () => {
    const ins = detectInsights({ products: [prod("Rooh Afza", 6, 2, 370)], sales: [], expenses: [], customers: [], today: TODAY, leadTimeDays: 2 });
    expect(ins.find((i) => i.kind === "dead_stock")?.headline).toBe("Rooh Afza: 0 sold in 30 days, PKR 2,220 tied up.");
  });
  it("reports items about to expire", () => {
    const ins = detectInsights({
      products: [prod("Milk", 4, 1, 100, { expiryDate: "2026-11-17" })], sales: [sale(TODAY, "Milk", 1)],
      expenses: [], customers: [], today: TODAY, leadTimeDays: 2,
    });
    expect(ins.find((i) => i.kind === "near_expiry")?.headline).toBe("Milk expires in 2 days.");
  });
});

describe("Ramadan", () => {
  it("counts down to the next expected start", () => {
    expect(nextRamadan(TODAY)).toEqual({ start: "2027-02-08", daysUntil: 85 });
  });
  it("picks Ramadan staples by name", () => {
    const plan = reorderPlan([prod("White Sugar 1kg", 5), prod("Lifebuoy Soap", 5), prod("Rooh Afza 800ml", 5)], [], TODAY, 2);
    expect(ramadanStaples(plan).map((r) => r.name)).toEqual(["White Sugar 1kg", "Rooh Afza 800ml"]);
  });
});

describe("generated demo history", () => {
  const now = new Date(2026, 10, 15, 15, 30); // Sun 15 Nov 2026, 3:30 pm
  const today = toLocalYmd(now);
  const seed = getBranchSeedData("shop-al-madina-01");
  const h = generateDemoHistory({ shopId: "shop-al-madina-01", products: seed.products, customers: seed.customers, now });

  it("is reproducible", () => {
    const again = generateDemoHistory({ shopId: "shop-al-madina-01", products: seed.products, customers: seed.customers, now });
    expect(again.sales.length).toBe(h.sales.length);
    expect(again.sales[10]).toEqual(h.sales[10]);
  });
  it("covers 60 days, with today's sales only up to now", () => {
    const days = new Set(h.sales.map((s) => toLocalYmd(new Date(s.createdAt))));
    expect(days.size).toBe(DEMO_HISTORY_DAYS);
    expect(h.sales.every((s) => new Date(s.createdAt) <= now)).toBe(true);
    expect(h.sales.some((s) => toLocalYmd(new Date(s.createdAt)) === today)).toBe(true);
  });
  it("triggers the planted anomalies: yesterday's dip, the electricity spike, dead Rooh Afza", () => {
    const ins = detectInsights({ ...seed, sales: h.sales, expenses: h.expenses, today, leadTimeDays: 2 });
    const kinds = ins.map((i) => i.kind);
    expect(kinds).toContain("sales_drop");
    expect(kinds).toContain("expense_spike");
    expect(ins.find((i) => i.kind === "dead_stock")?.headline).toMatch(/Rooh Afza/);
  });
});
