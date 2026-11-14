/**
 * Ask Tallyn client → `ai-gateway` Edge Function.
 * The AI key lives only on the server. The browser sends the question, recent turns,
 * and a store snapshot computed in tested code (lib/askContext). Signed-in users send
 * their session token; demo visitors send none and get the demo limits.
 * Callers must catch AskTallynError and show local fallback advice (Rule 5: fail open).
 */
import type { StoreSnapshot } from "@/lib/askContext";

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

export async function askTallyn(opts: {
  question: string;
  history: ChatTurn[];
  snapshot: StoreSnapshot;
  accessToken?: string | null;
}): Promise<string> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new AskTallynError("not_configured", "Ask Tallyn isn't set up on this server.");

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${url}/functions/v1/ai-gateway`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${opts.accessToken || anonKey}`,
      },
      body: JSON.stringify({
        question: opts.question.slice(0, 1000),
        history: opts.history.slice(-8).map((t) => ({ role: t.role, text: t.text.slice(0, 2000) })),
        snapshot: opts.snapshot,
      }),
    });
  } catch {
    throw controller.signal.aborted
      ? new AskTallynError("unavailable", "Tallyn AI took too long to answer.")
      : new AskTallynError("network", "No internet connection.");
  } finally {
    window.clearTimeout(timer);
  }

  let body: { answer?: unknown; error?: unknown } | null = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page */
  }
  const serverMsg = typeof body?.error === "string" ? body.error : null;

  if (!res.ok) {
    if (res.status === 429) throw new AskTallynError("rate_limited", serverMsg ?? "Daily question limit reached.");
    if (res.status === 404 || res.status === 503) {
      throw new AskTallynError("not_configured", serverMsg ?? "Ask Tallyn isn't switched on yet.");
    }
    if (res.status === 400) console.warn("ai-gateway rejected the request:", body);
    throw new AskTallynError("unavailable", serverMsg ?? "Tallyn AI couldn't answer right now.");
  }

  if (typeof body?.answer !== "string" || !body.answer.trim()) {
    throw new AskTallynError("bad_response", "Tallyn AI returned an empty answer.");
  }
  return body.answer.trim().slice(0, 4000);
}
