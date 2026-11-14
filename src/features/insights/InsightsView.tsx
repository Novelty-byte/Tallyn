import React, { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { addDays, toLocalYmd } from "@/domain/credit";
import {
  windowEnding, previousWindow, dailySeries, periodSummary, percentChange, productPerformance,
  reorderPlan, expenseBreakdown, detectInsights, nextRamadan, ramadanStaples,
  DEFAULT_BUFFER_DAYS, RUN_RATE_DAYS,
  type Insight, type ReorderLine, type ProductPerformance,
} from "@/domain/insights";
import { formatFriendlyDate } from "@/domain/whatsapp";
import { LineChart } from "@/components/charts/LineChart";
import {
  AlertTriangle, AlertOctagon, Info, TrendingUp, TrendingDown, ArrowUp, ArrowDown, ChevronsUpDown,
  ShieldCheck, Moon, PackageSearch, Wallet, ThumbsUp,
} from "lucide-react";

const RANGES = [7, 30, 60] as const;
type Range = (typeof RANGES)[number];

const SALES_COLOR = "#166534";
const PROFIT_COLOR = "#2a78d6";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const asDate = (ymd: string) => new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)));

/* ------------------------------ small pieces ------------------------------ */

const SEVERITY: Record<Insight["severity"], { label: string; icon: React.ReactNode; card: string }> = {
  critical: { label: "Urgent", icon: <AlertOctagon className="h-4 w-4 text-rose-700" />, card: "border-rose-200 bg-rose-50/70" },
  warning: { label: "Check", icon: <AlertTriangle className="h-4 w-4 text-amber-700" />, card: "border-amber-200 bg-amber-50/60" },
  info: { label: "Note", icon: <Info className="h-4 w-4 text-sky-700" />, card: "border-slate-200 bg-white" },
  good: { label: "Good news", icon: <ThumbsUp className="h-4 w-4 text-emerald-700" />, card: "border-emerald-200 bg-emerald-50/60" },
};

