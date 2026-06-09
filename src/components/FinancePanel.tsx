import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Trash2, Check, Star, Copy, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { FinanceScenario, FinanceStatus, Property, Sondertilgung, Tilgungsart, ZahlungsIntervall } from "@/lib/types";
import { calcAmortizationSchedule, calcBalanceSeries, fmtEUR, fmtPct, makeFinanceScenario, summarizeScenario } from "@/lib/calc";
import { useActiveAssumptions, useStore } from "@/lib/store";

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
        <Fld label="Zinsbindung">
          <select value={scn.zinsbindung ?? "fix"} onChange={(e) => onChange({ zinsbindung: e.target.value as any })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="fix">Fixzins</option>
            <option value="variabel">Variabel</option>
          </select>
        </Fld>
        <Fld label="Fixzins-Periode (Jahre)"><NumInp v={scn.zinsbindungJahre ?? null} onChange={(v) => onChange({ zinsbindungJahre: v })} /></Fld>
        <Fld label="Laufzeit (Jahre)"><NumInp v={scn.laufzeitJahre} onChange={(v) => onChange({ laufzeitJahre: v ?? 0 })} /></Fld>
        <Fld label="Zahlungsintervall">
          <select value={scn.intervall} onChange={(e) => onChange({ intervall: e.target.value as ZahlungsIntervall })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="monatlich">monatlich</option>
            <option value="quartalsweise">quartalsweise</option>
            <option value="jaehrlich">jährlich</option>
          </select>
        </Fld>
        <Fld label="Tilgungsart">
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

          <div className="h-72 w-full">
            <ResponsiveContainer>
              <ComposedChart data={schedule}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(v: any) => fmtEUR(Number(v))}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="interest" stackId="a" fill="hsl(var(--destructive))" name="Zinsen" />
                <Bar yAxisId="left" dataKey="principal" stackId="a" fill="hsl(var(--primary))" name="Tilgung" />
                <Bar yAxisId="left" dataKey="extraPayment" stackId="a" fill="hsl(var(--success, 142 70% 45%))" name="Sondertilgung" />
                <Line yAxisId="right" type="monotone" dataKey="balanceEnd" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} name="Restschuld" />
              </ComposedChart>
            </ResponsiveContainer>
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
        <div className="text-sm font-medium">Sondertilgungen</div>
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

const PALETTE = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--warning))", "#8b5cf6", "#06b6d4"];

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

  // chart data
  const chartData = rows.map((r) => ({
    name: r.scn.name,
    rate: Math.round(r.sum.ratePerMonth),
    interest: Math.round(r.sum.totalInterest),
    cashflow: Math.round(r.sum.cashflowMtl),
    fill: r.scn.id === bestOverall?.scn.id ? "hsl(var(--success))" : r.scn.status === "Abgelehnt" ? "hsl(var(--destructive))" : "hsl(var(--primary))",
  }));

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
        <MiniBarChart title="Monatliche Rate" data={chartData} dataKey="rate" />
        <MiniBarChart title="Gesamtzinskosten" data={chartData} dataKey="interest" />
        <MiniBarChart title="Cashflow mtl." data={chartData} dataKey="cashflow" higherBetter />
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Restschuld über Zeit</div>
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <LineChart data={balanceData.data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {balanceData.lines.map((l) => (
                  <Line key={l.name} type="monotone" dataKey={l.name} stroke={l.color} strokeWidth={l.name === rows.find((r) => r.scn.id === activeId)?.scn.name ? 3 : 1.5} dot={false} />
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
              <th className="py-2 pr-2 text-right">Cashflow</th>
              <th className="py-2 pr-2 text-right">DSCR</th>
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

function MiniBarChart({ title, data, dataKey, higherBetter }: { title: string; data: any[]; dataKey: string; higherBetter?: boolean }) {
  const vals = data.map((d) => d[dataKey]);
  const best = higherBetter ? Math.max(...vals) : Math.min(...vals);
  const worst = higherBetter ? Math.min(...vals) : Math.max(...vals);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{title}</div>
      <div className="h-40 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={40} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
              {data.map((d, i) => {
                const v = d[dataKey];
                const color = v === best ? "hsl(var(--success))" : v === worst ? "hsl(var(--destructive))" : "hsl(var(--warning))";
                return <Cell key={i} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
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
