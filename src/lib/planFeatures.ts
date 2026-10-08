import { planLimits } from "./auth";

/**
 * Was jeder Plan wirklich freischaltet – abgeleitet aus planLimits() und den Sperren in der App
 * (Objekt-PDF ab Plus, Vergleich 4/10, Vergleichs-PDF und Portfolio nur Premium).
 * Preisseite und Upgrade-Dialog lesen beide hier, damit sie nicht auseinanderlaufen.
 */
export type PlanFeature = { label: string; included: boolean };

const yes = (label: string): PlanFeature => ({ label, included: true });
const no = (label: string): PlanFeature => ({ label, included: false });

const free = planLimits("free");
const plus = planLimits("plus");
const premium = planLimits("premium");

export const PLAN_FEATURES: Record<"free" | "plus" | "premium", PlanFeature[]> = {
  free: [
    yes(`${free.properties} Immobilie`),
    yes("Import per Link, Text, Excel oder PDF"),
    yes("Kaufnebenkosten, Finanzierung, Cashflow & Rendite"),
    yes("Mietrecht-Einschätzung und Besichtigungs-Checkliste"),
    yes("Pipeline, CRM und Erinnerungen"),
    no("Vergleich mehrerer Immobilien"),
    no("PDF-Export der Immobilien-Analyse"),
    no("Portfolio"),
  ],
  plus: [
    yes(`Bis zu ${plus.properties} Immobilien`),
    yes("Alles aus Kostenlos"),
    yes(`Vergleich von bis zu ${plus.compareLimit} Immobilien`),
    yes("PDF-Export jeder Immobilien-Analyse"),
    no("Portfolio"),
  ],
  premium: [
    yes("Unbegrenzt Immobilien und Projekte"),
    yes("Alles aus Plus"),
    yes(`Vergleich von bis zu ${premium.compareLimit} Immobilien, als PDF exportierbar`),
    yes("Portfolio mit Zahlungs-Tracking für gekaufte Objekte"),
  ],
};

/** Kurzfassung für den Upgrade-Dialog: nur die Unterschiede zum vorherigen Plan. */
export const PLAN_HIGHLIGHTS: Record<"plus" | "premium", string[]> = {
  plus: PLAN_FEATURES.plus.filter((f) => f.included && f.label !== "Alles aus Kostenlos").map((f) => f.label),
  premium: PLAN_FEATURES.premium.filter((f) => f.included && f.label !== "Alles aus Plus").map((f) => f.label),
};