const STATUS: Record<ReorderLine["status"], { label: string; cls: string; icon: React.ReactNode }> = {
  out: { label: "Out of stock", cls: "bg-rose-100 text-rose-900", icon: <AlertOctagon className="h-3.5 w-3.5" /> },
  low: { label: "Below minimum", cls: "bg-rose-50 text-rose-800", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  reorder: { label: "Reorder soon", cls: "bg-amber-100 text-amber-900", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  ok: { label: "Enough", cls: "bg-slate-100 text-slate-700", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
};

/** Stat tile: label · value · signed delta vs the previous period (colour = direction × good/bad). */
const StatTile: React.FC<{ label: string; value: number; previous: number; upIsGood?: boolean; note?: string; periodLabel: string }> = ({
  label, value, previous, upIsGood = true, note, periodLabel,
}) => {
  const change = percentChange(value, previous);
  const good = change !== null && (change >= 0) === upIsGood;
  return (
    <div className="surface-l1 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-nowrap text-lg font-semibold text-slate-900 sm:text-2xl">{formatCurrency(value)}</p>
      <p className="mt-1 flex flex-wrap items-center gap-1 text-xs">
        {change === null ? (
          <span className="text-slate-500">No earlier data to compare</span>
        ) : (
          <>
            <span className={`inline-flex items-center gap-0.5 font-semibold ${change === 0 ? "text-slate-600" : good ? "text-emerald-700" : "text-rose-700"}`}>
              {change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(change)}%
            </span>
            <span className="text-slate-500">vs previous {periodLabel}</span>
          </>
        )}
      </p>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
    </div>
  );
};

/** Sortable column header button. */
function SortHeader<K extends string>({ label, k, sort, setSort, align = "end" }: {
  label: string; k: K; sort: { key: K; dir: "asc" | "desc" }; setSort: (s: { key: K; dir: "asc" | "desc" }) => void; align?: "start" | "end";
}) {
  const active = sort.key === k;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-2 text-${align} font-medium`}>
      <button
        type="button"
        onClick={() => setSort({ key: k, dir: active && sort.dir === "desc" ? "asc" : "desc" })}
        className={`inline-flex min-h-[32px] items-center gap-1 uppercase ${active ? "text-slate-900" : "text-slate-500 hover:text-slate-800"}`}
      >
        {label}
        {active ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
      </button>
    </th>
  );
}

function sortBy<T>(rows: T[], get: (r: T) => number | string | null, dir: "asc" | "desc") {
  return [...rows].sort((a, b) => {
    const x = get(a), y = get(b);
    // nulls ("no recent sales") always sink to the bottom
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return dir === "asc" ? c : -c;
  });
}

/* --------------------------------- page --------------------------------- */

export const InsightsView: React.FC = () => {
  const { products, sales, expenses, customers, shop, setActiveTab } = useApp();
  const [range, setRange] = useState<Range>(30);
  const today = toLocalYmd();
  const periodLabel = `${range} days`;

  const data = useMemo(() => {
    // Periods are complete days (ending yesterday) so comparisons are fair;
    // today's live numbers are on the Dashboard.
    const w = windowEnding(addDays(today, -1), range);
    const prev = previousWindow(w);
    const lead = shop.leadTimeDays ?? 2;
    const plan = reorderPlan(products, sales, today, lead);
    return {
      w,
      points: dailySeries(sales, w),
      cur: periodSummary(sales, expenses, w),
      prev: periodSummary(sales, expenses, prev),
      perf: productPerformance(products, sales, w),
      plan,
      expenses: expenseBreakdown(expenses, w),
      insights: detectInsights({ products, sales, expenses, customers, today, currency: shop.currency, leadTimeDays: lead }),
      ramadan: nextRamadan(today),
      staples: ramadanStaples(plan),
      lead,
    };
  }, [products, sales, expenses, customers, shop.leadTimeDays, shop.currency, today, range]);

  /* --- reorder table state --- */
  const [reorderFilter, setReorderFilter] = useState<"action" | "all">("action");
  type RKey = "name" | "stock" | "avgDailyUnits" | "daysLeft" | "reorderQty";
  const [rSort, setRSort] = useState<{ key: RKey; dir: "asc" | "desc" }>({ key: "daysLeft", dir: "asc" });
  const needsAction = data.plan.filter((r) => r.status !== "ok");
  const reorderRows = sortBy(reorderFilter === "action" ? needsAction : data.plan, (r) => r[rSort.key], rSort.dir);

  /* --- product performance table state --- */
  const [perfView, setPerfView] = useState<"best" | "slowest">("best");
  type PKey = "name" | "unitsSold" | "revenue" | "grossProfit";
  const [pSort, setPSort] = useState<{ key: PKey; dir: "asc" | "desc" }>({ key: "unitsSold", dir: "desc" });
  const perfRows = useMemo(() => {
    const base = perfView === "best"
      ? sortBy(data.perf, (r) => r[pSort.key], pSort.dir)
      : sortBy(data.perf, (r) => r.unitsSold, "asc");
    return base.slice(0, 10);
  }, [data.perf, perfView, pSort]);

  /* --- headlines (one plain sentence per chart, numbers from code) --- */
  const salesChange = percentChange(data.cur.revenue, data.prev.revenue);
  const trendHeadline =
    data.cur.revenue === 0
      ? `No sales recorded in the last ${range} days.`
      : `${formatCurrency(data.cur.revenue)} in sales over the last ${range} days${salesChange === null ? "" : `, ${salesChange >= 0 ? "up" : "down"} ${Math.abs(salesChange)}% on the ${range} days before`}. Gross profit ${formatCurrency(data.cur.grossProfit)}${data.cur.grossMarginPct !== null ? ` (${data.cur.grossMarginPct}% margin)` : ""}.`;
  const firstOut = [...needsAction].sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9))[0];
  const reorderHeadline =
    needsAction.length === 0
      ? `Stock looks fine for the next ${data.lead + DEFAULT_BUFFER_DAYS} days.`
      : `${needsAction.length} item${needsAction.length === 1 ? " needs" : "s need"} attention${firstOut ? `; ${firstOut.name} ${firstOut.daysLeft !== null ? `may run out in ${firstOut.daysLeft} day${firstOut.daysLeft === 1 ? "" : "s"}` : `has ${firstOut.stock} ${firstOut.unit} left`}` : ""}.`;
  const topSeller = sortBy(data.perf, (r) => r.unitsSold, "desc")[0];
  const unsoldCount = data.perf.filter((p) => p.unitsSold === 0 && p.stock > 0).length;
  const perfHeadline =
    !topSeller || topSeller.unitsSold === 0
      ? `Nothing sold in the last ${range} days.`
      : perfView === "best"
      ? `${topSeller.name} sold the most: ${topSeller.unitsSold} ${topSeller.unit} for ${formatCurrency(topSeller.revenue)}.`
      : unsoldCount > 0
      ? `${unsoldCount} item${unsoldCount === 1 ? "" : "s"} in stock didn't sell at all in the last ${range} days.`
      : `Every item sold at least once in the last ${range} days.`;
  const expenseTotal = data.expenses.reduce((t, e) => t + e.amount, 0);
  const expenseHeadline =
    data.expenses.length === 0
      ? `No expenses recorded in the last ${range} days.`
      : `${data.expenses[0].category} is the biggest cost: ${formatCurrency(data.expenses[0].amount)} of ${formatCurrency(expenseTotal)} (${Math.round((data.expenses[0].amount / expenseTotal) * 100)}%).`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
          <span>Every number computed from your own records</span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Smart Insights</h2>
        <p className="text-sm text-slate-600">What to restock, who to remind, and why your profit moved.</p>
      </div>

      {/* What needs attention (today) */}
      <section aria-labelledby="attention-title">
        <h3 id="attention-title" className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Needs your attention</h3>
        {data.insights.length === 0 ? (
          <p className="surface-l1 p-4 text-sm text-slate-600">Nothing unusual today. 👍</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.insights.map((ins) => {
              const sev = SEVERITY[ins.severity];
              return (
                <div key={ins.id} className={`rounded-2xl border p-4 ${sev.card}`}>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {sev.icon} {sev.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{ins.headline}</p>
                  {ins.detail && <p className="mt-1 text-sm text-slate-600">{ins.detail}</p>}
                  {ins.action && (
                    <button
                      onClick={() => setActiveTab(ins.action!.tab)}
                      className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-slate-800 hover:underline"
                    >
                      {ins.action.label} <span aria-hidden="true" className="rtl:rotate-180">→</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* One filter row scopes everything below */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Period</span>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Time period">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`min-h-[40px] rounded-lg px-4 text-sm font-medium transition-colors ${range === r ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Last {r} days
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500">
          {formatFriendlyDate(data.w.from)} – {formatFriendlyDate(data.w.to)} (full days; today is on the Dashboard)
        </span>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sales" value={data.cur.revenue} previous={data.prev.revenue} periodLabel={periodLabel} note={`${data.cur.salesCount} sales`} />
        <StatTile
          label="Gross profit" value={data.cur.grossProfit} previous={data.prev.grossProfit} periodLabel={periodLabel}
          note={data.cur.grossMarginPct !== null ? `${data.cur.grossMarginPct}% margin` : undefined}
        />
        <StatTile label="Expenses" value={data.cur.expenses} previous={data.prev.expenses} upIsGood={false} periodLabel={periodLabel} />
        <StatTile label="Net profit" value={data.cur.netProfit} previous={data.prev.netProfit} periodLabel={periodLabel} note="Gross profit minus expenses" />
      </div>

      {/* Sales & profit trend */}
      <section className="surface-l1 p-5 sm:p-6" aria-labelledby="trend-title">
        <h3 id="trend-title" className="text-base font-semibold text-slate-900">Sales and gross profit per day</h3>
        <p className="mb-3 text-sm text-slate-600">{trendHeadline}</p>
        <LineChart
          labels={data.points.map((p) => {
            const d = asDate(p.date);
            return range === 7 ? DAY[d.getDay()] : `${d.getDate()} ${MON[d.getMonth()]}`;
          })}
          fullLabels={data.points.map((p) => {
            const d = asDate(p.date);
            return `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
          })}
          series={[
            { key: "revenue", label: "Sales", color: SALES_COLOR, values: data.points.map((p) => p.revenue), area: true },
            { key: "profit", label: "Gross profit", color: PROFIT_COLOR, values: data.points.map((p) => p.grossProfit) },
          ]}
          formatValue={(n) => formatCurrency(n)}
          ariaLabel={`Sales and gross profit per day, last ${range} days`}
          height={260}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Reorder planner */}
        <section className="surface-l1 p-5 sm:p-6" aria-labelledby="reorder-title">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
            <h3 id="reorder-title" className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <PackageSearch className="h-4 w-4 text-slate-500" /> Restock planner
            </h3>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium" role="group" aria-label="Which items">
              {([["action", `Needs action (${needsAction.length})`], ["all", `All (${data.plan.length})`]] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setReorderFilter(v)}
                  aria-pressed={reorderFilter === v}
                  className={`min-h-[32px] rounded-md px-3 ${reorderFilter === v ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-3 text-sm text-slate-600">{reorderHeadline}</p>
          <div className="max-h-[380px] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-[1] bg-slate-50 text-xs">
                <tr>
                  <SortHeader label="Product" k="name" sort={rSort} setSort={setRSort} align="start" />
                  <SortHeader label="Stock" k="stock" sort={rSort} setSort={setRSort} />
                  <SortHeader label="Sells / day" k="avgDailyUnits" sort={rSort} setSort={setRSort} />
                  <SortHeader label="Days left" k="daysLeft" sort={rSort} setSort={setRSort} />
                  <SortHeader label="Order" k="reorderQty" sort={rSort} setSort={setRSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reorderRows.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Nothing needs restocking right now.</td></tr>
                )}
                {reorderRows.map((r) => (
                  <tr key={r.productId} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      <span className={`mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${STATUS[r.status].cls}`}>
                        {STATUS[r.status].icon} {STATUS[r.status].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums text-slate-800">{r.stock} <span className="text-slate-500">{r.unit}</span></td>
                    <td className="px-3 py-2 text-end tabular-nums text-slate-700">{r.avgDailyUnits}</td>
                    <td className="px-3 py-2 text-end tabular-nums text-slate-900">{r.daysLeft === null ? <span className="text-slate-400">no recent sales</span> : r.daysLeft}</td>
                    <td className="px-3 py-2 text-end font-semibold tabular-nums text-slate-900">{r.reorderQty > 0 ? `+${r.reorderQty}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Sells/day = units sold in the last {RUN_RATE_DAYS} days ÷ {RUN_RATE_DAYS}. Order = enough for your {data.lead}-day supplier lead time + {DEFAULT_BUFFER_DAYS} spare days.
          </p>
        </section>

        {/* Best & slowest sellers */}
        <section className="surface-l1 p-5 sm:p-6" aria-labelledby="perf-title">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
            <h3 id="perf-title" className="flex items-center gap-2 text-base font-semibold text-slate-900">
              {perfView === "best" ? <TrendingUp className="h-4 w-4 text-slate-500" /> : <TrendingDown className="h-4 w-4 text-slate-500" />}
              {perfView === "best" ? "Best sellers" : "Slowest sellers"}
            </h3>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium" role="group" aria-label="Best or slowest">
              {(["best", "slowest"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setPerfView(v)}
                  aria-pressed={perfView === v}
                  className={`min-h-[32px] rounded-md px-3 capitalize ${perfView === v ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-3 text-sm text-slate-600">{perfHeadline}</p>
          <div className="max-h-[380px] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-[1] bg-slate-50 text-xs">
                <tr>
                  {perfView === "best" ? (
                    <>
                      <SortHeader label="Product" k="name" sort={pSort} setSort={setPSort} align="start" />
                      <SortHeader label="Units" k="unitsSold" sort={pSort} setSort={setPSort} />
                      <SortHeader label="Sales" k="revenue" sort={pSort} setSort={setPSort} />
                      <SortHeader label="Profit" k="grossProfit" sort={pSort} setSort={setPSort} />
                    </>
                  ) : (
                    <>
                      <th scope="col" className="px-3 py-2 text-start font-medium uppercase text-slate-500">Product</th>
                      <th scope="col" className="px-3 py-2 text-end font-medium uppercase text-slate-500">Units</th>
                      <th scope="col" className="px-3 py-2 text-end font-medium uppercase text-slate-500">In stock</th>
                      <th scope="col" className="px-3 py-2 text-end font-medium uppercase text-slate-500">Profit</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {perfRows.map((r: ProductPerformance) => (
                  <tr key={r.productId} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-900">{r.name}</td>
                    <td className="px-3 py-2 text-end tabular-nums text-slate-900">{r.unitsSold}</td>
                    <td className="px-3 py-2 text-end tabular-nums text-slate-700">
                      {perfView === "best" ? formatCurrency(r.revenue) : `${r.stock} ${r.unit}`}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums text-slate-700">{formatCurrency(r.grossProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Expense breakdown — ranked bars, value at the tip */}
        <section className="surface-l1 p-5 sm:p-6" aria-labelledby="exp-title">
          <h3 id="exp-title" className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Wallet className="h-4 w-4 text-slate-500" /> Where the money went
          </h3>
          <p className="mb-4 text-sm text-slate-600">{expenseHeadline}</p>
          {data.expenses.length > 0 && (
            <ul className="space-y-3">
              {data.expenses.map((e) => {
                const pct = Math.round((e.amount / expenseTotal) * 100);
                return (
                  <li key={e.category} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm" aria-label={`${e.category}: ${formatCurrency(e.amount)}, ${pct}%`}>
                    <span className="truncate text-slate-700">{e.category}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 flex-1 overflow-visible">
                        <div
                          className="h-full rounded-e bg-slate-700 transition-[width] duration-500"
                          style={{ width: `${Math.max((e.amount / data.expenses[0].amount) * 100, 1.5)}%` }}
                        />
                      </div>
                      <span className="w-36 shrink-0 whitespace-nowrap text-end tabular-nums text-slate-900">
                        {formatCurrency(e.amount)} <span className="text-slate-500">· {pct}%</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Ramadan planner — honest countdown, no invented multipliers */}
        <section className="rounded-2xl border border-emerald-900/20 bg-emerald-950 p-5 text-white sm:p-6" aria-labelledby="ramadan-title">
          <h3 id="ramadan-title" className="flex items-center gap-2 text-base font-semibold">
            <Moon className="h-4 w-4 text-amber-300" /> Ramadan stock planner
          </h3>
          {data.ramadan ? (
            <>
              <p className="mt-1 text-sm text-emerald-100">
                Ramadan is expected around <strong className="text-white">{formatFriendlyDate(data.ramadan.start)}</strong> — in{" "}
                <strong className="text-white">{data.ramadan.daysUntil} days</strong> (±1 day, moon sighting).
                {data.ramadan.daysUntil <= 30
                  ? " Wholesale prices usually rise in the last weeks before — buy staples now."
                  : " Plan bulk buying 2–3 weeks before, before wholesale prices rise."}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-300">Your Ramadan staples today</p>
              {data.staples.length === 0 ? (
                <p className="mt-1 text-sm text-emerald-100">No typical Ramadan items (sugar, oil, besan, Rooh Afza, dates, rice) found in your stock.</p>
              ) : (
                <ul className="mt-2 divide-y divide-emerald-800/70">
                  {data.staples.slice(0, 6).map((r) => (
                    <li key={r.productId} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                      <span className="truncate">{r.name}</span>
                      <span className="shrink-0 tabular-nums text-emerald-100">
                        {r.stock} {r.unit} · {r.daysLeft === null ? "no recent sales" : `${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => setActiveTab("purchases")}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 hover:bg-amber-400"
              >
                Enter a bulk purchase <span aria-hidden="true" className="rtl:rotate-180">→</span>
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-emerald-100">No upcoming Ramadan date on file.</p>
          )}
        </section>
      </div>
    </div>
  );
};
