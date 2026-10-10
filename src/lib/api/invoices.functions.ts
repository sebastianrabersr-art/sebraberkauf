import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";
import { planFromPriceId } from "@/lib/plans";

export type InvoiceRow = {
  id: string;
  number: string | null;
  /** Unix-Sekunden (Stripe `created`). */
  created: number;
  amountPaid: number; // in Cent
  currency: string;
  status: string;
  plan: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
};

export type InvoicesResult = { ok: true; invoices: InvoiceRow[] } | { ok: false; error: string };

/** Plan aus der ersten Rechnungsposition – alte (price) und neue (pricing) Stripe-API. */
function planLabelFromLine(line: any): string {
  const price = line?.price ?? null;
  const ref = price?.lookup_key ?? price?.id ?? line?.pricing?.price_details?.price ?? null;
  const { plan, interval } = planFromPriceId(ref);
  if (plan === "free") return line?.description ?? "–";
  const name = plan === "plus" ? "Plus" : "Premium";
  return interval === "year" ? `${name} jährlich` : interval === "month" ? `${name} monatlich` : name;
}

/**
 * Rechnungen der eingeloggten Person aus Stripe.
 * Die Kunden-ID kommt ausschließlich aus der eigenen subscriptions-Zeile (RLS + userId aus dem Token),
 * nie vom Client – so sieht niemand fremde Rechnungen.
 */
export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => {
    if (data.environment !== "live" && data.environment !== "sandbox") throw new Error("Invalid environment");
    return data;
  })
  .handler(async ({ data, context }): Promise<InvoicesResult> => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .maybeSingle();
    const customer = sub?.stripe_customer_id as string | undefined;
    if (!customer) return { ok: true, invoices: [] };

    try {
      const stripe = createStripeClient(data.environment);
      const res = await stripe.invoices.list({ customer, limit: 48 });
      const invoices: InvoiceRow[] = (res.data ?? [])
        .filter((inv: any) => inv.status !== "draft")
        .map((inv: any) => ({
          id: inv.id,
          number: inv.number ?? null,
          created: inv.created,
          amountPaid: inv.amount_paid ?? 0,
          currency: inv.currency ?? "eur",
          status: inv.status ?? "open",
          plan: planLabelFromLine(inv.lines?.data?.[0]),
          hostedUrl: inv.hosted_invoice_url ?? null,
          pdfUrl: inv.invoice_pdf ?? null,
        }));
      return { ok: true, invoices };
    } catch (error) {
      console.error("[invoices] Stripe-Abfrage fehlgeschlagen", error);
      return { ok: false, error: "Die Rechnungen konnten gerade nicht geladen werden." };
    }
  });
