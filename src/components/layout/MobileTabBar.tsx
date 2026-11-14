import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, LayoutDashboard, BookUser, Boxes, Menu, History, Lightbulb, Truck, Settings, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { TAB_ROUTE_MAP, type ActiveTab } from "@/lib/routes";

const PRIMARY: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "pos", label: "Counter", icon: ShoppingCart },
  { id: "dashboard", label: "Today", icon: LayoutDashboard },
  { id: "udhaar", label: "Udhaar", icon: BookUser },
  { id: "inventory", label: "Stock", icon: Boxes },
];

const MORE: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "history", label: "Sales history", icon: History },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "purchases", label: "Purchases", icon: Truck },
  { id: "settings", label: "Settings", icon: Settings },
];

const APP_TABS = new Set<ActiveTab>(["pos", "dashboard", "udhaar", "inventory", "history", "insights", "purchases", "settings"]);

/**
 * Thumb-zone navigation for the counter phone (visible below `lg`).
 * 56px targets, safe-area aware, with a pill that slides to the active tab.
 */
export const MobileTabBar: React.FC = () => {
  const { activeTab, user } = useApp();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close the sheet on route change or Escape.
  useEffect(() => { setMoreOpen(false); }, [activeTab]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    document.addEventListener("keydown", onKey);
    sheetRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  if (!user || !APP_TABS.has(activeTab)) return null;

  const activeIndex = PRIMARY.findIndex((t) => t.id === activeTab);
  const moreActive = activeIndex === -1;
  const pillIndex = moreActive ? PRIMARY.length : activeIndex;

  const go = (tab: ActiveTab) => navigate(TAB_ROUTE_MAP[tab]);

  return (
    <>
      {/* spacer so page content never hides behind the fixed bar */}
      <div className="h-[72px] lg:hidden" aria-hidden="true" />

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-slate-700/30 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            className="absolute inset-x-3 bottom-[84px] toast-in rounded-3xl border border-slate-200 bg-white p-3 shadow-xl"
          >
            <div className="mb-1 flex items-center justify-between px-2 pt-1">
              <p className="mono-label text-slate-500">More</p>
              <button onClick={() => setMoreOpen(false)} aria-label="Close menu" className="hit flex items-center justify-center rounded-lg text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MORE.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => go(id)}
                  className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition-colors ${
                    activeTab === id ? "border-emerald-700 bg-mint text-emerald-900" : "border-slate-200 bg-mist text-slate-700 hover:bg-sagemist"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Primary"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-5 px-2 pt-1.5 pb-1.5">
          {/* sliding pill */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 bottom-1.5 start-2 rounded-2xl bg-mint transition-transform duration-300 ease-out"
            style={{ width: "calc((100% - 1rem) / 5)", transform: `translateX(${pillIndex * 100}%)` }}
          />
          {PRIMARY.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? "page" : undefined}
                className={`relative z-10 flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors ${
                  active ? "text-emerald-900" : "text-slate-600"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
                {label}
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={`relative z-10 flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors ${
              moreActive ? "text-emerald-900" : "text-slate-600"
            }`}
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </>
  );
};
