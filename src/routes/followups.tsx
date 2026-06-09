import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore, makeActivity } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/followups")({
  head: () => ({ meta: [{ title: "Follow-ups – Immo Invest CRM" }] }),
  component: FollowupsPage,
});

function FollowupsPage() {
  const { properties, projects, updateProperty, addActivity } = useStore();
  const [scopeAll, setScopeAll] = useState(true);
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const rows = properties
    .filter((p) => !!p.nextActionDate)
    .map((p) => ({ p, dueIn: Math.round((new Date(p.nextActionDate!).getTime() - Date.now()) / 86400000), project: projects.find((x) => x.id === p.projectId) }))
    .sort((a, b) => a.dueIn - b.dueIn);

  return (
    <AppShell>
      <PageHeader title="Fällige Follow-ups" description={`${rows.length} offene Aufgaben.`} />
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>{["Fällig", "Aktion", "Immobilie", "Projekt", "Verkäufer", "Priorität", ""].map((h) => <th key={h} className="py-2 px-3 text-xs uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(({ p, dueIn, project }) => (
              <tr key={p.id} className="border-t hover:bg-accent/30 cursor-pointer" onClick={() => navigate({ to: "/properties/$id", params: { id: p.id } })}>
                <td className="py-2 px-3">
                  <div>{p.nextActionDate}</div>
                  <div className={`text-xs ${dueIn < 0 ? "text-destructive" : dueIn <= 2 ? "text-warning-foreground" : "text-muted-foreground"}`}>
                    {dueIn < 0 ? `überfällig ${-dueIn}d` : dueIn === 0 ? "heute" : `in ${dueIn} Tagen`}
                  </div>
                </td>
                <td className="py-2 px-3">{p.nextAction || "—"}</td>
                <td className="py-2 px-3 font-medium">{p.title || "—"}<div className="text-xs text-muted-foreground">{p.bezirk}</div></td>
                <td className="py-2 px-3 text-xs">{project?.name ?? "—"}</td>
                <td className="py-2 px-3 text-xs">{p.sellerName || p.sellerCompany || "—"}</td>
                <td className="py-2 px-3 text-xs">{p.priority ?? "—"}</td>
                <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => {
                    addActivity(makeActivity({ propertyId: p.id, type: "Follow-up", title: p.nextAction || "Follow-up erledigt", completed: true }));
                    updateProperty(p.id, { nextAction: "", nextActionDate: "", lastContactDate: today });
                  }} className="text-xs rounded border px-2 py-1 hover:bg-accent">Erledigt</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Keine offenen Follow-ups – setze eine „nächste Aktion" auf einer Immobilien-Detailseite.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-4">Follow-ups werden pro Immobilie über das Feld „nächste Aktion + Datum" gesetzt.</p>
    </AppShell>
  );
}
