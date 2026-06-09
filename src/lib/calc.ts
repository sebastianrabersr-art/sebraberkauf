import type { Assumptions, Mietrecht, Property } from "./types";

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  eigenkapital: 100000,
  zinssatz: 0.038,
  laufzeit: 30,
  nkOhneMakler: 0.07,
  nkMitMakler: 0.105,
  nkKonservativ: 0.12,
  leerstandPuffer: 0.04,
  ruecklagePerM2: 0.75,
  nichtUmlPerM2: 0.5,
  mindestScore: 75,
  zielBrutto: 0.035,
  zielNetto: 0.025,
  zinsStress: 0.015,
  leerstandStressMonate: 2,
  reparaturStress: 5000,
};

export function pmt(rateMonthly: number, n: number, pv: number): number {
  if (pv <= 0) return 0;
  if (rateMonthly === 0) return pv / n;
  return (pv * rateMonthly) / (1 - Math.pow(1 + rateMonthly, -n));
}

export interface Calc {
  nebenkostenPct: number;
  kaufNebenkosten: number;
  gesamtkosten: number;
  eigenkapitalEinsatz: number;
  kreditBetrag: number;
  kreditRateMtl: number;
  annuitaet: number;
  nichtUmlMtl: number;
  ruecklageMtl: number;
  leerstandMtl: number;
  cashflowMtl: number;
  cashflowJahr: number;
  bruttorendite: number;
  nettorendite: number;
  eigenkapitalrendite: number;
  preisProM2: number;
  ltv: number;
  dscr: number;
  cashflowStressZins: number;
  cashflowStressLeerstand: number;
  cashflowStressReparatur: number;
  breakEvenMiete: number;
  maxKaufpreisZielRendite: number;
  requiredBreakEvenRent: number;
  requiredBreakEvenRentPerM2: number;
}

export function calcProperty(p: Property, a: Assumptions): Calc {
  const kaufpreis = p.kaufpreis ?? 0;
  const m2 = p.wohnflaecheM2 ?? 0;
  const miete = p.nettomieteMtl ?? 0;

  const nebenkostenPct =
    p.makler === "Ja" ? a.nkMitMakler : p.makler === "Nein" ? a.nkOhneMakler : a.nkKonservativ;
  const explicitNK =
    (p.grunderwerbsteuer ?? 0) + (p.grundbuchkosten ?? 0) + (p.vertragskosten ?? 0) +
    (p.finanzierungskosten ?? 0) + (p.sonstigeNK ?? 0) + (p.provisionEUR ?? 0);
  const kaufNebenkosten = explicitNK > 0 ? explicitNK : kaufpreis * nebenkostenPct;
  const gesamtkosten = kaufpreis + kaufNebenkosten + (p.sanierung || 0) + (p.einrichtung || 0) + (p.reserve || 0);
  const ekEinsatz = Math.min(a.eigenkapital, gesamtkosten);
  const kreditBetrag = Math.max(0, gesamtkosten - a.eigenkapital);
  const kreditRateMtl = pmt(a.zinssatz / 12, a.laufzeit * 12, kreditBetrag);
  const annuitaet = kreditRateMtl * 12;

  const nichtUmlMtl = p.bkNichtUmlagefaehig != null ? p.bkNichtUmlagefaehig : m2 * a.nichtUmlPerM2;
  const ruecklageMtl = p.ruecklageMtl != null ? p.ruecklageMtl : m2 * a.ruecklagePerM2;
  const leerstandPct = p.leerstandPufferPct != null ? p.leerstandPufferPct : a.leerstandPuffer;
  const leerstandMtl = miete * leerstandPct;
  const cashflowMtl = miete - kreditRateMtl - nichtUmlMtl - ruecklageMtl - leerstandMtl;
  const cashflowJahr = cashflowMtl * 12;

  const bruttorendite = kaufpreis > 0 ? (miete * 12) / kaufpreis : 0;
  const nettoJahr = miete * 12 - (nichtUmlMtl + ruecklageMtl + leerstandMtl) * 12;
  const nettorendite = gesamtkosten > 0 ? nettoJahr / gesamtkosten : 0;
  const eigenkapitalrendite = ekEinsatz > 0 ? cashflowJahr / ekEinsatz : 0;
  const preisProM2 = m2 > 0 ? kaufpreis / m2 : 0;
  const ltv = gesamtkosten > 0 ? kreditBetrag / gesamtkosten : 0;
  const dscr = kreditRateMtl > 0 ? miete / kreditRateMtl : 0;

  const rateStress = pmt((a.zinssatz + a.zinsStress) / 12, a.laufzeit * 12, kreditBetrag);
  const cashflowStressZins = miete - rateStress - nichtUmlMtl - ruecklageMtl - leerstandMtl;
  const cashflowStressLeerstand = cashflowMtl - (miete * a.leerstandStressMonate) / 12;
  const cashflowStressReparatur = cashflowMtl - a.reparaturStress / 12;
  const breakEvenMiete = kreditRateMtl + nichtUmlMtl + ruecklageMtl;
  const maxKaufpreisZielRendite = a.zielBrutto > 0 ? (miete * 12) / a.zielBrutto : 0;

  // Break-even Mindestmiete für Cashflow >= 0 (Leerstand ist % der Miete)
  // miete*(1-leerstand) = rate + nichtUml + ruecklage  →  miete = (...) / (1 - leerstand)
  const denom = Math.max(0.0001, 1 - leerstandPct);
  const requiredBreakEvenRent = (kreditRateMtl + nichtUmlMtl + ruecklageMtl) / denom;
  const requiredBreakEvenRentPerM2 = m2 > 0 ? requiredBreakEvenRent / m2 : 0;

  return {
    nebenkostenPct, kaufNebenkosten, gesamtkosten,
    eigenkapitalEinsatz: ekEinsatz, kreditBetrag, kreditRateMtl, annuitaet,
    nichtUmlMtl, ruecklageMtl, leerstandMtl, cashflowMtl, cashflowJahr,
    bruttorendite, nettorendite, eigenkapitalrendite, preisProM2, ltv, dscr,
    cashflowStressZins, cashflowStressLeerstand, cashflowStressReparatur,
    breakEvenMiete, maxKaufpreisZielRendite,
    requiredBreakEvenRent, requiredBreakEvenRentPerM2,
  };
}

