import React, { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { defaultDueDate, toLocalYmd } from "@/domain/credit";
import { buildPurchaseDraft, buildSaleDraft, paymentProblem, type AgentAction } from "@/domain/agentActions";
import { buildUdhaarReminder, buildWhatsAppUrl } from "@/domain/whatsapp";
import { AlertTriangle, Check, Loader2, Minus, Plus, ShoppingCart, PackagePlus, Wallet, MessageCircle, X } from "lucide-react";

export type ActionStatus = { state: "pending" } | { state: "done"; summary: string } | { state: "cancelled" };

interface Props {
  action: AgentAction;
  status: ActionStatus;
  onResolved: (status: ActionStatus) => void;
}

const field =
  "min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-emerald-700 focus:outline-hidden disabled:bg-slate-50";
const stepBtn =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100";

/**
 * Confirmation card for an action Tallyn AI proposed. Everything is editable, every price
 * and total comes from the catalogue (domain/agentActions), and nothing is saved until the
 * shopkeeper taps Approve — which calls the same record functions as the rest of the app.
 */
export const AgentActionCard: React.FC<Props> = ({ action, status, onResolved }) => {
  const meta = {
    sale: { icon: ShoppingCart, title: action.type === "sale" && action.paymentType === "credit" ? "Udhaar sale" : "Sale" },
    purchase: { icon: PackagePlus, title: "Purchase (stock in)" },
    payment: { icon: Wallet, title: "Udhaar payment received" },
    reminder: { icon: MessageCircle, title: "WhatsApp reminder" },
  }[action.type];
  const Icon = meta.icon;

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-emerald-200 bg-white text-slate-900 shadow-xs">
      <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-3 py-2">
        <Icon className="h-4 w-4 shrink-0 text-emerald-800" aria-hidden="true" />
        <p className="text-sm font-semibold text-emerald-950">{meta.title}</p>
        {status.state === "pending" && <span className="ms-auto text-xs font-medium text-emerald-800">Needs your OK</span>}
      </div>
      {status.state === "done" ? (
        <p className="flex items-start gap-2 px-3 py-3 text-sm text-emerald-900">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {status.summary}
        </p>
      ) : status.state === "cancelled" ? (
        <p className="px-3 py-3 text-sm text-slate-600">Cancelled. Nothing was saved.</p>
      ) : action.type === "sale" ? (
        <SaleForm action={action} onResolved={onResolved} />
      ) : action.type === "purchase" ? (
        <PurchaseForm action={action} onResolved={onResolved} />
      ) : action.type === "payment" ? (
        <PaymentForm action={action} onResolved={onResolved} />
      ) : (
        <ReminderForm action={action} onResolved={onResolved} />
      )}
    </div>
  );
};

/* ------------------------------- shared bits ------------------------------- */

const Problems: React.FC<{ items: string[] }> = ({ items }) =>
  items.length ? (
    <ul className="space-y-1" aria-live="polite">
      {items.map((p) => (
        <li key={p} className="flex items-start gap-1.5 text-xs font-semibold text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {p}
        </li>
      ))}
    </ul>
  ) : null;

const Footer: React.FC<{
  approveLabel: string;
  disabled: boolean;
  busy: boolean;
  onApprove: () => void;
  onCancel: () => void;
}> = ({ approveLabel, disabled, busy, onApprove, onCancel }) => (
  <div className="flex gap-2 pt-1">
    <button onClick={onCancel} disabled={busy} className="min-h-[44px] flex-1 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
      Cancel
    </button>
    <button
      onClick={onApprove}
      disabled={disabled || busy}
      className="flex min-h-[44px] flex-[2] items-center justify-center gap-1.5 rounded-xl bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
      {approveLabel}
    </button>
  </div>
);

const ProductSelect: React.FC<{ value: string; onChange: (id: string) => void; label: string }> = ({ value, onChange, label }) => {
  const { products } = useApp();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`${field} font-semibold`}>
      {products.map((p) => <option key={p.id} value={p.id}>{p.nameEn}</option>)}
    </select>
  );
};

const CustomerSelect: React.FC<{ value: string; onChange: (id: string) => void; placeholder: string; label: string }> = ({ value, onChange, placeholder, label }) => {
  const { customers, shop } = useApp();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`${field} font-semibold`}>
      <option value="">{placeholder}</option>
      {customers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}{c.creditBalance > 0 ? ` · owes ${formatCurrency(c.creditBalance, shop.currency)}` : ""}
        </option>
      ))}
    </select>
  );
};

type FormProps<T extends AgentAction["type"]> = {
  action: Extract<AgentAction, { type: T }>;
  onResolved: (s: ActionStatus) => void;
};

/* ---------------------------------- sale ---------------------------------- */

