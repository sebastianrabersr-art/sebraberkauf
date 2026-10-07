import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { CircleNotch as Loader2, ShieldCheck, WarningCircle as AlertCircle } from "@phosphor-icons/react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";
import { Button } from "@/components/ui/button";

interface Props {
  priceId: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ priceId, returnUrl }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Reset ready/error when retrying
  useEffect(() => { setReady(false); setError(null); }, [reloadKey, priceId]);

  const fetchClientSecret = async (): Promise<string> => {
    try {
      const result = await createCheckoutSession({
        data: {
          priceId,
          returnUrl: returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("Stripe lieferte keinen Client-Secret.");
      setReady(true);
      return result.clientSecret;
    } catch (e: any) {
      const msg = e?.message ?? "Zahlung konnte nicht gestartet werden.";
      setError(msg);
      throw e;
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm">
        <div className="flex gap-2 items-start">
          <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-destructive">Zahlung konnte nicht gestartet werden</div>
            <div className="text-muted-foreground mt-1">{error}</div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setReloadKey((k) => k + 1)}>
              Erneut versuchen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative min-h-[520px] rounded-lg overflow-hidden border bg-background">
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground bg-background z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Sichere Zahlung wird vorbereitet…</span>
            </div>
          </div>
        )}
        <EmbeddedCheckoutProvider key={reloadKey} stripe={getStripe()} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        Sichere Zahlung über Stripe · Karte oder PayPal
      </div>
    </div>
  );
}
