import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  PublicCalcLayout,
  NumInput,
  SelectInput,
  BigResult,
  ResultRow,
  buildFaqJsonLd,
  type CalcFaqItem,
} from "@/components/marketing/PublicCalcLayout";
import { fmtEUR, fmtPct, pmt } from "@/lib/calc";
import { MarketingShell } from "@/components/marketing/MarketingShell";

type CalcSlug = "kaufnebenkosten" | "rendite" | "cashflow" | "finanzierung" | "breakeven" | "leistbarkeit" | "fixflip";

type CalcMeta = {
  title: string;
  description: string;
  category: string;
  h1: string;
  intro: string;
  faq: CalcFaqItem[];
};

const META: Record<CalcSlug, CalcMeta> = {
  kaufnebenkosten: {
    title: "Kaufnebenkosten-Rechner Österreich & Deutschland | kauf ma",
    description: "Berechne Grunderwerbsteuer, Notar, Makler und Grundbuch beim Immobilienkauf. Für Österreich und Deutschland, kostenlos online.",
    category: "Kaufnebenkosten",
    h1: "Kaufnebenkosten-Rechner für Immobilien",
    intro: "Berechne in Sekunden, was beim Immobilienkauf zusätzlich zum Kaufpreis dazukommt – Grunderwerbsteuer, Notar, Grundbuch, Makler und mehr.",
    faq: [
      { q: "Wie hoch sind die Kaufnebenkosten in Österreich?", a: "Typischerweise rund 9–11 % des Kaufpreises: 3,5 % Grunderwerbsteuer, 1,1 % Grundbuch, Vertragserrichtung und ggf. Maklerprovision." },
      { q: "Wie hoch sind die Kaufnebenkosten in Deutschland?", a: "Je nach Bundesland 8–12 %: 3,5–6,5 % Grunderwerbsteuer, ca. 1,5 % Notar, 0,5 % Grundbuch und ggf. Makler." },
      { q: "Werden Kaufnebenkosten mitfinanziert?", a: "Viele Banken finanzieren die Nebenkosten nicht mit. Plane sie als Eigenkapital ein." },
    ],
  },
  rendite: {
    title: "Rendite-Rechner für Immobilien: Brutto, Netto & EK-Rendite | kauf ma",
    description: "Berechne Bruttorendite, Nettorendite und Eigenkapitalrendite deiner Anlageimmobilie. Kostenlos, ohne Anmeldung.",
    category: "Rendite",
    h1: "Renditerechner für Immobilien",
    intro: "Bruttorendite, Nettorendite und Eigenkapitalrendite auf einen Blick – ehrlich kalkuliert inklusive Kaufnebenkosten und laufender Kosten.",
    faq: [
      { q: "Was ist eine gute Rendite bei Immobilien?", a: "Pauschal nicht beantwortbar. In A-Lagen sind 2–3 % Nettorendite normal, in B/C-Lagen oft 4–6 %. Wichtig ist das Verhältnis zum Risiko." },
      { q: "Worin unterscheiden sich Brutto- und Nettorendite?", a: "Bruttorendite = Jahresmiete / Kaufpreis. Nettorendite berücksichtigt Kaufnebenkosten und laufende, nicht umlagefähige Kosten." },
      { q: "Was sagt die Eigenkapitalrendite?", a: "Sie zeigt den Ertrag bezogen auf das tatsächlich eingesetzte Eigenkapital. Mit Fremdkapital lässt sich diese hebeln." },
    ],
  },
  cashflow: {
    title: "Cashflow-Rechner für Immobilien online | kauf ma",
    description: "Berechne monatlichen und jährlichen Cashflow deiner Vermietung – inklusive Kreditrate, Betriebskosten, Rücklage und Leerstand.",
    category: "Cashflow",
    h1: "Cashflow-Rechner für Immobilien",
    intro: "Was bleibt monatlich nach Kreditrate, Rücklagen und Leerstand übrig? Der Cashflow-Rechner zeigt es dir und sagt dir, ab welcher Miete du positiv bist.",
    faq: [
      { q: "Ist negativer Cashflow immer schlecht?", a: "Nein – nur, wenn dein Einkommen ihn nicht dauerhaft tragen kann. Manche Käufer akzeptieren ihn für Tilgungsgewinn und Wertsteigerung." },
      { q: "Wie hoch sollte die Rücklage sein?", a: "Faustregel: 1 €/m²/Monat für Instandhaltung, bei älteren Objekten auch mehr." },
      { q: "Was ist die Break-even-Miete?", a: "Die Miete, ab der dein Cashflow null ist – darüber bleibt monatlich Geld übrig, darunter musst du zuzahlen." },
    ],
  },
  finanzierung: {
    title: "Finanzierungsrechner für Immobilien | kauf ma",
    description: "Berechne monatliche Kreditrate, Restschuld und Gesamtzinskosten für deine Immobilienfinanzierung. Kostenlos online.",
    category: "Finanzierung",
    h1: "Finanzierungsrechner für Immobilien",
    intro: "Monatliche Rate, Restschuld nach 10 Jahren und Gesamtzinskosten auf einen Blick – mit realistischen Annahmen.",
    faq: [
      { q: "Wie hoch sollte die monatliche Rate sein?", a: "Eine Faustregel: max. 30–35 % deines Nettoeinkommens. So bleibt Puffer für Rücklagen und unerwartete Kosten." },
      { q: "Was ist die Restschuld nach 10 Jahren?", a: "Der noch offene Kreditbetrag nach 10 Jahren Annuitätentilgung. Wichtig für Anschlussfinanzierung." },
      { q: "Werden die Kaufnebenkosten mitfinanziert?", a: "Viele Banken verlangen, dass Nebenkosten aus Eigenkapital gezahlt werden. Erkundige dich bei deiner Bank." },
    ],
  },
  breakeven: {
    title: "Break-even-Miete-Rechner | kauf ma",
    description: "Berechne die Mindestmiete, ab der deine Immobilie monatlich nicht negativ läuft. Kostenlos online.",
    category: "Break-even-Miete",
    h1: "Break-even-Miete-Rechner",
    intro: "Welche Miete brauchst du mindestens, damit Kreditrate, Betriebskosten und Rücklage gedeckt sind?",
    faq: [
      { q: "Was bedeutet Break-even-Miete?", a: "Die Miete, ab der Einnahmen und Ausgaben ausgeglichen sind – darüber verdienst du, darunter zahlst du zu." },
      { q: "Wie realistisch ist eine Break-even-Miete über 30 €/m²?", a: "In den meisten Lagen unrealistisch. Überlege Kaufpreisreduktion, mehr Eigenkapital oder eine andere Immobilie." },
      { q: "Ist Tilgung im Break-even enthalten?", a: "Ja – die monatliche Kreditrate beinhaltet Zins und Tilgung. Beides fließt monatlich ab." },
    ],
  },
  leistbarkeit: {
    title: "Leistbarkeitsrechner für Immobilien | kauf ma",
    description: "Berechne den maximalen Kaufpreis, den du dir bei deiner Wunsch-Monatsrate leisten kannst. Kostenlos online.",
    category: "Leistbarkeit",
    h1: "Leistbarkeitsrechner für Immobilien",
    intro: "Welchen Kaufpreis kannst du dir bei deinem Eigenkapital und deiner Wunsch-Monatsrate über die Laufzeit leisten?",
    faq: [
      { q: "Wie funktioniert der Leistbarkeitsrechner?", a: "Er berechnet aus Monatsrate, Zinssatz und Laufzeit den maximalen Kreditbetrag und addiert dein Eigenkapital." },
      { q: "Sind Kaufnebenkosten enthalten?", a: "Ja – du kannst einen Prozentsatz für Nebenkosten angeben, der vom Gesamtbudget abgezogen wird." },
      { q: "Was passiert bei steigenden Zinsen?", a: "Bei gleicher Rate sinkt der Kaufpreis. Teste verschiedene Szenarien, um das Risiko einzuschätzen." },
    ],
  },
};