const SaleForm: React.FC<FormProps<"sale">> = ({ action, onResolved }) => {
  const { products, customers, shop, recordSale } = useApp();
  const [lines, setLines] = useState(action.items.map((it, i) => ({ key: i, ...it })));
  const [paymentType, setPaymentType] = useState(action.paymentType);
  const [customerId, setCustomerId] = useState(action.customerId ?? "");
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [busy, setBusy] = useState(false);
  const draft = useMemo(() => buildSaleDraft(lines, products), [lines, products]);
  const customer = customers.find((c) => c.id === customerId);
  const today = toLocalYmd();
  const problems = [
    ...draft.problems,
    ...(paymentType === "credit" && !customer ? ["Choose whose udhaar this is."] : []),
    ...(paymentType === "credit" && (!dueDate || dueDate < today) ? ["Pick a pay-back date of today or later."] : []),
  ];
  const price = (id: string) => products.find((p) => p.id === id)?.sellPrice ?? 0;

  const approve = async () => {
    setBusy(true);
    try {
      const ok = await recordSale({
        shopId: shop.id,
        paymentType,
        customerId: paymentType === "credit" ? customerId : undefined,
        customerName: paymentType === "credit" ? customer?.name : undefined,
        dueDate: paymentType === "credit" ? dueDate : undefined,
        totalAmount: draft.total,
        items: draft.items,
      });
      if (ok) {
        const what = draft.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ");
        onResolved({
          state: "done",
          summary: `Sale recorded: ${what}, ${formatCurrency(draft.total, shop.currency)}${paymentType === "credit" ? ` on udhaar for ${customer?.name}` : " cash"}. Stock updated.`,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5 p-3">
      {lines.map((l) => (
        <div key={l.key} className="space-y-1.5 rounded-xl border border-slate-200 p-2">
          <div className="flex gap-1.5">
            <ProductSelect value={l.productId} label="Product" onChange={(id) => setLines((p) => p.map((x) => (x.key === l.key ? { ...x, productId: id } : x)))} />
            <button onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} aria-label="Remove item" className={stepBtn}><X className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setLines((p) => p.map((x) => (x.key === l.key ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} aria-label="Decrease quantity" className={stepBtn}><Minus className="h-4 w-4" /></button>
            <span className="figure w-10 text-center text-base">{l.qty}</span>
            <button onClick={() => setLines((p) => p.map((x) => (x.key === l.key ? { ...x, qty: Math.min(999, x.qty + 1) } : x)))} aria-label="Increase quantity" className={stepBtn}><Plus className="h-4 w-4" /></button>
            <span className="figure ms-auto text-sm">{formatCurrency(price(l.productId) * l.qty, shop.currency)}</span>
          </div>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Payment type">
        {(["cash", "credit"] as const).map((pt) => (
          <button
            key={pt}
            onClick={() => setPaymentType(pt)}
            aria-pressed={paymentType === pt}
            className={`min-h-[44px] rounded-xl border text-sm font-semibold ${paymentType === pt ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white text-slate-700"}`}
          >
            {pt === "cash" ? "Cash" : "Udhaar"}
          </button>
        ))}
      </div>
      {paymentType === "credit" && (
        <>
          <CustomerSelect value={customerId} onChange={setCustomerId} placeholder="Whose udhaar?" label="Udhaar customer" />
          <label className="block text-xs font-medium text-slate-600">
            Pay-back date
            <input type="date" value={dueDate} min={today} onChange={(e) => setDueDate(e.target.value)} className={`${field} mt-1`} />
          </label>
        </>
      )}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-sm text-slate-600">Total (catalogue prices)</span>
        <span className="figure text-lg">{formatCurrency(draft.total, shop.currency)}</span>
      </div>
      <Problems items={problems} />
      <Footer approveLabel="Approve sale" disabled={problems.length > 0} busy={busy} onApprove={approve} onCancel={() => onResolved({ state: "cancelled" })} />
    </div>
  );
};

/* -------------------------------- purchase -------------------------------- */

const PurchaseForm: React.FC<FormProps<"purchase">> = ({ action, onResolved }) => {
  const { products, shop, recordSupplierPurchase } = useApp();
  const buyPrice = (id: string) => products.find((p) => p.id === id)?.buyPrice ?? 0;
  const [lines, setLines] = useState(action.items.map((it, i) => ({ key: i, productId: it.productId, qty: it.qty, cost: String(it.unitCost ?? buyPrice(it.productId)) })));
  const [supplier, setSupplier] = useState(action.supplier ?? "");
  const [busy, setBusy] = useState(false);
  const parsed = lines.map((l) => {
    const c = Number(l.cost);
    return { productId: l.productId, qty: l.qty, unitCost: Number.isFinite(c) && c > 0 ? c : 0 };
  });
  const draft = buildPurchaseDraft(parsed, products);

  const approve = async () => {
    setBusy(true);
    try {
      const ok = await recordSupplierPurchase({
        supplierName: supplier.trim() || "Supplier",
        invoiceNumber: "",
        totalAmount: draft.total,
        items: draft.items,
      });
      if (ok) {
        const what = draft.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ");
        onResolved({ state: "done", summary: `Purchase saved: ${what}, ${formatCurrency(draft.total, shop.currency)}${supplier.trim() ? ` from ${supplier.trim()}` : ""}. Stock raised.` });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5 p-3">
      {lines.map((l) => (
        <div key={l.key} className="space-y-1.5 rounded-xl border border-slate-200 p-2">
          <div className="flex gap-1.5">
            <ProductSelect
              value={l.productId}
              label="Product"
              onChange={(id) => setLines((p) => p.map((x) => (x.key === l.key ? { ...x, productId: id, cost: String(buyPrice(id)) } : x)))}
            />
            <button onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} aria-label="Remove item" className={stepBtn}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="text-xs font-medium text-slate-600">
              Quantity
              <input
                type="number" inputMode="numeric" min={1} value={l.qty}
                onChange={(e) => setLines((p) => p.map((x) => (x.key === l.key ? { ...x, qty: Math.max(1, Math.min(9999, Math.round(Number(e.target.value) || 1))) } : x)))}
                className={`${field} mt-1 figure`}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Cost each
              <input
                type="number" inputMode="decimal" min={0} value={l.cost}
                onChange={(e) => setLines((p) => p.map((x) => (x.key === l.key ? { ...x, cost: e.target.value } : x)))}
                className={`${field} mt-1 figure`}
              />
            </label>
          </div>
        </div>
      ))}
      <label className="block text-xs font-medium text-slate-600">
        Supplier (optional)
        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Al-Rehman Traders" className={`${field} mt-1`} />
      </label>
      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-sm text-slate-600">Total cost</span>
        <span className="figure text-lg">{formatCurrency(draft.total, shop.currency)}</span>
      </div>
      <Problems items={draft.problems} />
      <Footer approveLabel="Approve purchase" disabled={draft.problems.length > 0} busy={busy} onApprove={approve} onCancel={() => onResolved({ state: "cancelled" })} />
    </div>
  );
};

/* --------------------------------- payment --------------------------------- */

const PaymentForm: React.FC<FormProps<"payment">> = ({ action, onResolved }) => {
  const { customers, shop, recordCreditPayment } = useApp();
  const [customerId, setCustomerId] = useState(action.customerId ?? "");
  const [amount, setAmount] = useState(action.amount !== null ? String(action.amount) : "");
  const [busy, setBusy] = useState(false);
  const customer = customers.find((c) => c.id === customerId);
  const amt = amount.trim() === "" ? null : Number(amount);
  const problem = paymentProblem(customer, amt !== null && Number.isFinite(amt) ? amt : null);

  const approve = async () => {
    if (!customer || amt === null) return;
    setBusy(true);
    try {
      const ok = await recordCreditPayment(customer.id, amt);
      if (ok) onResolved({ state: "done", summary: `Payment recorded: ${formatCurrency(amt, shop.currency)} from ${customer.name}. Oldest udhaar cleared first.` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5 p-3">
      <CustomerSelect value={customerId} onChange={setCustomerId} placeholder="Who paid?" label="Customer who paid" />
      <label className="block text-xs font-medium text-slate-600">
        Amount received
        <input type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} mt-1 figure`} />
      </label>
      {customer && customer.creditBalance > 0 && (
        <p className="text-xs text-slate-600">
          {customer.name} owes <span className="figure font-semibold text-slate-900">{formatCurrency(customer.creditBalance, shop.currency)}</span>
        </p>
      )}
      <Problems items={problem ? [problem] : []} />
      <Footer approveLabel="Approve payment" disabled={!!problem} busy={busy} onApprove={approve} onCancel={() => onResolved({ state: "cancelled" })} />
    </div>
  );
};

/* -------------------------------- reminder -------------------------------- */

const ReminderForm: React.FC<FormProps<"reminder">> = ({ action, onResolved }) => {
  const { customers, shop } = useApp();
  const [customerId, setCustomerId] = useState(action.customerId ?? "");
  const customer = customers.find((c) => c.id === customerId);
  const message = customer
    ? buildUdhaarReminder({ customerName: customer.name, shopName: shop.name, balance: customer.creditBalance, nextDueDate: customer.nextDueDate, currency: shop.currency })
    : "";
  const url = customer ? buildWhatsAppUrl(customer.phone, message) : null;
  const problem = !customer
    ? "Choose who to remind."
    : customer.creditBalance <= 0
      ? `${customer.name} doesn't owe anything.`
      : !url
        ? `${customer.name}'s phone number doesn't look like a mobile number. Fix it on the Udhaar screen.`
        : null;

  const approve = () => {
    if (!url || !customer) return;
    window.open(url, "_blank", "noopener");
    onResolved({ state: "done", summary: `WhatsApp opened with a polite reminder for ${customer.name}. Tap Send there.` });
  };

  return (
    <div className="space-y-2.5 p-3">
      <CustomerSelect value={customerId} onChange={setCustomerId} placeholder="Who to remind?" label="Customer to remind" />
      {message && (
        <p className="whitespace-pre-line rounded-xl bg-mist p-2.5 text-xs leading-relaxed text-slate-800">{message}</p>
      )}
      <Problems items={problem ? [problem] : []} />
      <Footer approveLabel="Open WhatsApp" disabled={!!problem} busy={false} onApprove={approve} onCancel={() => onResolved({ state: "cancelled" })} />
    </div>
  );
};
