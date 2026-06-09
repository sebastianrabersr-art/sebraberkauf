export type PropertyStatus = "Neu" | "Prüfen" | "Interessant" | "Besichtigung" | "Angebot" | "Abgelehnt" | "Gekauft";

export type Mietrecht =
  | "Neubau / freie Miete"
  | "Teilanwendung MRG"
  | "Altbau / Richtwert möglich"
  | "unklar – rechtlich prüfen"
  | "nicht geeignet";

export interface Assumptions {
  eigenkapital: number;
  zinssatz: number;
  laufzeit: number;
  nkOhneMakler: number;
  nkMitMakler: number;
  nkKonservativ: number;
  leerstandPuffer: number;
  ruecklagePerM2: number;
  nichtUmlPerM2: number;
  mindestScore: number;
  zielBrutto: number;
  zielNetto: number;
  zinsStress: number;
  leerstandStressMonate: number;
  reparaturStress: number;
}

export type ProjectStatus = "Aktiv" | "Pausiert" | "Abgeschlossen";

export interface Project {
  id: string;
  name: string;
  description: string;
  investmentGoal: string;
  locationFocus: string;
  budgetMin: number | null;
  budgetMax: number | null;
  maxNegativeCashflow: number | null;
  preferredSizeMin: number | null;
  preferredSizeMax: number | null;
  preferredDistricts: string;
  status: ProjectStatus;
  assumptions: Assumptions;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface Property {
  id: string;
  projectId: string;
  status: PropertyStatus;
  inseratsdatum: string;
  link: string; // ORIGINAL URL – never overwrite
  platform: string;
  extractionStatus?: "ok" | "partial" | "failed" | "manuell";
  title: string;
  bezirk: string;
  adresse: string;
  city?: string;
  objekttyp: string;
  baujahr: number | null;
  mietrecht: Mietrecht;
  zustand: string;
  wohnflaecheM2: number | null;
  zimmer: number | null;
  kaufpreis: number | null;
  makler: "Ja" | "Nein" | "unklar";
  sanierung: number;
  einrichtung: number;
  reserve: number;
  nettomieteMtl: number | null;
  nettomieteGeschaetzt: boolean;
  stockwerk?: string;
  hasElevator?: boolean | null;
  hasBalkon?: boolean | null;
  hasTerrasse?: boolean | null;
  hasLoggia?: boolean | null;
  hasGarten?: boolean | null;
  hasKeller?: boolean | null;
  hasStellplatz?: boolean | null;
  energyClass?: string;
  hwb?: number | null;
  betriebskostenMtl?: number | null;
  heizkostenMtl?: number | null;
  ruecklageFonds?: number | null;
  verfuegbarkeit?: string;
  beschreibung?: string;
  hinweise?: string;
  missingData: string[];
  scoreLage: number;
  scoreVermietbarkeit: number;
  scoreZustand: number;
  scoreRecht: number;
  scoreWiederverkauf: number;
  notizen: string;
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface ViewingNote {
  propertyId: string;
  checks: Record<string, { done: boolean; note: string }>;
}
