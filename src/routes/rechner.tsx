import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcProperty, fmtEUR, pmt } from "@/lib/calc";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/rechner")({
  head: () => ({ meta: [{ title: "Cashflow-Rechner – Immo Invest CRM" }] }),
  component: Rechner,
});

function Rechner() {
  const { properties } = useStore();
  const project = useActiveProject();
  const a = useActiveAssumptions();
  const list = properties.filter((p) => p.projectId === project.id);
  const [selId, setSelId] = useState<string>("");
  const sel = list.find((p) => p.id === selId);
  const seed = sel ? calcProperty(sel, a) : null;

  const [kaufpreis, setKaufpreis] = useState<number>(sel?.kaufpreis ?? 300000);
  const [ek, setEk] = useState<number>(a.eigenkapital);
  const [zins, setZins] = useState<number>(a.zinssatz * 100);
  const [laufzeit, setLaufzeit] = useState<number>(a.laufzeit);
  const [bkNichtUml, setBkNichtUml] = useState<number>(seed?.nichtUmlMtl ?? 50);
  const [ruecklage, setRuecklage] = useState<number>(seed?.ruecklageMtl ?? 60);
  const [leerstand, setLeerstand] = useState<number>(a.leerstandPuffer * 100);
  const [sonst, setSonst] = useState<number>(0);
  const [minCf, setMinCf] = useState<number>(0);
  const [wfl, setWfl] = useState<number>(sel?.wohnflaecheM2 ?? 50);
  const [aktMiete, setAktMiete] = useState<number>(sel?.nettomieteMtl ?? 0);

  const result = useMemo(() => {
    const kredit = Math.max(0, kaufpreis - ek);
    const rate = pmt(zins / 100 / 12, laufzeit * 12, kredit);
    const lPct = leerstand / 100;
    const fix = rate + bkNichtUml + ruecklage + sonst + minCf;
    const required = fix / Math.max(0.0001, 1 - lPct);
    const requiredPerM2 = wfl > 0 ? required / wfl : 0;
    const cfBeiAkt = aktMiete - rate - bkNichtUml - ruecklage - sonst - aktMiete * lPct;
    const cfBeiReq = required - rate - bkNichtUml - ruecklage - sonst - required * lPct;
    const diff = required - aktMiete;
    const warn = wfl > 0 && requiredPerM2 > 30;
    return { rate, required, requiredPerM2, cfBeiAkt, cfBeiReq, diff, warn, kredit };
  }, [kaufpreis, ek, zins, laufzeit, bkNichtUml, ruecklage, leerstand, sonst, minCf, wfl, aktMiete]);

  const loadFrom = (id: string) => {
    setSelId(id);
    const p = list.find((x) => x.id === id);
    if (!p) return;
    const c = calcProperty(p, a);
    setKaufpreis(p.kaufpreis ?? 0);
    setBkNichtUml(c.nichtUmlMtl);
    setRuecklage(c.ruecklageMtl);
    setWfl(p.wohnflaecheM2 ?? 0);
    setAktMiete(p.nettomieteMtl ?? 0);
  };

  return (
    <AppShell>
      <PageHeader title="Cashflow-Break-even-Rechner" description="Wie hoch muss die Miete sein, damit der Cashflow positiv ist?" />

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Daten aus Immobilie laden:</label>
        <select value={selId} onChange={(e) => loadFrom(e.target.value)} className="rounded-md border bg-background px-3 py-1.5 text-sm">
          <option value="">— frei rechnen —</option>
          {list.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="font-semibold">Eingaben</div>
          {[
            ["Kaufpreis €", kaufpreis, setKaufpreis],
            ["Eigenkapital €", ek, setEk],
            ["Zinssatz %", zins, setZins],
            ["Laufzeit Jahre", laufzeit, setLaufzeit],
            ["BK nicht umlagefähig €/M", bkNichtUml, setBkNichtUml],
            ["Rücklage €/M", ruecklage, setRuecklage],
            ["Leerstandspuffer %", leerstand, setLeerstand],
            ["Sonstige Kosten €/M", sonst, setSonst],
            ["Gewünschter Mindest-Cashflow €/M", minCf, setMinCf],
            ["Wohnfläche m²", wfl, setWfl],
            ["Aktuelle geschätzte Miete €/M", aktMiete, setAktMiete],
          ].map(([label, val, set]: any) => (
            <label key={label} className="block text-sm">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <input type="number" value={val} onChange={(e) => set(Number(e.target.value))} className="w-full rounded border bg-background px-3 py-2 text-sm" />
            </label>
          ))}
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="font-semibold">Ergebnis</div>
          <Row label="Kreditbetrag" value={fmtEUR(result.kredit)} />
          <Row label="Monatliche Kreditrate" value={fmtEUR(result.rate)} />
          <Row label="Benötigte Mindestmiete netto" value={fmtEUR(result.required)} big />
          <Row label="Benötigte Miete pro m²" value={`${result.requiredPerM2.toFixed(2)} €/m²`} />
          <Row label="Aktuelle Miete" value={fmtEUR(aktMiete)} />
          <Row label="Differenz zur aktuellen Miete" value={fmtEUR(result.diff)} tone={result.diff > 0 ? "bad" : "good"} />
          <Row label="Cashflow bei aktueller Miete" value={fmtEUR(result.cfBeiAkt)} tone={result.cfBeiAkt >= 0 ? "good" : "bad"} />
          <Row label="Cashflow bei Mindestmiete" value={fmtEUR(result.cfBeiReq)} tone="good" />
          {result.warn && (
            <div className="mt-3 rounded-md bg-destructive/10 text-destructive p-3 text-xs">
              Achtung: Die benötigte Miete pro m² übersteigt {30} €/m² – das ist in Wien für die meisten Lagen unrealistisch. Überlege Kaufpreisreduktion oder mehr Eigenkapital.
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Formel: Mindestmiete = (Kreditrate + nicht-umlagefähige BK + Rücklage + sonstige Kosten + Mindest-Cashflow) / (1 − Leerstandsquote)
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, big, tone }: { label: string; value: string; big?: boolean; tone?: "good" | "bad" }) {
  return (
    <div className="flex items-baseline justify-between border-b last:border-0 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-semibold ${big ? "text-lg" : ""} ${tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}
