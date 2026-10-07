import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Trash as Trash2, Check, Star, Copy, Lightbulb, TrendDown as TrendingDown, TrendUp as TrendingUp } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { FinanceScenario, FinanceStatus, Property, Sondertilgung, Tilgungsart, ZahlungsIntervall } from "@/lib/types";
import { calcAmortizationSchedule, calcBalanceSeries, calcTotalInterestPaid, fmtEUR, fmtPct, makeFinanceScenario, summarizeScenario } from "@/lib/calc";
import { useActiveAssumptions, useStore } from "@/lib/store";
import { GlossaryTooltip } from "@/components/GlossaryTooltip";
import { CHART_STYLE } from "@/components/ChartCard";
import { CHART_COLORS, CHART_CONTAINER_CLS, CHART_MARGIN, ChartTooltip, GRID_PROPS, LEGEND_PROPS, LINE_PROPS, X_AXIS_CATEGORY, X_AXIS_TIME, yAxisProps } from "@/components/charts/chartKit";

const STATUS_TONE: Record<FinanceStatus, string> = {
  "Anfrage": "bg-muted text-muted-foreground border-muted-foreground/30",
  "Angebot erhalten": "bg-warning/15 text-warning-foreground border-warning/40",
  "Favorit": "bg-success/15 text-success-foreground border-success/40",
  "Abgelehnt": "bg-destructive/10 text-destructive border-destructive/40",
};

const STATUS_OPTIONS: FinanceStatus[] = ["Anfrage", "Angebot erhalten", "Favorit", "Abgelehnt"];

