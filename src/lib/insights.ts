// Deterministic insights engine (plan §9). Pure functions, unit-tested; the AI and the
// UI only display what these return. Dates are shop-local calendar days (YYYY-MM-DD).

import type { Customer, Expense, Product, Sale } from "@/types";
import { addDays, customerOverdueDays, dayDiff, toLocalYmd } from "@/lib/credit";

const round2 = (n: number) => Math.round(n * 100) / 100;
export const saleDay = (s: Sale) => toLocalYmd(new Date(s.createdAt));
const completed = (sales: Sale[]) => sales.filter((s) => s.status === "completed");

/** Inclusive window of `days` calendar days ending on `end`. */
export interface DayWindow { from: string; to: string; days: number }
export function windowEnding(end: string, days: number): DayWindow {
  return { from: addDays(end, -(days - 1)), to: end, days };
}
export const previousWindow = (w: DayWindow): DayWindow => windowEnding(addDays(w.from, -1), w.days);
const inWindow = (ymd: string, w: DayWindow) => ymd >= w.from && ymd <= w.to;

/* ------------------------------ daily series ------------------------------ */

export interface DayPoint { date: string; revenue: number; cash: number; credit: number; grossProfit: number; salesCount: number }

export function dailySeries(sales: Sale[], w: DayWindow): DayPoint[] {
  const byDay = new Map<string, DayPoint>();
  for (let i = 0; i < w.days; i++) {
    const date = addDays(w.from, i);
    byDay.set(date, { date, revenue: 0, cash: 0, credit: 0, grossProfit: 0, salesCount: 0 });
  }
  for (const s of completed(sales)) {
    const pt = byDay.get(saleDay(s));
    if (!pt) continue;
    const cost = s.items.reduce((c, i) => c + i.unitCost * i.quantity, 0);
    pt.revenue += s.totalAmount;
    if (s.paymentType === "cash") pt.cash += s.totalAmount; else pt.credit += s.totalAmount;
    pt.grossProfit += s.totalAmount - cost;
    pt.salesCount += 1;
  }
  return [...byDay.values()].map((p) => ({
    ...p, revenue: round2(p.revenue), cash: round2(p.cash), credit: round2(p.credit), grossProfit: round2(p.grossProfit),
  }));
}

/* ------------------------------ period summary ------------------------------ */

export interface PeriodSummary {
  revenue: number; cash: number; credit: number; costOfGoods: number; grossProfit: number;
  expenses: number; netProfit: number; salesCount: number;
  /** Gross margin %, or null with no sales. */
  grossMarginPct: number | null;
}

export function periodSummary(sales: Sale[], expenses: Expense[], w: DayWindow): PeriodSummary {
  let revenue = 0, cash = 0, credit = 0, cost = 0, count = 0;
  for (const s of completed(sales)) {
    if (!inWindow(saleDay(s), w)) continue;
    revenue += s.totalAmount;
    if (s.paymentType === "cash") cash += s.totalAmount; else credit += s.totalAmount;
    cost += s.items.reduce((c, i) => c + i.unitCost * i.quantity, 0);
    count++;
  }
  const exp = expenses.filter((e) => inWindow(e.date, w)).reduce((t, e) => t + e.amount, 0);
  const gross = revenue - cost;
  return {
    revenue: round2(revenue), cash: round2(cash), credit: round2(credit), costOfGoods: round2(cost),
    grossProfit: round2(gross), expenses: round2(exp), netProfit: round2(gross - exp), salesCount: count,
    grossMarginPct: revenue > 0 ? Math.round((gross / revenue) * 1000) / 10 : null,
  };
}

/** % change from `previous` to `current`, one decimal; null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/* --------------------------- product performance --------------------------- */

export interface ProductPerformance {
  productId: string; name: string; category: string; unit: string;
  unitsSold: number; revenue: number; grossProfit: number; stock: number;
}

