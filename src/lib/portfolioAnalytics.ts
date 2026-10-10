import { calcZinshaus } from "./calc";
import { garageRent, propertyCategory, type PropertyCategory } from "./propertyKinds";
import type { Property } from "./types";

/*
 * Kennzahlen für "Meine Objekte" (gekaufter Bestand). Reine Auswertung der erfassten
 * Ist-Daten (Kaufdaten, Restschuld, Rate, Miete) – die Kaufrechnung in calc.ts bleibt unberührt.
 */

/** Soll-Monatsmiete wie in calcProperty: Zinshaus aus Einheiten, Garage aus Stellplätzen, Grundstück 0. */
export function plannedRent(p: Property): number {
  const cat = propertyCategory(p.propertyType);
  if (cat === "grundstueck") return 0;
  if (cat === "garage") return garageRent(p);
  if (cat === "zinshaus" && (p.units?.length ?? 0) > 0) return calcZinshaus(p.units).totalMiete;
  return p.nettomieteMtl ?? 0;
}

export type HoldingRow = {
  p: Property;
  name: string;
  wert: number;
  kaufpreis: number;
  restschuld: number;
  rateMtl: number;
  mieteMtl: number;
  kostenMtl: number;
  cashflowMtl: number;
  /** Jahresmiete / Kaufpreis; null ohne Kaufpreis. */
  bruttorendite: number | null;
  eigenkapital: number;
  /** Zinssatz in Prozent (3,5 = 3,5 %), null wenn nicht erfasst. */
  zinsPct: number | null;
};

const shortName = (p: Property) => {
  const t = (p.title || "Ohne Titel").trim();
  return t.length > 18 ? `${t.slice(0, 17)}…` : t;
};

export function holdingRow(p: Property): HoldingRow {
  const pi = p.purchase ?? {};
  const kaufpreis = pi.tatsKaufpreis ?? p.kaufpreis ?? 0;
  const wert = pi.aktuellerObjektwert ?? kaufpreis;
  const restschuld = pi.aktuelleRestschuld ?? pi.tatsKreditbetrag ?? 0;
  const rateMtl = pi.aktuelleMonatsrate ?? 0;
  const mieteMtl = pi.aktuelleMonatsmiete ?? plannedRent(p);
  // Gleiche Kostenlogik wie die Objektkarten in /portfolio.
  const kostenMtl =
    (pi.tatsMonatlicheKosten ?? 0) ||
    (pi.betriebskostenMtl ?? 0) + (pi.nichtUmlMtl ?? 0) + (pi.ruecklageMtl ?? 0) +
      (pi.versicherungMtl ?? 0) + (pi.verwaltungMtl ?? 0) + (pi.sonstigeMtlKosten ?? 0);
  return {
    p,
    name: shortName(p),
    wert,
    kaufpreis,
    restschuld,
    rateMtl,
    mieteMtl,
    kostenMtl,
    cashflowMtl: mieteMtl - rateMtl - kostenMtl,
    bruttorendite: kaufpreis > 0 ? (mieteMtl * 12) / kaufpreis : null,
    eigenkapital: pi.tatsEigenkapital ?? Math.max(0, kaufpreis - (pi.tatsKreditbetrag ?? pi.ursprKreditbetrag ?? restschuld)),
    zinsPct: pi.zinssatzPct ?? null,
  };
}

/** Ohne erfassten Zinssatz: 40 % der Rate gelten als Tilgung (wie in der Objekt-Detailansicht). */
const FALLBACK_TILGUNGSANTEIL = 0.4;

/** Restschuld nach `jahre` Jahren bei gleichbleibender Rate (jährliche Näherung). */
export function restschuldNach(h: HoldingRow, jahre: number): number {
  let r = h.restschuld;
  const rateJahr = h.rateMtl * 12;
  for (let y = 0; y < jahre && r > 0; y++) {
    r = h.zinsPct != null ? r * (1 + h.zinsPct / 100) - rateJahr : r - rateJahr * FALLBACK_TILGUNGSANTEIL;
    r = Math.max(0, r);
  }
  return r;
}

