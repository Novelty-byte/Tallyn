import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Radio, ScanLine, CalendarClock, Receipt, MessageCircle, Pause, Play, Check, TrendingDown, TrendingUp,
  PackageSearch, Clock, AlertTriangle, ArrowRight,
} from "lucide-react";
import { getBranchSeedData } from "@/data/seedData";
import { addDays, customerOverdueDays, toLocalYmd } from "@/domain/credit";
import {
  dailySeries, detectInsights, percentChange, periodSummary, previousWindow, reorderPlan, windowEnding,
} from "@/domain/insights";
import { costChangePercent, marginKeepingPrice, PRICE_RISE_ALERT_PCT } from "@/domain/billMatching";
import { buildUdhaarReminder, formatFriendlyDate } from "@/domain/whatsapp";
import { findProductByBarcode } from "@/domain/barcode";
import { formatCurrency } from "@/lib/utils";

/**
 * "A day at the counter" — an animated walkthrough of five real Tallyn moments.
 * Every figure is computed live from the demo shop by the same engine the app uses
 * (no invented numbers). Auto-advances; stops only with the Pause button;
 * stays still under prefers-reduced-motion.
 */

const MOMENTS = [
  { time: "08:00", title: "Morning briefing", text: "Kiryana Radio reads out what matters today.", Icon: Radio },
  { time: "11:30", title: "Scan & sell", text: "Each barcode scan adds one item to the cart.", Icon: ScanLine },
  { time: "14:00", title: "Udhaar with a date", text: "Credit always has a customer and a pay-back date.", Icon: CalendarClock },
  { time: "17:00", title: "Supplier bill", text: "Photograph the bill, check the lines, raise stock.", Icon: Receipt },
  { time: "21:00", title: "Remind & review", text: "A polite reminder and the week at a glance.", Icon: MessageCircle },
] as const;

const STEP_MS = 5500;
const SHOP_ID = "shop-al-madina-01";
const SHOP_NAME = "Al-Madina Kiryana";

/** Example supplier bill (as a model read it) — matched and checked by the real engine. */
const EXAMPLE_BILL = [
  { printed: "Tapal Danedar 450gm", barcode: "896101412001", qty: 12, rate: 585 },
  { printed: "Dalda Cooking Oil 1 Ltr", barcode: "896101412007", qty: 10, rate: 525 },
  { printed: "Cheeni 1 kg", barcode: "896101412010", qty: 50, rate: 145 },
];

function useDemoStory() {
  return useMemo(() => {
    const seed = getBranchSeedData(SHOP_ID);
    const today = toLocalYmd();
    const lead = 2;

    // 1. Briefing
    const insights = detectInsights({ ...seed, today, leadTimeDays: lead, currency: "PKR" });
    const salesLine = insights.find((i) => i.kind === "sales_drop" || i.kind === "sales_up");
    const yesterday = dailySeries(seed.sales, windowEnding(addDays(today, -1), 1))[0];
    const plan = reorderPlan(seed.products, seed.sales, today, lead)
      .filter((r) => r.status !== "ok")
      .sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9));
    const overdue = [...seed.customers]
      .map((c) => ({ c, days: customerOverdueDays(c, today) }))
      .filter((x) => x.days > 0)
      .sort((a, b) => b.days - a.days)[0];

    // 2. Scan & sell: real products and prices
    const scanned = ["896101412001", "896101412007", "896101412020"]
      .map((b) => findProductByBarcode(seed.products, b))
      .filter((p): p is NonNullable<typeof p> => !!p);
    const cartTotal = scanned.reduce((t, p) => t + p.sellPrice, 0);

    // 3. Udhaar: a customer who isn't overdue, due in a week
    const udhaarCustomer = seed.customers.find((c) => customerOverdueDays(c, today) === 0) ?? seed.customers[0];

    // 4. Bill: example lines checked against real buy prices
    const bill = EXAMPLE_BILL.map((l) => {
      const p = findProductByBarcode(seed.products, l.barcode);
      const change = p ? costChangePercent(l.rate, p.buyPrice) : null;
      return {
        ...l,
        product: p,
        change,
        keepPrice: p && change !== null && change > PRICE_RISE_ALERT_PCT ? marginKeepingPrice(l.rate, p.buyPrice, p.sellPrice) : null,
      };
    });

    // 5. Week at a glance + reminder
    // Same 7 complete days as the headline (today is still in progress).
    const full = windowEnding(addDays(today, -1), 7);
    const week = dailySeries(seed.sales, full).map((d) => d.revenue);
    const weekNow = periodSummary(seed.sales, [], full).revenue;
    const weekChange = percentChange(weekNow, periodSummary(seed.sales, [], previousWindow(full)).revenue);
    const reminder = overdue
      ? buildUdhaarReminder({ customerName: overdue.c.name.split(" (")[0], shopName: SHOP_NAME, balance: overdue.c.creditBalance, nextDueDate: overdue.c.nextDueDate })
      : null;

    return { today, salesLine, yesterday, firstOut: plan[0], overdue, scanned, cartTotal, udhaarCustomer, bill, week, weekNow, weekChange, reminder };
  }, []);
}

