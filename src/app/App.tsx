import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { TAB_TITLES, tabFromPath, type ActiveTab } from "@/app/routes";
import { FxProvider } from "@/components/fx/FxProvider";
import { ToastProvider } from "@/components/fx/Toast";
import { AmbientBackground } from "@/components/fx/AmbientBackground";
import { NotFoundPage } from "@/components/system/NotFoundPage";
import { Navbar } from "@/components/layout/Navbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/features/auth/AuthModal";
import { AuthHeader } from "@/features/auth/AuthHeader";
import { TallynAiDrawer } from "@/features/assistant/TallynAiDrawer";
import { KiryanaRadioModal } from "@/features/assistant/KiryanaRadioModal";
import { AddStoreModal } from "@/features/stores/AddStoreModal";
import { StoreManagementModal } from "@/features/stores/StoreManagementModal";
import { WholesaleMandiTicker } from "@/features/dashboard/WholesaleMandiTicker";


// The homepage ships in the main bundle: no second download (and no spinner) on first visit.
import { LandingView } from "@/features/landing/LandingView";

// Every other screen is its own chunk. The loaders are kept so they can be prefetched while idle.
const loaders = {
  checkout: () => import("@/features/checkout/CheckoutView").then((m) => ({ default: m.CheckoutView })),
  dashboard: () => import("@/features/dashboard/DashboardView").then((m) => ({ default: m.DashboardView })),
  inventory: () => import("@/features/inventory/InventoryView").then((m) => ({ default: m.InventoryView })),
  udhaar: () => import("@/features/udhaar/UdhaarView").then((m) => ({ default: m.UdhaarView })),
  purchases: () => import("@/features/purchases/PurchasesView").then((m) => ({ default: m.PurchasesView })),
  insights: () => import("@/features/insights/InsightsView").then((m) => ({ default: m.InsightsView })),
  history: () => import("@/features/history/SalesHistoryView").then((m) => ({ default: m.SalesHistoryView })),
  settings: () => import("@/features/settings/SettingsView").then((m) => ({ default: m.SettingsView })),
  login: () => import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
  register: () => import("@/features/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })),
  docs: () => import("@/features/docs/DocsView").then((m) => ({ default: m.DocsView })),
  onboarding: () => import("@/features/stores/StoreOnboardingPage").then((m) => ({ default: m.StoreOnboardingPage })),
};
const CheckoutView = lazy(loaders.checkout);
const DashboardView = lazy(loaders.dashboard);
const InventoryView = lazy(loaders.inventory);
const UdhaarView = lazy(loaders.udhaar);
const PurchasesView = lazy(loaders.purchases);
const InsightsView = lazy(loaders.insights);
const SalesHistoryView = lazy(loaders.history);
const SettingsView = lazy(loaders.settings);
const LoginPage = lazy(loaders.login);
const RegisterPage = lazy(loaders.register);
const DocsView = lazy(loaders.docs);
const StoreOnboardingPage = lazy(loaders.onboarding);

/**
 * Warm every screen's chunk once the browser is idle, most-visited first, so moving
 * between pages is instant. Skipped on data-saver connections. Fire-and-forget: a
 * failed prefetch just means that page loads on demand as before.
 */
function usePrefetchScreens() {
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    const queue = [
      loaders.dashboard, loaders.checkout, loaders.docs, loaders.insights, loaders.udhaar,
      loaders.purchases, loaders.inventory, loaders.history, loaders.settings,
      loaders.login, loaders.register, loaders.onboarding,
    ];
    const idle: (cb: () => void) => number =
      (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ??
      ((cb) => window.setTimeout(cb, 300));
    let cancelled = false;
    const next = () => {
      const load = queue.shift();
      if (!load || cancelled) return;
      load().catch(() => undefined).finally(() => { if (!cancelled) idle(next); });
    };
    const start = window.setTimeout(() => idle(next), 1200); // after the first screen has settled
    return () => { cancelled = true; window.clearTimeout(start); };
  }, []);
}

