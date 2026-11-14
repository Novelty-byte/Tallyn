// 60 days of realistic, reproducible demo history for the seeded shops.
//
// Plan §12: "60 days of realistically distributed transaction patterns with weekend
// peaks and natural variance", plus "1 sudden electricity expense spike and 1 weekday
// sales dip to validate insight anomaly cards".
//
// Deterministic: a seeded PRNG means the same shop always gets the same pattern, but
// dates are relative to `now`, so the demo always looks current (today has sales up to
// the current hour; yesterday is the dip).

import type { Customer, Expense, Product, Sale } from "@/types";
import { addDays, toLocalYmd } from "@/domain/credit";

export const DEMO_HISTORY_DAYS = 60;
/** Yesterday's volume is cut to this share of normal (the "weekday dip" anomaly). */
export const DEMO_DIP_FACTOR = 0.45;
/** The latest electricity bill is this multiple of the usual one (the "expense spike"). */
export const DEMO_ELECTRICITY_SPIKE = 1.7;

interface BranchProfile {
  salesPerDay: number;
  maxLines: number;
  maxQty: number;
  creditShare: number;
  expenses: Array<{ title: string; category: Expense["category"]; amount: number; day: number; jitter: number }>;
}

const PROFILES: Record<string, BranchProfile> = {
  "shop-al-madina-01": {
    salesPerDay: 16, maxLines: 4, maxQty: 3, creditShare: 0.15,
    expenses: [
      { title: "Shop rent (G-9/4)", category: "Rent", amount: 25000, day: 1, jitter: 0 },
      { title: "IESCO electricity bill", category: "Electricity", amount: 14500, day: 5, jitter: 0.06 },
      { title: "Helper salary (Bilal)", category: "Staff", amount: 18000, day: 7, jitter: 0 },
      { title: "Suzuki pickup from mandi", category: "Transportation", amount: 2800, day: 12, jitter: 0.2 },
      { title: "Shopping bags & packing", category: "Packaging", amount: 1500, day: 15, jitter: 0.15 },
    ],
  },
  "shop-al-madina-02": {
    salesPerDay: 22, maxLines: 3, maxQty: 2, creditShare: 0.08,
    expenses: [
      { title: "Shop rent (F-10 Markaz)", category: "Rent", amount: 38000, day: 1, jitter: 0 },
      { title: "IESCO electricity bill (fridges)", category: "Electricity", amount: 21000, day: 5, jitter: 0.06 },
      { title: "Counter staff salaries", category: "Staff", amount: 32000, day: 7, jitter: 0 },
      { title: "Cold-chain delivery", category: "Transportation", amount: 4200, day: 10, jitter: 0.2 },
    ],
  },
  "shop-al-madina-03": {
    salesPerDay: 6, maxLines: 3, maxQty: 4, creditShare: 0.25,
    expenses: [
      { title: "Godown rent (Haider Road)", category: "Rent", amount: 45000, day: 1, jitter: 0 },
      { title: "Electricity bill (godown)", category: "Electricity", amount: 9500, day: 5, jitter: 0.06 },
      { title: "Loader / mazdoor wages", category: "Staff", amount: 12000, day: 7, jitter: 0.1 },
      { title: "Mazda truck freight from mandi", category: "Transportation", amount: 6500, day: 6, jitter: 0.2 },
    ],
  },
};

/** mulberry32 — tiny deterministic PRNG. */
function prng(seedText: string) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weekend shopping peaks; Friday afternoon is quieter (Jummah). 0 = Sunday. */
const WEEKDAY_FACTOR = [1.25, 1.0, 1.0, 1.0, 1.05, 0.9, 1.2];

function localDateTime(ymd: string, minutes: number): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
}

