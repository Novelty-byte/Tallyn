import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { db } from "@/services/supabase";
import { 
  Store, 
  Mail, 
  Lock, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Clock
} from "lucide-react";

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loginWithGoogle } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sentMagicLink, setSentMagicLink] = useState(false);
  
  // 5-second account not found fallback state
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user && !user.isDemo) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Read email param from URL if redirected
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramEmail = params.get("email");
    if (paramEmail) setEmail(paramEmail);
  }, [location]);

  // 5-second timer countdown when account not found is triggered
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (accountNotFound && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (accountNotFound && countdown === 0) {
      // Auto-redirect to register page with email prefilled
      navigate(`/register?email=${encodeURIComponent(email.trim())}`);
    }
    return () => clearTimeout(timer);
  }, [accountNotFound, countdown, email, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setAccountNotFound(false);

    try {
      const { data, error } = await db.signInWithPassword(email.trim(), password);
      if (error) {
        // Fallback: If credentials fail or account doesn't exist
        setAccountNotFound(true);
        setCountdown(5);
        return;
      }
      if (data?.session) {
        navigate("/dashboard");
      }
    } catch (err) {
      // Trigger 5-second account not found prompt
      setAccountNotFound(true);
      setCountdown(5);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      alert("Please enter your email address first.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await db.signInWithOtp(email.trim());
      if (error) {
        setAccountNotFound(true);
        setCountdown(5);
        return;
      }
      setSentMagicLink(true);
    } catch {
      setAccountNotFound(true);
      setCountdown(5);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="w-full max-w-md space-y-6">
        
        {/* Account Not Available 5-Second Red Banner Alert */}
        {accountNotFound && (
          <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 p-4 sm:p-5 shadow-lg animate-bounce text-start">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-extrabold text-rose-950">
                  Your Account is not available, Kindly create your account first
                </h4>
                <p className="text-xs text-rose-700 mt-1">
                  We could not find an existing store owner profile for <strong className="font-bold">{email}</strong>.
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-lg">
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>Redirecting to Sign Up in {countdown}s...</span>
                  </span>
                  <button
                    onClick={() => navigate(`/register?email=${encodeURIComponent(email.trim())}`)}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold px-3 py-1.5 text-xs shadow-xs transition-colors"
                  >
                    <span>Create Account Now</span>
                    <ArrowRight className="h-3.5 w-3.5 rtl-flip" />
                  </button>
                </div>
              </div>
            </div>
            {/* Visual animated countdown progress bar */}
            <div className="w-full bg-rose-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-rose-600 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(countdown / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Card Box */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl text-start">
          {/* Logo & Heading */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-800 text-amber-300 shadow-md">
              <Store className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Sign In to Tallyn
            </h2>
            <p className="mt-1.5 text-xs text-slate-500">
              Access your real-time Kiryana counter, inventory, and udhaar ledger.
            </p>
          </div>

          {/* Social Sign In (Google) */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition-all min-h-[46px] mb-5 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google / Gmail</span>
          </button>

          {/* Divider */}
          <div className="relative mb-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Or sign in with email & password
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 ps-10 pe-4 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden min-h-[42px]"
                  placeholder="shopkeeper@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleSendMagicLink}
                  className="text-xs font-semibold text-emerald-800 hover:underline min-h-[44px] inline-flex items-center"
                >
                  Send One-Click Magic Link
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 ps-10 pe-10 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden min-h-[42px]"
                  placeholder="••••••••"
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

            {sentMagicLink && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700" />
                <span>Magic sign-in link dispatched to your inbox!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-100 font-bold py-3 text-xs shadow-md transition-colors min-h-[46px] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Signing in..." : "Sign In to Store Dashboard"}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>Don't have a registered store yet?</span>{" "}
            <Link
              to="/register"
              className="font-extrabold text-emerald-800 hover:text-emerald-900 hover:underline inline-flex items-center gap-1"
            >
              <span>Register Your Store</span>
              <ArrowRight className="h-3 w-3 rtl-flip" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};