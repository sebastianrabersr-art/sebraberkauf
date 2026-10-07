import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore, makeActivity, useActiveProject, VIEWING_CHECKLIST } from "@/lib/store";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/aktivitaeten")({
  head: () => ({ meta: [{ title: "Aktivitäten – kaufma CRM" }] }),
  component: AktivitaetenPage,
});

type TabKey = "followups" | "viewing";

function AktivitaetenPage() {
  const [tab, setTab] = useState<TabKey>("followups");
  return (
    <AppShell>
      <PageHeader
        title="Aktivitäten"
        description="Fällige Follow-ups und Besichtigungs-Checklisten an einem Ort."
      />
      <div className="flex gap-2 mb-6 border-b border-[#EAE6DF]">
        <TabBtn active={tab === "followups"} onClick={() => setTab("followups")}>Follow-ups</TabBtn>
        <TabBtn active={tab === "viewing"} onClick={() => setTab("viewing")}>Besichtigungen</TabBtn>
      </div>
      {tab === "followups" ? <FollowupsView /> : <ViewingView />}
    </AppShell>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-[13px] font-medium -mb-px border-b-2"
      style={{ borderColor: active ? "#2D6A4F" : "transparent", color: active ? "#1C1917" : "var(--ink-2)" }}
    >
      {children}
    </button>
  );
}

function FollowupsView() {
  const { properties, projects, updateProperty, addActivity } = useStore();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const rows = properties
    .filter((p) => !!p.nextActionDate)
    .map((p) => ({ p, dueIn: Math.round((new Date(p.nextActionDate!).getTime() - Date.now()) / 86400000), project: projects.find((x) => x.id === p.projectId) }))
    .sort((a, b) => a.dueIn - b.dueIn);

  return (
    <div className="rounded-xl border border-[#EAE6DF] bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#FAFAF8] text-left">
          <tr>{["Fällig", "Aktion", "Immobilie", "Projekt", "Verkäufer", "Priorität", ""].map((h) => <th key={h} className="py-2 px-3 text-xs uppercase text-ink-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(({ p, dueIn, project }) => (
            <tr key={p.id} className="border-t border-[#EAE6DF] hover:bg-[#FAFAF8] cursor-pointer" onClick={() => navigate({ to: "/properties/$id", params: { id: p.id } })}>
              <td className="py-2 px-3">
                <div>{p.nextActionDate}</div>
                <div className={`text-xs ${dueIn < 0 ? "text-[#DC2626]" : dueIn <= 2 ? "text-[#D97706]" : "text-ink-2"}`}>
                  {dueIn < 0 ? `überfällig ${-dueIn}d` : dueIn === 0 ? "heute" : `in ${dueIn} Tagen`}
                </div>
              </td>
              <td className="py-2 px-3">{p.nextAction || "—"}</td>
              <td className="py-2 px-3 font-medium">{p.title || "—"}<div className="text-xs text-ink-2">{p.bezirk}</div></td>
              <td className="py-2 px-3 text-xs">{project?.name ?? "—"}</td>
              <td className="py-2 px-3 text-xs">{p.sellerName || p.sellerCompany || "—"}</td>
              <td className="py-2 px-3 text-xs">{p.priority ?? "—"}</td>
              <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => {
                  addActivity(makeActivity({ propertyId: p.id, type: "Follow-up", title: p.nextAction || "Follow-up erledigt", completed: true }));
                  updateProperty(p.id, { nextAction: "", nextActionDate: "", lastContactDate: today });
                }} className="text-xs rounded border border-[#EAE6DF] px-2 py-1 hover:bg-[#FAFAF8]">Erledigt</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-ink-3">Keine offenen Follow-ups.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ViewingView() {
  const { properties, viewings, setViewing } = useStore();
  const project = useActiveProject();
  const inProject = properties.filter((p) => p.projectId === project.id);
  const [selected, setSelected] = useState<string>(inProject[0]?.id ?? "");
  const groups = useMemo(() => {
    const g: Record<string, typeof VIEWING_CHECKLIST> = {};
    VIEWING_CHECKLIST.forEach((c) => { (g[c.group] ??= []).push(c); });
    return g;
  }, []);
  const cur = viewings[selected]?.checks ?? {};
  const done = Object.values(cur).filter((c) => c.done).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-lg border border-[#EAE6DF] bg-white px-3 py-2 text-sm min-w-64">
          <option value="">Objekt wählen…</option>
          {inProject.map((p) => (<option key={p.id} value={p.id}>{p.title || p.link || p.id}</option>))}
        </select>
        {selected && (
          <>
            <span className="text-sm text-ink-2">{done} / {VIEWING_CHECKLIST.length} erledigt</span>
            <Link to="/properties/$id" params={{ id: selected }} className="text-sm text-[#2D6A4F] hover:underline">Zur Immobilie →</Link>
          </>
        )}
      </div>
      {selected && (
        <div className="space-y-4">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="rounded-xl border border-[#EAE6DF] bg-white p-4">
              <div className="text-xs uppercase tracking-wider text-ink-3 mb-2">{group}</div>
              <div className="space-y-2">
                {items.map((c) => {
                  const v = cur[c.key] ?? { done: false, note: "" };
                  return (
                    <div key={c.key} className="flex items-start gap-3">
                      <input type="checkbox" checked={v.done} onChange={(e) => setViewing(selected, c.key, { done: e.target.checked, note: v.note })} className="mt-1" />
                      <div className="flex-1">
                        <div className="text-sm">{c.label}</div>
                        <input value={v.note} onChange={(e) => setViewing(selected, c.key, { done: v.done, note: e.target.value })} placeholder="Notiz…" className="mt-1 w-full rounded border border-[#EAE6DF] bg-white px-2 py-1 text-xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
