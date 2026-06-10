import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import type { Project, ProjectStatus } from "@/lib/types";
import { fmtEUR } from "@/lib/calc";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { planLimits, useAuth } from "@/lib/auth";
import { UpgradeDialog } from "@/components/UpgradeDialog";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projekte – Immo Invest" }] }),
  component: ProjectsPage,
});

const STATUSES: ProjectStatus[] = ["Aktiv", "Pausiert", "Abgeschlossen"];

function ProjectsPage() {
  const { projects, activeProjectId, addProject, updateProject, deleteProject, setActiveProject } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const { subscription } = useAuth();
  const limits = planLimits(subscription?.plan);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <AppShell>
      <PageHeader
        title="Projekte"
        description="Lege Investment-Projekte an und schalte zwischen ihnen um. Jedes Projekt hat eigene Annahmen."
        actions={
          <button
            onClick={() => {
              if (limits.projects != null && projects.length >= limits.projects) {
                setUpgradeOpen(true);
                return;
              }
              const p = addProject({ name: "Neues Projekt" });
              setEditingId(p.id);
              toast.success("Projekt erstellt.");
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-95"
          >
            <Plus className="size-4" /> Neues Projekt
          </button>
        }
      />

      <div className="grid md:grid-cols-2 gap-4">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            isActive={p.id === activeProjectId}
            isEditing={editingId === p.id}
            onActivate={() => { setActiveProject(p.id); toast.success(`„${p.name}" aktiv.`); }}
            onSave={(patch) => { updateProject(p.id, patch); setEditingId(null); toast.success("Gespeichert."); }}
            onEdit={() => setEditingId(p.id)}
            onCancel={() => setEditingId(null)}
            onDelete={() => {
              if (confirm(`Projekt „${p.name}" wirklich löschen? Alle Immobilien dieses Projekts werden ebenfalls gelöscht.`)) {
                deleteProject(p.id);
                toast.success("Projekt gelöscht.");
              }
            }}
          />
        ))}
      </div>
    </AppShell>
  );
}

function ProjectCard({
  project, isActive, isEditing, onActivate, onSave, onEdit, onCancel, onDelete,
}: {
  project: Project;
  isActive: boolean;
  isEditing: boolean;
  onActivate: () => void;
  onSave: (p: Partial<Project>) => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Project>(project);
  const { properties } = useStore();
  const count = properties.filter((x) => x.projectId === project.id).length;

  if (!isEditing) {
    return (
      <div className={`rounded-xl border bg-card p-5 ${isActive ? "ring-2 ring-primary" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{project.name}</h3>
              {isActive && <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">Aktiv</span>}
              <span className="text-[10px] uppercase tracking-wide bg-muted px-2 py-0.5 rounded-full">{project.status}</span>
            </div>
            {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
          </div>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
          <Info label="Ziel" value={project.investmentGoal || "—"} />
          <Info label="Standort" value={project.locationFocus || "—"} />
          <Info label="Budget" value={`${fmtEUR(project.budgetMin)} – ${fmtEUR(project.budgetMax)}`} />
          <Info label="Bezirke" value={project.preferredDistricts || "—"} />
          <Info label="EK" value={fmtEUR(project.assumptions.eigenkapital)} />
          <Info label="Zins/Laufzeit" value={`${(project.assumptions.zinssatz*100).toFixed(2)} % · ${project.assumptions.laufzeit} J`} />
          <Info label="Immobilien" value={String(count)} />
          <Info label="Erstellt" value={new Date(project.createdAt).toLocaleDateString("de-AT")} />
        </div>
        <div className="flex gap-2 mt-4">
          {!isActive && (
            <button onClick={onActivate} className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm">
              <Check className="size-4" /> Als aktiv setzen
            </button>
          )}
          <button onClick={onEdit} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Bearbeiten</button>
        </div>
      </div>
    );
  }

  const u = (patch: Partial<Project>) => setDraft({ ...draft, ...patch });
  const updateA = (patch: Partial<Project["assumptions"]>) => setDraft({ ...draft, assumptions: { ...draft.assumptions, ...patch } });

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold mb-3">Projekt bearbeiten</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Projektname" full><Txt value={draft.name} onChange={(v) => u({ name: v })} /></Field>
        <Field label="Beschreibung" full><Txt value={draft.description} onChange={(v) => u({ description: v })} /></Field>
        <Field label="Ziel der Investition"><Txt value={draft.investmentGoal} onChange={(v) => u({ investmentGoal: v })} /></Field>
        <Field label="Standort-Fokus"><Txt value={draft.locationFocus} onChange={(v) => u({ locationFocus: v })} /></Field>
        <Field label="Budget min €"><Num value={draft.budgetMin} onChange={(v) => u({ budgetMin: v })} /></Field>
        <Field label="Budget max €"><Num value={draft.budgetMax} onChange={(v) => u({ budgetMax: v })} /></Field>
        <Field label="Bevorzugte Größe min m²"><Num value={draft.preferredSizeMin} onChange={(v) => u({ preferredSizeMin: v })} /></Field>
        <Field label="Bevorzugte Größe max m²"><Num value={draft.preferredSizeMax} onChange={(v) => u({ preferredSizeMax: v })} /></Field>
        <Field label="Bevorzugte Bezirke/Lagen" full><Txt value={draft.preferredDistricts} onChange={(v) => u({ preferredDistricts: v })} /></Field>
        <Field label="Max. negativer Cashflow €/Monat"><Num value={draft.maxNegativeCashflow} onChange={(v) => u({ maxNegativeCashflow: v })} /></Field>
        <Field label="Status">
          <select value={draft.status} onChange={(e) => u({ status: e.target.value as ProjectStatus })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div className="col-span-2 border-t pt-3 mt-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Finanzierungs-Annahmen für dieses Projekt</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Eigenkapital €"><Num value={draft.assumptions.eigenkapital} onChange={(v) => updateA({ eigenkapital: v ?? 0 })} /></Field>
            <Field label="Zinssatz % p.a."><Num value={draft.assumptions.zinssatz * 100} onChange={(v) => updateA({ zinssatz: (v ?? 0) / 100 })} step={0.05} /></Field>
            <Field label="Laufzeit (Jahre)"><Num value={draft.assumptions.laufzeit} onChange={(v) => updateA({ laufzeit: v ?? 0 })} /></Field>
            <Field label="Ziel-Bruttorendite %"><Num value={draft.assumptions.zielBrutto * 100} onChange={(v) => updateA({ zielBrutto: (v ?? 0) / 100 })} step={0.1} /></Field>
            <Field label="Ziel-Nettorendite %"><Num value={draft.assumptions.zielNetto * 100} onChange={(v) => updateA({ zielNetto: (v ?? 0) / 100 })} step={0.1} /></Field>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(draft)} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Speichern</button>
        <button onClick={onCancel} className="rounded-md border px-4 py-2 text-sm">Abbrechen</button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-md px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
function Txt({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
function Num({ value, onChange, step }: { value: number | null | undefined; onChange: (v: number | null) => void; step?: number }) {
  return <input type="number" step={step} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
