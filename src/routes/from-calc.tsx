import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { useActiveProject, useStore, makeEmptyProperty } from "@/lib/store";
import { calcToPropertyDraft, clearPendingCalc, getPendingCalc, type PendingCalc } from "@/lib/pendingCalc";
import { detectPlatform } from "@/lib/extract.functions";
import { fmtEUR } from "@/lib/calc";
import { toast } from "sonner";
import { ArrowRight, Calculator, Home } from "lucide-react";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/from-calc")({
  head: () => ({ meta: [{ title: "Berechnung übernehmen – kauf ma" }] }),
  component: FromCalcPage,
});

function FromCalcPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { addProperty } = useStore();
  const project = useActiveProject();
  const [calc, setCalc] = useState<PendingCalc | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const c = getPendingCalc();
    if (!c) { setMissing(true); return; }
    setCalc(c);
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/signup", search: { plan: "free" } });
    }
  }, [loading, session, navigate]);

  if (!session) return null;

  if (missing) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <h1 className="text-2xl font-semibold">Keine gespeicherte Berechnung gefunden</h1>
          <p className="text-muted-foreground text-sm">Öffne einen Rechner und speichere eine Berechnung, um sie hier zu übernehmen.</p>
          <button onClick={() => navigate({ to: "/rechner" })} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Zu den Rechnern</button>
        </div>
      </AppShell>
    );
  }

  if (!calc) return null;

  const draft = calcToPropertyDraft(calc);

  const createProperty = () => {
    const p = makeEmptyProperty({
      projectId: project.id,
      title: draft.title,
      link: "",
      platform: detectPlatform(""),
      extractionStatus: "manuell",
      kaufpreis: draft.kaufpreis,
      nettomieteMtl: draft.nettomieteMtl,
      nettomieteGeschaetzt: !!draft.nettomieteMtl,
      notizen: draft.notizen,
      status: "Interessant",
    });
    const wasFirst = useStore.getState().properties.filter((x) => !x.isDemo).length === 0;
    addProperty(p);
    clearPendingCalc();
    track("from_calc_property_created", { calc_type: calc.type });
    if (wasFirst) track("first_property_created", { source: "from_calc" });
    toast.success("Immobilie aus Berechnung angelegt.");
    navigate({ to: "/properties/$id", params: { id: p.id } });
  };

  const justOpenCalc = () => {
    clearPendingCalc();
    navigate({ to: "/rechner" });
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-12">
        <div className="rounded-2xl border bg-card p-8">
          <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4">
            <Calculator className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold">Möchtest du aus dieser Berechnung eine Immobilie erstellen?</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Deine Eingaben aus dem Rechner können wir direkt als Kaufkandidat anlegen – damit du sie vollständig analysieren kannst.
          </p>

          <div className="mt-6 rounded-xl border bg-muted/30 p-4 space-y-2">
            <div className="text-xs uppercase tracking-wide font-medium text-muted-foreground">Übernommen wird</div>
            <div className="text-sm font-medium">{draft.title}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {draft.kaufpreis != null && <Field label="Kaufpreis" value={fmtEUR(draft.kaufpreis)} />}
              {draft.nettomieteMtl != null && <Field label="Miete / Monat" value={fmtEUR(draft.nettomieteMtl)} />}
              <Field label="Rechner" value={calc.type} />
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <button onClick={createProperty} className="rounded-md bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:opacity-90 inline-flex items-center justify-center gap-1.5">
              <Home className="size-4" /> Ja, Immobilie erstellen <ArrowRight className="size-4" />
            </button>
            <button onClick={justOpenCalc} className="rounded-md border px-4 py-3 text-sm font-medium hover:bg-accent">
              Nein, nur Rechner öffnen
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}