const VALID: CalcSlug[] = ["kaufnebenkosten", "rendite", "cashflow", "finanzierung", "breakeven", "leistbarkeit"];

function isCalcSlug(v: string): v is CalcSlug {
  return (VALID as string[]).includes(v);
}

export const Route = createFileRoute("/rechner/$slug")({
  loader: ({ params }): { slug: CalcSlug } => {
    if (!isCalcSlug(params.slug)) throw notFound();
    return { slug: params.slug };
  },
  head: ({ params }) => {
    if (!isCalcSlug(params.slug)) return { meta: [] };
    const m = META[params.slug];
    const url = `/rechner/${params.slug}`;
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.title },
        { property: "og:description", content: m.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: buildFaqJsonLd(m.faq),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <MarketingShell>
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="text-3xl font-bold">Rechner nicht gefunden</h1>
        <a href="/rechner" className="inline-block mt-6 text-primary underline">Zur Rechner-Übersicht</a>
      </div>
    </MarketingShell>
  ),
  component: CalcPage,
});

function CalcPage() {
  const { slug } = Route.useLoaderData();
  if (slug === "kaufnebenkosten") return <KaufNebenCalculator />;
  if (slug === "rendite") return <RenditeCalculator />;
  if (slug === "cashflow") return <CashflowCalculator />;
  if (slug === "finanzierung") return <FinanceCalculator />;
  if (slug === "breakeven") return <BreakEvenCalculator />;
  return <LeistbarkeitCalculator />;
}

