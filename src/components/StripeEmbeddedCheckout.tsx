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
      // Technische Details nur in die Konsole – die Person bekommt eine verständliche Meldung.
      console.error("Stripe-Checkout:", e);
      setError("Die Zahlungsseite konnte gerade nicht geladen werden. Es wurde nichts abgebucht.");
      throw e;
    }
  };

  if (error) {
    return (
      <div className="rounded-[12px] p-5 text-[13px]" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
        <div className="flex gap-2.5 items-start">
          <AlertCircle className="size-4 mt-0.5 shrink-0" style={{ color: "#D97706" }} aria-hidden />
          <div className="flex-1">
            <div className="font-semibold text-[#9A3412]">Zahlung konnte nicht gestartet werden</div>
            <div className="text-[#9A3412] mt-1">{error} Prüf kurz deine Verbindung und versuch es noch einmal. Klappt es weiterhin nicht, schreib an hallo@kaufma.eu.</div>
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
      <div className="relative min-h-[520px] rounded-[12px] overflow-hidden border border-[#EAE6DF] bg-white">
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-[13px] text-ink-2 bg-white z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
              <span>Sichere Zahlung wird vorbereitet …</span>
            </div>
          </div>
        )}
        <EmbeddedCheckoutProvider key={reloadKey} stripe={getStripe()} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
      <div className="flex items-center justify-center gap-1.5 text-[12px] text-ink-2">
        <ShieldCheck className="size-3.5 text-primary" aria-hidden />
        Sichere Zahlung über Stripe, mit Karte oder PayPal
      </div>
    </div>
  );
}
