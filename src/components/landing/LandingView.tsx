import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { audio } from "@/lib/audio";
import { formatCurrency } from "@/lib/utils";
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
  Calculator,
  Play,
  Volume2,
  Camera,
  Coins,
  Store,
  ExternalLink,
  Mail,
  Lock
} from "lucide-react";

export const LandingView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === "ur";
  const { 
    openSeededDemoShop, 
    setIsAuthModalOpen, 
    loginWithGoogle, 
    login,
    setIsKiryanaRadioOpen 
  } = useApp();

  const [activeFeatureTab, setActiveFeatureTab] = useState<number>(0);
  const [heroVoiceSpeaking, setHeroVoiceSpeaking] = useState(false);
  const [heroSpokenNotice, setHeroSpokenNotice] = useState<string | null>(null);

  // New customer quick sign-up form state
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpShopName, setSignUpShopName] = useState("");

  const handleHeroVoiceTest = async () => {
    setHeroVoiceSpeaking(true);
    const spokenUrdu = "دو چائے اور ایک گھی ادھار آصف بھائی";
    setHeroSpokenNotice(isUrdu ? "بولا گیا: '2 چائے اور 1 گھی ادھار آصف'" : "Spoken: '2 Tapal Tea, 1 Dalda Oil credit Asif'");
    await audio.speak(spokenUrdu, "ur");
    audio.playCashRegisterChime();
    setHeroVoiceSpeaking(false);
    setTimeout(() => setHeroSpokenNotice(null), 4000);
  };

  const handleQuickRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpEmail.trim()) return;
    login(signUpEmail, signUpShopName || "New Retailer");
  };

  return (
    <div className="space-y-16 sm:space-y-28 pb-20 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-16 pb-12 overflow-hidden">
        {/* Dynamic Background Glow */}
        <div 
          className="pointer-events-none absolute top-0 start-1/2 -translate-x-1/2 w-full max-w-7xl h-[640px] opacity-25 blur-3xl"
          style={{
            background: "radial-gradient(circle at 50% 25%, #166534 0%, #d97706 40%, transparent 75%)",
          }}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100/80 px-4 py-1.5 text-xs font-bold text-emerald-950 shadow-xs mb-6 animate-pulse">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Built for Pakistani Kiryana & Grocery Retailers</span>
            <span className="text-emerald-700">•</span>
            <span>Zero-Typing Retail OS</span>
          </div>

          {/* Main Headline */}
          <h1 className="max-w-4xl mx-auto text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
            Zero-Typing Counter POS & Voice Clarity for Neighbourhood Retail
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            Deterministic profit & stock calculations built for 390px mobile phone screens. AI eliminates counter typing, extracts paper supplier bills, and drafts polite Urdu WhatsApp debt collection reminders.
          </p>

          {/* --- THE BIG CENTRALIZED SEEDED DATA BUTTON --- */}
          <div className="mt-10 flex flex-col items-center justify-center">
            <button
              onClick={openSeededDemoShop}
              className="group relative inline-flex items-center justify-center gap-3 rounded-3xl bg-emerald-800 hover:bg-emerald-900 text-amber-100 px-8 py-5 text-base sm:text-lg font-black shadow-2xl transition-all transform hover:-translate-y-1 active:scale-98 border-2 border-amber-400/40 min-h-[64px]"
            >
              {/* Outer pulsing ring */}
              <span className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 to-amber-500 opacity-30 blur-sm group-hover:opacity-60 transition duration-500" />
              
              <div className="relative flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black shadow-md">
                  <Play className="h-5 w-5 fill-slate-950" />
                </div>
                <div className="text-start">
                  <span className="block text-sm sm:text-base font-black text-amber-300">
                    Explore Live Seeded Demo Shop
                  </span>
                  <span className="block text-xs text-emerald-100 font-medium">
                    Instant 60-Product Store Demo • Zero Sign-Up Required • 1-Click Launch
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-amber-300 rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Sub-Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> 60 Realistic Commodities Seeded
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> 8 Customer Credit Accounts
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> Live Urdu Voice Audio
              </span>
            </div>
          </div>

          {/* Dynamic Interactive Counter Preview Mockup with Moving Elements */}
          <div className="mt-14 max-w-4xl mx-auto relative">
            <div className="rounded-3xl border-4 border-slate-900 bg-white p-4 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="text-start">
                    <p className="font-extrabold text-slate-900 text-sm">Al-Madina Kiryana POS Simulator</p>
                    <p className="text-[11px] text-slate-500">Tap below to test real audio voice POS & barcode checkout</p>
                  </div>
                </div>

                {/* Voice Simulation Trigger */}
                <button
                  onClick={handleHeroVoiceTest}
                  disabled={heroVoiceSpeaking}
                  className="flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-black shadow-md transition-all min-h-[42px]"
                >
                  <Mic className="h-4 w-4" />
                  <span>{heroVoiceSpeaking ? "Speaking Urdu..." : "Test Urdu Voice POS"}</span>
                  {heroVoiceSpeaking && <Volume2 className="h-4 w-4 animate-ping text-slate-950" />}
                </button>
              </div>

              {/* Spoken notice */}
              {heroSpokenNotice && (
                <div className="my-3 rounded-xl bg-amber-100 border border-amber-300 p-2.5 text-xs font-bold text-amber-950 flex items-center gap-2 animate-bounce">
                  <Sparkles className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>{heroSpokenNotice}</span>
                </div>
              )}

              {/* Live Interactive Product Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                {[
                  { name: "Tapal Danedar Tea 450g", price: 650, stock: 24, cat: "Tea" },
                  { name: "Dalda Cooking Oil 1L", price: 540, stock: 18, cat: "Oil" },
                  { name: "White Sugar (Cheeni) 1kg", price: 155, stock: 45, cat: "Sugar" },
                  { name: "MilkPak Dairy Milk 1L", price: 290, stock: 32, cat: "Milk" },
                ].map((item, i) => (
                  <div
                    key={i}
                    onClick={openSeededDemoShop}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-start hover:border-emerald-600 hover:bg-emerald-50/50 transition-all active:scale-98 shadow-2xs group"
                  >
                    <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-emerald-700">
                      {item.cat}
                    </span>
                    <p className="text-xs font-extrabold text-slate-900 mt-0.5 line-clamp-1">
                      {item.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-black text-slate-900">{formatCurrency(item.price)}</span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                        + Add
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Quick Launch Bar */}
              <div className="bg-slate-950 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-300 font-medium">
                  Want to record actual sales, view ledger balances, and scan supplier bills?
                </span>
                <button
                  onClick={openSeededDemoShop}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 text-xs transition-colors shrink-0"
                >
                  Enter Full Store POS →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Core Autonomous Capabilities Interactive Tabs */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Complete P0-P2 Autonomous Suite</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Six Engines Engineered for Counter Livelihood
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Pure deterministic code protects your money. Multimodal Gemini AI handles the voice, vision, and customer communications.
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
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFeatureTab(tab.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold whitespace-nowrap transition-all min-h-[42px] ${
                  activeFeatureTab === tab.id
                    ? "bg-emerald-800 text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Active Content Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg">
          {activeFeatureTab === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Feature 4: Conversational POS</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Say-It: Urdu Speech-to-Cart Voice Checkout
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  During peak evening hours, typing on a small counter phone is impossible. Simply speak naturally in Urdu or Roman Urdu: <i>"2 chai, 1 ghee udhaar Asif"</i>. Tallyn's speech pipeline extracts the products, quantities, and debtor name into a structured cart payload ready for 1-tap confirmation.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 text-white px-5 py-2.5 text-xs font-bold hover:bg-emerald-900"
                  >
                    Try in Demo POS
                  </button>
                </div>
              </div>
              <div className="bg-emerald-950 text-white p-6 rounded-2xl border border-emerald-800">
                <div className="flex items-center gap-2 text-amber-300 font-mono text-xs mb-3">
                  <Mic className="h-4 w-4" />
                  <span>Speech Transcription Stream:</span>
                </div>
                <p className="text-base font-bold text-white italic">
                  "دو ٹپال دانیدار چائے، ایک ڈالڈا آئل، ادھار آصف بھائی مکان بارہ"
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
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Feature 2: Multimodal Vision OCR</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Crumpled Supplier Paper Invoice Scanner
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Suppliers hand handwritten delivery slips that get lost. Point your smartphone camera at any wholesale bill; Gemini Vision OCR extracts item names, unit purchase prices, and batch counts, updating your inventory stock atomically.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 text-white px-5 py-2.5 text-xs font-bold hover:bg-emerald-900"
                  >
                    Open Supplier Scanner
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800">
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
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Feature 3: Audio TTS</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Kiryana Radio (صبح کا احوال)
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every morning at 8:00 AM, tap one button to hear a warm 3-sentence executive audio brief in natural Urdu: yesterday's cash vs credit revenue, who owes overdue debt, and which commodities need ordering before evening rush.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setIsKiryanaRadioOpen(true)}
                    className="rounded-xl bg-amber-500 text-slate-950 px-5 py-2.5 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5"
                  >
                    <Play className="h-4 w-4 fill-slate-950" />
                    <span>Listen to Morning Memo</span>
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 text-center">
                <Radio className="h-10 w-10 text-amber-400 mx-auto mb-2 animate-pulse" />
                <p className="text-xs font-bold text-amber-300">Spoken Memo Synthesizer</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  "السلام علیکم حاجی صاحب! آج دکان کی کل فروخت 18,900 روپے رہی..."
                </p>
              </div>
            </div>
          )}

          {activeFeatureTab === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Feature 5: Cultural Communication</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Culturally Respectful WhatsApp Udhaar Reminders
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Collecting debt in neighbourhood culture requires immense respect and tact. Tallyn generates respectful, warm Urdu reminder drafts and opens `wa.me` deep links directly on your phone with zero paid API costs.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 text-white px-5 py-2.5 text-xs font-bold hover:bg-emerald-900"
                  >
                    View Udhaar Ledger
                  </button>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl text-xs text-emerald-950 text-start">
                <p className="font-bold text-emerald-900 mb-2">WhatsApp Pre-Composed Template:</p>
                <p className="italic leading-relaxed">
                  "محترم جناب آصف صاحب، السلام علیکم۔ امید ہے آپ خیریت سے ہوں گے۔ المدینہ کریانہ اسٹور کی طرف سے آپ کے کھاتے کی کل باقی رقم 3,400 روپے واجب الادا ہے۔ سہولت کے مطابق تشریف لا کر حساب کلیئر فرما دیجئے۔ جزاک اللہ۔"
                </p>
              </div>
            </div>
          )}

          {activeFeatureTab === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Feature 9: Market Price Scraper</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Mahngai Watchdog & Wholesale Comparison
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Powered by `agent-browser`, Tallyn scrapes wholesale commodity portals for staple rates (sugar, flour, cooking oil, rice) and alerts you whenever a distributor attempts to overcharge your store by more than 15%.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 text-white px-5 py-2.5 text-xs font-bold hover:bg-emerald-900"
                  >
                    Check Live Wholesale Rates
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 text-xs">
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
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">Feature 8: Cultural Calendar</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Ramadan & Seasonal Demand Forecaster
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Anticipates seasonal volume surges weeks ahead of moon sighting, recommending precise bulk buffer stock procurement so your store never experiences stockouts during peak retail windows.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={openSeededDemoShop}
                    className="rounded-xl bg-emerald-800 text-white px-5 py-2.5 text-xs font-bold hover:bg-emerald-900"
                  >
                    View Ramadan Forecast
                  </button>
                </div>
              </div>
              <div className="bg-amber-950/80 border border-amber-500/40 text-amber-100 p-5 rounded-2xl text-xs">
                <p className="font-bold text-amber-300">Ramadan Surge Warning:</p>
                <p className="mt-1">
                  Syrup and Flour demand surges +280%. Lock distributor orders 14 days before moon sighting to save Rs. 14,000 in seasonal price escalation.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Dedicated New Retailer Customer Sign-Up Section */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border-2 border-emerald-800/40 bg-gradient-to-br from-emerald-900 to-slate-950 text-white p-8 sm:p-12 shadow-2xl relative">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="inline-block rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-bold text-amber-300 mb-3">
              Retailer Onboarding
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
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
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-slate-800 font-bold py-3 text-xs shadow-md hover:bg-slate-100 transition-colors min-h-[46px]"
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
            <span className="relative bg-emerald-950 px-3 text-[10px] uppercase font-bold text-slate-400">
              Or Register With Email
            </span>
          </div>

          {/* Quick Registration Form */}
          <form onSubmit={handleQuickRegister} className="max-w-md mx-auto space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Your Store Name</label>
              <input
                type="text"
                required
                value={signUpShopName}
                onChange={(e) => setSignUpShopName(e.target.value)}
                placeholder="e.g. Madina Grocers & General Store"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Retailer Email Address</label>
              <input
                type="email"
                required
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                placeholder="storeowner@gmail.com"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 text-xs transition-colors shadow-lg min-h-[46px] mt-2"
            >
              Create Free Shop Account
            </button>
          </form>
        </div>
      </section>

      {/* Comparison Matrix: Pen & Paper vs Generic SaaS vs Tallyn */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h3 className="text-xl sm:text-3xl font-black text-slate-900">
              Why Pakistani Retailers Switch to Tallyn
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Traditional paper registers lose money, and generic SaaS is too slow for store counters.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                  <th className="py-3 px-4 text-start">Retail Capability</th>
                  <th className="py-3 px-4 text-center">Pen & Paper Registers</th>
                  <th className="py-3 px-4 text-center">Generic Desktop SaaS</th>
                  <th className="py-3 px-4 text-center bg-emerald-50 text-emerald-950 font-black">Tallyn Retail OS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { name: "390px Single-Handed Counter Operation", paper: false, generic: false, tallyn: true },
                  { name: "Urdu Voice POS ('Say-It') with Real Speech", paper: false, generic: false, tallyn: true },
                  { name: "Paper Wholesale Bill Vision Scanner", paper: false, generic: false, tallyn: true },
                  { name: "Zero Hallucinated Numbers (Strict Code Math)", paper: false, generic: true, tallyn: true },
                  { name: "10-Second Instant Undo Sale Window", paper: false, generic: false, tallyn: true },
                  { name: "Culturally Polite Urdu WhatsApp Debt Reminders", paper: false, generic: false, tallyn: true },
                  { name: "Spoken Kiryana Radio Morning Briefing", paper: false, generic: false, tallyn: true },
                  { name: "Live Wholesale Market Scraper & Inflation Alert", paper: false, generic: false, tallyn: true },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{row.name}</td>
                    <td className="py-3.5 px-4 text-center">
                      {row.paper ? <Check className="h-4 w-4 text-emerald-600 mx-auto" /> : <CloseIcon className="h-4 w-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.generic ? <Check className="h-4 w-4 text-emerald-600 mx-auto" /> : <CloseIcon className="h-4 w-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center bg-emerald-50/70 font-extrabold text-emerald-900">
                      <Check className="h-5 w-5 text-emerald-700 mx-auto stroke-[3]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* The 5 Inviolable Rules */}
      <section className="bg-slate-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400">Architectural Manifesto</span>
            <h2 className="text-2xl sm:text-4xl font-black mt-2">The 5 Inviolable Rules of Tallyn</h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Non-negotiable commercial guarantees protecting financial integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { num: "01", title: "Zero Hallucinated Numbers", desc: "AI never computes profit, stock quantities, or balances. Numbers are computed in pure TypeScript or PostgreSQL stored procedures." },
              { num: "02", title: "Atomic Data Mutations", desc: "Stock decrements, credit balances, and purchases execute inside single database transactional RPCs with FOR UPDATE row locks." },
              { num: "03", title: "Multi-Tenant RLS per Shop", desc: "Every database query is strictly scoped to authenticated shop_id using Supabase Postgres Row-Level Security." },
              { num: "04", title: "Bilingual & RTL from Day 1", desc: "CSS logical properties mirror the entire counter layout naturally when Urdu is active with zero layout bugs." },
              { num: "05", title: "Fail-Open Graceful Degradation", desc: "If AI models drop or rate limit, manual counter POS, barcoding, and tabular ledgers work without interruption." },
            ].map((rule, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 flex flex-col justify-between">
                <div>
                  <span className="text-2xl font-black text-amber-400/80 font-mono">{rule.num}</span>
                  <h3 className="text-sm font-bold text-white mt-1 mb-2">{rule.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