/* ───────── Kaufnebenkosten ───────── */

function KaufNebenCalculator() {
  const meta = META.kaufnebenkosten;
  const [land, setLand] = useState<"AT" | "DE">("AT");
  const [region, setRegion] = useState("");
  const [kp, setKp] = useState(300000);
  const [maklerPct, setMaklerPct] = useState(3);
  const [grestPct, setGrestPct] = useState(3.5);
  const [gbPct, setGbPct] = useState(1.1);
  const [vertragPct, setVertragPct] = useState(1.5);
  const [sonst, setSonst] = useState(0);

  const makler = kp * (maklerPct / 100) * 1.20;
  const grest = kp * (grestPct / 100);
  const gb = kp * (gbPct / 100);
  const vertrag = kp * (vertragPct / 100);
  const total = makler + grest + gb + vertrag + sonst;
  const gesamt = kp + total;
  const pct = kp > 0 ? (total / kp) * 100 : 0;

  return (
    <PublicCalcLayout
      category={meta.category}
      h1={meta.h1}
      intro={meta.intro}
      breadcrumbSlug="kaufnebenkosten"
      faq={meta.faq}
      snapshot={{
        type: "kaufnebenkosten",
        createdAt: new Date().toISOString(),
        inputs: { land, region, kp, maklerPct, vertragPct, gbPct, grestPct, sonst },
        result: { total, gesamt, pct },
      }}
      inputs={
        <>
          <SelectInput
            label="Land"
            value={land}
            onChange={(v) => { setLand(v); setGrestPct(v === "DE" ? 5 : 3.5); }}
            options={[
              { value: "AT", label: "Österreich" },
              { value: "DE", label: "Deutschland" },
            ]}
          />
          <label className="block">
            <div className="text-xs font-medium text-muted-foreground mb-1">Bundesland / Region (optional)</div>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={land === "AT" ? "z. B. Wien" : "z. B. Bayern"}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </label>
          <NumInput label="Kaufpreis" value={kp} onChange={setKp} suffix="€" />
          <NumInput label="Maklerprovision (netto)" value={maklerPct} onChange={setMaklerPct} suffix="%" step={0.1} />
          <NumInput label="Notar / Vertragserrichtung" value={vertragPct} onChange={setVertragPct} suffix="%" step={0.1} />
          <NumInput label="Grundbuch" value={gbPct} onChange={setGbPct} suffix="%" step={0.1} />
          <NumInput label="Grunderwerbsteuer" value={grestPct} onChange={setGrestPct} suffix="%" step={0.1} />
          <NumInput label="Sonstige Kosten" value={sonst} onChange={setSonst} suffix="€" />
        </>
      }
      result={
        <div className="space-y-5">
          <BigResult label="Kaufnebenkosten gesamt" value={fmtEUR(total)} />
          <div className="text-xs text-muted-foreground">≈ {pct.toFixed(1)} % des Kaufpreises</div>
          <div className="border-t pt-3">
            <ResultRow label="Maklerprovision (brutto)" value={fmtEUR(makler)} />
            <ResultRow label="Grunderwerbsteuer" value={fmtEUR(grest)} />
            <ResultRow label="Grundbucheintragung" value={fmtEUR(gb)} />
            <ResultRow label="Notar / Vertragserrichtung" value={fmtEUR(vertrag)} />
            <ResultRow label="Sonstiges" value={fmtEUR(sonst)} />
          </div>
          <div className="rounded-xl bg-primary/10 p-4">
            <div className="text-xs text-primary font-medium">Gesamtkosten beim Kauf</div>
            <div className="text-2xl font-semibold tabular-nums">{fmtEUR(gesamt)}</div>
          </div>
        </div>
      }
      explanation={
        <p>
          Die Kaufnebenkosten setzen sich aus Steuern, Gebühren und Provisionen zusammen. In Österreich sind 3,5 % Grunderwerbsteuer und 1,1 % Eintragungsgebühr fix; in Deutschland variiert die Grunderwerbsteuer je Bundesland zwischen 3,5 % und 6,5 %.
        </p>
      }
    />
  );
}

