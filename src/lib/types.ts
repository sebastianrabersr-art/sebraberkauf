export type PropertyStatus =
  | "Neu"
  | "Daten unvollständig"
  | "Prüfen"
  | "Interessant"
  | "Verkäufer kontaktiert"
  | "Antwort erhalten"
  | "Besichtigung geplant"
  | "Besichtigt"
  | "Unterlagen angefragt"
  | "Finanzierung prüfen"
  | "Angebot vorbereitet"
  | "Angebot abgegeben"
  | "In Verhandlung"
  | "Abgelehnt"
  | "Zurückgestellt"
  | "Gekauft"
  | "Verloren"
  // legacy
  | "Besichtigung"
  | "Angebot";

export const ALL_STATUSES: PropertyStatus[] = [
  "Neu","Daten unvollständig","Prüfen","Interessant","Verkäufer kontaktiert","Antwort erhalten",
  "Besichtigung geplant","Besichtigt","Unterlagen angefragt","Finanzierung prüfen","Angebot vorbereitet",
  "Angebot abgegeben","In Verhandlung","Abgelehnt","Zurückgestellt","Gekauft","Verloren",
];

export type Priority = "Hoch" | "Mittel" | "Niedrig";

export type Mietrecht =
  | "Neubau / freie Miete"
  | "Teilanwendung MRG"
  | "Vollanwendung MRG"
  | "Altbau / Richtwert möglich"
  | "Befristung relevant"
  | "Gewerbliche Nutzung relevant"
  | "Kurzzeitvermietung / Airbnb prüfen"
  | "unklar – rechtlich prüfen"
  | "nicht geeignet"
  // erweiterte Kategorien (AT + DE)
  | "freie Mietzinsbildung wahrscheinlich"
  | "MRG Teilanwendung möglich"
  | "MRG Vollanwendung möglich"
  | "Richtwertmietzins möglich"
  | "Mietpreisbremse möglich"
  | "Mietspiegel relevant"
  | "unklar – professionell prüfen";

export const ALL_MIETRECHTE: Mietrecht[] = [
  "freie Mietzinsbildung wahrscheinlich","MRG Teilanwendung möglich","MRG Vollanwendung möglich",
  "Richtwertmietzins möglich","Mietpreisbremse möglich","Mietspiegel relevant",
  "Kurzzeitvermietung / Airbnb prüfen","Gewerbliche Nutzung relevant","Befristung relevant",
  "Neubau / freie Miete","Teilanwendung MRG","Vollanwendung MRG","Altbau / Richtwert möglich",
  "unklar – professionell prüfen","unklar – rechtlich prüfen","nicht geeignet",
];

