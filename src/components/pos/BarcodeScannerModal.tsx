import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { audio } from "@/lib/audio";
import { X, Camera, Scan, Check } from "lucide-react";

interface BarcodeScannerModalProps {
  onScanItem: (productId: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onScanItem }) => {
  const { isBarcodeScannerOpen, setIsBarcodeScannerOpen, products } = useApp();

  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  if (!isBarcodeScannerOpen) return null;

  const simulateScan = (barcode: string) => {
    audio.playLaserScan();
    setTimeout(() => {
      audio.playBarcodeBeep();
      setScannedCode(barcode);
      const product = products.find((p) => p.barcode === barcode);
      if (product) {
        onScanItem(product.id);
      }
      setTimeout(() => {
        setIsBarcodeScannerOpen(false);
        setScannedCode(null);
      }, 900);
    }, 400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    simulateScan(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 text-white p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={() => setIsBarcodeScannerOpen(false)}
          className="absolute end-4 top-4 h-8 w-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 mb-2">
            <Camera className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Camera Barcode Scanner</h3>
          <p className="text-xs text-slate-400">Position commodity barcode within camera viewport</p>
        </div>

        {/* Viewfinder Camera Simulation */}
        <div className="relative aspect-square w-full rounded-2xl bg-black border-2 border-slate-700 overflow-hidden flex items-center justify-center mb-5">
          {/* Viewfinder Grid overlay */}
          <div className="absolute inset-4 border border-emerald-500/50 rounded-xl pointer-events-none">
            {/* Corner brackets */}
            <span className="absolute top-0 start-0 h-4 w-4 border-t-2 border-s-2 border-emerald-400" />
            <span className="absolute top-0 end-0 h-4 w-4 border-t-2 border-e-2 border-emerald-400" />
            <span className="absolute bottom-0 start-0 h-4 w-4 border-b-2 border-s-2 border-emerald-400" />
            <span className="absolute bottom-0 end-0 h-4 w-4 border-b-2 border-e-2 border-emerald-400" />
          </div>

          {/* Animated Laser Scanning Line */}
          <div 
            className="absolute start-6 end-6 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse"
            style={{
              animation: "scanLine 2s infinite ease-in-out",
            }}
          />

          <style>{`
            @keyframes scanLine {
              0% { top: 20%; opacity: 0.8; }
              50% { top: 80%; opacity: 1; }
              100% { top: 20%; opacity: 0.8; }
            }
          `}</style>

          {/* Scanned Feedback */}
          {scannedCode ? (
            <div className="z-10 rounded-xl bg-emerald-800/90 text-white px-4 py-2 text-xs font-bold flex items-center gap-2">
              <Check className="h-4 w-4 text-amber-300" />
              <span>Barcode Recognized! Added to Cart</span>
            </div>
          ) : (
            <div className="text-center p-4 text-slate-500">
              <Scan className="h-10 w-10 mx-auto mb-1 text-slate-600 animate-pulse" />
              <p className="text-xs">Align item barcode</p>
            </div>
          )}
        </div>

        {/* 1-Tap Sample Commodity Barcodes */}
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-400 mb-1.5 text-center">
            Or Tap Test Commodity Barcode:
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => simulateScan("896101412001")}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-xs font-bold text-slate-200 text-center transition-colors min-h-[44px]"
            >
              Tapal Tea (450g)
            </button>
            <button
              onClick={() => simulateScan("896101412007")}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-xs font-bold text-slate-200 text-center transition-colors min-h-[44px]"
            >
              Dalda Oil (1L)
            </button>
            <button
              onClick={() => simulateScan("896101412020")}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-xs font-bold text-slate-200 text-center transition-colors min-h-[44px]"
            >
              MilkPak (1L)
            </button>
          </div>
        </div>

        {/* Manual Barcode Input Fallback */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Type barcode digits..."
            className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
};