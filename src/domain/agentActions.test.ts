import { describe, it, expect } from "vitest";
import type { Customer, Product } from "@/types";
import { buildPurchaseDraft, buildSaleDraft, paymentProblem, validateAgentAction } from "@/domain/agentActions";

const prod = (id: string, nameEn: string, quantity: number, buyPrice: number, sellPrice: number): Product => ({
  id, nameEn, category: "staples", quantity, buyPrice, sellPrice, minQuantity: 5, unit: "pc",
});
const products = [prod("tea", "Tapal Danedar 450g", 10, 1100, 1250), prod("rooh", "Rooh Afza 800ml", 6, 380, 450)];
const cust = (id: string, name: string, creditBalance: number) => ({ id, name, creditBalance, phone: "03001234567", creditLimit: 10000 } as Customer);
const customers = [cust("asif", "Asif Bhai", 1500), cust("tariq", "Tariq", 0)];

describe("validateAgentAction", () => {
  it("keeps only known products and customers", () => {
    expect(validateAgentAction({
      type: "sale", paymentType: "credit", customerId: "asif",
      items: [{ productId: "tea", qty: 2 }, { productId: "ghost", qty: 1 }, { productId: "rooh", qty: 2000 }],
    }, products, customers)).toEqual({
      type: "sale", paymentType: "credit", customerId: "asif",
      items: [{ productId: "tea", qty: 2 }, { productId: "rooh", qty: 999 }],
    });
    expect(validateAgentAction({ type: "sale", items: [{ productId: "ghost", qty: 1 }] }, products, customers)).toBeNull();
    expect(validateAgentAction({ type: "payment", customerId: "nobody", amount: 500 }, products, customers))
      .toEqual({ type: "payment", customerId: null, amount: 500 });
    expect(validateAgentAction({ type: "purchase", supplier: "  ", items: [{ productId: "rooh", qty: 10, unitCost: -5 }] }, products, customers))
      .toEqual({ type: "purchase", supplier: null, items: [{ productId: "rooh", qty: 10, unitCost: null }] });
    expect(validateAgentAction({ type: "delete_everything" }, products, customers)).toBeNull();
    expect(validateAgentAction(null, products, customers)).toBeNull();
  });
});

describe("drafts price everything from the catalogue", () => {
  it("sale: merges lines, uses sell price and flags stock", () => {
    const d = buildSaleDraft([{ productId: "tea", qty: 2 }, { productId: "tea", qty: 1 }, { productId: "rooh", qty: 8 }], products);
    expect(d.items.map((i) => [i.productId, i.quantity, i.unitPrice, i.unitCost])).toEqual([["tea", 3, 1250, 1100], ["rooh", 8, 450, 380]]);
    expect(d.total).toBe(3 * 1250 + 8 * 450);
    expect(d.problems).toEqual(["Only 6 Rooh Afza 800ml in stock."]);
    expect(buildSaleDraft([], products).problems).toEqual(["Add at least one item."]);
  });

  it("purchase: spoken unit cost wins, otherwise the current buying price", () => {
    const d = buildPurchaseDraft([{ productId: "rooh", qty: 10, unitCost: null }, { productId: "tea", qty: 2, unitCost: 1050 }], products);
    expect(d.items.map((i) => [i.productId, i.quantity, i.unitCost])).toEqual([["rooh", 10, 380], ["tea", 2, 1050]]);
    expect(d.total).toBe(10 * 380 + 2 * 1050);
    expect(d.problems).toEqual([]);
  });

  it("payment: mirrors the Udhaar screen's checks", () => {
    expect(paymentProblem(customers[0], 500)).toBeNull();
    expect(paymentProblem(customers[0], 2000)).toMatch(/more than/);
    expect(paymentProblem(customers[0], null)).toMatch(/amount/);
    expect(paymentProblem(customers[1], 100)).toMatch(/doesn't owe/);
    expect(paymentProblem(undefined, 100)).toMatch(/Choose/);
  });
});
