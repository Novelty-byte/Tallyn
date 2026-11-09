import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { 
  Store, 
  Settings as SettingsIcon, 
  Globe, 
  ShieldCheck, 
  Plus, 
  Save, 
  CheckCircle2,
  Users
} from "lucide-react";

export const SettingsView: React.FC = () => {
  const { t } = useTranslation();
  const { 
    shop, 
    shops, 
    switchShop, 
    createShop, 
    language, 
    setLanguage, 
    user 
  } = useApp();

  const [shopName, setShopName] = useState(shop.name);
  const [phone, setPhone] = useState(shop.phone);
  const [address, setAddress] = useState(shop.address);
  const [lowStockDefault, setLowStockDefault] = useState(shop.lowStockThreshold);
  const [leadTime, setLeadTime] = useState(shop.leadTimeDays);
  const [isSaved, setIsSaved] = useState(false);

  // New Branch State
  const [isNewShopModalOpen, setIsNewShopModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    createShop({
      name: newBranchName,
      ownerName: user?.name || "Owner",
      currency: "PKR",
      phone: "0300-1112233",
      address: newBranchAddress || "Islamabad",
      lowStockThreshold: 5,
      leadTimeDays: 2,
    });

    setNewBranchName("");
    setNewBranchAddress("");
    setIsNewShopModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Shop Settings & Branches
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage shop configuration, language preference, and multi-tenant store branches.
        </p>
      </div>

      {isSaved && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-900 font-bold text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>Shop settings updated successfully!</span>
        </div>
      )}

      {/* Multi-Shop Branch Switcher */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Your Retail Shops & Branches</h3>
              <p className="text-xs text-slate-500">Multi-tenant partition scoped per shop_id</p>
            </div>
          </div>

          <button
            onClick={() => setIsNewShopModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition-colors shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Branch</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {shops.map((s) => (
            <div
              key={s.id}
              onClick={() => switchShop(s.id)}
              className={`cursor-pointer rounded-2xl border p-4 text-start transition-all ${
                shop.id === s.id
                  ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold text-slate-900">{s.name}</p>
                {shop.id === s.id && (
                  <span className="rounded-full bg-emerald-800 text-white text-[10px] font-bold px-2 py-0.5">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{s.address}</p>
              <p className="text-[11px] text-slate-400 mt-2">Currency: {s.currency}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <h3 className="text-base font-bold text-slate-900">Active Shop Configuration</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Shop Name</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Official WhatsApp Phone</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Physical Address</label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Low Stock Default Alert Threshold (Units)
            </label>
            <input
              type="number"
              min={1}
              value={lowStockDefault}
              onChange={(e) => setLowStockDefault(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supplier Reorder Lead Time (Days)
            </label>
            <input
              type="number"
              min={1}
              value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Language Selection */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-2">Display Language</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                language === "en"
                  ? "bg-emerald-800 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage("ur")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                language === "ur"
                  ? "bg-emerald-800 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              اردو (Urdu RTL)
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-md min-h-[44px]"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* New Branch Modal */}
      {isNewShopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 mb-3">Add New Shop Branch</h4>
            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Bismillah Cash & Carry"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Address</label>
                <input
                  type="text"
                  required
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="e.g. Sector F-10 Markaz"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewShopModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
