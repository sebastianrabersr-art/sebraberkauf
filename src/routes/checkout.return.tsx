import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, planLabel } from "@/lib/auth";
import { track } from "@/lib/analytics";

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
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!session_id) return;
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      tries++;
      await refresh();
      if (cancelled) return;
      if (tries >= 12) { setTimedOut(true); return; }
      setTimeout(tick, 1000);
    };
    tick();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session_id]);

  // Abbruch / kein session_id
  if (!session_id) {
    return (
      <Shell>
        <div className="size-14 rounded-full bg-muted text-muted-foreground grid place-items-center mx-auto">
          <XCircle className="size-7" />
        </div>
        <h1 className="text-2xl font-bold mt-4">Checkout abgebrochen</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Keine Sorge — es wurde nichts abgebucht. Du kannst deinen Plan jederzeit neu auswählen.
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center mt-6">
          <Button asChild variant="outline"><Link to="/dashboard">Zum Dashboard</Link></Button>
          <Button asChild>
            <Link to="/settings">Plan erneut auswählen <ArrowRight className="size-4 ml-1" /></Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const upgraded = subscription?.plan && subscription.plan !== "free";

  useEffect(() => {
    if (upgraded) track("checkout_completed", { plan: subscription?.plan ?? null });
  }, [upgraded, subscription?.plan]);

  if (upgraded) {
    return (
      <Shell>
        <div className="size-14 rounded-full bg-primary/15 text-primary grid place-items-center mx-auto">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="text-2xl font-bold mt-4">Zahlung erfolgreich 🎉</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Willkommen im <strong>{planLabel(subscription?.plan)}</strong>-Plan. Alle Features sind sofort verfügbar.
        </p>
        <div className="mt-5 rounded-xl border bg-card p-4 text-left">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" /> Aktiver Plan: {planLabel(subscription?.plan)}
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center mt-6">
          <Button asChild variant="outline"><Link to="/settings">Einstellungen</Link></Button>
          <Button asChild>
            <Link to="/dashboard">Zur App <ArrowRight className="size-4 ml-1" /></Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (timedOut) {
    return (
      <Shell>
        <div className="size-14 rounded-full bg-muted text-muted-foreground grid place-items-center mx-auto">
          <Loader2 className="size-7" />
        </div>
        <h1 className="text-2xl font-bold mt-4">Zahlung wird noch verarbeitet</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Das dauert manchmal einen Moment. Lade die Seite gleich neu — dein Plan wird automatisch aktualisiert.
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center mt-6">
          <Button asChild variant="outline"><Link to="/dashboard">Zum Dashboard</Link></Button>
          <Button onClick={() => window.location.reload()}>Aktualisieren</Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="size-14 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto">
        <Loader2 className="size-7 animate-spin" />
      </div>
      <h1 className="text-2xl font-bold mt-4">Zahlung wird verarbeitet…</h1>
      <p className="text-muted-foreground text-sm mt-2">
        Wir bestätigen deine Zahlung. Das dauert nur ein paar Sekunden.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[80vh] grid place-items-center px-6">
      <div className="max-w-md w-full text-center bg-card border rounded-2xl p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