export function productPerformance(products: Product[], sales: Sale[], w: DayWindow): ProductPerformance[] {
  const agg = new Map<string, { units: number; revenue: number; profit: number }>();
  for (const s of completed(sales)) {
    if (!inWindow(saleDay(s), w)) continue;
    for (const i of s.items) {
      const a = agg.get(i.productId) ?? { units: 0, revenue: 0, profit: 0 };
      a.units += i.quantity;
      a.revenue += i.quantity * i.unitPrice;
      a.profit += i.quantity * (i.unitPrice - i.unitCost);
      agg.set(i.productId, a);
    }
  }
  return products.map((p) => {
    const a = agg.get(p.id) ?? { units: 0, revenue: 0, profit: 0 };
    return {
      productId: p.id, name: p.nameEn || p.name || "Item", category: p.category, unit: p.unit,
      unitsSold: a.units, revenue: round2(a.revenue), grossProfit: round2(a.profit), stock: p.quantity,
    };
  });
}

/* ------------------------------ reorder engine ------------------------------ */

export const RUN_RATE_DAYS = 14;
export const DEFAULT_BUFFER_DAYS = 3;

export interface ReorderLine {
  productId: string; name: string; unit: string; stock: number; minStock: number;
  /** Units sold per day over the last 14 days. */
  avgDailyUnits: number;
  /** Whole days of stock left at that rate; null when nothing sold recently. */
  daysLeft: number | null;
  /** Units to order to cover lead time + buffer (0 = enough). */
  reorderQty: number;
  status: "out" | "low" | "reorder" | "ok";
}

/**
 * days_left = stock / avg_daily_units_14d
 * reorder_qty = ceil(avg_daily_units × (lead_time + buffer) − stock), never negative
 * status: out (0 stock) · low (≤ minimum) · reorder (runs out within lead + buffer) · ok
 */
export function reorderPlan(
  products: Product[], sales: Sale[], today: string,
  leadTimeDays: number, bufferDays = DEFAULT_BUFFER_DAYS,
): ReorderLine[] {
  const w = windowEnding(today, RUN_RATE_DAYS);
  const units = new Map<string, number>();
  for (const s of completed(sales)) {
    if (!inWindow(saleDay(s), w)) continue;
    for (const i of s.items) units.set(i.productId, (units.get(i.productId) ?? 0) + i.quantity);
  }
  const horizon = Math.max(leadTimeDays, 0) + Math.max(bufferDays, 0);
  return products.map((p) => {
    const avg = (units.get(p.id) ?? 0) / RUN_RATE_DAYS;
    const daysLeft = avg > 0 ? Math.floor(p.quantity / avg) : null;
    const reorderQty = Math.max(Math.ceil(avg * horizon - p.quantity), 0);
    const status: ReorderLine["status"] =
      p.quantity <= 0 ? "out"
      : p.quantity <= p.minQuantity ? "low"
      : daysLeft !== null && daysLeft <= horizon ? "reorder"
      : "ok";
    return {
      productId: p.id, name: p.nameEn || p.name || "Item", unit: p.unit, stock: p.quantity, minStock: p.minQuantity,
      avgDailyUnits: Math.round(avg * 10) / 10, daysLeft, reorderQty, status,
    };
  });
}

/* ----------------------------- expense breakdown ----------------------------- */

export function expenseBreakdown(expenses: Expense[], w: DayWindow) {
  const by = new Map<string, number>();
  for (const e of expenses) if (inWindow(e.date, w)) by.set(e.category, (by.get(e.category) ?? 0) + e.amount);
  return [...by.entries()]
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

/* -------------------------------- anomalies -------------------------------- */

export interface Insight {
  id: string;
  kind: "sales_drop" | "sales_up" | "expense_spike" | "dead_stock" | "near_expiry" | "low_stock" | "overdue_credit";
  severity: "critical" | "warning" | "info" | "good";
  /** One plain-language sentence, numbers included (computed here, never by AI). */
  headline: string;
  detail?: string;
  action?: { label: string; tab: "inventory" | "udhaar" | "purchases" | "pos" };
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekdayOf = (ymd: string) => new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10))).getDay();
const fmt = (n: number, cur: string) => `${cur} ${Math.round(n).toLocaleString("en-PK")}`;

