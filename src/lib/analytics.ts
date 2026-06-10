// Lightweight, privacy-safe event tracking.
// No PII, no full URLs, no property addresses. Eventname + minimal context only.
//
// Designed to be wired to GA4, Meta Pixel, PostHog, or Plausible later.
// Until then events are logged to console (dev) and buffered in memory.

export type EventName =
  | "page_view"
  | "landing_link_submitted"
  | "landing_preview_shown"
  | "landing_preview_failed"
  | "signup_started"
  | "signup_completed"
  | "calculator_used"
  | "calculator_saved"
  | "from_calc_property_created"
  | "first_property_created"
  | "upgrade_modal_shown"
  | "checkout_started"
  | "checkout_completed";

export type FunnelStep =
  | "landing"
  | "link_submitted"
  | "preview_shown"
  | "signup"
  | "first_property"
  | "upgrade";

export const FUNNEL: { step: FunnelStep; event: EventName }[] = [
  { step: "landing", event: "page_view" },
  { step: "link_submitted", event: "landing_link_submitted" },
  { step: "preview_shown", event: "landing_preview_shown" },
  { step: "signup", event: "signup_completed" },
  { step: "first_property", event: "first_property_created" },
  { step: "upgrade", event: "checkout_completed" },
];

export type EventProps = Record<string, string | number | boolean | null | undefined>;

interface Context {
  loggedIn: boolean;
  plan: string | null;
  source: string | null;
}

const ctx: Context = { loggedIn: false, plan: null, source: null };

export function setAnalyticsContext(patch: Partial<Context>) {
  Object.assign(ctx, patch);
}

// Capture initial source (utm_source / referrer host) once per browser session.
function initSource() {
  if (typeof window === "undefined") return;
  try {
    const KEY = "analytics_source_v1";
    const existing = sessionStorage.getItem(KEY);
    if (existing) { ctx.source = existing; return; }
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source");
    const ref = document.referrer ? new URL(document.referrer).hostname : "";
    const sameHost = ref && ref === window.location.hostname;
    const source = utm || (ref && !sameHost ? ref : "direct");
    sessionStorage.setItem(KEY, source);
    ctx.source = source;
  } catch {
    ctx.source = "direct";
  }
}

// In-memory buffer (debugging + future flush to backend).
const buffer: { name: EventName; props: EventProps; ts: number }[] = [];

type Provider = (event: { name: EventName; props: EventProps; ts: number }) => void;
const providers: Provider[] = [];

export function registerAnalyticsProvider(p: Provider) {
  providers.push(p);
}

/**
 * Sanitize props to ensure no PII leaks (emails, full URLs, names, addresses).
 * Whitelist of allowed keys.
 */
const ALLOWED_KEYS = new Set([
  "path", "calc_type", "platform", "plan", "interval", "source",
  "ok", "error_code", "step", "amount", "currency",
]);

function sanitize(props: EventProps): EventProps {
  const out: EventProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_KEYS.has(k)) continue;
    if (typeof v === "string" && v.length > 100) continue;
    out[k] = v;
  }
  return out;
}

export function track(name: EventName, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  if (ctx.source == null) initSource();
  const enriched: EventProps = {
    ...sanitize(props),
    plan: ctx.plan,
    source: ctx.source,
    logged_in: ctx.loggedIn,
  };
  const evt = { name, props: enriched, ts: Date.now() };
  buffer.push(evt);
  if (buffer.length > 200) buffer.shift();
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, enriched);
  }
  for (const p of providers) {
    try { p(evt); } catch { /* never break the app for analytics */ }
  }
}

export function getEventBuffer() {
  return [...buffer];
}

/**
 * Convenience: track a page_view with the path only (never the full URL).
 */
export function trackPageView(path: string) {
  track("page_view", { path });
}
