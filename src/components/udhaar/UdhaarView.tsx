import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { Customer } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { customerOverdueDays, daysUntilDue } from "@/lib/credit";
import {
  MessageSquare, 
  CheckCircle2, 
  Search, 
  Plus, 
  ExternalLink 
} from "lucide-react";

export const UdhaarView: React.FC = () => {
  const { t } = useTranslation();
  const { shop, customers, recordCreditPayment, addCustomer } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustPayment, setSelectedCustPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(500);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const totalOutstanding = customers.reduce((sum, c) => sum + Math.max(c.creditBalance, 0), 0);
  const overdueCount = customers.filter((c) => customerOverdueDays(c) > 0).length;
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const openPayment = (c: Customer) => {
    setSelectedCustPayment(c);
    setPaymentAmount(Math.min(500, c.creditBalance));
    setPaymentError(null);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustPayment) return;
    if (!(paymentAmount > 0)) {
      setPaymentError("Enter an amount greater than zero.");
      return;
    }
    if (paymentAmount > selectedCustPayment.creditBalance) {
      setPaymentError(`That is more than the ${formatCurrency(selectedCustPayment.creditBalance)} owed.`);
      return;
    }
    const ok = await recordCreditPayment(selectedCustPayment.id, paymentAmount);
    if (!ok) return; // reason already shown as a toast; keep the dialog open
    setSelectedCustPayment(null);
    setPaymentAmount(500);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const id = await addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      creditLimit: 10000,
    });
    if (!id) return;
    setName("");
    setPhone("");
    setIsAddCustomerOpen(false);
  };

  /** Plain-language due status for a customer row. */
  const dueStatus = (c: Customer): { text: string; tone: "overdue" | "soon" | "ok" } => {
    const overdue = customerOverdueDays(c);
    if (overdue > 0) return { text: `${overdue} day${overdue === 1 ? "" : "s"} overdue`, tone: "overdue" };
    if (!c.nextDueDate) return { text: "No due date", tone: "ok" };
    const until = daysUntilDue(c.nextDueDate);
    if (until === 0) return { text: "Due today", tone: "soon" };
    return { text: `Due in ${until} day${until === 1 ? "" : "s"}`, tone: until <= 2 ? "soon" : "ok" };
  };

  // 1-Click WhatsApp Reminder with culturally polite English text
  const sendWhatsAppReminder = (c: Customer) => {
    const overdue = customerOverdueDays(c);
    const dueLine = c.nextDueDate
      ? overdue > 0
        ? ` The payment was due on ${c.nextDueDate}.`
        : ` The payment is due on ${c.nextDueDate}.`
      : "";
    const englishMessage = `Dear ${c.name}, greetings. ${shop.name} would like to remind you that a total of ${formatCurrency(c.creditBalance)} is due on your account.${dueLine} Please clear your balance at your convenience. Thank you.`;
    const encoded = encodeURIComponent(englishMessage);
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
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            {t("udhaar.title")}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {t("udhaar.subtitle")}
          </p>
        </div>

        <button
          onClick={() => setIsAddCustomerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-medium text-white hover:bg-emerald-900 transition-colors self-start sm:self-auto min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span>New Customer Account</span>
        </button>
      </div>

      {/* Credit Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-l1 border-amber-300 p-4">
          <p className="text-xs font-medium uppercase text-amber-900">
            {t("udhaar.totalReceivable")}
          </p>
          <p className="text-2xl figure text-amber-950 mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-xs text-amber-800 mt-1">Across all neighbourhood credit accounts</p>
        </div>

        <div className="surface-l1 p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            {t("udhaar.activeAccounts")}
          </p>
          <p className="text-2xl figure text-slate-900 mt-1">
            {customers.length} Customers
          </p>
          <p className="text-xs text-slate-500 mt-1">Customer credit accounts in this shop</p>
        </div>

        <div className="surface-l1 border-rose-200 p-4">
          <p className="text-xs font-medium uppercase text-rose-900">
            {t("udhaar.overdueAccounts")}
          </p>
          <p className="text-2xl figure text-rose-950 mt-1">
            {overdueCount} Accounts
          </p>
          <p className="text-xs text-rose-800 mt-1">Past the promised pay-back date</p>
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
          className="w-full rounded-lg border border-slate-300 bg-white ps-10 pe-4 text-base focus:border-emerald-700 focus:outline-hidden min-h-[44px]"
        />
      </div>

      {/* Customers Table */}
      <div className="surface-l1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-l1">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-medium uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 px-4 text-start">{t("udhaar.customerName")}</th>
                <th className="py-3 px-4 text-start">{t("udhaar.phone")}</th>
                <th className="py-3 px-4 text-end">{t("udhaar.balance")}</th>
                <th className="py-3 px-4 text-center">{t("udhaar.overdueDays")}</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => {
                const status = dueStatus(c);
                const isOverdue = status.tone === "overdue";
                return (
                  <tr key={c.id} className="group hover:bg-emerald-50/50 transition-all duration-200 border-l-2 border-l-transparent hover:border-l-emerald-700">
                    <td className="py-3 px-4 font-medium text-slate-900 group-hover:translate-x-1 transition-transform duration-200">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-sm">
                      {c.phone}
                    </td>
                    <td className="py-3.5 px-4 text-end">
                      <span className={`figure ${c.creditBalance > 0 ? "text-amber-900 group-hover:text-amber-700" : "text-emerald-700"} transition-colors`}>
                        {formatCurrency(c.creditBalance)}
                      </span>
                      {c.creditBalance > 0 && (
                        <span className="block mt-1 h-1 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
                          <span
                            className="block h-full rounded-full bg-amber-500/80 group-hover:bg-amber-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, (c.creditBalance / Math.max(totalOutstanding, 1)) * 100)}%` }}
                          />
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {c.creditBalance > 0 ? (
                        <span
                          className={`inline-flex flex-col items-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums transition-transform group-hover:scale-105 ${
                            isOverdue
                              ? "bg-rose-100 text-rose-800 group-hover:animate-pump"
                              : status.tone === "soon"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-700"
                          }`}
                          title={c.nextDueDate ? `Oldest unpaid sale due ${c.nextDueDate}` : undefined}
                        >
                          <span>{status.text}</span>
                          {c.nextDueDate && <span className="font-normal opacity-75">{c.nextDueDate}</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-700 font-medium flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Clear
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {c.creditBalance > 0 && (
                          <>
                            <button
                              onClick={() => openPayment(c)}
                              className="rounded-md bg-emerald-800 text-white px-3 text-sm font-medium hover:bg-emerald-900 hover:-translate-y-0.5 transition-all duration-200 min-h-[44px]"
                            >
                              {t("udhaar.recordPayment")}
                            </button>
                            <button
                              onClick={() => sendWhatsAppReminder(c)}
                              className="rounded-md border border-emerald-300 bg-emerald-50 text-emerald-900 px-3 text-sm font-medium hover:bg-emerald-100 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5 min-h-[44px]"
                              title="Send respectful WhatsApp reminder"
                            >
                              <MessageSquare className="h-3 w-3 text-emerald-700 group-hover:scale-110 transition-transform" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-700/40 backdrop-blur-sm">
          <div className="w-full max-w-sm surface-overlay p-6">
            <h4 className="text-base font-semibold text-slate-900">{t("udhaar.recordPayment")}</h4>
            <p className="text-xs text-slate-500 mb-3">
              {selectedCustPayment.name} (Current debt: {formatCurrency(selectedCustPayment.creditBalance)})
            </p>
            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid (PKR)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min={1}
                  max={selectedCustPayment.creditBalance}
                  value={paymentAmount}
                  onChange={(e) => { setPaymentAmount(Number(e.target.value)); setPaymentError(null); }}
                  aria-invalid={paymentError ? true : undefined}
                  aria-describedby={paymentError ? "payment-error" : undefined}
                  className="w-full rounded-lg border border-slate-300 px-3 text-base tabular-nums min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => { setPaymentAmount(selectedCustPayment.creditBalance); setPaymentError(null); }}
                  className="mt-2 text-sm font-medium text-emerald-800 hover:underline min-h-[44px]"
                >
                  Paid in full ({formatCurrency(selectedCustPayment.creditBalance)})
                </button>
                {paymentError && (
                  <p id="payment-error" role="alert" className="mt-1 text-sm text-rose-700">{paymentError}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">Payments clear the oldest udhaar first.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustPayment(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-800 px-4 text-sm font-medium text-white hover:bg-emerald-900 min-h-[44px]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-700/40 backdrop-blur-sm">
          <div className="w-full max-w-sm surface-overlay p-6">
            <h4 className="text-base font-semibold text-slate-900">Add Customer Account</h4>
            <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Asif Bhai"
                  className="w-full rounded-lg border border-slate-300 px-3 text-base min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full rounded-lg border border-slate-300 px-3 text-base min-h-[44px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-800 px-4 text-sm font-medium text-white hover:bg-emerald-900 min-h-[44px]"
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