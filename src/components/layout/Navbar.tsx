import React from "react";
import { useTranslation } from "react-i18next";
import { useApp, ActiveTab } from "@/context/AppContext";
import { 
  Store, 
  Globe, 
  Radio, 
  MessageSquareCode, 
  User, 
  LogOut,
  ChevronDown
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { 
    user, 
    shop, 
    activeTab, 
    setActiveTab, 
    language, 
    setLanguage, 
    setIsAuthModalOpen, 
    setIsAskTallynOpen, 
    setIsKiryanaRadioOpen,
    isDemoMode,
    exitDemoMode,
    logout 
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ur" : "en");
  };

  const navLinks: { id: ActiveTab; label: string }[] = [
    { id: "landing", label: t("nav.home") },
    { id: "pos", label: t("nav.pos") },
    { id: "dashboard", label: t("nav.dashboard") },
    { id: "insights", label: t("nav.insights") },
    { id: "inventory", label: t("nav.inventory") },
    { id: "udhaar", label: t("nav.udhaar") },
    { id: "purchases", label: t("nav.purchases") },
    { id: "history", label: t("nav.history") },
    { id: "settings", label: t("nav.settings") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      {/* Demo Mode Persistent Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-amber-700 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between border-b border-emerald-900 shadow-xs">
          <div className="mx-auto flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
            </span>
            <span>{t("nav.demoBanner")} ({shop.name})</span>
            <button
              onClick={exitDemoMode}
              className="ms-3 rounded bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[11px] font-bold text-white transition-colors"
            >
              {t("nav.exitDemo")}
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand with Full Logo Image */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab("landing")}
            className="flex items-center gap-2 text-start focus:outline-hidden"
          >
            <img 
              src="/tallyn-full-logo.png" 
              alt="Tallyn Retail OS" 
              className="h-10 sm:h-11 w-auto object-contain"
            />
          </button>

          {/* Active Shop Badge */}
          <div className="hidden xl:flex items-center gap-2 ps-3 border-s border-slate-200 text-xs">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
              <Store className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-tight">{shop.name}</p>
              <p className="text-[10px] text-slate-500">{shop.address}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
          {navLinks.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 transition-colors min-h-[40px] ${
                activeTab === tab.id
                  ? "bg-emerald-800 text-white font-bold"
                  : "text-slate-600 hover:text-emerald-900 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Kiryana Radio Trigger */}
          <button
            onClick={() => setIsKiryanaRadioOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs min-h-[40px]"
            title="Listen to Kiryana Radio Audio Briefing"
          >
            <Radio className="h-3.5 w-3.5 text-amber-700 animate-pulse" />
            <span className="hidden sm:inline">{t("nav.kiryanaRadio")}</span>
          </button>

          {/* Ask Tallyn AI Drawer Trigger */}
          <button
            onClick={() => setIsAskTallynOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors shadow-2xs min-h-[40px]"
            title="Ask Tallyn AI Store Assistant"
          >
            <MessageSquareCode className="h-3.5 w-3.5 text-emerald-700" />
            <span className="hidden sm:inline">{t("nav.askTallyn")}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors min-h-[40px]"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-700" />
            <span>{language === "en" ? "اردو" : "English"}</span>
          </button>

          {/* User Account / Auth Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors min-h-[40px]"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white text-[10px]">
                  {user.name.charAt(0)}
                </div>
                <span className="hidden md:inline max-w-[90px] truncate">{user.name}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute end-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-xs">
                  <div className="px-2 py-1.5 border-b border-slate-100">
                    <p className="font-bold text-slate-900">{user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{t("nav.signOut")}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-bold text-amber-100 hover:bg-emerald-900 transition-colors shadow-xs min-h-[40px]"
            >
              <User className="h-3.5 w-3.5" />
              <span>{t("nav.signIn")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-100 bg-slate-50/80 px-2 py-1.5 text-xs font-semibold scrollbar-none gap-1">
        {navLinks.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 min-h-[36px] transition-colors ${
              activeTab === tab.id
                ? "bg-emerald-800 text-white font-bold"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
