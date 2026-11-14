import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { computeDailyPulse } from "@/domain/dailyPulse";
import { dailySeries, periodSummary, percentChange, previousWindow, saleDay, windowEnding } from "@/domain/insights";
import { LineChart } from "@/components/charts/LineChart";
import { addDays, customerOverdueDays, toLocalYmd } from "@/domain/credit";
import { formatCurrency } from "@/lib/utils";
import { MetricCounter } from "@/components/animations/MetricCounter";
import { 
  TrendingUp, 
  Coins, 
  CreditCard, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  RefreshCw,
  ShoppingBag,
  Users
} from "lucide-react";

export const DashboardView: React.FC = () => {
  const { t } = useTranslation();
  const { sales, customers, products, setActiveTab, openSeededDemoShop } = useApp();

  // Today's pulse = today's sales only (shop-local calendar day), never all-time.
  const today = toLocalYmd();
  const metrics = computeDailyPulse(sales.filter((s) => saleDay(s) === today));

  // Customers past their promised pay-back date, most overdue first
  const overdueCustomers = customers
    .filter((c) => customerOverdueDays(c) > 0)
    .sort((a, b) => customerOverdueDays(b) - customerOverdueDays(a));

  // Low stock products
  const lowStockProducts = products.filter((p) => p.quantity <= p.minQuantity);

  // Last 7 days vs the 7 before, from the deterministic insights engine.
  const week = useMemo(() => {
    const points = dailySeries(sales, windowEnding(today, 7));
    // Compare complete days only: today is still in progress.
    const full = windowEnding(addDays(today, -1), 7);
    const current = periodSummary(sales, [], full).revenue;
    const previous = periodSummary(sales, [], previousWindow(full)).revenue;
    return { points, current, change: percentChange(current, previous) };
  }, [sales, today]);

  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayOf = (ymd: string) => new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)));
  const weekHeadline =
    week.current === 0
      ? "No sales in the last 7 full days."
      : week.change === null
      ? `${formatCurrency(week.current)} in sales over the last 7 full days.`
      : `${formatCurrency(week.current)} over the last 7 full days, ${week.change >= 0 ? "up" : "down"} ${Math.abs(week.change)}% on the 7 days before.`;

  return (
    <main className="max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            {t("dashboard.title")}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Reload Demo Shop Button */}
        <button
          onClick={openSeededDemoShop}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors min-h-[44px]"
        >
          <RefreshCw className="h-4 w-4 text-emerald-800" aria-hidden="true" />
          <span>{t("dashboard.loadDemo")}</span>
        </button>
      </div>

      {/* Today's Pulse KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="surface-l1 p-4 group hover:-translate-y-1 hover:shadow-lift transition-all duration-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide">{t("dashboard.todayRevenue")}</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <MetricCounter value={metrics.totalRevenue} className="text-2xl text-slate-900" />
          <p className="text-xs text-emerald-700 font-medium mt-1">
            {metrics.transactionCount} completed sales
          </p>
        </div>

        {/* Cash Received */}
        <div className="surface-l1 p-4 group hover:-translate-y-1 hover:shadow-lift transition-all duration-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide">{t("dashboard.cashReceived")}</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Coins className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <MetricCounter value={metrics.cashReceived} className="text-2xl text-slate-900" />
          <p className="text-xs text-slate-500 font-medium mt-1">
            In store register
          </p>
        </div>

        {/* Credit Extended */}
        <div className="surface-l1 border-amber-300 p-4 group hover:-translate-y-1 hover:shadow-lift transition-all duration-200">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide">{t("dashboard.creditExtended")}</span>
            <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <MetricCounter value={metrics.creditExtended} className="text-2xl text-amber-950" />
          <p className="text-xs text-amber-700 font-medium mt-1">
            Udhaar ledger
          </p>
        </div>

        {/* Estimated Gross Profit */}
        <div className="surface-l1 p-4 group hover:-translate-y-1 hover:shadow-lift transition-all duration-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide">{t("dashboard.grossProfit")}</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <MetricCounter value={metrics.grossProfit} className="text-2xl text-emerald-800" />
          <p className="text-xs text-emerald-600 font-medium mt-1">
            Calculated from unit costs
          </p>
        </div>

        {/* Net Margin */}
        <div className="surface-l1 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide">{t("dashboard.netMargin")}</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <span className="text-xs font-bold figure">{metrics.netMarginPercent}%</span>
            </div>
          </div>
          <p className="text-2xl figure text-slate-900">
            {metrics.netMarginPercent}%
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Average retail markup
          </p>
        </div>
      </div>

      {/* Dynamic Action Cards (Immediate Retail Actions) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span>{t("dashboard.actionCardsTitle")}</span>
          </h3>
          <span className="text-xs font-medium text-slate-500">
            Deterministic stock & udhaar triggers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Low Stock Urgent Reorder */}
          {lowStockProducts.length > 0 && (
            <div className="surface-l1 border-amber-300 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-900 font-medium text-xs uppercase mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <span>Low Stock Alert ({lowStockProducts.length} items)</span>
                </div>
                <p className="text-base font-medium text-slate-900">
                  {lowStockProducts[0].nameEn} is down to {lowStockProducts[0].quantity} {lowStockProducts[0].unit}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Estimated 2 days remaining before stockout. Suggested restock: 15 {lowStockProducts[0].unit}.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("purchases")}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 hover:underline"
              >
                <span>Restock via Supplier Scanner</span>
                <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
              </button>
            </div>
          )}

          {/* Overdue Udhaar Alert */}
          {overdueCustomers.length > 0 && (
            <div className="surface-l1 border-rose-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-900 font-medium text-xs uppercase mb-1">
                  <Clock className="h-4 w-4 text-rose-700" />
                  <span>Overdue Credit Collection ({overdueCustomers.length} accounts)</span>
                </div>
                <p className="text-base font-medium text-slate-900">
                  {overdueCustomers[0].name} owes {formatCurrency(overdueCustomers[0].creditBalance)}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Payment is {customerOverdueDays(overdueCustomers[0])} days overdue. 1-click respectful WhatsApp reminder ready.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("udhaar")}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-rose-900 hover:underline"
              >
                <span>Send WhatsApp Reminder</span>
                <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 7-day sales trend: interactive line chart */}
      <div className="surface-l1 p-6">
        <div className="mb-4">
          <h3 className="text-base font-medium text-slate-900">{t("dashboard.salesTrend")}</h3>
          <p className="text-sm text-slate-600">{weekHeadline}</p>
        </div>
        <LineChart
          labels={week.points.map((p, i) => (i === week.points.length - 1 ? "Today" : DAY[dayOf(p.date).getDay()]))}
          fullLabels={week.points.map((p, i) => {
            const d = dayOf(p.date);
            return `${i === week.points.length - 1 ? "Today" : DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
          })}
          series={[
            { key: "cash", label: "Cash sales", color: "#166534", values: week.points.map((p) => p.cash), area: true },
            { key: "credit", label: "Udhaar (credit) sales", color: "#D97706", values: week.points.map((p) => p.credit) },
          ]}
          formatValue={(n) => formatCurrency(n)}
          ariaLabel="Cash and udhaar sales per day, last 7 days"
          height={240}
          showTotal
        />
        <button
          onClick={() => setActiveTab("insights")}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
        >
          See 30 and 60-day trends in Smart Insights
          <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
        </button>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab("pos")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-start hover:border-emerald-700/60 shadow-2xs hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Checkout</p>
            <p className="text-base font-medium text-slate-900 mt-0.5">Open checkout</p>
            <p className="text-xs text-slate-500 mt-1">Tap, scan or speak a sale</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </button>

        <button
          onClick={() => setActiveTab("udhaar")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-start hover:border-amber-600/60 shadow-2xs hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Credit Ledger</p>
            <p className="text-base font-medium text-slate-900 mt-0.5">Customer Udhaar</p>
            <p className="text-xs text-slate-500 mt-1">{customers.length} active credit accounts</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-start hover:border-emerald-700/60 shadow-2xs hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Product Catalog</p>
            <p className="text-base font-medium text-slate-900 mt-0.5">Smart Inventory</p>
            <p className="text-xs text-slate-500 mt-1">{products.length} registered commodities</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
        </button>
      </div>
    </main>
  );
};
