const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-[#FAFAF8] border-b border-[#EAE6DF] px-4 py-2 text-center text-[12px] text-[#A8A29E]">
        Zahlungen sind noch nicht konfiguriert. Schließe das Stripe-Onboarding ab, um echte Zahlungen zu akzeptieren.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-[#FAFAF8] border-b border-[#EAE6DF] px-4 py-2 text-center text-[12px] text-[#A8A29E]">
        Test-Modus: Alle Zahlungen in der Vorschau sind Stripe-Testzahlungen. Nutze 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
