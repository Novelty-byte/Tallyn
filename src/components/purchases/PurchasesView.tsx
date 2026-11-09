import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { 
  FileText, 
  Camera, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Check, 
  Upload,
  ArrowRight
} from "lucide-react";

export const PurchasesView: React.FC = () => {
  const { t } = useTranslation();
  const { purchases, wholesaleBenchmarks, products, recordSupplierPurchase } = useApp();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<{
    supplier: string;
    invoice: string;
    items: { productId: string; name: string; qty: number; cost: number }[];
  } | null>(null);

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
        ],
      });
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

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("purchases.title")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("purchases.subtitle")}
          </p>
        </div>

        <button
          onClick={() => {
            setIsScannerOpen(true);
            simulateScanBill();
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-amber-100 hover:bg-emerald-900 shadow-sm transition-all self-start sm:self-auto min-h-[44px]"
        >
          <Camera className="h-4 w-4 text-amber-300" />
          <span>{t("purchases.scanBill")}</span>
        </button>
      </div>

      {/* Mahngai Watchdog Section (Wholesale Market Scraper) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t("purchases.mahngaiWatchdog")}
              </h3>
              <p className="text-xs text-slate-500">
                Autonomous wholesale price monitor comparing against live market rates
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200/60 self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            Market Scraper Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {wholesaleBenchmarks.map((b, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-4 shadow-2xs ${
                b.isInflationFlagged
                  ? "border-rose-300 bg-rose-50/70"
                  : "border-slate-200 bg-slate-50/60"
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <p className="text-xs font-bold text-slate-900 line-clamp-1">{b.itemName}</p>
                {b.isInflationFlagged ? (
                  <span className="flex items-center gap-1 rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-900">
                    <AlertTriangle className="h-3 w-3" /> +{b.markupPercent}%
                  </span>
                ) : (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    Fair +{b.markupPercent}%
                  </span>
                )}
              </div>

              <div className="text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Market Avg:</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(b.benchmarkPrice)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Your Buy Price:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(b.currentShopCost)}</span>
                </div>
              </div>

              {b.isInflationFlagged && (
                <p className="mt-2 text-[10px] text-rose-800 font-semibold leading-tight">
                  ⚠️ Supplier markup is high. Recommend negotiating or switching vendor.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Supplier Purchases History Ledger */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Recent Supplier Restocks</h3>
          <span className="text-xs text-slate-500">{purchases.length} restock entries</span>
        </div>

        {purchases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No supplier purchases logged yet.</p>
            <p className="text-[11px] mt-1">Click "Scan Supplier Paper Bill" above to test multimodal vision OCR!</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
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
                  Extracting line items, purchase costs, and supplier info
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
                    className="rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-900 shadow-md"
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
