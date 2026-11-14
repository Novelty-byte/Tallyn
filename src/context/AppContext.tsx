import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  UserProfile, Shop, Product, Customer, Sale, Purchase, Expense,
  WholesalePriceBenchmark,
} from "@/types";
import { audio } from "@/lib/audio";
import { useToast } from "@/components/fx/Toast";
import {
  SEEDED_PRODUCTS, SEEDED_BENCHMARKS,
  getBranchSeedData,
} from "@/lib/seedData";
import {
  db, ensureProfile, mapProduct, mapCustomer, mapSale, mapPurchase, mapExpense,
  isServerRejection, serverErrorMessage,
} from "@/services/supabase";
import { defaultDueDate, toLocalYmd } from "@/lib/credit";

import { tabFromPath, TAB_ROUTE_MAP, type ActiveTab } from "@/lib/routes";
import { readDemoSession, writeDemoSession, clearDemoSession } from "@/lib/demoSession";
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
  /** Changes that only reached this device (server write failed). */
  unsyncedCount: number;
  dismissUnsynced: () => void;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  wholesaleBenchmarks: WholesalePriceBenchmark[];
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
  /** Resolves true when the sale was recorded (on the server, or on-device after a network failure). */
  recordSale: (sale: Omit<Sale, "id" | "createdAt" | "status">) => Promise<boolean>;
  undoSale: () => void;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  updateStock: (productId: string, delta: number) => void;
  /** Resolves to the new customer's id, or null if it could not be created. */
  addCustomer: (customer: Omit<Customer, "id" | "creditBalance">) => Promise<string | null>;
  /** Resolves true when the payment was recorded. */
  recordCreditPayment: (customerId: string, amount: number) => Promise<boolean>;
  /** Resolves true when the purchase was recorded (stock raised). */
  recordSupplierPurchase: (purchase: Omit<Purchase, "id" | "date">) => Promise<boolean>;
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

