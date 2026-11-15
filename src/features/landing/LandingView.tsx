import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { audio } from "@/lib/audio";
import { formatCurrency } from "@/lib/utils";
import { ArchitectureModal } from "@/features/landing/ArchitectureModal";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { AmbientBackground } from "@/components/fx/AmbientBackground";
import { CounterScene } from "@/components/fx/CounterScene";
import { CounterDayShowcase } from "@/features/landing/CounterDayShowcase";
import { addDays, toLocalYmd } from "@/domain/credit";
import { buildUdhaarReminder, formatFriendlyDate } from "@/domain/whatsapp";
import { costChangePercent, marginKeepingPrice } from "@/domain/billMatching";
import { nextRamadan } from "@/domain/insights";
import { 
  ArrowRight, 
  Smartphone, 
  Sparkles, 
  Zap, 
  Mic, 
  Radio, 
  Check, 
  X as CloseIcon,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  Play,
  Volume2,
  Camera,
  Coins,
  Store,
  Trash2,
  RotateCcw,
  Building2,
  CheckCircle2,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Unlisted demo video shown beside every engine tab (youtube.com/watch?v=HEaf0UN1LxA).
const DEMO_VIDEO_ID = "HEaf0UN1LxA";
// Muted autoplay is the only autoplay browsers allow; `playlist` = same ID makes `loop` work.
const DEMO_VIDEO_SRC = `https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${DEMO_VIDEO_ID}&playsinline=1&rel=0&modestbranding=1`;
// How long each engine tab stays up before auto-advancing.
const ENGINE_STEP_MS = 6000;

interface EngineTab {
  label: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  cta: React.ReactNode;
  panel: React.ReactNode;
}

interface PhoneCartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export const LandingView: React.FC = () => {
  const navigate = useNavigate();
  const {
    openSeededDemoShop,
    loginWithGoogle,
    setIsKiryanaRadioOpen
  } = useApp();
  const ramadan = nextRamadan(toLocalYmd());

  // Tab & Modal States
  const [activeFeatureTab, setActiveFeatureTab] = useState<number>(0);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);

  // Engine tabs auto-advance every ENGINE_STEP_MS, paused while the mouse is over
  // the active tab's text or panel (not the tab strip or video), while keyboard
  // focus is inside, or while the section is off screen.
  const [enginesHovering, setEnginesHovering] = useState(false);
  const [enginesFocusInside, setEnginesFocusInside] = useState(false);
  const [enginesInView, setEnginesInView] = useState(false);
  const enginesRef = useRef<HTMLDivElement>(null);
  const engineStripRef = useRef<HTMLDivElement>(null);
  const enginesPlaying = enginesInView && !enginesHovering && !enginesFocusInside;

  useEffect(() => {
    const el = enginesRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setEnginesInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // On phones the tab strip scrolls sideways: keep the active tab centred in it
  // (scrolls the strip only, never the page).
  useEffect(() => {
    const strip = engineStripRef.current;
    const item = strip?.children[activeFeatureTab] as HTMLElement | undefined;
    if (!strip || !item || strip.scrollWidth <= strip.clientWidth) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left: item.offsetLeft - (strip.clientWidth - item.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [activeFeatureTab]);

  // Hero interactive ticker state (retained for comparison table elsewhere on page)

  // Phone Simulator Interactive State
  const [phoneCart, setPhoneCart] = useState<PhoneCartItem[]>([
    { id: "p1", name: "Tapal Danedar 450g", price: 650, qty: 1 }
  ]);
  const [phoneVoiceActive, setPhoneVoiceActive] = useState(false);
  const [phoneVoiceNotice, setPhoneVoiceNotice] = useState<string | null>(null);
  const [phoneSaleCompleted, setPhoneSaleCompleted] = useState<boolean>(false);
  const [phoneUndoAvailable, setPhoneUndoAvailable] = useState<boolean>(false);
  const [lastCompletedTotal, setLastCompletedTotal] = useState<number>(650);

  // Quick Sign-up state
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpShopName, setSignUpShopName] = useState("");
  const [signUpErrors, setSignUpErrors] = useState<{ email?: string; shopName?: string }>({});

  // Phone Simulator Actions
  const handleAddPhoneItem = (item: { id: string; name: string; price: number }) => {
    audio.playBarcodeBeep();
    setPhoneSaleCompleted(false);
    setPhoneCart(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const handleRemovePhoneItem = (id: string) => {
    setPhoneCart(prev => prev.filter(p => p.id !== id));
  };

  const handlePhoneVoicePOS = async () => {
    setPhoneVoiceActive(true);
    setPhoneSaleCompleted(false);
    const spokenText = "Two tea and one cooking oil credit to Asif";
    setPhoneVoiceNotice('Voice Input: "Two tea and one cooking oil credit to Asif"');
    
    // Web Speech API execution
    await audio.speak(spokenText, "en");

    // Add items deterministically
    setPhoneCart([
      { id: "p1", name: "Tapal Danedar 450g", price: 650, qty: 2 },
      { id: "p2", name: "Dalda Cooking Oil 1L", price: 540, qty: 1 }
    ]);
    
    audio.playCashRegisterChime();
    setPhoneVoiceActive(false);
  };

  const handlePhoneCheckout = () => {
    if (phoneCart.length === 0) return;
    const currentTotal = phoneCart.reduce((sum, item) => sum + item.price * item.qty, 0);
    setLastCompletedTotal(currentTotal);
    audio.playCashRegisterChime();
    setPhoneSaleCompleted(true);
    setPhoneUndoAvailable(true);
    setPhoneCart([]);

    // 10-second undo window
    setTimeout(() => {
      setPhoneUndoAvailable(false);
    }, 10000);
  };

  const handlePhoneUndoSale = () => {
    audio.playUndoSound();
    setPhoneSaleCompleted(false);
    setPhoneUndoAvailable(false);
    setPhoneCart([
      { id: "p1", name: "Tapal Danedar 450g", price: 650, qty: 1 },
      { id: "p2", name: "Dalda Cooking Oil 1L", price: 540, qty: 1 }
    ]);
  };

  const handleQuickRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; shopName?: string } = {};
    if (!signUpShopName.trim()) {
      errors.shopName = "Please enter your store or business name.";
    }
    if (!signUpEmail.trim()) {
      errors.email = "Please enter an email address for receipt summaries.";
    } else if (!signUpEmail.includes("@")) {
      errors.email = "Please include an '@' in the email address.";
    }
    if (Object.keys(errors).length > 0) {
      setSignUpErrors(errors);
      return;
    }
    setSignUpErrors({});
    navigate(`/register?email=${encodeURIComponent(signUpEmail.trim())}&shopName=${encodeURIComponent(signUpShopName.trim())}`);
  };

  const phoneSubtotal = phoneCart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const primaryCtaClass = "rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 text-xs font-bold transition-colors";
  const engines: EngineTab[] = [
    {
      label: "Say-It Voice Checkout",
      icon: Mic,
      eyebrow: "Engine 1: Conversational Checkout",
      title: "Say-It: Speech-to-Cart Voice Checkout",
      body: <>During peak evening hours, typing on a small counter phone is impossible. Simply speak naturally: <i>"2 chai, 1 ghee udhaar Asif"</i>. Tallyn's speech pipeline extracts the products, quantities, and debtor name into a structured cart payload ready for 1-tap confirmation.</>,
      cta: <button onClick={openSeededDemoShop} className={primaryCtaClass}>Try in Demo Checkout</button>,
      panel: (
        <div className="bg-emerald-950 text-white p-6 rounded-2xl border border-emerald-800 shadow-inner soft-panel">
          <div className="flex items-center gap-2 text-amber-300 font-mono text-xs mb-3">
            <Mic className="h-4 w-4" />
            <span>Speech Transcription Stream:</span>
          </div>
          <p className="text-base font-bold text-white italic">
            "2 Tapal Danedar tea, 1 Dalda oil, credit to Asif Bhai house 12"
          </p>
          <div className="mt-4 pt-3 border-t border-emerald-800/80 space-y-1.5 text-xs text-emerald-200">
            <p>✓ Extracted: 2x Tapal Danedar Tea (Rs. 1,300)</p>
            <p>✓ Extracted: 1x Dalda Cooking Oil 1L (Rs. 540)</p>
            <p>✓ Debtor Mapped: Asif Bhai (Current Debt: Rs. 3,400)</p>
          </div>
        </div>
      ),
    },
    {
      label: "Paper Bill Scanner",
      icon: Camera,
      eyebrow: "Engine 2: Multimodal Vision OCR",
      title: "Crumpled Supplier Paper Invoice Scanner",
      body: "Suppliers hand handwritten delivery slips that get lost. Point your smartphone camera at any wholesale bill; Gemini Vision OCR extracts item names, unit purchase prices, and batch counts, updating your inventory stock atomically.",
      cta: <button onClick={openSeededDemoShop} className={primaryCtaClass}>Open Supplier Scanner</button>,
      panel: (
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-inner soft-panel">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
            <span>Vision OCR Extraction Preview</span>
            <span className="text-emerald-400 font-bold">100% Parsed</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="bg-slate-800 p-2.5 rounded-xl flex justify-between">
              <span>Metro Wholesale: 50kg Sugar Bag</span>
              <span className="font-bold text-amber-300">Rs. 6,800</span>
            </div>
            <div className="bg-slate-800 p-2.5 rounded-xl flex justify-between">
              <span>Habib Oil Mills: 16L Carton</span>
              <span className="font-bold text-amber-300">Rs. 7,200</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "Kiryana Radio Audio",
      icon: Radio,
      eyebrow: "Engine 3: Spoken Executive Audio",
      title: "Kiryana Radio (Morning Memo)",
      body: "Every morning at 8:00 AM, tap one button to hear a warm 3-sentence executive audio brief in natural voice: yesterday's cash vs credit revenue, who owes overdue debt, and which commodities need ordering before evening rush.",
      cta: (
        <button
          onClick={() => setIsKiryanaRadioOpen(true)}
          className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Play className="h-4 w-4 fill-slate-950" />
          <span>Listen to Morning Memo</span>
        </button>
      ),
      panel: (
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 text-center shadow-inner soft-panel">
          <Radio className="h-10 w-10 text-amber-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-amber-300">Spoken Memo Synthesizer</p>
          <p className="text-xs text-slate-400 mt-1 italic">
            "Good morning Haji Aslam! Today's recorded store revenue is Rs 18,900..."
          </p>
        </div>
      ),
    },
    {
      label: "WhatsApp Debt Drafter",
      icon: MessageSquare,
      eyebrow: "Engine 4: Cultural Communication",
      title: "Culturally Respectful WhatsApp Udhaar Reminders",
      body: "Collecting debt in neighbourhood culture requires immense respect and tact. Tallyn generates respectful, warm reminder drafts and opens `wa.me` deep links directly on your phone with zero paid API costs.",
      cta: <button onClick={openSeededDemoShop} className={primaryCtaClass}>View Udhaar Ledger</button>,
      panel: (
        <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl text-xs text-emerald-950 text-start shadow-inner">
          <p className="font-bold text-emerald-900 mb-2">WhatsApp reminder (exactly what Tallyn sends):</p>
          <p className="whitespace-pre-line leading-relaxed">
            {buildUdhaarReminder({ customerName: "Asif Bhai", shopName: "Al-Madina Kiryana", balance: 3400, nextDueDate: addDays(toLocalYmd(), -7) })}
          </p>
        </div>
      ),
    },
    {
      label: "Mahngai Market Watchdog",
      icon: TrendingUp,
      eyebrow: "Engine 5: Mahngai Watchdog",
      title: "Supplier Price-Rise Check",
      body: "When you scan or enter a supplier bill, Tallyn compares each cost with what you paid last time. A rise above 5% is flagged before you save, with a selling price that keeps your margin.",
      cta: <button onClick={openSeededDemoShop} className={primaryCtaClass}>Try It in Purchases</button>,
      panel: (
        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 text-xs shadow-inner soft-panel">
          <p className="text-slate-400">Example bill line vs your last buy price</p>
          <div className="flex justify-between gap-3 border-b border-slate-800 pb-2">
            <span>Dalda Cooking Oil 1L · PKR 480 → 525</span>
            <span className="text-rose-400 font-bold whitespace-nowrap">Cost up {costChangePercent(525, 480)}%</span>
          </div>
          <p className="text-slate-300">Keep your margin: sell at about PKR {marginKeepingPrice(525, 480, 540)} (now PKR 540).</p>
          <div className="flex justify-between gap-3 border-t border-slate-800 pt-2">
            <span>Tapal Danedar Tea 450g · PKR 570 → 585</span>
            <span className="text-emerald-400 font-bold whitespace-nowrap">+{costChangePercent(585, 570)}%, normal</span>
          </div>
        </div>
      ),
    },
    {
      label: "Ramadan Demand Forecaster",
      icon: Zap,
      eyebrow: "Engine 6: Cultural Calendar",
      title: "Ramadan Stock Planner",
      body: "Counts down to Ramadan and shows how many days of stock you have left for staples like sugar, oil, besan, Rooh Afza and dates, so you can buy in bulk before wholesale prices rise.",
      cta: <button onClick={openSeededDemoShop} className={primaryCtaClass}>View Ramadan Planner</button>,
      panel: (
        <div className="bg-amber-950/80 border border-amber-500/40 text-amber-100 p-5 rounded-2xl text-xs shadow-inner">
          <p className="font-bold text-amber-300">Ramadan countdown</p>
          <p className="mt-1 leading-relaxed">
            {ramadan
              ? `Expected around ${formatFriendlyDate(ramadan.start)}, in ${ramadan.daysUntil} days (±1 day, moon sighting). Plan bulk buying 2–3 weeks before.`
              : "No upcoming Ramadan date on file."}
          </p>
        </div>
      ),
    },
    {
      label: "Multi-Store Chain Hub",
      icon: Building2,
      eyebrow: "Engine 7: Multi-Branch Infrastructure",
      title: "Multi-Store Chain Management Hub",
      body: "Expand from one neighbourhood counter to a city-wide chain seamlessly. Manage multiple store branches under a single merchant account with one-tap store switching, synchronized customer debt ledgers, inter-branch stock transfers, and consolidated chain P&L reports.",
      cta: <button onClick={openSeededDemoShop} className={primaryCtaClass}>Explore Multi-Store Switching</button>,
      panel: (
        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 text-xs shadow-inner soft-panel">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              <span className="font-bold">Branch #1: Al-Madina Main Bazar</span>
            </div>
            <span className="text-emerald-400 font-mono">Rs. 42,800 Today</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-400" />
              <span className="font-bold">Branch #2: Madina Super G-9 Markaz</span>
            </div>
            <span className="text-sky-400 font-mono">Rs. 68,150 Today</span>
          </div>
          <div className="pt-1 flex items-center justify-between text-slate-400 text-xs">
            <span>Consolidated Chain Revenue</span>
            <span className="text-amber-300 font-bold font-mono">Rs. 110,950</span>
          </div>
        </div>
      ),
    },
  ];
  const showEngine = (i: number) => {
    // The newly shown text/panel re-arms the hover pause on the next mouse move.
    setEnginesHovering(false);
    setActiveFeatureTab(i);
  };
  const nextEngine = () => showEngine((activeFeatureTab + 1) % engines.length);
  // Only the visible text block and panel pause the timer; hidden layers are
  // pointer-events-none, so they never receive these events.
  const engineHoverHandlers = {
    onMouseOver: () => setEnginesHovering(true),
    onMouseLeave: () => setEnginesHovering(false),
  };
  // All tabs share one grid cell; only the active one is visible, so the card
  // keeps a steady height and tabs cross-fade instead of remounting.
  // `self-start` keeps each layer's hover area to its own content.
  const engineLayerClass = (i: number) =>
    `[grid-area:1/1] self-start transition-[opacity,transform,visibility] duration-500 ease-out ${
      activeFeatureTab === i ? "opacity-100 translate-y-0 visible" : "opacity-0 translate-y-2 invisible pointer-events-none"
    }`;


  return (
    <div className="space-y-16 sm:space-y-28 pb-24 overflow-hidden bg-transparent text-slate-900">

      {/* 2. Hero Section */}
      <section data-fx="cursor-zone" className="relative pt-6 sm:pt-14 pb-8 overflow-hidden">
        {/* Calm Tech ambient layer: drifting light tints + cursor-reactive dot grid */}
        <AmbientBackground variant="hero" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center lg:text-start lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:items-center">
         <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100/90 px-4 py-1.5 text-xs font-semibold text-emerald-950 shadow-xs mb-6">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" /></span>
            <span className="mono-label text-emerald-900">Live · built for kiryana counters</span>
          </div>

          {/* Main Headline */}
          <h1 className="max-w-4xl mx-auto lg:mx-0 text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-[-0.03em] text-slate-900 leading-[1.08]">
            Run the counter.<br className="hidden sm:block" />{" "}
            <span className="text-emerald-800">Not the paperwork.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-slate-600 leading-relaxed">
            Tap or speak to bill a customer. Stock, profit and udhaar are calculated by exact code, never guessed by AI, so the numbers on your phone are the numbers in your till.
          </p>

          {/* --- THE CENTRALIZED BIG SEEDED DEMO BUTTON --- */}
          <div className="mt-9 flex flex-col items-center lg:items-start justify-center">
            <button
              data-fx="magnetic"
              onClick={openSeededDemoShop}
              className="group relative inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-amber-100 px-8 py-4 text-base sm:text-lg font-semibold shadow-lift hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 active:scale-98 border border-emerald-700/60 min-h-[64px] overflow-hidden"
            >
              {/* Shimmer sweep on hover */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-bold shadow-xs group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300">
                  <Play className="h-5 w-5 fill-slate-950" />
                </div>
                <div className="text-start">
                  <span className="block text-base sm:text-lg font-semibold text-amber-300">
                    Launch Live Demo Store (Al-Madina Kiryana)
                  </span>
                  <span className="block text-xs text-emerald-100 font-medium">
                    3 branches • 60 days of sales history • Instant test-drive without sign-up
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-amber-300 rtl:rotate-180 group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </button>

            {/* Sub-Actions */}
            <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-white/80 px-3 py-1 rounded-full border border-emerald-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-default">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> 60 Days of Sales History
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-white/80 px-3 py-1 rounded-full border border-emerald-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-default">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> Udhaar Customers with Due Dates
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-white/80 px-3 py-1 rounded-full border border-emerald-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-default">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> Live Voice Audio
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-white/80 px-3 py-1 rounded-full border border-emerald-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-default">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> Multi-Store Switching Ready
              </span>
            </div>
          </div>

          <CounterScene className="mt-8 mx-auto h-48 w-full max-w-sm xl:hidden" />
         </div>

          {/* 3. Interactive 390px Checkout Phone Simulator */}
          <div className="mt-12 lg:mt-0 max-w-lg mx-auto relative w-full">
            <CounterScene className="pointer-events-none absolute -bottom-10 -end-6 -z-10 hidden h-[240px] w-[320px] opacity-80 xl:block" />
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300">
                <Smartphone className="h-3.5 w-3.5" /> Interactive 390px Counter Phone Simulator
              </span>
              <p className="text-xs text-slate-500 mt-1">Tap commodities to test real Web Audio beeps, voice speech, and instant checkout</p>
            </div>

            {/* Mobile Handset Bezel */}
            <div className="w-full max-w-[390px] mx-auto rounded-[42px] border-[9px] border-[#3d4a45] bg-white p-3 shadow-2xl text-slate-900 relative overflow-hidden ring-4 ring-emerald-900/10">
              
              {/* Phone Dynamic Island / Notch */}
              <div className="flex items-center justify-between px-3 pt-1 pb-2 border-b border-slate-200 text-xs font-mono text-slate-500">
                <span>09:41</span>
                <div className="h-4 w-20 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span>4G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Counter App Header inside phone */}
              <div className="pt-2 pb-3 px-1 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-700 text-amber-700 flex items-center justify-center font-bold">
                    <Store className="h-4 w-4" />
                  </div>
                  <div className="text-start">
                    <h3 className="text-xs font-semibold text-slate-900">Al-Madina Kiryana</h3>
                    <p className="text-xs text-emerald-700 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Checkout #1
                    </p>
                  </div>
                </div>

                {/* Voice checkout trigger inside phone */}
                <button
                  onClick={handlePhoneVoicePOS}
                  disabled={phoneVoiceActive}
                  aria-label="Test voice checkout in phone simulator"
                  className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 shadow-sm min-h-[44px]"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>{phoneVoiceActive ? "Listening..." : "Voice checkout"}</span>
                  {phoneVoiceActive && <Volume2 className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Voice Notice bubble */}
              {phoneVoiceNotice && (
                <div className="my-2 rounded-xl bg-cream border border-amber-300 p-2 text-xs font-semibold text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                    <span>{phoneVoiceNotice}</span>
                  </div>
                  <button 
                    onClick={() => setPhoneVoiceNotice(null)} 
                    aria-label="Dismiss voice notice"
                    className="text-amber-700 hover:text-slate-900 p-1"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Clickable Product Shelf inside phone */}
              <div className="my-2 text-start">
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Quick Counter Items (Tap to Add)
                  </span>
                  <span className="text-xs text-emerald-700 font-mono">Web Audio Active</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "p1", name: "Tapal Tea 450g", price: 650, cat: "Chai" },
                    { id: "p2", name: "Dalda Ghee 1L", price: 540, cat: "Ghee" },
                    { id: "p3", name: "Sugar 1kg", price: 155, cat: "Cheeni" },
                    { id: "p4", name: "MilkPak 1L", price: 290, cat: "Milk" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddPhoneItem(item)}
                      className="text-start p-2 rounded-xl bg-mist border border-slate-200 hover:border-emerald-500 hover:bg-mint transition-all active:scale-95 cursor-pointer group min-h-[44px]"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{item.cat}</span>
                        <span className="text-emerald-700 font-semibold group-hover:scale-105 transition-transform">+ Add</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 mt-0.5 truncate">{item.name}</p>
                      <p className="text-xs font-bold text-amber-700 font-mono tabular-nums">{formatCurrency(item.price)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart Summary inside phone */}
              <div className="rounded-xl bg-mist border border-slate-200 p-2.5 my-2">
                <div className="flex items-center justify-between text-xs mb-1.5 pb-1 border-b border-slate-200">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <ShoppingBag className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Cart ({phoneCart.reduce((sum, i) => sum + i.qty, 0)} items)</span>
                  </span>
                  <button 
                    onClick={() => setPhoneCart([])}
                    className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-0.5 p-1"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </div>

                {phoneCart.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center italic">
                    Cart empty. Tap a product above or tap Voice checkout!
                  </p>
                ) : (
                  <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-none pr-1">
                    {phoneCart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 truncate max-w-[170px]">
                          {item.qty}x {item.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums text-amber-700 font-bold">
                            {formatCurrency(item.price * item.qty)}
                          </span>
                          <button 
                            onClick={() => handleRemovePhoneItem(item.id)}
                            className="text-slate-500 hover:text-rose-600 p-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700">Total Payable:</span>
                  <span className="text-sm font-mono tabular-nums text-amber-700 font-bold">
                    {formatCurrency(phoneSubtotal)}
                  </span>
                </div>
              </div>

              {/* Sale Success / Undo Banner inside phone */}
              {phoneSaleCompleted && (
                <div className="my-2 rounded-xl bg-mint border border-emerald-400 p-2 text-start">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-semibold text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Sale Completed: {formatCurrency(lastCompletedTotal)}</span>
                    </div>
                    {phoneUndoAvailable && (
                      <button
                        onClick={handlePhoneUndoSale}
                        className="flex items-center gap-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 px-2 py-0.5 text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Undo Sale</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Stock atomically decremented. 10-second safety window open.
                  </p>
                </div>
              )}

              {/* Checkout Action Button inside phone */}
              <div className="pt-1">
                <button
                  onClick={handlePhoneCheckout}
                  disabled={phoneCart.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-semibold py-2.5 text-xs shadow-lift transition-all active:scale-95 cursor-pointer min-h-[44px]"
                >
                  <Coins className="h-4 w-4" />
                  <span>Record Sale ({formatCurrency(phoneSubtotal)})</span>
                </button>
              </div>

              {/* Phone Home Bar */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="h-1 w-28 rounded-full bg-slate-300" />
              </div>
            </div>

            {/* Launch Demo Callout below phone */}
            <div className="mt-4 flex items-center justify-center">
              <button
                onClick={openSeededDemoShop}
                className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-4 py-2 rounded-2xl transition-colors shadow-2xs"
              >
                <span>Open Full Store Checkout & Back Office</span>
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Autonomous Capabilities Interactive Tabs */}
      <AnimatedSection delay={200} direction="up" threshold={0.1}>
      <section id="capabilities" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Complete Autonomous Suite</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
            Seven Engines Built for Counter Livelihood
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Pure deterministic code protects your money. Multimodal Gemini AI handles the voice, vision OCR, market intelligence, and customer communications.
          </p>
        </div>

        <div
          ref={enginesRef}
          onFocus={(e) => { if (e.target.matches(":focus-visible")) setEnginesFocusInside(true); }}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEnginesFocusInside(false); }}
        >
        {/* Tab Strip: the bar along the active tab's bottom edge is the timer; when it fills, the next tab opens */}
        <div ref={engineStripRef} className="relative flex justify-start overflow-x-auto gap-2 px-1 pt-1 pb-2 scrollbar-none mb-8 [&>*:first-child]:ms-auto [&>*:last-child]:me-auto">
          {engines.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeFeatureTab === i;
            return (
              <button
                key={tab.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => showEngine(i)}
                className={`relative overflow-hidden flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 min-h-[44px] cursor-pointer hover:-translate-y-0.5 ${
                  isActive
                    ? "bg-emerald-800 text-white shadow-md ring-2 ring-emerald-600 scale-105"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-emerald-300 hover:shadow-sm"
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? "scale-125 rotate-6" : "group-hover:scale-110"}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="tn-progress absolute inset-x-0 bottom-0 h-[3px] bg-amber-400"
                    style={{ animationDuration: `${ENGINE_STEP_MS}ms`, animationPlayState: enginesPlaying ? "running" : "paused" }}
                    onAnimationEnd={nextEngine}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Active Content Card: the video is mounted once here and never remounts, so it plays straight through tab changes */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 items-center">
            <div className="grid">
              {engines.map((tab, i) => (
                <div key={tab.label} className={engineLayerClass(i)} {...engineHoverHandlers}>
                  <span className="text-xs font-mono font-bold text-amber-600 uppercase">{tab.eyebrow}</span>
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">{tab.title}</h3>
                  <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">{tab.body}</p>
                  <div className="mt-6 flex gap-3">{tab.cta}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 min-w-0">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-900">
                    <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                    Watch Tallyn in action
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Unmute in the player
                  </span>
                </div>
                <div className="rounded-2xl bg-emerald-900 p-1.5 shadow-xl shadow-emerald-900/30 ring-1 ring-emerald-950/20">
                  <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black">
                    <iframe
                      className="absolute inset-0 h-full w-full"
                      src={DEMO_VIDEO_SRC}
                      title="Tallyn product demo video"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>
              </div>

              <div className="grid">
                {engines.map((tab, i) => (
                  <div key={tab.label} className={engineLayerClass(i)} {...engineHoverHandlers}>{tab.panel}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
      </AnimatedSection>

      {/* Multi-Store Chain OS Section */}
      <AnimatedSection delay={400} direction="up" threshold={0.1}>
      <section id="multi-store" className="scroll-mt-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 mb-3">
            <Building2 className="h-3.5 w-3.5 text-amber-600" />
            <span>Multi-Branch Infrastructure</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
            One Account. Multiple Stores. Zero Confusion.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Manage all your Kiryana branches from a single owner dashboard — switch stores in one tap, each with fully independent inventory, customers, udhaar ledger, and cash flows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "🏪",
              title: "Main Branch G-9/4",
              city: "Islamabad",
              desc: "Traditional neighbourhood staples — Atta, Sugar, Daal, Tea. Established customer relationships and community trust.",
              color: "bg-emerald-50 border-emerald-200",
            },
            {
              icon: "🏬",
              title: "Express Branch F-10",
              city: "Islamabad",
              desc: "High-velocity dairy, beverages, snacks & confectionery. Office-area premium clientele with quick-service format.",
              color: "bg-amber-50 border-amber-200",
            },
            {
              icon: "🏭",
              title: "Mart Branch Saddar",
              city: "Rawalpindi",
              desc: "B2B wholesale bulk — 50kg sacks, master cartons, crates. Chai Khanas and canteens as repeat customers.",
              color: "bg-slate-50 border-slate-200",
            },
          ].map((branch, i) => (
            <div key={i} data-fx="tilt spot" className={`rounded-2xl border p-6 ${branch.color} group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col justify-between`}>
              <div>
                <div className="text-3xl mb-3">{branch.icon}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{branch.title}</h3>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5">{branch.city}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{branch.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={openSeededDemoShop}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-6 py-3 text-sm font-semibold transition-colors shadow-soft min-h-[44px]"
          >
            <Play className="h-4 w-4 fill-white" />
            Explore Multi-Store Demo →
          </button>
        </div>
      </section>
      </AnimatedSection>

      {/* 6. A day at the counter: animated walkthrough with live demo-shop numbers */}
      <AnimatedSection delay={600} direction="up" threshold={0.1}>
        <CounterDayShowcase onTryDemo={openSeededDemoShop} />
      </AnimatedSection>

      {/* 7. Comparison Matrix: Pen & Paper vs Generic SaaS vs Tallyn */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="surface-l1 p-6 sm:p-10">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h3 className="text-xl sm:text-3xl font-semibold text-slate-900">
              Why Pakistani Retailers Switch to Tallyn
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Traditional paper registers lose money, and generic SaaS is too slow for store counters.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="table-l1">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-start">Retail Capability</th>
                  <th className="py-3 px-4 text-center">Pen & Paper Registers</th>
                  <th className="py-3 px-4 text-center">Generic Desktop SaaS</th>
                  <th className="py-3 px-4 text-center bg-emerald-50 text-emerald-950 font-semibold">Tallyn Retail OS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "390px Single-Handed Counter Operation", paper: false, generic: false, tallyn: true },
                  { name: "Voice Checkout ('Say-It') with Real Speech", paper: false, generic: false, tallyn: true },
                  { name: "Paper Wholesale Bill Vision Scanner", paper: false, generic: false, tallyn: true },
                  { name: "Zero Hallucinated Numbers (Strict Code Math)", paper: false, generic: true, tallyn: true },
                  { name: "10-Second Instant Undo Sale Window", paper: false, generic: false, tallyn: true },
                  { name: "Culturally Polite WhatsApp Debt Reminders", paper: false, generic: false, tallyn: true },
                  { name: "Spoken Kiryana Radio Morning Briefing", paper: false, generic: false, tallyn: true },
                  { name: "Wholesale Market Price Inflation Alert & Benchmarking", paper: false, generic: false, tallyn: true },
                  { name: "Multi-Store Branch Switching & Consolidated P&L", paper: false, generic: true, tallyn: true },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className="group transition-colors duration-200 hover:bg-slate-50"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-emerald-900 group-hover:translate-x-1 transition-all duration-200">{row.name}</td>
                    <td className="py-3.5 px-4 text-center">
                      {row.paper ? <Check className="h-4 w-4 text-emerald-600 mx-auto transition-transform group-hover:scale-125" /> : <CloseIcon className="h-4 w-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.generic ? <Check className="h-4 w-4 text-emerald-600 mx-auto transition-transform group-hover:scale-125" /> : <CloseIcon className="h-4 w-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center bg-emerald-50/70 font-semibold text-emerald-900 transition-all duration-200 group-hover:bg-emerald-100/80">
                      <Check className="h-5 w-5 text-emerald-700 mx-auto stroke-[2.5] transition-transform duration-300 group-hover:scale-125 group-hover:rotate-6" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 8. The 5 Inviolable Rules & Technical Architecture CTA */}
      <AnimatedSection delay={1000} direction="up" threshold={0.1}><section className="bg-slate-900 text-white py-16 soft-panel">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400">Architectural Guarantees</span>
            <h2 className="text-2xl sm:text-4xl font-semibold mt-2">The 5 Inviolable Rules of Tallyn</h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Non-negotiable commercial guarantees protecting your money and counter integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {[
              { num: "01", title: "Zero Hallucinated Numbers", desc: "AI never computes profit, stock quantities, or balances. Numbers are computed in pure TypeScript or PostgreSQL stored procedures." },
              { num: "02", title: "Atomic Data Mutations", desc: "Stock decrements, credit balances, and purchases execute inside single database transactional RPCs with FOR UPDATE row locks." },
              { num: "03", title: "Multi-Tenant RLS per Shop", desc: "Every database query is strictly scoped to authenticated shop_id using Supabase Postgres Row-Level Security." },
              { num: "04", title: "Single-Handed 390px Mobile UX", desc: "Designed specifically for 390px smartphone screens with 44px+ tap targets, compact viewport bounds, and zero counter clutter." },
              { num: "05", title: "Fail-Open Graceful Degradation", desc: "If AI models drop or rate limit, manual checkout, barcoding, and tabular ledgers work without interruption." },
            ].map((rule, idx) => (
              <div
                key={idx}
                data-fx="tilt spot" className="group rounded-2xl border border-slate-200 bg-white/75 p-5 flex flex-col justify-between hover:border-emerald-700/60 hover:bg-slate-900/80 hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  <span className="inline-block text-2xl font-bold text-amber-400 font-mono tabular-nums group-hover:text-amber-300 group-hover:scale-110 transition-all duration-300">{rule.num}</span>
                  <h3 className="text-sm font-bold text-white mt-1 mb-2 group-hover:text-emerald-200 transition-colors">{rule.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Architecture Modal Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsArchitectureModalOpen(true)}
              className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-3 text-xs shadow-md transition-all active:scale-98 cursor-pointer min-h-[44px]"
            >
              <Layers className="h-4 w-4" />
              <span>Inspect Technical Architecture &amp; Security</span>
            </button>
            <span className="text-xs text-slate-400">
              Interactive deep dive into the 4-tier stack and ACID database locks
            </span>
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* 9. Dedicated New Retailer Customer Sign-Up Section */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-800/40 bg-slate-950 text-white p-8 sm:p-12 shadow-lift relative soft-panel">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="inline-block rounded-full bg-emerald-900/80 px-3 py-1 text-xs font-semibold text-amber-300 mb-3 border border-emerald-700/60">
              Retailer Onboarding
            </span>
            <h2 className="text-2xl sm:text-4xl font-semibold text-white">
              Open Your Shop's Counter Account
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300">
              Join neighbourhood retailers modernizing their counters. Sign up in under 60 seconds with your Gmail, email, or social account.
            </p>
          </div>

          {/* Social Sign-In Options */}
          <div className="max-w-md mx-auto space-y-3 mb-6">
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-slate-800 font-semibold py-3 text-xs shadow-soft hover:bg-slate-100 transition-colors min-h-[44px] cursor-pointer"
            >
              {/* Colorful Google SVG */}
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google / Gmail</span>
            </button>
          </div>

          <div className="relative max-w-md mx-auto my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <span className="relative bg-[#f4f9f6] px-3 text-xs uppercase font-semibold text-slate-500">
              Or Register With Email
            </span>
          </div>

          {/* Quick Registration Form */}
          <form onSubmit={handleQuickRegister} className="max-w-md mx-auto space-y-3" noValidate>
            <div>
              <label htmlFor="landing-shop-name" className="block text-xs font-semibold text-slate-300 mb-1">Your Store Name</label>
              <input
                id="landing-shop-name"
                type="text"
                value={signUpShopName}
                onChange={(e) => {
                  setSignUpShopName(e.target.value);
                  if (signUpErrors.shopName) setSignUpErrors(prev => ({ ...prev, shopName: undefined }));
                }}
                onBlur={() => {
                  if (!signUpShopName.trim()) setSignUpErrors(prev => ({ ...prev, shopName: "Enter your shop name (e.g. Al-Madina Kiryana)" }));
                }}
                placeholder="e.g. Madina Grocers & General Store"
                className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-600 min-h-[44px]"
              />
              {signUpErrors.shopName && (
                <p className="text-xs text-rose-400 mt-1">{signUpErrors.shopName}</p>
              )}
            </div>

            <div>
              <label htmlFor="landing-email-addr" className="block text-xs font-semibold text-slate-300 mb-1">Retailer Email Address</label>
              <input
                id="landing-email-addr"
                type="email"
                value={signUpEmail}
                onChange={(e) => {
                  setSignUpEmail(e.target.value);
                  if (signUpErrors.email) setSignUpErrors(prev => ({ ...prev, email: undefined }));
                }}
                onBlur={() => {
                  if (!signUpEmail.trim()) setSignUpErrors(prev => ({ ...prev, email: "Enter your email address" }));
                }}
                placeholder="storeowner@gmail.com"
                className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-600 min-h-[44px]"
              />
              {signUpErrors.email && (
                <p className="text-xs text-rose-400 mt-1">{signUpErrors.email}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-3 text-xs transition-colors shadow-lift min-h-[44px] mt-2 cursor-pointer"
            >
              Create Free Shop Account
            </button>
          </form>
        </div>
      </section>

      {/* Technical Architecture Modal */}
      <ArchitectureModal 
        isOpen={isArchitectureModalOpen}
        onClose={() => setIsArchitectureModalOpen(false)}
      />

    </div>
  );
};