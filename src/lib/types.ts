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

export type Bewertung = "Neu" | "Interessant" | "Prüfen" | "Nicht interessant";
export const ALL_BEWERTUNGEN: Bewertung[] = ["Neu", "Interessant", "Prüfen", "Nicht interessant"];

export type ProzessStatus =
  | ""
  | "Kontaktiert"
  | "Besichtigung"
  | "Finanzierung"
  | "Angebot & Verhandlung"
  | "Gekauft"
  | "Abgelehnt";
export const ALL_PROZESS_STATUSES: ProzessStatus[] = [
  "Kontaktiert", "Besichtigung", "Finanzierung", "Angebot & Verhandlung", "Gekauft", "Abgelehnt",
];

export function migrateLegacyStatus(status: string | undefined): { bewertung: Bewertung; prozessStatus: ProzessStatus } {
  const s = (status ?? "").toString();
  let bewertung: Bewertung = "Neu";
  let prozessStatus: ProzessStatus = "";
  switch (s) {
    case "Neu":
    case "Daten unvollständig":
      bewertung = "Neu"; break;
    case "Prüfen":
    case "Zurückgestellt":
      bewertung = "Prüfen"; break;
    case "Interessant":
    case "Interessiert":
      bewertung = "Interessant"; break;
    case "Verkäufer kontaktiert":
    case "Antwort erhalten":
      bewertung = "Interessant"; prozessStatus = "Kontaktiert"; break;
    case "Besichtigung geplant":
    case "Besichtigt":
    case "Besichtigung":
      bewertung = "Interessant"; prozessStatus = "Besichtigung"; break;
    case "Unterlagen angefragt":
    case "Finanzierung prüfen":
      bewertung = "Interessant"; prozessStatus = "Finanzierung"; break;
    case "Angebot vorbereitet":
    case "Angebot abgegeben":
    case "In Verhandlung":
    case "Angebot":
      bewertung = "Interessant"; prozessStatus = "Angebot & Verhandlung"; break;
    case "Gekauft":
      bewertung = "Interessant"; prozessStatus = "Gekauft"; break;
    case "Abgelehnt":
    case "Verloren":
      bewertung = "Nicht interessant"; prozessStatus = "Abgelehnt"; break;
  }
  return { bewertung, prozessStatus };
}

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

/**
 * Übergeordnete Objekt-Kategorie. Steuert sowohl das Eingabeformular
 * (welche Felder sichtbar sind) als auch die Berechnung (welcher
 * Gesamtkaufpreis verwendet wird).
 */
export type PropertyType =
  | "apartment"                  // Wohnung
  | "house_with_land"            // Haus inkl. Grundstück (ein Kaufpreis)
  | "house_with_separate_land"   // Haus + Grundstück getrennt gekauft
  | "land_only"                  // reines Grundstück
  | "commercial";                // Gewerbeimmobilie

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Wohnung" },
  { value: "house_with_land", label: "Haus inkl. Grundstück" },
  { value: "house_with_separate_land", label: "Haus + Grundstück (separat)" },
  { value: "land_only", label: "Grundstück" },
  { value: "commercial", label: "Gewerbeimmobilie" },
];

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
  dataVerified?: boolean; // true = User hat alle Daten geprüft und bestätigt
  title: string;
  bezirk: string;
  adresse: string;
  city?: string;
  bundesland?: string;
  land?: string;
  lat?: number | null;
  lng?: number | null;
  lastViewed?: string;
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
  // Objekt-Kategorie & zusätzliche Flächen/Preise für Häuser & Grundstücke.
  // Alle optional – Bestandsdaten ohne propertyType werden als "apartment" behandelt.
  propertyType?: PropertyType;
  landAreaSqm?: number | null;        // Grundstücksfläche m²
  livingAreaSqm?: number | null;      // Wohnfläche m² (parallel zu wohnflaecheM2 für Haus/Gewerbe)
  usableAreaSqm?: number | null;      // Nutzfläche m² (Keller, Lager, Gewerbe …)
  housePurchasePrice?: number | null; // Kaufpreis Haus (bei separat gekauftem Grundstück)
  landPurchasePrice?: number | null;  // Kaufpreis Grundstück (bei separat gekauftem Grundstück)
  totalPurchasePrice?: number | null; // Optionaler explizit gesetzter Gesamtkaufpreis
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
  offerDate?: string;
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
  // Advanced Investment-Modell
  objektartDetail?: ObjektartDetail;
  grundstuecksflaecheM2?: number | null;
  grundwert?: number | null;
  gebaeudewert?: number | null;
  anteilGrundPct?: number | null;
  anteilGebaeudePct?: number | null;
  bodenwert?: number | null;
  afa?: AfaSettings;
  projections?: LongTermProjections;
  followUpFinance?: FollowUpFinance;
  openQuestions?: OpenQuestion[];
  googleMapsUrlOverride?: string;
  purchase?: PurchaseInfo;
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
  bewertung?: Bewertung;
  prozessStatus?: ProzessStatus;
  userRating?: UserRating;
}

