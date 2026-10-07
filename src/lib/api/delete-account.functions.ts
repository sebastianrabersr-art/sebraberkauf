import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type DeleteAccountResult = { ok: true } | { ok: false; error: string };

const BILLING_ACTIVE = ["active", "trialing", "past_due"];

/**
 * Löscht das Konto des eingeloggten Nutzers endgültig.
 *
 * Alle Nutzertabellen (profiles, user_settings, subscriptions, projects, properties,
 * viewings, documents, activities) referenzieren auth.users mit ON DELETE CASCADE –
 * das Löschen des Auth-Users entfernt sie mit.
 *
 * Ein laufendes Stripe-Abo wird bewusst nicht automatisch gekündigt: Der Nutzer
 * muss es zuerst im Abo-Portal beenden, damit nichts weiter abgebucht wird.
 */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeleteAccountResult> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: sub } = await db
      .from("subscriptions")
      .select("plan, subscription_status")
      .eq("user_id", userId)
      .maybeSingle();
    if (sub && sub.plan && sub.plan !== "free" && BILLING_ACTIVE.includes(sub.subscription_status)) {
      return {
        ok: false,
        error: "Du hast noch ein laufendes Abo. Bitte kündige es zuerst über „Abo verwalten“ – danach kannst du dein Konto löschen.",
      };
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      return { ok: false, error: "Dein Konto konnte gerade nicht gelöscht werden. Bitte versuch es später noch einmal oder schreib uns an hallo@kaufma.eu." };
    }
    return { ok: true };
  });
