// Country & region defaults for Austria and Germany.
// All defaults are SUGGESTIONS — they remain manually overridable on each property.

import type { Property } from "./types";

export type Country = "AT" | "DE";

export interface RegionInfo {
  code: string;
  name: string;
  country: Country;
  /** Grunderwerbsteuer in decimal (z.B. 0.035 = 3,5 %) */
  grunderwerbsteuerPct: number;
  /** Grundbucheintragung in decimal (Anteil vom Kaufpreis) */
  grundbuchPct: number;
  /** Pfandrecht Eintragung Anteil vom Kreditbetrag (nur AT) */
  pfandrechtPct?: number;
  /** Vertragserrichtung / Notar in decimal (Richtwert vom Kaufpreis) */
  vertragNotarPct: number;
  /** Maklerprovision Käuferanteil in decimal */
  maklerProvisionPct: number;
  /** USt auf Maklerprovision */
  maklerUstPct: number;
  /** Frei-Text Hinweise zum Mietrecht in dieser Region */
  mietrechtHinweis: string;
}

export const AT_REGIONS: RegionInfo[] = [
  { code: "W", name: "Wien", country: "AT", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.011, pfandrechtPct: 0.012, vertragNotarPct: 0.02, maklerProvisionPct: 0.03, maklerUstPct: 0.20, mietrechtHinweis: "Wien: viele Altbauten im Vollanwendungsbereich MRG → Richtwertmietzins. Aktueller Richtwert + Zu-/Abschläge." },
  { code: "NÖ", name: "Niederösterreich", country: "AT", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.011, pfandrechtPct: 0.012, vertragNotarPct: 0.02, maklerProvisionPct: 0.03, maklerUstPct: 0.20, mietrechtHinweis: "NÖ: gemischte Lage, Richtwert je Bundesland unterschiedlich." },
  { code: "OÖ", name: "Oberösterreich", country: "AT", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.011, pfandrechtPct: 0.012, vertragNotarPct: 0.02, maklerProvisionPct: 0.03, maklerUstPct: 0.20, mietrechtHinweis: "OÖ: Richtwert OÖ; Neubauten häufig freie Mietzinsbildung." },
  { code: "S",  name: "Salzburg",          country: "AT", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.011, pfandrechtPct: 0.012, vertragNotarPct: 0.02, maklerProvisionPct: 0.03, maklerUstPct: 0.20, mietrechtHinweis: "Salzburg: hoher Richtwert, angespannter Markt." },
  { code: "T",  name: "Tirol",             country: "AT", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.011, pfandrechtPct: 0.012, vertragNotarPct: 0.02, maklerProvisionPct: 0.03, maklerUstPct: 0.20, mietrechtHinweis: "Tirol: Freizeitwohnsitz-Regelung beachten, Kurzzeitvermietung stark reguliert." },
  { code: "V",  name: "Vorarlberg",        country: "AT", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.011, pfandrechtPct: 0.012, vertragNotarPct: 0.02, maklerProvisionPct: 0.03, maklerUstPct: 0.20, mietrechtHinweis: "Vorarlberg: Richtwert Vorarlberg; viele Neubauten freie Miete." },
  { code: "ST", name: "Steiermark",        country: "AT", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.011, pfandrechtPct: 0.012, vertragNotarPct: 0.02, maklerProvisionPct: 0.03, maklerUstPct: 0.20, mietrechtHinweis: "Steiermark: Richtwert Steiermark; Graz teilweise angespannt." },
  { code: "K",  name: "Kärnten",           country: "AT", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.011, pfandrechtPct: 0.012, vertragNotarPct: 0.02, maklerProvisionPct: 0.03, maklerUstPct: 0.20, mietrechtHinweis: "Kärnten: Richtwert Kärnten." },
  { code: "B",  name: "Burgenland",        country: "AT", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.011, pfandrechtPct: 0.012, vertragNotarPct: 0.02, maklerProvisionPct: 0.03, maklerUstPct: 0.20, mietrechtHinweis: "Burgenland: Richtwert Burgenland." },
];

