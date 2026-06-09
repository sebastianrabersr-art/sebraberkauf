import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore, VIEWING_CHECKLIST } from "@/lib/store";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/viewing")({
  head: () => ({ meta: [{ title: "Besichtigungs-Checkliste – Immo Invest" }] }),
  component: ViewingPage,
});

function ViewingPage() {
  const { properties, viewings, setViewing } = useStore();
  const [selected, setSelected] = useState<string>(properties[0]?.id ?? "");

  const groups = useMemo(() => {
    const g: Record<string, typeof VIEWING_CHECKLIST> = {};
    VIEWING_CHECKLIST.forEach((c) => { (g[c.group] ??= []).push(c); });
    return g;
  }, []);

  const cur = viewings[selected]?.checks ?? {};
  const done = Object.values(cur).filter((c) => c.done).length;

  return (
    <AppShell>
      <PageHeader title="Besichtigungs-Checkliste" description="Punkte abhaken und Notizen ergänzen – pro Objekt." />
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm min-w-64"
        >
          <option value="">Objekt wählen…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.title || p.link || p.id}</option>
          ))}
        </select>
        {selected && (
          <span className="text-sm text-muted-foreground">
            {done} / {VIEWING_CHECKLIST.length} erledigt
          </span>
        )}
      </div>

      {!selected ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          Bitte zuerst ein Objekt wählen.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold mb-3">{group}</h3>
              <div className="space-y-3">
                {items.map((item) => {
                  const v = cur[item.key] ?? { done: false, note: "" };
                  return (
                    <div key={item.key} className="border-b last:border-0 pb-3 last:pb-0">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={v.done}
                          onChange={(e) => setViewing(selected, item.key, { done: e.target.checked })}
                        />
                        {item.label}
                      </label>
                      <input
                        type="text"
                        placeholder="Notiz…"
                        value={v.note}
                        onChange={(e) => setViewing(selected, item.key, { note: e.target.value })}
                        className="mt-2 w-full rounded border bg-background px-2 py-1.5 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
