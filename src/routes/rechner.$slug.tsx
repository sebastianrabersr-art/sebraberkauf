import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PublicCalcLayout,
  NumInput,
  SelectInput,
  BigResult,
  ResultRow,
  buildFaqJsonLd,
  type CalcFaqItem,
} from "@/components/marketing/PublicCalcLayout";
import { fmtEUR, fmtPct } from "@/lib/calc";
import { MarketingShell } from "@/components/marketing/MarketingShell";

type CalcSlug = "kaufnebenkosten" | "rendite" | "cashflow";

const META: Record<CalcSlug, {
  title: string;
  description: string;
  category: string;
  h1: string;
  intro: string;
  faq: CalcFaqItem[];
}> = {
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
};

const VALID: CalcSlug[] = ["kaufnebenkosten", "rendite", "cashflow"];

export const Route = createFileRoute("/rechner/$slug")({
  loader: ({ params }) => {
    if (!VALID.includes(params.slug as CalcSlug)) throw notFound();
    return { slug: params.slug as CalcSlug };
  },
  head: ({ params }) => {
    const slug = params.slug as CalcSlug;
    const m = META[slug];
    if (!m) return { meta: [] };
    const url = `/rechner/${slug}`;
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
  const meta = META[slug];

  return (
    <PublicCalcLayout
      category={meta.category}
      h1={meta.h1}
      intro={meta.intro}
      breadcrumbSlug={slug}
      faq={meta.faq}
      inputs={slug === "kaufnebenkosten" ? <KaufNebenInputs /> : slug === "rendite" ? <RenditeInputs /> : <CashflowInputs />}
      result={slug === "kaufnebenkosten" ? <KaufNebenResult /> : slug === "rendite" ? <RenditeResult /> : <CashflowResult />}
    />
  );
}

/* ───────── Shared state via context-free pattern: use a hook per calc ───────── */
// Inputs and result render in different columns, so we colocate state via a wrapper component.

function KaufNebenInputs() {
  const ctx = useKaufNebenCtx();
  return (
    <>
      <SelectInput
        label="Land"
        value={ctx.land}
        onChange={(v) => { ctx.setLand(v); ctx.setGrestPct(v === "DE" ? 5 : 3.5); }}
        options={[
          { value: "AT", label: "Österreich" },
          { value: "DE", label: "Deutschland" },
        ]}
      />
      <NumInput label="Bundesland / Region (optional)" value={ctx.regionDummy} onChange={ctx.setRegionDummy} suffix="" />
      <NumInput label="Kaufpreis" value={ctx.kp} onChange={ctx.setKp} suffix="€" />
      <NumInput label="Maklerprovision (netto)" value={ctx.maklerPct} onChange={ctx.setMaklerPct} suffix="%" step={0.1} />
      <NumInput label="Notar / Vertragserrichtung" value={ctx.vertragPct} onChange={ctx.setVertragPct} suffix="%" step={0.1} />
      <NumInput label="Grundbuch" value={ctx.gbPct} onChange={ctx.setGbPct} suffix="%" step={0.1} />
      <NumInput label="Grunderwerbsteuer" value={ctx.grestPct} onChange={ctx.setGrestPct} suffix="%" step={0.1} />
      <NumInput label="Sonstige Kosten" value={ctx.sonst} onChange={ctx.setSonst} suffix="€" />
    </>
  );
}

function KaufNebenResult() {
  const ctx = useKaufNebenCtx();
  const makler = ctx.kp * (ctx.maklerPct / 100) * 1.20;
  const grest = ctx.kp * (ctx.grestPct / 100);
  const gb = ctx.kp * (ctx.gbPct / 100);
  const vertrag = ctx.kp * (ctx.vertragPct / 100);
  const total = makler + grest + gb + vertrag + ctx.sonst;
  const gesamt = ctx.kp + total;
  const pct = ctx.kp > 0 ? (total / ctx.kp) * 100 : 0;
  return (
    <div className="space-y-5">
      <BigResult label="Kaufnebenkosten gesamt" value={fmtEUR(total)} />
      <div className="text-xs text-muted-foreground">≈ {pct.toFixed(1)} % des Kaufpreises</div>
      <div className="border-t pt-3">
        <ResultRow label="Maklerprovision (brutto)" value={fmtEUR(makler)} />
        <ResultRow label="Grunderwerbsteuer" value={fmtEUR(grest)} />
        <ResultRow label="Grundbucheintragung" value={fmtEUR(gb)} />
        <ResultRow label="Notar / Vertragserrichtung" value={fmtEUR(vertrag)} />
        <ResultRow label="Sonstiges" value={fmtEUR(ctx.sonst)} />
      </div>
      <div className="rounded-xl bg-primary/10 p-4">
        <div className="text-xs text-primary font-medium">Gesamtkosten beim Kauf</div>
        <div className="text-2xl font-semibold tabular-nums">{fmtEUR(gesamt)}</div>
      </div>
    </div>
  );
}

// State stored on a module-level zustand-ish singleton via useState in a parent? Easier: lift via React context.

import { createContext, useContext } from "react";

const KaufNebenCtx = createContext<ReturnType<typeof useKaufNebenState> | null>(null);
function useKaufNebenState() {
  const [land, setLand] = useState<"AT" | "DE">("AT");
  const [regionDummy, setRegionDummy] = useState(0);
  const [kp, setKp] = useState(300000);
  const [maklerPct, setMaklerPct] = useState(3);
  const [grestPct, setGrestPct] = useState(3.5);
  const [gbPct, setGbPct] = useState(1.1);
  const [vertragPct, setVertragPct] = useState(1.5);
  const [sonst, setSonst] = useState(0);
  return { land, setLand, regionDummy, setRegionDummy, kp, setKp, maklerPct, setMaklerPct, grestPct, setGrestPct, gbPct, setGbPct, vertragPct, setVertragPct, sonst, setSonst };
}
function useKaufNebenCtx() {
  const v = useContext(KaufNebenCtx);
  if (!v) throw new Error("KaufNebenCtx missing");
  return v;
}

const RenditeCtx = createContext<ReturnType<typeof useRenditeState> | null>(null);
function useRenditeState() {
  const [kp, setKp] = useState(300000);
  const [nk, setNk] = useState(30000);
  const [jahresmiete, setJahresmiete] = useState(10800);
  const [laufend, setLaufend] = useState(1320);
  const [ek, setEk] = useState(80000);
  return { kp, setKp, nk, setNk, jahresmiete, setJahresmiete, laufend, setLaufend, ek, setEk };
}
function useRenditeCtx() {
  const v = useContext(RenditeCtx);
  if (!v) throw new Error("RenditeCtx missing");
  return v;
}

function RenditeInputs() {
  const c = useRenditeCtx();
  return (
    <>
      <NumInput label="Kaufpreis" value={c.kp} onChange={c.setKp} suffix="€" />
      <NumInput label="Kaufnebenkosten" value={c.nk} onChange={c.setNk} suffix="€" />
      <NumInput label="Jahresmiete (netto)" value={c.jahresmiete} onChange={c.setJahresmiete} suffix="€/Jahr" />
      <NumInput label="Laufende Kosten (nicht umlegbar)" value={c.laufend} onChange={c.setLaufend} suffix="€/Jahr" />
      <NumInput label="Eigenkapital" value={c.ek} onChange={c.setEk} suffix="€" />
    </>
  );
}

function RenditeResult() {
  const c = useRenditeCtx();
  const brutto = c.kp > 0 ? c.jahresmiete / c.kp : 0;
  const gesamt = c.kp + c.nk;
  const netto = gesamt > 0 ? (c.jahresmiete - c.laufend) / gesamt : 0;
  const ekRendite = c.ek > 0 ? (c.jahresmiete - c.laufend) / c.ek : 0;
  return (
    <div className="space-y-5">
      <BigResult label="Bruttorendite" value={fmtPct(brutto)} />
      <div className="border-t pt-3">
        <ResultRow label="Nettorendite" value={fmtPct(netto)} />
        <ResultRow label="Eigenkapitalrendite" value={fmtPct(ekRendite)} />
        <ResultRow label="Jahresmiete" value={fmtEUR(c.jahresmiete)} />
        <ResultRow label="Gesamtinvestition" value={fmtEUR(gesamt)} />
      </div>
      <p className="text-xs text-muted-foreground border-t pt-3">
        <strong>Brutto</strong> = Jahresmiete ÷ Kaufpreis. <strong>Netto</strong> = (Jahresmiete − laufende Kosten) ÷ (Kaufpreis + Nebenkosten). <strong>EK-Rendite</strong> = Überschuss ÷ Eigenkapital.
      </p>
    </div>
  );
}

const CashflowCtx = createContext<ReturnType<typeof useCashflowState> | null>(null);
function useCashflowState() {
  const [miete, setMiete] = useState(900);
  const [rate, setRate] = useState(700);
  const [bk, setBk] = useState(50);
  const [ruecklage, setRuecklage] = useState(60);
  const [leerstand, setLeerstand] = useState(4);
  const [sonst, setSonst] = useState(0);
  return { miete, setMiete, rate, setRate, bk, setBk, ruecklage, setRuecklage, leerstand, setLeerstand, sonst, setSonst };
}
function useCashflowCtx() {
  const v = useContext(CashflowCtx);
  if (!v) throw new Error("CashflowCtx missing");
  return v;
}

function CashflowInputs() {
  const c = useCashflowCtx();
  return (
    <>
      <NumInput label="Erwartete Monatsmiete" value={c.miete} onChange={c.setMiete} suffix="€/M" />
      <NumInput label="Kreditrate" value={c.rate} onChange={c.setRate} suffix="€/M" />
      <NumInput label="Betriebskosten (nicht umlegbar)" value={c.bk} onChange={c.setBk} suffix="€/M" />
      <NumInput label="Rücklage / Instandhaltung" value={c.ruecklage} onChange={c.setRuecklage} suffix="€/M" />
      <NumInput label="Leerstandspuffer" value={c.leerstand} onChange={c.setLeerstand} suffix="%" step={0.5} />
      <NumInput label="Sonstige monatliche Kosten" value={c.sonst} onChange={c.setSonst} suffix="€/M" />
    </>
  );
}

function CashflowResult() {
  const c = useCashflowCtx();
  const leerstandEUR = c.miete * (c.leerstand / 100);
  const cf = c.miete - c.rate - c.bk - c.ruecklage - leerstandEUR - c.sonst;
  const cfYear = cf * 12;
  const fix = c.rate + c.bk + c.ruecklage + c.sonst;
  const breakEven = fix / Math.max(0.0001, 1 - c.leerstand / 100);
  return (
    <div className="space-y-5">
      <BigResult label="Cashflow pro Monat" value={fmtEUR(cf)} tone={cf >= 0 ? "good" : "bad"} />
      <div className="text-xs text-muted-foreground">
        {cf >= 0 ? "Die Immobilie läuft monatlich positiv." : "Die Immobilie läuft monatlich negativ – du müsstest zuzahlen."}
      </div>
      <div className="border-t pt-3">
        <ResultRow label="Cashflow pro Jahr" value={fmtEUR(cfYear)} tone={cfYear >= 0 ? "good" : "bad"} />
        <ResultRow label="− Kreditrate" value={fmtEUR(c.rate)} />
        <ResultRow label="− Betriebskosten" value={fmtEUR(c.bk)} />
        <ResultRow label="− Rücklage" value={fmtEUR(c.ruecklage)} />
        <ResultRow label="− Leerstandspuffer" value={fmtEUR(leerstandEUR)} />
        <ResultRow label="− Sonstiges" value={fmtEUR(c.sonst)} />
      </div>
      <div className="rounded-xl bg-primary/10 p-4">
        <div className="text-xs text-primary font-medium">Benötigte Miete für Cashflow ≥ 0</div>
        <div className="text-2xl font-semibold tabular-nums">{fmtEUR(breakEven)}</div>
      </div>
    </div>
  );
}

/* ───────── Providers wrapper ───────── */
// Wrap inputs and result in a shared provider per calc by overriding component above.

function withProviders(slug: CalcSlug, node: React.ReactNode) {
  if (slug === "kaufnebenkosten") {
    return <KaufNebenCtx.Provider value={useKaufNebenState()}>{node}</KaufNebenCtx.Provider>;
  }
  if (slug === "rendite") {
    return <RenditeCtx.Provider value={useRenditeState()}>{node}</RenditeCtx.Provider>;
  }
  return <CashflowCtx.Provider value={useCashflowState()}>{node}</CashflowCtx.Provider>;
}

// Override CalcPage to wrap inputs+result in shared provider.
// Re-export the wrapped version.
function CalcPageWrapped() {
  const { slug } = Route.useLoaderData();
  const meta = META[slug];
  const inputs = slug === "kaufnebenkosten" ? <KaufNebenInputs /> : slug === "rendite" ? <RenditeInputs /> : <CashflowInputs />;
  const result = slug === "kaufnebenkosten" ? <KaufNebenResult /> : slug === "rendite" ? <RenditeResult /> : <CashflowResult />;
  return withProviders(slug, (
    <PublicCalcLayout
      category={meta.category}
      h1={meta.h1}
      intro={meta.intro}
      breadcrumbSlug={slug}
      faq={meta.faq}
      inputs={inputs}
      result={result}
    />
  ));
}

// Replace the route component with the wrapped version.
// (createFileRoute is already defined above; re-assign component via routeOptions update.)
Route.options.component = CalcPageWrapped;
