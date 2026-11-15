/**
 * AI provider chain, shared by ai-gateway and bill-scan.
 * KEEP IN SYNC: supabase/functions/bill-scan/providers.ts is an identical copy (each Edge
 * Function is deployed on its own); src/lib/edgeFunctionsSync.test.ts fails if they differ.
 *
 * Order tried:
 *   1. Primary:  GEMINI_API_KEY + GEMINI_MODEL + AI_BASE_URL
 *                (a key starting "AIza" calls Gemini's native API instead of AI_BASE_URL)
 *   2. Backups:  OPENROUTER_API_KEY + each model in OPENROUTER_MODELS (comma-separated),
 *                default "dots-studio/dots-3-note-preview:free,google/gemma-4-31b-it:free"
 * A provider is skipped when its key is missing. When every provider fails, the caller
 * returns an error and the app falls back to its non-AI behaviour (Rule 5).
 */

export type ProviderKind = "gemini-native" | "openai" | "openrouter";

export interface AiProvider {
  /** For logs only, e.g. "primary:free/gemini-3.8-flash" or "openrouter:nvidia/…". */
  label: string;
  kind: ProviderKind;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const DEFAULT_PRIMARY_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
export const DEFAULT_PRIMARY_MODEL = "gemini-3.5-flash";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_OPENROUTER_MODELS = ["dots-studio/dots-3-note-preview:free", "google/gemma-4-31b-it:free"];

type Env = (name: string) => string | undefined;
const denoEnv: Env = (name) => Deno.env.get(name);

export function providersFromEnv(env: Env = denoEnv): AiProvider[] {
  const out: AiProvider[] = [];
  const primaryKey = (env("GEMINI_API_KEY") ?? "").trim();
  if (primaryKey) {
    const model = (env("GEMINI_MODEL") ?? "").trim() || DEFAULT_PRIMARY_MODEL;
    const native = primaryKey.startsWith("AIza");
    out.push({
      label: `primary:${model}`,
      kind: native ? "gemini-native" : "openai",
      apiKey: primaryKey,
      baseUrl: native ? "https://generativelanguage.googleapis.com/v1beta" : ((env("AI_BASE_URL") ?? "").trim() || DEFAULT_PRIMARY_BASE_URL),
      model,
    });
  }
  const orKey = (env("OPENROUTER_API_KEY") ?? "").trim();
  if (orKey) {
    const listed = (env("OPENROUTER_MODELS") ?? "").split(",").map((m) => m.trim()).filter(Boolean);
    for (const model of listed.length ? listed : DEFAULT_OPENROUTER_MODELS) {
      out.push({ label: `openrouter:${model}`, kind: "openrouter", apiKey: orKey, baseUrl: OPENROUTER_BASE_URL, model });
    }
  }
  return out;
}

export interface AttemptLog {
  provider: string;
  ms: number;
  error?: string;
}

export class AllProvidersFailed extends Error {
  constructor(public attempts: AttemptLog[]) {
    super(attempts.length ? `all AI providers failed: ${attempts.map((a) => `${a.provider} (${a.error})`).join("; ")}` : "no AI provider configured");
    this.name = "AllProvidersFailed";
  }
}

/**
 * Try each provider in order until `attempt` returns a value. A thrown error, a timeout or a
 * `null` result (e.g. output that failed validation) moves on to the next provider.
 * Each attempt gets min(perAttemptMs, time left in budgetMs).
 */
export async function runChain<T>(
  providers: AiProvider[],
  attempt: (p: AiProvider, signal: AbortSignal) => Promise<T | null>,
  opts: { perAttemptMs: number; budgetMs: number; skip?: (p: AiProvider) => boolean },
): Promise<{ value: T; provider: AiProvider; attempts: AttemptLog[] }> {
  const started = Date.now();
  const attempts: AttemptLog[] = [];
  for (const p of providers) {
    if (opts.skip?.(p)) continue;
    const left = opts.budgetMs - (Date.now() - started);
    if (left < 1500) {
      attempts.push({ provider: p.label, ms: 0, error: "out of time" });
      break;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(opts.perAttemptMs, left));
    const t0 = Date.now();
    try {
      const value = await attempt(p, controller.signal);
      if (value !== null) {
        attempts.push({ provider: p.label, ms: Date.now() - t0 });
        return { value, provider: p, attempts };
      }
      attempts.push({ provider: p.label, ms: Date.now() - t0, error: "unusable output" });
    } catch (err) {
      const msg = controller.signal.aborted ? "timed out" : err instanceof Error ? err.message : String(err);
      attempts.push({ provider: p.label, ms: Date.now() - t0, error: msg.slice(0, 160) });
    } finally {
      clearTimeout(timer);
    }
  }
  throw new AllProvidersFailed(attempts);
}

/** How much the model may "think" before answering. */
export type Thinking = "default" | "off";

/**
 * Provider-specific request fields. The primary (apinex / Google) accepts reasoning_effort.
 * OpenRouter's free models over-think: one spent ~1,300 reasoning tokens on a 5-word reply,
 * and even effort "low" took 10–34 s, while reasoning off answered correct JSON in ~1–1.5 s
 * (tested 2026-11-16). So backups always run with reasoning off.
 */
export function thinkingFields(p: AiProvider, thinking: Thinking): Record<string, unknown> {
  if (p.kind === "openrouter") return { reasoning: { enabled: false } };
  if (p.kind === "openai" && thinking === "off") return { reasoning_effort: "none" };
  return {};
}

/** A little extra output room for backups, in case a model ignores "reasoning off". */
export function maxTokensFor(p: AiProvider, base: number): number {
  return p.kind === "openrouter" ? base + 1000 : base;
}

/** Read the text of an OpenAI-style chat completion. */
export function completionText(body: unknown): string {
  const content = (body as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) return content.map((part: { text?: string }) => part?.text ?? "").join("");
  return typeof content === "string" ? content : "";
}
