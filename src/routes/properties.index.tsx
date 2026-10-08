import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ImportTabsCard } from "@/components/ImportTabsCard";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct, googleMapsUrl, inferMietrecht, isValidUrl } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { userRatingAvg } from "@/lib/types";
import { useMemo, useState } from "react";
import { CaretDown as ChevronDown, DownloadSimple as Download, ArrowSquareOut as ExternalLink, MapPin, Plus, Trash as Trash2, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/properties/")({
  head: () => ({ meta: [{ title: "Kaufkandidaten – kaufma" }] }),
  component: PropertiesList,
});

type SortKey = "score" | "userRating" | "kaufpreis_asc" | "kaufpreis_desc" | "preisM2" | "brutto" | "cashflow" | "dq" | "createdAt" | "lastViewed" | "title";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Bester Score" },
  { value: "userRating", label: "Meine Bewertung" },
  { value: "brutto", label: "Höchste Rendite" },
  { value: "cashflow", label: "Bester Cashflow" },
  { value: "kaufpreis_asc", label: "Günstigster Preis" },
  { value: "kaufpreis_desc", label: "Teuerster Preis" },
  { value: "preisM2", label: "Günstiger €/m²" },
  { value: "lastViewed", label: "Zuletzt angesehen" },
  { value: "createdAt", label: "Zuletzt hinzugefügt" },
  { value: "title", label: "Name A–Z" },
  { value: "dq", label: "Datenqualität" },
];
const DEFAULT_SORT: SortKey = "score";

// Hilfsfunktion: leere/0-Werte als em-dash anzeigen
function num(value: number | null | undefined, fmt: (n: number) => string = fmtEUR) {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) {
    return <span className="text-ink-3">—</span>;
  }
  return <>{fmt(value)}</>;
}