/* -------------------------------- vignettes -------------------------------- */

const pop = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

function Briefing({ s }: { s: ReturnType<typeof useDemoStory> }) {
  const bars = [6, 9, 14, 10, 18, 12, 22, 15, 9, 20, 13, 24, 17, 10, 19, 12, 8, 16, 21, 11, 14, 7, 12, 9];
  return (
    <div className="flex h-full flex-col rounded-2xl bg-emerald-950 p-5 text-white">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-300"><Radio className="h-4 w-4" /> Kiryana Radio · Subah bakhair</p>
      <div className="mt-4 flex h-12 items-end gap-1" aria-hidden="true">
        {bars.map((h, i) => (
          <span key={i} className="tn-wave w-1.5 rounded-full bg-emerald-400/80" style={{ height: `${h * 2}px`, animationDelay: `${(i % 6) * 110}ms` }} />
        ))}
      </div>
      <ul className="mt-5 space-y-3 text-sm">
        <li className="tn-pop flex gap-2.5" style={pop(250)}>
          <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>{s.salesLine?.headline ?? `Yesterday: ${formatCurrency(s.yesterday?.revenue ?? 0)} from ${s.yesterday?.salesCount ?? 0} sales.`}</span>
        </li>
        {s.firstOut && (
          <li className="tn-pop flex gap-2.5" style={pop(650)}>
            <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              {s.firstOut.name}
              {s.firstOut.daysLeft !== null ? ` may run out in ${s.firstOut.daysLeft} day${s.firstOut.daysLeft === 1 ? "" : "s"}` : ` is low`} ({s.firstOut.stock} {s.firstOut.unit} left).
            </span>
          </li>
        )}
        {s.overdue && (
          <li className="tn-pop flex gap-2.5" style={pop(1050)}>
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>{s.overdue.c.name.split(" (")[0]} owes {formatCurrency(s.overdue.c.creditBalance)}, {s.overdue.days} days overdue.</span>
          </li>
        )}
      </ul>
      <p className="tn-pop mt-auto border-t border-emerald-800/60 pt-3 text-xs text-emerald-200" style={pop(1400)}>
        In the app: tap the radio button in the top bar to hear this read aloud.
      </p>
    </div>
  );
}

function ScanSell({ s }: { s: ReturnType<typeof useDemoStory> }) {
  const stripes = [3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 3, 2, 1, 1, 2, 1, 3];
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="relative mx-auto flex h-28 w-full max-w-[260px] items-center justify-center overflow-hidden rounded-xl bg-slate-900">
        <div className="flex h-16 items-stretch gap-[2px] rounded bg-white px-3 py-2" aria-hidden="true">
          {stripes.map((w, i) => <span key={i} className={i % 2 === 0 ? "bg-slate-900" : "bg-white"} style={{ width: w * 2 }} />)}
        </div>
        <span className="scan-laser" aria-hidden="true" />
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {s.scanned.map((p, i) => (
          <li key={p.id} className="tn-pop flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2" style={pop(400 + i * 650)}>
            <span className="flex min-w-0 items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-700" />
              <span className="truncate text-slate-800">{p.nameEn}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatCurrency(p.sellPrice)}</span>
          </li>
        ))}
      </ul>
      <p className="tn-pop mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-sm" style={pop(400 + s.scanned.length * 650)}>
        <span className="text-slate-500">{s.scanned.length} items · beep, beep, beep</span>
        <span className="text-lg font-semibold text-slate-900">{formatCurrency(s.cartTotal)}</span>
      </p>
    </div>
  );
}

