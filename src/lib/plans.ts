// Shared plan/price mapping (safe for client + server).
export type PlanId = "free" | "plus" | "premium";
export type PriceId = "plus_monthly" | "plus_yearly" | "premium_monthly" | "premium_yearly";

export const PRICE_TO_PLAN: Record<PriceId, { plan: PlanId; interval: "month" | "year" }> = {
  plus_monthly: { plan: "plus", interval: "month" },
  plus_yearly: { plan: "plus", interval: "year" },
  premium_monthly: { plan: "premium", interval: "month" },
  premium_yearly: { plan: "premium", interval: "year" },
};

// Raw Stripe Price IDs (live) — no lookup_key set on these
const RAW_PRICE_MAP: Record<string, { plan: PlanId; interval: "month" | "year" }> = {
  "price_1TjkUHLIFLGcw1KpQENTNcPz": { plan: "plus",    interval: "month" },
  "price_1TjkVWLIFLGcw1KpWfejnxYj": { plan: "plus",    interval: "year"  },
  "price_1TjkZXLIFLGcw1KpXV0NiXb3": { plan: "premium", interval: "month" },
  "price_1TjkYzLIFLGcw1Kpwt98P8jD": { plan: "premium", interval: "year"  },
};

export function planFromPriceId(priceId: string | null | undefined): { plan: PlanId; interval: "month" | "year" | null } {
  if (!priceId) return { plan: "free", interval: null };
  // Check lookup key mapping first
  if (priceId in PRICE_TO_PLAN) {
    const m = PRICE_TO_PLAN[priceId as PriceId];
    return { plan: m.plan, interval: m.interval };
  }
  // Check raw live price ID mapping
  if (priceId in RAW_PRICE_MAP) {
    const m = RAW_PRICE_MAP[priceId];
    return { plan: m.plan, interval: m.interval };
  }
  return { plan: "free", interval: null };
}

export function limitsForPlan(plan: PlanId): { property_limit: number | null; project_limit: number | null } {
  if (plan === "plus") return { property_limit: 5, project_limit: 1 };
  if (plan === "premium") return { property_limit: null, project_limit: null };
  return { property_limit: 1, project_limit: 1 };
}
