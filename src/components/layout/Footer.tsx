import React from "react";
import { useApp } from "@/context/AppContext";
import { ShieldCheck, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  const { setActiveTab } = useApp();

  return (
    <footer className="border-t border-slate-200 bg-white py-12 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Tagline */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <img
              src="/tallyn-full-logo.png"
              alt="Tallyn"
              className="h-10 w-auto object-contain"
            />
            <p className="text-xs text-slate-500 max-w-sm text-center md:text-start">
              Zero-typing counter checkout, deterministic profit math, voice POS, and smart inventory for neighbourhood retail.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700">
            <button onClick={() => setActiveTab("landing")} className="hover:text-emerald-800 hover:-translate-y-0.5 transition-all duration-200">
              Overview
            </button>
            <button onClick={() => setActiveTab("pos")} className="hover:text-emerald-800 hover:-translate-y-0.5 transition-all duration-200">
              Counter POS
            </button>
            <button onClick={() => setActiveTab("dashboard")} className="hover:text-emerald-800 hover:-translate-y-0.5 transition-all duration-200">
              Dashboard
            </button>
            <button onClick={() => setActiveTab("inventory")} className="hover:text-emerald-800 hover:-translate-y-0.5 transition-all duration-200">
              Inventory
            </button>
            <button onClick={() => setActiveTab("udhaar")} className="hover:text-emerald-800 hover:-translate-y-0.5 transition-all duration-200">
              Udhaar Ledger
            </button>
            <button onClick={() => setActiveTab("purchases")} className="hover:text-emerald-800 hover:-translate-y-0.5 transition-all duration-200">
              Supplier Scanner
            </button>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            <span>Zero Hallucinated Numbers</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <p>© 2026 Tallyn (tallyn.xyz). Designed for neighbourhood retail counters.</p>
          <p className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
            <span>for Pakistani Kiryana retailers</span>
          </p>
        </div>
      </div>
    </footer>
  );
};