type LiveAuthUser = { id: string; email?: string | null; user_metadata?: Record<string, unknown> };

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // A reload while exploring the demo must stay in the demo (see lib/demoSession).
  const [restoredDemoShop] = useState<Shop | null>(() => {
    const id = readDemoSession();
    return id ? DEMO_SHOPS.find((s) => s.id === id) ?? DEMO_SHOPS[0] : null;
  });
  const branch1 = getBranchSeedData(restoredDemoShop?.id ?? "shop-al-madina-01");

  const [user, setUser] = useState<UserProfile | null>(restoredDemoShop ? DEMO_USER : null);
  const [shop, setShop] = useState<Shop>(restoredDemoShop ?? DEMO_SHOPS[0]);
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
  // A restored demo session needs no server answer, so it is ready immediately.
  const [authReady, setAuthReady] = useState(restoredDemoShop !== null);
  // For a signed-in (non-demo) user: does at least one real shop exist?
  const [hasLiveShop, setHasLiveShop] = useState(false);
  const toast = useToast();
  // Live-mode writes that failed on the server and were applied locally only (Rule 5: fail open).
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const dismissUnsynced = () => setUnsyncedCount(0);
  const markUnsynced = (what: string) => {
    setUnsyncedCount((n) => n + 1);
    toast.warning(`${what} saved on this device only`, {
      description: "We couldn't reach the server. Keep working — but don't clear this browser's data until you're back online.",
      duration: 8000,
    });
  };
  const [products, setProducts] = useState<Product[]>(branch1.products);
  const [customers, setCustomers] = useState<Customer[]>(branch1.customers);
  const [sales, setSales] = useState<Sale[]>(branch1.sales);
  const [purchases, setPurchases] = useState<Purchase[]>(branch1.purchases ?? []);
  const [expenses, setExpenses] = useState<Expense[]>(branch1.expenses);
  const [wholesaleBenchmarks] = useState(SEEDED_BENCHMARKS);
  const [lastSaleUndo, setLastSaleUndo] = useState<Sale | null>(null);
  const [undoSeconds, setUndoSeconds] = useState<number>(0);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(restoredDemoShop !== null);

  // Modal flags
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
  const [isStoreManagementModalOpen, setIsStoreManagementModalOpen] = useState(false);
  const [isAskTallynOpen, setIsAskTallynOpen] = useState(false);
  const [isKiryanaRadioOpen, setIsKiryanaRadioOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Unique undo timer reference (prevents old intervals from undoing new sales)
  const undoIntervalRef = useRef<number | null>(null);
  // Id of the real account currently loaded; lets us ignore repeat auth events for the
  // same user (token refresh, tab refocus) instead of re-fetching and resetting the shop.
  const liveUserIdRef = useRef<string | null>(null);
  const loadLiveUserRef = useRef<((u: LiveAuthUser) => Promise<void>) | null>(null);

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
    const loadLiveUser = async (u: LiveAuthUser) => {
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

    loadLiveUserRef.current = loadLiveUser;

    const { data: listener } = db.onAuthChange(async (event, session) => {
      if (session?.user) {
        const u = session.user;
        // Visitor is exploring the demo: a stored session must not pull them out of it.
        // (Explicit sign-in/sign-up clears the demo flag first, see lib/demoSession.)
        if (readDemoSession()) {
          setAuthReady(true);
          return;
        }
        // Same account already loaded (token refresh, tab refocus): nothing to do.
        if (liveUserIdRef.current === u.id) {
          setAuthReady(true);
          return;
        }
        liveUserIdRef.current = u.id;
        // Hold route guards on the loading spinner until the account's shops are known;
        // otherwise a fresh sign-in is bounced to /onboarding before shops arrive.
        setAuthReady(false);
        setTimeout(() => { void loadLiveUser(u); }, 0);
      } else {
        if (event === "SIGNED_OUT") {
          liveUserIdRef.current = null;
          setHasLiveShop(false);
        }
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
    writeDemoSession(DEMO_SHOPS[0].id);
    liveUserIdRef.current = null; // a real session (if any) is reloaded when the demo ends
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

  const resetToSeedData = () => {
    const seed = getBranchSeedData("shop-al-madina-01");
    setShops(DEMO_SHOPS);
    setShop(DEMO_SHOPS[0]);
    setProducts(seed.products);
    setCustomers(seed.customers);
    setSales(seed.sales);
    setPurchases(seed.purchases ?? []);
    setExpenses(seed.expenses);
  };

  const exitDemoMode = () => {
    clearUndoTimer();
    clearDemoSession();
    setUser(null);
    setIsDemoMode(false);
    setLastSaleUndo(null);
    setUndoSeconds(0);
    resetToSeedData();
    setActiveTab("landing");
    // The visitor may also hold a real session (they opened the demo while signed in).
    void db.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u && readDemoSession() === null) {
        liveUserIdRef.current = u.id;
        setAuthReady(false);
        void loadLiveUserRef.current?.(u);
      }
    }).catch(() => { /* no session to restore */ });
  };

  const switchShop = async (shopId: string) => {
    const s = shops.find((item) => item.id === shopId);
    if (!s) return;
    clearUndoTimer();
    setLastSaleUndo(null);
    setUndoSeconds(0);
    setShop(s);

    if (isDemoMode) {
      if (DEMO_SHOPS.some((d) => d.id === shopId)) writeDemoSession(shopId);
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
        setShops((prev) => [...prev.filter((s) => s.id !== created.id && !s.isDemo), newS]);
        setShop(newS);
        // The owner now has a real store: route guards must stop sending them to onboarding.
        setHasLiveShop(true);

        if (template === "grocery") {
          try {
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
          } catch (catalogErr) {
            // The store exists; don't fail the whole setup (and invite a duplicate) over the starter catalog.
            console.warn("Starter catalog insert failed:", catalogErr);
            toast.warning("Store created, but the starter catalog could not be loaded", {
              description: "You can add products from Inventory.",
              duration: 8000,
            });
          }
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

  const recordSale = async (saleData: Omit<Sale, "id" | "createdAt" | "status">): Promise<boolean> => {
    // Check stock block (prevent negative)
    for (const item of saleData.items) {
      const p = products.find((x) => x.id === item.productId);
      if (p && p.quantity < item.quantity) {
        toast.error(`Not enough stock: ${p.nameEn}`, { description: `Available ${p.quantity}, requested ${item.quantity}.` });
        return false;
      }
    }

    // Udhaar must be booked against a real customer of THIS shop, with a due date.
    let dueDate: string | undefined;
    if (saleData.paymentType === "credit") {
      if (!saleData.customerId || !customers.some((c) => c.id === saleData.customerId)) {
        toast.error("Choose a customer for this udhaar sale", {
          description: "Credit sales must be recorded against a customer account.",
        });
        return false;
      }
      dueDate = saleData.dueDate ?? defaultDueDate();
      if (dueDate < toLocalYmd()) {
        toast.error("Due date is in the past", { description: "Pick today or a later date." });
        return false;
      }
    }

    let createdSaleId = "sale-" + Date.now();
    // True once the atomic RPC succeeded and local state was re-read from the server.
    let serverSynced = false;

    if (user && !isDemoMode) {
      try {
        const rpcRes = await db.rpcRecordSale(
          shop.id,
          saleData.paymentType,
          saleData.items.map((i) => ({ product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice })),
          saleData.paymentType === "credit" ? saleData.customerId : undefined,
          dueDate,
        );
        createdSaleId = rpcRes.sale_id;
        await refreshLiveShopData(shop.id);
        serverSynced = true;
      } catch (err) {
        if (isServerRejection(err)) {
          // The server saw the sale and refused it: never fake it locally.
          console.warn("record_sale rejected by server:", err);
          toast.error("Sale not recorded", { description: serverErrorMessage(err) });
          return false;
        }
        console.warn("RPC record_sale failed (network), mutating state locally:", err);
        markUnsynced("Sale");
      }
    }

    // Local state optimistic mirror
    const newSale: Sale = {
      ...saleData,
      dueDate,
      id: createdSaleId,
      createdAt: new Date().toISOString(),
      status: "completed",
    };

    // Only mirror locally when the server did NOT already apply (and we re-read) the sale —
    // otherwise stock and udhaar would be counted twice.
    if (!serverSynced) {
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
                  lastPurchaseDate: toLocalYmd(),
                  // Oldest unpaid sale keeps setting the next due date (FIFO).
                  nextDueDate:
                    c.creditBalance > 0 && c.nextDueDate && c.nextDueDate < dueDate!
                      ? c.nextDueDate
                      : dueDate,
                  history: [
                    {
                      id: "h-" + Date.now(),
                      date: toLocalYmd(),
                      description: `Credit Sale (${saleData.items.length} items) · due ${dueDate}`,
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

    }

    audio.playCashRegisterChime();
    if (!serverSynced) setSales((prev) => [newSale, ...prev]);
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
    return true;
  };

  const undoSale = async () => {
    if (!lastSaleUndo) return;

    let undoSynced = false;
    if (user && !isDemoMode) {
      try {
        await db.rpcUndoSale(lastSaleUndo.id, shop.id);
        await refreshLiveShopData(shop.id);
        undoSynced = true;
      } catch (err) {
        console.warn("RPC undo_sale failed, un-doing locally:", err);
        markUnsynced("Undo");
      }
    }

    // Server already restored stock/udhaar and we re-read it: don't reverse it a second time.
    if (!undoSynced) {
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
              ? (() => {
                  const creditBalance = Math.max(c.creditBalance - lastSaleUndo.totalAmount, 0);
                  return { ...c, creditBalance, nextDueDate: creditBalance > 0 ? c.nextDueDate : undefined };
                })()
              : c
          )
        );
      }

    setSales((prev) => prev.map((s) => (s.id === lastSaleUndo.id ? { ...s, status: "undone" } : s)));
    }
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

  const addCustomer = async (c: Omit<Customer, "id" | "creditBalance">): Promise<string | null> => {
    if (user && !isDemoMode) {
      try {
        const row = await db.insertCustomer(shop.id, c.name, c.phone);
        await refreshLiveShopData(shop.id);
        return row.id;
      } catch (err) {
        if (isServerRejection(err)) {
          toast.error("Customer not saved", { description: serverErrorMessage(err) });
          return null;
        }
        // Network failure: a device-only customer could never receive a server-side
        // credit sale (record_sale checks the customer belongs to the shop), so don't fake one.
        toast.error("Couldn't reach the server", { description: "The customer was not saved. Try again when you're online." });
        return null;
      }
    }
    const newCust: Customer = { ...c, id: "c-" + Date.now(), creditBalance: 0, history: [] };
    setCustomers((prev) => [...prev, newCust]);
    return newCust.id;
  };

  const recordCreditPayment = async (customerId: string, amount: number): Promise<boolean> => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return false;
    if (!(amount > 0)) {
      toast.error("Enter an amount greater than zero");
      return false;
    }
    if (amount > cust.creditBalance) {
      toast.error("Payment is more than the amount owed", {
        description: `${cust.name} owes ${cust.creditBalance.toLocaleString()} — record at most that.`,
      });
      return false;
    }

    if (user && !isDemoMode) {
      try {
        await db.rpcRecordCreditPayment(shop.id, customerId, amount);
        await refreshLiveShopData(shop.id);
        audio.playCashRegisterChime();
        return true;
      } catch (err) {
        if (isServerRejection(err)) {
          toast.error("Payment not recorded", { description: serverErrorMessage(err) });
          return false;
        }
        markUnsynced("Payment");
      }
    }
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              creditBalance: Math.max(c.creditBalance - amount, 0),
              // On-device we only know the oldest due date, so a payment that clears the
              // whole balance clears it; a partial payment keeps it.
              nextDueDate: c.creditBalance - amount > 0 ? c.nextDueDate : undefined,
              history: [
                {
                  id: "h-" + Date.now(),
                  date: toLocalYmd(),
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
    return true;
  };

  /* ------------------------------- Purchases ------------------------------ */

  const recordSupplierPurchase = async (purchase: Omit<Purchase, "id" | "date">): Promise<boolean> => {
    // Every line must point at a product of THIS shop with a sane quantity and cost.
    const unknown = purchase.items.filter((i) => !products.some((p) => p.id === i.productId));
    if (purchase.items.length === 0 || unknown.length > 0) {
      toast.error("Purchase not recorded", {
        description: purchase.items.length === 0 ? "Add at least one item." : "Some lines aren't linked to a product in your stock.",
      });
      return false;
    }
    if (purchase.items.some((i) => !(i.quantity > 0) || !(i.unitCost >= 0))) {
      toast.error("Purchase not recorded", { description: "Every line needs a quantity above zero and a cost." });
      return false;
    }

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
        return true;
      } catch (err) {
        if (isServerRejection(err)) {
          toast.error("Purchase not recorded", { description: serverErrorMessage(err) });
          return false;
        }
        console.warn("RPC record_purchase failed (network), applying locally:", err);
        markUnsynced("Purchase");
      }
    }

    const newPurchase: Purchase = {
      ...purchase,
      invoiceNumber: purchase.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      id: "pur-" + Date.now(),
      date: toLocalYmd(),
    };
    // Same semantics as record_purchase: add every line (two lines for one product both count),
    // and the last line's cost becomes the new buy price.
    setProducts((prev) =>
      prev.map((p) => {
        const lines = purchase.items.filter((i) => i.productId === p.id);
        if (lines.length === 0) return p;
        const added = lines.reduce((s, i) => s + i.quantity, 0);
        return { ...p, quantity: p.quantity + added, buyPrice: lines[lines.length - 1].unitCost };
      })
    );
    setPurchases((prev) => [newPurchase, ...prev]);
    audio.playCashRegisterChime();
    return true;
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
    clearDemoSession();
    liveUserIdRef.current = null;
    try { await db.signOut(); } catch { /* ignore */ }
    setUser(null);
    setIsDemoMode(false);
    setHasLiveShop(false);
    setLastSaleUndo(null);
    setUndoSeconds(0);
    resetToSeedData();
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
        unsyncedCount,
        dismissUnsynced,
        products,
        customers,
        sales,
        purchases,
        expenses,
        wholesaleBenchmarks,
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