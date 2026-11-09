import React, { createContext, useContext, useState } from "react";
import { 
  UserProfile, 
  Shop, 
  Product, 
  Customer, 
  Sale, 
  Purchase, 
  Expense,
  WholesalePriceBenchmark,
  SeasonalForecast,
  Language 
} from "@/types";
import { audio } from "@/lib/audio";
import { switchLanguage } from "@/i18n";
import { 
  SEEDED_PRODUCTS, 
  SEEDED_CUSTOMERS, 
  SEEDED_EXPENSES, 
  SEEDED_BENCHMARKS,
  SEEDED_SEASONAL_FORECASTS
} from "@/lib/seedData";

export type ActiveTab = 
  | "landing" 
  | "pos" 
  | "dashboard" 
  | "insights" 
  | "inventory" 
  | "udhaar" 
  | "purchases" 
  | "history" 
  | "settings";

const DEMO_SHOP: Shop = {
  id: "shop-al-madina-01",
  name: "Al-Madina Kiryana Store",
  ownerName: "Haji Aslam",
  currency: "PKR",
  phone: "0300-9876543",
  address: "Shop #4, Main Bazar, G-9/4, Islamabad",
  lowStockThreshold: 8,
  leadTimeDays: 2,
  isDemo: true,
};

const DEMO_USER: UserProfile = {
  id: "user-aslam-01",
  name: "Haji Aslam",
  email: "aslam@almadinakiryana.pk",
  role: "owner",
  languagePreference: "ur",
  isDemo: true,
};

const INITIAL_SALES: Sale[] = [
  {
    id: "sale-9841",
    shopId: "shop-al-madina-01",
    createdAt: "2026-11-09T08:30:00Z",
    paymentType: "cash",
    totalAmount: 1890,
    items: [
      { productId: "p1", productName: "Tapal Danedar Tea 450g", quantity: 2, unitPrice: 650, unitCost: 570 },
      { productId: "p7", productName: "Dalda Cooking Oil 1L", quantity: 1, unitPrice: 540, unitCost: 480 },
    ],
    status: "completed",
  },
  {
    id: "sale-9842",
    shopId: "shop-al-madina-01",
    createdAt: "2026-11-09T09:15:00Z",
    paymentType: "credit",
    customerId: "c1",
    customerName: "Asif Bhai (Makan #12)",
    totalAmount: 2430,
    items: [
      { productId: "p11", productName: "Fine Wheat Flour (Aata) 10kg", quantity: 1, unitPrice: 1350, unitCost: 1240 },
      { productId: "p7", productName: "Dalda Cooking Oil 1L", quantity: 2, unitPrice: 540, unitCost: 480 },
    ],
    status: "completed",
  },
  {
    id: "sale-9843",
    shopId: "shop-al-madina-01",
    createdAt: "2026-11-09T09:50:00Z",
    paymentType: "cash",
    totalAmount: 960,
    items: [
      { productId: "p20", productName: "MilkPak Dairy Milk 1L", quantity: 2, unitPrice: 290, unitCost: 260 },
      { productId: "p37", productName: "Lux Beauty Bar Soap 140g", quantity: 2, unitPrice: 160, unitCost: 135 },
      { productId: "p30", productName: "National Iodized Salt 800g", quantity: 1, unitPrice: 70, unitCost: 55 },
    ],
    status: "completed",
  },
  {
    id: "sale-9844",
    shopId: "shop-al-madina-01",
    createdAt: "2026-11-09T10:20:00Z",
    paymentType: "cash",
    totalAmount: 2470,
    items: [
      { productId: "p13", productName: "Super Kernel Basmati Rice 5kg", quantity: 1, unitPrice: 1800, unitCost: 1600 },
      { productId: "p2", productName: "Lipton Yellow Label 400g", quantity: 1, unitPrice: 670, unitCost: 590 },
    ],
    status: "completed",
  },
];

