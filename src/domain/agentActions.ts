// Tallyn AI actions: what the assistant may PROPOSE, and the code that turns a proposal
// into the exact objects the app's existing record functions take.
//
// Rule 1: the AI supplies only which product/customer and the quantities/amounts the
// shopkeeper said. Every price, cost and total here comes from the catalogue in code.
// Nothing is saved until the shopkeeper taps Approve on the confirmation card.

import type { Customer, Product, Purchase, Sale } from "@/types";

export type AgentAction =
  | { type: "sale"; items: Array<{ productId: string; qty: number }>; paymentType: "cash" | "credit"; customerId: string | null }
  | { type: "purchase"; items: Array<{ productId: string; qty: number; unitCost: number | null }>; supplier: string | null }
  | { type: "payment"; customerId: string | null; amount: number | null }
  | { type: "reminder"; customerId: string | null };

const finite = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Re-check a proposal from the server against THIS device's catalogue and customers.
 * Unknown ids are dropped; a sale or purchase with no known items becomes null.
 */
export function validateAgentAction(raw: unknown, products: Product[], customers: Customer[]): AgentAction | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const productIds = new Set(products.map((p) => p.id));
  const customerId = typeof a.customerId === "string" && customers.some((c) => c.id === a.customerId) ? a.customerId : null;
  const items = Array.isArray(a.items) ? (a.items as Array<Record<string, unknown>>).slice(0, 30) : [];
  const qtyOf = (v: unknown, max: number) => Math.min(max, Math.max(1, Math.round(finite(v) ?? 1)));

  switch (a.type) {
    case "sale": {
      const list = items
        .filter((it) => typeof it.productId === "string" && productIds.has(it.productId))
        .map((it) => ({ productId: it.productId as string, qty: qtyOf(it.qty, 999) }));
      return list.length ? { type: "sale", items: list, paymentType: a.paymentType === "credit" ? "credit" : "cash", customerId } : null;
    }
    case "purchase": {
      const list = items
        .filter((it) => typeof it.productId === "string" && productIds.has(it.productId))
        .map((it) => {
          const c = finite(it.unitCost);
          return { productId: it.productId as string, qty: qtyOf(it.qty, 9999), unitCost: c !== null && c > 0 ? c : null };
        });
      const supplier = typeof a.supplier === "string" && a.supplier.trim() ? a.supplier.trim().slice(0, 80) : null;
      return list.length ? { type: "purchase", items: list, supplier } : null;
    }
    case "payment": {
      const amt = finite(a.amount);
      return { type: "payment", customerId, amount: amt !== null && amt > 0 ? amt : null };
    }
    case "reminder":
      return { type: "reminder", customerId };
    default:
      return null;
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Sale lines priced from the catalogue, plus problems that block approval. */
export function buildSaleDraft(
  lines: Array<{ productId: string; qty: number }>,
  products: Product[],
): { items: Sale["items"]; total: number; problems: string[] } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.qty);
  const problems: string[] = [];
  const items: Sale["items"] = [];
  merged.forEach((qty, productId) => {
    const p = byId.get(productId);
    if (!p) return;
    if (qty > p.quantity) problems.push(`Only ${p.quantity} ${p.nameEn} in stock.`);
    items.push({ productId, productName: p.name || p.nameEn || "Item", quantity: qty, unitPrice: p.sellPrice, unitCost: p.buyPrice });
  });
  if (!items.length) problems.push("Add at least one item.");
  return { items, total: round2(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)), problems };
}

/** Purchase lines; a missing unit cost falls back to the product's current buying price. */
export function buildPurchaseDraft(
  lines: Array<{ productId: string; qty: number; unitCost: number | null }>,
  products: Product[],
): { items: Purchase["items"]; total: number; problems: string[] } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const problems: string[] = [];
  const items: Purchase["items"] = [];
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p) continue;
    const unitCost = l.unitCost ?? p.buyPrice;
    if (!(unitCost > 0)) problems.push(`Enter a cost for ${p.nameEn}.`);
    items.push({ productId: l.productId, productName: p.nameEn, quantity: l.qty, unitCost });
  }
  if (!items.length) problems.push("Add at least one item.");
  return { items, total: round2(items.reduce((s, i) => s + i.unitCost * i.quantity, 0)), problems };
}

/** Why a payment can't be recorded yet, or null when it can. Mirrors the Udhaar screen's checks. */
export function paymentProblem(customer: Customer | undefined, amount: number | null): string | null {
  if (!customer) return "Choose who paid.";
  if (customer.creditBalance <= 0) return `${customer.name} doesn't owe anything.`;
  if (amount === null || !(amount > 0)) return "Enter the amount received.";
  if (amount > customer.creditBalance) return `That is more than the ${customer.creditBalance.toLocaleString("en-PK")} owed.`;
  return null;
}
