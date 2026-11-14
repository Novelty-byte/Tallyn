import React from "react";
import { Palette, Wind, Check } from "lucide-react";
import { PALETTES, useFx } from "@/components/fx/FxProvider";

/**
 * Settings → Appearance. All four palettes are light. "Calm motion" turns off
 * ambient animation, parallax, tilt and the cursor dot (it is also forced on
 * automatically for reduced-motion, data-saver and very low-memory devices).
 */
export const AppearanceCard: React.FC = () => {
  const { palette, setPalette, calm, setCalm, fxActive } = useFx();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="h-11 w-11 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center shadow-xs">
          <Palette className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900">Appearance</h3>
          <p className="text-xs text-slate-500">Pick a colour mood and how much the screen moves. Saved on this device.</p>
        </div>
      </div>

      <fieldset>
        <legend className="mono-label text-slate-500 mb-2">Colour mood</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Colour mood">
          {PALETTES.map((p) => {
            const selected = palette === p.id;
            return (
              <button
                key={p.id}
                role="radio"
                aria-checked={selected}
                onClick={() => setPalette(p.id)}
                className={`relative rounded-2xl border p-3 text-start transition-all min-h-[88px] ${
                  selected ? "border-emerald-700 ring-2 ring-emerald-200 bg-white" : "border-slate-200 bg-mist hover:border-slate-300 hover:bg-white"
                }`}
              >
                <span className="flex gap-1.5" aria-hidden="true">
                  {p.swatches.map((c) => (
                    <span key={c} className="h-7 w-7 rounded-full border border-black/5" style={{ background: c }} />
                  ))}
                </span>
                <span className="mt-2 block text-sm font-semibold text-slate-900">{p.label}</span>
                {selected && (
                  <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-mist p-4">
        <div className="flex items-start gap-3">
          <Wind className="mt-0.5 h-5 w-5 text-sky-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Calm motion</p>
            <p className="text-xs text-slate-600">
              Stops drifting backgrounds, tilt, magnetic buttons and the cursor dot. Counter checkout is never animated.
              {!fxActive && !calm && " Currently off automatically for this device."}
            </p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={calm}
          aria-label="Calm motion"
          onClick={() => setCalm(!calm)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${calm ? "bg-emerald-700" : "bg-slate-300"}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${calm ? "start-7" : "start-1"}`} />
        </button>
      </div>
    </div>
  );
};
