// Server-side Stripe helper. Calls the Stripe REST API directly.
// Do NOT import this from client code; it is server-only.

export type StripeEnv = "sandbox" | "live";

const GATEWAY = "https://api.stripe.com";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

// Stripe-style form encoding: nested objects use bracket notation
// (e.g. metadata[userId]=abc, line_items[0][price]=price_xxx).
function flatten(
  obj: any,
  prefix = "",
  out: Record<string, string> = {},
): Record<string, string> {
  if (obj == null) return out;
  for (const [k, vRaw] of Object.entries(obj)) {
    const v: any = vRaw;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        const ikey = `${key}[${i}]`;
        if (item !== null && typeof item === "object") flatten(item, ikey, out);
        else if (item !== undefined && item !== null) out[ikey] = String(item);
      });
    } else if (typeof v === "object") {
      flatten(v, key, out);
    } else if (typeof v === "boolean") {
      out[key] = v ? "true" : "false";
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

async function call(env: StripeEnv, method: string, path: string, params?: any): Promise<any> {
  const apiKey = env === "sandbox" ? getEnv("STRIPE_SANDBOX_API_KEY") : getEnv("STRIPE_LIVE_API_KEY");
  let url = `${GATEWAY}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  let body: string | undefined;
  const flat = params ? flatten(params) : null;
  if (method === "GET") {
    if (flat && Object.keys(flat).length) {
      const qs = new URLSearchParams(flat).toString();
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  } else if (flat) {
    body = new URLSearchParams(flat).toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* not json */ }
  if (!res.ok) {
    const msg = json?.error?.message || `Stripe ${method} ${path} failed (${res.status})`;
    const err: any = new Error(msg);
    err.statusCode = res.status;
    err.raw = json?.error;
    throw err;
  }
  return json;
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e: any = error;
    if (e.raw?.message) return String(e.raw.message);
    if (e.message) return String(e.message);
  }
  return "Unknown payment error";
}

export function createStripeClient(env: StripeEnv) {
  return {
    customers: {
      search: (p: { query: string; limit?: number }) => call(env, "GET", "/v1/customers/search", p),
      list: (p: { email?: string; limit?: number }) => call(env, "GET", "/v1/customers", p),
      create: (p: any) => call(env, "POST", "/v1/customers", p),
      update: (id: string, p: any) => call(env, "POST", `/v1/customers/${id}`, p),
    },
    prices: {
      list: (p: { lookup_keys?: string[]; limit?: number; expand?: string[] }) =>
        call(env, "GET", "/v1/prices", p),
      retrieve: (id: string) => call(env, "GET", `/v1/prices/${id}`),
    },
    products: {
      retrieve: (id: string) => call(env, "GET", `/v1/products/${id}`),
    },
    checkout: {
      sessions: {
        create: (p: any) => call(env, "POST", "/v1/checkout/sessions", p),
        retrieve: (id: string) => call(env, "GET", `/v1/checkout/sessions/${id}`),
      },
    },
    billingPortal: {
      sessions: {
        create: (p: any) => call(env, "POST", "/v1/billing_portal/sessions", p),
      },
    },
    subscriptions: {
      retrieve: (id: string) => call(env, "GET", `/v1/subscriptions/${id}`),
    },
  };
}

// Webhook signature verification — HMAC-SHA256, no SDK dependency.
export async function verifyWebhook(
  req: Request,
  env: StripeEnv,
): Promise<{ type: string; data: { object: any } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = v;
    if (k === "v1") v1Signatures.push(v);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (!v1Signatures.includes(expected)) throw new Error("Invalid webhook signature");
  return JSON.parse(body);
}
