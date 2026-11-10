/**
 * Tallyn Supabase service layer.
 * Maps DB snake_case rows <-> frontend camelCase domain types (@/types).
 * All mutations go through atomic RPCs from migration 002.
 */
import { supabase } from "@/lib/supabase";
import type {
  Product, Customer, Sale, Purchase, Expense, PaymentType, ProductCategory,
} from "@/types";

/* ------------------------- row types (snake_case) ------------------------- */

interface ShopRow {
  id: string; owner_id: string; name: string; currency: string;
  low_stock_threshold: number; lead_time_days: number; created_at: string;
}
interface ProductRow {
  id: string; shop_id: string; name: string; name_ur: string | null; category: string;
  quantity: number; buy_price: number; sell_price: number; min_quantity: number;
  barcode: string | null; expiry_date: string | null; created_at: string;
}
interface CustomerRow {
  id: string; shop_id: string; name: string; phone: string | null;
  credit_limit: number | null; created_at: string;
}
interface SaleRow {
  id: string; shop_id: string; customer_id: string | null; payment_type: "cash" | "credit";
  total_amount: number; due_date: string | null; status: "completed" | "undone"; created_at: string;
}
interface SaleItemRow {
  id: string; sale_id: string; product_id: string; quantity: number;
  unit_price: number; unit_cost: number; products?: { name: string; name_ur: string | null } | null;
}
interface PaymentRow {
  id: string; shop_id: string; customer_id: string; sale_id: string | null;
  amount: number; payment_date: string;
}
interface PurchaseRow {
  id: string; shop_id: string; supplier_name: string; invoice_number: string | null;
  total_amount: number; created_at: string;
  purchase_items?: Array<{
    id: string; purchase_id: string; product_id: string; quantity: number; unit_cost: number;
    products?: { name: string; name_ur: string | null } | null;
  }> | null;
}
interface ExpenseRow {
  id: string; shop_id: string; title: string; amount: number; category: string; expense_date: string;
}

/* ------------------------------- mappers ---------------------------------- */

export function mapProduct(r: ProductRow): Product {
  return {
    id: r.id,
    nameEn: r.name,
    nameUr: r.name_ur ?? r.name,
    category: (r.category as ProductCategory) ?? "staples",
    quantity: Number(r.quantity),
    buyPrice: Number(r.buy_price),
    sellPrice: Number(r.sell_price),
    minQuantity: Number(r.min_quantity),
    barcode: r.barcode ?? undefined,
    unit: "pc",
    expiryDate: r.expiry_date ?? undefined,
  };
}

