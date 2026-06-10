import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook, createStripeClient } from "@/lib/stripe.server";
import { planFromPriceId, limitsForPlan } from "@/lib/plans";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function isoOrNull(unix: number | null | undefined): string | null {
  return unix ? new Date(unix * 1000).toISOString() : null;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("[webhook] subscription without userId metadata", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const lookupKey: string | null = item?.price?.lookup_key ?? null;
  const { plan, interval } = planFromPriceId(lookupKey);
  const limits = limitsForPlan(plan);
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const status: string = subscription.status;
  // For canceled subs, downgrade to free.
  const effectivePlan = status === "canceled" || status === "incomplete_expired" || status === "unpaid"
    ? "free"
    : plan;
  const effectiveLimits = limitsForPlan(effectivePlan);

  const admin = await getAdmin();
  const { error } = await admin
    .from("subscriptions")
    .update({
      plan: effectivePlan,
      property_limit: effectiveLimits.property_limit,
      project_limit: effectiveLimits.project_limit,
      subscription_status: status,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      price_id: lookupKey ?? item?.price?.id ?? null,
      product_id: typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id ?? null,
      billing_interval: interval,
      current_period_start: isoOrNull(periodStart),
      current_period_end: isoOrNull(periodEnd),
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      environment: env,
    } as any)
    .eq("user_id", userId);
  if (error) console.error("[webhook] update subscription failed", error);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  const admin = await getAdmin();
  await admin
    .from("subscriptions")
    .update({
      plan: "free",
      property_limit: 1,
      project_limit: 1,
      subscription_status: "canceled",
      cancel_at_period_end: false,
      billing_interval: null,
      price_id: null,
      product_id: null,
      stripe_subscription_id: null,
      current_period_end: isoOrNull(subscription.current_period_end),
      environment: env,
    } as any)
    .eq("user_id", userId);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const userId = session.metadata?.userId;
  if (!userId || !session.subscription) return;
  try {
    const stripe = createStripeClient(env);
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    // ensure metadata.userId is present (it should be, from subscription_data)
    if (!sub.metadata?.userId) sub.metadata = { ...(sub.metadata ?? {}), userId };
    await upsertSubscription(sub, env);
  } catch (e) {
    console.error("[webhook] checkout.session.completed retrieve failed", e);
  }
}

async function handleInvoiceFailed(invoice: any, env: StripeEnv) {
  if (!invoice?.subscription) return;
  const admin = await getAdmin();
  await admin
    .from("subscriptions")
    .update({ subscription_status: "past_due" })
    .eq("stripe_subscription_id", invoice.subscription)
    .eq("environment", env);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
              await handleCheckoutCompleted(event.data.object, env);
              break;
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await upsertSubscription(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(event.data.object, env);
              break;
            case "invoice.payment_failed":
              await handleInvoiceFailed(event.data.object, env);
              break;
            default:
              console.log("[webhook] unhandled", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
