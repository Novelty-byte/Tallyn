import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play } from "lucide-react";
import { useApp } from "@/context/AppContext";

/**
 * Minimal header for the sign-in / sign-up / store-setup pages.
 * The full app navbar (store switcher, POS/Dashboard tabs, mandi ticker) is not shown
 * here: those controls need an account and would only bounce the visitor back to /login.
 */
export const AuthHeader: React.FC = () => {
  const { isDemoMode } = useApp();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2" title="Back to Tallyn home">
          <img
            src="/tallyn-full-logo.png"
            alt="Tallyn"
            className="h-12 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-2">
          {isDemoMode && (
            <Link
              to="/dashboard"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-soft transition-colors hover:bg-amber-300"
            >
              <Play className="h-3 w-3 fill-slate-950" />
              <span>Back to demo</span>
            </Link>
          )}
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl-flip" />
            <span>Back to home</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