function Udhaar({ s }: { s: ReturnType<typeof useDemoStory> }) {
  const due = addDays(s.today, 7);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-2 text-sm font-medium">
        <span className="rounded-lg bg-slate-100 py-2.5 text-center text-slate-600">Cash</span>
        <span className="rounded-lg bg-amber-600 py-2.5 text-center text-white">Udhaar</span>
      </div>
      <div className="tn-pop mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3" style={pop(300)}>
        <p className="text-xs font-medium text-amber-900">Customer</p>
        <p className="mt-1 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-800">{s.udhaarCustomer?.name}</p>
        <p className="mt-3 text-xs font-medium text-amber-900">Pay back by</p>
        <div className="mt-1 flex flex-wrap gap-2 text-sm">
          {["1 week", "2 weeks", "1 month"].map((c, i) => (
            <span key={c} className={`rounded-md px-3 py-1.5 ${i === 0 ? "bg-amber-600 text-white" : "border border-amber-300 bg-white text-amber-900"}`}>{c}</span>
          ))}
        </div>
        <p className="tn-pop mt-2 text-sm text-amber-950" style={pop(900)}>Due on <strong>{formatFriendlyDate(due)}</strong></p>
      </div>
      <p className="tn-pop mt-auto rounded-lg bg-emerald-800 py-3 text-center text-sm font-semibold text-white" style={pop(1400)}>
        Record Udhaar Sale · {formatCurrency(s.cartTotal)}
      </p>
    </div>
  );
}

