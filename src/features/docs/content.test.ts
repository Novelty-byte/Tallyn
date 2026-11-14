import { describe, it, expect } from "vitest";
import { DOC_GROUPS, DOC_PAGES, type DocBlock } from "@/features/docs/content";

const textsOf = (b: DocBlock): string[] => {
  switch (b.t) {
    case "p": case "note": case "tip": case "warn": return [b.text];
    case "ul": case "steps": return b.items;
    case "table": return b.rows.flat();
    case "flow": return b.steps.map((s) => s.text);
    case "cards": return b.items.map((c) => c.text);
    default: return [];
  }
};

describe("docs content", () => {
  it("has unique page slugs and unique section ids per page", () => {
    const slugs = DOC_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of DOC_PAGES) {
      const ids = p.sections.map((s) => s.id);
      expect(new Set(ids).size, p.slug).toBe(ids.length);
    }
  });

  it("puts every page in a known group, and every group has pages", () => {
    for (const p of DOC_PAGES) expect(DOC_GROUPS).toContain(p.group);
    for (const g of DOC_GROUPS) expect(DOC_PAGES.some((p) => p.group === g), g).toBe(true);
  });

  it("has no broken internal /docs links or anchors", () => {
    const targets = new Set(DOC_PAGES.flatMap((p) => [`/docs/${p.slug}`, ...p.sections.map((s) => `/docs/${p.slug}#${s.id}`)]));
    const links: string[] = [];
    for (const p of DOC_PAGES)
      for (const s of p.sections)
        for (const b of s.blocks) {
          if (b.t === "cards") links.push(...b.items.map((c) => c.href));
          for (const t of textsOf(b)) for (const m of t.matchAll(/\]\((\/docs\/[^)]+)\)/g)) links.push(m[1]);
        }
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(targets.has(l), l).toBe(true);
  });
});