export function mapCustomer(
  r: CustomerRow,
  creditSales: SaleRow[],
  payments: PaymentRow[],
): Customer {
  const mySales = creditSales.filter(
    (s) => s.customer_id === r.id && s.status === "completed",
  );
  const myPayments = payments.filter((p) => p.customer_id === r.id);
  const owed = mySales.reduce((s, x) => s + Number(x.total_amount), 0);
  const paid = myPayments.reduce((s, x) => s + Number(x.amount), 0);

  // Overdue: earliest due_date (or created_at fallback) still unpaid, pro-rata naive:
  // treat balance > 0 and oldest due date in the past as overdue days.
  let overdueDays = 0;
  if (owed - paid > 0) {
    const oldestDue = mySales
      .map((s) => s.due_date ?? s.created_at.slice(0, 10))
      .sort()[0];
    if (oldestDue) {
      const diff = Math.floor((Date.now() - new Date(oldestDue).getTime()) / 86_400_000);
      overdueDays = Math.max(diff, 0);
    }
  }

  const lastPurchase = mySales
    .map((s) => s.created_at.slice(0, 10))
    .sort()
    .pop();

  const history = [
    ...mySales.map((s) => ({
      id: `s-${s.id}`,
      date: s.created_at.slice(0, 10),
      description: "Credit sale (udhaar)",
      amount: Number(s.total_amount),
      type: "credit_purchase" as const,
    })),
    ...myPayments.map((p) => ({
      id: `p-${p.id}`,
      date: p.payment_date.slice(0, 10),
      description: "Cash payment received",
      amount: -Number(p.amount),
      type: "payment" as const,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 15);

  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? "",
    creditBalance: owed - paid,
    creditLimit: Number(r.credit_limit ?? 10000),
    lastPurchaseDate: lastPurchase,
    overdueDays: overdueDays > 0 ? overdueDays : undefined,
    history,
  };
}

export function mapSale(r: SaleRow, items?: SaleItemRow[]): Sale {
  return {
    id: r.id,
    shopId: r.shop_id,
    createdAt: r.created_at,
    paymentType: r.payment_type as PaymentType,
    customerId: r.customer_id ?? undefined,
    totalAmount: Number(r.total_amount),
    items: (items ?? []).map((i) => ({
      productId: i.product_id,
      productName: i.products?.name ?? "Item",
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      unitCost: Number(i.unit_cost),
    })),
    status: r.status,
  };
}

export function mapPurchase(r: PurchaseRow): Purchase {
  return {
    id: r.id,
    supplierName: r.supplier_name,
    invoiceNumber: r.invoice_number ?? "",
    date: r.created_at.slice(0, 10),
    totalAmount: Number(r.total_amount),
    items: (r.purchase_items ?? []).map((i) => ({
      productId: i.product_id,
      productName: i.products?.name ?? "Item",
      quantity: Number(i.quantity),
      unitCost: Number(i.unit_cost),
    })),
  };
}

export function mapExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    title: r.title,
    amount: Number(r.amount),
    category: r.category as Expense["category"],
    date: r.expense_date,
  };
}

/* ------------------------------ auth helpers ------------------------------ */

export async function ensureProfile(userId: string, name: string, email: string) {
  const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!data) {
    await supabase.from("profiles").upsert({ id: userId, name: name || email.split("@")[0] });
  }
}

/* ------------------------------- the service ------------------------------ */

