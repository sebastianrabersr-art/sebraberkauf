import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcProperty, fmtEUR } from "@/lib/calc";
import type { PropertyStatus } from "@/lib/types";

export const Route = createFileRoute("/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline – Immo Invest CRM" }] }),
  component: Pipeline,
});

const COLUMNS: { title: string; statuses: PropertyStatus[] }[] = [
  { title: "Neu", statuses: ["Neu", "Daten unvollständig"] },
  { title: "Prüfen", statuses: ["Prüfen"] },
  { title: "Interessant", statuses: ["Interessant"] },
  { title: "Kontaktiert", statuses: ["Verkäufer kontaktiert", "Antwort erhalten"] },
  { title: "Besichtigung", statuses: ["Besichtigung geplant", "Besichtigt", "Besichtigung"] },
  { title: "Finanzierung", statuses: ["Finanzierung prüfen", "Unterlagen angefragt"] },
  { title: "Angebot", statuses: ["Angebot vorbereitet", "Angebot abgegeben", "Angebot"] },
  { title: "Verhandlung", statuses: ["In Verhandlung"] },
  { title: "Entschieden", statuses: ["Gekauft", "Abgelehnt", "Verloren", "Zurückgestellt"] },
];

function Pipeline() {
  const navigate = useNavigate();
  const { properties, updateProperty } = useStore();
  const project = useActiveProject();
  const a = useActiveAssumptions();
  const inProj = properties.filter((p) => p.projectId === project.id);

  return (
    <AppShell>
      <PageHeader title="Pipeline" description={`${project.name} · ${inProj.length} Objekte · Karten per Drag & Drop verschieben.`} />
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = inProj.filter((p) => col.statuses.includes(p.status));
          return (
            <div key={col.title}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/plain");
                if (id) updateProperty(id, { status: col.statuses[0] });
              }}
              className="w-72 shrink-0 rounded-lg border bg-card flex flex-col">
              <div className="p-3 border-b flex items-center justify-between">
                <div className="text-sm font-semibold">{col.title}</div>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-32 max-h-[70vh] overflow-y-auto">
                {items.map((p) => {
                  const c = calcProperty(p, a);
                  return (
                    <div key={p.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                      onClick={() => navigate({ to: "/properties/$id", params: { id: p.id } })}
                      className="rounded border bg-background p-2 text-xs hover:shadow cursor-pointer">
                      <div className="font-medium truncate">{p.title || "—"}</div>
                      <div className="text-muted-foreground">{p.bezirk} · {fmtEUR(p.kaufpreis)} · {p.wohnflaecheM2 ?? "—"} m²</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={c.cashflowMtl >= 0 ? "text-success" : "text-destructive"}>{fmtEUR(c.cashflowMtl)}/M</span>
                        {p.priority && <span className="px-1.5 py-0.5 rounded bg-muted">{p.priority}</span>}
                      </div>
                      {p.nextAction && <div className="mt-1 text-[10px] text-muted-foreground truncate">→ {p.nextAction}{p.nextActionDate ? ` (${p.nextActionDate})` : ""}</div>}
                    </div>
                  );
                })}
                {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">leer</div>}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
