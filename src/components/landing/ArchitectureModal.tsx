import React, { useEffect } from "react";
import { 
  X, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Smartphone, 
  Layers, 
  Scale, 
  FileCheck,
  Server,
  Zap,
  Check
} from "lucide-react";

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Technical Architecture & Security Model</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                  Zero Hallucination
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                4-Tier Hybrid Stack & Strict Deterministic Guarantees for Financial Integrity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Architecture Modal"
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 divide-y divide-slate-800/60">
          {/* Section 1: The 4-Tier Architectural Stack */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 font-mono">
                The 4-Tier Production Architecture
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Designed to operate reliably on low-bandwidth 3G mobile networks at neighbourhood retail counters while scaling to multi-branch chains.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Tier 1 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Smartphone className="h-4 w-4" />
                    <span>Tier 1: Client & Counter Edge</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    390px Viewport
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">Single-Handed Mobile Touch & Voice</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  React 19 & Tailwind v4 with full logical RTL mirroring. Native Web Speech API and Web Audio synthesizer for zero-latency audio confirmation without cloud roundtrips.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Offline Local Storage</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">10s Undo Window</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">RTL Logic</span>
                </div>
              </div>

              {/* Tier 2 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Cpu className="h-4 w-4" />
                    <span>Tier 2: Deterministic Core</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Strict Code Math
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">Arithmetic & Invariant Engine</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every subtotal, profit margin, tax deduction, and inventory decrement is executed in pure TypeScript algorithms. AI models are strictly forbidden from performing financial arithmetic.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Zero AI Math</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">FIFO Costing</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Exact Decimals</span>
                </div>
              </div>

              {/* Tier 3 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <Database className="h-4 w-4" />
                    <span>Tier 3: Multi-Tenant Data Layer</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Supabase Postgres
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">PostgreSQL RLS & Atomic RPCs</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Postgres Row-Level Security ensures complete data isolation across shop owners and branch locations. Counter sales update inventory atomically with <code className="text-amber-300">FOR UPDATE</code> row locks.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Shop-Level RLS</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">ACID Transactions</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Multi-Store Sync</span>
                </div>
              </div>

              {/* Tier 4 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <Sparkles className="h-4 w-4" />
                    <span>Tier 4: Multimodal Gemini AI Gateway</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Structured Extraction
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">Gemini 3.7 Vision, Voice & Language</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Powers multimodal paper bill OCR, conversational Urdu voice parsing, and culturally respectful Urdu WhatsApp reminders. Responses enforce strict JSON schemas before ingestion.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Structured JSON Schema</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Roman Urdu NLP</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Paper Bill OCR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: The 5 Inviolable Rules */}
          <div className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 font-mono">
                The 5 Inviolable Commercial Guarantees
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Architectural rules codified into the codebase to protect neighbourhood merchants from data loss, math drift, and counter bottlenecks.
            </p>

            <div className="space-y-3">
              {[
                {
                  id: "01",
                  title: "Zero Hallucinated Numbers",
                  desc: "AI never computes sales totals, profit margins, stock quantities, or ledger balances. Numbers are computed exclusively in verified TypeScript algorithms and Postgres RPC procedures.",
                  badge: "Financial Security"
                },
                {
                  id: "02",
                  title: "Atomic Data Mutations",
                  desc: "Stock decrements, credit customer ledger entries, and transaction records execute inside single atomic database transactions. Partial failures rollback completely.",
                  badge: "ACID Guaranteed"
                },
                {
                  id: "03",
                  title: "Multi-Tenant Row-Level Security (RLS) per Shop",
                  desc: "Every database query is strictly scoped to the authenticated user's shop_id or branch_id. No store can ever read, update, or leak another store's inventory, debt, or sales data.",
                  badge: "Zero Cross-Tenant Leakage"
                },
                {
                  id: "04",
                  title: "Bilingual & RTL from Day 1",
                  desc: "Urdu (اردو) is a first-class citizen. CSS logical properties mirror touch targets, sliders, modals, and tables seamlessly with zero clipping on compact mobile screens.",
                  badge: "Cultural Native"
                },
                {
                  id: "05",
                  title: "Fail-Open Graceful Degradation",
                  desc: "If network drops or cloud AI endpoints fail, manual counter checkout, barcode scanning, offline sales logging, and cash transactions continue running with zero downtime.",
                  badge: "100% Offline Resilience"
                }
              ].map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-slate-800/90 bg-slate-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-sm font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg shrink-0 mt-0.5">
                      {rule.id}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <span>{rule.title}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {rule.desc}
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-center text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {rule.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Data Flow Pipeline */}
          <div className="pt-6 space-y-3">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300 font-mono">
              Counter POS Transaction Flow
            </h3>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span>1. Merchant Speaks: "2 chai, 1 ghee udhaar Asif" or taps barcode item</span>
              </div>
              <div className="flex items-center gap-2 text-sky-400 pl-4 border-l border-slate-800">
                <Check className="h-3.5 w-3.5" />
                <span>2. Client Edge parses voice / barcode payload → Deterministic cart math calculates exact totals</span>
              </div>
              <div className="flex items-center gap-2 text-amber-400 pl-4 border-l border-slate-800">
                <Check className="h-3.5 w-3.5" />
                <span>3. 10-Second Undo buffer opens; audio synthesizer plays register chime</span>
              </div>
              <div className="flex items-center gap-2 text-purple-400 pl-4 border-l border-slate-800">
                <Check className="h-3.5 w-3.5" />
                <span>4. Atomic RPC decrements stock in PostgreSQL & updates customer udhaar ledger under shop RLS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Engineered for high-volume neighbourhood grocery resilience.
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 text-xs transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
