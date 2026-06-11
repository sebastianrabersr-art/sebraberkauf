/**
 * Zentrale Kaufnebenkosten-Regeln für AT und DE.
 *
 * ⚠️ HINWEIS: Sämtliche Sätze sind Default-Schätzwerte (Stand 2024/2025)
 * für ein Käufer-Modell. Sie ersetzen weder eine steuerliche noch eine
 * rechtliche Beratung. User-Eingaben am Property (z. B. `grunderwerbsteuer`,
 * `grundbuchkosten`, `vertragskosten`, `finanzierungskosten`,
 * Maklerprovisions-Felder) überschreiben diese Defaults immer.
 *
 * Die Werte werden von `calcPurchaseCosts` in `calc.ts` konsumiert.
 */

import type { Property } from "./types";
import { countryOf, findRegion, type Country } from "./regions";

export interface PurchaseCostRules {
  country: Country;
  /** Anzeigename des Bundeslandes / der Region (informativ). */
  regionLabel: string;
  /** Grunderwerbsteuer (Anteil vom Kaufpreis). */
  realEstateTransferTaxRate: number;
  /** Grundbucheintragung Eigentum (Anteil vom Kaufpreis). */
  landRegisterRate: number;
  /** Pfandrechts-/Hypothekeneintragung (Anteil vom KREDITBETRAG). */
  mortgageRegisterRate: number;
  /** Notar / Vertragserrichtung (Anteil vom Kaufpreis). */
  notaryContractRate: number;
  /** Maklerprovision Käuferseite NETTO (Anteil vom Kaufpreis). */
  brokerCommissionRate: number;
  /** USt auf Maklerprovision. */
  brokerVatRate: number;
  /** Einmalige Bank-/Finanzierungsgebühr (Anteil vom Kreditbetrag). */
  financingFeeRate: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Österreich – einheitliche Bundes-Defaults
 * ────────────────────────────────────────────────────────────────────────── */

/** AT-Defaults. Gelten in allen Bundesländern identisch. */
export const AT_DEFAULTS = {
  realEstateTransferTaxRate: 0.035,  // 3,5 % GrESt
  landRegisterRate: 0.011,           // 1,1 % Grundbuch Eigentum
  mortgageRegisterRate: 0.012,       // 1,2 % vom Kreditbetrag (nur bei Finanzierung)
  notaryContractRate: 0.02,          // 2,0 % Vertragserrichtung/Notar (editierbar)
  brokerCommissionRate: 0.03,        // 3,0 % netto Käuferanteil
  brokerVatRate: 0.20,               // 20 % USt → 3,6 % brutto
  financingFeeRate: 0.0,             // Bankgebühr – editierbar
} as const;

/* ──────────────────────────────────────────────────────────────────────────
 *  Deutschland – Grunderwerbsteuer je Bundesland (Stand 2024/2025)
 * ────────────────────────────────────────────────────────────────────────── */

/** Grunderwerbsteuer pro DE-Bundesland (Key = Bundesland-Name). */
export const DE_REAL_ESTATE_TRANSFER_TAX: Record<string, number> = {
  "Baden-Württemberg": 0.050,
  "Bayern": 0.035,
  "Berlin": 0.060,
  "Brandenburg": 0.065,
  "Bremen": 0.050,
  "Hamburg": 0.055,
  "Hessen": 0.060,
  "Mecklenburg-Vorpommern": 0.060,
  "Niedersachsen": 0.050,
  "Nordrhein-Westfalen": 0.065,
  "Rheinland-Pfalz": 0.050,
  "Saarland": 0.065,
  "Sachsen": 0.055,
  "Sachsen-Anhalt": 0.050,
  "Schleswig-Holstein": 0.065,
  "Thüringen": 0.065,
};

/**
 * Sicherer Fallback-GrESt-Satz, wenn das Bundesland unbekannt ist.
 * Bewusst konservativ (Median DE) gewählt.
 */
export const DE_FALLBACK_TRANSFER_TAX = 0.050;

/** Default-Bundesland, falls nichts gewählt ist (siehe Spec). */
export const DE_DEFAULT_BUNDESLAND = "Bayern";

/** DE-Defaults für alles außer GrESt. */
export const DE_DEFAULTS = {
  /**
   * Notar + Grundbuch (Eigentum) zusammen ~2,0 %.
   * Wir bilden das als Notarsatz 1,5 % + Grundbuch 0,5 % ab,
   * Summe entspricht der vom User erwarteten Pauschale.
   */
  notaryContractRate: 0.015,
  landRegisterRate: 0.005,
  /** In DE wird Pfandrecht meist im Notar-Pauschalsatz mit abgegolten. */
  mortgageRegisterRate: 0.0,
  /** 3,57 % brutto Käufer ≈ 3,0 % netto + 19 % MwSt. */
  brokerCommissionRate: 0.03,
  brokerVatRate: 0.19,
  financingFeeRate: 0.0,
} as const;

/* ──────────────────────────────────────────────────────────────────────────
 *  Resolver: erzeugt aus einem Property den effektiven Regelsatz.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Liefert die anzuwendenden Kostensätze für ein Property.
 *
 * Fallback-Hierarchie:
 *   1. Country: aus `p.land`. Unbekannt → Österreich.
 *   2. Region: aus `p.bundesland`. Unbekannt in DE → "Bayern"
 *      (bzw. {@link DE_FALLBACK_TRANSFER_TAX} falls auch nicht gemappt).
 *   3. Regionsspezifische Sätze aus `regions.ts` werden bevorzugt, sonst
 *      werden die Bundes-Defaults aus dieser Datei verwendet.
 */
export function resolvePurchaseCostRules(
  p: Pick<Property, "land" | "bundesland">,
): PurchaseCostRules {
  // Country: AT als sicherer Default (Bestandsdaten ohne Land).
  const country: Country = countryOf(p.land ?? null) ?? "AT";

  if (country === "AT") {
    const region = findRegion("AT", p.bundesland ?? null);
    return {
      country: "AT",
      regionLabel: region?.name ?? "Österreich",
      realEstateTransferTaxRate: region?.grunderwerbsteuerPct ?? AT_DEFAULTS.realEstateTransferTaxRate,
      landRegisterRate: region?.grundbuchPct ?? AT_DEFAULTS.landRegisterRate,
      mortgageRegisterRate: region?.pfandrechtPct ?? AT_DEFAULTS.mortgageRegisterRate,
      notaryContractRate: region?.vertragNotarPct ?? AT_DEFAULTS.notaryContractRate,
      brokerCommissionRate: region?.maklerProvisionPct ?? AT_DEFAULTS.brokerCommissionRate,
      brokerVatRate: region?.maklerUstPct ?? AT_DEFAULTS.brokerVatRate,
      financingFeeRate: AT_DEFAULTS.financingFeeRate,
    };
  }

  // Country === DE
  const bundeslandRaw = p.bundesland?.trim() || DE_DEFAULT_BUNDESLAND;
  const grEStFromMap = DE_REAL_ESTATE_TRANSFER_TAX[bundeslandRaw];
  const region = findRegion("DE", bundeslandRaw);
  const realEstateTransferTaxRate =
    grEStFromMap ?? region?.grunderwerbsteuerPct ?? DE_FALLBACK_TRANSFER_TAX;

  return {
    country: "DE",
    regionLabel: region?.name ?? bundeslandRaw,
    realEstateTransferTaxRate,
    landRegisterRate: region?.grundbuchPct ?? DE_DEFAULTS.landRegisterRate,
    mortgageRegisterRate: DE_DEFAULTS.mortgageRegisterRate,
    notaryContractRate: region?.vertragNotarPct ?? DE_DEFAULTS.notaryContractRate,
    brokerCommissionRate: region?.maklerProvisionPct ?? DE_DEFAULTS.brokerCommissionRate,
    brokerVatRate: region?.maklerUstPct ?? DE_DEFAULTS.brokerVatRate,
    financingFeeRate: DE_DEFAULTS.financingFeeRate,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Itemized Breakdown – ein Property + Regeln → konkrete €-Beträge.
 * ────────────────────────────────────────────────────────────────────────── */

export interface PurchaseCostBreakdown {
  grunderwerbsteuer: number;
  grundbuchkosten: number;
  vertragskosten: number;          // Notar / Vertragserrichtung
  finanzierungskosten: number;     // Pfandrecht + Bankgebühr
  sonstigeNK: number;
  /** Summe aller Posten OHNE Maklerprovision. */
  subtotalOhneMakler: number;
  rules: PurchaseCostRules;
}

/**
 * Berechnet die einzelnen Posten der Kaufnebenkosten (ohne Maklerprovision —
 * die wird in `calcPurchaseCosts` separat bidirektional berechnet).
 *
 * `override`-Werte (= vom User am Property eingegebene Zahlen) gewinnen
 * immer gegen die Regel-Defaults. Übergib `undefined`/`null`, wenn keine
 * User-Eingabe vorliegt.
 */
export function computePurchaseCostBreakdown(args: {
  kaufpreis: number;
  kreditBetragSchätzung: number;
  rules: PurchaseCostRules;
  overrides: {
    grunderwerbsteuer?: number | null;
    grundbuchkosten?: number | null;
    vertragskosten?: number | null;
    finanzierungskosten?: number | null;
    sonstigeNK?: number | null;
  };
}): PurchaseCostBreakdown {
  const { kaufpreis, kreditBetragSchätzung, rules, overrides } = args;
  const financingUsed = kreditBetragSchätzung > 0;

  const grunderwerbsteuer =
    overrides.grunderwerbsteuer ?? kaufpreis * rules.realEstateTransferTaxRate;

  const grundbuchkosten =
    overrides.grundbuchkosten ?? kaufpreis * rules.landRegisterRate;

  const vertragskosten =
    overrides.vertragskosten ?? kaufpreis * rules.notaryContractRate;

  // Pfandrechts-Eintragung nur, wenn finanziert wird.
  const pfandrecht = financingUsed
    ? kreditBetragSchätzung * rules.mortgageRegisterRate
    : 0;
  const bankFee = financingUsed
    ? kreditBetragSchätzung * rules.financingFeeRate
    : 0;
  const finanzierungskosten =
    overrides.finanzierungskosten ?? (pfandrecht + bankFee);

  const sonstigeNK = overrides.sonstigeNK ?? 0;

  const subtotalOhneMakler =
    grunderwerbsteuer + grundbuchkosten + vertragskosten + finanzierungskosten + sonstigeNK;

  return {
    grunderwerbsteuer,
    grundbuchkosten,
    vertragskosten,
    finanzierungskosten,
    sonstigeNK,
    subtotalOhneMakler,
    rules,
  };
}
