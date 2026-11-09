import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { audio } from "@/lib/audio";
import { formatCurrency } from "@/lib/utils";
import { X, Play, Square, Radio, Sparkles, Volume2 } from "lucide-react";

export const KiryanaRadioModal: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === "ur";
  const { isKiryanaRadioOpen, setIsKiryanaRadioOpen, sales, customers, products } = useApp();

  const [isPlaying, setIsPlaying] = useState(false);

  if (!isKiryanaRadioOpen) return null;

  const totalRev = sales.reduce((s, x) => s + x.totalAmount, 0);
  const overdueDebt = customers.filter((c) => (c.overdueDays || 0) > 7).reduce((s, c) => s + c.creditBalance, 0);
  const lowStockCount = products.filter((p) => p.quantity <= p.minQuantity).length;

  const briefingTextUrdu = `السلام علیکم حاجی صاحب! آج صبح کا احوال یہ ہے کہ دکان پر کل فروخت ${formatCurrency(totalRev)} ریکارڈ ہوئی ہے۔ مارکیٹ میں پچھلے سات دنوں کا ادھار ${formatCurrency(overdueDebt)} واجب الوصول ہے، جن کے لئے شائستہ واٹس ایپ یاد دہانی تیار ہے۔ اس کے علاوہ گودام میں ${lowStockCount} اشیاء کا اسٹاک کم ہے جنہیں آج ہی سپلائر سے دوبارہ منگوا لیجئے۔ آپ کا دن بابرکت گزرے۔`;

  const briefingTextEn = `Good morning Haji Aslam! Here is your daily Kiryana Radio briefing. Recorded sales stand at ${formatCurrency(totalRev)}. Overdue credit across neighbourhood accounts totals ${formatCurrency(overdueDebt)}, with one-click WhatsApp collection reminders ready. Additionally, ${lowStockCount} commodities are near depletion and require supplier restock today. Have a prosperous trading day.`;

  const handlePlayAudio = async () => {
    setIsPlaying(true);
    const textToSpeak = isUrdu ? briefingTextUrdu : briefingTextEn;
    const lang = isUrdu ? "ur" : "en";
    await audio.speak(textToSpeak, lang);
    setIsPlaying(false);
  };

  const handleStopAudio = () => {
    audio.stopSpeaking();
    setIsPlaying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t("radio.title")}</h3>
              <p className="text-xs text-slate-400">{t("radio.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleStopAudio();
              setIsKiryanaRadioOpen(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Audio Visualizer Waves */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center my-6">
          <div className="flex items-center justify-center gap-1.5 h-16 mb-4">
            {[40, 70, 95, 60, 80, 50, 90, 65, 85, 45, 75, 55, 90, 60].map((h, i) => (
              <span
                key={i}
                style={{
                  height: isPlaying ? `${Math.max(12, Math.random() * h)}px` : "8px",
                  transition: "height 150ms ease",
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
                Playing Daily Morning Executive Memo
              </span>
            ) : (
              "Tap play to listen to today's voice synthesized store briefing"
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3">
          {!isPlaying ? (
            <button
              onClick={handlePlayAudio}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition-all shadow-md min-h-[48px]"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              <span>{t("radio.playBriefing")}</span>
            </button>
          ) : (
            <button
              onClick={handleStopAudio}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3.5 text-xs font-black text-white hover:bg-rose-500 transition-all shadow-md min-h-[48px]"
            >
              <Square className="h-4 w-4 fill-white" />
              <span>{t("radio.stopAudio")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