export type SellerType = "Privat" | "Makler" | "Bauträger" | "Bank" | "Sonstige" | "unklar";
export type ContactChannel = "Telefon" | "E-Mail" | "WhatsApp" | "Plattform" | "Maklerportal" | "Persönlich" | "";

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
  link: string;
  platform: string;
  extractionStatus?: "ok" | "partial" | "failed" | "manuell";
  title: string;
  bezirk: string;
  adresse: string;
  city?: string;
  bundesland?: string;
  land?: string;
  objekttyp: string;
  baujahr: number | null;
  neubauAltbau?: "Neubau" | "Altbau" | "saniert" | "";
  mietrecht: Mietrecht;
  mietrechtErklaerung?: string;
  mietrechtRisiko?: "niedrig" | "mittel" | "hoch";
  mietrechtOffeneFragen?: string;
  zustand: string;
  wohnflaecheM2: number | null;
  zimmer: number | null;
  badezimmer?: number | null;
  wc?: number | null;
  kaufpreis: number | null;
  kaufpreisNetto?: number | null;
  kaufpreisBrutto?: number | null;
  provisionPct?: number | null;
  provisionEUR?: number | null;
  provisionBruttoEUR?: number | null;
  maklerprovisionUstPct?: number | null;
  maklerkostenZahlbar?: boolean | null;
  provisionLastEdit?: "pct" | "netto" | "brutto";
  provisionBasis?: "netto" | "brutto";

  grunderwerbsteuer?: number | null;
  grundbuchkosten?: number | null;
  vertragskosten?: number | null;
  finanzierungskosten?: number | null;
  sonstigeNK?: number | null;
  makler: "Ja" | "Nein" | "unklar";
  sanierung: number;
  einrichtung: number;
  reserve: number;
  // Flächen
  aussenflaecheM2?: number | null;
  balkonM2?: number | null;
  terrasseM2?: number | null;
  gartenM2?: number | null;
  kellerM2?: number | null;
  nutzflaecheGesamtM2?: number | null;
  // Vermietung
  nettomieteMtl: number | null;
  nettomieteGeschaetzt: boolean;
  bruttomieteMtl?: number | null;
  bkUmlagefaehig?: number | null;
  bkNichtUmlagefaehig?: number | null;
  heizkostenMtl?: number | null;
  ruecklageFonds?: number | null;
  ruecklageMtl?: number | null;
  leerstandPufferPct?: number | null;
  vermietbarkeit?: string;
  zielmietergruppe?: string;
  // Ausstattung
  stockwerk?: string;
  hasElevator?: boolean | null;
  hasBalkon?: boolean | null;
  hasTerrasse?: boolean | null;
  hasLoggia?: boolean | null;
  hasGarten?: boolean | null;
  hasKeller?: boolean | null;
  hasStellplatz?: boolean | null;
  moebliert?: boolean | null;
  heizungstyp?: string;
  energyClass?: string;
  hwb?: number | null;
  fgee?: number | null;
  betriebskostenMtl?: number | null;
  verfuegbarkeit?: string;
  beschreibung?: string;
  ausstattung?: string;
  hinweise?: string;
  missingData: string[];
  // Score
  scoreLage: number;
  scoreVermietbarkeit: number;
  scoreZustand: number;
  scoreRecht: number;
  scoreWiederverkauf: number;
  notizen: string;
  // CRM
  priority?: Priority;
  nextAction?: string;
  nextActionDate?: string;
  firstContactDate?: string;
  lastContactDate?: string;
  contactChannel?: ContactChannel;
  viewingDate?: string;
  offerAmount?: number | null;
  negotiationStatus?: string;
  decisionReason?: string;
  requestedDocs?: string[];
  receivedDocs?: string[];
  // Verkäufer / Makler
  sellerName?: string;
  sellerType?: SellerType;
  sellerCompany?: string;
  sellerContact?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerWebsite?: string;
  sellerAddress?: string;
  sellerNotes?: string;
  financeScenarios?: FinanceScenario[];
  activeFinanceId?: string;
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface ViewingNote {
  propertyId: string;
  checks: Record<string, { done: boolean; note: string }>;
}

export interface PropertyDocument {
  id: string;
  propertyId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileDataUrl: string; // base64 data URL
  uploadDate: string;
  extractionStatus?: "pending" | "ok" | "failed";
  extractedFields?: Record<string, unknown>;
  missingFields?: string[];
  notes?: string;
  category?: string;
}

export type ActivityType =
  | "Telefonat"
  | "E-Mail"
  | "WhatsApp"
  | "Besichtigung"
  | "Follow-up"
  | "Unterlagen angefragt"
  | "Unterlagen erhalten"
  | "Angebot abgegeben"
  | "Notiz";

export const ACTIVITY_TYPES: ActivityType[] = [
  "Telefonat","E-Mail","WhatsApp","Besichtigung","Follow-up",
  "Unterlagen angefragt","Unterlagen erhalten","Angebot abgegeben","Notiz",
];

export interface Activity {
  id: string;
  propertyId: string;
  type: ActivityType;
  title: string;
  description?: string;
  date: string;
  dueDate?: string;
  completed: boolean;
  contactPerson?: string;
  createdAt: string;
  updatedAt?: string;
}

export const DOCUMENT_CATEGORIES = [
  "Exposé","Grundriss","Energieausweis","Betriebskostenübersicht","Rücklagenstand",
  "Eigentümerversammlungsprotokolle","Grundbuchauszug","Nutzwertgutachten",
  "Mietvertrag","Sanierungsinformationen","Maklerunterlagen",
] as const;
export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];

export type ZahlungsIntervall = "monatlich" | "quartalsweise" | "jaehrlich";
export type Tilgungsart = "annuitaet" | "endfaellig" | "manuell";
export type Zinsbindung = "fix" | "variabel";

export interface Sondertilgung {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  note?: string;
}

export interface ManualPayment {
  year: number;
  payment: number;
}

export interface FinanceScenario {
  id: string;
  name: string;
  bankName?: string;
  kreditBetrag: number | null;
  eigenkapital: number | null;
  zinssatz: number; // p.a. decimal
  zinsbindung?: Zinsbindung;
  zinsbindungJahre?: number | null;
  laufzeitJahre: number;
  intervall: ZahlungsIntervall;
  tilgungsart: Tilgungsart;
  startDate: string;
  sondertilgungen?: Sondertilgung[];
  manualSchedule?: ManualPayment[];
  notizen?: string;
}
