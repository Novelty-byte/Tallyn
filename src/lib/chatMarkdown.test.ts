import { describe, it, expect } from "vitest";
import { escapeHtml, inlineMarkdownToSafeHtml } from "./chatMarkdown";

describe("chat markdown", () => {
  it("neutralises HTML from names or model output", () => {
    const out = inlineMarkdownToSafeHtml(`Stock: <img src=x onerror="alert(1)"> **Tea**`);
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(out).toContain("<strong>Tea</strong>");
  });
  it("cannot smuggle tags through bold markers", () => {
    expect(inlineMarkdownToSafeHtml("**<script>x</script>**")).toBe("<strong>&lt;script&gt;x&lt;/script&gt;</strong>");
  });
  it("escapes ampersands and quotes", () => {
    expect(escapeHtml(`Tom & "Jerry's"`)).toBe("Tom &amp; &quot;Jerry&#39;s&quot;");
  });
});