export function FinancePanel({ p }: { p: Property }) {
  const { updateProperty } = useStore();
  const scenarios = p.financeScenarios ?? [];
  const activeId = p.activeFinanceId ?? scenarios[0]?.id;
  const [selId, setSelId] = useState<string>(activeId ?? "");

  const setScenarios = (next: FinanceScenario[], activeFinanceId?: string) =>
    updateProperty(p.id, { financeScenarios: next, activeFinanceId: activeFinanceId ?? p.activeFinanceId });

  const addScenario = () => {
    const scn = makeFinanceScenario({
      name: `Bank ${scenarios.length + 1}`,
      kreditBetrag: scenarios[0]?.kreditBetrag ?? null,
      eigenkapital: scenarios[0]?.eigenkapital ?? null,
    });
    const next = [...scenarios, scn];
    setScenarios(next, p.activeFinanceId ?? scn.id);
    setSelId(scn.id);
    toast.success("Szenario angelegt");
  };
  const updateScn = (id: string, patch: Partial<FinanceScenario>) => {
    setScenarios(scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const removeScn = (id: string) => {
    if (!confirm("Szenario löschen?")) return;
    const next = scenarios.filter((s) => s.id !== id);
    const newActive = p.activeFinanceId === id ? next[0]?.id : p.activeFinanceId;
    setScenarios(next, newActive);
    if (selId === id) setSelId(next[0]?.id ?? "");
  };
  const duplicateScn = (id: string) => {
    const src = scenarios.find((s) => s.id === id);
    if (!src) return;
    const copy: FinanceScenario = { ...src, id: crypto.randomUUID(), name: `${src.name} (Kopie)` };
    setScenarios([...scenarios, copy]);
    setSelId(copy.id);
    toast.success("Szenario dupliziert");
  };
  const setActive = (id: string) => {
    updateProperty(p.id, { activeFinanceId: id });
    toast.success("Aktives Szenario gesetzt");
  };

  const current = scenarios.find((s) => s.id === selId) ?? scenarios[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelId(s.id)}
              className={`text-xs rounded-full border px-3 py-1.5 inline-flex items-center gap-1.5 ${selId === s.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {p.activeFinanceId === s.id && <Star className="size-3 fill-current" />}
              {s.name}
              {s.status && s.status !== "Anfrage" && (
                <span className={`text-[10px] rounded-full px-1.5 py-0 border ${selId === s.id ? "bg-primary-foreground/20 border-primary-foreground/30" : STATUS_TONE[s.status]}`}>{s.status}</span>
              )}
            </button>
          ))}
          <button onClick={addScenario} className="text-xs rounded-full border px-3 py-1.5 inline-flex items-center gap-1 hover:bg-accent">
            <Plus className="size-3" /> Szenario
          </button>
        </div>
        {current && (
          <div className="flex items-center gap-2">
            <button onClick={() => duplicateScn(current.id)} className="text-xs rounded-md border px-3 py-1.5 inline-flex items-center gap-1 hover:bg-accent">
              <Copy className="size-3" /> Duplizieren
            </button>
            {p.activeFinanceId !== current.id && (
              <button onClick={() => setActive(current.id)} className="text-xs rounded-md border px-3 py-1.5 inline-flex items-center gap-1 hover:bg-accent">
                <Check className="size-3" /> Als aktiv markieren
              </button>
            )}
          </div>
        )}
      </div>

      {!current ? (
        <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">
          Noch keine Finanzierung. Lege ein Szenario an.
        </div>
      ) : (
        <ScenarioEditor scn={current} onChange={(patch) => updateScn(current.id, patch)} onDelete={() => removeScn(current.id)} />
      )}

      {scenarios.length >= 2 && <ScenarioComparison p={p} scenarios={scenarios} activeId={p.activeFinanceId} />}
    </div>
  );
}

function ScenarioEditor({ scn, onChange, onDelete }: { scn: FinanceScenario; onChange: (p: Partial<FinanceScenario>) => void; onDelete: () => void }) {
  const schedule = useMemo(() => calcAmortizationSchedule(scn), [scn]);
  const totalInterest = schedule.reduce((s, y) => s + y.interest, 0);
  const totalPayment = schedule.reduce((s, y) => s + y.payment, 0);
  const periodsPerYear = scn.intervall === "monatlich" ? 12 : scn.intervall === "quartalsweise" ? 4 : 1;
  const ratePerPeriod = scn.tilgungsart === "annuitaet" && scn.kreditBetrag
    ? (() => {
        const pr = (scn.zinssatz || 0) / periodsPerYear;
        const n = scn.laufzeitJahre * periodsPerYear;
        return pr === 0 ? scn.kreditBetrag / n : (scn.kreditBetrag * pr) / (1 - Math.pow(1 + pr, -n));
      })()
    : 0;

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-3">
        <Fld label="Szenarioname"><Inp v={scn.name} onChange={(v) => onChange({ name: v })} /></Fld>
        <Fld label="Bank"><Inp v={scn.bankName ?? ""} onChange={(v) => onChange({ bankName: v })} /></Fld>
        <Fld label="Ansprechpartner Bank"><Inp v={scn.ansprechpartner ?? ""} onChange={(v) => onChange({ ansprechpartner: v })} /></Fld>
        <Fld label="Status">
          <select value={scn.status ?? "Anfrage"} onChange={(e) => onChange({ status: e.target.value as FinanceStatus })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Fld>
        <Fld label="Startdatum"><Inp type="date" v={scn.startDate} onChange={(v) => onChange({ startDate: v })} /></Fld>
        <Fld label="Kreditbetrag €"><NumInp v={scn.kreditBetrag} onChange={(v) => onChange({ kreditBetrag: v })} /></Fld>
        <Fld label="Eigenkapital €"><NumInp v={scn.eigenkapital} onChange={(v) => onChange({ eigenkapital: v })} /></Fld>
        <Fld label="Zinssatz % p.a."><NumInp v={scn.zinssatz * 100} onChange={(v) => onChange({ zinssatz: v == null ? 0 : v / 100 })} step={0.01} /></Fld>
        <Fld label={<>Zinsbindung<GlossaryTooltip termId="zinsbindung" /></>}>
          <select value={scn.zinsbindung ?? "fix"} onChange={(e) => onChange({ zinsbindung: e.target.value as any })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="fix">Fixzins</option>
            <option value="variabel">Variabel</option>
          </select>
        </Fld>
        <Fld label={<>Fixzins-Periode (Jahre)<GlossaryTooltip termId="fixzins_periode" /></>}><NumInp v={scn.zinsbindungJahre ?? null} onChange={(v) => onChange({ zinsbindungJahre: v })} /></Fld>
        <Fld label="Laufzeit (Jahre)"><NumInp v={scn.laufzeitJahre} onChange={(v) => onChange({ laufzeitJahre: v ?? 0 })} /></Fld>
        <Fld label="Zahlungsintervall">
          <select value={scn.intervall} onChange={(e) => onChange({ intervall: e.target.value as ZahlungsIntervall })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="monatlich">monatlich</option>
            <option value="quartalsweise">quartalsweise</option>
            <option value="jaehrlich">jährlich</option>
          </select>
        </Fld>
        <Fld label={<>Tilgungsart<GlossaryTooltip termId="tilgungsarten" /></>}>
          <select value={scn.tilgungsart} onChange={(e) => onChange({ tilgungsart: e.target.value as Tilgungsart })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="annuitaet">Annuität</option>
            <option value="endfaellig">Endfällig</option>
            <option value="manuell">Manuelle Zahlungsreihe</option>
          </select>
        </Fld>
        <Fld label={`Rate (${scn.intervall === "monatlich" ? "mtl." : scn.intervall === "quartalsweise" ? "Quartal" : "Jahr"})`}>
          <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm font-medium">{fmtEUR(ratePerPeriod)}</div>
        </Fld>
      </div>

      <SondertilgungenEditor scn={scn} onChange={onChange} />

      {scn.tilgungsart === "manuell" && schedule.length === 0 && (
        <div className="text-xs text-muted-foreground">Manuelle Zahlungsreihe: trage pro Jahr Sondertilgungen ein, um den Plan abzuleiten.</div>
      )}

      {schedule.length > 0 && (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            <Kpi label="Gesamt-Rückzahlung" value={fmtEUR(totalPayment)} />
            <Kpi label="Davon Zinsen" value={fmtEUR(totalInterest)} />
            <Kpi label="Davon Tilgung" value={fmtEUR(scn.kreditBetrag ?? 0)} />
          </div>

          <div className={CHART_CONTAINER_CLS}>
          <div className="text-[14px] font-semibold text-[#1C1917] mb-2">Zahlungsplan</div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <ComposedChart data={schedule} margin={CHART_MARGIN}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" {...X_AXIS_TIME} />
                <YAxis yAxisId="left" {...yAxisProps("€ / Jahr")} />
                <YAxis yAxisId="right" {...yAxisProps("€ Restschuld", "right")} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#FAFAF8" }} />
                <Legend {...LEGEND_PROPS} />
                <Bar yAxisId="left" dataKey="interest" stackId="a" fill={CHART_COLORS.equity} name="Zinsen" />
                <Bar yAxisId="left" dataKey="principal" stackId="a" fill={CHART_COLORS.value} name="Tilgung" />
                <Bar yAxisId="left" dataKey="extraPayment" stackId="a" fill={CHART_STYLE.colors.soft} name="Sondertilgung" />
                <Line yAxisId="right" {...LINE_PROPS} dataKey="balanceEnd" stroke={CHART_COLORS.debt} name="Restschuld" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Jahr</th>
                  <th className="py-2 pr-3 text-right">Rate gesamt</th>
                  <th className="py-2 pr-3 text-right">Zinsen</th>
                  <th className="py-2 pr-3 text-right">Tilgung</th>
                  <th className="py-2 pr-3 text-right">Sondertilg.</th>
                  <th className="py-2 pr-3 text-right">Restschuld</th>
                  <th className="py-2 pr-3 text-right">Σ Zinsen</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((y) => (
                  <tr key={y.year} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-medium">{y.year}</td>
                    <td className="py-1.5 pr-3 text-right">{fmtEUR(y.payment)}</td>
                    <td className="py-1.5 pr-3 text-right text-destructive">{fmtEUR(y.interest)}</td>
                    <td className="py-1.5 pr-3 text-right">{fmtEUR(y.principal)}</td>
                    <td className="py-1.5 pr-3 text-right">{y.extraPayment > 0 ? fmtEUR(y.extraPayment) : "—"}</td>
                    <td className="py-1.5 pr-3 text-right">{fmtEUR(y.balanceEnd)}</td>
                    <td className="py-1.5 pr-3 text-right text-muted-foreground">{fmtEUR(y.cumulativeInterest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Fld label="Notizen">
        <textarea value={scn.notizen ?? ""} onChange={(e) => onChange({ notizen: e.target.value })} rows={2} className="w-full rounded-md border bg-background p-2 text-sm" />
      </Fld>

      <div className="flex justify-end">
        <button onClick={onDelete} className="text-xs text-destructive inline-flex items-center gap-1 hover:underline">
          <Trash2 className="size-3" /> Szenario löschen
        </button>
      </div>
    </div>
  );
}

function SondertilgungenEditor({ scn, onChange }: { scn: FinanceScenario; onChange: (p: Partial<FinanceScenario>) => void }) {
  const list = scn.sondertilgungen ?? [];
  const add = () => {
    const s: Sondertilgung = { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), amount: 5000, note: "" };
    onChange({ sondertilgungen: [...list, s] });
  };
  const update = (id: string, patch: Partial<Sondertilgung>) =>
    onChange({ sondertilgungen: list.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const remove = (id: string) => onChange({ sondertilgungen: list.filter((x) => x.id !== id) });
  return (
    <div className="border rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Sondertilgungen<GlossaryTooltip termId="sondertilgung" /></div>
        <button onClick={add} className="text-xs inline-flex items-center gap-1 border rounded-md px-2 py-1 hover:bg-accent">
          <Plus className="size-3" /> Hinzufügen
        </button>
      </div>
      {list.length === 0 ? (
        <div className="text-xs text-muted-foreground">Keine Sondertilgungen geplant.</div>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="grid grid-cols-[140px_140px_1fr_auto] gap-2 items-center">
              <input type="date" value={s.date} onChange={(e) => update(s.id, { date: e.target.value })} className="rounded border bg-background px-2 py-1 text-sm" />
              <input type="number" value={s.amount} onChange={(e) => update(s.id, { amount: Number(e.target.value) })} className="rounded border bg-background px-2 py-1 text-sm" />
              <input value={s.note ?? ""} onChange={(e) => update(s.id, { note: e.target.value })} placeholder="Notiz" className="rounded border bg-background px-2 py-1 text-sm" />
              <button onClick={() => remove(s.id)} className="text-destructive p-1"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type CompareRow = { scn: FinanceScenario; sum: ReturnType<typeof summarizeScenario> };

/** Tonklasse je nach Rang innerhalb der Szenarien (best=grün, schlechtest=rot, dazwischen=gelb). */
function tone(rows: CompareRow[], r: CompareRow, value: (x: CompareRow) => number, lowerIsBetter = true): "good" | "bad" | "neutral" {
  if (rows.length < 2) return "neutral";
  const vals = rows.map(value).filter((n) => isFinite(n));
  if (vals.length === 0) return "neutral";
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (min === max) return "neutral";
  const v = value(r);
  const best = lowerIsBetter ? min : max;
  const worst = lowerIsBetter ? max : min;
  if (v === best) return "good";
  if (v === worst) return "bad";
  return "neutral";
}

const TONE_CELL: Record<"good" | "bad" | "neutral", string> = {
  good: "bg-success/15 text-success font-medium",
  bad: "bg-destructive/10 text-destructive font-medium",
  neutral: "bg-warning/10 text-warning-foreground",
};

const PALETTE = CHART_STYLE.series;

function ScenarioComparison({ p, scenarios, activeId }: { p: Property; scenarios: FinanceScenario[]; activeId?: string }) {
  const assumptions = useActiveAssumptions();
  const rows: CompareRow[] = useMemo(() => scenarios.map((s) => ({ scn: s, sum: summarizeScenario(p, assumptions, s) })), [p, assumptions, scenarios]);

  const eligible = rows.filter((r) => r.scn.status !== "Abgelehnt");
  const minBy = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((best, cur) => (f(cur) < f(best) ? cur : best), arr[0]);
  const maxBy = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((best, cur) => (f(cur) > f(best) ? cur : best), arr[0]);
  const lowestRate = eligible.length ? minBy(eligible, (r) => r.sum.ratePerMonth || Infinity) : null;
  const lowestInterest = eligible.length ? minBy(eligible, (r) => r.sum.totalInterest || Infinity) : null;
  const bestCashflow = eligible.length ? maxBy(eligible, (r) => r.sum.cashflowMtl) : null;
  const bestOverall = eligible.length ? minBy(eligible, (r) => r.sum.totalPayment || Infinity) : null;
  const shortTermVsLong = (() => {
    if (eligible.length < 2 || !lowestRate || !lowestInterest) return null;
    if (lowestRate.scn.id !== lowestInterest.scn.id) {
      return { id: lowestRate.scn.id, msg: `„${lowestRate.scn.name}" ist kurzfristig günstiger (niedrigste Rate), aber langfristig teurer (mehr Gesamtzinsen).` };
    }
    return null;
  })();

  const hints: { id?: string; msg: string; icon: "rate" | "interest" | "cf" | "warn" | "best" }[] = [];
  if (bestOverall) hints.push({ id: bestOverall.scn.id, icon: "best", msg: `Bestes Szenario gesamt: „${bestOverall.scn.name}" (niedrigste Gesamtkosten über Laufzeit ${fmtEUR(bestOverall.sum.totalPayment)}).` });
  if (lowestRate) hints.push({ id: lowestRate.scn.id, icon: "rate", msg: `„${lowestRate.scn.name}" hat die niedrigste Monatsrate (${fmtEUR(lowestRate.sum.ratePerMonth)}).` });
  if (lowestInterest && lowestInterest.scn.id !== lowestRate?.scn.id)
    hints.push({ id: lowestInterest.scn.id, icon: "interest", msg: `„${lowestInterest.scn.name}" hat die niedrigsten Gesamtzinskosten (${fmtEUR(lowestInterest.sum.totalInterest)}).` });
  if (bestCashflow && bestCashflow.scn.id !== lowestRate?.scn.id)
    hints.push({ id: bestCashflow.scn.id, icon: "cf", msg: `„${bestCashflow.scn.name}" liefert den besten Cashflow (${fmtEUR(bestCashflow.sum.cashflowMtl)}/Mt).` });
  if (shortTermVsLong) hints.push({ id: shortTermVsLong.id, icon: "warn", msg: shortTermVsLong.msg });

  // Szenario-Chart-Daten: feste Felder, NaN-sicher.
  // totalInterestCost fällt auf Finanzierungs-Summe zurück, damit der Balken nie leer ist.
  const chartData = rows.map((r) => {
    const safe = (n: number | null | undefined) => (Number.isFinite(n as number) ? Number(n) : 0);
    const rate = Math.round(safe(r.sum.ratePerMonth));
    const cashflow = Math.round(safe(r.sum.cashflowMtl));
    // Zentrale Formel: Annuität = Rate × n − Kreditbetrag, endfällig = Kredit × Zins × Jahre, 0 % = 0.
    const interestFallback = Math.round(calcTotalInterestPaid({
      loanAmount: safe(r.scn.kreditBetrag),
      annualRate: safe(r.scn.zinssatz),
      termYears: safe(r.scn.laufzeitJahre),
      monthlyPayment: rate,
      tilgungsart: r.scn.tilgungsart === "endfaellig" || r.scn.tilgungsart === "manuell"
        ? r.scn.tilgungsart
        : "annuitaet",
    }));
    const interest = Math.round(safe(r.sum.totalInterest)) || interestFallback;
    return { name: r.scn.name, rate, interest, cashflow };
  });

  // line chart: Restschuld über Zeit
  const balanceData = useMemo(() => {
    const seriesByScn = rows.map((r, i) => ({ name: r.scn.name, color: PALETTE[i % PALETTE.length], series: calcBalanceSeries(r.scn) }));
    const allYears = new Set<number>();
    seriesByScn.forEach((s) => s.series.forEach((pt) => allYears.add(pt.year)));
    const years = Array.from(allYears).sort((a, b) => a - b);
    return {
      data: years.map((y) => {
        const row: Record<string, number | string> = { year: y };
        seriesByScn.forEach((s) => {
          const pt = s.series.find((x) => x.year === y);
          row[s.name] = pt ? pt.balance : (s.series[s.series.length - 1]?.year < y ? 0 : (s.series[0]?.balance ?? 0));
        });
        return row;
      }),
      lines: seriesByScn,
    };
  }, [rows]);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-semibold text-sm">Szenariovergleich</h4>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-success" /> grün = bestes</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-warning" /> gelb = mittel</span>
          <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-destructive" /> rot = kritisch</span>
        </div>
      </div>

      {hints.length > 0 && (
        <ul className="grid sm:grid-cols-2 gap-1.5">
          {hints.map((h, i) => {
            const Icon = h.icon === "rate" ? TrendingDown : h.icon === "interest" ? TrendingDown : h.icon === "cf" ? TrendingUp : h.icon === "best" ? Star : Lightbulb;
            const tone = h.icon === "warn" ? "border-warning/40 bg-warning/10 text-warning-foreground" : h.icon === "best" ? "border-success/40 bg-success/10 text-success" : "border-border bg-muted/30";
            return (
              <li key={i} className={`flex items-start gap-2 text-xs rounded-md border px-2.5 py-2 ${tone}`}>
                <Icon className="size-3.5 mt-0.5" />
                <span>{h.msg}</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <MiniBarChart title="Monatliche Rate" data={chartData} dataKey="rate" kind="rate" yLabel="€ / Monat" />
        <MiniBarChart title="Gesamtzinskosten" data={chartData} dataKey="interest" kind="interest" yLabel="€ über Laufzeit" />
        <MiniBarChart title="Cashflow mtl." data={chartData} dataKey="cashflow" kind="cashflow" yLabel="€ / Monat" higherBetter />
        <div className={CHART_CONTAINER_CLS}>
          <div className="text-[14px] font-semibold text-[#1C1917] mb-2">Restschuld über Zeit</div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={balanceData.data} margin={CHART_MARGIN}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" {...X_AXIS_TIME} />
                <YAxis {...yAxisProps()} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#EAE6DF" }} />
                <Legend {...LEGEND_PROPS} />
                {balanceData.lines.map((l) => (
                  <Line key={l.name} {...LINE_PROPS} dataKey={l.name} stroke={l.color} strokeOpacity={l.name === rows.find((r) => r.scn.id === activeId)?.scn.name ? 1 : 0.55} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table mit Farbcodierung */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left border-b text-[10px] uppercase text-muted-foreground">
              <th className="py-2 pr-2">Szenario</th>
              <th className="py-2 pr-2">Bank</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2 text-right">Zinssatz</th>
              <th className="py-2 pr-2 text-right">Rate mtl.</th>
              <th className="py-2 pr-2 text-right">Schuldend. p.a.</th>
              <th className="py-2 pr-2 text-right">Zinsen gesamt</th>
              <th className="py-2 pr-2 text-right">Gesamtkosten Laufzeit</th>
              <th className="py-2 pr-2 text-right">Rest n. 5 J</th>
              <th className="py-2 pr-2 text-right">Rest n. 10 J</th>
              <th className="py-2 pr-2 text-right">Cashflow<GlossaryTooltip termId="cashflow" /></th>
              <th className="py-2 pr-2 text-right">DSCR<GlossaryTooltip termId="dscr" /></th>
              <th className="py-2 pr-2 text-right">Break-even</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const { scn, sum } = r;
              const isActive = scn.id === activeId;
              const isBest = scn.id === bestOverall?.scn.id;
              return (
                <tr key={scn.id} className={`border-b last:border-0 ${isActive ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""} ${isBest && !isActive ? "bg-success/5" : ""}`}>
                  <td className="py-1.5 pr-2 font-medium">
                    <div className="flex items-center gap-1">
                      {isActive && <Star className="size-3 fill-current text-primary" />}
                      {isBest && !isActive && <Star className="size-3 fill-current text-success" />}
                      {scn.name}
                    </div>
                  </td>
                  <td className="py-1.5 pr-2">{scn.bankName || "—"}</td>
                  <td className="py-1.5 pr-2">
                    {scn.status && <span className={`text-[10px] rounded-full px-1.5 py-0.5 border ${STATUS_TONE[scn.status]}`}>{scn.status}</span>}
                  </td>
                  <td className="py-1.5 pr-2 text-right">{fmtPct(scn.zinssatz, 2)}</td>
                  <td className={`py-1.5 pr-2 text-right rounded ${TONE_CELL[tone(rows, r, (x) => x.sum.ratePerMonth)]}`}>{fmtEUR(sum.ratePerMonth)}</td>
                  <td className={`py-1.5 pr-2 text-right rounded ${TONE_CELL[tone(rows, r, (x) => x.sum.annualDebtService)]}`}>{fmtEUR(sum.annualDebtService)}</td>
                  <td className={`py-1.5 pr-2 text-right rounded ${TONE_CELL[tone(rows, r, (x) => x.sum.totalInterest)]}`}>{fmtEUR(sum.totalInterest)}</td>
                  <td className={`py-1.5 pr-2 text-right rounded ${TONE_CELL[tone(rows, r, (x) => x.sum.totalPayment)]}`}>{fmtEUR(sum.totalPayment)}</td>
                  <td className={`py-1.5 pr-2 text-right rounded ${TONE_CELL[tone(rows, r, (x) => x.sum.balanceAfter5)]}`}>{fmtEUR(sum.balanceAfter5)}</td>
                  <td className={`py-1.5 pr-2 text-right rounded ${TONE_CELL[tone(rows, r, (x) => x.sum.balanceAfter10)]}`}>{fmtEUR(sum.balanceAfter10)}</td>
                  <td className={`py-1.5 pr-2 text-right rounded ${TONE_CELL[tone(rows, r, (x) => x.sum.cashflowMtl, false)]}`}>{fmtEUR(sum.cashflowMtl)}</td>
                  <td className={`py-1.5 pr-2 text-right rounded ${TONE_CELL[tone(rows, r, (x) => x.sum.dscr || 0, false)]}`}>{sum.dscr ? sum.dscr.toFixed(2) : "—"}</td>
                  <td className={`py-1.5 pr-2 text-right rounded ${TONE_CELL[tone(rows, r, (x) => x.sum.breakEvenMiete)]}`}>{fmtEUR(sum.breakEvenMiete)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">Das <strong>aktive Szenario</strong> wird weiterhin für Investment Summary, Cashflow, DSCR, Break-even-Miete und Score verwendet.</p>
    </div>
  );
}

function MiniBarChart({
  title,
  data,
  dataKey,
  kind = "rate",
  yLabel,
}: {
  title: string;
  data: any[];
  dataKey: string;
  kind?: "rate" | "interest" | "cashflow";
  yLabel?: string;
  higherBetter?: boolean;
}) {
  // Markenpalette aus CHART_STYLE:
  //   rate     = Tinte (Finanzierung, neutral)
  //   interest = Amber (Kosten)
  //   cashflow = Grün/Rot je nach Vorzeichen
  const COLOR_RATE = CHART_STYLE.colors.secondary;
  const COLOR_INTEREST = CHART_STYLE.colors.caution;
  const COLOR_POS = CHART_STYLE.colors.positive;
  const COLOR_NEG = CHART_STYLE.colors.negative;
  const colorFor = (v: number) =>
    kind === "rate"
      ? COLOR_RATE
      : kind === "interest"
      ? COLOR_INTEREST
      : v >= 0
      ? COLOR_POS
      : COLOR_NEG;
  const legendName =
    kind === "rate" ? "Monatsrate" : kind === "interest" ? "Zinskosten gesamt" : "Cashflow mtl.";
  return (
    <div className={CHART_CONTAINER_CLS}>
      <div className="text-[14px] font-semibold text-[#1C1917] mb-2">{title}</div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="name" {...X_AXIS_CATEGORY} angle={-15} textAnchor="end" height={44} />
            <YAxis {...yAxisProps(yLabel ?? "€")} />
            <Tooltip content={<ChartTooltip labelFormatter={(l) => String(l ?? "")} />} cursor={{ fill: "#FAFAF8" }} />
            <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} name={legendName}>
              {data.map((d, i) => (
                <Cell key={i} fill={colorFor(Number(d[dataKey]) || 0)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</label>;
}
function Inp({ v, onChange, type }: { v: string; onChange: (v: string) => void; type?: string }) {
  return <input type={type ?? "text"} value={v} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
function NumInp({ v, onChange, step }: { v: number | null | undefined; onChange: (v: number | null) => void; step?: number }) {
  return <input type="number" step={step ?? 1} value={v ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
