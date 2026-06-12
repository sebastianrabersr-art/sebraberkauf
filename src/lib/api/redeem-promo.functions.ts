import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// =============================================================================
// MANUAL SUPABASE SETUP (run these in your Supabase SQL editor):
//
// -- 1) Promo codes table (managed manually, not via app UI):
// CREATE TABLE promo_codes (
//   code TEXT PRIMARY KEY,
//   plan TEXT NOT NULL,                  -- 'plus' or 'premium'
//   duration_months INTEGER NOT NULL,
//   max_uses INTEGER DEFAULT 1,
//   uses INTEGER DEFAULT 0,
//   expires_at TIMESTAMPTZ,
//   created_at TIMESTAMPTZ DEFAULT now()
// );
// GRANT ALL ON public.promo_codes TO service_role;
// ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
//
// -- 2) Add promo fields to subscriptions (used by getPlan/usePlan):
// ALTER TABLE public.subscriptions
//   ADD COLUMN IF NOT EXISTS promo_plan TEXT,
//   ADD COLUMN IF NOT EXISTS promo_expires_at TIMESTAMPTZ,
//   ADD COLUMN IF NOT EXISTS promo_code TEXT;
// =============================================================================

type RedeemResult =
  | { ok: true; plan: "plus" | "premium"; durationMonths: number }
  | { ok: false; error: string };

export const redeemPromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data, context }): Promise<RedeemResult> => {
    const code = data.code.trim().toUpperCase();
    const { userId } = context;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Look up code
    const { data: promo, error: lookupErr } = await db
      .from("promo_codes")
      .select("code, plan, duration_months, max_uses, uses, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (lookupErr || !promo) {
      return { ok: false, error: "Ungültiger oder bereits verwendeter Code" };
    }
    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
      return { ok: false, error: "Ungültiger oder bereits verwendeter Code" };
    }
    const maxUses: number = promo.max_uses ?? 1;
    const uses: number = promo.uses ?? 0;
    if (uses >= maxUses) {
      return { ok: false, error: "Ungültiger oder bereits verwendeter Code" };
    }
    if (promo.plan !== "plus" && promo.plan !== "premium") {
      return { ok: false, error: "Ungültiger oder bereits verwendeter Code" };
    }

    const durationMonths: number = promo.duration_months;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    // Upsert subscription row with promo fields. We keep the Stripe plan
    // column untouched; getPlan() prefers promo_plan while it's active.
    const { error: subErr } = await db
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          promo_plan: promo.plan,
          promo_expires_at: expiresAt.toISOString(),
          promo_code: code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (subErr) {
      return { ok: false, error: "Code konnte nicht eingelöst werden" };
    }

    // Increment uses counter (best-effort, conditional to avoid races)
    await db
      .from("promo_codes")
      .update({ uses: uses + 1 })
      .eq("code", code)
      .eq("uses", uses);

    return { ok: true, plan: promo.plan as "plus" | "premium", durationMonths };
  });