export function generateDemoHistory(opts: {
  shopId: string;
  products: Product[];
  customers: Customer[];
  now?: Date;
}): { sales: Sale[]; expenses: Expense[] } {
  const now = opts.now ?? new Date();
  const today = toLocalYmd(now);
  const profile = PROFILES[opts.shopId] ?? PROFILES["shop-al-madina-01"];
  const rand = prng(opts.shopId);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

  // Stable popularity per product: staples sell more, a few items are naturally slow.
  const sellable = opts.products.filter((p) => !p.isDeadStock);
  const dead = opts.products.filter((p) => p.isDeadStock);
  const weights = sellable.map((p) => {
    const base = p.category === "staples" || p.category === "dairy" ? 6 : 3;
    return base * (0.25 + rand() * 1.5);
  });
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const pick = () => {
    let r = rand() * totalWeight;
    for (let i = 0; i < sellable.length; i++) {
      r -= weights[i];
      if (r <= 0) return sellable[i];
    }
    return sellable[sellable.length - 1];
  };

  const sales: Sale[] = [];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let back = DEMO_HISTORY_DAYS - 1; back >= 0; back--) {
    const ymd = addDays(today, -back);
    const weekday = localDateTime(ymd, 0).getDay();
    let count = profile.salesPerDay * WEEKDAY_FACTOR[weekday] * (0.8 + rand() * 0.4);
    if (back === 1) count *= DEMO_DIP_FACTOR; // yesterday: the weekday-dip anomaly
    let n = Math.max(1, Math.round(count));

    // Today only has the sales made so far (shop opens at 8:00).
    const openMin = 8 * 60;
    const closeMin = back === 0 ? Math.min(22 * 60, nowMinutes) : 22 * 60;
    if (closeMin <= openMin) n = 0;
    else if (back === 0) n = Math.round(n * ((closeMin - openMin) / (14 * 60)));

    const minutes = Array.from({ length: n }, () => int(openMin, closeMin - 1)).sort((a, b) => a - b);
    minutes.forEach((min, i) => {
      // Dead stock last sold 31+ days ago, so it shows up as "not sold in 30 days".
      const lines: Product[] = [];
      const lineCount = int(1, profile.maxLines);
      for (let l = 0; l < lineCount; l++) {
        const p = back > 30 && dead.length > 0 && rand() < 0.05 ? dead[int(0, dead.length - 1)] : pick();
        if (!lines.includes(p)) lines.push(p);
      }
      const items = lines.map((p) => {
        const quantity = int(1, profile.maxQty);
        return { productId: p.id, productName: p.nameEn, quantity, unitPrice: p.sellPrice, unitCost: p.buyPrice };
      });
      const totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      const credit = opts.customers.length > 0 && rand() < profile.creditShare;
      const customer = credit ? opts.customers[int(0, opts.customers.length - 1)] : undefined;
      sales.push({
        id: `${opts.shopId}-s-${ymd}-${i}`,
        shopId: opts.shopId,
        createdAt: localDateTime(ymd, min).toISOString(),
        paymentType: credit ? "credit" : "cash",
        customerId: customer?.id,
        customerName: customer?.name,
        totalAmount,
        items,
        status: "completed",
      });
    });
  }

  // Monthly bills for the current month and the three before it (only dates up to today).
  const expenses: Expense[] = [];
  const [ty, tm] = today.split("-").map(Number);
  for (let mBack = 3; mBack >= 0; mBack--) {
    const monthDate = new Date(ty, tm - 1 - mBack, 1);
    const ym = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    for (const e of profile.expenses) {
      const date = `${ym}-${String(e.day).padStart(2, "0")}`;
      if (date > today) continue;
      const amount = Math.round((e.amount * (1 - e.jitter + rand() * 2 * e.jitter)) / 50) * 50;
      expenses.push({ id: `${opts.shopId}-e-${date}-${e.category}`, title: e.title, amount, category: e.category, date });
    }
  }
  // The most recent electricity bill spikes (the "expense spike" anomaly).
  const latestElectric = expenses.filter((e) => e.category === "Electricity").sort((a, b) => b.date.localeCompare(a.date))[0];
  if (latestElectric) {
    latestElectric.amount = Math.round((latestElectric.amount * DEMO_ELECTRICITY_SPIKE) / 50) * 50;
  }

  return {
    sales: sales.reverse(), // newest first, like the server
    expenses: expenses.sort((a, b) => b.date.localeCompare(a.date)),
  };
}
