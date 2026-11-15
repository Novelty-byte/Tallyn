import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { toLocalYmd } from "@/domain/credit";
import { buildStoreSnapshot } from "@/domain/storeSnapshot";
import { pickRadioVoice, radioBriefing, radioFacts, type RadioLanguage } from "@/domain/radioBriefing";
import { askRadioTip, type RadioTip } from "@/services/tallynAi";
import { supabase } from "@/services/supabaseClient";
import { X, Play, Square, Radio, Volume2, AlertTriangle, TrendingUp, Users, Sparkles, Loader2 } from "lucide-react";

// ============================================================
// Kiryana Radio: a spoken daily briefing.
// Numbers come from domain/radioBriefing (code, Rule 1). Gemini adds one "tip of the day"
// through ai-gateway; if that fails the briefing plays without it (Rule 5).
// Speech uses the browser's voices: English, or Urdu read by an Urdu voice, a Hindi voice
// (Devanagari Hindustani) or, failing both, an English voice reading Roman Urdu.
// ============================================================

const LANG_KEY = "tallyn.radio.lang";
const TIP_WAIT_MS = 8000;

function readLang(): RadioLanguage {
  try {
    return localStorage.getItem(LANG_KEY) === "ur" ? "ur" : "en";
  } catch {
    return "en";
  }
}

function useSpeechVoices(active: boolean): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!active || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [active]);
  return voices;
}

/** Display line + spoken line for one part of the broadcast. */
interface Segment {
  shown: string;
  spoken: string;
  kind: "data" | "tip" | "closing";
}

