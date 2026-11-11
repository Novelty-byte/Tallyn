import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { 
  Store, 
  MapPin, 
  Phone, 
  Package, 
  Boxes, 
  Plus, 
  Trash2, 
  Check, 
  Building2, 
  ArrowRight,
  Layers,
  Sparkles,
  HelpCircle
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

interface BranchFormState {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  currency: string;
  lowStockThreshold: number;
  leadTimeDays: number;
  template: "grocery" | "empty";
}

export const StoreOnboardingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === "ur";
  const navigate = useNavigate();
  const { user, createShop, createMultipleShops } = useApp();

  // Multi-Store option toggle
  const [hasMultipleStores, setHasMultipleStores] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(!user);

  // Wait for Supabase auth session to populate the user profile before creating shops.
  useEffect(() => {
    if (user) setIsLoadingAccount(false);
  }, [user]);

  // Single Store State
  const [singleStore, setSingleStore] = useState<BranchFormState>({
    id: "store-1",
    name: "",
    city: "Islamabad",
    address: "",
    phone: "",
    currency: "PKR",
    lowStockThreshold: 8,
    leadTimeDays: 2,
    template: "grocery"
  });

  // Multiple Stores State
  const [branches, setBranches] = useState<BranchFormState[]>([
    {
      id: "branch-1",
      name: "Al-Madina Kiryana (Main Branch)",
      city: "Islamabad",
      address: "Shop #4, Main Bazar, G-9/4",
      phone: "0300-9876543",
      currency: "PKR",
      lowStockThreshold: 8,
      leadTimeDays: 2,
      template: "grocery"
    },
    {
      id: "branch-2",
      name: "Al-Madina Express (G-11 Markaz Branch)",
      city: "Islamabad",
      address: "Shop #14, Main Commercial Market, Sector G-11/2",
      phone: "0302-5551234",
      currency: "PKR",
      lowStockThreshold: 6,
      leadTimeDays: 1,
      template: "grocery"
    }
  ]);

  const addBranch = () => {
    const newIdx = branches.length + 1;
    setBranches((prev) => [
      ...prev,
      {
        id: `branch-${Date.now()}`,
        name: `Branch #${newIdx}`,
        city: "Islamabad",
        address: "",
        phone: "",
        currency: "PKR",
        lowStockThreshold: 8,
        leadTimeDays: 2,
        template: "grocery"
      }
    ]);
  };

  const removeBranch = (id: string) => {
    if (branches.length <= 1) return;
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBranchField = (id: string, field: keyof BranchFormState, value: unknown) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (!user) {
        setErrorMsg("Account session not ready yet. Please wait a moment and try again.");
        setIsSubmitting(false);
        return;
      }

      if (!hasMultipleStores) {
        // Single store submission
        if (!singleStore.name.trim()) {
          setErrorMsg("Please enter a valid store or branch name.");
          setIsSubmitting(false);
          return;
        }

        const finalAddress = singleStore.address.trim() 
          ? `${singleStore.address.trim()}${singleStore.city ? `, ${singleStore.city}` : ""}`
          : (singleStore.city ? `Main Commercial Market, ${singleStore.city}` : "Pakistan");

        await createShop(
          {
            name: singleStore.name.trim(),
            ownerName: user?.name || "Store Owner",
            currency: singleStore.currency,
            phone: singleStore.phone.trim() || "0300-1234567",
            address: finalAddress,
            city: singleStore.city.trim(),
            lowStockThreshold: Number(singleStore.lowStockThreshold) || 8,
            leadTimeDays: Number(singleStore.leadTimeDays) || 2,
          },
          singleStore.template
        );
      } else {
        // Multi-store submission
        for (const b of branches) {
          if (!b.name.trim()) {
            setErrorMsg("Every branch must have a valid name.");
            setIsSubmitting(false);
            return;
          }
        }

        const multiPayload = branches.map((b) => ({
          shopData: {
            name: b.name.trim(),
            ownerName: user?.name || "Store Owner",
            currency: b.currency,
            phone: b.phone.trim() || "0300-1234567",
            address: b.address.trim() || `Commercial Market, ${b.city}`,
            city: b.city.trim(),
            lowStockThreshold: Number(b.lowStockThreshold) || 8,
            leadTimeDays: Number(b.leadTimeDays) || 2,
          },
          template: b.template
        }));

        await createMultipleShops(multiPayload);
      }

      // Navigate to dashboard upon completion
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register store. Please try again.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-10 px-3 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-100 text-start">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Top Stepper Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-amber-300 text-xs font-black">
              2
            </span>
            <span className="text-xs font-bold text-slate-700">
              Step 2 of 2: Store Registration & Setup
            </span>
          </div>

          {user && (
            <span className="text-xs text-slate-500 font-medium">
              Registered Owner: <strong className="text-slate-800">{user.name}</strong> ({user.email})
            </span>
          )}
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-900 shadow-sm">
            {errorMsg}
          </div>
        )}

        {/* Main Card (Matches form.PNG) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl space-y-8">
          
          {/* Header */}
          <div className="pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Store className="h-7 w-7 text-emerald-800" />
                <span>Register Your Store</span>
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Setup your store location, inventory thresholds, and catalog pack.
              </p>
            </div>

            {/* Multi-Store Opt-In Toggle */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 px-3 self-start sm:self-auto">
              <label htmlFor="multi-toggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                I manage multiple branches / stores
              </label>
              <input
                id="multi-toggle"
                type="checkbox"
                checked={hasMultipleStores}
                onChange={(e) => setHasMultipleStores(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-800 focus:ring-emerald-700 cursor-pointer"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* CASE 1: Standard Single Store Form (Exactly matches form.PNG) */}
            {!hasMultipleStores ? (
              <div className="space-y-6">
                {/* Store Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Store or Branch Name <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Store className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={singleStore.name}
                      onChange={(e) => setSingleStore({ ...singleStore, name: e.target.value })}
                      placeholder="e.g. Al-Madina Express (G-11 Markaz Branch)"
                      className="w-full rounded-2xl border border-slate-200 ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* City / Region with Quick selection chips (from form.PNG) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      City / Region <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">Quick selection</span>
                  </div>

                  {/* Quick selection chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {POPULAR_CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSingleStore({ ...singleStore, city: c })}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          singleStore.city === c
                            ? "bg-emerald-800 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <MapPin className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={singleStore.city}
                      onChange={(e) => setSingleStore({ ...singleStore, city: e.target.value })}
                      placeholder="City or Town"
                      className="w-full rounded-2xl border border-slate-200 ps-10 pe-4 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Full Street Address / Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={singleStore.address}
                      onChange={(e) => setSingleStore({ ...singleStore, address: e.target.value })}
                      placeholder="e.g. Shop #14, Main Commercial Market, Sector G-11/2"
                      className="w-full rounded-2xl border border-slate-200 ps-10 pe-4 py-3 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Phone & Currency (from form.PNG) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Branch Phone / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={singleStore.phone}
                        onChange={(e) => setSingleStore({ ...singleStore, phone: e.target.value })}
                        placeholder="0300-1234567"
                        className="w-full rounded-2xl border border-slate-200 ps-10 pe-4 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Store Currency
                    </label>
                    <select
                      value={singleStore.currency}
                      onChange={(e) => setSingleStore({ ...singleStore, currency: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden bg-white"
                    >
                      <option value="PKR">PKR (Pakistani Rupee – Rs)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                {/* Low Stock & Reorder Lead Time (from form.PNG) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Low Stock Threshold (Units)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={singleStore.lowStockThreshold}
                      onChange={(e) => setSingleStore({ ...singleStore, lowStockThreshold: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
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
                      value={singleStore.leadTimeDays}
                      onChange={(e) => setSingleStore({ ...singleStore, leadTimeDays: Number(e.target.value) })}
                      className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Days supplier takes to deliver restocking orders
                    </span>
                  </div>
                </div>

                {/* Starter Inventory Catalog Options (from form.PNG) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    Starter Inventory Catalog
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Kiryana Pack Option */}
                    <div
                      onClick={() => setSingleStore({ ...singleStore, template: "grocery" })}
                      className={`relative rounded-3xl border-2 p-5 cursor-pointer transition-all flex flex-col justify-between ${
                        singleStore.template === "grocery"
                          ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        {singleStore.template === "grocery" && (
                          <div className="h-6 w-6 rounded-full bg-emerald-800 text-white flex items-center justify-center">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">Kiryana Pack</h4>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          Pre-loaded with 60 staple grocery items (Tea, Cooking Oil, Flour, Sugar, Spices, Dairy) with realistic cost & sell margins.
                        </p>
                      </div>
                    </div>

                    {/* Empty Catalog Option */}
                    <div
                      onClick={() => setSingleStore({ ...singleStore, template: "empty" })}
                      className={`relative rounded-3xl border-2 p-5 cursor-pointer transition-all flex flex-col justify-between ${
                        singleStore.template === "empty"
                          ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                          <Boxes className="h-5 w-5" />
                        </div>
                        {singleStore.template === "empty" && (
                          <div className="h-6 w-6 rounded-full bg-emerald-800 text-white flex items-center justify-center">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">Empty Catalog</h4>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          Fresh clean catalog with 0 products. Add your products manually, scan supplier paper slips, or import custom CSV.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* CASE 2: Multi-Branch Mode with separate info for each store */
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Configuring {branches.length} Store Locations
                    </h3>
                    <p className="text-xs text-slate-500">
                      Supply distinct branch names, locations, and contact numbers for each shop.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addBranch}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-200 font-bold px-3.5 py-2 text-xs shadow-xs transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Another Branch</span>
                  </button>
                </div>

                {branches.map((b, idx) => (
                  <div
                    key={b.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 space-y-4 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs px-3 py-1">
                        <Building2 className="h-3.5 w-3.5 text-emerald-800" />
                        <span>Branch #{idx + 1}</span>
                      </span>

                      {branches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBranch(b.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors"
                          title="Remove branch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Branch Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={b.name}
                          onChange={(e) => updateBranchField(b.id, "name", e.target.value)}
                          placeholder="e.g. Al-Madina Express (G-11 Markaz)"
                          className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          City / Region *
                        </label>
                        <select
                          value={b.city}
                          onChange={(e) => updateBranchField(b.id, "city", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-emerald-600 focus:outline-hidden"
                        >
                          {POPULAR_CITIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Full Street Address
                        </label>
                        <input
                          type="text"
                          value={b.address}
                          onChange={(e) => updateBranchField(b.id, "address", e.target.value)}
                          placeholder="Shop #, Commercial Market, Sector"
                          className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Branch Phone
                        </label>
                        <input
                          type="text"
                          value={b.phone}
                          onChange={(e) => updateBranchField(b.id, "phone", e.target.value)}
                          placeholder="0300-1234567"
                          className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Starter Catalog
                        </label>
                        <select
                          value={b.template}
                          onChange={(e) => updateBranchField(b.id, "template", e.target.value as "grocery" | "empty")}
                          className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-emerald-600 focus:outline-hidden"
                        >
                          <option value="grocery">Kiryana Pack (60 FMCG Items)</option>
                          <option value="empty">Empty Catalog (0 Items)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Submission Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                You can easily add and manage branches later in Settings.
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-amber-200 font-extrabold px-8 py-3.5 text-xs sm:text-sm shadow-md transition-all min-h-[48px] disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? "Launching Store..." : "Complete Setup & Launch Dashboard"}</span>
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
