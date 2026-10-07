import type { Property } from "./types";
import { getActiveFinance, resolveTotalPurchasePrice } from "./calc";

/**
 * Die fünf Angaben, ohne die die Analyse einer Immobilie nicht aussagekräftig ist.
 * Eigenkapital und Zinssatz stammen aus dem aktiven Finanzierungsszenario.
 */
export type RequiredFieldKey = "kaufpreis" | "miete" | "wohnflaeche" | "eigenkapital" | "zinssatz";

export const REQUIRED_FIELDS: { key: RequiredFieldKey; label: string }[] = [
  { key: "kaufpreis", label: "Kaufpreis" },
  { key: "miete", label: "Nettokaltmiete pro Monat" },
  { key: "wohnflaeche", label: "Wohnfläche" },
  { key: "eigenkapital", label: "Eigenkapital" },
  { key: "zinssatz", label: "Zinssatz" },
];

const filled = (v: number | null | undefined) => typeof v === "number" && Number.isFinite(v) && v !== 0;

export function missingRequiredFields(p: Property): RequiredFieldKey[] {
  const fin = getActiveFinance(p);
  const has: Record<RequiredFieldKey, boolean> = {
    kaufpreis: filled(resolveTotalPurchasePrice(p)),
    miete: filled(p.nettomieteMtl),
    wohnflaeche: filled(p.wohnflaecheM2 ?? p.livingAreaSqm ?? p.usableAreaSqm),
    eigenkapital: filled(fin?.eigenkapital),
    zinssatz: filled(fin?.zinssatz),
  };
  return REQUIRED_FIELDS.filter((f) => !has[f.key]).map((f) => f.key);
}

/** DOM-ID des Eingabefelds, zu dem der Banner springt. */
export const requiredFieldDomId = (key: RequiredFieldKey) => `req-field-${key}`;

/** Sprungziel, wenn es noch kein Finanzierungsszenario (und damit kein Eingabefeld) gibt. */
export const REQUIRED_FINANCE_EMPTY_ID = "req-finance-empty";

/** Rahmen eines fehlenden Pflichtfelds (Amber – hilfreich, nicht alarmierend). */
export const REQUIRED_BORDER = "2px solid #D97706";

/** Feld kurz hervorheben, nachdem der Banner dorthin gesprungen ist. */
export function flashRequiredField(el: HTMLElement) {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof el.animate !== "function") return;
  el.animate(
    [
      { boxShadow: "0 0 0 0 rgba(217, 119, 6, 0)" },
      { boxShadow: "0 0 0 5px rgba(217, 119, 6, 0.35)", offset: 0.25 },
      { boxShadow: "0 0 0 0 rgba(217, 119, 6, 0)" },
    ],
    { duration: 1600, easing: "ease-out" },
  );
}
