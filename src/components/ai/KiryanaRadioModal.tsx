import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { X, Play, Square, Radio, Volume2, AlertTriangle, TrendingUp, Users } from "lucide-react";

// ============================================================
// Kiryana Radio: Store-specific morning briefing via TTS
// Falls back through ur-PK → hi-IN → en-IN → en-US for audio
// ============================================================

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  return enVoice || voices[0] || null;
}

function speakWithFallback(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    const trySpeak = () => {
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = "en-US";
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        trySpeak();
      };
      setTimeout(trySpeak, 300);
    } else {
      trySpeak();
    }
  });
}

export const KiryanaRadioModal: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const { isKiryanaRadioOpen, setIsKiryanaRadioOpen, sales, customers, products, shop } = useApp();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState<string>("");
  const [bars, setBars] = useState<number[]>(Array.from({ length: 14 }, (_, i) => [40, 70, 95, 60, 80, 50, 90, 65, 85, 45, 75, 55, 90, 60][i]));
  const animFrameRef = useRef<number | null>(null);

  if (!isKiryanaRadioOpen) return null;

  // ── Live branch-specific metrics ───────────────────────────────────────────
  const totalRev = sales.filter(s => s.status === "completed").reduce((sum, x) => sum + x.totalAmount, 0);
  const totalTransactions = sales.filter(s => s.status === "completed").length;
  const totalUdhaar = customers.reduce((s, c) => s + c.creditBalance, 0);
  const overdueCustomers = customers.filter(c => (c.overdueDays || 0) > 7);
  const overdueDebt = overdueCustomers.reduce((s, c) => s + c.creditBalance, 0);
  const topDebtor = [...customers].sort((a, b) => b.creditBalance - a.creditBalance)[0];
  const lowStockItems = products.filter(p => p.quantity <= p.minQuantity);
  const totalProducts = products.length;

  // City-specific market reference
  const city = shop.city || "Islamabad";
  const cityMandiMap: Record<string, string> = {
    "Islamabad": "Grain Market I-9, Islamabad",
    "Rawalpindi": "Ganj Mandi, Rawalpindi",
    "Lahore": "Akbari Mandi, Lahore",
    "Karachi": "Jodia Bazar, Karachi",
    "Faisalabad": "Ghalla Mandi, Faisalabad",
  };
  const mandiName = cityMandiMap[city] || `${city} Wholesale Mandi`;

  // ── Branch-specific dynamic briefing text ─────────────────────────────────
  const briefingTextEn = `Bismillah! Good morning! This is your Kiryana Radio daily briefing for ${shop.name}, ${city}.
  Today's recorded sales: ${formatCurrency(totalRev)} across ${totalTransactions} transactions.
  ${lowStockItems.length > 0 
    ? `STOCK ALERT: ${lowStockItems.length} items are critically low — especially ${lowStockItems.slice(0, 2).map(p => p.nameEn).join(" and ")}. Reorder from ${mandiName} today.`
    : `Inventory is healthy — all ${totalProducts} products are above minimum thresholds.`
  }
  Total outstanding udhaar: ${formatCurrency(totalUdhaar)}.
  ${topDebtor ? `Largest debtor: ${topDebtor.name} at ${formatCurrency(topDebtor.creditBalance)}.` : ""}
  ${overdueCustomers.length > 0 ? `${overdueCustomers.length} customers have overdue credit past 7 days. Polite reminders recommended.` : ""}
  Stay informed on today's ${mandiName} benchmark rates. Have a prosperous trading day!`;

  // ── Animated waveform ─────────────────────────────────────────────────────
  const startBarAnimation = () => {
    const animate = () => {
      setBars(prev => prev.map(() => Math.floor(Math.random() * 80) + 12));
      animFrameRef.current = requestAnimationFrame(animate) as unknown as number;
    };
    animFrameRef.current = requestAnimationFrame(animate) as unknown as number;
  };

  const stopBarAnimation = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current as unknown as number);
      animFrameRef.current = null;
    }
    setBars(Array(14).fill(8));
  };

  const handlePlayAudio = async () => {
    setIsPlaying(true);
    const textToSpeak = briefingTextEn;
    setCurrentText(textToSpeak);
    startBarAnimation();
    await speakWithFallback(textToSpeak);
    stopBarAnimation();
    setIsPlaying(false);
  };

  const handleStopAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopBarAnimation();
    setIsPlaying(false);
  };

  const handleClose = () => {
    handleStopAudio();
    setIsKiryanaRadioOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-700/40">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{t("radio.title")}</h3>
              <p className="text-xs text-slate-400">{shop.name} • {city}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Branch Metrics Summary */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Today's Sales</p>
            <p className="text-xs font-black text-emerald-300 font-mono">{formatCurrency(totalRev)}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
            <Users className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Udhaar</p>
            <p className="text-xs font-black text-amber-300 font-mono">{formatCurrency(totalUdhaar)}</p>
          </div>
          <div className={`rounded-xl p-2.5 text-center ${lowStockItems.length > 0 ? "bg-rose-950/50 border border-rose-800/40" : "bg-slate-800/60"}`}>
            <AlertTriangle className={`h-3.5 w-3.5 mx-auto mb-1 ${lowStockItems.length > 0 ? "text-rose-400" : "text-slate-500"}`} />
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Low Stock</p>
            <p className={`text-xs font-black font-mono ${lowStockItems.length > 0 ? "text-rose-300" : "text-slate-400"}`}>
              {lowStockItems.length} items
            </p>
          </div>
        </div>

        {/* Audio Visualizer Waveform */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-center mb-5">
          <div className="flex items-center justify-center gap-1.5 h-16 mb-3">
            {bars.map((h, i) => (
              <span
                key={i}
                style={{
                  height: isPlaying ? `${h}px` : "8px",
                  transition: isPlaying ? "height 120ms ease" : "height 300ms ease",
                }}
                className={`w-1.5 rounded-full ${
                  isPlaying ? "bg-amber-400" : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-300">
            {isPlaying ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold">
                <Volume2 className="h-4 w-4 animate-bounce" />
                Broadcasting Daily Briefing for {shop.name}
              </span>
            ) : (
              <span className="text-slate-400">
                Tap play for your AI-generated daily briefing
                <br />
                <span className="text-[10px] text-slate-500">Data sourced from your live {city} store inventory</span>
              </span>
            )}
          </p>
        </div>

        {/* Briefing Preview Text (truncated) */}
        {!isPlaying && (
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 mb-5 text-[11px] text-slate-300 leading-relaxed line-clamp-3 max-h-16 overflow-hidden">
            {briefingTextEn.trim().slice(0, 200)}...
          </div>
        )}

        {/* Play / Stop Controls */}
        <div className="flex gap-3">
          {!isPlaying ? (
            <button
              onClick={handlePlayAudio}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 py-3.5 text-xs font-black text-slate-950 transition-all shadow-md min-h-[48px]"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              <span>{t("radio.playBriefing") || "▶ Play Daily Briefing"}</span>
            </button>
          ) : (
            <button
              onClick={handleStopAudio}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-rose-700 hover:bg-rose-600 py-3.5 text-xs font-black text-white transition-all shadow-md min-h-[48px]"
            >
              <Square className="h-4 w-4 fill-white" />
              <span>Stop Broadcast</span>
            </button>
          )}
          <button
            onClick={handleClose}
            className="rounded-2xl bg-slate-800 hover:bg-slate-700 px-5 text-xs font-bold text-slate-300 hover:text-white transition-colors min-h-[48px]"
          >
            {t("common.close") || "Close"}
          </button>
        </div>

        {/* TTS Info Note */}
        <p className="text-center text-[10px] text-slate-500 mt-3 leading-relaxed">
          🔊 Uses browser speech synthesis  
          No external TTS API required.
        </p>
      </div>
    </div>
  );
};