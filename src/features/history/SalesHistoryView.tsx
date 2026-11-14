import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Sale } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { 
  Search, 
  Receipt, 
  CheckCircle2, 
  XCircle, 
  Download,
  X
} from "lucide-react";

export const SalesHistoryView: React.FC = () => {
  const { sales } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  const filteredSales = sales.filter((s) => {
    const matchesPayment = paymentFilter === "all" || s.paymentType === paymentFilter;
    const matchesSearch =
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPayment && matchesSearch;
  });

  const exportCSV = () => {
    const headers = ["Sale ID", "Date", "Payment Type", "Customer", "Total Amount (PKR)", "Status", "Items"];
    const rows = filteredSales.map((s) => [
      s.id,
      s.createdAt,
      s.paymentType,
      s.customerName || "Walk-in Cash Customer",
      s.totalAmount,
      s.status,
      `"${s.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tallyn_sales_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            Sales Ledger &amp; Receipts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Chronological log of counter sales with atomic transactional receipts and CSV export.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-soft self-start sm:self-auto min-h-[44px]"
        >
          <Download className="h-4 w-4 text-emerald-800" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sale ID, customer name, or item..."
            className="w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden min-h-[44px]"
          />
        </div>

        {/* Payment Type Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {[
            { id: "all", label: "All Sales" },
            { id: "cash", label: "Cash Sales" },
            { id: "credit", label: "Udhaar (Credit)" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setPaymentFilter(f.id)}
              className={`rounded-xl px-3.5 py-2 font-semibold transition-colors min-h-[44px] ${
                paymentFilter === f.id
                  ? "bg-emerald-800 text-white font-semibold"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <div className="surface-l1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-l1">
            <thead>
              <tr>
                <th className="py-3 px-4 text-start">Transaction ID</th>
                <th className="py-3 px-4 text-start">Date &amp; Time</th>
                <th className="py-3 px-4 text-start">Type</th>
                <th className="py-3 px-4 text-start">Customer / Counter</th>
                <th className="py-3 px-4 text-start">Items Count</th>
                <th className="py-3 px-4 text-end">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s, idx) => (
                <tr
                  key={s.id}
                  className="group hover:bg-emerald-50/50 transition-all duration-200 border-l-2 border-l-transparent hover:border-l-emerald-700"
                  style={{
                    animation: idx < 25 ? `tn-fade-in 300ms var(--ease-out) ${Math.min(idx * 50, 800)}ms both` : undefined
                  }}
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 group-hover:translate-x-1 transition-transform duration-200">
                    #{s.id.slice(-6)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-xs">
                    {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase transition-transform group-hover:scale-105 ${
                      s.paymentType === "cash"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}>
                      {s.paymentType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {s.customerName || "Walk-in Cash Customer"}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {s.items.reduce((sum, i) => sum + i.quantity, 0)} items
                  </td>
                  <td className="py-3.5 px-4 text-end font-bold font-mono tabular-nums text-slate-900 text-sm">
                    {formatCurrency(s.totalAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {s.status === "completed" ? (
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Settled
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold inline-flex items-center gap-1 text-xs">
                        <XCircle className="h-3.5 w-3.5" /> Undone
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => setSelectedReceipt(s)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-emerald-800 hover:text-white hover:border-emerald-800 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-1 mx-auto min-h-[36px]"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Itemized Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-700/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lift border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <h4 className="text-base font-semibold text-slate-900">
                  Receipt #{selectedReceipt.id.slice(-6)}
                </h4>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Close Receipt"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-semibold">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Type:</span>
                  <span className="font-semibold uppercase text-emerald-800">{selectedReceipt.paymentType}</span>
                </div>
                {selectedReceipt.customerName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Debtor:</span>
                    <span className="font-semibold">{selectedReceipt.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="space-y-1.5 border-t border-b border-slate-100 py-3">
                {selectedReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="font-medium text-slate-800">
                      {item.productName} <span className="text-slate-400">×{item.quantity}</span>
                    </span>
                    <span className="font-semibold font-mono tabular-nums text-slate-900">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
                <span>Total Due:</span>
                <span className="font-mono tabular-nums">{formatCurrency(selectedReceipt.totalAmount)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="mt-6 w-full rounded-xl bg-graphite-700 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 min-h-[44px]"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
