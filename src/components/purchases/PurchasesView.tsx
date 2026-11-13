import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { audio } from "@/lib/audio";
import {
  FileText,
  Camera,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Cpu,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Store,
  CheckCircle2
} from "lucide-react";

export const PurchasesView: React.FC = () => {
  const { t } = useTranslation();
  const {
    purchases,
    wholesaleBenchmarks,
    recordSupplierPurchase,
  } = useApp();

  // Paper Bill Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<{
    supplier: string;
    invoice: string;
    items: { productId: string; name: string; qty: number; cost: number }[];
  } | null>(null);

  // Multimodal Paper Bill Scanner Simulation
  const simulateScanBill = () => {
    setIsScanning(true);
    setScannedResult(null);

    setTimeout(() => {
      setIsScanning(false);
      setScannedResult({
        supplier: "Metro Wholesale Cash & Carry Islamabad",
        invoice: "MW-2026-9812",
        items: [
          { productId: "p1", name: "Tapal Danedar Tea 450g", qty: 12, cost: 580 },
          { productId: "p2", name: "Dalda Cooking Oil 1L", qty: 16, cost: 490 },
          { productId: "p3", name: "White Sugar (Cheeni) 1kg", qty: 50, cost: 142 },
          { productId: "p4", name: "Fine Wheat Flour / Atta 10kg", qty: 25, cost: 1425 },
        ],
      });
      audio.playBarcodeBeep();
    }, 1800);
  };

  const handleApproveRestock = () => {
    if (!scannedResult) return;

    const totalAmount = scannedResult.items.reduce((sum, item) => sum + item.qty * item.cost, 0);

    recordSupplierPurchase({
      supplierName: scannedResult.supplier,
      invoiceNumber: scannedResult.invoice,
      totalAmount,
      items: scannedResult.items.map((i) => ({
        productId: i.productId,
        productName: i.name,
        quantity: i.qty,
        unitCost: i.cost,
      })),
    });

    setIsScannerOpen(false);
    setScannedResult(null);
  };

  // Compute inflation statistics
  const flaggedCount = wholesaleBenchmarks.filter((b) => b.isInflationFlagged).length;
  const avgDelta = wholesaleBenchmarks.length > 0
    ? Number((wholesaleBenchmarks.reduce((acc, b) => acc + b.markupPercent, 0) / wholesaleBenchmarks.length).toFixed(1))
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              {t("purchases.title")}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <Cpu className="h-3 w-3 text-emerald-600" />
              Autonomous Watchdog Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t("purchases.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setIsScannerOpen(true);
              simulateScanBill();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 shadow-soft transition-all min-h-[44px]"
          >
            <Camera className="h-4 w-4 text-amber-300" />
            <span>Scan Supplier Paper Bill</span>
          </button>
        </div>
      </div>

      {/* MAHNGAI (WHOLESALE INFLATION) WATCHDOG WIDGET */}
      <div className="surface-l1 p-6 space-y-6">

        {/* Widget Top Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center font-bold shadow-2xs">
              <TrendingUp className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                  {t("purchases.mahngaiWatchdog")}
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-300 shadow-2xs">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                  Reference Benchmark Index
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Static wholesale mandi benchmark rates for Kiryana staples • Compare against your supplier purchase costs
              </p>
            </div>
          </div>
        </div>

        {/* Watchdog Analytics Summary Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commodities Monitored</p>
              <p className="text-lg font-semibold text-slate-900">{wholesaleBenchmarks.length} Essential Staples</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center font-bold">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div className={`rounded-xl border p-3.5 flex items-center justify-between ${
            flaggedCount > 0 ? "bg-rose-50/80 border-rose-200 text-rose-950" : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
          }`}>
            <div>
              <p className="text-xs font-semibold opacity-75 uppercase tracking-wider">Inflation Warning Tags</p>
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-semibold">{flaggedCount} High Inflation Item</p>
                {flaggedCount > 0 && (
                  <span className="rounded bg-rose-200 px-1.5 py-0.5 text-xs font-bold text-rose-900">
                    Atta (+16.8%)
                  </span>
                )}
              </div>
            </div>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold ${
              flaggedCount > 0 ? "bg-rose-200 text-rose-800" : "bg-emerald-200 text-emerald-800"
            }`}>
              {flaggedCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Basket Markup</p>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {avgDelta > 0 ? `+${avgDelta}%` : `${avgDelta}%`} vs Mandi
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center font-bold">
              <Store className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* COMMODITY BENCHMARK CARDS GRID */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mandi Benchmarks vs Supplier Purchase Cost
            </h4>
            <span className="text-xs text-slate-500">
              Reference Corridor: <strong>Rawalpindi Ganj Mandi &amp; I-11 Islamabad</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {wholesaleBenchmarks.map((b, i) => {
              const delta = b.currentShopCost - b.benchmarkPrice;
              const isFlagged = b.isInflationFlagged;
              const isBelowMandi = b.markupPercent < 0;

              return (
                <div
                  key={b.id || i}
                  className={`group rounded-xl border p-3.5 shadow-2xs transition-all duration-200 relative flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg ${
                    isFlagged
                      ? "border-rose-300 bg-rose-50/80 ring-1 ring-rose-400/30 hover:ring-rose-400/60"
                      : "border-slate-200 bg-slate-50/70 hover:border-emerald-300 hover:ring-1 hover:ring-emerald-300/50"
                  }`}
                >
                  <div>
                    {/* Header: Item name & Delta Badge */}
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-1 group-hover:translate-x-0.5 transition-transform duration-200">
                          {b.itemName}
                        </p>
                        <span className="text-xs font-medium text-slate-500 uppercase">
                          Unit: {b.unit || "Pack"}
                        </span>
                      </div>

                      {/* Inflation Warning Tags */}
                      {isFlagged ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-200 px-1.5 py-0.5 text-xs font-bold text-rose-900 whitespace-nowrap shadow-2xs group-hover:scale-105 transition-transform">
                          <AlertTriangle className="h-3 w-3" />
                          +{b.markupPercent}%
                        </span>
                      ) : isBelowMandi ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 whitespace-nowrap group-hover:scale-105 transition-transform">
                          <ArrowDownRight className="h-3 w-3" />
                          {b.markupPercent}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 whitespace-nowrap group-hover:scale-105 transition-transform">
                          <ArrowUpRight className="h-3 w-3" />
                          Fair +{b.markupPercent}%
                        </span>
                      )}
                    </div>

                    {/* Price Comparison Display */}
                    <div className="space-y-1.5 text-xs bg-white/70 rounded-lg p-2.5 border border-slate-200/60 mb-2.5">
                      <div className="flex justify-between items-center text-slate-500 text-xs">
                        <span>Mandi Benchmark:</span>
                        <span className="font-semibold font-mono tabular-nums text-slate-800">
                          {formatCurrency(b.benchmarkPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 text-xs">
                        <span>Your Buy Price:</span>
                        <span className="font-bold font-mono tabular-nums text-slate-950">
                          {formatCurrency(b.currentShopCost)}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-slate-500">Difference:</span>
                        <span className={`font-mono tabular-nums font-semibold ${isFlagged ? "text-rose-700" : isBelowMandi ? "text-blue-700" : "text-emerald-700"}`}>
                          {delta > 0 ? `+${formatCurrency(delta)}` : formatCurrency(delta)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation / Warning Tag */}
                  <div>
                    {isFlagged ? (
                      <div className="rounded-lg bg-rose-100/90 p-2 border border-rose-300 text-xs text-rose-950 font-medium leading-tight">
                        <p className="flex items-start gap-1">
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-700 shrink-0 mt-0.5" />
                          <span>Supplier markup high (+{b.markupPercent}%). Recommend renegotiating or switching distributor!</span>
                        </p>
                      </div>
                    ) : isBelowMandi ? (
                      <p className="text-xs text-blue-800 font-medium leading-tight">
                        ✅ Favorable buy price ({Math.abs(b.markupPercent)}% below mandi average).
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-800 font-medium leading-tight">
                        Fair market spread (+{b.markupPercent}% freight & handling).
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Supplier Purchases History Ledger */}
      <div className="surface-l1 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-800" />
            <h3 className="text-sm font-semibold text-slate-900">Recent Supplier Restocks & Bills</h3>
          </div>
          <span className="text-xs text-slate-500">{purchases.length} restock entries</span>
        </div>

        {purchases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50 text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No supplier purchases logged yet.</p>
            <p className="text-xs text-slate-500 mt-1">Click "Scan Supplier Paper Bill" above to test multimodal vision OCR!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-l1">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-start">Supplier</th>
                  <th className="py-3 px-4 text-start">Invoice #</th>
                  <th className="py-3 px-4 text-start">Date</th>
                  <th className="py-3 px-4 text-start">Restocked Items</th>
                  <th className="py-3 px-4 text-end">Total Restock Cost</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{p.supplierName}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">{p.invoiceNumber}</td>
                    <td className="py-3.5 px-4 text-slate-500">{p.date}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {p.items.map((i) => `${i.productName} (${i.quantity})`).join(", ")}
                    </td>
                    <td className="py-3.5 px-4 text-end font-bold font-mono tabular-nums text-slate-900">
                      {formatCurrency(p.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Multimodal Bill Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
                <h4 className="text-base font-semibold text-slate-900">
                  Multimodal Supplier Bill Scanner
                </h4>
              </div>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold p-1"
                aria-label="Close Scanner"
              >
                Close
              </button>
            </div>

            {isScanning ? (
              <div className="py-8 text-center space-y-3">
                {/* Scanning viewport with animated laser line */}
                <div className="relative mx-auto h-40 w-full max-w-xs rounded-xl border-2 border-emerald-400/70 bg-slate-900 overflow-hidden shadow-inner">
                  {/* Corner brackets */}
                  <span className="absolute top-2 left-2 h-5 w-5 border-t-2 border-l-2 border-emerald-400 rounded-tl" aria-hidden="true" />
                  <span className="absolute top-2 right-2 h-5 w-5 border-t-2 border-r-2 border-emerald-400 rounded-tr" aria-hidden="true" />
                  <span className="absolute bottom-2 left-2 h-5 w-5 border-b-2 border-l-2 border-emerald-400 rounded-bl" aria-hidden="true" />
                  <span className="absolute bottom-2 right-2 h-5 w-5 border-b-2 border-r-2 border-emerald-400 rounded-br" aria-hidden="true" />
                  {/* Faux invoice lines */}
                  <div className="absolute inset-6 space-y-2 opacity-40">
                    <div className="h-2 w-3/4 rounded bg-slate-600" />
                    <div className="h-2 w-1/2 rounded bg-slate-700" />
                    <div className="h-2 w-5/6 rounded bg-slate-600" />
                    <div className="h-2 w-2/3 rounded bg-slate-700" />
                    <div className="h-2 w-3/4 rounded bg-slate-600" />
                  </div>
                  {/* Scanning laser line */}
                  <span
                    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_12px_2px_rgba(16,185,129,0.8)]"
                    style={{ animation: 'scan-line 1.6s ease-in-out infinite' }}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-emerald-800">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <p className="text-xs font-semibold">
                    Gemini Vision OCR analyzing paper invoice...
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Extracting item names, wholesale buying prices, and batch units
                </p>
              </div>
            ) : scannedResult ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-xs">
                  <p className="font-semibold text-emerald-950">{scannedResult.supplier}</p>
                  <p className="text-emerald-800 font-mono text-xs">Invoice: {scannedResult.invoice}</p>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {scannedResult.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs hover:bg-emerald-50 transition-colors"
                      style={{ animation: `tn-fade-in 300ms var(--ease-out) ${idx * 80}ms both` }}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">Unit Buy Cost: {formatCurrency(item.cost)}</p>
                      </div>
                      <span className="font-bold text-emerald-800 text-xs">
                        +{item.qty} units
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase font-medium text-slate-400">Total Purchase Cost</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                      {formatCurrency(scannedResult.items.reduce((s, i) => s + i.qty * i.cost, 0))}
                    </p>
                  </div>
                  <button
                    onClick={handleApproveRestock}
                    className="rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 shadow-soft transition-all active:scale-95 min-h-[44px]"
                  >
                    Approve &amp; Raise Stock
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};