import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcProperty, fmtEUR } from "@/lib/calc";
import { migrateLegacyStatus, type Bewertung, type ProzessStatus, type Property } from "@/lib/types";
import { MoreHorizontal, Phone, Mail, Calendar, GripVertical } from "lucide-react";

export const Route = createFileRoute("/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline – Immo Invest CRM" }] }),
  component: Pipeline,
});

const bricolage = { fontFamily: "'Bricolage Grotesque', sans-serif" } as const;

const COLUMNS: ProzessStatus[] = ["Kontaktiert", "Besichtigung", "Finanzierung", "Angebot & Verhandlung", "Gekauft", "Abgelehnt"];
const BEWERTUNG_FILTERS: ("Alle" | Bewertung)[] = ["Alle", "Interessant", "Prüfen", "Neu", "Nicht interessant"];

function getBewertung(p: Property): Bewertung {
  return p.bewertung ?? migrateLegacyStatus(p.status).bewertung;
}
function getProzess(p: Property): ProzessStatus {
  return (p.prozessStatus ?? migrateLegacyStatus(p.status).prozessStatus) as ProzessStatus;
}

const BEWERTUNG_STYLE: Record<Bewertung, { bg: string; fg: string }> = {
  "Interessant": { bg: "#E8F5EE", fg: "#2D6A4F" },
  "Prüfen": { bg: "#FEF3C7", fg: "#92400E" },
  "Neu": { bg: "#F5F3EE", fg: "#78716C" },
  "Nicht interessant": { bg: "#FEE2E2", fg: "#991B1B" },
};

