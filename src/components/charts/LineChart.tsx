import React, { useId, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface LineSeries {
  key: string;
  label: string;
  /** Mark colour only — text never wears it. */
  color: string;
  values: number[];
  /** Light 10% wash under the line (use for the primary series only). */
  area?: boolean;
}

interface LineChartProps {
  /** Short x labels, e.g. "Mon" or "14 Nov". */
  labels: string[];
  /** Longer labels for the tooltip header and table rows, e.g. "Sat, 14 Nov". */
  fullLabels?: string[];
  series: LineSeries[];
  formatValue: (n: number) => string;
  /** Accessible name for the chart. */
  ariaLabel: string;
  height?: number;
  /** Adds a "Total" row (sum of all series) to the tooltip and table. */
  showTotal?: boolean;
}

const MARGIN = { top: 12, right: 20, bottom: 30, left: 52 };

/** Clean axis ticks: 0 and 3–5 steps of 1/2/2.5/5 × 10^k. */
function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** One style per axis: full numbers under 10,000, compact above. */
function tickFormatter(max: number) {
  return (n: number) =>
    max >= 10_000
      ? n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n)
      : n.toLocaleString("en-PK");
}

export const LineChart: React.FC<LineChartProps> = ({
  labels, fullLabels, series, formatValue, ariaLabel, height = 240, showTotal = false,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const [view, setView] = useState<"chart" | "table">("chart");
  const gradId = useId().replace(/:/g, "");
  const n = labels.length;

  // Measure before first paint, then follow resizes.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const max = Math.max(0, ...series.flatMap((s) => s.values));
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1] || 1;
    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;
    const x = (i: number) => MARGIN.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => MARGIN.top + plotH - (v / top) * plotH;
    // As many x labels as fit (~64px each), always including the last (today).
    const maxLabels = Math.max(2, Math.floor(plotW / 64));
    const every = Math.max(1, Math.ceil(n / maxLabels));
    const xTicks = labels.map((_, i) => i).filter((i) => (n - 1 - i) % every === 0);
    return { ticks, x, y, plotW, plotH, xTicks, fmtTick: tickFormatter(top) };
  }, [series, width, height, n, labels]);

  const pathFor = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${geo.x(i).toFixed(1)},${geo.y(v).toFixed(1)}`).join(" ");
  const areaFor = (values: number[]) =>
    `${pathFor(values)} L${geo.x(n - 1).toFixed(1)},${geo.y(0).toFixed(1)} L${geo.x(0).toFixed(1)},${geo.y(0).toFixed(1)} Z`;

  const indexFromPointer = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * geo.plotW;
    return Math.min(n - 1, Math.max(0, Math.round(n <= 1 ? 0 : (px / geo.plotW) * (n - 1))));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setActive((cur) => {
        const start = cur ?? n - 1;
        return Math.min(n - 1, Math.max(0, start + (e.key === "ArrowRight" ? 1 : -1)));
      });
    } else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Escape") setActive(null);
  };

  const header = (i: number) => fullLabels?.[i] ?? labels[i];
  const total = (i: number) => series.reduce((t, s) => t + (s.values[i] ?? 0), 0);

  // Tooltip placement: beside the crosshair, flipped near the right edge.
  const tipLeft = active !== null ? geo.x(active) : 0;
  const flip = tipLeft > width * 0.62;

  return (
    <div ref={wrapRef}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {/* Legend: always present for 2+ series (line keys mirror the marks) */}
        {series.length > 1 ? (
          <ul className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block h-[3px] w-4 rounded-full" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : <span />}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium" role="group" aria-label="Chart or table view">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`min-h-[32px] rounded-md px-3 capitalize transition-colors ${view === v ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "chart" ? (
        <div
          className="relative w-full select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          tabIndex={0}
          role="group"
          aria-label={`${ariaLabel}. Use left and right arrow keys to read each day.`}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
        >
          <svg width={width} height={height} className="block overflow-visible" aria-hidden="true">
            <defs>
              {series.filter((s) => s.area).map((s) => (
                <linearGradient key={s.key} id={`${gradId}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>

            {/* Recessive hairline grid + y ticks */}
            {geo.ticks.map((t) => (
              <g key={t}>
                <line
                  x1={MARGIN.left} x2={MARGIN.left + geo.plotW} y1={geo.y(t)} y2={geo.y(t)}
                  stroke={t === 0 ? "#cbd5e1" : "#eef0f2"} strokeWidth={1} shapeRendering="crispEdges"
                />
                <text x={MARGIN.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px] tabular-nums">
                  {geo.fmtTick(t)}
                </text>
              </g>
            ))}

            {/* x labels */}
            {geo.xTicks.map((i) => (
              <text
                key={i} x={geo.x(i)} y={height - 8} textAnchor="middle"
                className={`text-[11px] ${active === i ? "fill-slate-900 font-semibold" : "fill-slate-500"}`}
              >
                {labels[i]}
              </text>
            ))}

            {/* Area washes, then 2px lines (drawn in on mount) */}
            {series.filter((s) => s.area).map((s) => (
              <path key={`a-${s.key}`} d={areaFor(s.values)} fill={`url(#${gradId}-${s.key})`} />
            ))}
            {series.map((s) => (
              <path
                key={`l-${s.key}-${n}`}
                d={pathFor(s.values)}
                fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                pathLength={1} className="tn-line-draw"
              />
            ))}

            {/* End dots on the latest point (with surface ring) */}
            {active === null && series.map((s) => (
              <circle key={`e-${s.key}`} cx={geo.x(n - 1)} cy={geo.y(s.values[n - 1] ?? 0)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
            ))}

            {/* Crosshair */}
            {active !== null && (
              <g>
                <line
                  x1={geo.x(active)} x2={geo.x(active)} y1={MARGIN.top} y2={MARGIN.top + geo.plotH}
                  stroke="#94a3b8" strokeWidth={1} shapeRendering="crispEdges"
                />
                {series.map((s) => (
                  <circle key={`c-${s.key}`} cx={geo.x(active)} cy={geo.y(s.values[active] ?? 0)} r={5} fill={s.color} stroke="#fff" strokeWidth={2} />
                ))}
              </g>
            )}

            {/* Hit layer: the whole plot finds the nearest day */}
            <rect
              x={MARGIN.left} y={MARGIN.top} width={geo.plotW} height={geo.plotH}
              fill="transparent" style={{ touchAction: "pan-y", cursor: "crosshair" }}
              onPointerMove={(e) => setActive(indexFromPointer(e))}
              onPointerDown={(e) => setActive(indexFromPointer(e))}
              onPointerLeave={() => setActive(null)}
            />
          </svg>

          {/* Tooltip: values lead, labels follow; one tooltip lists every series */}
          {active !== null && (
            <div
              className="pointer-events-none absolute z-10 min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
              style={{
                top: MARGIN.top,
                left: flip ? undefined : tipLeft + 12,
                right: flip ? width - tipLeft + 12 : undefined,
              }}
              role="status"
              aria-live="polite"
            >
              <p className="mb-1 font-medium text-slate-500">{header(active)}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block h-[3px] w-3 rounded-full" style={{ background: s.color }} />
                  <span className="font-semibold tabular-nums text-slate-900">{formatValue(s.values[active] ?? 0)}</span>
                  <span className="text-slate-500">{s.label}</span>
                </p>
              ))}
              {showTotal && series.length > 1 && (
                <p className="mt-1 border-t border-slate-100 pt-1">
                  <span className="font-semibold tabular-nums text-slate-900">{formatValue(total(active))}</span>
                  <span className="ms-2 text-slate-500">Total</span>
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="max-h-[320px] overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <caption className="sr-only">{ariaLabel}</caption>
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">Day</th>
                {series.map((s) => <th key={s.key} scope="col" className="px-3 py-2 text-end font-medium">{s.label}</th>)}
                {showTotal && series.length > 1 && <th scope="col" className="px-3 py-2 text-end font-medium">Total</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {labels.map((_, i) => (
                <tr key={i}>
                  <th scope="row" className="px-3 py-1.5 text-start font-normal text-slate-700">{header(i)}</th>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-end tabular-nums text-slate-900">{formatValue(s.values[i] ?? 0)}</td>
                  ))}
                  {showTotal && series.length > 1 && (
                    <td className="px-3 py-1.5 text-end font-semibold tabular-nums text-slate-900">{formatValue(total(i))}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
