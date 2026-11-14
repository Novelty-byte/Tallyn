/**
 * Single source of truth for Tallyn routes.
 * The URL is the state: `activeTab` is DERIVED from the pathname (see AppContext),
 * so the browser Back/Forward buttons and deep links can never disagree with the UI.
 */
export type ActiveTab =
  | "landing" | "pos" | "dashboard" | "insights"
  | "inventory" | "udhaar" | "purchases" | "history" | "settings"
  | "login" | "register" | "onboarding" | "notfound";

/** Every accepted pathname (including aliases) -> tab. */
export const ROUTE_TAB_MAP: Record<string, ActiveTab> = {
  "/": "landing",
  "/pos": "pos",
  "/dashboard": "dashboard",
  "/insights": "insights",
  "/inventory": "inventory",
  "/udhaar": "udhaar",
  "/purchases": "purchases",
  "/history": "history",
  "/settings": "settings",
  "/login": "login",
  "/signin": "login",
  "/register": "register",
  "/signup": "register",
  "/onboarding": "onboarding",
  "/register-store": "onboarding",
};

/** Canonical path used when code navigates to a tab. */
export const TAB_ROUTE_MAP: Record<ActiveTab, string> = {
  landing: "/",
  pos: "/pos",
  dashboard: "/dashboard",
  insights: "/insights",
  inventory: "/inventory",
  udhaar: "/udhaar",
  purchases: "/purchases",
  history: "/history",
  settings: "/settings",
  login: "/login",
  register: "/register",
  onboarding: "/onboarding",
  notfound: "/404",
};

/** Pages that need a signed-in user (or an active demo session). */
export const PROTECTED_TABS: ReadonlySet<ActiveTab> = new Set<ActiveTab>([
  "pos", "dashboard", "insights", "inventory", "udhaar", "purchases", "history", "settings",
]);

export const TAB_TITLES: Record<ActiveTab, string> = {
  landing: "Tallyn — Zero-Typing Counter POS & Store Intelligence",
  pos: "Counter POS · Tallyn",
  dashboard: "Dashboard · Tallyn",
  insights: "Insights · Tallyn",
  inventory: "Inventory · Tallyn",
  udhaar: "Udhaar ledger · Tallyn",
  purchases: "Purchases · Tallyn",
  history: "Sales history · Tallyn",
  settings: "Settings · Tallyn",
  login: "Sign in · Tallyn",
  register: "Create account · Tallyn",
  onboarding: "Set up your store · Tallyn",
  notfound: "Page not found · Tallyn",
};

export function tabFromPath(pathname: string): ActiveTab {
  const clean = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return ROUTE_TAB_MAP[clean] ?? "notfound";
}
