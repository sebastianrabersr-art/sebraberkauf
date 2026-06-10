// Shared plan/price mapping (safe for client + server).
export type PlanId = "free" | "plus" | "premium";
export type PriceId = "plus_monthly" | "plus_yearly" | "premium_monthly" | "premium_yearly";

export const PRICE_TO_PLAN: Record<PriceId, { plan: PlanId; interval: "month" | "year" }> = {
  plus_monthly: { plan: "plus", interval: "month" },
  plus_yearly: { plan: "plus", interval: "year" },
  premium_monthly: { plan: "premium", interval: "month" },
  premium_yearly: { plan: "premium", interval: "year" },
};

export function planFromPriceId(priceId: string | null | undefined): { plan: PlanId; interval: "month" | "year" | null } {
  if (priceId && priceId in PRICE_TO_PLAN) {
    const m = PRICE_TO_PLAN[priceId as PriceId];
    return { plan: m.plan, interval: m.interval };
  }
  return { plan: "free", interval: null };
}

export function limitsForPlan(plan: PlanId): { property_limit: number | null; project_limit: number | null } {
  if (plan === "plus") return { property_limit: 5, project_limit: 1 };
  if (plan === "premium") return { property_limit: null, project_limit: null };
  return { property_limit: 1, project_limit: 1 };
}
