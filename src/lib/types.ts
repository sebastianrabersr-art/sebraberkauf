export type PropertyStatus = "Neu" | "Prüfen" | "Interessant" | "Besichtigung" | "Angebot" | "Abgelehnt" | "Gekauft";

export type Mietrecht =
  | "Neubau / freie Miete"
  | "Teilanwendung MRG"
  | "Altbau / Richtwert möglich"
  | "unklar – rechtlich prüfen"
  | "nicht geeignet";

export interface Assumptions {
  eigenkapital: number;
  zinssatz: number; // 0.038
  laufzeit: number; // years
  nkOhneMakler: number; // 0.07
  nkMitMakler: number; // 0.105
  nkKonservativ: number; // 0.12
  leerstandPuffer: number; // 0.04
  ruecklagePerM2: number; // 0.75
  nichtUmlPerM2: number; // 0.5
  mindestScore: number; // 75
  zielBrutto: number; // 0.035
  zielNetto: number; // 0.025
  zinsStress: number; // 0.015
  leerstandStressMonate: number; // 2
  reparaturStress: number; // 5000
}

export interface Property {
  id: string;
  status: PropertyStatus;
  inseratsdatum: string; // ISO
  link: string;
  platform: string;
  title: string;
  bezirk: string;
  adresse: string;
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
  // Optional extras
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
  // Score sub-values (manual editable, defaults applied)
  scoreLage: number; // 0-25
  scoreVermietbarkeit: number; // 0-20
  scoreZustand: number; // 0-15
  scoreRecht: number; // 0-10
  scoreWiederverkauf: number; // 0-5
  notizen: string;
  createdAt: string;
}

export interface ViewingNote {
  propertyId: string;
  checks: Record<string, { done: boolean; note: string }>;
}
