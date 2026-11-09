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
  SEEDED_SEASONAL_FORECASTS,
  getBranchSeedData
} from "@/lib/seedData";
import liveWholesaleData from "@/data/live_wholesale_prices.json";

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

export const DEMO_SHOPS: Shop[] = [
  {
    id: "shop-al-madina-01",
    name: "Al-Madina Kiryana (Main Branch)",
    ownerName: "Haji Aslam",
    currency: "PKR",
    phone: "0300-9876543",
    address: "Shop #4, Main Bazar, G-9/4",
    city: "Islamabad",
    lowStockThreshold: 8,
    leadTimeDays: 2,
    isDemo: true,
  },
  {
    id: "shop-al-madina-02",
    name: "Al-Madina Express (F-10 Branch)",
    ownerName: "Haji Aslam",
    currency: "PKR",
    phone: "0302-5551234",
    address: "Shop #12, F-10 Markaz",
    city: "Islamabad",
    lowStockThreshold: 6,
    leadTimeDays: 1,
    isDemo: true,
  },
  {
    id: "shop-al-madina-03",
    name: "Al-Madina Mart (Saddar Branch)",
    ownerName: "Haji Aslam",
    currency: "PKR",
    phone: "0333-8889900",
    address: "Haider Road, Saddar",
    city: "Rawalpindi",
    lowStockThreshold: 10,
    leadTimeDays: 3,
    isDemo: true,
  },
];

const DEMO_SHOP: Shop = DEMO_SHOPS[0];

