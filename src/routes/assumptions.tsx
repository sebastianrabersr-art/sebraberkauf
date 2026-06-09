import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useActiveProject, useStore } from "@/lib/store";
import { DEFAULT_ASSUMPTIONS } from "@/lib/calc";
import type { Assumptions } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/assumptions")({
  head: () => ({ meta: [{ title: "Annahmen – Immo Invest" }] }),
  component: AssumptionsPage,
});

const GROUPS: { title: string; fields: { key: keyof Assumptions; label: string; type: "eur" | "pct" | "num"; step?: number }[] }[] = [
  { title: "Kapital & Finanzierung", fields: [
    { key: "eigenkapital", label: "Verfügbares Eigenkapital", type: "eur" },
    { key: "zinssatz", label: "Zinssatz p.a.", type: "pct", step: 0.001 },
    { key: "laufzeit", label: "Laufzeit (Jahre)", type: "num" },
  ]},
  { title: "Kaufnebenkosten", fields: [
    { key: "nkOhneMakler", label: "Ohne Makler", type: "pct", step: 0.005 },
    { key: "nkMitMakler", label: "Mit Makler", type: "pct", step: 0.005 },
    { key: "nkKonservativ", label: "Konservativ (unklar)", type: "pct", step: 0.005 },
  ]},
  { title: "Betriebskosten & Puffer", fields: [
    { key: "leerstandPuffer", label: "Leerstandspuffer (% der Miete)", type: "pct", step: 0.005 },
    { key: "ruecklagePerM2", label: "Rücklage intern €/m²/Monat", type: "num", step: 0.05 },
    { key: "nichtUmlPerM2", label: "Nicht umlagefähig €/m²/Monat", type: "num", step: 0.05 },
  ]},
  { title: "Ziele", fields: [
    { key: "mindestScore", label: "Mindest-Score", type: "num" },
    { key: "zielBrutto", label: "Ziel-Bruttorendite", type: "pct", step: 0.001 },
    { key: "zielNetto", label: "Ziel-Nettorendite", type: "pct", step: 0.001 },
  ]},
  { title: "Stress-Test", fields: [
    { key: "zinsStress", label: "Zinsaufschlag Stress", type: "pct", step: 0.005 },
    { key: "leerstandStressMonate", label: "Leerstand Stress (Monate/Jahr)", type: "num" },
    { key: "reparaturStress", label: "Einmal-Reparatur Stress", type: "eur" },
  ]},
];

function AssumptionsPage() {
  const project = useActiveProject();
  const { updateProjectAssumptions, resetProjectAssumptions } = useStore();
  const a = project.assumptions;
  return (
    <AppShell>
      <PageHeader
        title="Annahmen"
        description={`Diese Werte gelten für das Projekt „${project.name}" und fließen in alle seine Berechnungen ein.`}
        actions={
          <div className="flex gap-2">
            <Link to="/projects" className="border rounded-md px-3 py-2 text-sm hover:bg-accent">Projekt-Übersicht</Link>
            <button onClick={() => { resetProjectAssumptions(project.id); toast.success("Annahmen zurückgesetzt."); }} className="border rounded-md px-3 py-2 text-sm hover:bg-accent">
              Auf Standard zurücksetzen
            </button>
          </div>
        }
      />
      <div className="grid md:grid-cols-2 gap-6">
        {GROUPS.map((g) => (
          <div key={g.title} className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-4">{g.title}</h3>
            <div className="space-y-3">
              {g.fields.map((f) => {
                const raw = a[f.key] as number;
                const display = f.type === "pct" ? raw * 100 : raw;
                return (
                  <label key={String(f.key)} className="flex items-center justify-between gap-3">
                    <span className="text-sm flex-1">{f.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={f.step ?? 1}
                        value={display}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          updateProjectAssumptions(project.id, { [f.key]: f.type === "pct" ? n / 100 : n } as Partial<Assumptions>);
                        }}
                        className="w-28 rounded-md border bg-background px-3 py-1.5 text-sm text-right"
                      />
                      <span className="text-xs text-muted-foreground w-6">{f.type === "eur" ? "€" : f.type === "pct" ? "%" : ""}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        Standard-Defaults aus deiner Excel: EK {DEFAULT_ASSUMPTIONS.eigenkapital.toLocaleString("de-AT")} €, Zins {(DEFAULT_ASSUMPTIONS.zinssatz * 100).toFixed(2)} %, Laufzeit {DEFAULT_ASSUMPTIONS.laufzeit} J.
      </p>
    </AppShell>
  );
}
