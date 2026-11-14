import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/fx/Toast";
import { supabase } from "@/services/supabaseClient";
import { formatCurrency } from "@/lib/utils";
import {
  compressImage, scanBillImage, BillScanError, type BillScanLine, type BillScanResult,
} from "@/services/billScan";
import {
  matchProduct, deriveUnitCost, lineTotalMismatch, costChangePercent, marginKeepingPrice,
  PRICE_RISE_ALERT_PCT, type MatchConfidence,
} from "@/domain/billMatching";
import {
  Camera, ImagePlus, X, Plus, Trash2, Sparkles, AlertTriangle, TrendingUp, TrendingDown,
  PencilLine, RotateCcw, CheckCircle2,
} from "lucide-react";

type Stage = "pick" | "scanning" | "review" | "error";

interface DraftLine {
  key: string;
  /** Text read from the bill (null for lines the shopkeeper added by hand). */
  billName: string | null;
  billNameEnglish: string | null;
  billUnit: string | null;
  productId: string;
  quantity: string;
  unitCost: string;
  confidence: MatchConfidence | "manual";
  totalMismatch: boolean;
}

interface Props {
  open: boolean;
  /** "scan" opens the camera/gallery picker; "manual" goes straight to an empty purchase form. */
  mode: "scan" | "manual";
  onClose: () => void;
}

let keySeq = 0;
const newKey = () => `line-${Date.now()}-${keySeq++}`;

const emptyLine = (): DraftLine => ({
  key: newKey(), billName: null, billNameEnglish: null, billUnit: null,
  productId: "", quantity: "", unitCost: "", confidence: "manual", totalMismatch: false,
});

const parseNum = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

