export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "cashier";
  avatarUrl?: string;
  isDemo?: boolean;
  /** Supabase access token (for Edge Function auth) */
  session?: {
    access_token: string;
  };
}

export interface Shop {
  id: string;
  name: string;
  ownerName: string;
  currency: string;
  phone: string;
  address: string;
  city?: string;
  lowStockThreshold: number;
  leadTimeDays: number;
  isDemo?: boolean;
}

export type ProductCategory = "staples" | "beverages" | "dairy" | "spices" | "household" | "snacks";

export interface Product {
  id: string;
  /** Optional display alias; `nameEn` is the canonical name. */
  name?: string;
  nameEn: string;
  nameUr?: string;
  category: ProductCategory;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  minQuantity: number;
  barcode?: string;
  unit: string;
  expiryDate?: string;
  isDeadStock?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  creditBalance: number;
  creditLimit: number;
  lastPurchaseDate?: string;
  overdueDays?: number;
  history?: {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: "credit_purchase" | "payment";
  }[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export type PaymentType = "cash" | "credit";

export interface Sale {
  id: string;
  shopId: string;
  createdAt: string;
  paymentType: PaymentType;
  customerId?: string;
  customerName?: string;
  totalAmount: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
  }[];
  status: "completed" | "undone";
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export interface Purchase {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  items: PurchaseItem[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: "Electricity" | "Rent" | "Staff" | "Transportation" | "Packaging" | "Other";
  date: string;
}

export interface WholesalePriceBenchmark {
  id?: string;
  itemName: string;
  category: string;
  unit?: string;
  benchmarkPrice: number;
  currentShopCost: number;
  markupPercent: number;
  isInflationFlagged: boolean;
  trend?: "up" | "down" | "stable";
  recommendation?: string;
  marketHub?: string;
}

export interface AnomalyAlert {
  id: string;
  type: "sales_dip" | "expense_spike" | "stock_loss" | "overdue_debt";
  title: string;
  description: string;
  severity: "high" | "medium" | "info";
  actionText: string;
}

export interface SeasonalForecast {
  event: string;
  period: string;
  impactItems: string[];
  recommendedSurgeMultiplier: number;
  advice: string;
}