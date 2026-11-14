/**
 * Persists "I'm exploring the demo store" across page reloads.
 *
 * Demo mode used to live only in React state, so a refresh dropped the visitor
 * onto /login. The flag is cleared only by an explicit action: exiting the demo,
 * signing out, or starting a sign-in / sign-up.
 *
 * Stores the demo branch id (so a reload keeps the same branch), or null when the
 * visitor is not in demo mode. All access is guarded: storage can be unavailable
 * (private windows, blocked site data) and the app must still work without it.
 */
const KEY = "tallyn.demo-session";

export function readDemoSession(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeDemoSession(shopId: string): void {
  try {
    window.localStorage.setItem(KEY, shopId);
  } catch {
    /* storage unavailable — demo simply won't survive a reload */
  }
}

export function clearDemoSession(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Runs an explicit sign-in / sign-up call. The demo flag is cleared first so the auth
 * listener loads the real account instead of deferring to the demo; if the call fails
 * (wrong password, network) the visitor stays in the demo they came from.
 */
export async function asExplicitAuth<T extends { error: unknown }>(run: () => Promise<T>): Promise<T> {
  const previous = readDemoSession();
  clearDemoSession();
  try {
    const result = await run();
    if (result.error && previous) writeDemoSession(previous);
    return result;
  } catch (err) {
    if (previous) writeDemoSession(previous);
    throw err;
  }
}
