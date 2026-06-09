import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Trash2, Check, Star } from "lucide-react";
import { toast } from "sonner";
import type { FinanceScenario, Property, Sondertilgung, Tilgungsart, ZahlungsIntervall } from "@/lib/types";
import { calcAmortizationSchedule, fmtEUR, makeFinanceScenario } from "@/lib/calc";
import { useStore } from "@/lib/store";

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
              className={`text-xs rounded-full border px-3 py-1.5 inline-flex items-center gap-1 ${selId === s.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {p.activeFinanceId === s.id && <Star className="size-3 fill-current" />}
              {s.name}
            </button>
          ))}
          <button onClick={addScenario} className="text-xs rounded-full border px-3 py-1.5 inline-flex items-center gap-1 hover:bg-accent">
            <Plus className="size-3" /> Szenario
          </button>
        </div>
        {current && p.activeFinanceId !== current.id && (
          <button onClick={() => setActive(current.id)} className="text-xs rounded-md border px-3 py-1.5 inline-flex items-center gap-1 hover:bg-accent">
            <Check className="size-3" /> Als aktives Szenario übernehmen
          </button>
        )}
      </div>

      {!current ? (
        <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">
          Noch keine Finanzierung. Lege ein Szenario an.
        </div>
      ) : (
        <ScenarioEditor scn={current} onChange={(patch) => updateScn(current.id, patch)} onDelete={() => removeScn(current.id)} />
      )}

      {scenarios.length >= 2 && <CompareChart scenarios={scenarios} />}
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
        <Fld label="Name"><Inp v={scn.name} onChange={(v) => onChange({ name: v })} /></Fld>
        <Fld label="Bank"><Inp v={scn.bankName ?? ""} onChange={(v) => onChange({ bankName: v })} /></Fld>
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

function CompareChart({ scenarios }: { scenarios: FinanceScenario[] }) {
  const data = useMemo(() => {
    const allYears = new Set<number>();
    const schedules = scenarios.map((s) => calcAmortizationSchedule(s));
    schedules.forEach((s) => s.forEach((y) => allYears.add(y.year)));
    const years = [...allYears].sort((a, b) => a - b);
    return years.map((y) => {
      const row: any = { year: y };
      scenarios.forEach((s, i) => {
        const sched = schedules[i];
        const entry = sched.find((x) => x.year === y);
        row[s.name] = entry ? Math.round(entry.balanceEnd) : null;
      });
      return row;
    });
  }, [scenarios]);
  const colors = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--muted-foreground))"];
  return (
    <div>
      <div className="text-sm font-medium mb-2">Vergleich Restschuld</div>
      <div className="h-56">
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {scenarios.map((s, i) => (
              <Line key={s.id} type="monotone" dataKey={s.name} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
            ))}
          </ComposedChart>
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
