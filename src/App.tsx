import React from "react";
import { AppProvider, useApp } from "@/context/AppContext";
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

function AppContent() {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-emerald-700 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* In-Store Live Wholesale Mandi Marquee (Only visible inside account/demo store) */}
      <WholesaleMandiTicker />

      {/* Main Dynamic View Area */}
      <main className="flex-1">
        {activeTab === "landing" && <LandingView />}
        {activeTab === "pos" && <CounterPOSView />}
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "insights" && <InsightsView />}
        {activeTab === "inventory" && <InventoryView />}
        {activeTab === "udhaar" && <UdhaarView />}
        {activeTab === "purchases" && <PurchasesView />}
        {activeTab === "history" && <SalesHistoryView />}
        {activeTab === "settings" && <SettingsView />}
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