export function detectInsights(input: {
  products: Product[]; sales: Sale[]; expenses: Expense[]; customers: Customer[];
  today: string; currency?: string; leadTimeDays: number;
}): Insight[] {
  const { products, sales, expenses, customers, today } = input;
  const cur = input.currency || "PKR";
  const out: Insight[] = [];

  // 1. Unusual sales day — yesterday (a complete day) vs the same weekday in the 4 weeks before.
  const yesterday = addDays(today, -1);
  const revenueOn = (ymd: string) =>
    completed(sales).filter((s) => saleDay(s) === ymd).reduce((t, s) => t + s.totalAmount, 0);
  const baseline = [7, 14, 21, 28].map((d) => revenueOn(addDays(yesterday, -d))).filter((v) => v > 0);
  if (baseline.length >= 2) {
    const avg = baseline.reduce((t, v) => t + v, 0) / baseline.length;
    const y = revenueOn(yesterday);
    const day = WEEKDAYS[weekdayOf(yesterday)];
    if (y < avg * 0.6) {
      out.push({
        id: "sales_drop", kind: "sales_drop", severity: "warning",
        headline: `Yesterday's sales were ${Math.round((1 - y / avg) * 100)}% lower than a normal ${day}.`,
        detail: `${fmt(y, cur)} vs a usual ${fmt(avg, cur)} (average of the last ${baseline.length} ${day}s).`,
      });
    } else if (y > avg * 1.4) {
      out.push({
        id: "sales_up", kind: "sales_up", severity: "good",
        headline: `Yesterday's sales were ${Math.round((y / avg - 1) * 100)}% higher than a normal ${day}.`,
        detail: `${fmt(y, cur)} vs a usual ${fmt(avg, cur)}.`,
      });
    }
  }

  // 2. Expense spike — each category's latest bill vs the average of its previous (up to 3) bills.
  const cats = new Map<string, Expense[]>();
  for (const e of expenses) if (e.date <= today) cats.set(e.category, [...(cats.get(e.category) ?? []), e]);
  for (const [category, list] of cats) {
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    const prev = sorted.slice(1, 4);
    if (prev.length < 2) continue;
    const avg = prev.reduce((t, e) => t + e.amount, 0) / prev.length;
    const latest = sorted[0];
    if (avg > 0 && latest.amount > avg * 1.5) {
      out.push({
        id: `expense_${category}`, kind: "expense_spike", severity: "warning",
        headline: `${category} is ${Math.round((latest.amount / avg - 1) * 100)}% above normal.`,
        detail: `Latest bill ${fmt(latest.amount, cur)} (${latest.date}) vs a usual ${fmt(avg, cur)}.`,
      });
    }
  }

  // 3. Dead stock — in stock, zero sales in 30 days.
  const w30 = windowEnding(today, 30);
  const sold30 = new Set<string>();
  for (const s of completed(sales)) if (inWindow(saleDay(s), w30)) for (const i of s.items) sold30.add(i.productId);
  const dead = products
    .filter((p) => p.quantity > 0 && !sold30.has(p.id))
    .map((p) => ({ p, value: p.quantity * p.buyPrice }))
    .sort((a, b) => b.value - a.value);
  if (dead.length > 0) {
    const tied = dead.reduce((t, d) => t + d.value, 0);
    out.push({
      id: "dead_stock", kind: "dead_stock", severity: "info",
      headline: dead.length === 1
        ? `${dead[0].p.nameEn}: 0 sold in 30 days, ${fmt(tied, cur)} tied up.`
        : `${dead.length} items haven't sold in 30 days, ${fmt(tied, cur)} tied up.`,
      detail: dead.length > 1 ? `Largest: ${dead.slice(0, 3).map((d) => `${d.p.nameEn} (${fmt(d.value, cur)})`).join(", ")}.` : "Consider a discount or a combo with a fast seller.",
      action: { label: "Open inventory", tab: "inventory" },
    });
  }

  // 4. Near expiry — within 7 days.
  const expiring = products
    .filter((p) => p.expiryDate && p.quantity > 0)
    .map((p) => ({ p, days: dayDiff(today, p.expiryDate!.slice(0, 10)) }))
    .filter((x) => x.days >= 0 && x.days <= 7)
    .sort((a, b) => a.days - b.days);
  for (const x of expiring.slice(0, 3)) {
    out.push({
      id: `expiry_${x.p.id}`, kind: "near_expiry", severity: x.days <= 2 ? "critical" : "warning",
      headline: x.days === 0 ? `${x.p.nameEn} expires today.` : `${x.p.nameEn} expires in ${x.days} day${x.days === 1 ? "" : "s"}.`,
      detail: `${x.p.quantity} ${x.p.unit} in stock.`,
      action: { label: "Open inventory", tab: "inventory" },
    });
  }

  // 5. Low / out of stock — summary card (details live in the reorder table).
  const plan = reorderPlan(products, sales, today, input.leadTimeDays);
  const urgent = plan.filter((r) => r.status === "out" || r.status === "low" || r.status === "reorder");
  if (urgent.length > 0) {
    const soonest = [...urgent].sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9))[0];
    out.push({
      id: "low_stock", kind: "low_stock", severity: urgent.some((r) => r.status === "out") ? "critical" : "warning",
      headline: `${urgent.length} item${urgent.length === 1 ? " needs" : "s need"} restocking soon.`,
      detail: soonest.daysLeft !== null
        ? `${soonest.name} may run out in ${soonest.daysLeft} day${soonest.daysLeft === 1 ? "" : "s"} (${soonest.stock} ${soonest.unit} left).`
        : `${soonest.name}: ${soonest.stock} ${soonest.unit} left.`,
      action: { label: "Enter a purchase", tab: "purchases" },
    });
  }

  // 6. Credit risk — overdue udhaar.
  const overdue = customers
    .map((c) => ({ c, days: customerOverdueDays(c, today) }))
    .filter((x) => x.days > 0)
    .sort((a, b) => b.c.creditBalance - a.c.creditBalance);
  if (overdue.length > 0) {
    const top = overdue[0];
    out.push({
      id: "overdue_credit", kind: "overdue_credit", severity: "warning",
      headline: `${top.c.name} owes ${fmt(top.c.creditBalance, cur)}, ${top.days} day${top.days === 1 ? "" : "s"} overdue.`,
      detail: overdue.length > 1 ? `${overdue.length} customers are past their due date.` : undefined,
      action: { label: "Open udhaar", tab: "udhaar" },
    });
  }

  const rank = { critical: 0, warning: 1, info: 2, good: 3 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/* ------------------------------ seasonal (Ramadan) ------------------------------ */

/** Expected 1st of Ramadan (Pakistan; ±1 day depending on moon sighting). */
export const RAMADAN_STARTS = ["2026-02-18", "2027-02-08", "2028-01-28", "2029-01-16", "2030-01-06"];
const RAMADAN_KEYWORDS = /sugar|cheeni|rooh ?afza|besan|gram flour|dates|khajoor|oil|ghee|banaspati|rice|chana|milk|tang|jam-e-shirin|pakora|samosa/i;

export function nextRamadan(today: string): { start: string; daysUntil: number } | null {
  const start = RAMADAN_STARTS.find((d) => d >= today);
  return start ? { start, daysUntil: dayDiff(today, start) } : null;
}

/** Products that usually sell faster in Ramadan, with their current stock outlook. */
export function ramadanStaples(plan: ReorderLine[]): ReorderLine[] {
  return plan.filter((r) => RAMADAN_KEYWORDS.test(r.name));
}
