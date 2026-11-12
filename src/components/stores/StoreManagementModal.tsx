import React from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { 
  X, 
  Store, 
  MapPin, 
  Phone, 
  Plus, 
  Check, 
  ExternalLink,
  Trash2,
  Building,
  Layers
} from "lucide-react";

export const StoreManagementModal: React.FC = () => {
  const { t } = useTranslation();
  const { 
    shop, 
    shops, 
    switchShop, 
    deleteShop,
    isStoreManagementModalOpen, 
    setIsStoreManagementModalOpen,
    setIsAddStoreModalOpen 
  } = useApp();

  if (!isStoreManagementModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200 my-8 text-start"
        role="dialog"
      >
        {/* Close Button */}
        <button
          onClick={() => setIsStoreManagementModalOpen(false)}
          className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
          title="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start justify-between pe-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-amber-300 shadow-sm">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                  Multi-Store Branch Manager
                </h3>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                  {shops.length} {shops.length === 1 ? "Store" : "Stores"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Centralized control of all neighbourhood branches under your Tallyn business license.
              </p>
            </div>
          </div>
        </div>

        {/* Store List */}
        <div className="mt-5 space-y-3 max-h-[50vh] overflow-y-auto pe-1">
          {shops.map((s) => {
            const isActive = s.id === shop.id;
            return (
              <div
                key={s.id}
                className={`rounded-2xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? "border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900">{s.name}</h4>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-800 text-white text-[10px] font-bold px-2 py-0.5">
                        <Check className="h-2.5 w-2.5 stroke-[3]" /> Active Counter
                      </span>
                    )}
                    {s.city && (
                      <span className="rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5">
                        {s.city}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>{s.address}</span>
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span>Phone: {s.phone}</span>
                    <span>•</span>
                    <span>Currency: {s.currency}</span>
                    <span>•</span>
                    <span>Alert at &lt; {s.lowStockThreshold} units</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  {!isActive ? (
                    <button
                      onClick={() => {
                        switchShop(s.id);
                        setIsStoreManagementModalOpen(false);
                      }}
                      className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 transition-colors min-h-[36px]"
                    >
                      Switch Here
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-800 px-3 py-1.5 bg-emerald-100 rounded-xl">
                      Current Store
                    </span>
                  )}

                  {shops.length > 1 && !isActive && (
                    <button
                      onClick={() => deleteShop(s.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove store branch"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Need to open another neighborhood location or warehouse?
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setIsStoreManagementModalOpen(false);
                setIsAddStoreModalOpen(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add New Store / Branch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};