export const db = {
  /* ---- auth ---- */
  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },
  async signInWithPassword(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signUp(email: string, password: string, name?: string) {
    return supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: name || email.split("@")[0],
        }
      }
    });
  },
  async signInWithOtp(email: string) {
    return supabase.auth.signInWithOtp({ email });
  },
  async signInWithGoogle(redirectTo?: string) {
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo || `${window.location.origin}/dashboard` },
    });
  },
  async signOut() {
    return supabase.auth.signOut();
  },
  async updateProfile(userId: string, name: string) {
    return supabase
      .from("profiles")
      .update({ name })
      .eq("id", userId);
  },
  onAuthChange(cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(cb);
  },

  /* ---- shops ---- */
  async getShops(ownerId: string): Promise<ShopRow[]> {
    const { data, error } = await supabase
      .from("shops").select("*").eq("owner_id", ownerId).order("created_at");
    if (error) throw error;
    return (data ?? []) as ShopRow[];
  },
  async createShop(
    ownerId: string, 
    name: string, 
    currency: string = "PKR",
    lowStockThreshold?: number,
    leadTimeDays?: number
  ): Promise<ShopRow> {
    const insertPayload: Record<string, unknown> = { owner_id: ownerId, name, currency };
    if (lowStockThreshold !== undefined) insertPayload.low_stock_threshold = lowStockThreshold;
    if (leadTimeDays !== undefined) insertPayload.lead_time_days = leadTimeDays;

    const { data, error } = await supabase
      .from("shops")
      .insert(insertPayload)
      .select().single();
    if (error) throw error;
    return data as ShopRow;
  },
  async deleteShop(shopId: string) {
    const { error } = await supabase.from("shops").delete().eq("id", shopId);
    if (error) throw error;
  },

  /* ---- products ---- */
  async getProducts(shopId: string): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from("products").select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProductRow[];
  },
  async insertProducts(shopId: string, rows: Array<Partial<ProductRow>>): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from("products").insert(rows.map((r) => ({ ...r, shop_id: shopId }))).select();
    if (error) throw error;
    return (data ?? []) as ProductRow[];
  },
  async updateProduct(productId: string, patch: Partial<ProductRow>) {
    const { error } = await supabase.from("products").update(patch).eq("id", productId);
    if (error) throw error;
  },
  async deleteProduct(productId: string) {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) throw error;
  },

  /* ---- customers ---- */
  async getCustomers(shopId: string): Promise<CustomerRow[]> {
    const { data, error } = await supabase
      .from("customers").select("*").eq("shop_id", shopId).order("name");
    if (error) throw error;
    return (data ?? []) as CustomerRow[];
  },
  async insertCustomer(shopId: string, name: string, phone: string): Promise<CustomerRow> {
    const { data, error } = await supabase
      .from("customers").insert({ shop_id: shopId, name, phone }).select().single();
    if (error) throw error;
    return data as CustomerRow;
  },

  /* ---- sales + payments (balances derive from these) ---- */
  async getSales(shopId: string): Promise<SaleRow[]> {
    const { data, error } = await supabase
      .from("sales").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return (data ?? []) as SaleRow[];
  },
  async getSaleItems(shopId: string): Promise<SaleItemRow[]> {
    const { data, error } = await supabase
      .from("sale_items")
      .select("*, sales!inner(shop_id), products(name, name_ur)")
      .eq("sales.shop_id", shopId)
      .limit(2000);
    if (error) throw error;
    return (data ?? []) as unknown as SaleItemRow[];
  },
  async getPayments(shopId: string): Promise<PaymentRow[]> {
    const { data, error } = await supabase
      .from("payments").select("*").eq("shop_id", shopId).order("payment_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PaymentRow[];
  },

  /* ---- purchases ---- */
  async getPurchases(shopId: string): Promise<PurchaseRow[]> {
    const { data, error } = await supabase
      .from("purchases")
      .select("*, purchase_items(*, products(name, name_ur))")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PurchaseRow[];
  },

  /* ---- expenses ---- */
  async getExpenses(shopId: string): Promise<ExpenseRow[]> {
    const { data, error } = await supabase
      .from("expenses").select("*").eq("shop_id", shopId).order("expense_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ExpenseRow[];
  },
  async insertExpense(shopId: string, title: string, amount: number, category: string, date: string) {
    const { data, error } = await supabase
      .from("expenses")
      .insert({ shop_id: shopId, title, amount, category, expense_date: date })
      .select().single();
    if (error) throw error;
    return data as ExpenseRow;
  },

  /* ---- atomic RPCs (migration 002) ---- */
  async rpcRecordSale(shopId: string, paymentType: PaymentType, items: Array<{ product_id: string; quantity: number; unit_price: number }>, customerId?: string, dueDate?: string) {
    const { data, error } = await supabase.rpc("record_sale", {
      p_shop_id: shopId,
      p_payment_type: paymentType,
      p_items: items,
      p_customer_id: customerId ?? null,
      p_due_date: dueDate ?? null,
    });
    if (error) throw error;
    return data as { sale_id: string; total_amount: number; status: string };
  },
  async rpcUndoSale(saleId: string, shopId: string) {
    const { data, error } = await supabase.rpc("undo_sale", { p_sale_id: saleId, p_shop_id: shopId });
    if (error) throw error;
    return data;
  },
  async rpcRecordPurchase(shopId: string, supplier: string, invoice: string, items: Array<{ product_id: string; quantity: number; unit_cost: number }>) {
    const { data, error } = await supabase.rpc("record_purchase", {
      p_shop_id: shopId, p_supplier_name: supplier, p_invoice_number: invoice, p_items: items,
    });
    if (error) throw error;
    return data;
  },
  async rpcRecordCreditPayment(shopId: string, customerId: string, amount: number) {
    const { data, error } = await supabase.rpc("record_credit_payment", {
      p_shop_id: shopId, p_customer_id: customerId, p_amount: amount,
    });
    if (error) throw error;
    return data;
  },
  async rpcAdjustStock(shopId: string, productId: string, delta: number, reason: string) {
    const { data, error } = await supabase.rpc("adjust_stock", {
      p_shop_id: shopId, p_product_id: productId, p_delta: delta, p_reason: reason,
    });
    if (error) throw error;
    return data;
  },
};
