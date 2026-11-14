// Safe rendering helpers for chat text. AI replies and user input are untrusted:
// escape ALL HTML first, then apply the tiny subset of markdown we support (**bold**).

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escaped HTML with **bold** turned into <strong>. Safe for dangerouslySetInnerHTML. */
export function inlineMarkdownToSafeHtml(line: string): string {
  return escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
