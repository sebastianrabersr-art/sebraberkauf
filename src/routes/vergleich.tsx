import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AppShell } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import {
  calcDataQuality, calcProperty, calcScore, fmtEUR, fmtNum, fmtPct, getActiveFinance,
} from "@/lib/calc";
import { ALL_STATUSES, type Property } from "@/lib/types";
import { ChevronDown, Plus, CheckCircle2, Download, Lock } from "lucide-react";
import { planLimits, useAuth, usePlan } from "@/lib/auth";
import { FeatureLocked } from "@/components/FeatureLocked";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { exportComparisonPdf, type ComparisonSection } from "@/lib/pdfExport";

export const Route = createFileRoute("/vergleich")({
  head: () => ({ meta: [{ title: "Analyse – Immobilien vergleichen" }] }),
  component: ComparePage,
});

type Dir = "higher" | "lower";

interface Row {
  key: string;
  label: string;
  fmt: (v: number | null | undefined) => string;
  dir?: Dir;
  values: (number | null | undefined)[];
  textValues?: (string | null | undefined)[];
}

function ComparePage() {
  const { subscription } = useAuth();
  const compareLimit = planLimits(subscription?.plan).compareLimit;
  if (compareLimit === 0) {
    return (
      <AppShell>
        <PageHead compareLimit={compareLimit} />
        <FeatureLocked
          title="Analyse ist in Plus & Premium enthalten"
          description="Mit Plus kannst du bis zu 4 Immobilien vergleichen. Mit Premium bis zu 10."
          recommendPlan="plus"
        />
      </AppShell>
    );
  }
  return <ComparePageInner compareLimit={compareLimit} />;
}

function PageHead({ compareLimit }: { compareLimit: number }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-[28px] font-extrabold text-[#1C1917] leading-tight" style={{ letterSpacing: "-0.03em" }}>
        Analyse
      </h1>
      <p className="mt-1 text-[13px] text-[#78716C]">
        {compareLimit > 0
          ? `Bis zu ${compareLimit} Immobilien analysieren und die beste Wahl treffen`
          : "2–4 Immobilien analysieren und die beste Wahl treffen"}
      </p>
    </div>
  );
}

const selectCls =
  "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] pr-8 text-[13px] text-[#1C1917] appearance-none cursor-pointer focus:border-[#2D6A4F] focus:outline-none hover:border-[#1C1917]";
const inputCls =
  "rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] text-[13px] text-[#1C1917] focus:border-[#2D6A4F] focus:outline-none hover:border-[#1C1917]";
const SelectWrap = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={"relative " + (className ?? "")}>
    {children}
    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-[#A8A29E] pointer-events-none" />
  </div>
);