export interface UserRating {
  lage?: number | null;
  preisLeistung?: number | null;
  zustand?: number | null;
  vermietbarkeit?: number | null;
  bauchgefuehl?: number | null;
}

export function userRatingAvg(r?: UserRating | null): number | null {
  if (!r) return null;
  const vals = [r.lage, r.preisLeistung, r.zustand, r.vermietbarkeit, r.bauchgefuehl]
    .map((v) => (typeof v === "number" && !isNaN(v) ? v : null));
  if (vals.some((v) => v == null)) return null;
  const sum = vals.reduce((a, b) => (a as number) + (b as number), 0) as number;
  return sum / 5;
}


export interface PurchaseInfo {
  kaufdatum?: string;
  tatsKaufpreis?: number | null;
  tatsKaufnebenkosten?: number | null;
  tatsMaklerkosten?: number | null;
  notarkosten?: number | null;
  grundbuchkosten?: number | null;
  sonstigeKaufkosten?: number | null;
  sanierungskosten?: number | null;
  einrichtungskosten?: number | null;
  tatsEigenkapital?: number | null;
  tatsKreditbetrag?: number | null;
  ursprKreditbetrag?: number | null;
  bank?: string;
  kreditstatus?: "in Auszahlung" | "laufend" | "läuft" | "Sondertilgung geplant" | "abgelöst" | "abbezahlt" | "refinanziert" | "in Verzug" | "";
  zinssatzPct?: number | null;
  fixzinsBis?: string;
  laufzeitJahre?: number | null;
  tilgungsart?: "annuitaet" | "endfaellig" | "manuell" | "";
  startdatumKredit?: string;
  naechsteZinsanpassung?: string;
  notizenKreditvertrag?: string;
  aktuelleRestschuld?: number | null;
  aktuelleMonatsrate?: number | null;
  aktuelleMonatsmiete?: number | null;
  tatsMonatlicheKosten?: number | null;
  betriebskostenMtl?: number | null;
  nichtUmlMtl?: number | null;
  ruecklageMtl?: number | null;
  versicherungMtl?: number | null;
  verwaltungMtl?: number | null;
  sonstigeMtlKosten?: number | null;
  aktuelleNutzung?: "vermietet" | "selbst genutzt" | "leer" | "teilweise vermietet" | "";
  aktuellerObjektwert?: number | null;
  notizenNachKauf?: string;
  repairs?: {
    id: string;
    title: string;
    kosten: number | null;
    status: "Offen" | "In Arbeit" | "Erledigt";
    datum?: string;
    notiz?: string;
  }[];
  documents?: PortfolioDocument[];
  verwaltung?: VerwaltungInfo;
}

