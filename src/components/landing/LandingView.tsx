import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { audio } from "@/lib/audio";
import { formatCurrency } from "@/lib/utils";
import { ArchitectureModal } from "@/components/landing/ArchitectureModal";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { useMousePosition } from "@/lib/animations";
import { 
  ArrowRight, 
  Smartphone, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Mic, 
  FileText, 
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
  ExternalLink,
  Mail,
  Lock,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  Building2,
  Users,
  CheckCircle2,
  Layers,
  Award,
  Star,
  Clock,
  Wallet,
  ChevronRight,
  TrendingDown,
  RefreshCw
} from "lucide-react";

interface PhoneCartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export const LandingView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    openSeededDemoShop,
    setIsAuthModalOpen,
    loginWithGoogle,
    login,
    setIsKiryanaRadioOpen
  } = useApp();

  // Tab & Modal States
  const [activeFeatureTab, setActiveFeatureTab] = useState<number>(0);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);

  // Mouse position tracking for ambient glow
  const mousePosition = useMousePosition();

  // Hero interactive ticker state (retained for comparison table elsewhere on page)
  const [activeTickerAlert, setActiveTickerAlert] = useState<string | null>(null);

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

  // Wholesale Ticker Data (used in comparison table)
  const tickerItems = [
    { name: "Sugar (Cheeni)", rate: "PKR 140/kg", change: "Stable", changeColor: "text-emerald-400", market: "Akbari Mandi, Lahore" },
    { name: "Dalda Cooking Oil", rate: "PKR 510/kg", change: "-2% Drop", changeColor: "text-emerald-400", market: "Karachi Port Mills" },
    { name: "Super Basmati Rice", rate: "PKR 320/kg", change: "+1% Slight", changeColor: "text-amber-400", market: "Gujranwala Rice Market" },
    { name: "Fine Atta (Wheat)", rate: "PKR 122/kg", change: "Stable", changeColor: "text-emerald-400", market: "Rawalpindi Flour Mills" },
    { name: "Tapal Danedar 450g", rate: "PKR 650/box", change: "Stable", changeColor: "text-emerald-400", market: "Official Wholesale List" },
    { name: "Daal Chana Special", rate: "PKR 240/kg", change: "-1.5%", changeColor: "text-emerald-400", market: "Faisalabad Mandi" },
  ];

  return (
    <div className="space-y-16 sm:space-y-28 pb-24 overflow-hidden bg-slate-50 text-slate-900">

      {/* 2. Hero Section */}
      <section className="relative pt-6 sm:pt-14 pb-8 overflow-hidden">
        {/* Dynamic Background Glow with Mouse Tracking */}
        <div
          className="pointer-events-none absolute top-0 start-1/2 -translate-x-1/2 w-full max-w-7xl h-[680px] opacity-25 blur-3xl"
          style={{
            background: `radial-gradient(circle at ${50 + mousePosition.x / 100}% ${25 + mousePosition.y / 100}%, #047857 0%, #d97706 45%, transparent 75%)`,
            transition: 'background 0.3s ease-out'
          }}
        />

        {/* Floating gradient blobs for ambient depth */}
        <div
          className="pointer-events-none absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 animate-float"
          style={{
            background: 'radial-gradient(circle, #166534 0%, transparent 70%)',
            filter: 'blur(40px)'
          }}
        />
        <div
          className="pointer-events-none absolute top-1/2 right-1/4 w-80 h-80 rounded-full opacity-15 animate-float"
          style={{
            background: 'radial-gradient(circle, #d97706 0%, transparent 70%)',
            filter: 'blur(40px)',
            animationDelay: '-10s'
          }}
        />
        <div
          className="pointer-events-none absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full opacity-10 animate-pulse-glow"
          style={{
            background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)',
            filter: 'blur(40px)'
          }}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100/90 px-4 py-1.5 text-xs font-semibold text-emerald-950 shadow-xs mb-6">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Autonomous Retail Operating System for Pakistani Kiryana & Chains</span>
            <span className="text-emerald-700">•</span>
            <span>Zero-Typing Counter POS</span>
          </div>

          {/* Main Headline */}
          <h1 className="max-w-4xl mx-auto text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.12]">
            Zero-Typing Counter POS & Voice Clarity for Neighbourhood Retail
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-3xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            Multi-store retail operating system built for single-handed 390px mobile phone screens. Pure deterministic profit & stock calculations. Multimodal AI eliminates counter typing, parses crumpled paper supplier invoices, and drafts culturally respectful WhatsApp debt collection reminders.
          </p>

          {/* --- THE CENTRALIZED BIG SEEDED DEMO BUTTON --- */}
          <div className="mt-10 flex flex-col items-center justify-center">
            <button
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
                    60 seeded products • 8 credit customers • Instant test-drive without sign-up
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-amber-300 rtl:rotate-180 group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </button>

            {/* Sub-Actions */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-white/80 px-3 py-1 rounded-full border border-emerald-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-default">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> 60 Realistic Commodities Seeded
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-white/80 px-3 py-1 rounded-full border border-emerald-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-default">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> 8 Customer Credit Accounts
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-white/80 px-3 py-1 rounded-full border border-emerald-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-default">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> Live Voice Audio
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-white/80 px-3 py-1 rounded-full border border-emerald-200 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-default">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> Multi-Store Switching Ready
              </span>
            </div>
          </div>

          {/* 3. Interactive 390px Counter POS Phone Simulator */}
          <div className="mt-14 max-w-lg mx-auto relative">
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300">
                <Smartphone className="h-3.5 w-3.5" /> Interactive 390px Counter Phone Simulator
              </span>
              <p className="text-xs text-slate-500 mt-1">Tap commodities to test real Web Audio beeps, voice speech, and instant checkout</p>
            </div>

            {/* Mobile Handset Bezel */}
            <div className="w-full max-w-[390px] mx-auto rounded-[42px] border-[9px] border-slate-900 bg-slate-950 p-3 shadow-2xl text-white relative overflow-hidden ring-4 ring-emerald-900/20">
              
              {/* Phone Dynamic Island / Notch */}
              <div className="flex items-center justify-between px-3 pt-1 pb-2 border-b border-slate-900 text-xs font-mono text-slate-400">
                <span>09:41</span>
                <div className="h-4 w-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span>4G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Counter App Header inside phone */}
              <div className="pt-2 pb-3 px-1 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center font-bold">
                    <Store className="h-4 w-4" />
                  </div>
                  <div className="text-start">
                    <h3 className="text-xs font-semibold text-white">Al-Madina Kiryana</h3>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Counter POS #1
                    </p>
                  </div>
                </div>

                {/* Voice POS Trigger inside phone */}
                <button
                  onClick={handlePhoneVoicePOS}
                  disabled={phoneVoiceActive}
                  aria-label="Test Voice POS in Phone Simulator"
                  className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 shadow-sm min-h-[44px]"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>{phoneVoiceActive ? "Listening..." : "Voice POS"}</span>
                  {phoneVoiceActive && <Volume2 className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Voice Notice bubble */}
              {phoneVoiceNotice && (
                <div className="my-2 rounded-xl bg-amber-950/80 border border-amber-500/50 p-2 text-xs font-semibold text-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>{phoneVoiceNotice}</span>
                  </div>
                  <button 
                    onClick={() => setPhoneVoiceNotice(null)} 
                    aria-label="Dismiss voice notice"
                    className="text-amber-400 hover:text-white p-1"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Clickable Product Shelf inside phone */}
              <div className="my-2 text-start">
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Quick Counter Items (Tap to Add)
                  </span>
                  <span className="text-xs text-emerald-400 font-mono">Web Audio Active</span>
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
                      className="text-start p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/80 hover:bg-slate-800/80 transition-all active:scale-95 cursor-pointer group min-h-[44px]"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{item.cat}</span>
                        <span className="text-emerald-400 font-semibold group-hover:scale-105 transition-transform">+ Add</span>
                      </div>
                      <p className="text-xs font-semibold text-white mt-0.5 truncate">{item.name}</p>
                      <p className="text-xs font-bold text-amber-300 font-mono tabular-nums">{formatCurrency(item.price)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart Summary inside phone */}
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 my-2">
                <div className="flex items-center justify-between text-xs mb-1.5 pb-1 border-b border-slate-800">
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Cart ({phoneCart.reduce((sum, i) => sum + i.qty, 0)} items)</span>
                  </span>
                  <button 
                    onClick={() => setPhoneCart([])}
                    className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-0.5 p-1"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </div>

                {phoneCart.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center italic">
                    Cart empty. Tap a product above or click Voice POS!
                  </p>
                ) : (
                  <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-none pr-1">
                    {phoneCart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate max-w-[170px]">
                          {item.qty}x {item.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums text-amber-300 font-bold">
                            {formatCurrency(item.price * item.qty)}
                          </span>
                          <button 
                            onClick={() => handleRemovePhoneItem(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Total Payable:</span>
                  <span className="text-sm font-mono tabular-nums text-amber-300 font-bold">
                    {formatCurrency(phoneSubtotal)}
                  </span>
                </div>
              </div>

              {/* Sale Success / Undo Banner inside phone */}
              {phoneSaleCompleted && (
                <div className="my-2 rounded-xl bg-emerald-950 border border-emerald-600/60 p-2 text-start">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Sale Completed: {formatCurrency(lastCompletedTotal)}</span>
                    </div>
                    {phoneUndoAvailable && (
                      <button
                        onClick={handlePhoneUndoSale}
                        className="flex items-center gap-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 px-2 py-0.5 text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Undo Sale</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
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
                <div className="h-1 w-28 rounded-full bg-slate-800" />
              </div>
            </div>

            {/* Launch Demo Callout below phone */}
            <div className="mt-4 flex items-center justify-center">
              <button
                onClick={openSeededDemoShop}
                className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-4 py-2 rounded-2xl transition-colors shadow-2xs"
              >
                <span>Enter Full Store POS & Backoffice</span>
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

        {/* Tab Strip */}
        <div className="flex justify-start sm:justify-center overflow-x-auto gap-2 pb-2 scrollbar-none mb-8">
          {[
            { id: 0, label: "Say-It Voice POS", icon: Mic },
            { id: 1, label: "Paper Bill Scanner", icon: Camera },
            { id: 2, label: "Kiryana Radio Audio", icon: Radio },
            { id: 3, label: "WhatsApp Debt Drafter", icon: MessageSquare },
            { id: 4, label: "Mahngai Market Watchdog", icon: TrendingUp },
            { id: 5, label: "Ramadan Demand Forecaster", icon: Zap },
            { id: 6, label: "Multi-Store Chain Hub", icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFeatureTab(tab.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 min-h-[44px] cursor-pointer hover:-translate-y-0.5 ${
                  activeFeatureTab === tab.id
                    ? "bg-emerald-800 text-white shadow-md ring-2 ring-emerald-600 scale-105"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-emerald-300 hover:shadow-sm"
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform duration-300 ${activeFeatureTab === tab.id ? "scale-125 rotate-6" : "group-hover:scale-110"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Active Content Card */}
        <div key={activeFeatureTab} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg animate-fade-in-up">
          {activeFeatureTab === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Engine 1: Conversational POS</span>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                  Say-It: Speech-to-Cart Voice Checkout
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  During peak evening hours, typing on a small counter phone is impossible. Simply speak naturally: <i>"2 chai, 1 ghee udhaar Asif"</i>. Tallyn's speech pipeline extracts the products, quantities, and debtor name into a structured cart payload ready for 1-tap confirmation.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 text-xs font-bold transition-colors"
                  >
                    Try in Demo POS
                  </button>
                </div>
              </div>
              <div className="bg-emerald-950 text-white p-6 rounded-2xl border border-emerald-800 shadow-inner">
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
            </div>
          )}

          {activeFeatureTab === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Engine 2: Multimodal Vision OCR</span>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                  Crumpled Supplier Paper Invoice Scanner
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Suppliers hand handwritten delivery slips that get lost. Point your smartphone camera at any wholesale bill; Gemini Vision OCR extracts item names, unit purchase prices, and batch counts, updating your inventory stock atomically.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 text-xs font-bold transition-colors"
                  >
                    Open Supplier Scanner
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-inner">
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
            </div>
          )}

          {activeFeatureTab === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Engine 3: Spoken Executive Audio</span>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                  Kiryana Radio (Morning Memo)
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every morning at 8:00 AM, tap one button to hear a warm 3-sentence executive audio brief in natural voice: yesterday's cash vs credit revenue, who owes overdue debt, and which commodities need ordering before evening rush.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setIsKiryanaRadioOpen(true)}
                    className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="h-4 w-4 fill-slate-950" />
                    <span>Listen to Morning Memo</span>
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 text-center shadow-inner">
                <Radio className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-amber-300">Spoken Memo Synthesizer</p>
                <p className="text-xs text-slate-400 mt-1 italic">
                  "Good morning Haji Aslam! Today's recorded store revenue is Rs 18,900..."
                </p>
              </div>
            </div>
          )}

          {activeFeatureTab === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Engine 4: Cultural Communication</span>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                  Culturally Respectful WhatsApp Udhaar Reminders
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Collecting debt in neighbourhood culture requires immense respect and tact. Tallyn generates respectful, warm reminder drafts and opens `wa.me` deep links directly on your phone with zero paid API costs.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 text-xs font-bold transition-colors"
                  >
                    View Udhaar Ledger
                  </button>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl text-xs text-emerald-950 text-start shadow-inner">
                <p className="font-bold text-emerald-900 mb-2">WhatsApp Pre-Composed Template:</p>
                <p className="italic leading-relaxed">
                  "Dear Asif Sahib, greetings. Hope you are well. Al-Madina Kiryana Store would like to remind you that a total of Rs. 3,400 is due on your account. Please clear your balance at your convenience. Thank you."
                </p>
              </div>
            </div>
          )}

          {activeFeatureTab === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Engine 5: Mahngai Watchdog</span>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                  Wholesale Benchmark Comparison
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tallyn compares your supplier purchase costs against curated wholesale mandi benchmark rates (sugar, flour, cooking oil, rice) and flags whenever a distributor charges your store above the fair market band.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 text-xs font-bold transition-colors"
                  >
                    Check Live Wholesale Rates
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 text-xs shadow-inner">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>Fine Flour 20kg Bag</span>
                  <span className="text-rose-400 font-bold">Supplier +18.7% Overpriced</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>White Sugar 50kg</span>
                  <span className="text-emerald-400 font-bold">Fair Wholesale Benchmark</span>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 5 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Engine 6: Cultural Calendar</span>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                  Ramadan & Seasonal Demand Forecaster
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Anticipates seasonal volume surges weeks ahead of moon sighting, recommending precise bulk buffer stock procurement so your store never experiences stockouts during peak retail windows.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 text-xs font-bold transition-colors"
                  >
                    View Ramadan Forecast
                  </button>
                </div>
              </div>
              <div className="bg-amber-950/80 border border-amber-500/40 text-amber-100 p-5 rounded-2xl text-xs shadow-inner">
                <p className="font-bold text-amber-300">Ramadan Surge Warning:</p>
                <p className="mt-1 leading-relaxed">
                  Syrup and Flour demand surges +280%. Lock distributor orders 14 days before moon sighting to save Rs. 14,000 in seasonal price escalation.
                </p>
              </div>
            </div>
          )}

          {activeFeatureTab === 6 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Engine 7: Multi-Branch Infrastructure</span>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                  Multi-Store Chain Management Hub
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Expand from one neighbourhood counter to a city-wide chain seamlessly. Manage multiple store branches under a single merchant account with one-tap store switching, synchronized customer debt ledgers, inter-branch stock transfers, and consolidated chain P&L reports.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 text-xs font-bold transition-colors"
                  >
                    Explore Multi-Store Switching
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 text-xs shadow-inner">
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
            </div>
          )}
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
            <div key={i} className={`rounded-2xl border p-6 ${branch.color} group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col justify-between`}>
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

      {/* 6. Real Kiryana Testimonial Grid */}
      <AnimatedSection delay={600} direction="up" threshold={0.1}>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 border border-emerald-300 mb-3">
            <Award className="h-3.5 w-3.5 text-amber-600" /> Pakistani Retailer Stories
          </span>
          <h2 className="text-2xl sm:text-4xl font-semibold text-slate-900">
            Trusted by Kiryana Owners from Islamabad to Lahore
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Hear how counter merchants transformed their daily ledger routine and eliminated bad debt.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              name: "Haji Aslam",
              shop: "Al-Madina Traders",
              location: "Main Bazar, G-9 Islamabad",
              quote: "Since switching to Tallyn's Say-It Voice POS, my counter wait times dropped by 70%. Customers are amazed when their bill speaks back to them!",
              badge: "Voice POS User",
              initials: "HA"
            },
            {
              name: "Tariq Mehmood",
              shop: "Mehmood General Store",
              location: "Anarkali Bazar, Lahore",
              quote: "The WhatsApp Udhaar reminder alone collected Rs. 45,000 of stuck credit in the first week without any awkward phone calls. The polite tone preserves neighbourhood relationships.",
              badge: "Udhaar Ledger",
              initials: "TM"
            },
            {
              name: "Chaudhry Bilal",
              shop: "Bilal Karyana & Super Store",
              location: "Commercial Market, Rawalpindi",
              quote: "The paper bill scanner scanned 18 items from my wholesale invoice in 3 seconds. It caught a Rs. 40/kg price hike on ghee immediately before I paid the distributor.",
              badge: "Vision Bill Scanner",
              initials: "CB"
            },
            {
              name: "Muhammad Rizwan",
              shop: "Bismillah Cash & Carry",
              location: "I-8 & F-10 Branches, Islamabad",
              quote: "Managing 2 branches used to mean double the notebook headaches. With Tallyn's multi-store switching, I can check evening cash counts from both counters on my phone in seconds.",
              badge: "Multi-Store Chain",
              initials: "MR"
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-soft hover:shadow-lift hover:-translate-y-1.5 hover:border-emerald-300/80 transition-all duration-300 group"
            >
              <div>
                {/* 5-star rating */}
                <div className="flex items-center gap-1 text-amber-500 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 group-hover:scale-110 transition-transform" style={{ transitionDelay: `${i * 40}ms` }} />
                  ))}
                  <span className="ms-1.5 text-xs font-semibold text-slate-400">5.0</span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{item.quote}"
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-800 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-emerald-700 group-hover:rotate-3 transition-all duration-300">
                  {item.initials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 truncate">{item.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{item.shop}</p>
                  <p className="text-xs text-emerald-800 font-medium truncate">{item.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
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
                  { name: "Voice POS ('Say-It') with Real Speech", paper: false, generic: false, tallyn: true },
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
      <AnimatedSection delay={1000} direction="up" threshold={0.1}><section className="bg-slate-900 text-white py-16">
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
              { num: "05", title: "Fail-Open Graceful Degradation", desc: "If AI models drop or rate limit, manual counter POS, barcoding, and tabular ledgers work without interruption." },
            ].map((rule, idx) => (
              <div
                key={idx}
                className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-5 flex flex-col justify-between hover:border-emerald-700/60 hover:bg-slate-900/80 hover:-translate-y-1 transition-all duration-300"
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
        <div className="rounded-3xl border border-emerald-800/40 bg-slate-950 text-white p-8 sm:p-12 shadow-lift relative">
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
            <span className="relative bg-slate-950 px-3 text-xs uppercase font-semibold text-slate-400">
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
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 min-h-[44px]"
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
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 min-h-[44px]"
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