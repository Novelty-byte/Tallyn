import React from "react";
import { Link } from "react-router-dom";
import { Info, Lightbulb, AlertTriangle, ArrowRight, ArrowDown } from "lucide-react";
import type { DocBlock } from "@/features/docs/content";

/**
 * Inline text: **bold**, `code`, [label](/path). Built as React elements (never HTML),
 * so documentation text can't inject markup.
 */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**")) return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`")) return <code key={i} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">{part.slice(1, -1)}</code>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return link[2].startsWith("/")
            ? <Link key={i} to={link[2]} className="font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:decoration-emerald-800">{link[1]}</Link>
            : <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-800 underline underline-offset-2">{link[1]}</a>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

const CALLOUT = {
  note: { icon: <Info className="h-4 w-4 text-sky-700" />, cls: "border-sky-200 bg-sky-50/70", label: "Note" },
  tip: { icon: <Lightbulb className="h-4 w-4 text-emerald-700" />, cls: "border-emerald-200 bg-emerald-50/70", label: "Tip" },
  warn: { icon: <AlertTriangle className="h-4 w-4 text-amber-700" />, cls: "border-amber-300 bg-amber-50/70", label: "Important" },
} as const;

export function DocBlockView({ block }: { block: DocBlock }) {
  switch (block.t) {
    case "p":
      return <p className="leading-7 text-slate-700"><Inline text={block.text} /></p>;
    case "ul":
      return (
        <ul className="space-y-2 ps-5 text-slate-700 [&>li]:list-disc [&>li]:leading-7 marker:text-slate-400">
          {block.items.map((it, i) => <li key={i}><Inline text={it} /></li>)}
        </ul>
      );
    case "steps":
      return (
        <ol className="space-y-3">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{i + 1}</span>
              <span className="pt-0.5 leading-7 text-slate-700"><Inline text={it} /></span>
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-start text-xs uppercase tracking-wide text-slate-500">
              <tr>{block.head.map((h) => <th key={h} scope="col" className="px-4 py-2.5 text-start font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {block.rows.map((r, i) => (
                <tr key={i} className="align-top">
                  {r.map((c, j) => (
                    <td key={j} className={`px-4 py-2.5 leading-6 ${j === 0 ? "font-medium text-slate-900 whitespace-nowrap" : "text-slate-700"}`}><Inline text={c} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
    case "tip":
    case "warn": {
      const c = CALLOUT[block.t];
      return (
        <div className={`flex gap-3 rounded-xl border p-4 ${c.cls}`} role="note">
          <span className="mt-0.5 shrink-0">{c.icon}</span>
          <div className="text-sm leading-6 text-slate-800">
            <p className="font-semibold text-slate-900">{block.title ?? c.label}</p>
            <p><Inline text={block.text} /></p>
          </div>
        </div>
      );
    }
    case "code":
      return (
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-[13px] leading-6 text-slate-100">
          {block.lang && <span className="mb-2 block text-[11px] uppercase tracking-wider text-slate-400">{block.lang}</span>}
          <code>{block.code}</code>
        </pre>
      );
    case "flow":
      return (
        <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-stretch" aria-label="Flow">
          {block.steps.map((s, i) => (
            <React.Fragment key={i}>
              <li className="flex-1 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{s.text}</p>
              </li>
              {i < block.steps.length - 1 && (
                <li aria-hidden="true" className="flex items-center justify-center text-slate-400">
                  <ArrowRight className="hidden h-4 w-4 md:block" />
                  <ArrowDown className="h-4 w-4 md:hidden" />
                </li>
              )}
            </React.Fragment>
          ))}
        </ol>
      );
    case "cards":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {block.items.map((c) => (
            <Link
              key={c.href}
              to={c.href}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-400"
            >
              <p className="flex items-center justify-between font-semibold text-slate-900">
                {c.title}
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{c.text}</p>
            </Link>
          ))}
        </div>
      );
  }
}
