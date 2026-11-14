import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * FxProvider — owns the "Calm Tech" visual preferences and the delegated
 * pointer-interaction layer (spotlight, tilt, magnetic, click-ping, cursor dot).
 *
 * Interactions are driven by data attributes so any element can opt in without
 * React state or re-renders:
 *   data-fx="tilt"          card tilts toward the pointer (≤ 5°)
 *   data-fx="magnetic"      button leans toward the pointer within 70px
 *   data-fx="spot"          soft green sheen follows the pointer (all .surface-l1 too)
 *   data-fx="cursor-zone"   shows the soft cursor dot (desktop only)
 *
 * Everything is disabled automatically for reduced-motion, data-saver, very
 * low-memory devices, or when the user switches on "Calm motion".
 */

export type PaletteId = "meadow" | "dusk" | "harvest" | "slate";

export const PALETTES: { id: PaletteId; label: string; swatches: [string, string, string] }[] = [
  { id: "meadow", label: "Meadow", swatches: ["#166534", "#ddf1e4", "#fbe3c8"] },
  { id: "dusk", label: "Dusk-light", swatches: ["#2f6b9a", "#dcebf7", "#fff4cc"] },
  { id: "harvest", label: "Harvest", swatches: ["#b45f06", "#fff4cc", "#fbe3c8"] },
  { id: "slate", label: "Slate-sage", swatches: ["#3d4a45", "#e3e7e5", "#ddf1e4"] },
];

interface FxContextValue {
  palette: PaletteId;
  setPalette: (p: PaletteId) => void;
  calm: boolean;
  setCalm: (v: boolean) => void;
  /** True when ambient motion/interactions are actually running. */
  fxActive: boolean;
}

const FxContext = createContext<FxContextValue | undefined>(undefined);

const read = (key: string): string | null => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string) => {
  try { window.localStorage.setItem(key, value); } catch { /* storage may be blocked */ }
};

function deviceWantsLessMotion(): boolean {
  if (typeof window === "undefined") return false;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return Boolean(reduced || nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2));
}

export const FxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [palette, setPaletteState] = useState<PaletteId>(() => {
    const saved = read("tallyn.palette") as PaletteId | null;
    return saved && PALETTES.some((p) => p.id === saved) ? saved : "meadow";
  });
  const [calm, setCalmState] = useState<boolean>(() => read("tallyn.calm") === "1");
  const [deviceLimited, setDeviceLimited] = useState<boolean>(deviceWantsLessMotion);

  const fxActive = !calm && !deviceLimited;

  const setPalette = useCallback((p: PaletteId) => { setPaletteState(p); write("tallyn.palette", p); }, []);
  const setCalm = useCallback((v: boolean) => { setCalmState(v); write("tallyn.calm", v ? "1" : "0"); }, []);

  // Reflect preferences on <html> so pure-CSS can react.
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);
  useEffect(() => {
    document.documentElement.dataset.fx = fxActive ? "on" : "off";
  }, [fxActive]);

  // Track live changes of the OS reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const handler = () => setDeviceLimited(deviceWantsLessMotion());
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // Delegated pointer interactions.
  useEffect(() => {
    if (!fxActive) return;
    const finePointer = window.matchMedia?.("(pointer: fine)").matches ?? true;

    let frame = 0;
    let lastEvent: PointerEvent | null = null;
    let cursor: HTMLDivElement | null = null;

    const ensureCursor = () => {
      if (cursor || !finePointer) return cursor;
      cursor = document.createElement("div");
      cursor.className = "fx-cursor";
      cursor.style.opacity = "0";
      cursor.setAttribute("aria-hidden", "true");
      document.body.appendChild(cursor);
      return cursor;
    };

    const process = () => {
      frame = 0;
      const e = lastEvent;
      if (!e) return;
      const target = e.target as Element | null;
      if (!target || !(target instanceof Element)) return;

      // Spotlight sheen
      const spot = target.closest<HTMLElement>(".surface-l1, [data-fx~='spot']");
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${e.clientX - r.left}px`);
        spot.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      if (e.pointerType !== "mouse") return;

      // Tilt
      const tilt = target.closest<HTMLElement>("[data-fx~='tilt']");
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty("--ry", `${(px * 8).toFixed(2)}deg`);
        tilt.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`);
      }

      // Magnetic buttons: lean toward the pointer within a 70px radius
      document.querySelectorAll<HTMLElement>("[data-fx~='magnetic']").forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const near = Math.abs(dx) < r.width / 2 + 70 && Math.abs(dy) < r.height / 2 + 70;
        el.style.setProperty("--tx", near ? `${Math.max(-6, Math.min(6, dx * 0.08)).toFixed(1)}px` : "0px");
        el.style.setProperty("--ty", near ? `${Math.max(-6, Math.min(6, dy * 0.12)).toFixed(1)}px` : "0px");
      });

      // Cursor dot inside designated zones
      const zone = target.closest("[data-fx~='cursor-zone']");
      const dot = ensureCursor();
      if (dot) {
        if (zone) {
          dot.style.opacity = "1";
          dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
          const interactive = target.closest("button, a, [role='button'], input, select, textarea");
          dot.dataset.big = interactive ? "1" : "0";
        } else {
          dot.style.opacity = "0";
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(process);
    };

    const onLeave = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.<HTMLElement>("[data-fx~='tilt']");
      if (t) { t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg"); }
    };

    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || !t.closest("button, a, [role='button']")) return;
      if (t.closest("[disabled], [aria-disabled='true']")) return;
      const ping = document.createElement("span");
      ping.className = "fx-ping";
      ping.style.left = `${e.clientX}px`;
      ping.style.top = `${e.clientY}px`;
      document.body.appendChild(ping);
      window.setTimeout(() => ping.remove(), 560);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      document.removeEventListener("pointerdown", onDown);
      if (frame) cancelAnimationFrame(frame);
      cursor?.remove();
    };
  }, [fxActive]);

  const value = useMemo(
    () => ({ palette, setPalette, calm, setCalm, fxActive }),
    [palette, setPalette, calm, setCalm, fxActive],
  );

  return <FxContext.Provider value={value}>{children}</FxContext.Provider>;
};

export function useFx(): FxContextValue {
  const ctx = useContext(FxContext);
  if (!ctx) throw new Error("useFx must be used inside <FxProvider>");
  return ctx;
}
