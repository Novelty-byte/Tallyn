import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { TAB_TITLES, tabFromPath } from "@/lib/routes";
import { FxProvider } from "@/components/fx/FxProvider";
import { ToastProvider } from "@/components/fx/Toast";
import { AmbientBackground } from "@/components/fx/AmbientBackground";
import { NotFoundPage } from "@/components/system/NotFoundPage";
import { Navbar } from "@/components/layout/Navbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { AskTallynDrawer } from "@/components/ai/AskTallynDrawer";
import { KiryanaRadioModal } from "@/components/ai/KiryanaRadioModal";
import { AddStoreModal } from "@/components/stores/AddStoreModal";
import { StoreManagementModal } from "@/components/stores/StoreManagementModal";
import { WholesaleMandiTicker } from "@/components/dashboard/WholesaleMandiTicker";


const LandingView = lazy(() => import("@/components/landing/LandingView").then((m) => ({ default: m.LandingView })));
const CounterPOSView = lazy(() => import("@/components/pos/CounterPOSView").then((m) => ({ default: m.CounterPOSView })));
const DashboardView = lazy(() => import("@/components/dashboard/DashboardView").then((m) => ({ default: m.DashboardView })));
const InventoryView = lazy(() => import("@/components/inventory/InventoryView").then((m) => ({ default: m.InventoryView })));
const UdhaarView = lazy(() => import("@/components/udhaar/UdhaarView").then((m) => ({ default: m.UdhaarView })));
const PurchasesView = lazy(() => import("@/components/purchases/PurchasesView").then((m) => ({ default: m.PurchasesView })));
const InsightsView = lazy(() => import("@/components/insights/InsightsView").then((m) => ({ default: m.InsightsView })));
const SalesHistoryView = lazy(() => import("@/components/history/SalesHistoryView").then((m) => ({ default: m.SalesHistoryView })));
const SettingsView = lazy(() => import("@/components/settings/SettingsView").then((m) => ({ default: m.SettingsView })));
const LoginPage = lazy(() => import("@/components/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/components/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const StoreOnboardingPage = lazy(() => import("@/components/stores/StoreOnboardingPage").then((m) => ({ default: m.StoreOnboardingPage })));

function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
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

function AppContent() {
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

      {/* Top Navbar */}
      <Navbar />

      {/* In-Store Live Wholesale Mandi Marquee */}
      <WholesaleMandiTicker />

      {/* Main Dynamic View Area with Declarative Routes */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<LandingView />} />
            <Route path="/pos" element={guard(<CounterPOSView />)} />
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Modals & AI Assistants */}
      <AuthModal />
      <AddStoreModal />
      <StoreManagementModal />
      <AskTallynDrawer />
      <KiryanaRadioModal />

      {/* Global Footer */}
      <Footer />
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
