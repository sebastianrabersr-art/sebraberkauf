import { useState } from "react";
import { Plus, Trash as Trash2, Check, Star, ArrowCounterClockwise as RotateCcw } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { OpenQuestion, OpenQuestionCategory, OpenQuestionStatus, Property } from "@/lib/types";
import { DEFAULT_OPEN_QUESTIONS } from "@/lib/calc";
import { useStore } from "@/lib/store";

const CATEGORIES: OpenQuestionCategory[] = ["Mietrecht", "Finanzierung", "Zustand", "Unterlagen", "Verkäufer", "Sonstiges"];
const STATUSES: OpenQuestionStatus[] = ["Offen", "Geklärt", "Nicht relevant"];

const CAT_TONE: Record<OpenQuestionCategory, string> = {
  Mietrecht: "bg-destructive/10 text-destructive border-destructive/30",
  Finanzierung: "bg-primary/10 text-primary border-primary/30",
  Zustand: "bg-warning/10 text-warning-foreground border-warning/30",
  Unterlagen: "bg-muted text-foreground border-muted-foreground/30",
  Verkäufer: "bg-accent text-accent-foreground border-accent",
  Sonstiges: "bg-muted text-muted-foreground border-muted-foreground/20",
};

const STATUS_TONE: Record<OpenQuestionStatus, string> = {
  Offen: "bg-warning/15 text-warning-foreground border-warning/40",
  Geklärt: "bg-success/15 text-success border-success/40",
  "Nicht relevant": "bg-muted text-muted-foreground border-muted-foreground/30",
};

export function OpenQuestionsPanel({ p }: { p: Property }) {
  const { updateProperty } = useStore();
  const list = p.openQuestions ?? [];
  const [newText, setNewText] = useState("");
  const [newCat, setNewCat] = useState<OpenQuestionCategory>("Sonstiges");

  const save = (next: OpenQuestion[]) => updateProperty(p.id, { openQuestions: next });

  const add = () => {
    if (!newText.trim()) return;
    const q: OpenQuestion = { id: crypto.randomUUID(), text: newText.trim(), category: newCat, status: "Offen", createdAt: new Date().toISOString() };
    save([...list, q]);
    setNewText("");
    toast.success("Frage hinzugefügt");
  };

  const loadDefaults = () => {
    const existing = new Set(list.map((q) => q.text.toLowerCase()));
    const toAdd = DEFAULT_OPEN_QUESTIONS
      .filter((d) => !existing.has(d.text.toLowerCase()))
      .map<OpenQuestion>((d) => ({ id: crypto.randomUUID(), text: d.text, category: d.category, status: "Offen", important: d.important, createdAt: new Date().toISOString() }));
    if (toAdd.length === 0) { toast.info("Alle Standardfragen bereits vorhanden"); return; }
    save([...list, ...toAdd]);
    toast.success(`${toAdd.length} Standardfragen hinzugefügt`);
  };

  const update = (id: string, patch: Partial<OpenQuestion>) =>
    save(list.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const remove = (id: string) => save(list.filter((q) => q.id !== id));

  const offen = list.filter((q) => q.status === "Offen").length;
  const geklaert = list.filter((q) => q.status === "Geklärt").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs text-muted-foreground">
          {list.length} Fragen · <span className="text-warning-foreground">{offen} offen</span> · <span className="text-success">{geklaert} geklärt</span>
        </div>
        <button onClick={loadDefaults} className="text-xs inline-flex items-center gap-1 border rounded-md px-2.5 py-1 hover:bg-accent">
          <RotateCcw className="size-3" /> Standardfragen laden
        </button>
      </div>

      <div className="grid grid-cols-[1fr_140px_auto] gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="Neue Frage…"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <select value={newCat} onChange={(e) => setNewCat(e.target.value as OpenQuestionCategory)} className="rounded-md border bg-background px-2 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={add} className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-2 hover:bg-accent">
          <Plus className="size-3.5" /> Hinzufügen
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">
          Noch keine Fragen. „Standardfragen laden" für die Vorlage nutzen.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((q) => {
            const done = q.status === "Geklärt";
            return (
              <li key={q.id} className={`rounded-md border p-2.5 ${done ? "bg-success/5 border-success/30" : q.status === "Nicht relevant" ? "bg-muted/40 opacity-70" : "bg-card"}`}>
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => update(q.id, { status: done ? "Offen" : "Geklärt" })}
                    title={done ? "Wieder öffnen" : "Als geklärt markieren"}
                    className={`mt-0.5 size-5 rounded border flex items-center justify-center ${done ? "bg-success text-success-foreground border-success" : "hover:bg-accent"}`}
                  >
                    {done && <Check className="size-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <input
                      value={q.text}
                      onChange={(e) => update(q.id, { text: e.target.value })}
                      className={`w-full bg-transparent text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring rounded px-1 ${done ? "line-through text-muted-foreground" : ""}`}
                    />
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <select value={q.category} onChange={(e) => update(q.id, { category: e.target.value as OpenQuestionCategory })} className={`text-[10px] rounded-full border px-1.5 py-0.5 ${CAT_TONE[q.category]}`}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={q.status} onChange={(e) => update(q.id, { status: e.target.value as OpenQuestionStatus })} className={`text-[10px] rounded-full border px-1.5 py-0.5 ${STATUS_TONE[q.status]}`}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={() => update(q.id, { important: !q.important })}
                        title="Als wichtig markieren"
                        className={`text-[10px] rounded-full border px-1.5 py-0.5 inline-flex items-center gap-1 ${q.important ? "bg-warning/20 text-warning-foreground border-warning/40" : "text-muted-foreground"}`}
                      >
                        <Star className={`size-2.5 ${q.important ? "fill-current" : ""}`} /> wichtig
                      </button>
                    </div>
                    <input
                      value={q.note ?? ""}
                      onChange={(e) => update(q.id, { note: e.target.value })}
                      placeholder="Notiz / Antwort…"
                      className="mt-1.5 w-full rounded border bg-background px-2 py-1 text-xs"
                    />
                  </div>
                  <button onClick={() => remove(q.id)} className="text-destructive p-1" title="Löschen">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Liefert die wichtigsten offenen Fragen (für Warnung in Investment Summary). */
export function getImportantOpenQuestions(p: Property): OpenQuestion[] {
  const list = p.openQuestions ?? [];
  return list.filter((q) => q.status === "Offen" && (q.important || q.category === "Mietrecht" || q.category === "Finanzierung"));
}
