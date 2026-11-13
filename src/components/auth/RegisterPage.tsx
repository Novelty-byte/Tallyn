import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { db } from "@/services/supabase";
import { 
  Store, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Check, 
  Eye, 
  EyeOff,
  Sparkles,
  ShieldCheck
} from "lucide-react";

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Read email param from URL if redirected from login fallback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramEmail = params.get("email");
    if (paramEmail) setEmail(paramEmail);
  }, [location]);

  // If already logged in with active shops, redirect to dashboard
  useEffect(() => {
    if (user && !user.isDemo) {
      navigate("/onboarding");
    }
  }, [user, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await db.signUp(email.trim(), password, fullName.trim() || "Retail Owner");
      if (error) throw error;

      // Upon successful account creation, redirect directly to the Full Store Setup Form (form.PNG)
      navigate("/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account. Please try again.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const { error } = await db.signInWithGoogle(`${window.location.origin}/dashboard`);
      if (error) throw error;
      // On success, Supabase's onAuthChange listener sets the real user and
      // onboarding (store registration) happens next via /onboarding route.
    } catch (err) {
      setErrorMsg("Google sign-up is not configured. Please sign up with email & password instead.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="w-full max-w-md space-y-6">
        
        {/* Progress Pills */}
        <div className="flex items-center justify-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-800 text-amber-300 px-3 py-1 shadow-xs">
            <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-bold">1</span>
            <span>Create Account</span>
          </span>
          <span className="text-slate-300">───</span>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-500 px-3 py-1">
            <span className="h-4 w-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">2</span>
            <span>Register Store</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl text-start">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-800 text-amber-300 shadow-md">
              <Store className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Register Your Store on Tallyn
            </h2>
            <p className="mt-1.5 text-xs text-slate-500">
              Create your merchant owner account to configure and launch your store locations.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
              {errorMsg}
            </div>
          )}

          {/* Social Sign Up (Google) */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition-all min-h-[46px] mb-5 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign Up with Google / Gmail</span>
          </button>

          {/* Divider */}
          <div className="relative mb-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Or register with email
            </span>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Full Name (Owner / Merchant) *
              </label>
              <div className="relative">
                <User className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 ps-10 pe-4 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden min-h-[42px]"
                  placeholder="e.g. Tariq Mehmood"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 ps-10 pe-4 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden min-h-[42px]"
                  placeholder="merchant@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Create Password *
              </label>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 ps-10 pe-10 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden min-h-[42px]"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-100 font-bold py-3 text-xs shadow-md transition-colors min-h-[46px] disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? "Creating Account..." : "Continue to Store Setup Form"}</span>
              <ArrowRight className="h-4 w-4 rtl-flip" />
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>Already registered your store?</span>{" "}
            <Link
              to="/login"
              className="font-extrabold text-emerald-800 hover:text-emerald-900 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};