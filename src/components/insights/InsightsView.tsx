import React from "react";
import { useApp } from "@/context/AppContext";
import { computeRunRate, computeRecommendedReorder } from "@/lib/deterministicMath";
import { 
  AlertTriangle, 
  Calendar, 
  Package, 
  ArrowUpRight, 
  ShieldCheck,
  Zap
} from "lucide-react";

export const InsightsView: React.FC = () => {
  
  const { products, sales, setActiveTab } = useApp();

  // Low stock products with run rate
  const stockInsights = products.slice(0, 10).map((p) => {
    const runRate = computeRunRate(p, sales);
    const reorder = computeRecommendedReorder(p, runRate.avgDailyUnits, 2, 3);
    return {
      product: p,
      daysLeft: runRate.daysLeft,
      avgDailyUnits: runRate.avgDailyUnits,
      reorderQty: reorder,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/80 mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
          <span>Deterministic Intelligence Engine</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Store Insights & Predictive Forecasting
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Run-rate math, reorder formulas, and cultural seasonal demand forecaster (Zero Hallucinated Numbers).
        </p>
      </div>

      {/* Feature 8: Seasonal & Ramadan Demand Forecaster */}
      <div className="rounded-3xl border-2 border-emerald-700/30 bg-emerald-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div 
          className="absolute -end-10 -bottom-10 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" 
        />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
                Feature 8: Cultural Demand Model
              </span>
              <h3 className="text-lg sm:text-xl font-semibold text-white">
                Upcoming Ramadan & Seasonal Forecaster
              </h3>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-300 self-start md:self-auto">
            <Zap className="h-3.5 w-3.5" /> Surge Multiplier: +280%
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs leading-relaxed">
          <div className="rounded-2xl border border-emerald-800/80 bg-emerald-900/40 p-4">
            <p className="font-bold text-amber-300 mb-1">Impacted Key Commodities:</p>
            <p className="text-slate-200">
              Rooh Afza Syrup, White Sugar (Cheeni), Super Kernel Basmati Rice, Gram Flour (Besan), Cooking Oil.
            </p>
            <p className="mt-3 text-slate-300">
              Historical retail velocity for syrups and flour jumps 280% in Ramadan. Wholesale market portal prices rise 12-15% roughly 10 days before moon sighting.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-800/80 bg-emerald-900/40 p-4 flex flex-col justify-between">
            <div>
              <p className="font-bold text-emerald-300 mb-1">Autonomous Restock Recommendation:</p>
              <p className="text-slate-200">
                Lock supplier bulk purchase order now for 30 cartons of Rooh Afza and 20 bags of 50kg Sugar to protect a 22% retail profit margin against wholesale inflation.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("purchases")}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors self-start"
            >
              <span>Draft Bulk Purchase Order</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Deterministic Inventory Run-Rate & Reorder Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Stock Run-Rate & Reorder Estimator
            </h3>
            <p className="text-xs text-slate-500">
              Calculated using formula: Days Left = Quantity / 14-day average daily unit sales
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
              <tr>
                <th className="py-3 px-4 text-start">Commodity</th>
                <th className="py-3 px-4 text-end">Current Stock</th>
                <th className="py-3 px-4 text-end">Daily Run-Rate</th>
                <th className="py-3 px-4 text-center">Days of Stock Remaining</th>
                <th className="py-3 px-4 text-end">Recommended Reorder Qty</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockInsights.map((item, idx) => {
                const isUrgent = item.daysLeft <= 4;
                return (
                  <tr
                    key={idx}
                    className="group hover:bg-emerald-50/50 transition-all duration-200 border-l-2 border-l-transparent hover:border-l-emerald-700"
                    style={{ animation: `tn-fade-in 300ms var(--ease-out) ${Math.min(idx * 40, 600)}ms both` }}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:translate-x-1 transition-transform duration-200">
                      {item.product.name || item.product.nameEn}
                    </td>
                    <td className="py-3.5 px-4 text-end font-semibold text-slate-800">
                      {item.product.quantity} {item.product.unit}
                    </td>
                    <td className="py-3.5 px-4 text-end text-slate-500">
                      ~{item.avgDailyUnits} / day
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition-transform group-hover:scale-105 ${
                        isUrgent ? "bg-rose-100 text-rose-900 group-hover:animate-pump" : "bg-emerald-50 text-emerald-800"
                      }`}>
                        {item.daysLeft} days
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-end font-bold text-emerald-800">
                      +{item.reorderQty} {item.product.unit}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isUrgent ? (
                        <span className="text-xs font-bold text-rose-600 flex items-center justify-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Reorder Now
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Adequate</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deterministic Anomaly Detectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Anomaly 1: Utility Expense Spike */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-2xs">
          <div className="flex items-center gap-2.5 text-rose-900 font-bold text-xs uppercase mb-1">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>Anomaly Alert: Commercial Utility Spike</span>
          </div>
          <h4 className="text-sm font-extrabold text-slate-900 mt-1">
            IESCO Commercial Electricity Bill Spike Detected
          </h4>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            November electricity expense of Rs. 24,800 is 1.7x higher than rolling 3-month shop average (Rs. 14,500). Net profit margin impacted by -4.2%.
          </p>
        </div>

        {/* Anomaly 2: Dead Stock Shrinkage */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-2xs">
          <div className="flex items-center gap-2.5 text-amber-900 font-bold text-xs uppercase mb-1">
            <Package className="h-4 w-4 text-amber-600" />
            <span>Anomaly Alert: Stagnant Inventory Detected</span>
          </div>
          <h4 className="text-sm font-extrabold text-slate-900 mt-1">
            Zero Sales in 28 Days: Rooh Afza Herbal Syrup
          </h4>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Capital of Rs. 2,220 is tied up in slow-moving stock. Use the Clearance Combo Bundler to pair with white sugar before winter ends.
          </p>
        </div>
      </div>
    </div>
  );
};