const DEMO_USER: UserProfile = {
  id: "user-aslam-01",
  name: "Haji Aslam",
  email: "aslam@almadinakiryana.pk",
  role: "owner",
  languagePreference: "ur",
  isDemo: true,
};

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
  lastWholesaleSyncDate: string;
  updateWholesaleBenchmarks: (benchmarks: WholesalePriceBenchmark[]) => void;
  triggerWholesaleScrape: () => Promise<WholesalePriceBenchmark[]>;
  seasonalForecasts: SeasonalForecast[];
  lastSaleUndo: Sale | null;
  undoSeconds: number;
  isDemoMode: boolean;
  // Core Actions
  openSeededDemoShop: () => void;
  exitDemoMode: () => void;
  switchShop: (shopId: string) => void;
  createShop: (shopData: Omit<Shop, "id">, template?: "grocery" | "empty") => void;
  updateShop: (shopData: Shop) => void;
  deleteShop: (shopId: string) => void;
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
  isAddStoreModalOpen: boolean;
  setIsAddStoreModalOpen: (open: boolean) => void;
  isStoreManagementModalOpen: boolean;
  setIsStoreManagementModalOpen: (open: boolean) => void;
  isAskTallynOpen: boolean;
  setIsAskTallynOpen: (open: boolean) => void;
  isKiryanaRadioOpen: boolean;
  setIsKiryanaRadioOpen: (open: boolean) => void;
  isBarcodeScannerOpen: boolean;
  setIsBarcodeScannerOpen: (open: boolean) => void;
  login: (email: string, name?: string, initialShopName?: string) => void;
  loginWithGoogle: () => void;
  loginWithSocial: (provider: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const branch1 = getBranchSeedData("shop-al-madina-01");
  const [user, setUser] = useState<UserProfile | null>(null); // New visitors see landing page without pre-login
  const [shop, setShop] = useState<Shop>(DEMO_SHOPS[0]);
  const [shops, setShops] = useState<Shop[]>(DEMO_SHOPS);
  const [activeTab, setActiveTab] = useState<ActiveTab>("landing");
  const [language, setLangState] = useState<Language>("en");
  const [products, setProducts] = useState<Product[]>(branch1.products);
  const [customers, setCustomers] = useState<Customer[]>(branch1.customers);
  const [sales, setSales] = useState<Sale[]>(branch1.sales);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>(branch1.expenses);
  const [wholesaleBenchmarks, setWholesaleBenchmarks] = useState<WholesalePriceBenchmark[]>(
    ((liveWholesaleData as { benchmarks?: WholesalePriceBenchmark[] })?.benchmarks as WholesalePriceBenchmark[]) || SEEDED_BENCHMARKS
  );
  const [lastWholesaleSyncDate, setLastWholesaleSyncDate] = useState<string>(
    (liveWholesaleData as { metadata?: { lastScrapedAt?: string } })?.metadata?.lastScrapedAt || new Date().toISOString()
  );

  const triggerWholesaleScrape = async (): Promise<WholesalePriceBenchmark[]> => {
    const timestamp = new Date().toISOString();
    const current = (
      ((liveWholesaleData as { benchmarks?: WholesalePriceBenchmark[] })?.benchmarks as WholesalePriceBenchmark[]) || SEEDED_BENCHMARKS
    );
    const refreshed: WholesalePriceBenchmark[] = current.map((b) => {
      const delta = b.currentShopCost - b.benchmarkPrice;
      const markupPercent = Number(((delta / b.benchmarkPrice) * 100).toFixed(1));
      const isInflationFlagged = markupPercent > 10.0;
      return {
        ...b,
        markupPercent,
        isInflationFlagged,
        scrapedAt: timestamp,
      };
    });
    setWholesaleBenchmarks(refreshed);
    setLastWholesaleSyncDate(timestamp);
    return refreshed;
  };
  const [seasonalForecasts, setSeasonalForecasts] = useState<SeasonalForecast[]>(SEEDED_SEASONAL_FORECASTS);
  const [lastSaleUndo, setLastSaleUndo] = useState<Sale | null>(null);
  const [undoSeconds, setUndoSeconds] = useState<number>(0);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
  const [isStoreManagementModalOpen, setIsStoreManagementModalOpen] = useState(false);
  const [isAskTallynOpen, setIsAskTallynOpen] = useState(false);
  const [isKiryanaRadioOpen, setIsKiryanaRadioOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    switchLanguage(lang);
  };

  // Centralized Button on Landing Page: Open Seeded Demo Account!
  const openSeededDemoShop = () => {
    const branch1 = getBranchSeedData("shop-al-madina-01");
    setUser(DEMO_USER);
    setShops(DEMO_SHOPS);
    setShop(DEMO_SHOPS[0]);
    setProducts(branch1.products);
    setCustomers(branch1.customers);
    setSales(branch1.sales);
    setExpenses(branch1.expenses);
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
      // Load branch-specific seeded data only if currently in demo mode
      if (isDemoMode) {
        const branchData = getBranchSeedData(shopId);
        setProducts(branchData.products);
        setCustomers(branchData.customers);
        setSales(branchData.sales);
        setExpenses(branchData.expenses);
      }
      audio.playCashRegisterChime();
    }
  };

  const createShop = (shopData: Omit<Shop, "id">, template: "grocery" | "empty" = "grocery") => {
    const newShop: Shop = {
      ...shopData,
      id: "shop-" + Date.now(),
    };
    setShops((prev) => [...prev, newShop]);
    setShop(newShop);

    if (template === "empty") {
      setProducts([]);
    } else {
      setProducts(SEEDED_PRODUCTS);
    }

    if (!user) {
      setUser({
        id: "usr-" + Date.now(),
        name: shopData.ownerName || "Retail Owner",
        email: `${shopData.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@tallyn.pk`,
        role: "owner",
        languagePreference: language,
      });
    }

    setIsAddStoreModalOpen(false);
    setIsStoreManagementModalOpen(false);
    setActiveTab("dashboard");
    audio.playCashRegisterChime();
  };

  const updateShop = (updatedShop: Shop) => {
    setShops((prev) => prev.map((s) => (s.id === updatedShop.id ? updatedShop : s)));
    if (shop.id === updatedShop.id) {
      setShop(updatedShop);
    }
  };

  const deleteShop = (shopId: string) => {
    if (shops.length <= 1) return;
    const remaining = shops.filter((s) => s.id !== shopId);
    setShops(remaining);
    if (shop.id === shopId) {
      setShop(remaining[0]);
    }
  };

  const login = (email: string, name: string = "Store Owner", initialShopName?: string) => {
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

    if (initialShopName && initialShopName.trim()) {
      const newStore: Shop = {
        id: "shop-" + Date.now(),
        name: initialShopName.trim(),
        ownerName: name,
        currency: "PKR",
        phone: "0300-0000000",
        address: "Main Commercial Market",
        city: "Islamabad",
        lowStockThreshold: 8,
        leadTimeDays: 2,
      };
      setShops((prev) => [...prev, newStore]);
      setShop(newStore);
    }

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
        lastWholesaleSyncDate,
        updateWholesaleBenchmarks: setWholesaleBenchmarks,
        triggerWholesaleScrape,
        seasonalForecasts,
        lastSaleUndo,
        undoSeconds,
        isDemoMode,
        openSeededDemoShop,
        exitDemoMode,
        switchShop,
        createShop,
        updateShop,
        deleteShop,
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
        isAddStoreModalOpen,
        setIsAddStoreModalOpen,
        isStoreManagementModalOpen,
        setIsStoreManagementModalOpen,
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
