import type { Property } from "./types";
import { getActiveFinance, resolveTotalPurchasePrice } from "./calc";
import { categoryOf, garageRent } from "./propertyKinds";

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
  const cat = categoryOf(p);
  // Grundstück: ohne Miete und Finanzierung – nur der Preis zählt. Garage: keine Wohnfläche.
  const relevant: RequiredFieldKey[] =
    cat === "grundstueck" ? ["kaufpreis"]
    : cat === "garage" ? ["kaufpreis", "miete", "eigenkapital", "zinssatz"]
    : REQUIRED_FIELDS.map((f) => f.key);
  const has: Record<RequiredFieldKey, boolean> = {
    kaufpreis: filled(resolveTotalPurchasePrice(p)),
    miete: cat === "garage" ? filled(garageRent(p)) : filled(p.nettomieteMtl),
    wohnflaeche: filled(p.wohnflaecheM2 ?? p.livingAreaSqm ?? p.usableAreaSqm),
    eigenkapital: filled(fin?.eigenkapital),
    zinssatz: filled(fin?.zinssatz),
  };
  return REQUIRED_FIELDS.filter((f) => relevant.includes(f.key) && !has[f.key]).map((f) => f.key);
}

/** Bezeichnung im Banner – je nach Objektart ("Gewerbemiete netto", "Bürofläche" …). */
export function requiredFieldLabel(key: RequiredFieldKey, p: Property): string {
  const cat = categoryOf(p);
  if (key === "miete") {
    if (cat === "buero") return "Gewerbemiete netto";
    if (cat === "lager") return "Nettomiete Lager";
    if (cat === "garage") return "Miete pro Stellplatz";
  }
  if (key === "wohnflaeche" && (cat === "buero" || cat === "lager")) return "Bürofläche";
  return REQUIRED_FIELDS.find((f) => f.key === key)?.label ?? key;
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
