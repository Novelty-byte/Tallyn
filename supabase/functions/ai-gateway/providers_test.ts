// Run: deno test --allow-env supabase/functions/ai-gateway/
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  AllProvidersFailed, DEFAULT_OPENROUTER_MODELS, providersFromEnv, runChain, thinkingFields, type AiProvider,
} from "./providers.ts";

const envOf = (vars: Record<string, string>) => (k: string) => vars[k];

Deno.test("providersFromEnv: primary then OpenRouter backups, skipping missing keys", () => {
  const ps = providersFromEnv(envOf({
    GEMINI_API_KEY: "sk-primary", GEMINI_MODEL: "free/gemini-3.8-flash", AI_BASE_URL: "https://api.apinex.bond/v1",
    OPENROUTER_API_KEY: "sk-or-x",
  }));
  assertEquals(ps.map((p) => [p.kind, p.model, p.baseUrl]), [
    ["openai", "free/gemini-3.8-flash", "https://api.apinex.bond/v1"],
    ["openrouter", DEFAULT_OPENROUTER_MODELS[0], "https://openrouter.ai/api/v1"],
    ["openrouter", DEFAULT_OPENROUTER_MODELS[1], "https://openrouter.ai/api/v1"],
  ]);
  assertEquals(providersFromEnv(envOf({ OPENROUTER_API_KEY: "k", OPENROUTER_MODELS: " a/b:free , ,c/d " })).map((p) => p.model), ["a/b:free", "c/d"]);
  assertEquals(providersFromEnv(envOf({ GEMINI_API_KEY: "AIzaXYZ" }))[0].kind, "gemini-native");
  assertEquals(providersFromEnv(envOf({})), []);
});

const fake = (label: string): AiProvider => ({ label, kind: "openai", apiKey: "k", baseUrl: "https://x", model: label });

Deno.test("runChain moves past errors and unusable output, and reports every attempt", async () => {
  const r = await runChain([fake("a"), fake("b"), fake("c")], async (p) => {
    if (p.label === "a") throw new Error("HTTP 402: top up");
    if (p.label === "b") return null; // e.g. JSON that failed validation
    return "answer";
  }, { perAttemptMs: 1000, budgetMs: 5000 });
  assertEquals(r.value, "answer");
  assertEquals(r.provider.label, "c");
  assertEquals(r.attempts.map((a) => [a.provider, a.error]), [["a", "HTTP 402: top up"], ["b", "unusable output"], ["c", undefined]]);
});

Deno.test("runChain times out a slow provider and tries the next", async () => {
  const r = await runChain([fake("slow"), fake("fast")], (p, signal) =>
    p.label === "slow"
      ? new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
      : Promise.resolve("ok"), { perAttemptMs: 50, budgetMs: 5000 });
  assertEquals(r.value, "ok");
  assertEquals(r.attempts[0].error, "timed out");
});

Deno.test("runChain throws AllProvidersFailed when nothing answers, or nothing is configured", async () => {
  await assertRejects(() => runChain([fake("a")], () => Promise.resolve(null), { perAttemptMs: 100, budgetMs: 1000 }), AllProvidersFailed);
  await assertRejects(() => runChain([], () => Promise.resolve("x"), { perAttemptMs: 100, budgetMs: 1000 }), AllProvidersFailed);
  // Out of budget: later providers are not started.
  let started = 0;
  await assertRejects(() => runChain([fake("a"), fake("b")], () => { started++; return Promise.resolve(null); }, { perAttemptMs: 100, budgetMs: 1000 }), AllProvidersFailed);
  assertEquals(started, 0);
});

Deno.test("thinking: OpenRouter backups always run with reasoning off; primary only when asked", () => {
  const or: AiProvider = { ...fake("or"), kind: "openrouter" };
  assertEquals(thinkingFields(or, "default"), { reasoning: { enabled: false } });
  assertEquals(thinkingFields(fake("p"), "off"), { reasoning_effort: "none" });
  assertEquals(thinkingFields(fake("p"), "default"), {});
  assertEquals(thinkingFields({ ...fake("g"), kind: "gemini-native" }, "off"), {});
});