interface AppContextType {
  user: UserProfile | null;
  shop: Shop;
  shops: Shop[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  wholesaleBenchmarks: WholesalePriceBenchmark[];
  seasonalForecasts: SeasonalForecast[];
  lastSaleUndo: Sale | null;
  undoSeconds: number;
  isDemoMode: boolean;
  // Core Actions
  openSeededDemoShop: () => void;
  exitDemoMode: () => void;
  switchShop: (shopId: string) => void;
  createShop: (shopData: Omit<Shop, "id">) => void;
  recordSale: (sale: Omit<Sale, "id" | "createdAt" | "status">) => void;
  undoSale: () => void;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  updateStock: (productId: string, delta: number) => void;
  addCustomer: (customer: Omit<Customer, "id" | "creditBalance">) => void;
  recordCreditPayment: (customerId: string, amount: number) => void;
  recordSupplierPurchase: (purchase: Omit<Purchase, "id" | "date">) => void;
  addExpense: (expense: Omit<Expense, "id">) => void;
  // Modals & Drawers
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isAskTallynOpen: boolean;
  setIsAskTallynOpen: (open: boolean) => void;
  isKiryanaRadioOpen: boolean;
  setIsKiryanaRadioOpen: (open: boolean) => void;
  isBarcodeScannerOpen: boolean;
  setIsBarcodeScannerOpen: (open: boolean) => void;
  login: (email: string, name?: string) => void;
  loginWithGoogle: () => void;
  loginWithSocial: (provider: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null); // New visitors see landing page without pre-login
  const [shop, setShop] = useState<Shop>(DEMO_SHOP);
  const [shops, setShops] = useState<Shop[]>([DEMO_SHOP]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("landing");
  const [language, setLangState] = useState<Language>("en");
  const [products, setProducts] = useState<Product[]>(SEEDED_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(SEEDED_CUSTOMERS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>(SEEDED_EXPENSES);
  const [wholesaleBenchmarks, setWholesaleBenchmarks] = useState<WholesalePriceBenchmark[]>(SEEDED_BENCHMARKS);
  const [seasonalForecasts, setSeasonalForecasts] = useState<SeasonalForecast[]>(SEEDED_SEASONAL_FORECASTS);
  const [lastSaleUndo, setLastSaleUndo] = useState<Sale | null>(null);
  const [undoSeconds, setUndoSeconds] = useState<number>(0);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAskTallynOpen, setIsAskTallynOpen] = useState(false);
  const [isKiryanaRadioOpen, setIsKiryanaRadioOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    switchLanguage(lang);
  };

  // Centralized Button on Landing Page: Open Seeded Demo Account!
  const openSeededDemoShop = () => {
    setUser(DEMO_USER);
    setShop(DEMO_SHOP);
    setProducts(SEEDED_PRODUCTS);
    setCustomers(SEEDED_CUSTOMERS);
    setSales(INITIAL_SALES);
    setExpenses(SEEDED_EXPENSES);
    setWholesaleBenchmarks(SEEDED_BENCHMARKS);
    setSeasonalForecasts(SEEDED_SEASONAL_FORECASTS);
    setIsDemoMode(true);
    setActiveTab("dashboard");
    audio.playCashRegisterChime();
  };

  const exitDemoMode = () => {
    setUser(null);
    setIsDemoMode(false);
    setActiveTab("landing");
  };

  const switchShop = (shopId: string) => {
    const s = shops.find((item) => item.id === shopId);
    if (s) {
      setShop(s);
    }
  };

  const createShop = (shopData: Omit<Shop, "id">) => {
    const newShop: Shop = {
      ...shopData,
      id: "shop-" + Date.now(),
    };
    setShops((prev) => [...prev, newShop]);
    setShop(newShop);
  };

  const login = (email: string, name: string = "Store Owner") => {
    const newUser: UserProfile = {
      id: "usr-" + Date.now(),
      name,
      email,
      role: "owner",
      languagePreference: language,
    };
    setUser(newUser);
    setIsDemoMode(false);
    setIsAuthModalOpen(false);
    setActiveTab("dashboard");
  };

  const loginWithGoogle = () => {
    login("retailer@gmail.com", "Google Retailer");
  };

  const loginWithSocial = (provider: string) => {
    login(`user@${provider.toLowerCase()}.com`, `${provider} Retailer`);
  };

  const logout = () => {
    setUser(null);
    setIsDemoMode(false);
    setActiveTab("landing");
  };

  // Atomic Record Sale
  const recordSale = (saleData: Omit<Sale, "id" | "createdAt" | "status">) => {
    const saleId = "sale-" + Date.now();
    const newSale: Sale = {
      ...saleData,
      id: saleId,
      createdAt: new Date().toISOString(),
      status: "completed",
    };

    // 1. Decrement inventory atomically
    setProducts((prev) =>
      prev.map((p) => {
        const item = saleData.items.find((i) => i.productId === p.id);
        return item ? { ...p, quantity: Math.max(p.quantity - item.quantity, 0) } : p;
      })
    );

    // 2. If credit, update customer debt balance
    if (saleData.paymentType === "credit" && saleData.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === saleData.customerId
            ? { 
                ...c, 
                creditBalance: c.creditBalance + saleData.totalAmount, 
                lastPurchaseDate: new Date().toISOString().split("T")[0],
                history: [
                  {
                    id: "h-" + Date.now(),
                    date: new Date().toISOString().split("T")[0],
                    description: `Credit Sale #${saleId.slice(-6)} (${saleData.items.length} items)`,
                    amount: saleData.totalAmount,
                    type: "credit_purchase",
                  },
                  ...(c.history || []),
                ]
              }
            : c
        )
      );
    }

    // 3. Play cash register sound
    audio.playCashRegisterChime();

    // 4. Update sales log & activate 10-second undo window
    setSales((prev) => [newSale, ...prev]);
    setLastSaleUndo(newSale);
    setUndoSeconds(10);

    // Countdown timer
    const interval = setInterval(() => {
      setUndoSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLastSaleUndo(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Undo Sale
  const undoSale = () => {
    if (!lastSaleUndo) return;

    // Restore inventory
    setProducts((prev) =>
      prev.map((p) => {
        const item = lastSaleUndo.items.find((i) => i.productId === p.id);
        return item ? { ...p, quantity: p.quantity + item.quantity } : p;
      })
    );

    // If credit, rollback customer debt
    if (lastSaleUndo.paymentType === "credit" && lastSaleUndo.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === lastSaleUndo.customerId
            ? { ...c, creditBalance: Math.max(c.creditBalance - lastSaleUndo.totalAmount, 0) }
            : c
        )
      );
    }

    // Mark sale as undone in ledger
    setSales((prev) =>
      prev.map((s) => (s.id === lastSaleUndo.id ? { ...s, status: "undone" } : s))
    );

    audio.playUndoSound();
    setLastSaleUndo(null);
    setUndoSeconds(0);
  };

  const addProduct = (p: Omit<Product, "id">) => {
    const newProduct: Product = { ...p, id: "p-" + Date.now() };
    setProducts((prev) => [newProduct, ...prev]);
  };

  const updateProduct = (p: Product) => {
    setProducts((prev) => prev.map((item) => (item.id === p.id ? p : item)));
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateStock = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: Math.max(p.quantity + delta, 0) } : p))
    );
  };

  const addCustomer = (c: Omit<Customer, "id" | "creditBalance">) => {
    const newCust: Customer = { ...c, id: "c-" + Date.now(), creditBalance: 0, history: [] };
    setCustomers((prev) => [...prev, newCust]);
  };

  const recordCreditPayment = (customerId: string, amount: number) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId 
          ? { 
              ...c, 
              creditBalance: Math.max(c.creditBalance - amount, 0),
              history: [
                {
                  id: "h-" + Date.now(),
                  date: new Date().toISOString().split("T")[0],
                  description: "Cash Debt Settlement Received",
                  amount: -amount,
                  type: "payment",
                },
                ...(c.history || []),
              ]
            } 
          : c
      )
    );
    audio.playCashRegisterChime();
  };

  const recordSupplierPurchase = (purchase: Omit<Purchase, "id" | "date">) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: "pur-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
    };

    // Increment inventory stock & update buyPrice
    setProducts((prev) =>
      prev.map((p) => {
        const item = purchase.items.find((i) => i.productId === p.id);
        return item ? { ...p, quantity: p.quantity + item.quantity, buyPrice: item.unitCost } : p;
      })
    );

    setPurchases((prev) => [newPurchase, ...prev]);
    audio.playCashRegisterChime();
  };

  const addExpense = (exp: Omit<Expense, "id">) => {
    const newExp: Expense = { ...exp, id: "exp-" + Date.now() };
    setExpenses((prev) => [newExp, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        shop,
        shops,
        activeTab,
        setActiveTab,
        language,
        setLanguage,
        products,
        customers,
        sales,
        purchases,
        expenses,
        wholesaleBenchmarks,
        seasonalForecasts,
        lastSaleUndo,
        undoSeconds,
        isDemoMode,
        openSeededDemoShop,
        exitDemoMode,
        switchShop,
        createShop,
        recordSale,
        undoSale,
        addProduct,
        updateProduct,
        deleteProduct,
        updateStock,
        addCustomer,
        recordCreditPayment,
        recordSupplierPurchase,
        addExpense,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isAskTallynOpen,
        setIsAskTallynOpen,
        isKiryanaRadioOpen,
        setIsKiryanaRadioOpen,
        isBarcodeScannerOpen,
        setIsBarcodeScannerOpen,
        login,
        loginWithGoogle,
        loginWithSocial,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