export const KiryanaRadioModal: React.FC = () => {
  const { t } = useTranslation();
  const { isKiryanaRadioOpen, setIsKiryanaRadioOpen, sales, customers, products, shop, expenses, isDemoMode } = useApp();

  const [lang, setLang] = useState<RadioLanguage>(readLang);
  const [isPlaying, setIsPlaying] = useState(false);
  /** Data sentence index, or the tip / closing line, being read now. */
  const [current, setCurrent] = useState<number | "tip" | "closing" | null>(null);
  const [tip, setTip] = useState<{ key: string; status: "loading" | "ready" | "failed"; data?: RadioTip } | null>(null);
  const [bars, setBars] = useState<number[]>(() => [40, 70, 95, 60, 80, 50, 90, 65, 85, 45, 75, 55, 90, 60]);

  const animFrameRef = useRef<number | null>(null);
  const runIdRef = useRef(0);
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]); // keeps Chrome from GC-ing live utterances
  const tipPromiseRef = useRef<{ key: string; promise: Promise<RadioTip | null> } | null>(null);
  const transcriptRef = useRef<HTMLOListElement>(null);

  const voices = useSpeechVoices(isKiryanaRadioOpen);
  const { voice, script } = useMemo(() => pickRadioVoice(voices, lang), [voices, lang]);

  const today = toLocalYmd();
  const facts = useMemo(
    () => radioFacts({ shop, products, customers, sales, today }),
    [shop, products, customers, sales, today],
  );
  const shown = useMemo(() => radioBriefing(facts, lang, "latin"), [facts, lang]);
  const spoken = useMemo(() => radioBriefing(facts, lang, script), [facts, lang, script]);
  const tipKey = `${shop.id}|${today}|${lang}|${lang === "en" ? "latin" : script}`;
  const tipForKey = tip?.key === tipKey ? tip : null;

  const segments: Segment[] = useMemo(() => {
    const list: Segment[] = shown.sentences.map((s, i) => ({ shown: s, spoken: spoken.sentences[i] ?? s, kind: "data" }));
    if (tipForKey?.status === "ready" && tipForKey.data) {
      list.push({
        shown: tipForKey.data.text,
        spoken: `${spoken.tipIntro} ${tipForKey.data.spoken ?? tipForKey.data.text}`,
        kind: "tip",
      });
    }
    list.push({ shown: shown.closing, spoken: spoken.closing, kind: "closing" });
    return list;
  }, [shown, spoken, tipForKey]);

  // Stop speaking if the modal closes or unmounts.
  useEffect(() => {
    if (!isKiryanaRadioOpen) stopAll();
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKiryanaRadioOpen]);

  // Keep the line being read in view.
  useEffect(() => {
    if (current === null) return;
    transcriptRef.current?.querySelector<HTMLElement>(`[data-seg="${current}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current]);

  if (!isKiryanaRadioOpen) return null;

  // ── AI tip (cached per shop, day, language and voice script) ─────────────
  const loadTip = (): Promise<RadioTip | null> => {
    if (tipPromiseRef.current?.key === tipKey) return tipPromiseRef.current.promise;
    const cacheKey = `tallyn.radio.tip.${tipKey}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached) as RadioTip;
        setTip({ key: tipKey, status: "ready", data });
        const promise = Promise.resolve(data);
        tipPromiseRef.current = { key: tipKey, promise };
        return promise;
      }
    } catch {
      /* storage unavailable: fetch instead */
    }
    setTip({ key: tipKey, status: "loading" });
    const key = tipKey;
    const promise = (async () => {
      try {
        const accessToken = isDemoMode ? null : (await supabase.auth.getSession()).data.session?.access_token ?? null;
        const data = await askRadioTip({
          language: lang === "ur" ? "Urdu" : "English",
          script,
          snapshot: buildStoreSnapshot({ shop, products, customers, sales, expenses }),
          accessToken,
        });
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
          /* ignore */
        }
        setTip((prev) => (prev?.key === key ? { key, status: "ready", data } : prev));
        return data;
      } catch {
        setTip((prev) => (prev?.key === key ? { key, status: "failed" } : prev));
        return null;
      }
    })();
    tipPromiseRef.current = { key, promise };
    return promise;
  };

  // ── Speech ────────────────────────────────────────────────────────────────
  const speakOne = (text: string, runId: number): Promise<void> =>
    new Promise((resolve) => {
      if (runIdRef.current !== runId) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? (lang === "ur" ? "ur-PK" : "en-US");
      u.rate = 0.95;
      const done = () => {
        utterancesRef.current = utterancesRef.current.filter((x) => x !== u);
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      utterancesRef.current.push(u);
      window.speechSynthesis.speak(u);
    });

  const startBarAnimation = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBars(Array(14).fill(24));
      return;
    }
    let last = 0;
    const animate = (ts: number) => {
      if (ts - last > 110) {
        last = ts;
        setBars((prev) => prev.map(() => Math.floor(Math.random() * 80) + 12));
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  };

  function stopAll() {
    runIdRef.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    utterancesRef.current = [];
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    setBars(Array(14).fill(8));
    setIsPlaying(false);
    setCurrent(null);
  }

  const handlePlay = async () => {
    if (!("speechSynthesis" in window)) return;
    stopAll();
    const runId = ++runIdRef.current;
    setIsPlaying(true);
    startBarAnimation();
    const tipPromise = loadTip(); // usually ready by the time the numbers are read

    const data = segments.filter((s) => s.kind === "data");
    for (let i = 0; i < data.length; i++) {
      if (runIdRef.current !== runId) return;
      setCurrent(i);
      await speakOne(data[i].spoken, runId);
    }

    const tipData = await Promise.race([
      tipPromise,
      new Promise<null>((r) => window.setTimeout(() => r(null), TIP_WAIT_MS)),
    ]);
    if (runIdRef.current !== runId) return;
    if (tipData) {
      setCurrent("tip");
      await speakOne(`${spoken.tipIntro} ${tipData.spoken ?? tipData.text}`, runId);
    }
    if (runIdRef.current !== runId) return;
    setCurrent("closing");
    await speakOne(spoken.closing, runId);
    if (runIdRef.current === runId) stopAll();
  };

  const chooseLang = (next: RadioLanguage) => {
    if (next === lang) return;
    stopAll();
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const handleClose = () => {
    stopAll();
    setIsKiryanaRadioOpen(false);
  };

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const voiceNote =
    lang === "ur" && voices.length > 0
      ? script === "urdu"
        ? `Urdu voice: ${voice?.name}`
        : script === "devanagari"
          ? `${voice?.name} reads the Urdu briefing`
          : "No Urdu or Hindi voice on this device, so an English voice reads the Roman Urdu."
      : voice
        ? `Voice: ${voice.name}`
        : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-700/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="radio-title"
    >
      <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-slate-900 text-white p-5 sm:p-7 shadow-lift border border-slate-800 soft-panel">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-700/40">
              <Radio className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id="radio-title" className="text-base font-semibold text-white">{t("radio.title")}</h3>
              <p className="text-xs text-slate-400 truncate">{shop.name} • {facts.city}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
            aria-label="Close Kiryana Radio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Language */}
        <div className="mb-4">
          <div role="radiogroup" aria-label="Briefing language" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
            {([
              { id: "en", label: "English", hint: "Plain English" },
              { id: "ur", label: "Urdu", hint: "Easy Urdu + English words" },
            ] as const).map((o) => (
              <button
                key={o.id}
                role="radio"
                aria-checked={lang === o.id}
                onClick={() => chooseLang(o.id)}
                className={`min-h-[48px] rounded-lg px-3 py-1.5 text-left ${
                  lang === o.id ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="block text-sm font-semibold leading-tight">{o.label}</span>
                <span className={`block text-xs leading-tight ${lang === o.id ? "text-slate-900" : "text-slate-400"}`}>{o.hint}</span>
              </button>
            ))}
          </div>
          {voiceNote && (
            <p className={`mt-1.5 text-xs ${lang === "ur" && script === "latin" ? "text-amber-300" : "text-slate-400"}`}>{voiceNote}</p>
          )}
        </div>

        {/* Live branch metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Today's Sales</p>
            <p className="text-xs font-bold text-emerald-300 font-mono tabular-nums">{formatCurrency(facts.revenue)}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
            <Users className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Udhaar</p>
            <p className="text-xs font-bold text-amber-300 font-mono tabular-nums">{formatCurrency(facts.udhaarTotal)}</p>
          </div>
          <div className={`rounded-xl p-2.5 text-center ${facts.lowStockCount > 0 ? "bg-rose-950/50 border border-rose-800/40" : "bg-slate-800/60"}`}>
            <AlertTriangle className={`h-3.5 w-3.5 mx-auto mb-1 ${facts.lowStockCount > 0 ? "text-rose-400" : "text-slate-500"}`} />
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Low Stock</p>
            <p className={`text-xs font-bold font-mono tabular-nums ${facts.lowStockCount > 0 ? "text-rose-300" : "text-slate-400"}`}>
              {facts.lowStockCount} items
            </p>
          </div>
        </div>

        {/* Waveform */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 pt-4 pb-3 mb-3" aria-hidden="true">
          <div className="flex items-center justify-center gap-1.5 h-12">
            {bars.map((h, i) => (
              <span
                key={i}
                style={{ height: isPlaying ? `${Math.round(h * 0.75)}px` : "8px", transition: isPlaying ? "height 120ms ease" : "height 300ms ease" }}
                className={`w-1.5 rounded-full ${isPlaying ? "bg-amber-400" : "bg-slate-700"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-xs font-medium">
            {isPlaying ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
                <Volume2 className="h-4 w-4" /> On air: {shop.name}
              </span>
            ) : (
              <span className="text-slate-400">Tap play to hear today's briefing</span>
            )}
          </p>
        </div>

        {/* Transcript */}
        <ol
          ref={transcriptRef}
          aria-label="Briefing transcript"
          className="mb-4 max-h-44 overflow-y-auto rounded-xl border border-slate-800 bg-slate-800/30 p-2 space-y-1 text-sm leading-relaxed"
        >
          {segments.map((s, i) => {
            const segId = s.kind === "data" ? i : s.kind;
            const active = current === segId;
            return (
              <li
                key={`${s.kind}-${i}`}
                data-seg={segId}
                className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                  active ? "bg-amber-100 text-amber-950 ring-1 ring-amber-400" : s.kind === "tip" ? "bg-emerald-50 text-emerald-950" : "text-slate-300"
                }`}
              >
                {s.kind === "tip" && (
                  <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    <Sparkles className="h-3 w-3" /> {lang === "ur" ? "Aaj ka mashwara · AI" : "Today's tip · AI"}
                  </span>
                )}
                {s.shown}
              </li>
            );
          })}
          {tipForKey?.status === "loading" && (
            <li className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gemini is writing today's tip…
            </li>
          )}
          {tipForKey?.status === "failed" && (
            <li className="px-2.5 py-1.5 text-xs text-slate-400">The AI tip isn't available right now. Your numbers are still read out in full.</li>
          )}
        </ol>

        {/* Controls */}
        <div className="flex gap-3">
          {!isPlaying ? (
            <button
              onClick={handlePlay}
              disabled={!speechSupported}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-sm font-semibold text-slate-950 transition-all shadow-md min-h-[48px] disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              <span>{lang === "ur" ? "Briefing Sunein" : t("radio.playBriefing")}</span>
            </button>
          ) : (
            <button
              onClick={stopAll}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-600 py-3.5 text-sm font-semibold text-white transition-all shadow-md min-h-[48px]"
            >
              <Square className="h-4 w-4 fill-white" />
              <span>Stop</span>
            </button>
          )}
          <button
            onClick={handleClose}
            className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 text-sm font-semibold text-slate-800 transition-colors min-h-[48px]"
          >
            Close
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-3 leading-relaxed">
          {speechSupported
            ? "Numbers are read from your store data. The tip is written by Gemini."
            : "This browser can't speak. You can still read the briefing above."}
        </p>
      </div>
    </div>
  );
};
