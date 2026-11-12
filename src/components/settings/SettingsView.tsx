import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { db } from "@/services/supabase";
import { 
  Store, 
  Settings as SettingsIcon, 
  Globe, 
  ShieldCheck, 
  Plus, 
  Save, 
  CheckCircle2,
  Users,
  User,
  Mail,
  MapPin,
  Phone,
  Building,
  Check,
  Layers,
  ArrowRight,
  ShieldAlert
} from "lucide-react";

export const SettingsView: React.FC = () => {
  const { t } = useTranslation();
  const {
    shop,
    shops,
    switchShop,
    updateShop,
    setIsAddStoreModalOpen,
    setIsStoreManagementModalOpen,
    user
  } = useApp();

  const [shopName, setShopName] = useState(shop.name);
  const [phone, setPhone] = useState(shop.phone);
  const [address, setAddress] = useState(shop.address);
  const [lowStockDefault, setLowStockDefault] = useState(shop.lowStockThreshold);
  const [leadTime, setLeadTime] = useState(shop.leadTimeDays);
  const [isSaved, setIsSaved] = useState(false);

  const [userName, setUserName] = useState(user?.name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Sync state when active shop or user changes
  useEffect(() => {
    setShopName(shop.name);
    setPhone(shop.phone);
    setAddress(shop.address);
    setLowStockDefault(shop.lowStockThreshold);
    setLeadTime(shop.leadTimeDays);
  }, [shop.id]);

  useEffect(() => {
    if (user?.name) setUserName(user.name);
  }, [user?.name]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !user) return;
    setIsUpdatingProfile(true);
    try {
      if (!user.isDemo) {
        await db.updateProfile(user.id, userName.trim());
      }
      user.name = userName.trim();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.warn("Failed to update profile:", err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateShop({
      ...shop,
      name: shopName,
      phone,
      address,
      lowStockThreshold: Number(lowStockDefault),
      leadTimeDays: Number(leadTime),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-6 lg:px-8 py-8 space-y-8 text-start">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
            SaaS Architecture
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">Multi-Tenant Scoped</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Store Settings & Multi-Branch Management
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure physical branch details, manage multiple store locations, and adjust inventory threshold parameters.
        </p>
      </div>

      {profileSaved && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-900 font-bold text-xs flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>User account profile updated and saved to PostgreSQL successfully!</span>
        </div>
      )}

      {isSaved && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-900 font-bold text-xs flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>Shop branch configurations updated and saved successfully!</span>
        </div>
      )}

      {/* User Account & Merchant Identity Section (Reflects DB Profile) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="h-11 w-11 rounded-2xl bg-slate-900 text-amber-300 flex items-center justify-center font-bold shadow-xs">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Merchant Owner Account & Cloud Identity
              </h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                {user?.isDemo ? "Demo Account" : "Authenticated Live"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Your registered user profile in the database, reflected across all store branches
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Owner Full Name
              </label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 ps-9 pe-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email / Social Account
              </label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  disabled
                  value={user?.email || "No email linked"}
                  className="w-full rounded-xl border border-slate-200 ps-9 pe-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account ID (UUID)
              </label>
              <input
                type="text"
                disabled
                value={user?.id || "N/A"}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-mono text-slate-400 bg-slate-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role & Connected Stores
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>Store Owner • {shops.length} Active {shops.length === 1 ? "Branch" : "Branches"}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isUpdatingProfile ? "Saving..." : "Update Owner Name"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Branch & Multi-Store Management Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold shadow-xs">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Branch & Multi-Store Management
                </h3>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                  {shops.length} {shops.length === 1 ? "Branch" : "Branches"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Isolated inventory and ledgers partitioned per shop under your business account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStoreManagementModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>Manage All</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddStoreModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 px-3.5 py-2 text-xs font-bold text-amber-200 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Branch</span>
            </button>
          </div>
        </div>

        {/* Store Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {shops.map((s) => {
            const isActive = s.id === shop.id;
            return (
              <div
                key={s.id}
                className={`rounded-2xl border p-4 text-start transition-all flex flex-col justify-between ${
                  isActive
                    ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-slate-900 line-clamp-1">
                        {s.name}
                      </span>
                      {s.city && (
                        <span className="rounded bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 shrink-0">
                          {s.city}
                        </span>
                      )}
                    </div>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-800 text-white text-[10px] font-bold px-2 py-0.5 shrink-0">
                        <Check className="h-2.5 w-2.5 stroke-[3]" /> Active Branch
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => switchShop(s.id)}
                        className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 transition-colors"
                      >
                        Switch Here
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="line-clamp-1">{s.address}</span>
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>{s.phone}</span>
                  </span>
                  <span className="font-semibold text-slate-700">
                    Threshold: &lt; {s.lowStockThreshold} units
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Active Branch Settings Form */}
      <form onSubmit={handleSaveSettings} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Active Store Configuration ({shop.name})
              </h3>
              <p className="text-xs text-slate-500">
                Updating settings for currently active store counter
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
            Active ID: {shop.id}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Store / Branch Name</label>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
            <span className="text-[10px] text-slate-400 mt-1 block">
              Flag items below this threshold in red for immediate reordering.
            </span>
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
            <span className="text-[10px] text-slate-400 mt-1 block">
              Average delivery turnaround time from wholesale suppliers.
            </span>
          </div>
        </div>

        {/* Language info (English-only build) */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-2">Display Language</label>
          <div className="flex gap-3">
            <span className="rounded-xl px-4 py-2 text-xs font-bold bg-emerald-800 text-white shadow-2xs">
              English
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-md min-h-[44px]"
          >
            <Save className="h-4 w-4" />
            <span>Save Store Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};