// Quelle: Grunderwerbsteuer je Bundesland in DE (Stand 2024/2025)
export const DE_REGIONS: RegionInfo[] = [
  { code: "BW", name: "Baden-Württemberg",     country: "DE", grunderwerbsteuerPct: 0.050, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "BW: Mietpreisbremse in vielen Städten (Stuttgart, Heidelberg, …). Mietspiegel beachten." },
  { code: "BY", name: "Bayern",                country: "DE", grunderwerbsteuerPct: 0.035, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "BY: Mietpreisbremse in München & vielen Städten. Strenge Kappungsgrenze 15 %." },
  { code: "BE", name: "Berlin",                country: "DE", grunderwerbsteuerPct: 0.060, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "Berlin: flächendeckend Mietpreisbremse, Kappungsgrenze 15 %, qualifizierter Mietspiegel." },
  { code: "BB", name: "Brandenburg",           country: "DE", grunderwerbsteuerPct: 0.065, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "BB: Mietpreisbremse in Potsdam und Speckgürtel-Gemeinden." },
  { code: "HB", name: "Bremen",                country: "DE", grunderwerbsteuerPct: 0.050, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "Bremen: Mietpreisbremse aktiv." },
  { code: "HH", name: "Hamburg",               country: "DE", grunderwerbsteuerPct: 0.055, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "Hamburg: flächendeckend Mietpreisbremse, qualifizierter Mietspiegel." },
  { code: "HE", name: "Hessen",                country: "DE", grunderwerbsteuerPct: 0.060, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "Hessen: Mietpreisbremse in Frankfurt, Wiesbaden u.a." },
  { code: "MV", name: "Mecklenburg-Vorpommern",country: "DE", grunderwerbsteuerPct: 0.060, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "MV: Mietpreisbremse v.a. in Rostock, Greifswald." },
  { code: "NI", name: "Niedersachsen",         country: "DE", grunderwerbsteuerPct: 0.050, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "NI: Mietpreisbremse in Hannover, Göttingen, Braunschweig." },
  { code: "NW", name: "Nordrhein-Westfalen",   country: "DE", grunderwerbsteuerPct: 0.065, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "NRW: Mietpreisbremse in Köln, Düsseldorf, Bonn, Münster u.a." },
  { code: "RP", name: "Rheinland-Pfalz",       country: "DE", grunderwerbsteuerPct: 0.050, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "RP: Mietpreisbremse u.a. in Mainz, Trier, Landau." },
  { code: "SL", name: "Saarland",              country: "DE", grunderwerbsteuerPct: 0.065, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "Saarland: kaum Mietpreisbremse, allgemeiner Mietspiegel." },
  { code: "SN", name: "Sachsen",               country: "DE", grunderwerbsteuerPct: 0.055, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "Sachsen: Mietpreisbremse in Leipzig, Dresden." },
  { code: "ST", name: "Sachsen-Anhalt",        country: "DE", grunderwerbsteuerPct: 0.050, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "Sachsen-Anhalt: keine flächendeckende Bremse." },
  { code: "SH", name: "Schleswig-Holstein",    country: "DE", grunderwerbsteuerPct: 0.065, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "SH: Mietpreisbremse u.a. in Kiel, Lübeck, Flensburg." },
  { code: "TH", name: "Thüringen",             country: "DE", grunderwerbsteuerPct: 0.065, grundbuchPct: 0.005, vertragNotarPct: 0.015, maklerProvisionPct: 0.0357, maklerUstPct: 0.19, mietrechtHinweis: "Thüringen: Mietpreisbremse in Erfurt, Jena." },
];

export const ALL_REGIONS: RegionInfo[] = [...AT_REGIONS, ...DE_REGIONS];

export function regionsOf(country: Country): RegionInfo[] {
  return country === "DE" ? DE_REGIONS : AT_REGIONS;
}

export function findRegion(country: Country | undefined | null, bundesland: string | undefined | null): RegionInfo | undefined {
  if (!country) return undefined;
  const list = regionsOf(country);
  if (!bundesland) return undefined;
  const norm = bundesland.trim().toLowerCase();
  return list.find((r) => r.name.toLowerCase() === norm || r.code.toLowerCase() === norm);
}

/** Suggested NK in € from region defaults. Manuell überschreibbar. */
export function regionDefaultsForProperty(p: Pick<Property, "kaufpreis" | "land" | "bundesland">) {
  const country: Country | undefined =
    p.land === "Deutschland" || p.land === "DE" ? "DE" :
    p.land === "Österreich" || p.land === "AT" ? "AT" : undefined;
  const region = findRegion(country, p.bundesland);
  if (!region) return null;
  const kp = p.kaufpreis ?? 0;
  return {
    region,
    country,
    grunderwerbsteuer: Math.round(kp * region.grunderwerbsteuerPct),
    grundbuchkosten: Math.round(kp * region.grundbuchPct),
    vertragskosten: Math.round(kp * region.vertragNotarPct),
    provisionPct: region.maklerProvisionPct,
    maklerprovisionUstPct: region.maklerUstPct,
  };
}

// ---- Source links per country ----

export interface SourceLink { label: string; href: string; }

export const AT_SOURCES: SourceLink[] = [
  { label: "oesterreich.gv.at – Mietrecht", href: "https://www.oesterreich.gv.at/themen/bauen_wohnen_und_umwelt/wohnen/2.html" },
  { label: "Arbeiterkammer – Mietrecht", href: "https://www.arbeiterkammer.at/beratung/konsument/Wohnen/index.html" },
  { label: "MieterHilfe Wien", href: "https://www.mieterhilfe.at/" },
  { label: "Stadt Wien – Wohnen", href: "https://www.wien.gv.at/wohnen/" },
  { label: "Richtwertmietzins", href: "https://www.oesterreich.gv.at/themen/bauen_wohnen_und_umwelt/wohnen/3/2/Seite.270320.html" },
];

export const DE_SOURCES: SourceLink[] = [
  { label: "BMJ – Mietrecht", href: "https://www.bmj.de/DE/themen/buergerliches_recht/mietrecht/mietrecht_node.html" },
  { label: "Verbraucherzentrale – Mieten & Wohnen", href: "https://www.verbraucherzentrale.de/wissen/vertraege-reklamation/mieten-und-wohnen" },
  { label: "Mietspiegel-Informationen", href: "https://www.bmwsb.bund.de/Webs/BMWSB/DE/themen/stadt-wohnen/wohnungswirtschaft/mietspiegel/mietspiegel-node.html" },
  { label: "Mietpreisbremse – Übersicht", href: "https://www.bmj.de/DE/themen/buergerliches_recht/mietrecht/mietpreisbremse/mietpreisbremse_node.html" },
  { label: "Grunderwerbsteuer je Bundesland", href: "https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/Steuerarten/Grunderwerbsteuer/grunderwerbsteuer.html" },
];

export function sourcesFor(country: Country | undefined): SourceLink[] {
  if (country === "DE") return DE_SOURCES;
  if (country === "AT") return AT_SOURCES;
  return [];
}

export function countryOf(land: string | undefined | null): Country | undefined {
  if (!land) return undefined;
  const l = land.trim().toLowerCase();
  if (["deutschland", "de", "germany"].includes(l)) return "DE";
  if (["österreich", "oesterreich", "at", "austria"].includes(l)) return "AT";
  return undefined;
}
