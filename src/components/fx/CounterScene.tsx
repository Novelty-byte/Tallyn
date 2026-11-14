import React, { useEffect, useState } from "react";
import { useOnScreen } from "@/lib/animations";

/**
 * Animated shop-counter illustration (inline SVG, ~3 kB, no video/Lottie).
 * Shelf goods bob gently, a barcode laser sweeps, a receipt "prints" and its
 * total ticks. Pure CSS animation → pauses off-screen and when the tab is hidden.
 */
export const CounterScene: React.FC<{ className?: string }> = ({ className }) => {
  const [ref, visible] = useOnScreen<HTMLDivElement>({ threshold: 0.1 }, false);
  const [tabHidden, setTabHidden] = useState(false);
  const [total, setTotal] = useState(650);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Cosmetic ticker: cycles a few sample totals while the scene is on screen.
  useEffect(() => {
    if (!visible || tabHidden) return;
    const totals = [650, 805, 1095, 1745];
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % totals.length;
      setTotal(totals[i]);
    }, 1500);
    return () => window.clearInterval(id);
  }, [visible, tabHidden]);

  return (
    <div ref={ref} className={`${className ?? ""} ${!visible || tabHidden ? "fx-paused" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 420 320" className="h-full w-full" role="presentation" focusable="false">
        {/* wall + shelf */}
        <rect x="10" y="20" width="400" height="190" rx="22" fill="#eaf1ec" />
        <rect x="30" y="92" width="240" height="8" rx="4" fill="#c9d0cc" />
        <rect x="30" y="152" width="240" height="8" rx="4" fill="#c9d0cc" />
        {/* top shelf goods */}
        <g className="scene-bob"><rect x="44" y="52" width="34" height="40" rx="6" fill="#f2a65a" /><rect x="50" y="62" width="22" height="8" rx="2" fill="#fff4cc" /></g>
        <g className="scene-bob d2"><rect x="90" y="60" width="28" height="32" rx="6" fill="#8dbf9e" /><rect x="95" y="68" width="18" height="6" rx="2" fill="#ddf1e4" /></g>
        <g className="scene-bob d3"><rect x="132" y="48" width="38" height="44" rx="8" fill="#5b9bd5" /><rect x="139" y="60" width="24" height="8" rx="2" fill="#dcebf7" /></g>
        <g className="scene-bob d4"><rect x="184" y="64" width="30" height="28" rx="6" fill="#f4d35e" /><rect x="190" y="70" width="18" height="6" rx="2" fill="#fff9e0" /></g>
        <g className="scene-bob d2"><rect x="228" y="54" width="32" height="38" rx="6" fill="#2f855a" /><rect x="234" y="64" width="20" height="7" rx="2" fill="#ddf1e4" /></g>
        {/* second shelf goods */}
        <g className="scene-bob d3"><rect x="48" y="118" width="40" height="34" rx="7" fill="#fbe3c8" /><rect x="55" y="128" width="26" height="7" rx="2" fill="#f2a65a" /></g>
        <g className="scene-bob"><rect x="104" y="112" width="32" height="40" rx="7" fill="#dcebf7" /><rect x="110" y="122" width="20" height="7" rx="2" fill="#5b9bd5" /></g>
        <g className="scene-bob d4"><rect x="152" y="122" width="44" height="30" rx="7" fill="#ddf1e4" /><rect x="160" y="130" width="28" height="7" rx="2" fill="#2f855a" /></g>
        <g className="scene-bob d2"><rect x="212" y="114" width="36" height="38" rx="7" fill="#fff4cc" /><rect x="219" y="124" width="22" height="7" rx="2" fill="#f4d35e" /></g>

        {/* counter */}
        <rect x="10" y="210" width="400" height="26" rx="10" fill="#c9d0cc" />
        <rect x="24" y="236" width="372" height="70" rx="12" fill="#e3e7e5" />
        {/* scanner pad + laser */}
        <rect x="70" y="190" width="110" height="20" rx="8" fill="#9aa5a0" />
        <rect x="76" y="172" width="98" height="22" rx="8" fill="#f1f3f2" />
        <g transform="translate(125 183)"><rect className="scene-laser" x="-1.5" y="-14" width="3" height="26" rx="1.5" fill="#f2a65a" /></g>
        {/* tea cup with steam */}
        <rect x="300" y="186" width="34" height="24" rx="6" fill="#fbe3c8" />
        <path d="M334 192h8a8 8 0 010 14h-8" fill="none" stroke="#fbe3c8" strokeWidth="5" strokeLinecap="round" />
        <path className="scene-steam" d="M312 180c-5-6 5-9 0-16" fill="none" stroke="#9aa5a0" strokeWidth="2.5" strokeLinecap="round" />
        <path className="scene-steam" style={{ animationDelay: "-1.4s" }} d="M324 180c-5-6 5-9 0-16" fill="none" stroke="#9aa5a0" strokeWidth="2.5" strokeLinecap="round" />

        {/* receipt printer + paper */}
        <rect x="205" y="196" width="70" height="14" rx="5" fill="#6b7873" />
        <g className="scene-receipt">
          <rect x="217" y="104" width="46" height="92" rx="3" fill="#ffffff" stroke="#e3e7e5" />
          <rect x="223" y="114" width="30" height="4" rx="2" fill="#c9d0cc" />
          <rect x="223" y="124" width="22" height="4" rx="2" fill="#c9d0cc" />
          <rect x="223" y="134" width="26" height="4" rx="2" fill="#c9d0cc" />
          <rect x="223" y="144" width="18" height="4" rx="2" fill="#c9d0cc" />
          <rect x="223" y="164" width="34" height="14" rx="3" fill="#ddf1e4" />
        </g>
        <text x="240" y="174.5" textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600" fill="#166534">
          Rs {total.toLocaleString("en-PK")}
        </text>

        {/* phone on counter */}
        <rect x="350" y="150" width="40" height="64" rx="9" fill="#ffffff" stroke="#c9d0cc" strokeWidth="2" />
        <rect x="356" y="160" width="28" height="10" rx="3" fill="#ddf1e4" />
        <rect x="356" y="174" width="28" height="6" rx="3" fill="#fbe3c8" />
        <circle cx="370" cy="198" r="6" fill="#2f855a" />
      </svg>
    </div>
  );
};
