import { useState } from "react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/types";
import { makeActivity, useStore } from "@/lib/store";
import { Check, Trash as Trash2 } from "@phosphor-icons/react";

export function ActivitiesPanel({ propertyId }: { propertyId: string }) {
  const { activities, addActivity, updateActivity, deleteActivity } = useStore();
  const { confirm } = useConfirmDialog();
  const items = activities
    .filter((a) => a.propertyId === propertyId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const [type, setType] = useState<ActivityType>("Telefonat");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const add = () => {
    if (!title.trim()) return;
    addActivity(makeActivity({ propertyId, type, title: title.trim(), description, dueDate: dueDate || undefined }));
    setTitle("");
    setDescription("");
    setDueDate("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border p-3 bg-background space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={type} onChange={(e) => setType(e.target.value as ActivityType)} className="rounded-md border bg-background px-2 py-1.5 text-sm">
            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel der Aktivität" className="rounded-md border bg-background px-2 py-1.5 text-sm md:col-span-2" />
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm" />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details / Gesprächsnotiz…" rows={2} className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
        <button onClick={add} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm">Aktivität hinzufügen</button>
      </div>

      {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Noch keine Aktivitäten.</div>}
      <ol className="relative border-l pl-4 space-y-3">
        {items.map((a) => (
          <li key={a.id} className="relative">
            <span className={`absolute -left-[21px] top-1.5 size-3 rounded-full border-2 ${a.completed ? "bg-success border-success" : "bg-background border-primary"}`} />
            <div className="rounded-md border p-3 bg-card text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{a.type}</span>
                    <span className="text-xs text-muted-foreground">{new Date(a.date).toLocaleString("de-AT")}</span>
                    {a.dueDate && <span className="text-xs text-warning-foreground">Fällig: {a.dueDate}</span>}
                  </div>
                  <div className={`font-medium ${a.completed ? "line-through text-muted-foreground" : ""}`}>{a.title}</div>
                  {a.description && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.description}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button title={a.completed ? "Als offen markieren" : "Erledigt"} onClick={() => updateActivity(a.id, { completed: !a.completed })} className="rounded border p-1 hover:bg-accent"><Check className="size-3.5" /></button>
                  <button title="Löschen" onClick={async () => { if (await confirm({ title: "Aktivität löschen", message: "Die Aktivität wird aus dem CRM-Verlauf dieser Immobilie entfernt.", confirmLabel: "Aktivität löschen", danger: true })) deleteActivity(a.id); }} className="rounded border p-1 hover:bg-destructive/10 text-destructive"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
