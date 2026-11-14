import React from "react";
import { Link } from "react-router-dom";
import { Home, ReceiptText } from "lucide-react";

export const NotFoundPage: React.FC = () => (
  <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
    <p className="font-mono text-xs uppercase tracking-widest text-emerald-800">Error 404</p>
    <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">This page isn&apos;t on the shelf.</h1>
    <p className="mt-3 text-sm text-slate-600">
      The link may be old or mistyped. Your counter and ledgers are safe — head back and carry on.
    </p>
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Link
        to="/"
        className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-5"
      >
        <Home className="h-4 w-4" /> Back to home
      </Link>
      <Link
        to="/pos"
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        <ReceiptText className="h-4 w-4" /> Open counter
      </Link>
    </div>
  </section>
);