/** Shown only if a screen takes longer than 250ms to arrive, so fast loads never flash a spinner. */
function PageLoading() {
  return (
    <div className="tn-delayed-show flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Per-navigation housekeeping: scroll to top, document title, move focus to <main>. */
function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const tab = tabFromPath(pathname);
    document.title = TAB_TITLES[tab];
    if (!hash) window.scrollTo({ top: 0, left: 0 });
    const main = document.getElementById("main-content");
    if (main && !hash) main.focus({ preventScroll: true });
  }, [pathname, hash]);
  return null;
}

/**
 * Protects counter/app pages. Signed-out visitors are sent to /login (and returned
 * afterwards); signed-in owners with no shop are sent to onboarding. Demo sessions pass.
 */
function RequireSession({ children }: { children: React.ReactElement }) {
  const { user, authReady, isDemoMode, hasLiveShop } = useApp();
  const location = useLocation();
  if (!authReady) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isDemoMode && !hasLiveShop) return <Navigate to="/onboarding" replace />;
  return children;
}

const guard = (el: React.ReactElement) => <RequireSession>{el}</RequireSession>;

/** Sign-in / sign-up / store setup: focused pages without the app navbar, ticker or footer. */
const AUTH_TABS: ReadonlySet<ActiveTab> = new Set<ActiveTab>(["login", "register", "onboarding"]);
/** Pages whose background should run edge to edge instead of being capped at the app width. */
const BLEED_TABS: ReadonlySet<ActiveTab> = new Set<ActiveTab>(["landing", "login", "register", "onboarding", "notfound"]);

function AppContent() {
  usePrefetchScreens();
  const { pathname } = useLocation();
  const tab = tabFromPath(pathname);
  const isAuthPage = AUTH_TABS.has(tab);
  return (
    <div className="relative isolate min-h-screen flex flex-col bg-canvas selection:bg-emerald-700 selection:text-white">
      <AmbientBackground variant="app" fixed />
      <RouteEffects />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-900 focus:shadow-lg"
      >
        Skip to content
      </a>

      {isAuthPage ? (
        <AuthHeader />
      ) : (
        <>
          {/* Top Navbar */}
          <Navbar />

          {/* In-Store Live Wholesale Mandi Marquee */}
          <WholesaleMandiTicker />
        </>
      )}

      {/* Main Dynamic View Area with Declarative Routes */}
      <main id="main-content" tabIndex={-1} data-bleed={BLEED_TABS.has(tab) ? "" : undefined} className="flex-1 outline-none">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<LandingView />} />
            <Route path="/checkout" element={guard(<CheckoutView />)} />
            <Route path="/pos" element={<Navigate to="/checkout" replace />} />
            <Route path="/dashboard" element={guard(<DashboardView />)} />
            <Route path="/insights" element={guard(<InsightsView />)} />
            <Route path="/inventory" element={guard(<InventoryView />)} />
            <Route path="/udhaar" element={guard(<UdhaarView />)} />
            <Route path="/purchases" element={guard(<PurchasesView />)} />
            <Route path="/history" element={guard(<SalesHistoryView />)} />
            <Route path="/settings" element={guard(<SettingsView />)} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signin" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/signup" element={<RegisterPage />} />
            <Route path="/onboarding" element={<StoreOnboardingPage />} />
            <Route path="/register-store" element={<StoreOnboardingPage />} />
            <Route path="/docs" element={<DocsView />} />
            <Route path="/docs/:slug" element={<DocsView />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Modals & AI Assistants */}
      <AuthModal />
      <AddStoreModal />
      <StoreManagementModal />
      <TallynAiDrawer />
      <KiryanaRadioModal />

      {/* Global Footer */}
      {!isAuthPage && <Footer />}
      <MobileTabBar />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <FxProvider>
        <ToastProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </ToastProvider>
      </FxProvider>
    </BrowserRouter>
  );
}

export default App;
