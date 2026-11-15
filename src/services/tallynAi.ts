/**
 * Tallyn AI client → `ai-gateway` Edge Function.
 * The AI key lives only on the server. The browser sends the question, recent turns,
 * and a store snapshot computed in tested code (lib/askContext). Signed-in users send
 * their session token; demo visitors send none and get the demo limits.
 * Callers must catch AskTallynError and show local fallback advice (Rule 5: fail open).
 */
import type { StoreSnapshot } from "@/domain/storeSnapshot";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export type AskErrorKind = "not_configured" | "rate_limited" | "unavailable" | "network" | "bad_response";

export class AskTallynError extends Error {
  constructor(public kind: AskErrorKind, message: string) {
    super(message);
    this.name = "AskTallynError";
  }
}

const TIMEOUT_MS = 120_000; // free-tier AI providers can queue

/** Products and customers the assistant may propose actions on (sent as names + ids). */
export interface AskRefs {
  products: Array<{ id: string; name: string; nameUr?: string }>;
  customers: Array<{ id: string; name: string }>;
}

export interface AskResult {
  answer: string;
  /** Unvalidated proposal from the server; check it with domain/agentActions before showing it. */
  action: unknown;
  /** Item words the AI couldn't find in the catalogue. */
  notFound: string[];
}

export async function askTallyn(opts: {
  question: string;
  history: ChatTurn[];
  snapshot: StoreSnapshot;
  refs?: AskRefs;
  accessToken?: string | null;
}): Promise<AskResult> {
  const body = await postGateway(
    {
      question: opts.question.slice(0, 1000),
      history: opts.history.slice(-8).map((t) => ({ role: t.role, text: t.text.slice(0, 2000) })),
      snapshot: opts.snapshot,
      ...(opts.refs
        ? {
            refs: {
              products: opts.refs.products.slice(0, 600).map((p) => ({
                id: p.id,
                name: p.name.slice(0, 120),
                ...(p.nameUr ? { nameUr: p.nameUr.slice(0, 120) } : {}),
              })),
              customers: opts.refs.customers.slice(0, 400).map((c) => ({ id: c.id, name: c.name.slice(0, 80) })),
            },
          }
        : {}),
    },
    opts.accessToken,
  );
  if (typeof body.answer !== "string" || !body.answer.trim()) {
    throw new AskTallynError("bad_response", "Tallyn AI returned an empty answer.");
  }
  const notFound = Array.isArray(body.notFound)
    ? body.notFound.filter((s): s is string => typeof s === "string").map((s) => s.slice(0, 60)).slice(0, 10)
    : [];
  return { answer: body.answer.trim().slice(0, 4000), action: body.action ?? null, notFound };
}

/** Script of the speech voice that will read the tip (see domain/radioBriefing). */
export type RadioScript = "latin" | "urdu" | "devanagari";

export interface RadioTip {
  /** On-screen text: English, or Roman Urdu. */
  text: string;
  /** Same tip in the voice's script when that differs from `text`. */
  spoken: string | null;
}

/** One AI "tip of the day" for Kiryana Radio. The briefing's numbers never come from here. */
export async function askRadioTip(opts: {
  language: "English" | "Urdu";
  script: RadioScript;
  snapshot: StoreSnapshot;
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<RadioTip> {
  const body = await callGateway(
    {
      question: "Kiryana Radio tip",
      history: [],
      snapshot: opts.snapshot,
      mode: "radio",
      radio: { language: opts.language, script: opts.language === "English" ? "latin" : opts.script },
    },
    opts.accessToken,
    opts.signal,
  );
  const spoken = typeof body.spoken === "string" && body.spoken.trim() ? body.spoken.trim().slice(0, 1000) : null;
  return { text: body.answer.slice(0, 1000), spoken };
}

interface GatewayBody {
  answer?: unknown;
  spoken?: unknown;
  order?: unknown;
  action?: unknown;
  notFound?: unknown;
  error?: unknown;
}

async function callGateway(
  payload: Record<string, unknown>,
  accessToken?: string | null,
  outerSignal?: AbortSignal,
): Promise<{ answer: string; spoken?: unknown }> {
  const body = await postGateway(payload, accessToken, outerSignal);
  if (typeof body.answer !== "string" || !body.answer.trim()) {
    throw new AskTallynError("bad_response", "Tallyn AI returned an empty answer.");
  }
  return { answer: body.answer.trim().slice(0, 4000), spoken: body.spoken };
}

/** POST to ai-gateway and map HTTP failures to AskTallynError. Returns the parsed JSON body. */
export async function postGateway(
  payload: Record<string, unknown>,
  accessToken?: string | null,
  outerSignal?: AbortSignal,
  timeoutMs: number = TIMEOUT_MS,
): Promise<GatewayBody> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new AskTallynError("not_configured", "Tallyn AI isn't set up on this server.");

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const onOuterAbort = () => controller.abort();
  outerSignal?.addEventListener("abort", onOuterAbort);
  let res: Response;
  try {
    res = await fetch(`${url}/functions/v1/ai-gateway`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${accessToken || anonKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw controller.signal.aborted
      ? new AskTallynError("unavailable", "Tallyn AI took too long to answer.")
      : new AskTallynError("network", "No internet connection.");
  } finally {
    window.clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }

  let body: GatewayBody | null = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page */
  }
  const serverMsg = typeof body?.error === "string" ? body.error : null;

  if (!res.ok) {
    if (res.status === 429) throw new AskTallynError("rate_limited", serverMsg ?? "Daily question limit reached.");
    if (res.status === 404 || res.status === 503) {
      throw new AskTallynError("not_configured", serverMsg ?? "Tallyn AI isn't switched on yet.");
    }
    if (res.status === 400) console.warn("ai-gateway rejected the request:", body);
    throw new AskTallynError("unavailable", serverMsg ?? "Tallyn AI couldn't answer right now.");
  }

  if (!body) throw new AskTallynError("bad_response", "Tallyn AI returned an empty answer.");
  return body;
}
