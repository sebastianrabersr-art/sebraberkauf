import { planLimits } from "./auth";

/**
 * Was jeder Plan wirklich freischaltet – abgeleitet aus planLimits() und den Sperren in der App
 * (Objekt-PDF ab Plus, Vergleich 4/10, Vergleichs-PDF und Portfolio nur Premium).
 * Preiskarten, Vergleichstabelle, Upgrade- und Checkout-Dialog lesen alle hier,
 * damit sie nicht auseinanderlaufen. Nichts aufnehmen, was die App nicht tatsächlich so regelt.
 */
export type PlanId = "free" | "plus" | "premium";
export type PlanFeature = { label: string; included: boolean };

const yes = (label: string): PlanFeature => ({ label, included: true });
const no = (label: string): PlanFeature => ({ label, included: false });

const free = planLimits("free");
const plus = planLimits("plus");
const premium = planLimits("premium");

/** Kartentexte: Name, Zielgruppe und höchstens 6 Punkte, das Wertvollste zuerst. */
export const PLAN_CARDS: Record<PlanId, { name: string; sub: string; features: PlanFeature[] }> = {
  free: {
    name: "Free",
    sub: "Für den ersten Check",
    features: [
      yes(`${free.properties} Immobilie komplett durchrechnen`),
      yes("Import per Link, Text, Excel oder PDF"),
      yes("Kaufnebenkosten, Kreditrate, Cashflow und Rendite"),
      yes("Mietrecht-Einschätzung für Österreich"),
      no("Immobilien vergleichen"),
    ],
  },
  plus: {
    name: "Plus",
    sub: "Für ernsthafte Käufer",
    features: [
      yes(`${plus.properties} Immobilien speichern`),
      yes(`Bis zu ${plus.compareLimit} Immobilien nebeneinander vergleichen`),
      yes("Analyse als PDF für Bank oder Partner"),
      yes("Alles aus Free"),
      no("Portfolio für gekaufte Objekte"),
    ],
  },
  premium: {
    name: "Premium",
    sub: "Für aktive Investoren",
    features: [
      yes("Unbegrenzt Immobilien speichern"),
      yes("Mehrere Projekte, z. B. eines pro Stadt"),
      yes(`Bis zu ${premium.compareLimit} Immobilien vergleichen`),
      yes("Vergleich als PDF exportieren"),
      yes("Portfolio mit Zahlungs-Tracking nach dem Kauf"),
      yes("Alles aus Plus"),
    ],
  },
};

/** Zelle der Vergleichstabelle: Haken, nicht enthalten, oder ein kurzer Wert ("5", "bis 10"). */
export type CompareCell = boolean | string;
export type CompareRow = { label: string; free: CompareCell; plus: CompareCell; premium: CompareCell };

const count = (n: number | null) => (n == null ? "unbegrenzt" : String(n));
const upTo = (n: number) => (n > 0 ? `bis ${n}` : false);

export const PLAN_COMPARISON: { group: string; rows: CompareRow[] }[] = [
  {
    group: "Immobilien",
    rows: [
      { label: "Gespeicherte Immobilien", free: count(free.properties), plus: count(plus.properties), premium: count(premium.properties) },
      { label: "Projekte", free: count(free.projects), plus: count(plus.projects), premium: count(premium.projects) },
      { label: "Import per Link, Text, Excel oder PDF", free: true, plus: true, premium: true },
      { label: "Pipeline, CRM und Erinnerungen", free: true, plus: true, premium: true },
      { label: "Portfolio mit Zahlungs-Tracking", free: free.portfolio, plus: plus.portfolio, premium: premium.portfolio },
    ],
  },
  {
    group: "Analyse",
    rows: [
      { label: "Kaufnebenkosten für Österreich und Deutschland", free: true, plus: true, premium: true },
      { label: "Finanzierung mit Bank-Szenarien", free: true, plus: true, premium: true },
      { label: "Cashflow, Rendite und Score", free: true, plus: true, premium: true },
      { label: "Mietrecht-Einschätzung", free: true, plus: true, premium: true },
      { label: "Immobilien vergleichen", free: upTo(free.compareLimit), plus: upTo(plus.compareLimit), premium: upTo(premium.compareLimit) },
    ],
  },
  {
    group: "Export",
    rows: [
      { label: "Kandidatenliste als CSV", free: true, plus: true, premium: true },
      { label: "Rechner-Ergebnis als PDF", free: true, plus: true, premium: true },
      { label: "Immobilien-Analyse als PDF", free: free.pdfExport, plus: plus.pdfExport, premium: premium.pdfExport },
      { label: "Vergleich als PDF", free: false, plus: false, premium: true },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Hilfe per E-Mail an hallo@kaufma.eu", free: true, plus: true, premium: true },
      { label: "Ratgeber und Rechner ohne Anmeldung", free: true, plus: true, premium: true },
    ],
  },
];

/** Kurzfassung für Upgrade- und Checkout-Dialog: nur die Unterschiede zum vorherigen Plan. */
export const PLAN_HIGHLIGHTS: Record<"plus" | "premium", string[]> = {
  plus: PLAN_CARDS.plus.features.filter((f) => f.included && !f.label.startsWith("Alles aus")).map((f) => f.label),
  premium: PLAN_CARDS.premium.features.filter((f) => f.included && !f.label.startsWith("Alles aus")).map((f) => f.label),
};