function Bill({ s }: { s: ReturnType<typeof useDemoStory> }) {
  return (
    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
      <div className="relative hidden overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-3 sm:block" aria-hidden="true">
        <p className="text-[10px] font-bold text-slate-700">AL-REHMAN TRADERS</p>
        <div className="mt-2 space-y-2">
          {[80, 65, 90, 55, 75, 60, 85].map((w, i) => <div key={i} className="h-1.5 rounded bg-slate-300" style={{ width: `${w}%` }} />)}
        </div>
        <span className="scan-laser" />
      </div>
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium text-slate-500">Example bill · read, matched and checked</p>
        <ul className="mt-2 space-y-2">
          {s.bill.map((l, i) => {
            const alert = l.change !== null && l.change > PRICE_RISE_ALERT_PCT;
            return (
              <li key={l.barcode} className={`tn-pop rounded-lg border p-2.5 text-sm ${alert ? "border-rose-200 bg-rose-50" : "border-slate-200"}`} style={pop(300 + i * 600)}>
                <p className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-slate-800">
                    <Check className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span className="truncate">{l.product?.nameEn ?? l.printed}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-700">+{l.qty} · {formatCurrency(l.rate)}</span>
                </p>
                {alert && l.product && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-rose-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Cost up {l.change}% since your last buy{l.keepPrice ? `, sell at about ${formatCurrency(l.keepPrice)} to keep your margin` : ""}.</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="tn-pop mt-auto pt-3 text-center text-sm font-semibold text-emerald-800" style={pop(2200)}>Save purchase & raise stock</p>
      </div>
    </div>
  );
}

function Review({ s }: { s: ReturnType<typeof useDemoStory> }) {
  const max = Math.max(1, ...s.week);
  const pts = s.week.map((v, i) => `${(i / (s.week.length - 1)) * 260 + 10},${70 - (v / max) * 60}`).join(" ");
  return (
    <div className="flex h-full flex-col gap-3">
      {s.reminder && (
        <div className="tn-pop max-w-[92%] self-end rounded-2xl rounded-tr-sm bg-[#d9fdd3] p-3 text-[13px] leading-5 text-slate-800 shadow-2xs" style={pop(200)}>
          <p className="whitespace-pre-line">{s.reminder}</p>
          <p className="mt-1 text-end text-[11px] text-slate-500">via WhatsApp ✓✓</p>
        </div>
      )}
      <div className="tn-pop mt-auto rounded-2xl border border-slate-200 bg-white p-4" style={pop(900)}>
        <p className="flex items-center gap-1.5 text-sm text-slate-700">
          {s.weekChange !== null && s.weekChange < 0 ? <TrendingDown className="h-4 w-4 text-rose-700" /> : <TrendingUp className="h-4 w-4 text-emerald-700" />}
          <span>
            <strong className="text-slate-900">{formatCurrency(s.weekNow)}</strong> over the last 7 full days
            {s.weekChange !== null && `, ${s.weekChange >= 0 ? "up" : "down"} ${Math.abs(s.weekChange)}%`}.
          </span>
        </p>
        <svg viewBox="0 0 280 76" preserveAspectRatio="none" className="mt-2 h-20 w-full" aria-hidden="true">
          <line x1="10" x2="270" y1="70" y2="70" stroke="#e2e8f0" vectorEffect="non-scaling-stroke" />
          <polyline points={pts} fill="none" stroke="#166534" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

/* --------------------------------- section --------------------------------- */

export const CounterDayShowcase: React.FC<{ onTryDemo: () => void }> = ({ onTryDemo }) => {
  const story = useDemoStory();
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLOListElement>(null);

  // On phones the moments are a horizontal strip: keep the active one visible by
  // scrolling the strip itself (never the page).
  useEffect(() => {
    const strip = stripRef.current;
    const item = strip?.children[active] as HTMLElement | undefined;
    if (!strip || !item || strip.scrollWidth <= strip.clientWidth) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left: item.offsetLeft - strip.offsetLeft - 8, behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  // Only play while the section is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Stops only via the Pause button (and while the section is off screen).
  const playing = inView && !userPaused;
  const next = () => setActive((a) => (a + 1) % MOMENTS.length);
  const vignettes = [Briefing, ScanSell, Udhaar, Bill, Review];
  const Vignette = vignettes[active];

  return (
    <section
      ref={ref}
      aria-labelledby="counter-day-title"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
          <Clock className="h-3.5 w-3.5 text-amber-600" /> A day at the counter
        </span>
        <h2 id="counter-day-title" className="text-2xl font-semibold text-slate-900 sm:text-4xl">From opening to closing, in five taps of Tallyn</h2>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          The numbers below aren't made up — they're calculated live from the demo shop by the same engine the app uses.
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Timeline */}
        <div className="flex flex-col">
          <ol ref={stripRef} className="relative flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible scrollbar-none">
            {MOMENTS.map((m, i) => {
              const isActive = i === active;
              return (
                <li key={m.time} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={isActive}
                    aria-controls="counter-day-panel"
                    className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-start transition-colors ${
                      isActive ? "border-slate-300 bg-white shadow-soft" : "border-transparent hover:bg-white/70"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-emerald-800 text-amber-300" : "bg-slate-100 text-slate-500"}`}>
                        <m.Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold tabular-nums text-slate-500">{m.time}</span>
                        <span className="block whitespace-nowrap text-sm font-semibold text-slate-900">{m.title}</span>
                        <span className="hidden text-sm text-slate-600 lg:block">{m.text}</span>
                      </span>
                    </span>
                    {isActive && (
                      <span
                        key={`p-${active}`}
                        aria-hidden="true"
                        className="tn-progress absolute inset-x-0 bottom-0 h-[3px] bg-emerald-700"
                        style={{ animationDuration: `${STEP_MS}ms`, animationPlayState: playing ? "running" : "paused" }}
                        onAnimationEnd={next}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {userPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {userPaused ? "Play" : "Pause"}
            </button>
            <button
              type="button"
              onClick={onTryDemo}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Try it in the demo shop <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </div>

        {/* Stage */}
        <div
          id="counter-day-panel"
          role="region"
          aria-label={`${MOMENTS[active].time} — ${MOMENTS[active].title}`}
          className="flex flex-col rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/60 p-4 shadow-soft sm:p-6"
        >
          <p className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{MOMENTS[active].time} · {MOMENTS[active].title}</span>
            <span className="tabular-nums">{active + 1} / {MOMENTS.length}</span>
          </p>
          <div key={active} className="tn-pop min-h-[380px] flex-1 sm:min-h-[360px] [&>*]:h-full">
            <Vignette s={story} />
          </div>
        </div>
      </div>
    </section>
  );
};
