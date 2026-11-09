import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { Customer } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  CheckCircle2, 
  Search, 
  Plus, 
  ExternalLink 
} from "lucide-react";

export const UdhaarView: React.FC = () => {
  const { t } = useTranslation();
  const { customers, recordCreditPayment, addCustomer } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustPayment, setSelectedCustPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(500);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const totalOutstanding = customers.reduce((sum, c) => sum + c.creditBalance, 0);
  const overdueCount = customers.filter((c) => (c.overdueDays || 0) > 7 && c.creditBalance > 0).length;

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustPayment || paymentAmount <= 0) return;
    recordCreditPayment(selectedCustPayment.id, paymentAmount);
    setSelectedCustPayment(null);
    setPaymentAmount(500);
  };

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCustomer({
      name,
      phone: phone || "0300-1234567",
      creditLimit: 10000,
    });
    setName("");
    setPhone("");
    setIsAddCustomerOpen(false);
  };

  // 1-Click WhatsApp Reminder with culturally polite Urdu text
  const sendWhatsAppReminder = (c: Customer) => {
    const urduMessage = `محترم جناب ${c.name} صاحب، السلام علیکم۔ المدینہ کریانہ اسٹور کی طرف سے آپ کے کھاتے کی کل باقی رقم ${formatCurrency(c.creditBalance)} واجب الادا ہے۔ سہولت کے مطابق تشریف لا کر حساب کلیئر فرما دیجئے۔ شکریہ۔`;
    const encoded = encodeURIComponent(urduMessage);
    const cleanPhone = c.phone.replace(/[^0-9]/g, "");
    const waUrl = `https://wa.me/92${cleanPhone.slice(-10)}?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("udhaar.title")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("udhaar.subtitle")}
          </p>
        </div>

        <button
          onClick={() => setIsAddCustomerOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-amber-100 hover:bg-emerald-900 shadow-sm transition-all self-start sm:self-auto min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span>New Customer Account</span>
        </button>
      </div>

      {/* Credit Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-amber-900">
            {t("udhaar.totalReceivable")}
          </p>
          <p className="text-2xl font-black text-amber-950 mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-xs text-amber-800 mt-1">Across all neighbourhood credit accounts</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">
            {t("udhaar.activeAccounts")}
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {customers.length} Customers
          </p>
          <p className="text-xs text-slate-500 mt-1">Verified phone numbers linked</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-rose-900">
            {t("udhaar.overdueAccounts")}
          </p>
          <p className="text-2xl font-black text-rose-950 mt-1">
            {overdueCount} Accounts
          </p>
          <p className="text-xs text-rose-800 mt-1">Pending payment for more than 7 days</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customer by name or phone..."
          className="w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden min-h-[40px]"
        />
      </div>

      {/* Customers Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 text-start">{t("udhaar.customerName")}</th>
                <th className="py-3 px-4 text-start">{t("udhaar.phone")}</th>
                <th className="py-3 px-4 text-end">{t("udhaar.balance")}</th>
                <th className="py-3 px-4 text-center">{t("udhaar.overdueDays")}</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const isOverdue = (c.overdueDays || 0) > 7;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {c.phone}
                    </td>
                    <td className="py-3.5 px-4 text-end">
                      <span className={`font-black ${c.creditBalance > 0 ? "text-amber-900" : "text-emerald-700"}`}>
                        {formatCurrency(c.creditBalance)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {c.creditBalance > 0 ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isOverdue ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
                          {c.overdueDays || 0} days
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Clear
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {c.creditBalance > 0 && (
                          <>
                            <button
                              onClick={() => setSelectedCustPayment(c)}
                              className="rounded-lg bg-emerald-800 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-900 transition-colors"
                            >
                              {t("udhaar.recordPayment")}
                            </button>
                            <button
                              onClick={() => sendWhatsAppReminder(c)}
                              className="rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                              title="Send respectful Urdu WhatsApp reminder"
                            >
                              <MessageSquare className="h-3 w-3 text-emerald-700" />
                              <span>WhatsApp</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedCustPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 mb-1">{t("udhaar.recordPayment")}</h4>
            <p className="text-xs text-slate-500 mb-3">
              {selectedCustPayment.name} (Current debt: {formatCurrency(selectedCustPayment.creditBalance)})
            </p>
            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (PKR)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedCustPayment.creditBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustPayment(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 mb-3">Add Customer Account</h4>
            <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Asif Bhai"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