/* ───────── Rendite ───────── */

function RenditeCalculator() {
  const meta = META.rendite;
  const [kp, setKp] = useState(300000);
  const [nk, setNk] = useState(30000);
  const [jahresmiete, setJahresmiete] = useState(10800);
  const [laufend, setLaufend] = useState(1320);
  const [ek, setEk] = useState(80000);

  const brutto = kp > 0 ? jahresmiete / kp : 0;
  const gesamt = kp + nk;
  const netto = gesamt > 0 ? (jahresmiete - laufend) / gesamt : 0;
  const ekRendite = ek > 0 ? (jahresmiete - laufend) / ek : 0;

  return (
    <PublicCalcLayout
      category={meta.category}
      h1={meta.h1}
      intro={meta.intro}
      breadcrumbSlug="rendite"
      faq={meta.faq}
      snapshot={{
        type: "rendite",
        createdAt: new Date().toISOString(),
        inputs: { kp, nk, jahresmiete, laufend, ek },
        result: { brutto, netto, ekRendite },
      }}
      inputs={
        <>
          <NumInput label="Kaufpreis" value={kp} onChange={setKp} suffix="€" />
          <NumInput label="Kaufnebenkosten" value={nk} onChange={setNk} suffix="€" />
          <NumInput label="Jahresmiete (netto)" value={jahresmiete} onChange={setJahresmiete} suffix="€/Jahr" />
          <NumInput label="Laufende Kosten (nicht umlegbar)" value={laufend} onChange={setLaufend} suffix="€/Jahr" />
          <NumInput label="Eigenkapital" value={ek} onChange={setEk} suffix="€" />
        </>
      }
      result={
        <div className="space-y-5">
          <BigResult label="Bruttorendite" value={fmtPct(brutto)} />
          <div className="border-t pt-3">
            <ResultRow label="Nettorendite" value={fmtPct(netto)} />
            <ResultRow label="Eigenkapitalrendite" value={fmtPct(ekRendite)} />
            <ResultRow label="Jahresmiete" value={fmtEUR(jahresmiete)} />
            <ResultRow label="Gesamtinvestition" value={fmtEUR(gesamt)} />
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            <strong>Brutto</strong> = Jahresmiete ÷ Kaufpreis. <strong>Netto</strong> = (Jahresmiete − laufende Kosten) ÷ (Kaufpreis + Nebenkosten). <strong>EK-Rendite</strong> = Überschuss ÷ Eigenkapital.
          </p>
        </div>
      }
      explanation={
        <>
          <p>Drei Kennzahlen, drei Blickwinkel:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Bruttorendite</strong> – schnelle Hausnummer, ignoriert aber Kosten.</li>
            <li><strong>Nettorendite</strong> – die ehrliche Zahl, die du für Investitionsentscheidungen brauchst.</li>
            <li><strong>Eigenkapitalrendite</strong> – zeigt den Hebel-Effekt einer Finanzierung.</li>
          </ul>
        </>
      }
    />
  );
}