export type PortfolioDocumentTyp =
  | "Kaufvertrag"
  | "Grundbuchauszug"
  | "Mietvertrag"
  | "Versicherung"
  | "Kreditvertrag"
  | "Rechnung"
  | "Sonstiges";

export const PORTFOLIO_DOCUMENT_TYPES: PortfolioDocumentTyp[] = [
  "Kaufvertrag","Grundbuchauszug","Mietvertrag","Versicherung","Kreditvertrag","Rechnung","Sonstiges",
];

export interface PortfolioDocument {
  id: string;
  name: string;
  typ: PortfolioDocumentTyp;
  datum?: string;
  notiz?: string;
}

export interface VerwaltungInfo {
  mieterName?: string;
  mieterKontakt?: string;
  mietbeginn?: string;
  mietende?: string;
  indexierung?: string;
  hvFirma?: string;
  hvKontakt?: string;
  hvGebuehr?: number | null;
  versGesellschaft?: string;
  versNummer?: string;
  versJahrespraemie?: number | null;
  versFaelligkeit?: string;
  grundsteuerJahr?: number | null;
}

export type PaymentDirection = "Einnahme" | "Ausgabe";
export type PaymentStatus = "bezahlt" | "offen";

export const EINNAHME_KATEGORIEN = [
  "Miete","Betriebskosten vom Mieter","Kaution","Sonstige Einnahme",
] as const;
export const AUSGABE_KATEGORIEN = [
  "Kreditrate","Zinsen","Tilgung","Betriebskosten","Reparatur / Instandhaltung",
  "Hausverwaltung","Versicherung","Steuer","Maklerkosten","Kaufnebenkosten",
  "Einrichtung","Sanierung","Sonstige Ausgabe",
] as const;
export type EinnahmeKategorie = typeof EINNAHME_KATEGORIEN[number];
export type AusgabeKategorie = typeof AUSGABE_KATEGORIEN[number];
export type PaymentKategorie = EinnahmeKategorie | AusgabeKategorie;

export interface Payment {
  id: string;
  propertyId: string;
  date: string;
  direction: PaymentDirection;
  category: PaymentKategorie;
  amount: number;
  description?: string;
  recurring?: boolean;
  status: PaymentStatus;
  documentName?: string;
  documentDataUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ObjektartDetail = "Wohnung" | "Haus" | "Grundstück" | "Zinshaus" | "Sonstiges";

export type AfaMethode = "linear" | "manuell";
export type AfaLand = "AT" | "DE";

export interface AfaSettings {
  basis?: number | null;
  grundAnteilPct?: number | null;
  gebaeudeAnteilPct?: number | null;
  satzPct?: number | null;
  jahresBetrag?: number | null;
  methode?: AfaMethode;
  land?: AfaLand;
}

export interface LongTermProjections {
  mietsteigerungPct?: number | null;
  kostensteigerungPct?: number | null;
  wertsteigerungPct?: number | null;
  leerstandPct?: number | null;
  instandhaltungProJahr?: number | null;
  horizonJahre?: number | null;
}

export interface FollowUpFinance {
  aktiv?: boolean;
  zinssatz?: number | null;
  restlaufzeitJahre?: number | null;
  notiz?: string;
}

export type OpenQuestionCategory =
  | "Mietrecht" | "Finanzierung" | "Zustand" | "Unterlagen" | "Verkäufer" | "Sonstiges";

export type OpenQuestionStatus = "Offen" | "Geklärt" | "Nicht relevant";

export interface OpenQuestion {
  id: string;
  text: string;
  category: OpenQuestionCategory;
  status: OpenQuestionStatus;
  note?: string;
  important?: boolean;
  createdAt?: string;
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

export type FinanceStatus = "Anfrage" | "Angebot erhalten" | "Favorit" | "Abgelehnt";

export interface FinanceScenario {
  id: string;
  name: string;
  bankName?: string;
  ansprechpartner?: string;
  status?: FinanceStatus;
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
