import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Minus, Plus, X, AlertTriangle, Check, Keyboard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  parseVoiceOrder, clampToStock,
  type VoiceCustomer, type VoiceLine, type VoiceProduct,
} from "@/lib/voiceParser";

export interface ConfirmedVoiceOrder {
  items: { productId: string; qty: number }[];
  paymentType: "cash" | "credit";
  customerId: string | null;
  /** Items whose quantity was reduced to the stock on the shelf. */
  clamped: { productId: string; requested: number; granted: number }[];
}

interface Props {
  open: boolean;
  /** What the microphone heard (may be empty when opened with "Type it"). */
  transcript: string;
  products: VoiceProduct[];
  customers: VoiceCustomer[];
  onConfirm: (order: ConfirmedVoiceOrder) => void;
  onCancel: () => void;
}

/**
 * Tap-to-confirm sheet for Voice POS. The microphone only PROPOSES a cart; nothing
 * is added until the cashier confirms. Every line can be re-pointed to another
 * product, resized, or removed — and all prices/totals come from the catalogue.
 */
export const VoiceConfirmSheet: React.FC<Props> = ({ open, transcript, products, customers, onConfirm, onCancel }) => {
  const [text, setText] = useState(transcript);
  const [lines, setLines] = useState<VoiceLine[]>([]);
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const reparse = (t: string) => {
    const r = parseVoiceOrder(t, products, customers);
    setLines(r.lines);
    setPaymentType(r.paymentType);
    setCustomerId(r.customerId ?? "");
  };

  useEffect(() => {
    if (!open) return;
    setText(transcript);
    reparse(transcript);
    if (!transcript) setTimeout(() => inputRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transcript]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const setQty = (key: string, delta: number) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(99, l.qty + delta)) } : l)));
  const setProduct = (key: string, productId: string) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, productId: productId || null, confidence: productId ? 1 : 0 } : l)));
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const valid = lines.filter((l) => l.productId && productById.has(l.productId));
  const total = valid.reduce((sum, l) => sum + (productById.get(l.productId!)?.sellPrice ?? 0) * l.qty, 0);
  const needsCustomer = paymentType === "credit" && !customerId;

  const confirm = () => {
    const merged = new Map<string, number>();
    for (const l of valid) merged.set(l.productId!, (merged.get(l.productId!) ?? 0) + l.qty);
    const items: ConfirmedVoiceOrder["items"] = [];
    const clamped: ConfirmedVoiceOrder["clamped"] = [];
    merged.forEach((requested, productId) => {
      const granted = clampToStock(requested, productById.get(productId)?.quantity ?? 0);
      if (granted < requested) clamped.push({ productId, requested, granted });
      if (granted > 0) items.push({ productId, qty: granted });
    });
    onConfirm({ items, paymentType, customerId: customerId || null, clamped });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-slate-700/40 backdrop-blur-sm" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm voice order"
        className="toast-in relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <p className="mono-label text-emerald-800 flex items-center gap-1.5"><Mic className="h-3.5 w-3.5" aria-hidden="true" /> Voice order</p>
            <h3 className="mt-0.5 text-lg font-semibold text-slate-900">Check &amp; confirm</h3>
          </div>
          <button onClick={onCancel} aria-label="Cancel voice order" className="hit flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* what we heard (editable) */}
        <div className="px-5 pt-3">
          <label className="mono-label text-slate-500" htmlFor="voice-heard">
            {transcript ? "Heard" : "Type your order"}
          </label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="voice-heard"
                ref={inputRef}
                dir="auto"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") reparse(text); }}
                placeholder="e.g. do kilo cheeni aur ek ghee udhaar Asif"
                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-mist ps-9 pe-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => reparse(text)}
              className="min-h-[44px] rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Read
            </button>
          </div>
        </div>

        {/* lines */}
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto px-5 pb-2">
          {lines.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-mist px-4 py-6 text-center text-sm text-slate-600">
              Nothing recognised yet. Say or type items like <span className="font-semibold">“2 chai 1 ghee”</span>.
            </p>
          )}
          {lines.map((l) => {
            const p = l.productId ? productById.get(l.productId) : undefined;
            const low = l.confidence < 0.7;
            const overStock = p ? l.qty > p.quantity : false;
            return (
              <div
                key={l.key}
                className={`rounded-2xl border p-3 ${!p ? "border-amber-300 bg-cream" : low ? "border-amber-200 bg-cream/60" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-xs text-slate-500" dir="auto">“{l.segment || "…"}”</p>
                  <button onClick={() => removeLine(l.key)} aria-label="Remove line" className="hit -m-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <select
                  value={l.productId ?? ""}
                  onChange={(e) => setProduct(l.key, e.target.value)}
                  aria-label={`Product for ${l.segment}`}
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-emerald-700 focus:outline-hidden"
                >
                  <option value="">Pick a product…</option>
                  {l.candidates.length > 0 && (
                    <optgroup label="Best matches">
                      {l.candidates.map((c) => {
                        const cp = productById.get(c.id);
                        return cp ? <option key={`c-${c.id}`} value={c.id}>{cp.nameEn}</option> : null;
                      })}
                    </optgroup>
                  )}
                  <optgroup label="All products">
                    {products.map((pp) => <option key={pp.id} value={pp.id}>{pp.nameEn}</option>)}
                  </optgroup>
                </select>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1" role="group" aria-label="Quantity">
                    <button onClick={() => setQty(l.key, -1)} aria-label="Decrease quantity" className="hit flex items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
                    <span className="figure w-10 text-center text-base text-slate-900">{l.qty}</span>
                    <button onClick={() => setQty(l.key, 1)} aria-label="Increase quantity" className="hit flex items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
                  </div>
                  <p className="figure text-base text-slate-900">{p ? formatCurrency(p.sellPrice * l.qty) : "—"}</p>
                </div>
                {(!p || low || overStock) && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {!p ? "Not sure what this is — pick the right product."
                      : overStock ? `Only ${p.quantity} in stock — will add ${Math.max(0, p.quantity)}.`
                      : "Please double-check this match."}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* payment + confirm */}
        <div className="space-y-3 border-t border-slate-100 px-5 pt-3 pb-5">
          <div className="flex items-center gap-2" role="group" aria-label="Payment type">
            {(["cash", "credit"] as const).map((pt) => (
              <button
                key={pt}
                onClick={() => setPaymentType(pt)}
                aria-pressed={paymentType === pt}
                className={`min-h-[44px] flex-1 rounded-xl border text-sm font-semibold transition-colors ${
                  paymentType === pt ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {pt === "cash" ? "Cash" : "Udhaar"}
              </button>
            ))}
          </div>
          {paymentType === "credit" && (
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              aria-label="Udhaar customer"
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-emerald-700 focus:outline-hidden"
            >
              <option value="">Whose udhaar?</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">{valid.length} item{valid.length === 1 ? "" : "s"}</span>
            <span className="figure text-xl text-slate-900">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={valid.length === 0 || needsCustomer}
              className="flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-800 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Add to cart
            </button>
          </div>
          {needsCustomer && valid.length > 0 && <p className="text-center text-xs font-medium text-amber-800">Choose who the udhaar is for.</p>}
        </div>
      </div>
    </div>
  );
};
