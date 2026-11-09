import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AppProvider, useApp, ActiveTab } from "@/context/AppContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LandingView } from "@/components/landing/LandingView";
import { CounterPOSView } from "@/components/pos/CounterPOSView";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { InventoryView } from "@/components/inventory/InventoryView";
import { UdhaarView } from "@/components/udhaar/UdhaarView";
import { PurchasesView } from "@/components/purchases/PurchasesView";
import { InsightsView } from "@/components/insights/InsightsView";
import { SalesHistoryView } from "@/components/history/SalesHistoryView";
import { SettingsView } from "@/components/settings/SettingsView";
import { AuthModal } from "@/components/auth/AuthModal";
import { AskTallynDrawer } from "@/components/ai/AskTallynDrawer";
import { KiryanaRadioModal } from "@/components/ai/KiryanaRadioModal";
import { AddStoreModal } from "@/components/stores/AddStoreModal";
import { StoreManagementModal } from "@/components/stores/StoreManagementModal";
import { WholesaleMandiTicker } from "@/components/dashboard/WholesaleMandiTicker";

const ROUTE_TAB_MAP: Record<string, ActiveTab> = {
  "/": "landing",
  "/pos": "pos",
  "/dashboard": "dashboard",
  "/insights": "insights",
  "/inventory": "inventory",
  "/udhaar": "udhaar",
  "/purchases": "purchases",
  "/history": "history",
  "/settings": "settings",
};

const TAB_ROUTE_MAP: Record<ActiveTab, string> = {
  landing: "/",
  pos: "/pos",
  dashboard: "/dashboard",
  insights: "/insights",
  inventory: "/inventory",
  udhaar: "/udhaar",
  purchases: "/purchases",
  history: "/history",
  settings: "/settings",
};

function RouteSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useApp();

  // Sync route -> activeTab on route change
  useEffect(() => {
    const targetTab = ROUTE_TAB_MAP[location.pathname];
    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  }, [location.pathname]);

  // Sync activeTab -> route on tab change
  useEffect(() => {
    const targetRoute = TAB_ROUTE_MAP[activeTab];
    if (targetRoute && location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  }, [activeTab]);

  return null;
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-emerald-700 selection:text-white">
      <RouteSync />

      {/* Top Navbar */}
      <Navbar />

      {/* In-Store Live Wholesale Mandi Marquee */}
      <WholesaleMandiTicker />

      {/* Main Dynamic View Area with Declarative Routes */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingView />} />
          <Route path="/pos" element={<CounterPOSView />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/insights" element={<InsightsView />} />
          <Route path="/inventory" element={<InventoryView />} />
          <Route path="/udhaar" element={<UdhaarView />} />
          <Route path="/purchases" element={<PurchasesView />} />
          <Route path="/history" element={<SalesHistoryView />} />
          <Route path="/settings" element={<SettingsView />} />
          {/* Fallback to home */}
          <Route path="*" element={<LandingView />} />
        </Routes>
      </main>

      {/* Modals & AI Assistants */}
      <AuthModal />
      <AddStoreModal />
      <StoreManagementModal />
      <AskTallynDrawer />
      <KiryanaRadioModal />

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
