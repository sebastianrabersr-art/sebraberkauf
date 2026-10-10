import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcProperty, fmtEUR } from "@/lib/calc";
import { migrateLegacyStatus, type ProzessStatus, type Property } from "@/lib/types";
import { isBought, promptAddToPortfolio, prozessStatusPatch } from "@/lib/statusSync";
import { PipelineCardMenu } from "@/components/pipeline/PipelineCardMenu";
import { ReminderButton } from "@/components/crm/ReminderButton";
import { Calendar, DotsSixVertical as GripVertical, Plus, CheckCircle as CheckCircle2, XCircle, X, MagnifyingGlass as Search } from "@phosphor-icons/react";

export const Route = createFileRoute("/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline – kaufma CRM" }] }),
  component: Pipeline,
});

const bricolage = { fontFamily: "'Bricolage Grotesque', sans-serif" } as const;

// "Gekauft" / "Abgelehnt" are exit lanes, not kanban columns.
const COLUMNS: ProzessStatus[] = ["Kontaktiert", "Besichtigung", "Finanzierung", "Angebot & Verhandlung"];
function getProzess(p: Property): ProzessStatus {
  return (p.prozessStatus ?? migrateLegacyStatus(p.status).prozessStatus) as ProzessStatus;
}

function Pipeline() {
  const navigate = useNavigate();
  const { properties, updateProperty } = useStore();
  const project = useActiveProject();
  const a = useActiveAssumptions();
  const [dragOverCol, setDragOverCol] = useState<ProzessStatus | null>(null);
  const [reminderFor, setReminderFor] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");

  const inProj = useMemo(() => project ? properties.filter((p) => p.projectId === project.id) : [], [properties, project?.id]);
  const boughtCount = inProj.filter((p) => getProzess(p) === "Gekauft" || p.status === "Gekauft").length;
  const rejectedCount = inProj.filter((p) => getProzess(p) === "Abgelehnt").length;

  // Candidates: in project, not in pipeline yet
  const candidates = useMemo(
    () => inProj.filter((p) => !p.prozessStatus && p.status !== "Gekauft")
      .filter((p) => {
        const q = addSearch.trim().toLowerCase();
        if (!q) return true;
        return (p.title ?? "").toLowerCase().includes(q) || (p.bezirk ?? "").toLowerCase().includes(q);
      }),
    [inProj, addSearch]
  );

  // Gleicher Status-Abgleich wie im CRM-Tab (src/lib/statusSync.ts).
  const setProzess = (id: string, ps: ProzessStatus) => {
    const p = properties.find((x) => x.id === id);
    if (!p) return;
    const wasBought = isBought(p);
    updateProperty(id, prozessStatusPatch(p, ps));
    if (ps === "Gekauft") {
      promptAddToPortfolio(p, wasBought, updateProperty, (pid) => navigate({ to: "/portfolio/$id", params: { id: pid } }));
    }
  };
  const addToPipeline = (id: string) => {
    const p = properties.find((x) => x.id === id);
    if (!p) return;
    updateProperty(id, { ...prozessStatusPatch(p, "Kontaktiert"), bewertung: "Interessant" });
    setShowAddModal(false);
  };
  useEffect(() => {
    if (!showAddModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAddModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAddModal]);

  const exitLane = (col: ProzessStatus, label: string, isOver: boolean) => (
    <div
      onDragOver={(e) => { e.preventDefault(); if (dragOverCol !== col) setDragOverCol(col); }}
      onDragLeave={() => setDragOverCol((c) => (c === col ? null : c))}
      onDrop={(e) => {
        setDragOverCol(null);
        const id = e.dataTransfer.getData("text/plain");
        if (id) setProzess(id, col);
      }}
      className="flex-1 rounded-[12px] p-[14px_16px]"
      style={{
        background: isOver ? (col === "Gekauft" ? "#E8F5EE" : "#FEE2E2") : "#FFFFFF",
        border: isOver
          ? `2px dashed ${col === "Gekauft" ? "#2D6A4F" : "#DC2626"}`
          : "1px dashed #D4CFC8",
      }}
    >
      <div className="flex items-center gap-2">
        {col === "Gekauft"
          ? <CheckCircle2 className="w-4 h-4 text-primary" />
          : <XCircle className="w-4 h-4 text-destructive" />}
        <div className="text-[13px] font-semibold text-[#1C1917]">{label}</div>
      </div>
      <div className="text-[12px] text-ink-3 mt-1">
        {col === "Gekauft" ? "Danach: ins Portfolio übernehmen" : "Archiviert"}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[12px] text-ink-2">
          {(col === "Gekauft" ? boughtCount : rejectedCount)} Objekte
        </span>
        {col === "Gekauft" && (
          <button
            onClick={() => navigate({ to: "/portfolio" })}
            className="text-[12px] text-primary hover:underline"
          >
            Meine Objekte öffnen →
          </button>
        )}
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="bg-[#F5F3EE] min-h-full">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="heading-page-sm">Pipeline</h1>
            <p className="text-[13px] text-ink-2 mt-1">Verfolge deine Immobilien durch den Kaufprozess</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#EAE6DF] bg-white px-3 py-2 text-[13px] font-medium text-[#1C1917] hover:bg-[#FAFAF8]"
          >
            <Plus className="w-4 h-4" />
            Aus Kaufkandidaten hinzufügen
          </button>
        </div>

        {/* Kanban */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = inProj.filter((p) => getProzess(p) === col);
            const isOver = dragOverCol === col;
            return (
              <div
                key={col}
                onDragOver={(e) => { e.preventDefault(); if (dragOverCol !== col) setDragOverCol(col); }}
                onDragLeave={() => setDragOverCol((c) => (c === col ? null : c))}
                onDrop={(e) => {
                  setDragOverCol(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) setProzess(id, col);
                }}
                className="shrink-0 rounded-[12px] p-[10px]"
                style={{
                  width: 240,
                  background: isOver ? "#E8F5EE" : "#EAE6DF",
                  border: isOver ? "2px dashed #2D6A4F" : "2px solid transparent",
                  minHeight: 200,
                }}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="text-[13px] font-semibold text-[#1C1917]">{col}</div>
                  <span className="text-[12px] font-semibold bg-primary text-white rounded-full px-2 py-0.5">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="rounded-[8px] border-[1.5px] border-dashed border-[#D4CFC8] bg-transparent p-4 text-center">
                      <div className="text-[12px] text-ink-3">Keine Objekte</div>
                      <div className="text-[12px] text-ink-3 mt-1">Ziehe Objekte hierher</div>
                    </div>
                  )}
                  {items.map((p) => {
                    const c = calcProperty(p, a);
                    const cashColor = c.cashflowMtl >= 0 ? "#2D6A4F" : "#DC2626";
                    const cashBg = c.cashflowMtl >= 0 ? "#E8F5EE" : "#FEE2E2";

                    const today = new Date().toISOString().slice(0, 10);
                    const due = p.nextActionDate;
                    const isOverdue = due && due < today;
                    const isToday = due === today;
                    const actionColor = isOverdue ? "#DC2626" : isToday ? "#B45309" : "#736C67";
                    const actionBg = isOverdue || isToday ? "#FEF3C7" : "transparent";

                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("[data-stop]")) return;
                          navigate({ to: "/properties/$id", params: { id: p.id } });
                        }}
                        className="group relative rounded-[12px] bg-white border border-[#EAE6DF] p-[12px_14px] cursor-pointer hover:border-primary transition-colors"
                      >
                        <GripVertical className="absolute left-0.5 top-3 w-3 h-3 text-[#D4CFC8] opacity-0 group-hover:opacity-100" />
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[13px] font-semibold text-[#1C1917] line-clamp-2 min-w-0">{p.title || "—"}</div>
                          <div className="relative shrink-0 -mr-1 -mt-0.5">
                            <PipelineCardMenu
                              title={p.title || "Objekt"}
                              status={col}
                              onOpen={() => navigate({ to: "/properties/$id", params: { id: p.id } })}
                              onStatus={(ps) => setProzess(p.id, ps)}
                              onReminder={() => setReminderFor(p.id)}
                              onRemove={() => updateProperty(p.id, prozessStatusPatch(p, ""))}
                            />
                            {reminderFor === p.id && (
                              <ReminderButton
                                propertyId={p.id}
                                suggestedNote={p.nextAction || undefined}
                                suggestedDate={p.nextActionDate || undefined}
                                anchorOnly
                                open
                                onOpenChange={(o) => { if (!o) setReminderFor(null); }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="text-[12px] text-ink-3 mt-1">{p.bezirk || "—"} · {fmtEUR(p.kaufpreis)}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[12px] px-1.5 py-0.5 rounded-[8px]" style={{ background: cashBg, color: cashColor }}>{fmtEUR(c.cashflowMtl)}/M</span>
                        </div>
                        {p.nextAction && (
                          <div className="mt-2 flex items-center gap-1 text-[12px]" style={{ background: actionBg, color: actionColor, padding: "4px 8px", borderRadius: 6 }}>
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span className="truncate">{p.nextAction}{due ? ` · ${due}` : ""}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Exit lanes */}
        <div className="flex gap-3 mt-2">
          {exitLane("Gekauft", "Gekauft", dragOverCol === "Gekauft")}
          {exitLane("Abgelehnt", "Abgelehnt", dragOverCol === "Abgelehnt")}
        </div>

        {/* Add modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
            <div onClick={(e) => e.stopPropagation()} className="rounded-[16px] bg-white border border-[#EAE6DF] w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[15px] font-semibold text-[#1C1917]" style={bricolage}>Aus Kaufkandidaten hinzufügen</div>
                <button onClick={() => setShowAddModal(false)} className="text-ink-3 hover:text-[#1C1917]"><X className="w-4 h-4" /></button>
              </div>
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Nach Titel oder Bezirk suchen…"
                  className="w-full pl-9 pr-3 py-[9px] text-[13px] border-[1.5px] border-[#EAE6DF] rounded-[8px] outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {candidates.length === 0 && (
                  <div className="text-[12px] text-ink-3 p-6 text-center">Keine Kandidaten gefunden.</div>
                )}
                {candidates.map((p) => {
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-[8px] hover:bg-[#FAFAF8]">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[#1C1917] truncate">{p.title || "—"}</div>
                        <div className="text-[12px] text-ink-3">{p.bezirk || "—"}</div>
                      </div>
                      <button
                        onClick={() => addToPipeline(p.id)}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-[8px] bg-primary text-white hover:bg-[#235740]"
                      >
                        Hinzufügen
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

