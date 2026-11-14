import React, { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { createScanGate, findProductByBarcode, normalizeBarcode } from "@/lib/barcode";
import { startCameraScanner, CameraError, type RunningScanner } from "@/lib/barcodeCamera";
import { X, Camera, Check, AlertTriangle, PackageX, Flashlight, FlashlightOff, Keyboard } from "lucide-react";

export type AddToCartResult =
  | { status: "added"; name: string; inCart: number }
  | { status: "out_of_stock"; name: string; inCart: number }
  | { status: "not_found" };

interface BarcodeScannerModalProps {
  /** Adds one unit of the product to the cart and reports what happened. */
  onScanItem: (productId: string) => AddToCartResult;
}

type FeedTone = "ok" | "warn" | "bad";
interface FeedItem { id: number; text: string; tone: FeedTone }

let feedSeq = 0;

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onScanItem }) => {
  const { isBarcodeScannerOpen, setIsBarcodeScannerOpen, products, isDemoMode } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<RunningScanner | null>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [manualCode, setManualCode] = useState("");

  // Latest values for the long-lived camera callback (no camera restart on re-render).
  const productsRef = useRef(products);
  productsRef.current = products;
  const onScanRef = useRef(onScanItem);
  onScanRef.current = onScanItem;

  const pushFeed = (text: string, tone: FeedTone) =>
    setFeed((prev) => [{ id: feedSeq++, text, tone }, ...prev].slice(0, 4));

  /** Shared by camera reads and the typed-code box. */
  const handleCode = (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!code) return;
    const product = findProductByBarcode(productsRef.current, code);
    if (!product) {
      try { navigator.vibrate?.([40, 60, 40]); } catch { /* no haptics */ }
      pushFeed(`Barcode ${code} isn't in your stock`, "bad");
      return;
    }
    const r = onScanRef.current(product.id);
    if (r.status === "added") pushFeed(`${r.name} added · ${r.inCart} in cart`, "ok");
    else if (r.status === "out_of_stock") pushFeed(`No more ${r.name} in stock (${r.inCart} already in cart)`, "warn");
    else pushFeed(`Barcode ${code} isn't in your stock`, "bad");
  };
  const handleCodeRef = useRef(handleCode);
  handleCodeRef.current = handleCode;

  const close = () => setIsBarcodeScannerOpen(false);

  // Start the camera when the sheet opens; ALWAYS release it when it closes.
  useEffect(() => {
    if (!isBarcodeScannerOpen) return;
    let cancelled = false;
    const gate = createScanGate(1500);
    setStatus("starting");
    setCameraError(null);
    setFeed([]);
    setTorchOn(false);
    setHasTorch(false);

    const video = videoRef.current;
    if (!video) return;
    startCameraScanner(video, (code) => {
      if (gate.accept(code, performance.now())) handleCodeRef.current(code);
    })
      .then((scanner) => {
        if (cancelled) {
          scanner.stop();
          return;
        }
        scannerRef.current = scanner;
        setHasTorch(Boolean(scanner.setTorch));
        setStatus("scanning");
      })
      .catch((err) => {
        if (cancelled) return;
        setCameraError(err instanceof CameraError ? err.message : "The camera couldn't start. You can type the barcode instead.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current = null;
    };
  }, [isBarcodeScannerOpen]);

  // Escape closes.
  useEffect(() => {
    if (!isBarcodeScannerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsBarcodeScannerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isBarcodeScannerOpen, setIsBarcodeScannerOpen]);

  if (!isBarcodeScannerOpen) return null;

  const toggleTorch = async () => {
    const s = scannerRef.current;
    if (!s?.setTorch) return;
    try {
      await s.setTorch(!torchOn);
      setTorchOn(!torchOn);
    } catch {
      setHasTorch(false);
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCode(manualCode);
    setManualCode("");
  };

  // Demo shop only: real barcodes from the current branch, for laptops without a camera.
  const demoSamples = isDemoMode ? products.filter((p) => p.barcode && p.quantity > 0).slice(0, 3) : [];

  const toneClass: Record<FeedTone, string> = {
    ok: "bg-emerald-900/80 text-emerald-50 border-emerald-500/60",
    warn: "bg-amber-900/80 text-amber-50 border-amber-500/60",
    bad: "bg-rose-950/80 text-rose-50 border-rose-500/60",
  };
  const toneIcon: Record<FeedTone, React.ReactNode> = {
    ok: <Check className="h-4 w-4 shrink-0 text-emerald-300" />,
    warn: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />,
    bad: <PackageX className="h-4 w-4 shrink-0 text-rose-300" />,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-title"
    >
      <div className="flex h-[100dvh] w-full flex-col bg-slate-900 text-white sm:h-auto sm:max-h-[94vh] sm:max-w-md sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <Camera className="h-5 w-5" />
            </span>
            <div>
              <h3 id="barcode-title" className="text-base font-semibold">Scan barcodes</h3>
              <p className="text-xs text-slate-400">Each scan adds one item to the cart</p>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Close scanner"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Live camera */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-slate-700 bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-label="Camera view" />

            {status === "scanning" && (
              <>
                {/* Aim box */}
                <div className="pointer-events-none absolute inset-x-[10%] top-[28%] bottom-[28%] rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                  <span className="scan-laser" aria-hidden="true" />
                </div>
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    aria-pressed={torchOn}
                    aria-label={torchOn ? "Turn flashlight off" : "Turn flashlight on"}
                    className="absolute end-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
                  </button>
                )}
              </>
            )}

            {status === "starting" && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300" role="status">
                Starting camera…
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center" role="alert">
                <AlertTriangle className="h-7 w-7 text-amber-400" />
                <p className="text-sm text-slate-200">{cameraError}</p>
              </div>
            )}
          </div>

          <p className="mt-2 text-center text-xs text-slate-400">
            {status === "scanning" ? "Hold the barcode flat inside the box, 10–20 cm from the camera." : " "}
          </p>

          {/* Scan results */}
          <ul className="mt-2 space-y-1.5" aria-live="polite">
            {feed.map((f, i) => (
              <li
                key={f.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${toneClass[f.tone]} ${i > 0 ? "opacity-60" : ""}`}
              >
                {toneIcon[f.tone]}
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          {/* Typed barcode */}
          <form onSubmit={submitManual} className="mt-4">
            <label htmlFor="manual-barcode" className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Keyboard className="h-3.5 w-3.5" /> Or type the barcode numbers
            </label>
            <div className="flex gap-2">
              <input
                id="manual-barcode"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 8961014120010"
                className="min-h-[44px] flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 text-base tabular-nums text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-hidden"
              />
              <button type="submit" className="min-h-[44px] rounded-xl bg-emerald-700 px-4 text-sm font-semibold hover:bg-emerald-600">
                Add
              </button>
            </div>
          </form>

          {demoSamples.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs text-slate-400">No barcode handy? Try one from the demo shop:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {demoSamples.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleCode(p.barcode!)}
                    className="min-h-[44px] rounded-lg bg-slate-800 p-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    {p.nameEn}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={close}
            className="min-h-[52px] w-full rounded-xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-500"
          >
            Done — back to cart
          </button>
        </div>
      </div>
    </div>
  );
};