function Pipeline() {
  const navigate = useNavigate();
  const { properties, updateProperty } = useStore();
  const project = useActiveProject();
  const a = useActiveAssumptions();
  const [filter, setFilter] = useState<"Alle" | Bewertung>("Interessant");
  const [dragOverCol, setDragOverCol] = useState<ProzessStatus | null>(null);
  const [unassignedOpen, setUnassignedOpen] = useState(true);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const inProj = useMemo(() => properties.filter((p) => p.projectId === project.id), [properties, project.id]);
  const filtered = useMemo(
    () => (filter === "Alle" ? inProj : inProj.filter((p) => getBewertung(p) === filter)),
    [inProj, filter]
  );
  const unassigned = filtered.filter((p) => !getProzess(p));

  const setBewertung = (id: string, b: Bewertung) => updateProperty(id, { bewertung: b });
  const setProzess = (id: string, ps: ProzessStatus) => updateProperty(id, { prozessStatus: ps });

  return (
    <AppShell>
      <div className="bg-[#F5F3EE] min-h-full -m-6 p-6">
        <div className="mb-5">
          <h1 className="text-[28px] text-[#1C1917]" style={{ ...bricolage, fontWeight: 800, letterSpacing: "-0.03em" }}>Pipeline</h1>
          <p className="text-[13px] text-[#78716C] mt-1">Verfolge deine Immobilien durch den Kaufprozess</p>
        </div>

        {/* Bewertung filter */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[12px] text-[#78716C] mr-1">Bewertung:</span>
          {BEWERTUNG_FILTERS.map((b) => {
            const active = filter === b;
            const count = b === "Alle" ? inProj.length : inProj.filter((p) => getBewertung(p) === b).length;
            return (
              <button
                key={b}
                onClick={() => setFilter(b)}
                className="rounded-[20px] px-3 py-[5px] text-[12px] transition-colors"
                style={{
                  background: active ? "#2D6A4F" : "#F5F3EE",
                  color: active ? "#FFFFFF" : "#78716C",
                  border: active ? "1px solid #2D6A4F" : "1px solid #EAE6DF",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {b} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Unassigned */}
        <div className="mb-5">
          <button
            onClick={() => setUnassignedOpen((v) => !v)}
            className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-2 flex items-center gap-1"
          >
            Noch nicht im Prozess <span className="text-[#D4CFC8]">({unassigned.length})</span>
            <span className="ml-1">{unassignedOpen ? "▾" : "▸"}</span>
          </button>
          {unassignedOpen && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {unassigned.length === 0 && (
                <div className="text-[12px] text-[#A8A29E] py-3">Keine offenen Objekte für diese Bewertung.</div>
              )}
              {unassigned.map((p) => {
                const bw = getBewertung(p);
                const st = BEWERTUNG_STYLE[bw];
                return (
                  <div key={p.id} className="shrink-0 w-[180px] rounded-[8px] bg-white border border-[#EAE6DF] p-[10px_12px]">
                    <div className="text-[12px] font-semibold text-[#1C1917] truncate">{p.title || "—"}</div>
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.fg }}>{bw}</span>
                    <button
                      onClick={() => setProzess(p.id, "Kontaktiert")}
                      className="block mt-2 text-[11px] text-[#2D6A4F] hover:underline"
                    >
                      + In Prozess aufnehmen
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kanban */}
        <div className="flex gap-3 overflow-x-auto pb-6">
          {COLUMNS.map((col) => {
            const items = filtered.filter((p) => getProzess(p) === col);
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
                className="shrink-0 rounded-[10px] p-[10px]"
                style={{
                  width: 220,
                  background: isOver ? "#E8F5EE" : "#EAE6DF",
                  border: isOver ? "2px dashed #2D6A4F" : "2px solid transparent",
                  minHeight: 200,
                }}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="text-[13px] font-semibold text-[#1C1917]">{col}</div>
                  <span className="text-[11px] font-semibold bg-[#2D6A4F] text-white rounded-[20px] px-2 py-0.5">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="rounded-[8px] border-[1.5px] border-dashed border-[#D4CFC8] bg-transparent p-4 text-center">
                      <div className="text-[12px] text-[#A8A29E]">Keine Objekte</div>
                      <div className="text-[11px] text-[#A8A29E] mt-1">Ziehe Objekte hierher oder setze den Status im CRM-Tab</div>
                    </div>
                  )}
                  {items.map((p) => {
                    const c = calcProperty(p, a);
                    const bw = getBewertung(p);
                    const st = BEWERTUNG_STYLE[bw];
                    const score = (p.scoreLage ?? 0) + (p.scoreVermietbarkeit ?? 0) + (p.scoreZustand ?? 0) + (p.scoreRecht ?? 0) + (p.scoreWiederverkauf ?? 0);
                    const scoreColor = score >= 70 ? "#2D6A4F" : score >= 40 ? "#D97706" : "#DC2626";
                    const cashColor = c.cashflowMtl >= 0 ? "#2D6A4F" : "#DC2626";
                    const cashBg = c.cashflowMtl >= 0 ? "#E8F5EE" : "#FEE2E2";

                    const today = new Date().toISOString().slice(0, 10);
                    const due = p.nextActionDate;
                    const isOverdue = due && due < today;
                    const isToday = due === today;
                    const actionColor = isOverdue ? "#DC2626" : isToday ? "#D97706" : "#A8A29E";
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
                        className="group relative rounded-[10px] bg-white border border-[#EAE6DF] p-[12px_14px] cursor-pointer hover:border-[#2D6A4F] transition-colors"
                      >
                        <GripVertical className="absolute left-0.5 top-3 w-3 h-3 text-[#D4CFC8] opacity-0 group-hover:opacity-100" />
                        <div className="flex items-start justify-between gap-2">
                          <button
                            data-stop
                            onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === p.id ? null : p.id); }}
                            className="opacity-0 group-hover:opacity-100 text-[#A8A29E] hover:text-[#1C1917]"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.fg }}>{bw}</span>
                        </div>
                        {menuFor === p.id && (
                          <div data-stop className="absolute z-20 left-2 top-7 bg-white border border-[#EAE6DF] rounded-[8px] py-1 text-[12px] min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                            {(["Interessant", "Prüfen", "Nicht interessant"] as Bewertung[]).map((b) => (
                              <button key={b} onClick={() => { setBewertung(p.id, b); setMenuFor(null); }} className="block w-full text-left px-3 py-1.5 hover:bg-[#FAFAF8]">Als {b} markieren</button>
                            ))}
                            <div className="border-t border-[#EAE6DF] my-1" />
                            <button onClick={() => navigate({ to: "/properties/$id", params: { id: p.id } })} className="block w-full text-left px-3 py-1.5 hover:bg-[#FAFAF8]">Detail öffnen</button>
                          </div>
                        )}
                        <div className="text-[13px] font-semibold text-[#1C1917] line-clamp-2 mt-1">{p.title || "—"}</div>
                        <div className="text-[11px] text-[#A8A29E] mt-1">{p.bezirk || "—"} · {fmtEUR(p.kaufpreis)}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[14px]" style={{ ...bricolage, fontWeight: 700, color: scoreColor }}>{score}</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-[6px]" style={{ background: cashBg, color: cashColor }}>{fmtEUR(c.cashflowMtl)}/M</span>
                        </div>
                        {p.nextAction && (
                          <div className="mt-2 flex items-center gap-1 text-[11px]" style={{ background: actionBg, color: actionColor, padding: "4px 8px", borderRadius: 6 }}>
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
      </div>
    </AppShell>
  );
}

// silence unused warnings
void Phone; void Mail;
