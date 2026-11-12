import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { db } from "@/services/supabase";
import { X, Mail, Lock, Store, Check } from "lucide-react";

export const AuthModal: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthModalOpen, setIsAuthModalOpen, login, loginWithGoogle } = useApp();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sentMagicLink, setSentMagicLink] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      if (mode === "login") {
        const { error } = await db.signInWithPassword(email.trim(), password);
        if (error) throw error;
        // onAuthChange listener in AppContext picks up the session and loads live data.
        setIsAuthModalOpen(false);
      } else {
        const { data, error } = await db.signUp(email.trim(), password);
        if (error) throw error;
        if (data.session) {
          // Email confirmation disabled → session returned directly.
          setIsAuthModalOpen(false);
        } else {
          setSentMagicLink(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed. Please check credentials.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const { error } = await db.signInWithOtp(email.trim());
      if (error) throw error;
      setSentMagicLink(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send the magic link.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200"
        role="dialog"
      >
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-800 text-amber-300 shadow-sm">
            <Store className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">
            {mode === "login" ? t("auth.signInTitle") : t("auth.createOne")}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {t("auth.signInSubtitle")}
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
            {errorMsg}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors min-h-[46px] mb-4"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative mb-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Or continue with email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-emerald-600 focus:outline-hidden"
                  placeholder="e.g. Tariq Mehmood"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shop / Store Name</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-emerald-600 focus:outline-hidden"
                  placeholder="e.g. Bismillah Kiryana & General Store"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t("auth.email")}</label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 ps-9 pe-3.5 py-2.5 text-xs focus:border-emerald-600 focus:outline-hidden"
                placeholder="storeowner@gmail.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t("auth.password")}</label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 ps-9 pe-3.5 py-2.5 text-xs focus:border-emerald-600 focus:outline-hidden"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors min-h-[44px] disabled:opacity-50"
            >
              {isLoading ? "..." : mode === "login" ? t("auth.loginBtn") : t("auth.createOne")}
            </button>
            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px] disabled:opacity-50"
            >
              {sentMagicLink ? (
                <span className="flex items-center justify-center gap-1 text-emerald-700">
                  <Check className="h-3.5 w-3.5" /> {t("auth.magicLinkBtn")}
                </span>
              ) : (
                t("auth.magicLinkBtn")
              )}
            </button>
          </div>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center text-xs text-slate-500">
          <span>{mode === "login" ? t("auth.noAccount") : t("auth.signInTitle")}</span>{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="font-bold text-emerald-800 hover:underline"
          >
            {mode === "login" ? t("auth.createOne") : t("auth.loginBtn")}
          </button>
        </div>
      </div>
    </div>
  );
};