/* ───────── Cashflow ───────── */

function CashflowCalculator() {
  const meta = META.cashflow;
  const [miete, setMiete] = useState(900);
  const [rate, setRate] = useState(700);
  const [bk, setBk] = useState(50);
  const [ruecklage, setRuecklage] = useState(60);
  const [leerstand, setLeerstand] = useState(4);
  const [sonst, setSonst] = useState(0);

  const leerstandEUR = miete * (leerstand / 100);
  const cf = miete - rate - bk - ruecklage - leerstandEUR - sonst;
  const cfYear = cf * 12;
  const fix = rate + bk + ruecklage + sonst;
  const breakEven = fix / Math.max(0.0001, 1 - leerstand / 100);

  return (
    <PublicCalcLayout
      category={meta.category}
      h1={meta.h1}
      intro={meta.intro}
      breadcrumbSlug="cashflow"
      faq={meta.faq}
      snapshot={{
        type: "cashflow",
        createdAt: new Date().toISOString(),
        inputs: { miete, rate, bk, ruecklage, leerstand, sonst },
        result: { cfMonth: cf, cfYear, breakEven },
      }}
      inputs={
        <>
          <NumInput label="Erwartete Monatsmiete" value={miete} onChange={setMiete} suffix="€/M" />
          <NumInput label="Kreditrate" value={rate} onChange={setRate} suffix="€/M" />
          <NumInput label="Betriebskosten (nicht umlegbar)" value={bk} onChange={setBk} suffix="€/M" />
          <NumInput label="Rücklage / Instandhaltung" value={ruecklage} onChange={setRuecklage} suffix="€/M" />
          <NumInput label="Leerstandspuffer" value={leerstand} onChange={setLeerstand} suffix="%" step={0.5} />
          <NumInput label="Sonstige monatliche Kosten" value={sonst} onChange={setSonst} suffix="€/M" />
        </>
      }
      result={
        <div className="space-y-5">
          <BigResult label="Cashflow pro Monat" value={fmtEUR(cf)} tone={cf >= 0 ? "good" : "bad"} />
          <div className="text-xs text-muted-foreground">
            {cf >= 0 ? "Die Immobilie läuft monatlich positiv." : "Die Immobilie läuft monatlich negativ – du müsstest zuzahlen."}
          </div>
          <div className="border-t pt-3">
            <ResultRow label="Cashflow pro Jahr" value={fmtEUR(cfYear)} tone={cfYear >= 0 ? "good" : "bad"} />
            <ResultRow label="− Kreditrate" value={fmtEUR(rate)} />
            <ResultRow label="− Betriebskosten" value={fmtEUR(bk)} />
            <ResultRow label="− Rücklage" value={fmtEUR(ruecklage)} />
            <ResultRow label="− Leerstandspuffer" value={fmtEUR(leerstandEUR)} />
            <ResultRow label="− Sonstiges" value={fmtEUR(sonst)} />
          </div>
          <div className="rounded-xl bg-primary/10 p-4">
            <div className="text-xs text-primary font-medium">Benötigte Miete für Cashflow ≥ 0</div>
            <div className="text-2xl font-semibold tabular-nums">{fmtEUR(breakEven)}</div>
          </div>
        </div>
      }
      explanation={
        <p>
          Cashflow = Mieteinnahmen − alle laufenden Ausgaben. Tilgung ist Vermögensaufbau, fließt aber monatlich ab und gehört deshalb in die Rechnung. Plane immer einen realistischen Leerstandspuffer (3–5 %).
        </p>
      }
    />
  );
}