function ComparePageInner({ compareLimit }: { compareLimit: number }) {
  const navigate = useNavigate();
  const { projects, properties } = useStore();
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [orteQuery, setOrteQuery] = useState<string>("");
  const [objektartFilter, setObjektartFilter] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [goal, setGoal] = useState<"score" | "rendite" | "cashflow" | "preis" | "rate">("score");
  const [showUnverifiedDialog, setShowUnverifiedDialog] = useState(false);

  const project = projects.find((x) => x.id === projectFilter);
  const a = (project?.assumptions) ?? projects[0]?.assumptions;

  const objektarten = useMemo(
    () => Array.from(new Set(properties.map((p) => p.objekttyp).filter(Boolean))),
    [properties],
  );

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (projectFilter && p.projectId !== projectFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (objektartFilter && p.objekttyp !== objektartFilter) return false;
      if (orteQuery.trim()) {
        const q = orteQuery.toLowerCase();
        const hay = [p.bezirk, p.city, p.adresse, p.bundesland].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (minScore > 0) {
        const proj = projects.find((x) => x.id === p.projectId);
        const ass = proj?.assumptions ?? a;
        const c = calcProperty(p, ass);
        const s = calcScore(p, ass, c);
        if (s.total < minScore) return false;
      }
      return true;
    });
  }, [properties, projects, projectFilter, statusFilter, objektartFilter, orteQuery, minScore, a]);

  const toggle = (id: string) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= compareLimit) return cur;
      return [...cur, id];
    });
  };
  const resetAll = () => { setSelected([]); setStarted(false); };

  const items = useMemo(
    () => selected.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as Property[],
    [selected, properties],
  );

  return (
    <AppShell>
      <PageHead compareLimit={compareLimit} />

      {/* Filter bar */}
      <div className="bg-[#FAFAF8] border-y border-[#EAE6DF] -mx-6 px-6 py-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <SelectWrap>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={selectCls}>
              <option value="">Projekt: Alle</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </SelectWrap>
          <SelectWrap>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="">Status: Alle</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </SelectWrap>
          <input
            value={orteQuery}
            onChange={(e) => setOrteQuery(e.target.value)}
            placeholder="Stadt / Bezirk"
            className={inputCls + " min-w-[160px]"}
          />
          <SelectWrap>
            <select value={objektartFilter} onChange={(e) => setObjektartFilter(e.target.value)} className={selectCls}>
              <option value="">Objektart: Alle</option>
              {objektarten.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </SelectWrap>
          <label className="flex items-center gap-2 h-9 rounded-lg bg-white border border-[#EAE6DF] px-3 text-[13px] text-[#1C1917]">
            <span className="text-[#78716C]">Mindest-Score</span>
            <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-24" />
            <span className="tabular-nums w-6 text-right">{minScore}</span>
          </label>
        </div>
      </div>

      {/* Goal selector */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] mb-2">
          Was ist dein Ziel?
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { key: "score",    label: "Ausgewogen",          emoji: "⚖️" },
            { key: "rendite",  label: "Höchste Rendite",     emoji: "📈" },
            { key: "cashflow", label: "Positiver Cashflow",  emoji: "💶" },
            { key: "preis",    label: "Günstigster Einstieg", emoji: "🏷️" },
            { key: "rate",     label: "Geringe Belastung",   emoji: "📉" },
          ] as const).map((g) => (
            <button
              key={g.key}
              onClick={() => setGoal(g.key)}
              className={`px-4 py-2 rounded-[20px] text-[13px] font-medium border-[1.5px] transition-all ${
                goal === g.key
                  ? "bg-[#1C1917] text-white border-[#1C1917]"
                  : "bg-[#F5F3EE] text-[#78716C] border-[#EAE6DF] hover:border-[#1C1917] hover:text-[#1C1917]"
              }`}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Property selection — horizontal scroll */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] text-[#78716C]">
            Auswahl: <span className="text-[#1C1917] font-medium">{selected.length} / {compareLimit}</span>
            {selected.length > 0 && (
              <span className="ml-2">· <span className="text-[#1C1917] font-medium">{items.filter((p) => p.dataVerified === true).length}</span> geprüft</span>
            )}
            {selected.length > 0 && selected.length < 2 && <span className="ml-2">— mind. 2 wählen</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetAll}
              className="h-9 rounded-lg border border-[#EAE6DF] bg-white px-3 text-[13px] text-[#1C1917] hover:bg-[#FAFAF8]"
            >
              Auswahl zurücksetzen
            </button>
            <button
              onClick={() => {
                const hasUnverified = items.some((p) => p.dataVerified !== true);
                if (hasUnverified) setShowUnverifiedDialog(true);
                else setStarted(true);
              }}
              disabled={selected.length < 2}
              className="h-9 rounded-lg bg-[#2D6A4F] text-white px-4 text-[13px] font-medium hover:bg-[#245A41] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyse starten
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-[13px] text-[#A8A29E] py-6 text-center border border-dashed border-[#EAE6DF] rounded-[10px] bg-white">
            Keine Immobilien passen zum Filter.
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {filtered.map((p) => {
              const proj = projects.find((x) => x.id === p.projectId);
              const ass = proj?.assumptions ?? a;
              const c = calcProperty(p, ass);
              const s = calcScore(p, ass, c);
              const on = selected.includes(p.id);
              const disabled = !on && selected.length >= compareLimit;
              const verified = p.dataVerified === true;
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  disabled={disabled}
                  className={`shrink-0 min-w-[160px] max-w-[200px] text-left rounded-[10px] bg-white px-3.5 py-3 transition ${
                    on
                      ? "border-2 border-[#2D6A4F]"
                      : "border border-[#EAE6DF] hover:border-[#D4CFC8]"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  style={on ? { padding: "calc(0.75rem - 1px) calc(0.875rem - 1px)" } : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#1C1917] truncate">{p.title || "—"}</div>
                      <div className="text-[11px] text-[#A8A29E] truncate mt-0.5">
                        {[p.bezirk, p.city].filter(Boolean).join(", ") || "—"}
                      </div>
                      <div className="text-[11px] text-[#A8A29E] truncate mt-1 tabular-nums">
                        {p.kaufpreis != null ? fmtEUR(p.kaufpreis) : "—"}
                      </div>
                      <div
                        className="text-[10px] tabular-nums mt-0.5"
                        style={{ color: (c.cashflowMtl ?? 0) >= 0 ? "#2D6A4F" : "#DC2626" }}
                      >
                        {c.cashflowMtl != null && isFinite(c.cashflowMtl) ? `${fmtEUR(c.cashflowMtl)}/Mo` : "—"}
                      </div>
                      {!verified && (
                        <div
                          className="inline-block mt-1.5 text-[10px]"
                          style={{ color: "#92400E", background: "#FEF3C7", padding: "2px 8px", borderRadius: "20px" }}
                        >
                          Daten nicht geprüft
                        </div>
                      )}
                    </div>
                    <span className="font-display text-[16px] font-extrabold text-[#1C1917] tabular-nums leading-none">
                      {s.total}
                    </span>
                  </div>
                </button>
              );
            })}
            <div className="shrink-0 min-w-[160px] rounded-[10px] border-[1.5px] border-dashed border-[#D4CFC8] bg-[#F5F3EE] grid place-items-center text-[12px] text-[#A8A29E] px-3 py-3">
              <span className="inline-flex items-center gap-1"><Plus className="size-3.5" /> Immobilie hinzufügen</span>
            </div>
          </div>
        )}
      </div>

      {started && items.length >= 2 && <Comparison items={items} a={a} projects={projects} goal={goal} />}

      <Dialog open={showUnverifiedDialog} onOpenChange={setShowUnverifiedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unvollständige Daten</DialogTitle>
            <DialogDescription>
              Folgende Immobilien wurden noch nicht geprüft:
            </DialogDescription>
          </DialogHeader>
          <ul className="text-[13px] text-[#1C1917] list-disc pl-5 space-y-1">
            {items.filter((p) => p.dataVerified !== true).map((p) => (
              <li key={p.id}>{p.title || "—"}</li>
            ))}
          </ul>
          <p className="text-[12px] text-[#78716C]">
            Ungenaue Daten können zu falschen Ergebnissen führen.
          </p>
          <DialogFooter className="gap-2">
            <button
              onClick={() => {
                setShowUnverifiedDialog(false);
                setStarted(true);
              }}
              className="h-9 rounded-lg border border-[#EAE6DF] bg-white px-4 text-[13px] text-[#1C1917] hover:bg-[#FAFAF8]"
            >
              Trotzdem vergleichen
            </button>
            <button
              onClick={() => {
                const first = items.find((p) => p.dataVerified !== true);
                setShowUnverifiedDialog(false);
                if (first) navigate({ to: "/properties/$id", params: { id: first.id } });
              }}
              className="h-9 rounded-lg bg-[#2D6A4F] text-white px-4 text-[13px] font-medium hover:bg-[#245A41]"
            >
              Daten prüfen
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}


function Comparison({ items, a, projects, goal }: { items: Property[]; a: any; projects: any[]; goal: "score"|"rendite"|"cashflow"|"preis"|"rate" }) {
  const computed = items.map((p) => {
    const proj = projects.find((x) => x.id === p.projectId);
    const ass = proj?.assumptions ?? a;
    const c = calcProperty(p, ass);
    const s = calcScore(p, ass, c);
    const dq = calcDataQuality(p);
    const fin = getActiveFinance(p);
    return { p, c, s, dq, fin };
  });

  const riskRank = (r?: "niedrig" | "mittel" | "hoch"): number =>
    r === "niedrig" ? 1 : r === "mittel" ? 2 : r === "hoch" ? 3 : 0;

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Kauf & Kosten",
      rows: [
        { key: "kp", label: "Kaufpreis", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.p.kaufpreis) },
        { key: "ppm2", label: "Preis / m²", dir: "lower", fmt: (v) => fmtEUR(v, 0), values: computed.map((x) => x.c.preisProM2) },
        { key: "wfl", label: "Fläche m²", dir: "higher", fmt: (v) => fmtNum(v), values: computed.map((x) => x.p.wohnflaecheM2) },
        { key: "knk", label: "Nebenkosten", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.kaufNebenkosten) },
        { key: "ges", label: "Gesamtkapital", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.gesamtkosten) },
      ],
    },
    {
      title: "Finanzierung",
      rows: [
        { key: "kredit", label: "Kreditbetrag", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.kreditBetrag) },
        { key: "zins", label: "Zinssatz", dir: "lower", fmt: (v) => fmtPct(v, 2), values: computed.map((x) => x.fin?.zinssatz ?? null) },
        { key: "rate", label: "Rate / Mo", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.kreditRateMtl) },
        { key: "dscr", label: "DSCR", dir: "higher", fmt: (v) => fmtNum(v, 2), values: computed.map((x) => x.c.dscr) },
        { key: "lz", label: "Laufzeit (Jahre)", dir: "lower", fmt: (v) => fmtNum(v), values: computed.map((x) => x.fin?.laufzeitJahre ?? null) },
      ],
    },
    {
      title: "Miete & Cashflow",
      rows: [
        { key: "miete", label: "Erwartete Miete", dir: "higher", fmt: fmtEUR, values: computed.map((x) => x.p.nettomieteMtl) },
        { key: "be", label: "Break-even Miete", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.requiredBreakEvenRent) },
        { key: "cf", label: "Cashflow / Mo", dir: "higher", fmt: fmtEUR, values: computed.map((x) => x.c.cashflowMtl) },
        { key: "brutto", label: "Bruttorendite", dir: "higher", fmt: (v) => fmtPct(v, 2), values: computed.map((x) => x.c.bruttorendite) },
        { key: "netto", label: "Nettorendite", dir: "higher", fmt: (v) => fmtPct(v, 2), values: computed.map((x) => x.c.nettorendite) },
      ],
    },
    {
      title: "Risiko",
      rows: [
        { key: "score", label: "Score", dir: "higher", fmt: (v) => fmtNum(v), values: computed.map((x) => x.s.total) },
        {
          key: "mietR", label: "MRG-Risiko", dir: "lower",
          fmt: (v) => (v === 1 ? "niedrig" : v === 2 ? "mittel" : v === 3 ? "hoch" : "—"),
          values: computed.map((x) => riskRank(x.p.mietrechtRisiko)),
        },
        {
          key: "ents", label: "Einschätzung",
          fmt: () => "",
          values: computed.map(() => null),
          textValues: computed.map((x) => x.s.entscheidung),
        },
        { key: "dq", label: "Datenqualität %", dir: "higher", fmt: (v) => v == null ? "—" : `${v}%`, values: computed.map((x) => x.dq.score) },
      ],
    },
  ];

  const cols = computed.length;

  // Entscheidungshilfe winners
  const bestScore = computed.reduce((a, b) => (a.s.total >= b.s.total ? a : b));
  const bestRendite = computed.reduce((a, b) =>
    (a.c.bruttorendite ?? -Infinity) >= (b.c.bruttorendite ?? -Infinity) ? a : b,
  );
  const bestCashflow = computed.reduce((a, b) =>
    (a.c.cashflowMtl ?? -Infinity) >= (b.c.cashflowMtl ?? -Infinity) ? a : b,
  );
  const bestPreis = computed.reduce((a, b) =>
    (a.p.kaufpreis ?? Infinity) <= (b.p.kaufpreis ?? Infinity) ? a : b,
  );
  const riskRankFn = (r?: string) => (r === "niedrig" ? 1 : r === "mittel" ? 2 : r === "hoch" ? 3 : 4);
  const bestMietrecht = computed.reduce((a, b) =>
    riskRankFn(a.p.mietrechtRisiko) <= riskRankFn(b.p.mietrechtRisiko) ? a : b,
  );
  const bestRate = computed.reduce((a, b) =>
    (a.c.kreditRateMtl ?? Infinity) <= (b.c.kreditRateMtl ?? Infinity) ? a : b,
  );

  const winner = (() => {
    switch (goal) {
      case "rendite":
        return bestRendite;
      case "cashflow":
        return bestCashflow;
      case "preis":
        return bestPreis;
      case "rate":
        return bestRate;
      case "score":
      default:
        return bestScore;
    }
  })();

  const goalConfig = {
    score:    { eyebrow: "Bester Gesamtscore",          value: `${winner.s.total}/100`, sub: `${winner.s.entscheidung}` },
    rendite:  { eyebrow: "Höchste Bruttorendite",       value: fmtPct(winner.c.bruttorendite, 2), sub: `Nettorendite ${fmtPct(winner.c.nettorendite, 2)}` },
    cashflow: { eyebrow: "Bester monatlicher Cashflow", value: `${fmtEUR(winner.c.cashflowMtl)}/Mo`, sub: (winner.c.cashflowMtl ?? 0) >= 0 ? "Positiver Cashflow ✓" : "Bester verfügbarer Cashflow" },
    preis:    { eyebrow: "Günstigster Einstiegspreis",  value: fmtEUR(winner.p.kaufpreis), sub: `${fmtEUR(winner.c.preisProM2)}/m²` },
    rate:     { eyebrow: "Geringste monatliche Rate",   value: `${fmtEUR(winner.c.kreditRateMtl)}/Mo`, sub: `DSCR ${fmtNum(winner.c.dscr, 2)}` },
  } as const;
  const cfg = goalConfig[goal];

  void bestMietrecht;



  return (
    <>
      <div className="rounded-[12px] border border-[#EAE6DF] bg-white mb-4" style={{ padding: "16px 20px" }}>
        <div className="text-[13px] font-semibold text-[#1C1917] mb-3">Analyse</div>
        <div
          className="rounded-[10px] mb-3 flex items-start justify-between gap-4"
          style={{ background: "#E8F5EE", border: "1px solid #2D6A4F", padding: "14px 18px" }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <CheckCircle2 className="size-5 text-[#2D6A4F] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#2D6A4F]">{cfg.eyebrow}</div>
              <div className="font-display font-bold text-[16px] text-[#1C1917] truncate mt-0.5">
                {winner.p.title || "—"}
              </div>
              <div className="text-[12px] text-[#78716C] mt-0.5">{cfg.sub}</div>
            </div>
          </div>
          <div className="font-display font-extrabold text-[22px] text-[#2D6A4F] tabular-nums shrink-0">
            {cfg.value}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { key: "score",    label: "Score",    val: `${bestScore.s.total}`,                                                        name: bestScore.p.title    || "—" },
            { key: "rendite",  label: "Rendite",  val: bestRendite.c.bruttorendite != null && isFinite(bestRendite.c.bruttorendite)   ? fmtPct(bestRendite.c.bruttorendite, 2) : "—", name: bestRendite.p.title  || "—" },
            { key: "cashflow", label: "Cashflow", val: bestCashflow.c.cashflowMtl  != null && isFinite(bestCashflow.c.cashflowMtl)    ? `${fmtEUR(bestCashflow.c.cashflowMtl)}/Mo` : "—", name: bestCashflow.p.title || "—" },
            { key: "preis",    label: "Preis",    val: bestPreis.p.kaufpreis != null ? fmtEUR(bestPreis.p.kaufpreis) : "—",            name: bestPreis.p.title    || "—" },
            { key: "rate",     label: "Rate",     val: bestRate.c.kreditRateMtl != null && isFinite(bestRate.c.kreditRateMtl) ? `${fmtEUR(bestRate.c.kreditRateMtl)}/Mo` : "—", name: bestRate.p.title || "—" },
          ] as const).filter((c) => c.key !== goal && c.val !== "—").map((c) => (
            <div
              key={c.key}
              className="rounded-lg bg-white border border-[#EAE6DF] flex items-center gap-2"
              style={{ padding: "8px 12px" }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A29E]">{c.label}</div>
              <div className="text-[12px] font-medium text-[#1C1917] max-w-[140px] truncate">{c.name}</div>
              <div className="font-display font-bold text-[13px] text-[#2D6A4F] tabular-nums">{c.val}</div>
            </div>
          ))}
        </div>
      </div>


      <ComparisonExportBar items={items} sections={sections} />

      <div className="rounded-[12px] border border-[#EAE6DF] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#FAFAF8] border-b border-[#EAE6DF]">
                <th className="text-left font-normal text-[10px] uppercase tracking-wide text-[#A8A29E] px-[14px] py-3 min-w-[160px]">
                  Kennzahl
                </th>
                {computed.map((x) => (
                  <th key={x.p.id} className="text-right px-[14px] py-3 min-w-[140px] align-top">
                    <div className="font-display font-bold text-[13px] text-[#1C1917]">{x.p.title || "—"}</div>
                    <div className="font-normal text-[11px] text-[#A8A29E] tabular-nums mt-0.5">
                      {x.p.kaufpreis != null ? fmtEUR(x.p.kaufpreis) : "—"}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          <tbody>
            {sections.map((sec) => (
              <React.Fragment key={sec.title}>
                <tr className="bg-[#FAFAF8]">
                  <td colSpan={cols + 1} className="px-[14px] py-2 text-[10px] font-semibold uppercase tracking-wide text-[#A8A29E]">
                    {sec.title}
                  </td>
                </tr>
                {sec.rows.map((r) => {
                  const tones = toneRow(r.values, r.dir);
                  return (
                    <tr key={r.key} className="border-b border-[#F5F3EE] last:border-b-0">
                      <td className="px-[14px] py-[10px] text-[12px] text-[#78716C]">{r.label}</td>
                      {r.values.map((v, i) => {
                        const txt = r.textValues?.[i];
                        const display = txt ?? r.fmt(v);
                        const missing = txt == null && (v == null || !isFinite(v as number));
                        const tone = tones[i];
                        const cls = missing
                          ? "text-[#A8A29E] font-normal"
                          : tone === "best"
                            ? "text-[#2D6A4F] font-bold"
                            : tone === "worst"
                              ? "text-[#DC2626]"
                              : "text-[#1C1917]";
                        return (
                          <td key={i} className={`px-[14px] py-[10px] text-right font-display text-[13px] tabular-nums ${cls}`} style={{ fontWeight: tone === "best" ? 700 : 600 }}>
                            {missing ? "—" : display}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
          </table>
          </div>
        </div>
      </>
  );
}

function toneRow(values: (number | null | undefined)[], dir?: Dir): ("best" | "worst" | "")[] {
  if (!dir) return values.map(() => "");
  const nums = values.map((v) => (v == null || !isFinite(v as number) ? null : (v as number)));
  const valid = nums.filter((v): v is number => v != null);
  if (valid.length < 2) return values.map(() => "");
  const best = dir === "higher" ? Math.max(...valid) : Math.min(...valid);
  const worst = dir === "higher" ? Math.min(...valid) : Math.max(...valid);
  if (best === worst) return values.map(() => "");
  return nums.map((v) => (v == null ? "" : v === best ? "best" : v === worst ? "worst" : ""));
}

function ComparisonExportBar({
  items,
  sections,
}: {
  items: Property[];
  sections: { title: string; rows: Row[] }[];
}) {
  const plan = usePlan();
  const canExport = plan === "premium";
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleExport = () => {
    if (!canExport) {
      setUpgradeOpen(true);
      return;
    }
    const pdfSections: ComparisonSection[] = sections.map((sec) => ({
      title: sec.title,
      rows: sec.rows.map((r) => {
        const tones = toneRow(r.values, r.dir);
        const values = r.values.map((v, i) => {
          const txt = r.textValues?.[i];
          if (txt != null) return txt;
          if (v == null || !isFinite(v as number)) return "—";
          return r.fmt(v);
        });
        return { label: r.label, values, tones };
      }),
    }));
    exportComparisonPdf(items.map((p) => p.title || "—"), pdfSections);
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-[#EAE6DF] bg-white px-3 text-[13px] text-[#1C1917] hover:bg-[#FAFAF8]"
        >
          {canExport ? <Download className="size-3.5" /> : <Lock className="size-3.5" />} Vergleich exportieren
        </button>
      </div>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Vergleichs-Export ist in Premium enthalten"
        description="Exportiere die komplette Vergleichstabelle als PDF."
        recommendPlan="premium"
      />
    </>
  );
}