export interface Score {
  lage: number;
  zahlen: number;
  vermietbarkeit: number;
  zustand: number;
  recht: number;
  wiederverkauf: number;
  total: number;
  entscheidung: "Sofort prüfen" | "Interessant" | "Preisverhandlung" | "Aussortieren" | "—";
  ampel: "green" | "yellow" | "red" | "gray";
}

export function calcScore(p: Property, a: Assumptions, c: Calc): Score {
  const zahlen = a.zielBrutto > 0 ? Math.min(25, Math.max(0, (c.bruttorendite / a.zielBrutto) * 25)) : 0;
  const total = Math.round(
    p.scoreLage + zahlen + p.scoreVermietbarkeit + p.scoreZustand + p.scoreRecht + p.scoreWiederverkauf,
  );
  let entscheidung: Score["entscheidung"] = "Aussortieren";
  let ampel: Score["ampel"] = "red";
  if (!p.kaufpreis || !p.nettomieteMtl) {
    entscheidung = "—"; ampel = "gray";
  } else if (total >= 85) { entscheidung = "Sofort prüfen"; ampel = "green"; }
  else if (total >= 70) { entscheidung = "Interessant"; ampel = "green"; }
  else if (total >= 55) { entscheidung = "Preisverhandlung"; ampel = "yellow"; }
  return {
    lage: p.scoreLage, zahlen: Math.round(zahlen * 10) / 10,
    vermietbarkeit: p.scoreVermietbarkeit, zustand: p.scoreZustand,
    recht: p.scoreRecht, wiederverkauf: p.scoreWiederverkauf,
    total, entscheidung, ampel,
  };
}

export interface DataQuality {
  score: number;
  level: "Sehr gut" | "Gut" | "Unvollständig" | "Manuelle Prüfung nötig";
  ampel: "green" | "yellow" | "red";
  missing: string[];
  filled: number;
  total: number;
}

const REQUIRED_FIELDS: { key: string; label: string; check: (p: Property) => boolean }[] = [
  { key: "kaufpreis", label: "Kaufpreis", check: (p) => !!p.kaufpreis },
  { key: "wohnflaecheM2", label: "Wohnfläche", check: (p) => !!p.wohnflaecheM2 },
  { key: "zimmer", label: "Zimmer", check: (p) => !!p.zimmer },
  { key: "bezirk", label: "Bezirk", check: (p) => !!p.bezirk?.trim() },
  { key: "betriebskostenMtl", label: "Betriebskosten", check: (p) => p.betriebskostenMtl != null },
  { key: "baujahr", label: "Baujahr", check: (p) => !!p.baujahr },
  { key: "zustand", label: "Zustand", check: (p) => !!p.zustand?.trim() },
  { key: "nettomieteMtl", label: "Geschätzte Miete", check: (p) => !!p.nettomieteMtl },
  { key: "mietrecht", label: "Mietrecht", check: (p) => p.mietrecht !== "unklar – rechtlich prüfen" },
  { key: "beschreibung", label: "Beschreibung", check: (p) => !!p.beschreibung?.trim() },
  { key: "link", label: "Original-Link", check: (p) => !!p.link?.trim() && /^https?:\/\//.test(p.link) },
];

export function calcDataQuality(p: Property): DataQuality {
  const missing = REQUIRED_FIELDS.filter((f) => !f.check(p)).map((f) => f.label);
  const filled = REQUIRED_FIELDS.length - missing.length;
  const score = Math.round((filled / REQUIRED_FIELDS.length) * 100);
  let level: DataQuality["level"] = "Manuelle Prüfung nötig";
  let ampel: DataQuality["ampel"] = "red";
  if (score >= 90) { level = "Sehr gut"; ampel = "green"; }
  else if (score >= 70) { level = "Gut"; ampel = "green"; }
  else if (score >= 50) { level = "Unvollständig"; ampel = "yellow"; }
  return { score, level, ampel, missing, filled, total: REQUIRED_FIELDS.length };
}

export const fmtEUR = (n: number | null | undefined, digits = 0) =>
  n == null || !isFinite(n) ? "—"
    : new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: digits }).format(n);

