import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  UserProfile, Shop, Product, Customer, Sale, Purchase, Expense,
  WholesalePriceBenchmark, SeasonalForecast,
} from "@/types";
import { audio } from "@/lib/audio";
import {
  SEEDED_PRODUCTS, SEEDED_BENCHMARKS, SEEDED_SEASONAL_FORECASTS,
  getBranchSeedData,
} from "@/lib/seedData";
import {
  db, ensureProfile, mapProduct, mapCustomer, mapSale, mapPurchase, mapExpense,
} from "@/services/supabase";

import { tabFromPath, TAB_ROUTE_MAP, type ActiveTab } from "@/lib/routes";
export type { ActiveTab };

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

const DEMO_USER: UserProfile = {
  id: "user-aslam-01",
  name: "Haji Aslam",
  email: "aslam@almadinakiryana.pk",
  role: "owner",
  isDemo: true,
};

interface AppContextType {
  user: UserProfile | null;
  shop: Shop;
  shops: Shop[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  authReady: boolean;
  hasLiveShop: boolean;
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
  openSeededDemoShop: () => void;
  exitDemoMode: () => void;
  switchShop: (shopId: string) => void;
  createShop: (shopData: Omit<Shop, "id">, template?: "grocery" | "empty") => void;
  createMultipleShops: (branches: Array<{ shopData: Omit<Shop, "id">; template?: "grocery" | "empty" }>) => Promise<void>;
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

  // Modals
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const branch1 = getBranchSeedData("shop-al-madina-01");

  const [user, setUser] = useState<UserProfile | null>(null);
  const [shop, setShop] = useState<Shop>(DEMO_SHOPS[0]);
  const [shops, setShops] = useState<Shop[]>(DEMO_SHOPS);
  // The URL is the single source of truth for the active page.
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo<ActiveTab>(() => tabFromPath(location.pathname), [location.pathname]);
  const setActiveTab = useCallback(
    (tab: ActiveTab) => {
      const target = TAB_ROUTE_MAP[tab];
      if (target && target !== location.pathname) navigate(target);
    },
    [navigate, location.pathname],
  );
  // Auth bootstrap: false until Supabase has reported the initial session (or lack of one).
  const [authReady, setAuthReady] = useState(false);
  // For a signed-in (non-demo) user: does at least one real shop exist?
  const [hasLiveShop, setHasLiveShop] = useState(false);
  const [products, setProducts] = useState<Product[]>(branch1.products);
  const [customers, setCustomers] = useState<Customer[]>(branch1.customers);
  const [sales, setSales] = useState<Sale[]>(branch1.sales);
  const [purchases, setPurchases] = useState<Purchase[]>(branch1.purchases ?? []);
  const [expenses, setExpenses] = useState<Expense[]>(branch1.expenses);
  const [wholesaleBenchmarks] = useState(SEEDED_BENCHMARKS);
  const [seasonalForecasts] = useState<SeasonalForecast[]>(SEEDED_SEASONAL_FORECASTS);
  const [lastSaleUndo, setLastSaleUndo] = useState<Sale | null>(null);
  const [undoSeconds, setUndoSeconds] = useState<number>(0);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Modal flags
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
  const [isStoreManagementModalOpen, setIsStoreManagementModalOpen] = useState(false);
  const [isAskTallynOpen, setIsAskTallynOpen] = useState(false);
  const [isKiryanaRadioOpen, setIsKiryanaRadioOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Unique undo timer reference (prevents old intervals from undoing new sales)
  const undoIntervalRef = useRef<number | null>(null);

  const clearUndoTimer = () => {
    if (undoIntervalRef.current !== null) {
      window.clearInterval(undoIntervalRef.current);
      undoIntervalRef.current = null;
    }
  };

  /* ---------------------- Supabase live sync loader ---------------------- */

  const refreshLiveShopData = async (activeShopId: string) => {
    try {
      const [prods, custs, sls, slItems, pmts, purchs, exps] = await Promise.all([
        db.getProducts(activeShopId),
        db.getCustomers(activeShopId),
        db.getSales(activeShopId),
        db.getSaleItems(activeShopId),
        db.getPayments(activeShopId),
        db.getPurchases(activeShopId),
        db.getExpenses(activeShopId),
      ]);

      const mappedProds = prods.map(mapProduct);
      const mappedCusts = custs.map((c) => mapCustomer(c, sls, pmts));
      const mappedSales = sls.map((s) => mapSale(s, slItems.filter((i) => i.sale_id === s.id)));
      const mappedPurchs = purchs.map(mapPurchase);
      const mappedExps = exps.map(mapExpense);

      setProducts(mappedProds);
      setCustomers(mappedCusts);
      setSales(mappedSales);
      setPurchases(mappedPurchs);
      setExpenses(mappedExps);
    } catch (err) {
      console.warn("Failed to fetch live shop data from Supabase, staying on state:", err);
    }
  };

  // Subscribe to Supabase Auth state change on mount.
  // NOTE: the callback must stay synchronous — awaiting Supabase calls inside it can
  // deadlock the auth client — so the async loading is deferred with setTimeout(0).
  useEffect(() => {
    const loadLiveUser = async (u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
      const profileName = (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "Owner";
      try {
        await ensureProfile(u.id, profileName, u.email || "");
      } catch {
        // profile upsert is best-effort; shop fetch below will surface real problems
      }

      setUser({ id: u.id, name: profileName, email: u.email || "", role: "owner", isDemo: false });
      setIsDemoMode(false);

      try {
        const userShops = await db.getShops(u.id);
        if (userShops.length > 0) {
          const mappedShops: Shop[] = userShops.map((s) => ({
            id: s.id,
            name: s.name,
            ownerName: profileName,
            currency: s.currency,
            phone: "",
            address: "",
            lowStockThreshold: s.low_stock_threshold,
            leadTimeDays: s.lead_time_days,
          }));
          setShops(mappedShops);
          setShop(mappedShops[0]);
          setHasLiveShop(true);
          await refreshLiveShopData(mappedShops[0].id);
        } else {
          // Brand-new account: never show seeded demo data to a real user.
          setHasLiveShop(false);
          setShops([]);
          setProducts([]);
          setCustomers([]);
          setSales([]);
          setPurchases([]);
          setExpenses([]);
        }
      } catch {
        // DB unreachable: keep the session, don't force onboarding on a transient failure.
        setHasLiveShop(true);
      } finally {
        setAuthReady(true);
      }
    };

    const { data: listener } = db.onAuthChange(async (event, session) => {
      if (session?.user) {
        const u = session.user;
        setTimeout(() => { void loadLiveUser(u); }, 0);
      } else {
        if (event === "SIGNED_OUT") setHasLiveShop(false);
        setAuthReady(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ------------------------------- Actions ------------------------------- */

  const openSeededDemoShop = () => {
    clearUndoTimer();
    const b1 = getBranchSeedData("shop-al-madina-01");
    setUser(DEMO_USER);
    setShops(DEMO_SHOPS);
    setShop(DEMO_SHOPS[0]);
    setProducts(b1.products);
    setCustomers(b1.customers);
    setSales(b1.sales);
    setPurchases(b1.purchases ?? []);
    setExpenses(b1.expenses);
    setIsDemoMode(true);
    setActiveTab("dashboard");
    audio.playCashRegisterChime();
  };

  const exitDemoMode = () => {
    clearUndoTimer();
    setUser(null);
    setIsDemoMode(false);
    setActiveTab("landing");
  };

  const switchShop = async (shopId: string) => {
    const s = shops.find((item) => item.id === shopId);
    if (!s) return;
    clearUndoTimer();
    setLastSaleUndo(null);
    setUndoSeconds(0);
    setShop(s);

    if (isDemoMode) {
      const branchData = getBranchSeedData(shopId);
      setProducts(branchData.products);
      setCustomers(branchData.customers);
      setSales(branchData.sales);
      setPurchases(branchData.purchases ?? []);
      setExpenses(branchData.expenses);
    } else if (user) {
      await refreshLiveShopData(shopId);
    }
    audio.playCashRegisterChime();
  };

  const createShop = async (shopData: Omit<Shop, "id">, template: "grocery" | "empty" = "grocery") => {
    if (user && !isDemoMode) {
      try {
        const created = await db.createShop(
          user.id, 
          shopData.name, 
          shopData.currency || "PKR",
          shopData.lowStockThreshold,
          shopData.leadTimeDays
        );
        const newS: Shop = {
          id: created.id,
          name: created.name,
          ownerName: user.name,
          currency: created.currency,
          phone: shopData.phone,
          address: shopData.address,
          city: shopData.city,
          lowStockThreshold: created.low_stock_threshold,
          leadTimeDays: created.lead_time_days,
        };
        setShops((prev) => [...prev.filter((s) => s.id !== created.id), newS]);
        setShop(newS);

        if (template === "grocery") {
          const starterRows = SEEDED_PRODUCTS.map((p) => ({
            name: p.nameEn,
            name_ur: p.name,
            category: p.category,
            quantity: p.quantity,
            buy_price: p.buyPrice,
            sell_price: p.sellPrice,
            min_quantity: p.minQuantity,
            barcode: p.barcode,
          }));
          await db.insertProducts(created.id, starterRows);
        }
        await refreshLiveShopData(created.id);
      } catch (err) {
        console.warn("DB shop creation failed:", err);
        throw err;
      }
    } else {
      // No authenticated user: local-only fallback for demo / offline use.
      const newShop: Shop = { ...shopData, id: "shop-" + Date.now() };
      setShops((prev) => [...prev, newShop]);
      setShop(newShop);
      setProducts(template === "empty" ? [] : SEEDED_PRODUCTS);
      if (!user) {
        setUser({
          id: "usr-" + Date.now(),
          name: shopData.ownerName || "Retail Owner",
          email: `${shopData.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@tallyn.pk`,
          role: "owner",
        });
      }
    }

    setIsAddStoreModalOpen(false);
    setIsStoreManagementModalOpen(false);
    setActiveTab("dashboard");
    audio.playCashRegisterChime();
  };

  const createMultipleShops = async (
    branches: Array<{ shopData: Omit<Shop, "id">; template?: "grocery" | "empty" }>
  ) => {
    if (branches.length === 0) return;
    for (const b of branches) {
      await createShop(b.shopData, b.template || "grocery");
    }
    setActiveTab("dashboard");
  };

  const updateShop = (updatedShop: Shop) => {
    setShops((prev) => prev.map((s) => (s.id === updatedShop.id ? updatedShop : s)));
    if (shop.id === updatedShop.id) setShop(updatedShop);
  };

  const deleteShop = async (shopId: string) => {
    if (shops.length <= 1) return;
    if (user && !isDemoMode) {
      try { await db.deleteShop(shopId); } catch { /* ignore */ }
    }
    const remaining = shops.filter((s) => s.id !== shopId);
    setShops(remaining);
    if (shop.id === shopId) setShop(remaining[0]);
  };

  /* -------------------------- Atomic Record Sale -------------------------- */

  const recordSale = async (saleData: Omit<Sale, "id" | "createdAt" | "status">) => {
    // Check stock block (prevent negative)
    for (const item of saleData.items) {
      const p = products.find((x) => x.id === item.productId);
      if (p && p.quantity < item.quantity) {
        alert(`Insufficient stock for ${p.nameEn}. Available: ${p.quantity}, requested: ${item.quantity}`);
        return;
      }
    }

    let createdSaleId = "sale-" + Date.now();

    if (user && !isDemoMode) {
      try {
        const rpcRes = await db.rpcRecordSale(
          shop.id,
          saleData.paymentType,
          saleData.items.map((i) => ({ product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice })),
          saleData.customerId,
        );
        createdSaleId = rpcRes.sale_id;
        await refreshLiveShopData(shop.id);
      } catch (err) {
        console.warn("RPC record_sale failed, mutating state locally:", err);
      }
    }

    // Local state optimistic mirror
    const newSale: Sale = {
      ...saleData,
      id: createdSaleId,
      createdAt: new Date().toISOString(),
      status: "completed",
    };

    setProducts((prev) =>
      prev.map((p) => {
        const item = saleData.items.find((i) => i.productId === p.id);
        return item ? { ...p, quantity: Math.max(p.quantity - item.quantity, 0) } : p;
      })
    );

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
                    description: `Credit Sale (${saleData.items.length} items)`,
                    amount: saleData.totalAmount,
                    type: "credit_purchase",
                  },
                  ...(c.history || []),
                ],
              }
            : c
        )
      );
    }

    audio.playCashRegisterChime();
    setSales((prev) => [newSale, ...prev]);
    setLastSaleUndo(newSale);
    setUndoSeconds(10);

    // Reset & bind unique undo interval
    clearUndoTimer();
    const interval = window.setInterval(() => {
      setUndoSeconds((prev) => {
        if (prev <= 1) {
          clearUndoTimer();
          setLastSaleUndo(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    undoIntervalRef.current = interval;
  };

  const undoSale = async () => {
    if (!lastSaleUndo) return;

    if (user && !isDemoMode) {
      try {
        await db.rpcUndoSale(lastSaleUndo.id, shop.id);
        await refreshLiveShopData(shop.id);
      } catch (err) {
        console.warn("RPC undo_sale failed, un-doing locally:", err);
      }
    }

    setProducts((prev) =>
      prev.map((p) => {
        const item = lastSaleUndo.items.find((i) => i.productId === p.id);
        return item ? { ...p, quantity: p.quantity + item.quantity } : p;
      })
    );

    if (lastSaleUndo.paymentType === "credit" && lastSaleUndo.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === lastSaleUndo.customerId
            ? { ...c, creditBalance: Math.max(c.creditBalance - lastSaleUndo.totalAmount, 0) }
            : c
        )
      );
    }

    setSales((prev) => prev.map((s) => (s.id === lastSaleUndo.id ? { ...s, status: "undone" } : s)));
    audio.playUndoSound();
    clearUndoTimer();
    setLastSaleUndo(null);
    setUndoSeconds(0);
  };

  /* ------------------------------- Inventory ------------------------------ */

  const addProduct = async (p: Omit<Product, "id">) => {
    if (user && !isDemoMode) {
      try {
        await db.insertProducts(shop.id, [{
          name: p.nameEn,
          name_ur: p.name,
          category: p.category,
          quantity: p.quantity,
          buy_price: p.buyPrice,
          sell_price: p.sellPrice,
          min_quantity: p.minQuantity,
          barcode: p.barcode,
        }]);
        await refreshLiveShopData(shop.id);
        return;
      } catch (err) {
        console.warn("insertProducts failed, applying local fallback:", err);
      }
    }
    const newP: Product = { ...p, id: "p-" + Date.now() };
    setProducts((prev) => [newP, ...prev]);
  };

  const updateProduct = async (p: Product) => {
    if (user && !isDemoMode) {
      try {
        await db.updateProduct(p.id, {
          name: p.nameEn, name_ur: p.name, category: p.category,
          quantity: p.quantity, buy_price: p.buyPrice, sell_price: p.sellPrice,
          min_quantity: p.minQuantity, barcode: p.barcode,
        });
        await refreshLiveShopData(shop.id);
        return;
      } catch { /* ignore */ }
    }
    setProducts((prev) => prev.map((item) => (item.id === p.id ? p : item)));
  };

  const deleteProduct = async (productId: string) => {
    if (user && !isDemoMode) {
      try { await db.deleteProduct(productId); } catch { /* ignore */ }
    }
    setProducts((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateStock = async (productId: string, delta: number) => {
    if (user && !isDemoMode) {
      try {
        await db.rpcAdjustStock(shop.id, productId, delta, delta < 0 ? "Spillage/Damage" : "Recount");
        await refreshLiveShopData(shop.id);
        return;
      } catch { /* ignore */ }
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: Math.max(p.quantity + delta, 0) } : p))
    );
  };

  /* ------------------------------- Customers ------------------------------ */

  const addCustomer = async (c: Omit<Customer, "id" | "creditBalance">) => {
    if (user && !isDemoMode) {
      try {
        await db.insertCustomer(shop.id, c.name, c.phone);
        await refreshLiveShopData(shop.id);
        return;
      } catch { /* ignore */ }
    }
    const newCust: Customer = { ...c, id: "c-" + Date.now(), creditBalance: 0, history: [] };
    setCustomers((prev) => [...prev, newCust]);
  };

  const recordCreditPayment = async (customerId: string, amount: number) => {
    if (user && !isDemoMode) {
      try {
        await db.rpcRecordCreditPayment(shop.id, customerId, amount);
        await refreshLiveShopData(shop.id);
        audio.playCashRegisterChime();
        return;
      } catch { /* ignore */ }
    }
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
              ],
            }
          : c
      )
    );
    audio.playCashRegisterChime();
  };

  /* ------------------------------- Purchases ------------------------------ */

  const recordSupplierPurchase = async (purchase: Omit<Purchase, "id" | "date">) => {
    if (user && !isDemoMode) {
      try {
        await db.rpcRecordPurchase(
          shop.id,
          purchase.supplierName,
          purchase.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
          purchase.items.map((i) => ({ product_id: i.productId, quantity: i.quantity, unit_cost: i.unitCost })),
        );
        await refreshLiveShopData(shop.id);
        audio.playCashRegisterChime();
        return;
      } catch { /* ignore */ }
    }

    const newPurchase: Purchase = {
      ...purchase,
      id: "pur-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
    };
    setProducts((prev) =>
      prev.map((p) => {
        const item = purchase.items.find((i) => i.productId === p.id);
        return item ? { ...p, quantity: p.quantity + item.quantity, buyPrice: item.unitCost } : p;
      })
    );
    setPurchases((prev) => [newPurchase, ...prev]);
    audio.playCashRegisterChime();
  };

  /* -------------------------------- Expenses ------------------------------- */

  const addExpense = async (exp: Omit<Expense, "id">) => {
    if (user && !isDemoMode) {
      try {
        await db.insertExpense(shop.id, exp.title, exp.amount, exp.category, exp.date);
        await refreshLiveShopData(shop.id);
        return;
      } catch { /* ignore */ }
    }
    const newExp: Expense = { ...exp, id: "exp-" + Date.now() };
    setExpenses((prev) => [newExp, ...prev]);
  };

  /* --------------------------------- Auth --------------------------------- */

  const login = async (email: string, _name = "Store Owner") => {
    const { error } = await db.signInWithOtp(email);
    if (error) throw error;
    // Magic-link sign-in: the Supabase onAuthChange listener will set the real
    // user and load their shops once the session is established.
  };

  const loginWithGoogle = async () => {
    const { error } = await db.signInWithGoogle();
    if (error) throw error;
    // On success, the Supabase onAuthChange listener (mounted above) sets the
    // real user, loads their shops, and switches out of demo mode.
  };

  const loginWithSocial = async (provider: string) => {
    const { error } = await db.signInWithOAuthProvider(provider);
    if (error) throw error;
  };

  const logout = async () => {
    clearUndoTimer();
    try { await db.signOut(); } catch { /* ignore */ }
    setUser(null);
    setIsDemoMode(false);
    setHasLiveShop(false);
    setShops(DEMO_SHOPS);
    setShop(DEMO_SHOPS[0]);
    const seed = getBranchSeedData("shop-al-madina-01");
    setProducts(seed.products);
    setCustomers(seed.customers);
    setSales(seed.sales);
    setPurchases(seed.purchases ?? []);
    setExpenses(seed.expenses);
    setActiveTab("landing");
  };

  return (
    <AppContext.Provider
      value={{
        user,
        shop,
        shops,
        activeTab,
        setActiveTab,
        authReady,
        hasLiveShop,
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
        createMultipleShops,
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