/* ───────── Finanzierung ───────── */

function FinanceCalculator() {
  const meta = META.finanzierung;
  const [kp, setKp] = useState(300000);
  const [ek, setEk] = useState(80000);
  const [zins, setZins] = useState(3.5);
  const [laufzeit, setLaufzeit] = useState(25);

  const kredit = Math.max(0, kp - ek);
  const rate = pmt(zins / 100 / 12, laufzeit * 12, kredit);
  const gesamtZahlung = rate * laufzeit * 12;
  const zinsenTotal = gesamtZahlung - kredit;

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
    <PublicCalcLayout
      category={meta.category}
      h1={meta.h1}
      intro={meta.intro}
      breadcrumbSlug="finanzierung"
      faq={meta.faq}
      snapshot={{
        type: "finanzierung",
        createdAt: new Date().toISOString(),
        inputs: { kp, ek, zins, laufzeit },
        result: { rate, kredit, zinsenTotal, restschuld10 },
      }}
      inputs={
        <>
          <NumInput label="Kaufpreis + Nebenkosten" value={kp} onChange={setKp} suffix="€" />
          <NumInput label="Eigenkapital" value={ek} onChange={setEk} suffix="€" />
          <NumInput label="Zinssatz p.a." value={zins} onChange={setZins} suffix="%" step={0.1} />
          <NumInput label="Laufzeit" value={laufzeit} onChange={setLaufzeit} suffix="Jahre" />
        </>
      }
      result={
        <div className="space-y-5">
          <BigResult label="Monatliche Rate" value={fmtEUR(rate)} />
          <div className="border-t pt-3">
            <ResultRow label="Kreditbetrag" value={fmtEUR(kredit)} />
            <ResultRow label="Zinssatz" value={`${zins.toFixed(2)} %`} />
            <ResultRow label="Laufzeit" value={`${laufzeit} Jahre`} />
            <ResultRow label="Zinskosten gesamt" value={fmtEUR(zinsenTotal)} />
            <ResultRow label="Restschuld nach 10 Jahren" value={fmtEUR(restschuld10)} />
          </div>
        </div>
      }
      explanation={
        <p>
          Die monatliche Rate wird als Annuität berechnet (gleichbleibende Rate aus Zins und Tilgung). Die Restschuld nach 10 Jahren hilft dir, die Anschlussfinanzierung zu planen.
        </p>
      }
    />
  );
}

/* ───────── Break-even-Miete ───────── */

function BreakEvenCalculator() {
  const meta = META.breakeven;
  const [rate, setRate] = useState(700);
  const [bk, setBk] = useState(50);
  const [ruecklage, setRuecklage] = useState(60);
  const [leerstand, setLeerstand] = useState(4);
  const [wfl, setWfl] = useState(50);
  const [aktMiete, setAktMiete] = useState(0);

  const lPct = leerstand / 100;
  const fix = rate + bk + ruecklage;
  const required = fix / Math.max(0.0001, 1 - lPct);
  const perM2 = wfl > 0 ? required / wfl : 0;
  const diff = required - aktMiete;

  return (
    <PublicCalcLayout
      category={meta.category}
      h1={meta.h1}
      intro={meta.intro}
      breadcrumbSlug="breakeven"
      faq={meta.faq}
      snapshot={{
        type: "breakeven",
        createdAt: new Date().toISOString(),
        inputs: { rate, bk, ruecklage, leerstand, wfl, aktMiete },
        result: { required, perM2, diff },
      }}
      inputs={
        <>
          <NumInput label="Kreditrate" value={rate} onChange={setRate} suffix="€/M" />
          <NumInput label="Betriebskosten" value={bk} onChange={setBk} suffix="€/M" />
          <NumInput label="Rücklage" value={ruecklage} onChange={setRuecklage} suffix="€/M" />
          <NumInput label="Leerstandspuffer" value={leerstand} onChange={setLeerstand} suffix="%" step={0.5} />
          <NumInput label="Wohnfläche" value={wfl} onChange={setWfl} suffix="m²" />
          <NumInput label="Aktuelle Miete" value={aktMiete} onChange={setAktMiete} suffix="€/M" />
        </>
      }
      result={
        <div className="space-y-5">
          <BigResult label="Benötigte Miete" value={fmtEUR(required)} />
          <div className="text-xs text-muted-foreground">≈ {perM2.toFixed(2)} €/m²</div>
          <div className="border-t pt-3">
            <ResultRow label="Aktuelle Miete" value={fmtEUR(aktMiete)} />
            <ResultRow label="Differenz" value={fmtEUR(diff)} tone={diff > 0 ? "bad" : "good"} />
          </div>
          {perM2 > 30 && (
            <div className="rounded-md bg-destructive/10 text-destructive p-3 text-xs">
              Über 30 €/m² ist in den meisten Lagen unrealistisch. Überlege Kaufpreisreduktion oder mehr Eigenkapital.
            </div>
          )}
        </div>
      }
      explanation={
        <p>
          Die Break-even-Miete deckt Kreditrate, Betriebskosten und Rücklage ab – inklusive eines Leerstandspuffers. Alles darüber ist positiver Cashflow.
        </p>
      }
    />
  );
}

