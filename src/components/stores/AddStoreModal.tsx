import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { 
  X, 
  Store, 
  MapPin, 
  Phone, 
  Package, 
  Boxes, 
  Layers, 
  Check, 
  Sparkles,
  Coins,
  AlertTriangle,
  Building2
} from "lucide-react";

const POPULAR_CITIES = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Karachi",
  "Peshawar",
  "Faisalabad",
  "Multan",
  "Gujranwala",
  "Quetta"
];

export const AddStoreModal: React.FC = () => {
  const { t } = useTranslation();
  const { 
    isAddStoreModalOpen, 
    setIsAddStoreModalOpen, 
    createShop, 
    user 
  } = useApp();

  const [name, setName] = useState("");
  const [city, setCity] = useState("Islamabad");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(8);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(2);
  const [template, setTemplate] = useState<"grocery" | "empty">("grocery");
  const [error, setError] = useState<string | null>(null);

  if (!isAddStoreModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a valid store or branch name.");
      return;
    }

    const finalAddress = address.trim() 
      ? `${address.trim()}${city ? `, ${city}` : ""}`
      : (city ? `Main Commercial Market, ${city}` : "Pakistan");

    createShop(
      {
        name: name.trim(),
        ownerName: user?.name || "Store Owner",
        currency,
        phone: phone.trim() || "0300-1234567",
        address: finalAddress,
        city: city.trim(),
        lowStockThreshold: Number(lowStockThreshold) || 8,
        leadTimeDays: Number(leadTimeDays) || 2,
      },
      template
    );

    // Reset form
    setName("");
    setAddress("");
    setPhone("");
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200 my-8 text-start"
        role="dialog"
      >
        {/* Close Button */}
        <button
          onClick={() => setIsAddStoreModalOpen(false)}
          className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
          title="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 pe-8 pb-4 border-b border-slate-100">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-amber-300 shadow-sm">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                Register New Store Branch
              </h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 uppercase tracking-wide">
                Multi-Store
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Add a branch to your unified Tallyn account. Each store maintains dedicated inventory, ledger, and sales tracking.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Store Registration Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Store Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Store or Branch Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Store className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full rounded-xl border border-slate-200 ps-9 pe-3.5 py-2.5 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                placeholder="e.g. Al-Madina Express (G-11 Markaz Branch)"
              />
            </div>
          </div>

          {/* City Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">
                City / Region <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-400">Quick selection</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {POPULAR_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors min-h-[36px] ${
                    city === c
                      ? "bg-emerald-800 text-white font-bold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative">
              <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 ps-9 pe-3.5 py-2 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden"
                placeholder="Or type city name..."
              />
            </div>
          </div>

          {/* Full Physical Address */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Full Street Address / Location
            </label>
            <div className="relative">
              <MapPin className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 ps-9 pe-3.5 py-2 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 resize-none"
                placeholder="e.g. Shop #14, Main Commercial Market, Sector G-11/2"
              />
            </div>
          </div>

          {/* Phone & Currency Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Branch Phone / WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 ps-9 pe-3.5 py-2.5 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden"
                  placeholder="0300-1234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Store Currency
              </label>
              <div className="relative">
                <Coins className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 ps-9 pe-3.5 py-2.5 text-xs text-slate-900 font-bold bg-white focus:border-emerald-600 focus:outline-hidden"
                >
                  <option value="PKR">PKR (Pakistani Rupee - ₨)</option>
                  <option value="USD">USD ($)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SAR">SAR (﷼)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Low Stock Threshold & Lead Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Low Stock Threshold (Units)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 font-medium focus:border-emerald-600 focus:outline-hidden"
              />
              <span className="text-xs text-slate-400 mt-0.5 block">
                Triggers warning when stock falls below this count
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Reorder Lead Time (Days)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 font-medium focus:border-emerald-600 focus:outline-hidden"
              />
              <span className="text-xs text-slate-400 mt-0.5 block">
                Days supplier takes to deliver restocking orders
              </span>
            </div>
          </div>

          {/* Starter Inventory Template Selection */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Starter Inventory Catalog
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Kiryana Pack */}
              <div
                onClick={() => setTemplate("grocery")}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-all text-start relative ${
                  template === "grocery"
                    ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 shadow-xs"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-800 text-amber-300">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      Kiryana Pack
                    </span>
                  </div>
                  {template === "grocery" && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-normal">
                  Pre-loaded with 60 staple grocery items (Tea, Cooking Oil, Flour, Sugar, Spices, Dairy) with realistic cost & sell margins.
                </p>
                <span className="mt-2 inline-block rounded bg-emerald-200/60 px-1.5 py-0.5 text-xs font-semibold text-emerald-900">
                  Recommended for Kiryana
                </span>
              </div>

              {/* Option 2: Empty Catalog */}
              <div
                onClick={() => setTemplate("empty")}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-all text-start relative ${
                  template === "empty"
                    ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 shadow-xs"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      Empty Catalog
                    </span>
                  </div>
                  {template === "empty" && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-normal">
                  Fresh clean catalog with 0 products. Add your products manually, scan supplier paper slips, or import custom CSV.
                </p>
                <span className="mt-2 inline-block rounded bg-slate-200/80 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                  Clean Slate
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddStoreModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 px-6 py-2.5 text-xs font-bold text-amber-200 shadow-md transition-all active:scale-98"
            >
              <Store className="h-4 w-4" />
              <span>Register Store & Switch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};