export type ProjectionPoint = { jahr: number; Immobilienwert: number; "Eigenkapital im Portfolio": number; "Gesamte Restschuld": number };

/** Wert-, Schulden- und Eigenkapitalverlauf des ganzen Bestands, Jahr 0 bis `jahre`. */
export function portfolioProjection(rows: HoldingRow[], jahre = 20, wertsteigerung = 0.02): ProjectionPoint[] {
  const out: ProjectionPoint[] = [];
  for (let j = 0; j <= jahre; j++) {
    const wert = rows.reduce((s, h) => s + h.wert * Math.pow(1 + wertsteigerung, j), 0);
    const schuld = rows.reduce((s, h) => s + restschuldNach(h, j), 0);
    out.push({
      jahr: j,
      Immobilienwert: Math.round(wert),
      "Eigenkapital im Portfolio": Math.round(wert - schuld),
      "Gesamte Restschuld": Math.round(schuld),
    });
  }
  return out;
}

export type PortfolioSummary = {
  wert: number;
  restschuld: number;
  bruttoMieteMtl: number;
  cashflowMtl: number;
  avgBruttorendite: number | null;
  ltv: number | null;
  ekRendite: number | null;
};

export function portfolioSummary(rows: HoldingRow[]): PortfolioSummary {
  const sum = (f: (h: HoldingRow) => number) => rows.reduce((s, h) => s + f(h), 0);
  const wert = sum((h) => h.wert);
  const restschuld = sum((h) => h.restschuld);
  const withRendite = rows.filter((h) => h.bruttorendite != null);
  const ek = sum((h) => h.eigenkapital);
  // Gewichtet über das eingesetzte Eigenkapital: (Cashflow + Tilgung im ersten Jahr) / Eigenkapital.
  const ertragJahr = sum((h) => h.cashflowMtl * 12 + (h.restschuld - restschuldNach(h, 1)));
  return {
    wert,
    restschuld,
    bruttoMieteMtl: sum((h) => h.mieteMtl),
    cashflowMtl: sum((h) => h.cashflowMtl),
    avgBruttorendite: withRendite.length ? withRendite.reduce((s, h) => s + (h.bruttorendite ?? 0), 0) / withRendite.length : null,
    ltv: wert > 0 ? restschuld / wert : null,
    ekRendite: ek > 0 ? ertragJahr / ek : null,
  };
}

const CATEGORY_PLURAL: Record<PropertyCategory, [string, string]> = {
  wohnung: ["Wohnung", "Wohnungen"],
  haus: ["Haus", "Häuser"],
  zinshaus: ["Zinshaus", "Zinshäuser"],
  buero: ["Gewerbe", "Gewerbe"],
  lager: ["Gewerbe", "Gewerbe"],
  garage: ["Garage", "Garagen"],
  grundstueck: ["Grundstück", "Grundstücke"],
};

/** "2 Wohnungen · 1 Haus · 1 Gewerbe" und die Liste der Standorte. */
export function diversification(rows: HoldingRow[]): { typen: string; standorte: string[] } {
  const counts = new Map<string, { n: number; forms: [string, string] }>();
  for (const h of rows) {
    const forms = CATEGORY_PLURAL[propertyCategory(h.p.propertyType)];
    const entry = counts.get(forms[1]) ?? { n: 0, forms };
    entry.n += 1;
    counts.set(forms[1], entry);
  }
  const typen = [...counts.values()].map(({ n, forms }) => `${n} ${n === 1 ? forms[0] : forms[1]}`).join(" · ");
  const standorte = [...new Set(rows.map((h) => (h.p.city || h.p.bezirk || "").trim()).filter(Boolean))];
  return { typen, standorte };
}