/* ───────── Leistbarkeit ───────── */

function LeistbarkeitCalculator() {
  const meta = META.leistbarkeit;
  const [ek, setEk] = useState(80000);
  const [zins, setZins] = useState(3.5);
  const [laufzeit, setLaufzeit] = useState(25);
  const [rate, setRate] = useState(900);
  const [nkPct, setNkPct] = useState(10);

  const r = zins / 100 / 12;
  const n = laufzeit * 12;
  const kredit = r === 0 ? rate * n : (rate * (1 - Math.pow(1 + r, -n))) / r;
  const gesamt = ek + kredit;
  const maxKp = gesamt / (1 + nkPct / 100);
  const nk = gesamt - maxKp;

  return (
    <PublicCalcLayout
      category={meta.category}
      h1={meta.h1}
      intro={meta.intro}
      breadcrumbSlug="leistbarkeit"
      faq={meta.faq}
      snapshot={{
        type: "leistbarkeit",
        createdAt: new Date().toISOString(),
        inputs: { ek, zins, laufzeit, rate, nkPct },
        result: { maxKp, kredit, nk, gesamt },
      }}
      inputs={
        <>
          <NumInput label="Eigenkapital" value={ek} onChange={setEk} suffix="€" />
          <NumInput label="Wunsch-Monatsrate" value={rate} onChange={setRate} suffix="€/M" />
          <NumInput label="Zinssatz p.a." value={zins} onChange={setZins} suffix="%" step={0.1} />
          <NumInput label="Laufzeit" value={laufzeit} onChange={setLaufzeit} suffix="Jahre" />
          <NumInput label="Nebenkosten" value={nkPct} onChange={setNkPct} suffix="%" step={0.5} />
        </>
      }
      result={
        <div className="space-y-5">
          <BigResult label="Maximaler Kaufpreis" value={fmtEUR(maxKp)} />
          <div className="border-t pt-3">
            <ResultRow label="Eigenkapital" value={fmtEUR(ek)} />
            <ResultRow label="Kreditbetrag" value={fmtEUR(kredit)} />
            <ResultRow label="Kaufnebenkosten" value={fmtEUR(nk)} />
            <ResultRow label="Gesamtkosten" value={fmtEUR(gesamt)} />
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            Annahme: Du bringst dein Eigenkapital ein und finanzierst den Rest mit der gewählten Monatsrate über die Laufzeit.
          </p>
        </div>
      }
      explanation={
        <p>
          Der Rechner berechnet aus Monatsrate, Zinssatz und Laufzeit den maximalen Kreditbetrag und addiert dein Eigenkapital. Kaufnebenkosten werden als Prozentsatz abgezogen.
        </p>
      }
    />
  );
}
