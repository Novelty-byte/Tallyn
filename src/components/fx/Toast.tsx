import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from "lucide-react";

export type ToastKind = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastOptions {
  description?: string;
  /** ms before auto-dismiss (default 5000, errors 7000). 0 keeps it until closed. */
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastApi {
  show: (kind: ToastKind, title: string, opts?: ToastOptions) => number;
  success: (title: string, opts?: ToastOptions) => number;
  error: (title: string, opts?: ToastOptions) => number;
  info: (title: string, opts?: ToastOptions) => number;
  warning: (title: string, opts?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-700" />,
  error: <XCircle className="h-5 w-5 text-rose-700" />,
  info: <Info className="h-5 w-5 text-sky-700" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-700" />,
};

const ACCENT: Record<ToastKind, string> = {
  success: "border-emerald-300 bg-emerald-50",
  error: "border-rose-300 bg-rose-50",
  info: "border-sky-300 bg-mistblue",
  warning: "border-amber-300 bg-cream",
};

/**
 * Non-blocking notifications that replace alert(). On phones they sit in the
 * thumb zone (bottom, above the tab bar); on desktop they stack bottom-right.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (kind: ToastKind, title: string, opts: ToastOptions = {}) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { id, kind, title, description: opts.description, actionLabel: opts.actionLabel, onAction: opts.onAction }]);
      const duration = opts.duration ?? (kind === "error" ? 7000 : 5000);
      if (duration > 0) window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (t, o) => show("success", t, o),
      error: (t, o) => show("error", t, o),
      info: (t, o) => show("info", t, o),
      warning: (t, o) => show("warning", t, o),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6 lg:bottom-6"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-3.5 shadow-lg ${ACCENT[t.kind]}`}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.kind]}</span>
            <div className="min-w-0 flex-1 text-start">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{t.description}</p>}
              {t.actionLabel && t.onAction && (
                <button
                  onClick={() => { t.onAction?.(); dismiss(t.id); }}
                  className="mt-2 min-h-[32px] rounded-lg bg-white/80 px-3 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200 hover:bg-white"
                >
                  {t.actionLabel}
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="hit -m-2 flex shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