export const fmtPct = (n: number | null | undefined, digits = 2) =>
  n == null || !isFinite(n) ? "—" : new Intl.NumberFormat("de-AT", { style: "percent", maximumFractionDigits: digits }).format(n);

export const fmtNum = (n: number | null | undefined, digits = 0) =>
  n == null || !isFinite(n) ? "—" : new Intl.NumberFormat("de-AT", { maximumFractionDigits: digits }).format(n);

export function isValidUrl(s: string | null | undefined): boolean {
  if (!s) return false;
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
}

export function googleMapsUrl(p: Pick<Property, "adresse" | "bezirk" | "city" | "bundesland" | "land">): string | null {
  const parts = [p.adresse, p.bezirk, p.city, p.bundesland, p.land].map((x) => (x || "").trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const q = encodeURIComponent(parts.join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export interface MietrechtInference {
  kategorie: Mietrecht;
  erklaerung: string;
  risiko: "niedrig" | "mittel" | "hoch";
  pruefen: string[];
}

export function inferMietrecht(p: Property): MietrechtInference {
  const y = p.baujahr ?? 0;
  const text = `${p.beschreibung ?? ""} ${p.objekttyp ?? ""} ${p.zustand ?? ""}`.toLowerCase();
  const isAirbnb = /airbnb|kurzzeit|tourist|ferienwohnung/.test(text);
  const isGewerblich = /gewerbl|büro|lokal|geschäftsl/.test(text);
  if (isAirbnb) return {
    kategorie: "Kurzzeitvermietung / Airbnb prüfen",
    erklaerung: "Kurzzeitvermietung wird in Wien strikt reguliert (Bauordnung-Novelle 2024). Vor Kauf widmungsrechtlich prüfen.",
    risiko: "hoch",
    pruefen: ["Widmung Wohnzone","kommunale Vermietungsregeln","Eigentümergemeinschaft erlaubt es?"],
  };
  if (isGewerblich) return {
    kategorie: "Gewerbliche Nutzung relevant",
    erklaerung: "Gewerbliche Nutzung unterliegt nicht dem MRG-Mietzinsschutz – andere Bewertung der Mieten.",
    risiko: "mittel",
    pruefen: ["Mietvertrag","Indexierung","Befristung","Umsatzsteuer-Option"],
  };
  if (y >= 1953) return {
    kategorie: "Neubau / freie Miete",
    erklaerung: `Errichtet ${y}. Gebäude nach 1953 (bzw. mit Baubewilligung nach 30.06.1953) sind im Vollanwendungsbereich des MRG vom Richtwert ausgenommen → freie Mietzinsvereinbarung möglich.`,
    risiko: "niedrig",
    pruefen: ["Bauwidmung","ev. Förderdarlehen","Befristungsabschlag bei befristeten Verträgen"],
  };
  if (y >= 1945) return {
    kategorie: "Teilanwendung MRG",
    erklaerung: `Errichtet ${y}. Häuser mit Baubewilligung 1945–1953 fallen oft in die Teilanwendung des MRG – freie Mietzinsbildung mit eingeschränkten Schutzbestimmungen.`,
    risiko: "mittel",
    pruefen: ["genaues Baubewilligungsdatum","Förderungs-/Sanierungsstatus","Kategorie der Wohnung"],
  };
  if (y > 0 && y < 1945) return {
    kategorie: "Altbau / Richtwert möglich",
    erklaerung: `Errichtet ${y}. Altbau vor 1945 fällt typischerweise in den Vollanwendungsbereich des MRG → Richtwertmietzins (Wien aktueller Richtwert + Zu-/Abschläge). Das deckelt die erzielbare Miete erheblich.`,
    risiko: "hoch",
    pruefen: ["Lagezuschlag-Karte","Ausstattungskategorie","Zu-/Abschläge","befristete vs. unbefristete Vermietung"],
  };
  return {
    kategorie: "unklar – rechtlich prüfen",
    erklaerung: "Baujahr unbekannt – Mietrecht kann nicht eingeschätzt werden.",
    risiko: "hoch",
    pruefen: ["Baujahr/Baubewilligungsdatum","Widmung","bestehende Mietverträge"],
  };
}