function exportCSV(rows: any[]) {
  const headers = ["ID","Projekt","Status","Bewertung","Link","Titel","Bezirk","Kaufpreis","Fläche","Preis/m²","Zimmer","Baujahr","Miete","Brutto","Netto","Cashflow","LTV","Datenqualität","Mietrecht","Zustand","Fehlend"];
  const csv = [
    headers.join(";"),
    ...rows.map(({p,c,dq,projectName,avg}) => [
      p.id, projectName, p.status, avg != null ? avg.toFixed(1) : "", p.link, p.title, p.bezirk,
      p.kaufpreis ?? "", p.wohnflaecheM2 ?? "", Math.round(c.preisProM2), p.zimmer ?? "", p.baujahr ?? "",
      p.nettomieteMtl ?? "", (c.bruttorendite*100).toFixed(2), (c.nettorendite*100).toFixed(2),
      Math.round(c.cashflowMtl), (c.ltv*100).toFixed(1), dq.score, p.mietrecht, p.zustand,
      [...p.missingData, ...dq.missing].join("|"),
    ].map((v)=>`"${String(v).replaceAll('"','""')}"`).join(";")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `immobilien-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

const bricolage = { fontFamily: "'Bricolage Grotesque', sans-serif" } as const;

const selectClass =
  "rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[7px] pr-8 text-[13px] text-[#1C1917] outline-none focus:border-[#2D6A4F] appearance-none cursor-pointer";
const inputClass =
  "rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[7px] text-[13px] text-[#1C1917] focus:border-[#2D6A4F] focus:outline-none";
const SelectWrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    {children}
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-ink-3 pointer-events-none" />
  </div>
);

const COL_NUMERIC = "py-3 px-4 text-right whitespace-nowrap text-[13px] text-[#1C1917]";

function PropertiesList() {
  const navigate = useNavigate();
  const { properties, projects, deleteProperty, deleteDemoData } = useStore();
  const activeProject = useActiveProject();
  const assumptions = useActiveAssumptions();
  const [statusFilter, setStatusFilter] = useState("all");
  const [bezirkFilter, setBezirkFilter] = useState("");
  const [mietrechtFilter, setMietrechtFilter] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [minDQ, setMinDQ] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [scopeAll, setScopeAll] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  const filtersActive =
    statusFilter !== "all" || mietrechtFilter !== "all" || !!bezirkFilter || !!search || minScore > 0 || minDQ > 0;
  const resetFilters = () => {
    setStatusFilter("all"); setMietrechtFilter("all"); setBezirkFilter(""); setSearch(""); setMinScore(0); setMinDQ(0);
  };

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";

  const EXCLUDED_DEFAULT = ["Gekauft", "Abgelehnt"];
  const rows = useMemo(() => {
    return properties
      .filter((p) => (scopeAll ? true : p.projectId === activeProject.id))
      .filter((p) => (statusFilter === "all" ? !EXCLUDED_DEFAULT.includes(p.status) : statusFilter === "all-inkl" ? true : p.status === statusFilter))
      .filter((p) => (mietrechtFilter === "all" ? true : p.mietrecht === mietrechtFilter))
      .filter((p) => (bezirkFilter ? (p.bezirk || "").toLowerCase().includes(bezirkFilter.toLowerCase()) : true))
      .filter((p) => (search ? (p.title + p.bezirk + p.adresse + p.platform).toLowerCase().includes(search.toLowerCase()) : true))
      .map((p) => {
        const c = calcProperty(p, assumptions);
        const dq = calcDataQuality(p);
        const avg = userRatingAvg(p.userRating);
        return { p, c, dq, projectName: projectName(p.projectId), avg };
      })
      .filter((r) => (minScore > 0 ? (r.avg ?? 0) * 10 >= minScore : true) && r.dq.score >= minDQ)
      .sort((a, b) => {
        switch (sort) {
          case "kaufpreis_asc": return (a.p.kaufpreis ?? Infinity) - (b.p.kaufpreis ?? Infinity);
          case "kaufpreis_desc": return (b.p.kaufpreis ?? 0) - (a.p.kaufpreis ?? 0);
          case "preisM2": return (a.c.preisProM2 || Infinity) - (b.c.preisProM2 || Infinity);
          case "brutto": return b.c.bruttorendite - a.c.bruttorendite;
          case "cashflow": return b.c.cashflowMtl - a.c.cashflowMtl;
          case "dq": return b.dq.score - a.dq.score;
          case "createdAt": return b.p.createdAt.localeCompare(a.p.createdAt);
          case "lastViewed": return (b.p.lastViewed ?? "").localeCompare(a.p.lastViewed ?? "");
          case "title": return (a.p.title ?? "").localeCompare(b.p.title ?? "", "de", { sensitivity: "base" });
          case "userRating": {
            const avg = (p: typeof a.p) => {
              const r = p.userRating;
              if (!r) return -1;
              return ((r.lage ?? 0) + (r.preisLeistung ?? 0) + (r.zustand ?? 0) + (r.vermietbarkeit ?? 0) + (r.bauchgefuehl ?? 0)) / 5;
            };
            return avg(b.p) - avg(a.p);
          }
          case "score":
          default: {
            const sa = calcScore(a.p, assumptions, a.c).total;
            const sb = calcScore(b.p, assumptions, b.c).total;
            return sb - sa;
          }
        }
      });
  }, [properties, assumptions, activeProject.id, scopeAll, statusFilter, mietrechtFilter, bezirkFilter, search, sort, minScore, minDQ, projects]);

  const hasDemo = properties.some((p) => p.isDemo);

  return (
    <AppShell>
      {/* Seitenkopf */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="heading-page-sm">
            Kaufkandidaten
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-2">
            {rows.length} Objekt{rows.length === 1 ? "" : "e"} in Prüfung
            {scopeAll ? " (alle Projekte)" : ` im Projekt „${activeProject.name}"`}. Gekaufte Immobilien findest du im Portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowImport((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2D6A4F] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#235740]"
          >
            <Plus className="size-4" /> {showImport ? "Schließen" : "Immobilie hinzufügen"}
          </button>
          {hasDemo && (
            <button
              onClick={() => { if (confirm("Alle Demo-Daten (Beispielprojekt + Seed-Immobilien) löschen?")) { deleteDemoData(); toast.success("Demo-Daten entfernt."); }}}
              className="rounded-lg border border-[#EAE6DF] px-3 py-2 text-[12px] text-[#DC2626] hover:bg-[#FEE2E2]/40"
            >
              Demo-Daten löschen
            </button>
          )}
        </div>
      </div>

      {showImport && (
        <div className="mb-6">
          <ImportTabsCard />
        </div>
      )}

      {/* Filterleiste */}
      <div className="bg-white border border-[#EAE6DF] rounded-[12px] px-4 py-2.5 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Suche…"
            aria-label="Kandidaten durchsuchen"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} flex-1 min-w-[160px]`}
          />
          <SelectWrap className="max-w-[160px] w-full sm:w-auto">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${selectClass} w-full max-w-[160px]`}>
              <option value="all">Status: aktiv</option>
              <option value="all-inkl">Status: alle</option>
              {["Neu","Prüfen","Interessant","Besichtigung","Angebot","Abgelehnt","Gekauft"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </SelectWrap>
          <SelectWrap className="max-w-[160px] w-full sm:w-auto">
            <select value={mietrechtFilter} onChange={(e) => setMietrechtFilter(e.target.value)} className={`${selectClass} w-full max-w-[160px]`}>
              <option value="all">Mietrecht: alle</option>
              {["Neubau / freie Miete","Teilanwendung MRG","Altbau / Richtwert möglich","unklar – rechtlich prüfen","nicht geeignet"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </SelectWrap>
          <input placeholder="Bezirk…" aria-label="Nach Bezirk filtern" value={bezirkFilter} onChange={(e) => setBezirkFilter(e.target.value)} className={`${inputClass} w-28`} />
          <SelectWrap className="max-w-[160px] w-full sm:w-auto">
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${selectClass} w-full max-w-[160px]`}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </SelectWrap>
          <label className={`${inputClass} text-[12px] text-ink-2 inline-flex items-center gap-1`} title="Nur Objekte ab diesem Score (0–100) anzeigen">
            Score ab<input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-10 bg-transparent outline-none text-[#1C1917] tabular-nums" />
          </label>
          <label className={`${inputClass} text-[12px] text-ink-2 inline-flex items-center gap-1`} title="Nur Objekte, deren Angaben mindestens zu diesem Anteil vollständig sind">
            Daten ab<input type="number" min={0} max={100} value={minDQ} onChange={(e) => setMinDQ(Number(e.target.value))} className="w-9 bg-transparent outline-none text-[#1C1917] tabular-nums" />%
          </label>
          <button
            onClick={() => exportCSV(rows)}
            title="CSV exportieren"
            aria-label="Als CSV exportieren"
            className="ml-auto inline-flex items-center justify-center size-8 rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white text-ink-2 hover:text-[#2D6A4F] hover:border-[#2D6A4F]/40"
          >
            <Download className="size-4" />
          </button>
        </div>
      </div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setScopeAll((v) => !v)}
          className="text-[12px] text-ink-2 hover:text-[#2D6A4F] underline-offset-2 hover:underline"
        >
          {scopeAll ? "Nur aktives Projekt anzeigen" : "Alle Projekte anzeigen"}
        </button>
      </div>


      {sort !== DEFAULT_SORT && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5EE] px-2.5 py-1 text-[12px] text-[#2D6A4F]">
            Sortiert nach: {SORT_OPTIONS.find((o) => o.value === sort)?.label}
            <button
              onClick={() => setSort(DEFAULT_SORT)}
              className="hover:text-[#1C1917]"
              title="Sortierung zurücksetzen"
              aria-label="Sortierung zurücksetzen"
            >
              <X className="size-3" />
            </button>
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState filtersActive={filtersActive} onReset={resetFilters} onAdd={() => setShowImport(true)} />
      ) : (
      <>
      {/* Handy: Karten statt 21 Spalten */}
      <ul className="md:hidden space-y-2">
        {rows.map(({ p, c, dq }) => {
          const m = inferMietrecht(p);
          return (
            <li key={p.id}>
              <Link
                to="/properties/$id"
                params={{ id: p.id }}
                className="block rounded-[12px] border border-[#EAE6DF] bg-white px-4 py-3 active:bg-[#FAFAF8]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[#1C1917] line-clamp-2">{p.title || "Ohne Titel"}</div>
                    <div className="text-[12px] text-ink-2 truncate mt-0.5">
                      {[p.bezirk, p.wohnflaecheM2 ? `${p.wohnflaecheM2} m²` : null, p.status].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-[15px] tabular-nums text-[#1C1917]">{p.kaufpreis ? fmtEUR(p.kaufpreis) : "—"}</div>
                    <div className={`text-[12px] tabular-nums ${c.cashflowMtl < 0 ? "text-[#B91C1C]" : c.cashflowMtl > 0 ? "text-[#2D6A4F]" : "text-ink-3"}`}>
                      {c.cashflowMtl === 0 ? "—" : `${fmtEUR(c.cashflowMtl)}/Monat`}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px]">
                  {c.bruttorendite ? <span className="rounded-full bg-[#F5F3EE] px-2 py-0.5 text-ink-2 tabular-nums">{fmtPct(c.bruttorendite)} brutto</span> : null}
                  <AmpelBadge ampel={m.risiko === "niedrig" ? "green" : m.risiko === "mittel" ? "yellow" : "red"}>Mietrecht {m.risiko}</AmpelBadge>
                  <AmpelBadge ampel={dq.ampel}>Daten {dq.score}%</AmpelBadge>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Tabelle */}
      <div className="hidden md:block rounded-[12px] border border-[#EAE6DF] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#FAFAF8] border-b border-[#EAE6DF]">
                {([
                  ["Bewertung","Persönliche Bewertung (Ø 1–10)","left"],
                  ["Status","Aktueller CRM-Status","left"],
                  ["Prio","Priorität für deine Pipeline","left"],
                  ["Titel","Inserats-Titel","left"],
                  ["Bezirk","Bezirk / Region","left"],
                  ["Kaufpreis","Kaufpreis brutto","right"],
                  ["m²","Wohnfläche","right"],
                  ["€/m²","Preis pro m²","right"],
                  ["Makler€","Maklerkosten brutto (Provision + USt)","right"],
                  ["NK gesamt","Kaufnebenkosten gesamt (inkl. Maklerkosten)","right"],
                  ["Gesamtkapital","Gesamtkapitalbedarf = Kaufpreis + NK + Sanierung + Einrichtung + Reserve","right"],
                  ["Miete","Erwartete Nettomiete","right"],
                  ["Min-Miete","Benötigte Nettomiete für positiven Cashflow","right"],
                  ["Brutto","Bruttorendite","right"],
                  ["Cashflow","Monatlicher Cashflow","right"],
                  ["Mietrecht","Mietrechtliches Risiko (automatisch eingeschätzt)","left"],
                  ["Daten","Datenqualität – Anteil ausgefüllter Pflichtfelder","left"],
                  ["Nächste Aktion","","left"],
                  ["Verkäufer","","left"],
                  ["Links","","left"],
                  ["","","left"],
                ] as const).map(([h,tip,align]) => (
                  <th
                    key={h}
                    title={tip || undefined}
                    className={`px-4 font-semibold text-[11px] uppercase text-ink-3 whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
                    style={{ letterSpacing: "0.07em", height: 44 }}
                  >
                    <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end w-full" : ""}`}>
                      {h}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, c, dq, projectName, avg }) => {
                const maps = googleMapsUrl(p);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[#F5F3EE] hover:bg-[#FAFAF8] cursor-pointer transition-colors"
                    onClick={() => navigate({ to: "/properties/$id", params: { id: p.id } })}
                    style={{ minHeight: 64 }}
                  >
                    <td className="py-3 px-4 align-middle" style={{ minHeight: 64 }}>
                      {avg != null ? (
                        <div className="tabular-nums" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 14, color: "#2D6A4F" }}>
                          Ø {avg.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-[14px] text-ink-3">—</div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span className="inline-flex items-center rounded-md bg-[#F5F3EE] px-2 py-0.5 text-[12px] text-ink-2">{p.status}</span>
                    </td>
                    <td className="py-3 px-4 align-middle text-[12px] text-ink-3">{p.priority ?? "—"}</td>
                    <td className="py-3 px-4 align-middle max-w-sm">
                      <div
                        className="text-[14px] text-[#1C1917]"
                        style={{ fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        {p.title || "—"}
                      </div>
                      <div className="text-[12px] text-ink-3 truncate mt-0.5">{projectName} · {p.platform || "—"}</div>
                    </td>
                    <td className="py-3 px-4 align-middle text-[13px] text-[#1C1917]">{p.bezirk || <span className="text-ink-3">—</span>}</td>
                    <td className={COL_NUMERIC} style={bricolage}>{num(p.kaufpreis)}</td>
                    <td className={COL_NUMERIC} style={bricolage}>{p.wohnflaecheM2 ? `${p.wohnflaecheM2} m²` : <span className="text-ink-3">—</span>}</td>
                    <td className={COL_NUMERIC} style={bricolage}>{num(c.preisProM2)}</td>
                    <td className={COL_NUMERIC} style={bricolage} title="Maklerkosten brutto inkl. USt">{num(c.maklerProvisionBrutto)}</td>
                    <td className={COL_NUMERIC} style={bricolage} title="Kaufnebenkosten gesamt inkl. Makler">{num(c.kaufNebenkosten)}</td>
                    <td className={COL_NUMERIC} style={bricolage} title="Gesamtkapitalbedarf">{num(c.gesamtkosten)}</td>
                    <td className={COL_NUMERIC} style={bricolage}>
                      {num(p.nettomieteMtl)}
                      {p.nettomieteGeschaetzt && <div className="text-[10px] text-[#D97706]" style={{ fontFamily: "Inter" }}>geschätzt</div>}
                    </td>
                    <td className={`${COL_NUMERIC}`} style={bricolage} title="Mindestmiete für positiven Cashflow">
                      <span className={p.nettomieteMtl && p.nettomieteMtl >= c.requiredBreakEvenRent ? "text-[#2D6A4F]" : "text-[#D97706]"}>
                        {num(c.requiredBreakEvenRent)}
                      </span>
                      <div className="text-[10px] text-ink-3" style={{ fontFamily: "Inter" }}>{c.requiredBreakEvenRentPerM2 ? `${fmtEUR(c.requiredBreakEvenRentPerM2)}/m²` : "—"}</div>
                    </td>
                    <td className={COL_NUMERIC} style={bricolage}>{c.bruttorendite ? fmtPct(c.bruttorendite) : <span className="text-ink-3">—</span>}</td>
                    <td className={`${COL_NUMERIC}`} style={bricolage}>
                      <span className={c.cashflowMtl < 0 ? "text-[#B91C1C]" : c.cashflowMtl > 0 ? "text-[#2D6A4F]" : "text-ink-3"}>
                        {c.cashflowMtl === 0 ? "—" : fmtEUR(c.cashflowMtl)}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle text-[12px]" title="Mietrechtliches Risiko aus Baujahr/Beschreibung">
                      {(() => { const m = inferMietrecht(p); return <AmpelBadge ampel={m.risiko === "niedrig" ? "green" : m.risiko === "mittel" ? "yellow" : "red"}>{m.risiko}</AmpelBadge>; })()}
                    </td>
                    <td className="py-3 px-4 align-middle"><AmpelBadge ampel={dq.ampel}>{dq.score}%</AmpelBadge></td>
                    <td className="py-3 px-4 align-middle text-[12px] text-[#1C1917]">
                      {p.nextAction ? (
                        <>
                          <div className="truncate max-w-[140px]">{p.nextAction}</div>
                          {p.nextActionDate && <div className="text-[10px] text-ink-3">{p.nextActionDate}</div>}
                        </>
                      ) : <span className="text-ink-3">—</span>}
                    </td>
                    <td className="py-3 px-4 align-middle text-[12px] text-[#1C1917]">
                      <div className="truncate max-w-[140px]">{p.sellerName || p.sellerCompany || <span className="text-ink-3">—</span>}</div>
                      {p.sellerType && p.sellerType !== "unklar" && <div className="text-[10px] text-ink-3">{p.sellerType}</div>}
                    </td>
                    <td className="py-3 px-4 align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {isValidUrl(p.link) ? (
                          <a href={p.link} target="_blank" rel="noopener noreferrer" title="Original-Inserat" className="text-[#2D6A4F] hover:text-[#235740]">
                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : <span className="text-[12px] text-ink-3">—</span>}
                        {maps && (
                          <a href={maps} target="_blank" rel="noopener noreferrer" title="Karte öffnen" className="text-[#2D6A4F] hover:text-[#235740]">
                            <MapPin className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setToDelete({ id: p.id, title: p.title || "Ohne Titel" })}
                        aria-label={`„${p.title || "Ohne Titel"}“ löschen`}
                        title="Löschen"
                        className="inline-flex size-8 items-center justify-center rounded-[6px] text-ink-3 hover:text-[#B91C1C] hover:bg-[#FEE2E2]/50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>„{toDelete?.title}“ löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Immobilie wird mit allen Notizen, Besichtigungen, Dokumenten und Zahlungen endgültig entfernt. Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Behalten</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#B91C1C] text-white hover:bg-[#991B1B]"
              onClick={() => {
                if (!toDelete) return;
                deleteProperty(toDelete.id);
                toast.success(`„${toDelete.title}“ wurde gelöscht.`);
                setToDelete(null);
              }}
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function EmptyState({ filtersActive, onReset, onAdd }: { filtersActive: boolean; onReset: () => void; onAdd: () => void }) {
  if (filtersActive) {
    return (
      <div className="rounded-[12px] border border-[#EAE6DF] bg-white px-6 py-12 text-center">
        <div className="text-[15px] font-semibold text-[#1C1917]">Keine Treffer für diese Filter</div>
        <p className="text-[13px] text-ink-2 mt-1">Lockere die Filter oder setz sie zurück, um alle Kandidaten zu sehen.</p>
        <button type="button" onClick={onReset} className="mt-4 rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-2 text-[13px] font-medium text-[#1C1917] hover:border-[#1C1917]">
          Filter zurücksetzen
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-[12px] border border-[#EAE6DF] bg-white px-6 py-12 text-center">
      <div className="font-display text-[20px] font-extrabold text-[#1C1917]">Noch keine Kaufkandidaten</div>
      <p className="text-[14px] text-ink-2 mt-1.5 max-w-md mx-auto">
        Füg den Link zu einem Inserat ein – kaufma liest die Daten aus und rechnet Rendite, Cashflow und Mietrecht-Risiko für dich.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-[8px] bg-[#2D6A4F] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#235740]">
          <Plus className="size-4" aria-hidden /> Immobilie hinzufügen
        </button>
        <Link to="/properties/new" className="rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-2.5 text-[13px] font-medium text-[#1C1917] hover:border-[#1C1917]">
          Daten selbst eingeben
        </Link>
      </div>
    </div>
  );
}
