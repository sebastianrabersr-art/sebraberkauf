const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-red-100 border-b border-red-300 px-4 py-2 text-center text-sm text-red-800">
        Zahlungen sind noch nicht konfiguriert. Schließe das Stripe-Onboarding ab, um echte Zahlungen zu akzeptieren.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
        Test-Modus: Alle Zahlungen in der Vorschau sind Stripe-Testzahlungen. Nutze 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
