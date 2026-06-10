import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcProperty, fmtEUR, fmtPct, pmt } from "@/lib/calc";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Coins, Home, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import type { Property } from "@/lib/types";

export const Route = createFileRoute("/rechner")({
  head: () => ({ meta: [{ title: "Rechner – Immo Invest" }] }),
  component: RechnerHub,
});

function RechnerHub() {
  const { properties } = useStore();
  const project = useActiveProject();
  const a = useActiveAssumptions();
  const list = properties.filter((p) => p.projectId === project.id && p.status !== "Gekauft");
  const [selId, setSelId] = useState<string>("");
  const sel = list.find((p) => p.id === selId);

  return (
    <AppShell>
      <PageHeader
        title="Rechner"
        description="Schnelle Antworten auf einzelne Fragen – ohne gleich eine ganze Immobilie analysieren zu müssen."
      />

      <div className="mb-5 rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm font-medium">Daten vorausfüllen:</div>
        <select
          value={selId}
          onChange={(e) => setSelId(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm flex-1 max-w-sm"
        >
          <option value="">— manuell eingeben —</option>
          {list.map((p) => (
            <option key={p.id} value={p.id}>{p.title || "Ohne Titel"}</option>
          ))}
        </select>
        {sel && <div className="text-xs text-muted-foreground">Werte werden aus „{sel.title}" übernommen.</div>}
      </div>

      <Tabs defaultValue="nebenkosten" className="w-full">
        <TabsList className="h-auto p-1 bg-muted/60 flex-wrap">
          <TabsTrigger value="nebenkosten" className="gap-1.5"><Coins className="size-3.5" />Kaufnebenkosten</TabsTrigger>
          <TabsTrigger value="finanzierung" className="gap-1.5"><Wallet className="size-3.5" />Finanzierung</TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-1.5"><Home className="size-3.5" />Miete & Cashflow</TabsTrigger>
          <TabsTrigger value="rendite" className="gap-1.5"><TrendingUp className="size-3.5" />Rendite</TabsTrigger>
          <TabsTrigger value="breakeven" className="gap-1.5"><Calculator className="size-3.5" />Break-even-Miete</TabsTrigger>
          <TabsTrigger value="leistbar" className="gap-1.5"><PiggyBank className="size-3.5" />Leistbarkeit</TabsTrigger>
        </TabsList>

        <TabsContent value="nebenkosten" className="mt-5"><NebenkostenCalc sel={sel} /></TabsContent>
        <TabsContent value="finanzierung" className="mt-5"><FinanceCalc sel={sel} a={a} /></TabsContent>
        <TabsContent value="cashflow" className="mt-5"><CashflowCalc sel={sel} a={a} /></TabsContent>
        <TabsContent value="rendite" className="mt-5"><RenditeCalc sel={sel} a={a} /></TabsContent>
        <TabsContent value="breakeven" className="mt-5"><BreakEvenCalc sel={sel} a={a} /></TabsContent>
        <TabsContent value="leistbar" className="mt-5"><LeistbarkeitCalc a={a} /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ───────── Shared UI ───────── */

function CalcShell({ title, hint, result, children }: { title: string; hint?: string; result: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 rounded-2xl border bg-card p-6">
        <div className="text-base font-semibold tracking-tight">{title}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        <div className="mt-4 space-y-3">{children}</div>
      </div>
      <div className="lg:col-span-3 rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-6">
        {result}
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, suffix, step }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 focus-within:ring-2 ring-ring/40">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 outline-none bg-transparent text-sm tabular-nums"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function Big({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const c = tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "";
  return (
    <div>
      <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
      <div className={`text-3xl font-semibold tabular-nums mt-1 ${c}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="flex items-baseline justify-between border-b last:border-0 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-medium text-sm tabular-nums ${tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

/* ───────── 1. Kaufnebenkosten ───────── */

function NebenkostenCalc({ sel }: { sel?: Property }) {
  const [kp, setKp] = useState<number>(sel?.kaufpreis ?? 300000);
  const [land, setLand] = useState<"AT" | "DE">(((sel?.land ?? "").toLowerCase().startsWith("de")) ? "DE" : "AT");
  const [maklerPct, setMaklerPct] = useState<number>(sel?.provisionPct != null ? sel.provisionPct * 100 : 3);
  const [grestPct, setGrestPct] = useState<number>(land === "DE" ? 5 : 3.5);
  const [gbPct, setGbPct] = useState<number>(1.1);
  const [vertragPct, setVertragPct] = useState<number>(1.5);
  const [sonst, setSonst] = useState<number>(0);

  const makler = kp * (maklerPct / 100) * 1.20;
  const grest = kp * (grestPct / 100);
  const gb = kp * (gbPct / 100);
  const vertrag = kp * (vertragPct / 100);
  const total = makler + grest + gb + vertrag + sonst;
  const gesamt = kp + total;

  return (
    <CalcShell
      title="Kaufnebenkosten-Rechner"
      hint="Makler, Grunderwerbsteuer, Grundbuch, Vertragserrichtung und sonstige Kosten."
      result={
        <div className="space-y-5">
          <Big label="Nebenkosten gesamt" value={fmtEUR(total)} />
          <div className="text-xs text-muted-foreground">≈ {((total / kp) * 100).toFixed(1)}% des Kaufpreises</div>
          <div className="border-t pt-3">
            <Row label="Maklerprovision (brutto)" value={fmtEUR(makler)} />
            <Row label="Grunderwerbsteuer" value={fmtEUR(grest)} />
            <Row label="Grundbucheintragung" value={fmtEUR(gb)} />
            <Row label="Vertrag / Notar" value={fmtEUR(vertrag)} />
            <Row label="Sonstiges" value={fmtEUR(sonst)} />
          </div>
          <div className="rounded-xl bg-primary/10 p-4">
            <div className="text-xs text-primary font-medium">Gesamtkosten beim Kauf</div>
            <div className="text-2xl font-semibold tabular-nums">{fmtEUR(gesamt)}</div>
          </div>
        </div>
      }
    >
      <NumField label="Kaufpreis" value={kp} onChange={setKp} suffix="€" />
      <label className="block">
        <div className="text-xs font-medium text-muted-foreground mb-1">Land</div>
        <select value={land} onChange={(e) => { const v = e.target.value as "AT" | "DE"; setLand(v); setGrestPct(v === "DE" ? 5 : 3.5); }} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="AT">Österreich</option>
          <option value="DE">Deutschland</option>
        </select>
      </label>
      <NumField label="Maklerprovision (netto)" value={maklerPct} onChange={setMaklerPct} suffix="%" step={0.1} />
      <NumField label="Grunderwerbsteuer" value={grestPct} onChange={setGrestPct} suffix="%" step={0.1} />
      <NumField label="Grundbucheintragung" value={gbPct} onChange={setGbPct} suffix="%" step={0.1} />
      <NumField label="Vertrag / Notar" value={vertragPct} onChange={setVertragPct} suffix="%" step={0.1} />
      <NumField label="Sonstige Kosten" value={sonst} onChange={setSonst} suffix="€" />
    </CalcShell>
  );
}

/* ───────── 2. Finanzierung ───────── */

function FinanceCalc({ sel, a }: { sel?: Property; a: ReturnType<typeof useActiveAssumptions> }) {
  const [kp, setKp] = useState<number>(sel?.kaufpreis ?? 300000);
  const [ek, setEk] = useState<number>(a.eigenkapital);
  const [zins, setZins] = useState<number>(a.zinssatz * 100);
  const [laufzeit, setLaufzeit] = useState<number>(a.laufzeit);

  const kredit = Math.max(0, kp - ek);
  const rate = pmt(zins / 100 / 12, laufzeit * 12, kredit);
  const gesamtZahlung = rate * laufzeit * 12;
  const zinsenTotal = gesamtZahlung - kredit;

  // Restschuld nach 10 Jahren
  const restschuld10 = (() => {
    let bal = kredit;
    const r = zins / 100 / 12;
    for (let i = 0; i < Math.min(10 * 12, laufzeit * 12); i++) {
      const zinsAnteil = bal * r;
      const tilg = rate - zinsAnteil;
      bal = Math.max(0, bal - tilg);
    }
    return bal;
  })();

  return (
    <CalcShell
      title="Finanzierungsrechner"
      hint="Kreditbetrag, monatliche Rate und Restschuld auf einen Blick."
      result={
        <div className="space-y-5">
          <Big label="Monatliche Rate" value={fmtEUR(rate)} />
          <div className="border-t pt-3">
            <Row label="Kreditbetrag" value={fmtEUR(kredit)} />
            <Row label="Zinssatz" value={`${zins.toFixed(2)} %`} />
            <Row label="Laufzeit" value={`${laufzeit} Jahre`} />
            <Row label="Zinskosten gesamt" value={fmtEUR(zinsenTotal)} />
            <Row label="Restschuld nach 10 Jahren" value={fmtEUR(restschuld10)} />
          </div>
        </div>
      }
    >
      <NumField label="Kaufpreis + Nebenkosten" value={kp} onChange={setKp} suffix="€" />
      <NumField label="Eigenkapital" value={ek} onChange={setEk} suffix="€" />
      <NumField label="Zinssatz p.a." value={zins} onChange={setZins} suffix="%" step={0.1} />
      <NumField label="Laufzeit" value={laufzeit} onChange={setLaufzeit} suffix="Jahre" />
    </CalcShell>
  );
}

/* ───────── 3. Cashflow ───────── */

function CashflowCalc({ sel, a }: { sel?: Property; a: ReturnType<typeof useActiveAssumptions> }) {
  const seed = sel ? calcProperty(sel, a) : null;
  const [miete, setMiete] = useState<number>(sel?.nettomieteMtl ?? 900);
  const [rate, setRate] = useState<number>(Math.round(seed?.kreditRateMtl ?? 700));
  const [bk, setBk] = useState<number>(Math.round(seed?.nichtUmlMtl ?? 50));
  const [ruecklage, setRuecklage] = useState<number>(Math.round(seed?.ruecklageMtl ?? 60));
  const [leerstand, setLeerstand] = useState<number>((a.leerstandPuffer ?? 0.04) * 100);

  const leerstandEUR = miete * (leerstand / 100);
  const cf = miete - rate - bk - ruecklage - leerstandEUR;

  return (
    <CalcShell
      title="Miet- & Cashflow-Rechner"
      hint="Was bleibt jeden Monat übrig – nach Kreditrate, Betriebskosten, Rücklage und Leerstand."
      result={
        <div className="space-y-5">
          <Big label="Geldfluss pro Monat" value={fmtEUR(cf)} tone={cf >= 0 ? "good" : "bad"} />
          <div className="text-xs text-muted-foreground">{cf >= 0 ? "Die Immobilie läuft monatlich positiv." : "Die Immobilie läuft monatlich negativ – du müsstest zuzahlen."}</div>
          <div className="border-t pt-3">
            <Row label="Mieteinnahmen" value={fmtEUR(miete)} tone="good" />
            <Row label="− Kreditrate" value={fmtEUR(rate)} />
            <Row label="− Betriebskosten (nicht umlegbar)" value={fmtEUR(bk)} />
            <Row label="− Rücklage" value={fmtEUR(ruecklage)} />
            <Row label="− Leerstandspuffer" value={fmtEUR(leerstandEUR)} />
          </div>
        </div>
      }
    >
      <NumField label="Erwartete Nettomiete" value={miete} onChange={setMiete} suffix="€/M" />
      <NumField label="Kreditrate" value={rate} onChange={setRate} suffix="€/M" />
      <NumField label="Betriebskosten (nicht umlegbar)" value={bk} onChange={setBk} suffix="€/M" />
      <NumField label="Rücklage" value={ruecklage} onChange={setRuecklage} suffix="€/M" />
      <NumField label="Leerstandspuffer" value={leerstand} onChange={setLeerstand} suffix="%" step={0.5} />
    </CalcShell>
  );
}

/* ───────── 4. Rendite ───────── */

function RenditeCalc({ sel, a }: { sel?: Property; a: ReturnType<typeof useActiveAssumptions> }) {
  const seed = sel ? calcProperty(sel, a) : null;
  const [kp, setKp] = useState<number>(sel?.kaufpreis ?? 300000);
  const [nk, setNk] = useState<number>(Math.round(seed?.kaufNebenkosten ?? kp * 0.1));
  const [ek, setEk] = useState<number>(a.eigenkapital);
  const [miete, setMiete] = useState<number>(sel?.nettomieteMtl ?? 900);
  const [bk, setBk] = useState<number>(Math.round(seed?.nichtUmlMtl ?? 50));
  const [ruecklage, setRuecklage] = useState<number>(Math.round(seed?.ruecklageMtl ?? 60));

  const jahresmiete = miete * 12;
  const brutto = kp > 0 ? jahresmiete / kp : 0;
  const gesamtkosten = kp + nk;
  const netto = gesamtkosten > 0 ? (jahresmiete - (bk + ruecklage) * 12) / gesamtkosten : 0;
  const ekRendite = ek > 0 ? (jahresmiete - (bk + ruecklage) * 12) / ek : 0;

  return (
    <CalcShell
      title="Rendite-Rechner"
      hint="Brutto-, Netto- und Eigenkapitalrendite – jährlich in Prozent."
      result={
        <div className="space-y-5">
          <Big label="Bruttorendite" value={fmtPct(brutto)} />
          <div className="border-t pt-3">
            <Row label="Nettorendite" value={fmtPct(netto)} />
            <Row label="Eigenkapitalrendite" value={fmtPct(ekRendite)} />
            <Row label="Jahresnettomiete" value={fmtEUR(jahresmiete)} />
            <Row label="Gesamtinvestition" value={fmtEUR(gesamtkosten)} />
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            Brutto = Jahresmiete / Kaufpreis. Netto = (Jahresmiete − Kosten) / Gesamtinvestition. EK-Rendite bezieht den Ertrag auf dein eingesetztes Eigenkapital.
          </p>
        </div>
      }
    >
      <NumField label="Kaufpreis" value={kp} onChange={setKp} suffix="€" />
      <NumField label="Nebenkosten" value={nk} onChange={setNk} suffix="€" />
      <NumField label="Eigenkapital" value={ek} onChange={setEk} suffix="€" />
      <NumField label="Nettomiete" value={miete} onChange={setMiete} suffix="€/M" />
      <NumField label="Betriebskosten" value={bk} onChange={setBk} suffix="€/M" />
      <NumField label="Rücklage" value={ruecklage} onChange={setRuecklage} suffix="€/M" />
    </CalcShell>
  );
}

/* ───────── 5. Break-even-Miete ───────── */

function BreakEvenCalc({ sel, a }: { sel?: Property; a: ReturnType<typeof useActiveAssumptions> }) {
  const seed = sel ? calcProperty(sel, a) : null;
  const [rate, setRate] = useState<number>(Math.round(seed?.kreditRateMtl ?? 700));
  const [bk, setBk] = useState<number>(Math.round(seed?.nichtUmlMtl ?? 50));
  const [ruecklage, setRuecklage] = useState<number>(Math.round(seed?.ruecklageMtl ?? 60));
  const [leerstand, setLeerstand] = useState<number>((a.leerstandPuffer ?? 0.04) * 100);
  const [wfl, setWfl] = useState<number>(sel?.wohnflaecheM2 ?? 50);
  const [aktMiete, setAktMiete] = useState<number>(sel?.nettomieteMtl ?? 0);

  const lPct = leerstand / 100;
  const fix = rate + bk + ruecklage;
  const required = fix / Math.max(0.0001, 1 - lPct);
  const perM2 = wfl > 0 ? required / wfl : 0;
  const diff = required - aktMiete;

  return (
    <CalcShell
      title="Break-even-Miete-Rechner"
      hint="Welche Miete brauchst du, damit die Immobilie monatlich nicht negativ läuft?"
      result={
        <div className="space-y-5">
          <Big label="Benötigte Miete" value={fmtEUR(required)} />
          <div className="text-xs text-muted-foreground">≈ {perM2.toFixed(2)} €/m²</div>
          <div className="border-t pt-3">
            <Row label="Aktuelle Miete" value={fmtEUR(aktMiete)} />
            <Row label="Differenz" value={fmtEUR(diff)} tone={diff > 0 ? "bad" : "good"} />
          </div>
          {perM2 > 30 && (
            <div className="rounded-md bg-destructive/10 text-destructive p-3 text-xs">
              Über 30 €/m² ist in den meisten Lagen unrealistisch. Überlege Kaufpreisreduktion oder mehr Eigenkapital.
            </div>
          )}
        </div>
      }
    >
      <NumField label="Kreditrate" value={rate} onChange={setRate} suffix="€/M" />
      <NumField label="Betriebskosten" value={bk} onChange={setBk} suffix="€/M" />
      <NumField label="Rücklage" value={ruecklage} onChange={setRuecklage} suffix="€/M" />
      <NumField label="Leerstandspuffer" value={leerstand} onChange={setLeerstand} suffix="%" step={0.5} />
      <NumField label="Wohnfläche" value={wfl} onChange={setWfl} suffix="m²" />
      <NumField label="Aktuelle Miete" value={aktMiete} onChange={setAktMiete} suffix="€/M" />
    </CalcShell>
  );
}

/* ───────── 6. Leistbarkeit ───────── */

function LeistbarkeitCalc({ a }: { a: ReturnType<typeof useActiveAssumptions> }) {
  const [ek, setEk] = useState<number>(a.eigenkapital);
  const [zins, setZins] = useState<number>(a.zinssatz * 100);
  const [laufzeit, setLaufzeit] = useState<number>(a.laufzeit);
  const [rate, setRate] = useState<number>(900);
  const [nkPct, setNkPct] = useState<number>(10);

  // Kreditbetrag aus Wunschrate
  const r = zins / 100 / 12;
  const n = laufzeit * 12;
  const kredit = r === 0 ? rate * n : (rate * (1 - Math.pow(1 + r, -n))) / r;
  // gesamtkosten = ek + kredit; gesamtkosten = kp * (1 + nkPct/100)
  const gesamt = ek + kredit;
  const maxKp = gesamt / (1 + nkPct / 100);
  const nk = gesamt - maxKp;

  return (
    <CalcShell
      title="Leistbarkeitsrechner"
      hint="Welchen Kaufpreis kannst du dir bei deiner Wunsch-Monatsrate leisten?"
      result={
        <div className="space-y-5">
          <Big label="Maximaler Kaufpreis" value={fmtEUR(maxKp)} />
          <div className="border-t pt-3">
            <Row label="Eigenkapital" value={fmtEUR(ek)} />
            <Row label="Kreditbetrag" value={fmtEUR(kredit)} />
            <Row label="Kaufnebenkosten" value={fmtEUR(nk)} />
            <Row label="Gesamtkosten" value={fmtEUR(gesamt)} />
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            Annahme: Du bringst dein Eigenkapital ein und finanzierst den Rest mit der gewählten Monatsrate über die Laufzeit.
          </p>
        </div>
      }
    >
      <NumField label="Eigenkapital" value={ek} onChange={setEk} suffix="€" />
      <NumField label="Wunsch-Monatsrate" value={rate} onChange={setRate} suffix="€/M" />
      <NumField label="Zinssatz p.a." value={zins} onChange={setZins} suffix="%" step={0.1} />
      <NumField label="Laufzeit" value={laufzeit} onChange={setLaufzeit} suffix="Jahre" />
      <NumField label="Nebenkosten" value={nkPct} onChange={setNkPct} suffix="%" step={0.5} />
    </CalcShell>
  );
}
