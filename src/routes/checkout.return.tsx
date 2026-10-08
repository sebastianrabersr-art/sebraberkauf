import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle as CheckCircle2, CircleNotch as Loader2, XCircle, ArrowRight, Sparkle as Sparkles } from "@phosphor-icons/react";
import { useAuth, planLabel } from "@/lib/auth";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Zahlung abgeschlossen – kaufma" }] }),
  component: CheckoutReturn,
});

const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-primary px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#235740] transition-colors";
const secondaryBtn =
  "inline-flex items-center justify-center rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1C1917] hover:border-[#1C1917] transition-colors";

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const { refresh, subscription } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const upgraded = !!subscription?.plan && subscription.plan !== "free";

  // Alle Hooks vor den bedingten Rückgaben (Hook-Reihenfolge bleibt stabil).
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

  useEffect(() => {
    if (session_id && upgraded) track("checkout_completed", { plan: subscription?.plan ?? null });
  }, [session_id, upgraded, subscription?.plan]);

  // Abbruch / kein session_id
  if (!session_id) {
    return (
      <Shell>
        <IconCircle tone="neutral"><XCircle className="size-7" aria-hidden /></IconCircle>
        <h1 className="heading-page-sm mt-4">Checkout abgebrochen</h1>
        <p className="text-ink-2 text-[14px] mt-2">
          Keine Sorge, es wurde nichts abgebucht. Du kannst deinen Plan jederzeit neu auswählen.
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center mt-6">
          <Link to="/dashboard" className={secondaryBtn}>Zum Dashboard</Link>
          <Link to="/pricing" className={primaryBtn}>Zu den Preisen <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      </Shell>
    );
  }

  if (upgraded) {
    return (
      <Shell>
        <IconCircle tone="good"><CheckCircle2 className="size-7" aria-hidden /></IconCircle>
        <h1 className="heading-page-sm mt-4">Zahlung erfolgreich</h1>
        <p className="text-ink-2 text-[14px] mt-2">
          Danke! Du bist jetzt im <strong className="text-[#1C1917]">{planLabel(subscription?.plan)}</strong>-Plan, alle Funktionen sind ab sofort freigeschaltet. Die Rechnung kommt per E-Mail.
        </p>
        <div className="mt-5 rounded-[12px] border border-[#EAE6DF] bg-[#FAFAF8] p-4 text-left">
          <div className="flex items-center gap-2 text-[14px] font-medium text-[#1C1917]">
            <Sparkles className="size-4 text-primary" aria-hidden /> Aktiver Plan: {planLabel(subscription?.plan)}
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center mt-6">
          <Link to="/settings" className={secondaryBtn}>Einstellungen</Link>
          <Link to="/dashboard" className={primaryBtn}>Zur App <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      </Shell>
    );
  }

  if (timedOut) {
    return (
      <Shell>
        <IconCircle tone="neutral"><Loader2 className="size-7" aria-hidden /></IconCircle>
        <h1 className="heading-page-sm mt-4">Zahlung wird noch verarbeitet</h1>
        <p className="text-ink-2 text-[14px] mt-2">
          Das dauert manchmal einen Moment. Lade die Seite gleich neu, dein Plan wird automatisch aktualisiert.
          Ist er nach ein paar Minuten noch nicht aktiv, schreib an hallo@kaufma.eu.
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center mt-6">
          <Link to="/dashboard" className={secondaryBtn}>Zum Dashboard</Link>
          <button type="button" onClick={() => window.location.reload()} className={primaryBtn}>Aktualisieren</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <IconCircle tone="good"><Loader2 className="size-7 animate-spin" aria-hidden /></IconCircle>
      <h1 className="heading-page-sm mt-4">Zahlung wird verarbeitet …</h1>
      <p className="text-ink-2 text-[14px] mt-2">
        Wir bestätigen deine Zahlung. Das dauert nur ein paar Sekunden.
      </p>
    </Shell>
  );
}

function IconCircle({ tone, children }: { tone: "good" | "neutral"; children: React.ReactNode }) {
  return (
    <div
      className="size-14 rounded-full grid place-items-center mx-auto"
      style={tone === "good" ? { background: "#E8F5EE", color: "#2D6A4F" } : { background: "#F5F3EE", color: "#78716C" }}
    >
      {children}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[80vh] grid place-items-center px-6 bg-[#F5F3EE]">
      <div className="max-w-md w-full text-center bg-white border border-[#EAE6DF] rounded-[16px] p-8">
        {children}
      </div>
    </div>
  );
}
