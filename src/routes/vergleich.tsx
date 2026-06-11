import { createFileRoute } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import {
  calcDataQuality, calcProperty, calcScore, fmtEUR, fmtNum, fmtPct, getActiveFinance,
} from "@/lib/calc";
import { ALL_STATUSES, type Property } from "@/lib/types";
import { Plus, CheckCircle2 } from "lucide-react";
import { planLimits, useAuth } from "@/lib/auth";
import { FeatureLocked } from "@/components/FeatureLocked";

export const Route = createFileRoute("/vergleich")({
  head: () => ({ meta: [{ title: "Vergleich – Immobilien gegenüberstellen" }] }),
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
          title="Vergleich ist in Plus & Premium enthalten"
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
        Vergleich
      </h1>
      <p className="mt-1 text-[13px] text-[#78716C]">
        {compareLimit > 0
          ? `Bis zu ${compareLimit} Immobilien auswählen und nebeneinander vergleichen`
          : "2–4 Immobilien auswählen und nebeneinander vergleichen"}
      </p>
    </div>
  );
}

const selectCls =
  "h-9 rounded-lg bg-white border border-[#EAE6DF] px-3 text-[13px] text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/30";

function ComparePageInner({ compareLimit }: { compareLimit: number }) {
  const { projects, properties } = useStore();
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [orteQuery, setOrteQuery] = useState<string>("");
  const [objektartFilter, setObjektartFilter] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

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
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={selectCls}>
            <option value="">Projekt: Alle</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="">Status: Alle</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={orteQuery}
            onChange={(e) => setOrteQuery(e.target.value)}
            placeholder="Stadt / Bezirk"
            className={selectCls + " min-w-[160px]"}
          />
          <select value={objektartFilter} onChange={(e) => setObjektartFilter(e.target.value)} className={selectCls}>
            <option value="">Objektart: Alle</option>
            {objektarten.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <label className="flex items-center gap-2 h-9 rounded-lg bg-white border border-[#EAE6DF] px-3 text-[13px] text-[#1C1917]">
            <span className="text-[#78716C]">Mindest-Score</span>
            <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-24" />
            <span className="tabular-nums w-6 text-right">{minScore}</span>
          </label>
        </div>
      </div>

      {/* Property selection — horizontal scroll */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] text-[#78716C]">
            Auswahl: <span className="text-[#1C1917] font-medium">{selected.length} / {compareLimit}</span>
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
              onClick={() => setStarted(true)}
              disabled={selected.length < 2}
              className="h-9 rounded-lg bg-[#2D6A4F] text-white px-4 text-[13px] font-medium hover:bg-[#245A41] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Vergleich starten
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

      {started && items.length >= 2 && <Comparison items={items} a={a} projects={projects} />}
    </AppShell>
  );
}

function Comparison({ items, a, projects }: { items: Property[]; a: any; projects: any[] }) {
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
  const overallWinner = bestScore;

  const allEqual = (vals: (number | null | undefined)[]) => {
    const v = vals.filter((x) => x != null && isFinite(x as number));
    if (v.length < 2) return false;
    return v.every((x) => x === v[0]);
  };

  type Chip = { label: string; name: string; value: string; tie: boolean };
  const chips: Chip[] = [];
  chips.push({
    label: "SCORE",
    name: bestScore.p.title || "—",
    value: String(bestScore.s.total),
    tie: allEqual(computed.map((x) => x.s.total)),
  });
  if (bestRendite.c.bruttorendite != null && isFinite(bestRendite.c.bruttorendite)) {
    chips.push({
      label: "BRUTTORENDITE",
      name: bestRendite.p.title || "—",
      value: fmtPct(bestRendite.c.bruttorendite, 2),
      tie: allEqual(computed.map((x) => x.c.bruttorendite)),
    });
  }
  if (bestCashflow.c.cashflowMtl != null && isFinite(bestCashflow.c.cashflowMtl)) {
    chips.push({
      label: "CASHFLOW",
      name: bestCashflow.p.title || "—",
      value: `${fmtEUR(bestCashflow.c.cashflowMtl)}/Mo`,
      tie: allEqual(computed.map((x) => x.c.cashflowMtl)),
    });
  }
  if (bestPreis.p.kaufpreis != null) {
    chips.push({
      label: "GÜNSTIGSTER PREIS",
      name: bestPreis.p.title || "—",
      value: fmtEUR(bestPreis.p.kaufpreis),
      tie: allEqual(computed.map((x) => x.p.kaufpreis)),
    });
  }
  if (bestMietrecht.p.mietrechtRisiko) {
    chips.push({
      label: "MIETRECHT",
      name: bestMietrecht.p.title || "—",
      value: bestMietrecht.p.mietrechtRisiko || "—",
      tie: computed.every((x) => x.p.mietrechtRisiko === computed[0].p.mietrechtRisiko),
    });
  }

  return (
    <>
      <div className="rounded-[12px] border border-[#EAE6DF] bg-white p-[16px_20px] mb-4" style={{ padding: "16px 20px" }}>
        <div className="text-[13px] font-semibold text-[#1C1917] mb-3">Entscheidungshilfe</div>
        <div
          className="rounded-[10px] mb-3 flex items-start gap-3"
          style={{ background: "#E8F5EE", border: "1px solid #2D6A4F", padding: "12px 16px" }}
        >
          <CheckCircle2 className="size-5 text-[#2D6A4F] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="font-display font-bold text-[15px] text-[#2D6A4F] truncate">
              Gesamtsieger: {overallWinner.p.title || "—"}
            </div>
            <div className="text-[12px] text-[#78716C] mt-0.5">
              Score {overallWinner.s.total}/100 · {overallWinner.s.entscheidung}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((ch) => (
            <div
              key={ch.label}
              className="rounded-lg bg-white border border-[#EAE6DF] flex items-center gap-2"
              style={{ padding: "8px 12px" }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A29E]">{ch.label}</div>
              {ch.tie ? (
                <div className="text-[12px] text-[#78716C]">Unentschieden</div>
              ) : (
                <>
                  <div className="text-[12px] font-medium text-[#1C1917] max-w-[140px] truncate">{ch.name}</div>
                  <div className="font-display font-bold text-[13px] text-[#2D6A4F] tabular-nums">{ch.value}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

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
