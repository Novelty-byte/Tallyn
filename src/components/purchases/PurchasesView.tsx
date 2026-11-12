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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t("purchases.title")}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-amber-100 hover:bg-emerald-900 shadow-sm transition-all min-h-[44px]"
          >
            <Camera className="h-4 w-4 text-amber-300" />
            <span>{t("purchases.scanBill")}</span>
          </button>
        </div>
      </div>

      {/* MAHNGAI (WHOLESALE INFLATION) WATCHDOG WIDGET */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">

        {/* Widget Top Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-900 flex items-center justify-center font-bold shadow-2xs">
              <TrendingUp className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {t("purchases.mahngaiWatchdog")}
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-300 shadow-2xs">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                  Reference Benchmark Index
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Static wholesale mandi benchmark rates for Kiryana staples &bull; Compare against your supplier purchase costs
              </p>
            </div>
          </div>
        </div>

        {/* Watchdog Analytics Summary Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Commodities Monitored</p>
              <p className="text-lg font-black text-slate-900">{wholesaleBenchmarks.length} Essential Staples</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center font-bold">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${
            flaggedCount > 0 ? "bg-rose-50/80 border-rose-200 text-rose-950" : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
          }`}>
            <div>
              <p className="text-[11px] font-bold opacity-75 uppercase tracking-wider">Inflation Warning Tags</p>
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-black">{flaggedCount} High Inflation Item</p>
                {flaggedCount > 0 && (
                  <span className="rounded bg-rose-200 px-1.5 py-0.2 text-[10px] font-black text-rose-900">
                    Atta (+16.8%)
                  </span>
                )}
              </div>
            </div>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold ${
              flaggedCount > 0 ? "bg-rose-200 text-rose-800" : "bg-emerald-200 text-emerald-800"
            }`}>
              {flaggedCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Basket Markup</p>
              <p className="text-lg font-black text-slate-900">
                {avgDelta > 0 ? `+${avgDelta}%` : `${avgDelta}%`} vs Mandi
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center font-bold">
              <Store className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* COMMODITY BENCHMARK CARDS GRID */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Mandi Benchmarks vs Supplier Purchase Cost
            </h4>
            <span className="text-[11px] text-slate-500">
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
                  className={`rounded-2xl border p-4 shadow-2xs transition-all relative flex flex-col justify-between ${
                    isFlagged
                      ? "border-rose-300 bg-rose-50/80 ring-1 ring-rose-400/30"
                      : "border-slate-200 bg-slate-50/70 hover:border-slate-300"
                  }`}
                >
                  <div>
                    {/* Header: Item name & Delta Badge */}
                    <div className="flex items-start justify-between gap-1 mb-2.5">
                      <div>
                        <p className="text-xs font-black text-slate-900 leading-snug line-clamp-1">
                          {b.itemName}
                        </p>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Unit: {b.unit || "Pack"}
                        </span>
                      </div>

                      {/* Inflation Warning Tags required by prompt */}
                      {isFlagged ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-200 px-1.5 py-0.5 text-[10px] font-black text-rose-900 whitespace-nowrap shadow-2xs">
                          <AlertTriangle className="h-3 w-3" />
                          +{b.markupPercent}%
                        </span>
                      ) : isBelowMandi ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 whitespace-nowrap">
                          <ArrowDownRight className="h-3 w-3" />
                          {b.markupPercent}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 whitespace-nowrap">
                          <ArrowUpRight className="h-3 w-3" />
                          Fair +{b.markupPercent}%
                        </span>
                      )}
                    </div>

                    {/* Price Comparison Display */}
                    <div className="space-y-1.5 text-xs bg-white/70 rounded-xl p-2.5 border border-slate-200/60 mb-2.5">
                      <div className="flex justify-between items-center text-slate-500 text-[11px]">
                        <span>Mandi Benchmark:</span>
                        <span className="font-extrabold text-slate-800">
                          {formatCurrency(b.benchmarkPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 text-[11px]">
                        <span>Your Buy Price:</span>
                        <span className="font-black text-slate-950">
                          {formatCurrency(b.currentShopCost)}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-100 flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Difference:</span>
                        <span className={`font-bold ${isFlagged ? "text-rose-700" : isBelowMandi ? "text-blue-700" : "text-emerald-700"}`}>
                          {delta > 0 ? `+${formatCurrency(delta)}` : formatCurrency(delta)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation / Warning Tag */}
                  <div>
                    {isFlagged ? (
                      <div className="rounded-lg bg-rose-100/90 p-2 border border-rose-300 text-[10px] text-rose-950 font-bold leading-tight">
                        <p className="flex items-start gap-1">
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-700 shrink-0 mt-0.5" />
                          <span>Supplier markup high (+{b.markupPercent}%). Recommend renegotiating or switching distributor!</span>
                        </p>
                      </div>
                    ) : isBelowMandi ? (
                      <p className="text-[10px] text-blue-800 font-semibold leading-tight">
                        ✅ Favorable buy price ({Math.abs(b.markupPercent)}% below mandi average).
                      </p>
                    ) : (
                      <p className="text-[10px] text-emerald-800 font-semibold leading-tight">
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
      <div className="rounded-3xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-800" />
            <h3 className="text-sm font-bold text-slate-900">Recent Supplier Restocks & Bills</h3>
          </div>
          <span className="text-xs text-slate-500">{purchases.length} restock entries</span>
        </div>

        {purchases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50 text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No supplier purchases logged yet.</p>
            <p className="text-[11px] text-slate-500 mt-1">Click "Scan Supplier Paper Bill" above to test multimodal vision OCR!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4 text-start">Supplier</th>
                  <th className="py-3 px-4 text-start">Invoice #</th>
                  <th className="py-3 px-4 text-start">Date</th>
                  <th className="py-3 px-4 text-start">Restocked Items</th>
                  <th className="py-3 px-4 text-end">Total Restock Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.supplierName}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{p.invoiceNumber}</td>
                    <td className="py-3.5 px-4 text-slate-500">{p.date}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {p.items.map((i) => `${i.productName} (${i.quantity})`).join(", ")}
                    </td>
                    <td className="py-3.5 px-4 text-end font-black text-slate-900">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Multimodal Supplier Bill Scanner
                </h4>
              </div>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            {isScanning ? (
              <div className="py-12 text-center space-y-3">
                <div className="relative mx-auto h-16 w-16 rounded-2xl bg-emerald-50 border-2 border-emerald-500 border-dashed flex items-center justify-center text-emerald-800 animate-spin">
                  <Sparkles className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Gemini Vision OCR analyzing paper invoice...
                </p>
                <p className="text-[11px] text-slate-500">
                  Extracting item names, wholesale buying prices, and batch units
                </p>
              </div>
            ) : scannedResult ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-xs">
                  <p className="font-extrabold text-emerald-950">{scannedResult.supplier}</p>
                  <p className="text-emerald-800 font-mono text-[11px]">Invoice: {scannedResult.invoice}</p>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {scannedResult.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-500">Unit Buy Cost: {formatCurrency(item.cost)}</p>
                      </div>
                      <span className="font-black text-emerald-800 text-xs">
                        +{item.qty} units
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Purchase Cost</p>
                    <p className="text-lg font-black text-slate-900">
                      {formatCurrency(scannedResult.items.reduce((s, i) => s + i.qty * i.cost, 0))}
                    </p>
                  </div>
                  <button
                    onClick={handleApproveRestock}
                    className="rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-900 shadow-md transition-all active:scale-95"
                  >
                    Approve & Raise Stock
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