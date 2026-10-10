import type { Property, PropertyType } from "./types";

/**
 * Objektkategorien und ihre Regeln an einer Stelle.
 *
 * Gespeichert wird weiterhin `propertyType` (apartment, house_with_land, … – so liegt es in der
 * Datenbank). Die Kategorie ist die fachliche Sicht darauf: Wohnung, Haus, Zinshaus, Büro, Lager,
 * Garage, Grundstück. Bestandsdaten ohne propertyType gelten als Wohnung.
 */
export type PropertyCategory = "wohnung" | "haus" | "zinshaus" | "buero" | "lager" | "garage" | "grundstueck";

export function propertyCategory(t: PropertyType | null | undefined): PropertyCategory {
  switch (t) {
    case "house_with_land":
    case "house_with_separate_land":
      return "haus";
    case "zinshaus":
      return "zinshaus";
    case "commercial":
      return "buero";
    case "lager":
      return "lager";
    case "garage":
      return "garage";
    case "land_only":
      return "grundstueck";
    default:
      return "wohnung";
  }
}

export const categoryOf = (p: Pick<Property, "propertyType">) => propertyCategory(p.propertyType);

/** Wohnrecht (MRG / BGB-Wohnraummiete): Wohnung, Haus, Zinshaus. */
export const isWohnrecht = (t: PropertyType | null | undefined) => ["wohnung", "haus", "zinshaus"].includes(propertyCategory(t));
/** Gewerbe & Sonstiges (freies Mietrecht bzw. keine Vermietung): Büro, Lager, Garage, Grundstück. */
export const isGewerbe = (t: PropertyType | null | undefined) => ["buero", "lager", "garage", "grundstueck"].includes(propertyCategory(t));
/** Büro und Lager: Gewerbemiete mit eigenem Leerstandsrisiko und Gewerberecht-Tab. */
export const isGewerbeMiete = (t: PropertyType | null | undefined) => ["buero", "lager"].includes(propertyCategory(t));

/** Auswahlkarten (Import und manuelles Anlegen), in zwei Gruppen. */
export type CategoryOption = { category: PropertyCategory; type: PropertyType; label: string; sub: string };

export const CATEGORY_GROUPS: { title: string; options: CategoryOption[] }[] = [
  {
    title: "Wohnen",
    options: [
      { category: "wohnung", type: "apartment", label: "Wohnung", sub: "Eigentumswohnung zur Vermietung" },
      { category: "haus", type: "house_with_land", label: "Haus / EFH", sub: "Einfamilienhaus mit Grund" },
      { category: "zinshaus", type: "zinshaus", label: "Zinshaus", sub: "Mehrere Wohneinheiten" },
    ],
  },
  {
    title: "Gewerbe & Sonstiges",
    options: [
      { category: "buero", type: "commercial", label: "Büro", sub: "Gewerbefläche zur Vermietung" },
      { category: "lager", type: "lager", label: "Lager", sub: "Lager- oder Logistikfläche" },
      { category: "garage", type: "garage", label: "Garage", sub: "Garage, Tiefgarage, Stellplatz" },
      { category: "grundstueck", type: "land_only", label: "Grundstück", sub: "Bauland oder unbebautes Grundstück" },
    ],
  },
];

export const CATEGORY_LABEL: Record<PropertyCategory, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  zinshaus: "Zinshaus",
  buero: "Büro",
  lager: "Lager",
  garage: "Garage",
  grundstueck: "Grundstück",
};

/** Badge-Farben in der Kandidatenliste. */
export const CATEGORY_BADGE: Record<PropertyCategory, { bg: string; fg: string }> = {
  wohnung: { bg: "#E8F5EE", fg: "#2D6A4F" },
  haus: { bg: "#F5F3EE", fg: "#78716C" },
  zinshaus: { bg: "#EEF2FF", fg: "#4F46E5" },
  buero: { bg: "#FFF7ED", fg: "#B45309" },
  lager: { bg: "#FFF7ED", fg: "#B45309" },
  garage: { bg: "#F5F3EE", fg: "#78716C" },
  grundstueck: { bg: "#F0FDF4", fg: "#15803D" },
};

