import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp, ActiveTab } from "@/context/AppContext";
import {
  Store,
  Radio,
  MessageSquareCode,
  User,
  LogOut,
  ChevronDown,
  Plus,
  Check,
  Building,
  Sparkles,
  ArrowRight,
  Play,
  Layers,
  Settings
} from "lucide-react";

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    user,
    shop,
    shops,
    switchShop,
    activeTab,
    setActiveTab,
    setIsAuthModalOpen,
    setIsAddStoreModalOpen,
    setIsStoreManagementModalOpen,
    setIsAskTallynOpen,
    setIsKiryanaRadioOpen,
    openSeededDemoShop,
    isDemoMode,
    exitDemoMode,
    logout
  } = useApp();

  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isLandingView = activeTab === "landing";

  const operationalNavLinks: { id: ActiveTab; label: string }[] = [
    { id: "pos", label: t("nav.pos") },
    { id: "dashboard", label: t("nav.dashboard") },
    { id: "insights", label: t("nav.insights") },
    { id: "inventory", label: t("nav.inventory") },
    { id: "udhaar", label: t("nav.udhaar") },
    { id: "purchases", label: t("nav.purchases") },
    { id: "history", label: t("nav.history") },
    { id: "settings", label: t("nav.settings") },
  ];

  const handleSaaSNavClick = (sectionId: string) => {
    if (activeTab !== "landing") {
      setActiveTab("landing");
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

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
            <span>{t("nav.demoBanner")} • {shop.name}</span>
            <button
              onClick={exitDemoMode}
              className="ms-3 rounded bg-white/20 hover:bg-white/30 px-2.5 py-0.5 text-[11px] font-bold text-white transition-colors"
            >
              {t("nav.exitDemo")}
            </button>
          </div>
        </div>
      )}

      {/* Main Header Container */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        
        {/* Left Side: Brand Logo + Conditional Store Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Platform Full Logo */}
          <button 
            onClick={() => setActiveTab("landing")}
            className="flex items-center gap-2 text-start focus:outline-hidden group"
            title="Tallyn Retail OS Platform"
          >
            <img 
              src="/tallyn-full-logo.png" 
              alt="Tallyn Autonomous Retail OS" 
              className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-102"
            />
          </button>

          {/* Conditional Display:
              - When ON LANDING PAGE: Show Platform SaaS Badge (No single kiryana address)
              - When INSIDE STORE APP: Show Multi-Store Switcher Dropdown */}
          {isLandingView ? (
            <div className="hidden md:flex items-center gap-1.5 ps-3 border-s border-slate-200 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[11px] font-extrabold text-emerald-900 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Multi-Store Retail Platform</span>
              </span>
            </div>
          ) : (
            /* STORE SWITCHER DROPDOWN (Inside App / Demo Mode) */
            <div className="relative">
              <button
                onClick={() => {
                  setIsStoreDropdownOpen(!isStoreDropdownOpen);
                  setIsUserMenuOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-800 transition-all shadow-2xs group"
                title="Switch Store Branch"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-800 text-amber-300 shadow-2xs">
                  <Store className="h-3.5 w-3.5" />
                </div>
                <div className="text-start hidden sm:block max-w-[170px] lg:max-w-[210px]">
                  <div className="flex items-center gap-1.5">
                    <p className="font-extrabold text-slate-900 text-xs leading-none truncate">
                      {shop.name}
                    </p>
                    {shop.city && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 uppercase shrink-0">
                        {shop.city}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                    {shop.address}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-transform" />
              </button>

              {/* Store Switcher Dropdown Menu */}
              {isStoreDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsStoreDropdownOpen(false)} 
                  />
                  <div className="absolute start-0 mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50 text-xs animate-fade-in text-start">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                      <div>
                        <p className="font-extrabold text-slate-900 text-xs">
                          {t("nav.switchStore")}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Multi-tenant partitioned database
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                        {shops.length} {shops.length === 1 ? "Branch" : "Branches"}
                      </span>
                    </div>

                    {/* Stores List */}
                    <div className="my-2 space-y-1.5 max-h-56 overflow-y-auto pe-1">
                      {shops.map((s) => {
                        const isCurrent = s.id === shop.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              switchShop(s.id);
                              setIsStoreDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-xl p-2.5 text-start transition-colors ${
                              isCurrent
                                ? "bg-emerald-50/80 border border-emerald-300 text-emerald-950 font-bold"
                                : "hover:bg-slate-50 text-slate-700 font-medium"
                            }`}
                          >
                            <div className="space-y-0.5 pe-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900">
                                  {s.name}
                                </span>
                                {s.city && (
                                  <span className="rounded bg-slate-200 text-slate-700 text-[9px] font-semibold px-1 py-0.2">
                                    {s.city}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate max-w-[210px]">
                                {s.address}
                              </p>
                            </div>
                            {isCurrent && (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Dropdown Actions */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <button
                        onClick={() => {
                          setIsStoreDropdownOpen(false);
                          setIsAddStoreModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-2 text-xs font-bold transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t("nav.addNewStore")}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsStoreDropdownOpen(false);
                          setIsStoreManagementModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 text-[11px] font-semibold transition-colors"
                      >
                        <Building className="h-3 w-3 text-slate-500" />
                        <span>{t("nav.manageStores")}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Center Navigation Links:
            - Landing View: Modern SaaS Marketing Links
            - In-Store View: Operational Tabs (POS, Dashboard, etc.) */}
        {isLandingView ? (
          <nav className="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-700">
            <button
              onClick={() => handleSaaSNavClick("capabilities")}
              className="rounded-lg px-3 py-2 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              {t("nav.features")}
            </button>
            <button
              onClick={() => handleSaaSNavClick("multi-store")}
              className="rounded-lg px-3 py-2 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              {t("nav.multiStore")}
            </button>
            <button
              onClick={openSeededDemoShop}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-emerald-800 font-extrabold hover:bg-emerald-50 transition-colors"
            >
              <Play className="h-3 w-3 fill-emerald-800" />
              <span>{t("nav.demoStore")}</span>
            </button>
          </nav>
        ) : (
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
            {operationalNavLinks.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-2.5 py-1.5 transition-colors min-h-[38px] ${
                  activeTab === tab.id
                    ? "bg-emerald-800 text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:text-emerald-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        {/* Right Side: Tools & CTAs */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Kiryana Radio: Only visible inside store/demo (not on landing page) */}
          {!isLandingView && (
            <button
              onClick={() => setIsKiryanaRadioOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs min-h-[38px]"
              title="Listen to Kiryana Radio Audio Briefing"
            >
              <Radio className="h-3.5 w-3.5 text-amber-700 animate-pulse" />
              <span className="hidden xl:inline">{t("nav.kiryanaRadio")}</span>
            </button>
          )}

          {/* Ask Tallyn AI: Only visible inside store/demo (not on landing page) */}
          {!isLandingView && (
            <button
              onClick={() => setIsAskTallynOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors shadow-2xs min-h-[38px]"
              title="Ask Tallyn AI Store Assistant"
            >
              <MessageSquareCode className="h-3.5 w-3.5 text-emerald-700" />
              <span className="hidden xl:inline">{t("nav.askTallyn")}</span>
            </button>
          )}

          {/* SaaS CTAs vs In-Store User Menu */}
          {user ? (
            /* User Account Dropdown */
            <div className="relative">
              <button
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  setIsStoreDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors min-h-[38px]"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white text-[10px]">
                  {user.name.charAt(0)}
                </div>
                <span className="hidden md:inline max-w-[90px] truncate">{user.name}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsUserMenuOpen(false)} 
                  />
                  <div className="absolute end-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-xs animate-fade-in text-start">
                    <div className="px-2 py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-800 font-semibold">
                        <Store className="h-3 w-3" />
                        <span className="truncate">{shop.name}</span>
                      </div>
                    </div>

                    <div className="py-1 space-y-0.5">
                      {isLandingView && (
                        <button
                          onClick={() => {
                            setActiveTab("dashboard");
                            setIsUserMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Building className="h-3.5 w-3.5 text-slate-500" />
                          <span>Enter Store Dashboard</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsAddStoreModalOpen(true);
                          setIsUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Register New Branch</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("settings");
                          setIsUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-500" />
                        <span>{t("nav.settings")}</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>{t("nav.signOut")}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : isLandingView ? (
            /* Visitor Landing CTAs */
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Launch Live Demo CTA */}
              <button
                onClick={openSeededDemoShop}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3.5 py-2 text-xs shadow-xs transition-colors min-h-[38px]"
                title="Launch Live Demo Store"
              >
                <Play className="h-3 w-3 fill-slate-950" />
                <span>{t("nav.launchDemo")}</span>
              </button>

              {/* Register Store CTA */}
              <button
                onClick={() => navigate("/register")}
                className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold px-3 py-2 text-xs transition-colors min-h-[38px] cursor-pointer"
              >
                <Store className="h-3.5 w-3.5 text-emerald-700" />
                <span>{t("nav.register")}</span>
              </button>

              {/* Sign In CTA */}
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 px-3.5 py-2 text-xs font-bold text-amber-100 transition-colors shadow-xs min-h-[38px] cursor-pointer"
              >
                <User className="h-3.5 w-3.5" />
                <span>{t("nav.signIn")}</span>
              </button>
            </div>
          ) : (
            /* Inside App but not logged in (e.g. anonymous counter demo) */
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-bold text-amber-100 hover:bg-emerald-900 transition-colors shadow-xs min-h-[38px] cursor-pointer"
            >
              <User className="h-3.5 w-3.5" />
              <span>{t("nav.signIn")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-100 bg-slate-50/90 px-2 py-1.5 text-xs font-semibold scrollbar-none gap-1">
        {isLandingView ? (
          <>
            <button
              onClick={openSeededDemoShop}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-400 text-slate-950 px-3 py-1.5 text-xs font-black min-h-[34px]"
            >
              <Play className="h-3 w-3 fill-slate-950" />
              <span>{t("nav.launchDemo")}</span>
            </button>
            <button
              onClick={() => navigate("/register")}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold min-h-[34px] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("nav.register")}</span>
            </button>
            <button
              onClick={() => handleSaaSNavClick("features")}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-200 min-h-[34px]"
            >
              {t("nav.features")}
            </button>
            <button
              onClick={() => handleSaaSNavClick("multistore")}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-200 min-h-[34px]"
            >
              {t("nav.multiStore")}
            </button>
            <button
              onClick={() => handleSaaSNavClick("pricing")}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-200 min-h-[34px]"
            >
              {t("nav.pricing")}
            </button>
          </>
        ) : (
          operationalNavLinks.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 min-h-[34px] transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-800 text-white font-bold"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))
        )}
      </div>
    </header>
  );
};