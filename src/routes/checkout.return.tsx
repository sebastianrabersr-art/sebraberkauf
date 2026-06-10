import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Zahlung abgeschlossen – kauf ma" }] }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const { refresh, subscription } = useAuth();

  useEffect(() => {
    if (!session_id) return;
    // Webhook updates the subscription async — poll for ~10s.
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      tries++;
      await refresh();
      if (cancelled) return;
      if (tries < 10) setTimeout(tick, 1000);
    };
    tick();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session_id]);

  if (!session_id) {
    return (
      <div className="max-w-md mx-auto p-10 text-center">
        <h1 className="text-xl font-semibold">Checkout abgebrochen</h1>
        <p className="text-muted-foreground text-sm mt-2">Keine Zahlung erfasst.</p>
        <Button asChild className="mt-4"><Link to="/settings">Zurück zu Einstellungen</Link></Button>
      </div>
    );
  }

  const upgraded = subscription?.plan && subscription.plan !== "free";

  return (
    <div className="max-w-md mx-auto p-10 text-center">
      <div className="size-14 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto">
        {upgraded ? <CheckCircle2 className="size-7" /> : <Loader2 className="size-7 animate-spin" />}
      </div>
      <h1 className="text-2xl font-bold mt-4">
        {upgraded ? "Zahlung erfolgreich" : "Zahlung wird verarbeitet…"}
      </h1>
      <p className="text-muted-foreground text-sm mt-2">
        {upgraded
          ? `Dein Plan wurde auf ${subscription?.plan === "premium" ? "Premium" : "Plus"} aktualisiert.`
          : "Wir bestätigen deine Zahlung. Das dauert nur ein paar Sekunden."}
      </p>
      <div className="flex gap-2 justify-center mt-6">
        <Button asChild><Link to="/dashboard">Zum Dashboard</Link></Button>
        <Button asChild variant="outline"><Link to="/settings">Einstellungen</Link></Button>
      </div>
    </div>
  );
}