export type DetailTab = "uebersicht" | "einheiten" | "finanzierung" | "analysen" | "besichtigung" | "crm" | "mietrecht" | "gewerberecht" | "dokumente";

/** Tabs der Detailseite je Kategorie (Dokumente überall am Ende). */
export const TABS_BY_CATEGORY: Record<PropertyCategory, DetailTab[]> = {
  wohnung: ["uebersicht", "finanzierung", "analysen", "besichtigung", "crm", "mietrecht", "dokumente"],
  haus: ["uebersicht", "finanzierung", "analysen", "besichtigung", "crm", "mietrecht", "dokumente"],
  zinshaus: ["uebersicht", "einheiten", "finanzierung", "analysen", "besichtigung", "crm", "mietrecht", "dokumente"],
  buero: ["uebersicht", "finanzierung", "analysen", "besichtigung", "crm", "gewerberecht", "dokumente"],
  lager: ["uebersicht", "finanzierung", "analysen", "besichtigung", "crm", "gewerberecht", "dokumente"],
  garage: ["uebersicht", "finanzierung", "analysen", "crm", "dokumente"],
  grundstueck: ["uebersicht", "analysen", "besichtigung", "crm", "dokumente"],
};

export const TAB_LABEL: Record<DetailTab, string> = {
  uebersicht: "Übersicht",
  einheiten: "Einheiten",
  finanzierung: "Finanzierung",
  analysen: "Analysen",
  besichtigung: "Besichtigung",
  crm: "CRM",
  mietrecht: "Mietrecht",
  gewerberecht: "Gewerberecht",
  dokumente: "Dokumente",
};

/** Standard-Leerstandsrisiko für Gewerbemiete (Anteil der Miete). */
export function defaultLeerstandGewerbe(t: PropertyType | null | undefined): number {
  return propertyCategory(t) === "lager" ? 0.12 : 0.1;
}

/** Wirksames Leerstandsrisiko Büro/Lager: eigener Wert, sonst Kategorie-Standard. */
export function leerstandGewerbe(p: Pick<Property, "propertyType" | "leerstandsrisikoGewerbe">): number {
  return p.leerstandsrisikoGewerbe ?? defaultLeerstandGewerbe(p.propertyType);
}

/** AfA-Standard je Kategorie: Wohnen 1,5 %, Büro/Lager 2 %, Garage und Grundstück keine. */
export function defaultAfaSatz(t: PropertyType | null | undefined): number {
  const c = propertyCategory(t);
  if (c === "buero" || c === "lager") return 0.02;
  if (c === "garage" || c === "grundstueck") return 0;
  return 0.015;
}

/** Grundstück: Wertsteigerung p.a. als Anteil (aus projections.wertsteigerungPct in Prozent, Standard 2 %). */
export function landAppreciation(p: Pick<Property, "projections">): number {
  const pct = p.projections?.wertsteigerungPct;
  return (pct != null && Number.isFinite(pct) ? pct : 2) / 100;
}

/** Garage: Gesamtmiete = Stellplätze × Miete pro Platz (sonst die eingetragene Nettomiete). */
export function garageRent(p: Pick<Property, "anzahlStellplaetze" | "mieteProStellplatz" | "nettomieteMtl">): number {
  if (p.mieteProStellplatz != null) return Math.max(0, (p.anzahlStellplaetze ?? 1) * p.mieteProStellplatz);
  return p.nettomieteMtl ?? 0;
}

export const GEWERBERECHT_TEXT =
  "Gewerbemietverträge unterliegen dem freien Mietrecht. Keine Mietpreisbeschränkung, keine Richtwerte. Wichtig: Laufzeit, Indexierung und Kündigungsfristen vertraglich regeln.";

export const GARAGE_RECHT_TEXT = "Garagen unterliegen i.d.R. dem freien Mietrecht in AT und DE.";