export const BillScannerSheet: React.FC<Props> = ({ open, mode, onClose }) => {
  const { products, recordSupplierPurchase, isDemoMode } = useApp();
  const toast = useToast();

  const [stage, setStage] = useState<Stage>("pick");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<BillScanError | null>(null);
  const [scan, setScan] = useState<BillScanResult | null>(null);
  const [supplier, setSupplier] = useState("");
  const [invoice, setInvoice] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [saving, setSaving] = useState(false);

  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.nameEn.localeCompare(b.nameEn)),
    [products],
  );
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Reset every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setScan(null);
    setSupplier("");
    setInvoice("");
    setSaving(false);
    if (mode === "manual") {
      setLines([emptyLine()]);
      setStage("review");
    } else {
      setLines([]);
      setStage("pick");
    }
  }, [open, mode]);

  // Release the photo's object URL when it changes or the sheet unmounts.
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const close = () => {
    abortRef.current?.abort();
    setPhotoUrl(null);
    onClose();
  };

  // Escape closes (unless a save is in flight).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, saving]);

  if (!open) return null;

  /* ------------------------------ scanning ------------------------------ */

  const linesFromScan = (scanLines: BillScanLine[]): DraftLine[] =>
    scanLines.map((l) => {
      const m = matchProduct([l.nameEnglish, l.name], products);
      const cost = deriveUnitCost(l.quantity, l.unitPrice, l.lineTotal);
      return {
        key: newKey(),
        billName: l.name,
        billNameEnglish: l.nameEnglish,
        billUnit: l.unit,
        productId: m.productId ?? "",
        quantity: l.quantity !== null ? String(l.quantity) : "",
        unitCost: cost !== null ? String(cost) : "",
        confidence: m.confidence,
        totalMismatch: lineTotalMismatch(l.quantity, l.unitPrice, l.lineTotal),
      };
    });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    setError(null);
    setStage("scanning");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const image = await compressImage(file);
      const accessToken = isDemoMode ? null : (await supabase.auth.getSession()).data.session?.access_token ?? null;
      const result = await scanBillImage(image, { accessToken, signal: controller.signal });
      if (controller.signal.aborted) return;
      setScan(result);
      setSupplier(result.supplier ?? "");
      setInvoice(result.invoiceNumber ?? "");
      setLines(linesFromScan(result.lines));
      setStage("review");
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof BillScanError ? e : new BillScanError("unavailable", "Something went wrong reading the bill."));
      setStage("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const cancelScan = () => {
    abortRef.current?.abort();
    setStage("pick");
  };

  const enterByHand = () => {
    setLines([emptyLine()]);
    setScan(null);
    setStage("review");
  };

  /* ------------------------------- review ------------------------------- */

  const updateLine = (key: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const lineState = (l: DraftLine) => {
    const qty = parseNum(l.quantity);
    const cost = parseNum(l.unitCost);
    const product = l.productId ? productById.get(l.productId) : undefined;
    const included = Boolean(product);
    const valid = included && qty !== null && qty > 0 && cost !== null && cost >= 0;
    return { qty, cost, product, included, valid };
  };

  const states = lines.map((l) => ({ line: l, ...lineState(l) }));
  const included = states.filter((s) => s.included);
  const invalidIncluded = included.filter((s) => !s.valid);
  const skippedCount = states.length - included.length;
  const total = Math.round(
    included.reduce((sum, s) => sum + (s.valid ? (s.qty as number) * (s.cost as number) : 0), 0) * 100,
  ) / 100;
  const canSave = included.length > 0 && invalidIncluded.length === 0 && !saving;
  const billTotalDiffers =
    scan?.billTotal != null && skippedCount === 0 && invalidIncluded.length === 0 &&
    Math.abs(scan.billTotal - total) > Math.max(1, scan.billTotal * 0.01);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const items = included.map((s) => ({
        productId: s.product!.id,
        productName: s.product!.nameEn,
        quantity: s.qty as number,
        unitCost: s.cost as number,
      }));
      const ok = await recordSupplierPurchase({
        supplierName: supplier.trim() || "Supplier",
        invoiceNumber: invoice.trim(),
        totalAmount: total,
        items,
      });
      if (ok) {
        toast.success(`Stock raised for ${items.length} item${items.length === 1 ? "" : "s"}`, {
          description: `${formatCurrency(total)} purchase saved${supplier.trim() ? ` from ${supplier.trim()}` : ""}.`,
        });
        close();
      }
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------- render -------------------------------- */

  const title =
    stage === "review" ? (scan ? "Check the bill, then save" : "Enter purchase") : "Scan supplier bill";

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bill-sheet-title"
    >
      <div className="flex w-full flex-col bg-white sm:max-w-2xl sm:rounded-2xl sm:max-h-[92vh] h-[100dvh] sm:h-auto shadow-lift">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-amber-300">
              {stage === "review" && !scan ? <PencilLine className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </span>
            <h2 id="bill-sheet-title" className="truncate text-base font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={saving}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hidden file inputs: camera (rear) and gallery */}
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="hidden"
          onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* ---------------- PICK ---------------- */}
          {stage === "pick" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Take a photo of the supplier's bill or parchi. Tallyn reads the items and prices, matches them to your
                stock, and shows you everything to check. <strong>Nothing is saved until you tap Save.</strong>
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => cameraInput.current?.click()}
                  className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl bg-emerald-800 px-4 text-white hover:bg-emerald-900"
                >
                  <Camera className="h-6 w-6 text-amber-300" />
                  <span className="text-base font-semibold">Take photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInput.current?.click()}
                  className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-slate-800 hover:bg-slate-50"
                >
                  <ImagePlus className="h-6 w-6 text-emerald-800" />
                  <span className="text-base font-semibold">Choose from gallery</span>
                </button>
              </div>
              <ul className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <li>• Lay the bill flat, in good light, with the whole bill in the frame.</li>
                <li>• Printed and neat handwritten bills both work. Urdu is fine.</li>
                {isDemoMode && <li>• Demo visitors can scan up to 6 bills a day.</li>}
              </ul>
              <button
                type="button"
                onClick={enterByHand}
                className="min-h-[44px] text-sm font-medium text-emerald-800 hover:underline"
              >
                No photo? Enter the purchase by hand
              </button>
            </div>
          )}

          {/* ---------------- SCANNING ---------------- */}
          {stage === "scanning" && (
            <div className="space-y-4 text-center">
              <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl border-2 border-emerald-500/70 bg-slate-900">
                {photoUrl && <img src={photoUrl} alt="Your bill" className="max-h-[50vh] w-full object-contain opacity-80" />}
                <span className="scan-laser" aria-hidden="true" />
              </div>
              <div className="flex items-center justify-center gap-2 text-emerald-800" role="status" aria-live="polite">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <p className="text-sm font-semibold">Reading your bill… this can take up to a minute</p>
              </div>
              <button
                type="button"
                onClick={cancelScan}
                className="min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ---------------- ERROR ---------------- */}
          {stage === "error" && error && (
            <div className="space-y-4">
              {photoUrl && (
                <img src={photoUrl} alt="Your bill" className="mx-auto max-h-48 rounded-lg border border-slate-200 object-contain" />
              )}
              <div role="alert" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p>{error.message}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStage("pick")}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" /> Try another photo
                </button>
                <button
                  type="button"
                  onClick={enterByHand}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
                >
                  <PencilLine className="h-4 w-4" /> Enter this bill by hand
                </button>
              </div>
            </div>
          )}

          {/* ---------------- REVIEW ---------------- */}
          {stage === "review" && (
            <div className="space-y-4">
              {scan && (
                <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>
                    Read {scan.lines.length} line{scan.lines.length === 1 ? "" : "s"} from the bill. Check each product,
                    quantity and cost — <strong>amber</strong> lines need a second look.
                  </span>
                </p>
              )}

              {photoUrl && (
                <details className="rounded-xl border border-slate-200">
                  <summary className="cursor-pointer select-none px-3 py-3 text-sm font-medium text-slate-700">
                    View bill photo
                  </summary>
                  <img src={photoUrl} alt="Your bill" className="max-h-[60vh] w-full object-contain p-2" />
                </details>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Supplier</span>
                  <input
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Metro Cash & Carry"
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 text-base"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Bill / invoice no. (optional)</span>
                  <input
                    value={invoice}
                    onChange={(e) => setInvoice(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 text-base"
                  />
                </label>
              </div>

              <ul className="space-y-3">
                {states.map(({ line: l, qty, cost, product, included: inc, valid }, idx) => {
                  const needsCheck = inc && (l.confidence === "low" || l.totalMismatch);
                  const change = product && cost !== null ? costChangePercent(cost, product.buyPrice) : null;
                  const keepPrice =
                    product && cost !== null && change !== null && change > PRICE_RISE_ALERT_PCT
                      ? marginKeepingPrice(cost, product.buyPrice, product.sellPrice)
                      : null;
                  return (
                    <li
                      key={l.key}
                      className={`rounded-xl border p-3 ${
                        !inc
                          ? "border-slate-200 bg-slate-50"
                          : needsCheck
                          ? "border-amber-400 bg-amber-50/60"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0 text-sm">
                          {l.billName ? (
                            <p className="text-slate-500">
                              On bill: <span className="font-medium text-slate-800" dir="auto">{l.billName}</span>
                              {l.billNameEnglish && l.billNameEnglish !== l.billName && (
                                <span className="text-slate-500"> ({l.billNameEnglish})</span>
                              )}
                              {l.billUnit && <span className="text-slate-500"> · {l.billUnit}</span>}
                            </p>
                          ) : (
                            <p className="font-medium text-slate-700">Item {idx + 1}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(l.key)}
                          aria-label={`Remove line ${idx + 1}`}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <label className="block">
                        <span className="sr-only">Product for line {idx + 1}</span>
                        <select
                          value={l.productId}
                          onChange={(e) => updateLine(l.key, { productId: e.target.value, confidence: "manual" })}
                          className={`w-full min-h-[44px] rounded-lg border px-3 text-base ${
                            inc ? "border-slate-300 bg-white" : "border-dashed border-slate-400 bg-white text-slate-500"
                          }`}
                        >
                          <option value="">— Not in my stock (skip this line) —</option>
                          {sortedProducts.map((p) => (
                            <option key={p.id} value={p.id}>{p.nameEn}</option>
                          ))}
                        </select>
                      </label>

                      {inc && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">Quantity received</span>
                            <input
                              inputMode="decimal"
                              value={l.quantity}
                              onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                              aria-invalid={qty === null || qty <= 0 ? true : undefined}
                              className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 text-base tabular-nums"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">Cost per {product?.unit || "unit"} (Rs)</span>
                            <input
                              inputMode="decimal"
                              value={l.unitCost}
                              onChange={(e) => updateLine(l.key, { unitCost: e.target.value })}
                              aria-invalid={cost === null || cost < 0 ? true : undefined}
                              className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 text-base tabular-nums"
                            />
                          </label>
                        </div>
                      )}

                      {/* Notes (all deterministic) */}
                      <div className="mt-2 space-y-1 text-sm">
                        {inc && l.confidence === "low" && (
                          <p className="text-amber-900">Please check this is the right product.</p>
                        )}
                        {!inc && l.billName && (
                          <p className="text-slate-500">Not matched to your stock — choose a product, or leave it skipped.</p>
                        )}
                        {inc && l.totalMismatch && (
                          <p className="text-amber-900">The bill's line amount doesn't equal quantity × rate. Check the numbers.</p>
                        )}
                        {inc && !valid && (
                          <p className="text-rose-700">Enter a quantity above zero and a cost.</p>
                        )}
                        {valid && change !== null && change > PRICE_RISE_ALERT_PCT && product && (
                          <p className="flex items-start gap-1 text-rose-800">
                            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                              Cost up {change}% since your last buy ({formatCurrency(product.buyPrice)} → {formatCurrency(cost as number)}).
                              {keepPrice !== null && keepPrice > product.sellPrice && (
                                <> To keep your margin, sell at about <strong className="tabular-nums">{formatCurrency(keepPrice)}</strong> (now {formatCurrency(product.sellPrice)}).</>
                              )}
                            </span>
                          </p>
                        )}
                        {valid && change !== null && change < -0.5 && (
                          <p className="flex items-center gap-1 text-emerald-800">
                            <TrendingDown className="h-4 w-4" /> Cost down {Math.abs(change)}% since your last buy.
                          </p>
                        )}
                        {valid && (
                          <p className="text-slate-600 tabular-nums">
                            Line total: <strong>{formatCurrency(Math.round((qty as number) * (cost as number) * 100) / 100)}</strong>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-slate-400 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Add another item
              </button>

              {billTotalDiffers && scan?.billTotal != null && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                  The bill's total is {formatCurrency(scan.billTotal)}, but these lines add up to {formatCurrency(total)}. A
                  line may have been misread.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer: total + save (review only) */}
        {stage === "review" && (
          <div className="border-t border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-sm text-slate-600">
                {included.length} item{included.length === 1 ? "" : "s"}
                {skippedCount > 0 && ` · ${skippedCount} skipped`}
              </span>
              <span className="text-2xl font-semibold tabular-nums text-slate-900">{formatCurrency(total)}</span>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              aria-busy={saving}
              className={`w-full min-h-[52px] rounded-lg text-base font-semibold text-white transition-colors ${
                canSave ? "bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950" : "cursor-not-allowed bg-slate-300 text-slate-600"
              }`}
            >
              {saving ? "Saving…" : included.length === 0 ? "Choose at least one product" : "Save purchase & raise stock"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
