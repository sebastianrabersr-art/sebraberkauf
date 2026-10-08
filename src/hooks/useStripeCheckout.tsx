import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, ShieldCheck, Sparkle as Sparkles } from "@phosphor-icons/react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PLAN_PRICING, type Plan } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { PLAN_HIGHLIGHTS } from "@/lib/planFeatures";

type Interval = "monthly" | "yearly";
type PriceKey = `${Exclude<Plan, "free">}_${"monthly" | "yearly"}`;

interface CheckoutOptions {
  priceId: PriceKey | string;
  title?: string;
  returnUrl?: string;
}

const PLAN_FEATURES: Record<Exclude<Plan, "free">, string[]> = PLAN_HIGHLIGHTS;

function parsePriceKey(key: string): { plan: Exclude<Plan, "free">; interval: Interval } | null {
  const [plan, interval] = key.split("_") as [Exclude<Plan, "free">, Interval];
  if ((plan === "plus" || plan === "premium") && (interval === "monthly" || interval === "yearly")) {
    return { plan, interval };
  }
  return null;
}

export function useStripeCheckout() {
  const [opts, setOpts] = useState<CheckoutOptions | null>(null);
  const [step, setStep] = useState<"summary" | "pay">("summary");

  const openCheckout = useCallback((o: CheckoutOptions) => {
    const parsed = parsePriceKey(o.priceId);
    if (parsed) track("checkout_started", { plan: parsed.plan, interval: parsed.interval });
    setOpts(o);
    setStep("summary");
  }, []);
  const closeCheckout = useCallback(() => setOpts(null), []);

  const parsed = opts ? parsePriceKey(opts.priceId) : null;

  const checkoutDialog = (
    <Dialog open={!!opts} onOpenChange={(o) => !o && closeCheckout()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        {step === "summary" && parsed ? (
          <SummaryStep
            plan={parsed.plan}
            interval={parsed.interval}
            onContinue={() => setStep("pay")}
            onCancel={closeCheckout}
          />
        ) : (
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl">
                {opts?.title ?? "Sichere Zahlung"}
              </DialogTitle>
              <DialogDescription>
                Du wirst nicht weitergeleitet — die Zahlung läuft direkt hier ab.
              </DialogDescription>
            </DialogHeader>
            {opts && <StripeEmbeddedCheckout priceId={opts.priceId} returnUrl={opts.returnUrl} />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return { openCheckout, closeCheckout, checkoutDialog, isOpen: !!opts };
}

function SummaryStep({
  plan,
  interval,
  onContinue,
  onCancel,
}: {
  plan: Exclude<Plan, "free">;
  interval: Interval;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const price = interval === "monthly" ? PLAN_PRICING[plan].monthly : PLAN_PRICING[plan].yearly;
  const period = interval === "monthly" ? "Monat" : "Jahr";
  const planLabel = plan === "plus" ? "Plus" : "Premium";
  const monthlyEquivalent =
    interval === "yearly" ? (price / 12).toFixed(2).replace(".", ",") : null;
  const savings =
    interval === "yearly"
      ? Math.round(
          (1 - PLAN_PRICING[plan].yearly / (PLAN_PRICING[plan].monthly * 12)) * 100,
        )
      : 0;

  return (
    <div>
      <div className="p-6 pb-5 bg-gradient-to-br from-primary/5 via-background to-background border-b">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center">
              <Sparkles className="size-4" />
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Bestellübersicht
            </Badge>
          </div>
          <DialogTitle className="text-2xl">Upgrade auf {planLabel}</DialogTitle>
          <DialogDescription>
            Prüfe deine Auswahl. Du kannst jederzeit kündigen.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="p-6 space-y-5">
        <div className="rounded-xl border bg-card p-4 flex items-baseline justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">
              {planLabel} · {interval === "monthly" ? "Monatlich" : "Jährlich"}
            </div>
            <div className="text-3xl font-bold mt-1">
              {price.toString().replace(".", ",")} €
              <span className="text-sm text-muted-foreground font-normal"> / {period}</span>
            </div>
            {monthlyEquivalent && (
              <div className="text-xs text-muted-foreground mt-1">
                entspricht {monthlyEquivalent} € / Monat
              </div>
            )}
          </div>
          {savings > 0 && (
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-0">
              Spare {savings}%
            </Badge>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Enthalten
          </div>
          <ul className="space-y-2">
            {PLAN_FEATURES[plan].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="size-4 text-primary mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Sichere Zahlung über Stripe · Karte oder PayPal · jederzeit kündbar
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
          <Button variant="ghost" className="sm:flex-1" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button className="sm:flex-1" onClick={onContinue}>
            Weiter zur sicheren Zahlung
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
