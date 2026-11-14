import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, Hash, Search, X } from "lucide-react";
import { DOC_GROUPS, DOC_PAGES, DEFAULT_DOC, findDoc } from "@/features/docs/content";
import { DocBlockView } from "@/features/docs/DocBlocks";

/** Documentation: /docs/<page>#<section>. Sidebar (groups), article, "On this page", prev/next. */
export const DocsView: React.FC = () => {
  const { slug } = useParams();
  const { hash } = useLocation();
  const page = findDoc(slug ?? DEFAULT_DOC);
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Page title + jump to #section after navigation.
  useEffect(() => {
    if (!page) return;
    document.title = `${page.title} · Tallyn Docs`;
    setMenuOpen(false);
    if (hash) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }));
    }
  }, [page, hash]);

  // Highlight the section being read in "On this page".
  useEffect(() => {
    if (!page) return;
    setActiveSection(page.sections[0]?.id ?? null);
    const els = page.sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [page]);

  // Sidebar search across page titles, summaries and section titles.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return DOC_PAGES.flatMap((p) => {
      const hits: { href: string; label: string; context: string }[] = [];
      if (p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q)) hits.push({ href: `/docs/${p.slug}`, label: p.title, context: p.group });
      for (const s of p.sections) if (s.title.toLowerCase().includes(q)) hits.push({ href: `/docs/${p.slug}#${s.id}`, label: s.title, context: p.title });
      return hits;
    }).slice(0, 12);
  }, [query]);

  if (!slug) return <Navigate to={`/docs/${DEFAULT_DOC}`} replace />;
  if (!page) return <Navigate to={`/docs/${DEFAULT_DOC}`} replace />;

  const idx = DOC_PAGES.indexOf(page);
  const prev = DOC_PAGES[idx - 1];
  const next = DOC_PAGES[idx + 1];

  const sidebar = (
    <nav aria-label="Documentation" className="space-y-6 text-sm">
      <label className="relative block">
        <span className="sr-only">Search the docs</span>
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs"
          className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white ps-9 pe-3 text-sm focus:border-slate-400 focus:outline-hidden"
        />
      </label>

      {results ? (
        <ul className="space-y-1" aria-live="polite">
          {results.length === 0 && <li className="px-2 text-slate-500">No matches.</li>}
          {results.map((r) => (
            <li key={r.href}>
              <Link to={r.href} onClick={() => setQuery("")} className="block rounded-md px-2 py-1.5 hover:bg-slate-100">
                <span className="block font-medium text-slate-900">{r.label}</span>
                <span className="block text-xs text-slate-500">{r.context}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        DOC_GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{group}</p>
            <ul className="space-y-0.5">
              {DOC_PAGES.filter((p) => p.group === group).map((p) => {
                const active = p.slug === page.slug;
                return (
                  <li key={p.slug}>
                    <Link
                      to={`/docs/${p.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-2 py-1.5 transition-colors ${active ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      {p.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </nav>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Mobile: section menu */}
      <div className="mb-6 lg:hidden">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
        >
          <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-500" /> {page.group} / {page.title}</span>
          {menuOpen ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-90" />}
        </button>
        {menuOpen && <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4">{sidebar}</div>}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_200px]">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pe-2">{sidebar}</div>
        </aside>

        {/* Article */}
        <article className="min-w-0 max-w-3xl">
          <p className="text-sm font-medium text-emerald-800">{page.group}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{page.title}</h1>
          <p className="mt-3 text-lg leading-8 text-slate-600">{page.summary}</p>

          <div className="mt-8 space-y-12">
            {page.sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
                <h2 id={`${s.id}-h`} className="group mb-4 flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
                  {s.title}
                  <a
                    href={`#${s.id}`}
                    aria-label={`Link to "${s.title}"`}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-slate-700"
                  >
                    <Hash className="h-4 w-4" />
                  </a>
                </h2>
                <div className="space-y-4">
                  {s.blocks.map((b, i) => <DocBlockView key={i} block={b} />)}
                </div>
              </section>
            ))}
          </div>

          {/* Prev / next */}
          <nav aria-label="Pagination" className="mt-16 grid grid-cols-1 gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
            {prev ? (
              <Link to={`/docs/${prev.slug}`} className="group rounded-xl border border-slate-200 p-4 hover:border-slate-400">
                <span className="flex items-center gap-1 text-xs text-slate-500"><ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" /> Previous</span>
                <span className="mt-1 block font-semibold text-slate-900">{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link to={`/docs/${next.slug}`} className="group rounded-xl border border-slate-200 p-4 text-end hover:border-slate-400">
                <span className="flex items-center justify-end gap-1 text-xs text-slate-500">Next <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" /></span>
                <span className="mt-1 block font-semibold text-slate-900">{next.title}</span>
              </Link>
            )}
          </nav>
        </article>

        {/* On this page */}
        <aside className="hidden xl:block" aria-label="On this page">
          <div className="sticky top-24">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
            <ul className="space-y-1 border-s border-slate-200 text-sm">
              {page.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`-ms-px block border-s-2 py-1 ps-3 transition-colors ${activeSection === s.id ? "border-slate-800 font-medium text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};
