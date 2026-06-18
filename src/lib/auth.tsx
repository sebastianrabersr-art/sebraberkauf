import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";
import { initCloudSync, stopCloudSync } from "@/lib/cloud-sync";

export type Plan = "free" | "plus" | "premium";

export interface Subscription {
  plan: Plan;
  property_limit: number | null;
  project_limit: number | null;
  subscription_status: string;
  promo_plan?: Plan | null;
  promo_expires_at?: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  language: string;
  country: string;
  currency: string;
  onboarding_completed: boolean;
  marketing_opt_in: boolean;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, profile: null, subscription: null,
  loading: true, refresh: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = async (uid: string) => {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      (supabase.from("subscriptions") as any)
        .select("plan, property_limit, project_limit, subscription_status, promo_plan, promo_expires_at")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    setProfile(p as any);
    setSubscription(s as any);
  };

  useEffect(() => {
    // Sync listener first
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (event === "SIGNED_OUT") {
        setProfile(null); setSubscription(null);
        stopCloudSync();
        router.invalidate();
        return;
      }
      if (sess?.user && (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION")) {
        setTimeout(() => {
          fetchProfile(sess.user.id);
          initCloudSync(sess.user.id);
        }, 0);
        if (event === "SIGNED_IN") router.invalidate();
      }
    });
    // Then initial fetch
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        initCloudSync(data.session.user.id);
        fetchProfile(data.session.user.id).finally(() => setLoading(false));
      } else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSubscription(null);
    window.location.href = "/";
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, subscription, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

// Plan limits helpers
export function planLabel(p?: Plan | null) {
  if (p === "plus") return "Plus";
  if (p === "premium") return "Premium";
  return "Kostenlos";
}

export interface PlanCapabilities {
  properties: number | null;    // null = unlimited
  projects: number | null;      // null = unlimited
  compareLimit: number;         // 0 = none, 4 = plus, 10 = premium
  portfolio: boolean;
  pdfExport: boolean;
  kaufangebot: boolean;
  fixflip: boolean;
  excelImport: boolean;         // true for all plans
  crm: boolean;
  pipeline: boolean;
}

export function planLimits(plan: Plan | undefined | null): PlanCapabilities {
  if (plan === "plus") return {
    properties: 5,
    projects: 1,
    compareLimit: 4,
    portfolio: false,
    pdfExport: true,
    kaufangebot: false,
    fixflip: false,
    excelImport: true,
    crm: true,
    pipeline: true,
  };
  if (plan === "premium") return {
    properties: null,
    projects: null,
    compareLimit: 10,
    portfolio: true,
    pdfExport: true,
    kaufangebot: true,
    fixflip: true,
    excelImport: true,
    crm: true,
    pipeline: true,
  };
  // free
  return {
    properties: 1,
    projects: 1,
    compareLimit: 0,
    portfolio: false,
    pdfExport: false,
    kaufangebot: false,
    fixflip: false,
    excelImport: true,
    crm: true,
    pipeline: true,
  };
}

export const PLAN_PRICING = {
  free:    { monthly: 0,     yearly: 0      },
  plus:    { monthly: 9.99,  yearly: 99.99  },
  premium: { monthly: 29.99, yearly: 299.99 },
} as const;

export const PRICE_IDS = {
  plus_monthly: "price_1TjkUHLIFLGcw1KpQENTNcPz",
  plus_yearly: "price_1TjkVWLIFLGcw1KpWfejnxYj",
  premium_monthly: "price_1TjkZXLIFLGcw1KpXV0NiXb3",
  premium_yearly: "price_1TjkYzLIFLGcw1Kpwt98P8jD",
} as const;

/**
 * Resolves the effective plan for a subscription row.
 * Promo plan wins while promo_expires_at is in the future; otherwise the
 * Stripe-managed `plan` column is used.
 */
export function getPlan(sub: Subscription | null | undefined): Plan {
  if (sub?.promo_plan && sub.promo_expires_at) {
    const exp = new Date(sub.promo_expires_at).getTime();
    if (Number.isFinite(exp) && exp > Date.now()) {
      return sub.promo_plan;
    }
  }
  return (sub?.plan as Plan) ?? "free";
}

export function usePlan(): Plan {
  const { subscription } = useAuth();
  return getPlan(subscription);
}
