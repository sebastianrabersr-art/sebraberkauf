import type { Assumptions, FinanceScenario, Mietrecht, Property, ZinshausUnit } from "./types";
import { type PropertyCategory, categoryOf, defaultAfaSatz, garageRent, GARAGE_RECHT_TEXT, GEWERBERECHT_TEXT, isGewerbeMiete, landAppreciation, leerstandGewerbe } from "./propertyKinds";
import {
  computePurchaseCostBreakdown,
  resolvePurchaseCostRules,
  type PurchaseCostBreakdown,
} from "./purchaseCostRules";

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

/** Coerce to a finite number; non-finite/NaN/negative values fall back to `fallback`. */
function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return n;
}
function safeNonNeg(v: unknown, fallback = 0): number {
  const n = safeNum(v, fallback);
  return n < 0 ? 0 : n;
}

/**
 * Monthly annuity payment.
 *
 * - Annuitätenformel als Default.
 * - Zinssatz 0  → einfache lineare Tilgung pv / n.
 * - Negative/0 pv oder n  → 0 (kein NaN/Infinity).
 */
export function pmt(rateMonthly: number, n: number, pv: number): number {
  const r = safeNum(rateMonthly, 0);
  const periods = safeNum(n, 0);
  const principal = safeNum(pv, 0);
  if (principal <= 0 || periods <= 0) return 0;
  if (r === 0) return principal / periods;
  const denom = 1 - Math.pow(1 + r, -periods);
  if (!Number.isFinite(denom) || denom === 0) return 0;
  const result = (principal * r) / denom;
  return Number.isFinite(result) && result > 0 ? result : 0;
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
  maklerProvisionPct: number;
  maklerProvisionNetto: number;
  maklerProvisionUst: number;
  maklerProvisionBrutto: number;
  maklerProvisionUstPct: number;
  maklerKostenZahlbar: boolean;
  // ── Neue, additive Felder (UI-Code, der sie nicht kennt, ignoriert sie) ──
  /** Kombinierter Stresstest: Zins +1 %, Miete −10 %, Leerstand +5 %-Pkt. */
  stressedCashflowMtl: number;
  /** DSCR im kombinierten Stress-Szenario. */
  stressedDscr: number;
  /** 0–100 Deal Score. */
  dealScore: number;
  /** Qualitatives Rating zum dealScore. */
  dealRating: "excellent" | "good" | "ok" | "risky" | "bad";
  /** Kurze deutsche Zusammenfassung des Deals. */
  dealSummaryShort: string;
  /** Investor-Langzeitmodell (Asset/Cash/Loan-Entwicklung, Charts, Szenarien). */
  investorModel?: InvestorModel;
  /** Itemisierte Kaufnebenkosten (ohne Makler), wie sie in kaufNebenkosten eingehen. */
  nebenkostenBreakdown?: PurchaseCostBreakdown;
  /** Nur Grundstück: Ertrag allein aus Wertsteigerung (keine Miete, Kauf aus Eigenkapital). */
  grundstueck?: LandAppreciation;
}

export interface LandAppreciation {
  /** Wertsteigerung p.a. als Anteil (0.02 = 2 %). */
  wertsteigerungPct: number;
  /** Wertzuwachs im ersten Jahr (Kaufpreis × Satz). */
  wertsteigerungJahr: number;
  /** Grundstückswert nach 10 Jahren. */
  wert10J: number;
  /** Gewinn nach 10 Jahren: Wert − Gesamtkapital (inkl. Kaufnebenkosten). */
  gewinn10J: number;
  /** Rendite auf das eingesetzte Eigenkapital nach 10 Jahren, gesamt. */
  eigenkapitalrendite10J: number;
  /** Dieselbe Rendite pro Jahr (geometrisch). */
  renditePa: number;
}


/* ────────────────────────────────────────────────────────────────────────────
 * Internal pure sub-calculations used by calcProperty.
 * They are intentionally not exported – calcProperty stays the single
 * source of truth for the Calc shape consumed by the UI.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Maklerkosten + sonstige Kaufnebenkosten + Gesamtinvestitionssumme.
 *
 * Maklerprovision wird bidirektional gerechnet: der Wert, den der User
 * zuletzt bearbeitet hat (`provisionLastEdit`: pct | netto | brutto) ist
 * die Quelle der Wahrheit; die anderen Felder werden daraus abgeleitet.
 *
 * `kaufNebenkosten` = explizit eingegebene Posten (falls vorhanden),
 * sonst Pauschale = Kaufpreis × nebenkostenPct.
 *
 * `gesamtkosten` = Kaufpreis + Nebenkosten + Sanierung + Einrichtung + Reserve
 * (die Investitionssumme, auf der LTV und Nettorendite basieren).
 */
function calcPurchaseCosts(p: Property, a: Assumptions) {
  const kaufpreis = p.kaufpreis ?? 0;

  // Pauschalsatz für Nebenkosten (Legacy-Anzeige). Bleibt erhalten, wird
  // unten aus den itemisierten Posten neu abgeleitet, damit der Wert mit
  // der detaillierten Aufstellung übereinstimmt.
  const nebenkostenPctLegacy =
    p.makler === "Ja" ? a.nkMitMakler : p.makler === "Nein" ? a.nkOhneMakler : a.nkKonservativ;

  // ────────── Regelbasierte Defaults aus Land/Bundesland ──────────
  // Bestandsdaten ohne `land` werden in resolvePurchaseCostRules
  // automatisch als Österreich behandelt.
  const rules = resolvePurchaseCostRules(p);

  // Grobe Kreditbetrag-Schätzung für die Pfandrechts-Eintragung:
  // Falls ein FinanceScenario explizit einen Kreditbetrag definiert,
  // nehmen wir den – sonst „so viel wie das EK NICHT deckt".
  const activeFin = getActiveFinance(p);
  const baseInvest = kaufpreis + (p.sanierung || 0) + (p.einrichtung || 0) + (p.reserve || 0);
  const ekForFin = activeFin?.eigenkapital ?? a.eigenkapital;
  const kreditBetragSchätzung = activeFin?.kreditBetrag != null
    ? Math.max(0, activeFin.kreditBetrag)
    : Math.max(0, baseInvest - (ekForFin ?? 0));

  // Maklerkosten – bidirektional, "provisionLastEdit" = source of truth.
  // Die Default-Provision (provisionPct) kommt jetzt aus den zentralen
  // Regeln statt einem hartcodierten 3 %.
  const sellerIsPrivat = p.sellerType === "Privat";
  const maklerKostenZahlbar =
    p.maklerkostenZahlbar != null
      ? !!p.maklerkostenZahlbar
      : sellerIsPrivat
        ? false
        : p.makler === "Nein"
          ? false
          : p.makler === "Ja" || !!p.provisionPct || !!p.provisionEUR || !!p.provisionBruttoEUR || p.sellerType === "Makler";
  const maklerProvisionUstPct = p.maklerprovisionUstPct ?? rules.brokerVatRate;
  const provBasis = (p.provisionBasis ?? "brutto") === "netto" ? (p.kaufpreisNetto ?? kaufpreis) : (p.kaufpreisBrutto ?? kaufpreis);
  const last = p.provisionLastEdit ?? (p.provisionBruttoEUR != null ? "brutto" : p.provisionEUR != null ? "netto" : "pct");
  let maklerProvisionPct = 0, maklerProvisionNetto = 0, maklerProvisionBrutto = 0;
  if (maklerKostenZahlbar) {
    if (last === "brutto" && p.provisionBruttoEUR != null) {
      maklerProvisionBrutto = p.provisionBruttoEUR;
      maklerProvisionNetto = maklerProvisionBrutto / (1 + maklerProvisionUstPct);
      maklerProvisionPct = provBasis > 0 ? maklerProvisionNetto / provBasis : 0;
    } else if (last === "netto" && p.provisionEUR != null) {
      maklerProvisionNetto = p.provisionEUR;
      maklerProvisionBrutto = maklerProvisionNetto * (1 + maklerProvisionUstPct);
      maklerProvisionPct = provBasis > 0 ? maklerProvisionNetto / provBasis : 0;
    } else {
      maklerProvisionPct = p.provisionPct ?? rules.brokerCommissionRate;
      maklerProvisionNetto = provBasis * maklerProvisionPct;
      maklerProvisionBrutto = maklerProvisionNetto * (1 + maklerProvisionUstPct);
    }
  }
  const maklerProvisionUst = maklerProvisionBrutto - maklerProvisionNetto;

  // ────────── Itemisierte Posten via Rules-System ──────────
  // User-Eingaben am Property gewinnen IMMER gegen die Regel-Defaults
  // (siehe `overrides` weiter unten).
  const breakdown: PurchaseCostBreakdown = computePurchaseCostBreakdown({
    kaufpreis,
    kreditBetragSchätzung,
    rules,
    overrides: {
      grunderwerbsteuer: p.grunderwerbsteuer,
      grundbuchkosten: p.grundbuchkosten,
      vertragskosten: p.vertragskosten,
      finanzierungskosten: p.finanzierungskosten,
      sonstigeNK: p.sonstigeNK,
    },
  });

  const kaufNebenkosten = breakdown.subtotalOhneMakler + maklerProvisionBrutto;
  // nebenkostenPct = abgeleiteter effektiver Prozentsatz (für Anzeige).
  // Fällt auf den alten Pauschalsatz zurück, wenn kein Kaufpreis vorliegt.
  const nebenkostenPct = kaufpreis > 0 ? kaufNebenkosten / kaufpreis : nebenkostenPctLegacy;

  // Gesamtinvestition inkl. Sanierung, Einrichtung und Reserve.
  const gesamtkosten = kaufpreis + kaufNebenkosten + (p.sanierung || 0) + (p.einrichtung || 0) + (p.reserve || 0);

  return {
    nebenkostenPct,
    kaufNebenkosten,
    gesamtkosten,
    maklerKostenZahlbar,
    maklerProvisionPct,
    maklerProvisionNetto,
    maklerProvisionBrutto,
    maklerProvisionUst,
    maklerProvisionUstPct,
    breakdown,
  };
}

/**
 * Finanzierung: Eigenkapitaleinsatz, Kreditbetrag, Rate und abgeleitete KPIs.
 *
 * Berechnet:
 *  - totalCapitalNeed     = Gesamtinvestition (Kaufpreis + NK + Sanierung + …)
 *  - equityInput          = tatsächlich eingesetztes Eigenkapital (≤ Bedarf)
 *  - loanAmount           = benötigter Kreditbetrag (≥ 0)
 *  - ltv                  = loanAmount / totalCapitalNeed (0..1)
 *  - monthlyLoanPayment   = Annuität pro Monat (bei Zins 0 lineare Tilgung;
 *                            bei `endfaellig` nur Zinsen, keine Tilgung)
 *  - yearlyLoanPayment    = monthlyLoanPayment × 12
 *  - totalInterestPaid    = Summe aller gezahlten Zinsen über die Laufzeit
 *
 * Robustheit:
 *  - Fehlende Werte → sichere Defaults aus Assumptions.
 *  - Alle Outputs sind finite Zahlen ≥ 0 (kein NaN, kein Infinity,
 *    kein negativer Kreditbetrag).
 *  - Eigenkapital wird auf den tatsächlichen Bedarf gedeckelt.
 *
 * Die Rückgabe enthält weiterhin die bisherigen Felder
 * (eigenkapitalEinsatz, kreditBetrag, kreditRateMtl, annuitaet),
 * damit `calcProperty` und alle UI-Konsumenten unverändert funktionieren.
 */

/**
 * Zentrale Berechnung der Gesamtzinskosten über die gesamte Laufzeit.
 *
 *  - Annuität:          totalInterest = monthlyPayment × n − loanAmount
 *  - Zins 0 %:          totalInterest = 0
 *  - Endfällig:         totalInterest = loanAmount × annualRate × termYears
 *  - Manuelle Rate:     totalInterest = max(manualMonthlyPayment × n − loanAmount, 0)
 *
 * Schützt gegen NaN, Infinity und negative Werte und wird überall verwendet
 * (Finanzierungs-Summary, InvestorModel, Szenarienvergleich, Gesamtzins-Chart).
 */
export function calcTotalInterestPaid(args: {
  loanAmount: number;
  annualRate: number;
  termYears: number;
  monthlyPayment: number;
  tilgungsart?: "annuitaet" | "endfaellig" | "manuell";
}): number {
  const loan = safeNonNeg(args.loanAmount, 0);
  const rate = safeNonNeg(args.annualRate, 0);
  const years = Math.max(0, safeNum(args.termYears, 0));
  const pay = safeNonNeg(args.monthlyPayment, 0);
  const art = args.tilgungsart ?? "annuitaet";
  if (loan <= 0 || years <= 0) return 0;
  if (rate === 0 && art !== "manuell") return 0; // 0 % → keine Zinsen
  const months = years * 12;
  if (art === "endfaellig") {
    const v = loan * rate * years;
    return Number.isFinite(v) && v > 0 ? v : 0;
  }
  // Annuität & manuell: Summe der Zahlungen minus Tilgung = Zinsen.
  const v = pay * months - loan;
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function calcFinancing(p: Property, a: Assumptions, gesamtkosten: number) {
  const activeScn = getActiveFinance(p);

  // 1) Gesamter Kapitalbedarf (immer ≥ 0).
  const totalCapitalNeed = Math.max(0, safeNum(gesamtkosten, 0));

  // 2) Eigenkapitaleinsatz – nie negativ, nie größer als der Bedarf.
  const ekRaw = activeScn?.eigenkapital != null
    ? safeNum(activeScn.eigenkapital, 0)
    : safeNum(a.eigenkapital, 0);
  const equityInput = Math.min(Math.max(0, ekRaw), totalCapitalNeed);

  // 3) Kreditbetrag – explizit aus Szenario oder Differenz; nie negativ.
  const loanRaw = activeScn?.kreditBetrag != null
    ? safeNum(activeScn.kreditBetrag, 0)
    : totalCapitalNeed - equityInput;
  const loanAmount = Math.max(0, loanRaw);

  // 4) Konditionen – sichere Defaults aus Assumptions.
  const annualRate = safeNonNeg(activeScn?.zinssatz, safeNonNeg(a.zinssatz, 0));
  const laufzeitJahre = (() => {
    const v = safeNum(activeScn?.laufzeitJahre, safeNum(a.laufzeit, 0));
    return v > 0 ? v : 30; // sicherer Default, verhindert n=0
  })();
  const monthlyRate = annualRate / 12;
  const totalMonths = laufzeitJahre * 12;

  // 5) Monatsrate.
  //    - endfaellig: nur Zinsen monatlich.
  //    - manuell:    Durchschnitt aus manualSchedule (falls vorhanden), sonst Annuität.
  //    - Zins == 0:  lineare Tilgung (pmt() handhabt das).
  //    - sonst:      Annuität.
  const tilgungsart = activeScn?.tilgungsart;
  let monthlyLoanPayment = 0;
  if (loanAmount > 0) {
    if (tilgungsart === "endfaellig") {
      monthlyLoanPayment = loanAmount * monthlyRate; // 0 bei Zins 0
    } else if (tilgungsart === "manuell") {
      const sched = activeScn?.manualSchedule ?? [];
      const sumYear = sched.reduce((s, x) => s + safeNonNeg(x.payment, 0), 0);
      monthlyLoanPayment = sched.length > 0
        ? sumYear / sched.length / 12
        : pmt(monthlyRate, totalMonths, loanAmount);
    } else {
      monthlyLoanPayment = pmt(monthlyRate, totalMonths, loanAmount);
    }
  }
  monthlyLoanPayment = Number.isFinite(monthlyLoanPayment) && monthlyLoanPayment > 0
    ? monthlyLoanPayment
    : 0;

  const yearlyLoanPayment = monthlyLoanPayment * 12;

  // 6) Gezahlte Zinsen gesamt über die Laufzeit (zentrale Formel).
  const totalInterestPaid = calcTotalInterestPaid({
    loanAmount,
    annualRate,
    termYears: laufzeitJahre,
    monthlyPayment: monthlyLoanPayment,
    tilgungsart: tilgungsart === "endfaellig" || tilgungsart === "manuell"
      ? tilgungsart
      : "annuitaet",
  });

  // 7) LTV – nur sinnvoll, wenn Bedarf > 0.
  const ltvFinance = totalCapitalNeed > 0 ? loanAmount / totalCapitalNeed : 0;

  return {
    // bestehende Felder – Reihenfolge & Namen unverändert
    eigenkapitalEinsatz: equityInput,
    kreditBetrag: loanAmount,
    kreditRateMtl: monthlyLoanPayment,
    annuitaet: yearlyLoanPayment,
    // zusätzliche, intern nutzbare Kennzahlen
    totalCapitalNeed,
    equityInput,
    loanAmount,
    ltv: ltvFinance,
    monthlyLoanPayment,
    yearlyLoanPayment,
    totalInterestPaid,
  };
}


/**
 * Laufende, vermietungsbezogene Kosten pro Monat.
 *
 * Drei Positionen, die den Cashflow drücken aber oft verwechselt werden:
 *
 * 1. nichtUmlMtl  – Betriebskostenanteile, die der Vermieter selbst trägt
 *                   (z. B. Verwaltung, nicht umlagefähige Reparaturen).
 *                   User-Wert (`bkNichtUmlagefaehig`) oder Pauschale m² × `nichtUmlPerM2`.
 *
 * 2. ruecklageMtl – Instandhaltungsrücklage für künftige Sanierungen
 *                   (Dach, Fassade, Heizung). User-Wert oder m² × `ruecklagePerM2`.
 *
 * 3. leerstandMtl – kalkulatorischer Mietausfall (Leerstandspuffer).
 *                   Prozentsatz der Sollmiete (`leerstandPufferPct` oder
 *                   `leerstandPuffer` aus Assumptions).
 *
 * Die reine Betriebskosten-Position (umlagefähig) ist nicht Teil dieser
 * Rechnung – sie wird vom Mieter getragen.
 */
function calcRentalCosts(p: Property, a: Assumptions, miete: number, m2: number) {
  const nichtUmlMtl = p.bkNichtUmlagefaehig != null ? p.bkNichtUmlagefaehig : m2 * a.nichtUmlPerM2;
  const ruecklageMtl = p.ruecklageMtl != null ? p.ruecklageMtl : m2 * a.ruecklagePerM2;
  const leerstandPct = p.leerstandPufferPct != null ? p.leerstandPufferPct : a.leerstandPuffer;
  const leerstandMtl = miete * leerstandPct;

  return { nichtUmlMtl, ruecklageMtl, leerstandMtl, leerstandPct };
}

/**
 * Renditen, Cashflow, Stresstests und Break-Even-Kennzahlen.
 *
 * - bruttorendite   = Jahresmiete / Kaufpreis  (Schnellcheck)
 * - nettorendite    = (Jahresmiete − laufende Kosten) / Gesamtinvestition
 * - eigenkapitalrendite = Jahres-Cashflow / eingesetztes Eigenkapital
 * - dscr            = Miete / Kreditrate       (Bank-Sicht)
 * - ltv             = Kredit / Gesamtkosten
 * - breakEvenMiete  = Kreditrate + nicht-umlegbare BK + Rücklage
 *                     (Mindestmiete ohne Berücksichtigung des Leerstands)
 * - requiredBreakEvenRent = Break-Even unter Berücksichtigung des
 *                     Leerstandspuffers → "echte" Solbsoll-Miete.
 */
function calcInvestmentKpis(
  p: Property,
  a: Assumptions,
  inputs: {
    kaufpreis: number;
    m2: number;
    miete: number;
    gesamtkosten: number;
    eigenkapitalEinsatz: number;
    kreditBetrag: number;
    kreditRateMtl: number;
    nichtUmlMtl: number;
    ruecklageMtl: number;
    leerstandMtl: number;
    leerstandPct: number;
  },
) {
  // Alle Eingaben defensiv normalisieren – nichts darf NaN/Infinity werden.
  const kaufpreis = safeNonNeg(inputs.kaufpreis, 0);
  const m2 = safeNonNeg(inputs.m2, 0);
  const miete = safeNonNeg(inputs.miete, 0);
  const gesamtkosten = safeNonNeg(inputs.gesamtkosten, 0);
  const eigenkapitalEinsatz = safeNonNeg(inputs.eigenkapitalEinsatz, 0);
  const kreditBetrag = safeNonNeg(inputs.kreditBetrag, 0);
  const kreditRateMtl = safeNonNeg(inputs.kreditRateMtl, 0);
  const nichtUmlMtl = safeNonNeg(inputs.nichtUmlMtl, 0);
  const ruecklageMtl = safeNonNeg(inputs.ruecklageMtl, 0);
  const leerstandMtl = safeNonNeg(inputs.leerstandMtl, 0);
  const leerstandPct = Math.min(1, Math.max(0, safeNum(inputs.leerstandPct, 0)));

  // Investor-Cashflow: umlagefähige Betriebskosten zahlt der Mieter und
  // bleiben daher hier außen vor.
  const cashflowMtl = miete - kreditRateMtl - nichtUmlMtl - ruecklageMtl - leerstandMtl;
  const cashflowJahr = cashflowMtl * 12;

  const bruttorendite = kaufpreis > 0 ? (miete * 12) / kaufpreis : 0;
  const nettoJahr = miete * 12 - (nichtUmlMtl + ruecklageMtl + leerstandMtl) * 12;
  const nettorendite = gesamtkosten > 0 ? nettoJahr / gesamtkosten : 0;
  const eigenkapitalrendite = eigenkapitalEinsatz > 0 ? cashflowJahr / eigenkapitalEinsatz : 0;
  const preisProM2 = m2 > 0 ? kaufpreis / m2 : 0;
  const ltv = gesamtkosten > 0 ? kreditBetrag / gesamtkosten : 0;
  const dscr = kreditRateMtl > 0 ? miete / kreditRateMtl : 0;

  // Einzelne Stresstests – jeweils nur eine Variable verändert.
  const laufzeit = safeNum(a.laufzeit, 30) > 0 ? safeNum(a.laufzeit, 30) : 30;
  const rateStressZins = pmt(
    (safeNonNeg(a.zinssatz, 0) + safeNonNeg(a.zinsStress, 0)) / 12,
    laufzeit * 12,
    kreditBetrag,
  );
  const cashflowStressZins = miete - rateStressZins - nichtUmlMtl - ruecklageMtl - leerstandMtl;
  const cashflowStressLeerstand = cashflowMtl - (miete * safeNonNeg(a.leerstandStressMonate, 0)) / 12;
  const cashflowStressReparatur = cashflowMtl - safeNonNeg(a.reparaturStress, 0) / 12;

  // Kombiniertes Stress-Szenario: Zins +1 %, Miete −10 %, Leerstand +5 %-Pkt.
  const stressMiete = miete * 0.9;
  const stressRate = pmt(
    (safeNonNeg(a.zinssatz, 0) + 0.01) / 12,
    laufzeit * 12,
    kreditBetrag,
  );
  const stressLeerstandPct = Math.min(1, leerstandPct + 0.05);
  const stressLeerstandMtl = stressMiete * stressLeerstandPct;
  const stressedCashflowMtl = stressMiete - stressRate - nichtUmlMtl - ruecklageMtl - stressLeerstandMtl;
  const stressedDscr = stressRate > 0 ? stressMiete / stressRate : 0;

  const breakEvenMiete = kreditRateMtl + nichtUmlMtl + ruecklageMtl;
  const maxKaufpreisZielRendite = safeNonNeg(a.zielBrutto, 0) > 0 ? (miete * 12) / a.zielBrutto : 0;

  // Mit Leerstandspuffer hochskaliert: tatsächlich nötige Sollmiete.
  const denom = Math.max(0.0001, 1 - leerstandPct);
  const requiredBreakEvenRent = (kreditRateMtl + nichtUmlMtl + ruecklageMtl) / denom;
  const requiredBreakEvenRentPerM2 = m2 > 0 ? requiredBreakEvenRent / m2 : 0;

  return {
    cashflowMtl, cashflowJahr,
    bruttorendite, nettorendite, eigenkapitalrendite, preisProM2, ltv, dscr,
    cashflowStressZins, cashflowStressLeerstand, cashflowStressReparatur,
    stressedCashflowMtl, stressedDscr,
    breakEvenMiete, maxKaufpreisZielRendite,
    requiredBreakEvenRent, requiredBreakEvenRentPerM2,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Deal Score (0–100)
 *
 * Gewichtete Punkte aus:
 *  - Cashflow ........... 25
 *  - Bruttorendite ...... 15
 *  - Nettorendite ....... 15
 *  - Eigenkapitalrendite  15
 *  - LTV (niedriger=besser) 10
 *  - DSCR ............... 10
 *  - Stress-Cashflow .... 5
 *  - Datenvollständigkeit 5
 * ──────────────────────────────────────────────────────────────────────────── */
function clamp01(n: number) { return Math.max(0, Math.min(1, safeNum(n, 0))); }

function calcDealScore(
  p: Property,
  a: Assumptions,
  k: {
    cashflowMtl: number; bruttorendite: number; nettorendite: number;
    eigenkapitalrendite: number; ltv: number; dscr: number;
    stressedCashflowMtl: number;
  },
): { dealScore: number; dealRating: Calc["dealRating"]; dealSummaryShort: string } {
  // 1) Cashflow: 0€ = 0 Pkt, +500€ = volle Punkte (skaliert linear).
  const pCashflow = clamp01(k.cashflowMtl / 500) * 25;
  // 2) Brutto-/Nettorendite: am Ziel = volle Punkte.
  const pBrutto = clamp01(k.bruttorendite / Math.max(0.0001, a.zielBrutto)) * 15;
  const pNetto = clamp01(k.nettorendite / Math.max(0.0001, a.zielNetto)) * 15;
  // 3) EK-Rendite: 8 % = volle Punkte.
  const pEk = clamp01(k.eigenkapitalrendite / 0.08) * 15;
  // 4) LTV: 60 % = volle Punkte, 100 % = 0 Punkte.
  const pLtv = clamp01(1 - Math.max(0, k.ltv - 0.6) / 0.4) * 10;
  // 5) DSCR: 1.25 = volle Punkte.
  const pDscr = clamp01(k.dscr / 1.25) * 10;
  // 6) Stress: positiver Cashflow im Worst-Case = volle Punkte.
  const pStress = clamp01((k.stressedCashflowMtl + 200) / 400) * 5;
  // 7) Datenqualität.
  const dq = calcDataQuality(p).score / 100;
  const pDq = clamp01(dq) * 5;

  const raw = pCashflow + pBrutto + pNetto + pEk + pLtv + pDscr + pStress + pDq;
  const dealScore = Math.round(Math.max(0, Math.min(100, raw)));

  let dealRating: Calc["dealRating"] = "bad";
  if (dealScore >= 85) dealRating = "excellent";
  else if (dealScore >= 70) dealRating = "good";
  else if (dealScore >= 55) dealRating = "ok";
  else if (dealScore >= 40) dealRating = "risky";

  const summaryParts: string[] = [];
  if (k.cashflowMtl >= 0) summaryParts.push(`Cashflow ${fmtEUR(k.cashflowMtl)}/Mt`);
  else summaryParts.push(`negativer Cashflow ${fmtEUR(k.cashflowMtl)}/Mt`);
  summaryParts.push(`Brutto ${(k.bruttorendite * 100).toFixed(1)}%`);
  if (k.dscr > 0) summaryParts.push(`DSCR ${k.dscr.toFixed(2)}`);
  if (k.stressedCashflowMtl < 0) summaryParts.push("Stress negativ");
  const ratingLabel: Record<Calc["dealRating"], string> = {
    excellent: "Top-Deal", good: "solider Deal", ok: "okayer Deal",
    risky: "riskanter Deal", bad: "schwacher Deal",
  };
  const dealSummaryShort = `${ratingLabel[dealRating]} – ${summaryParts.join(", ")}.`;

  return { dealScore, dealRating, dealSummaryShort };
}

/**
 * Liefert den effektiven Gesamt-Kaufpreis – abhängig vom propertyType:
 *
 * - apartment / commercial / house_with_land:
 *     `totalPurchasePrice` (falls explizit gesetzt) sonst `kaufpreis`.
 * - house_with_separate_land:
 *     `housePurchasePrice + landPurchasePrice`, fällt zurück auf
 *     `totalPurchasePrice`/`kaufpreis`, falls nur einer der Werte gesetzt ist.
 * - land_only:
 *     `kaufpreis` (oder ersatzweise `landPurchasePrice` / `totalPurchasePrice`).
 *
 * Bestandsdaten ohne propertyType werden wie "apartment" behandelt.
 */
export function resolveTotalPurchasePrice(p: Property): number {
  const t = p.propertyType ?? "apartment";
  if (t === "house_with_separate_land") {
    const haus = p.housePurchasePrice ?? 0;
    const grund = p.landPurchasePrice ?? 0;
    const sum = haus + grund;
    if (sum > 0) return sum;
    return p.totalPurchasePrice ?? p.kaufpreis ?? 0;
  }
  if (t === "land_only") {
    return p.kaufpreis ?? p.landPurchasePrice ?? p.totalPurchasePrice ?? 0;
  }
  return p.totalPurchasePrice ?? p.kaufpreis ?? 0;
}

export interface ZinshausAggregate {
  einheiten: number;
  /** Einheiten mit Zustand "vermietet". */
  belegt: number;
  totalFlaeche: number;
  /** Summe der Kaltmieten aller Einheiten (Soll). */
  sollMiete: number;
  /** Summe miete × (1 − leerstand) der vermieteten Einheiten. */
  totalMiete: number;
  /** Mietgewichteter Leerstand: 1 − totalMiete / sollMiete. */
  leerstandsquote: number;
}

/**
 * Zinshaus: Miete und Fläche über alle Einheiten.
 * Leere und selbst genutzte Einheiten bringen keine Miete (zählen als 100 % Leerstand).
 */
export function calcZinshaus(units: ZinshausUnit[] | undefined): ZinshausAggregate {
  const list = units ?? [];
  let totalFlaeche = 0, sollMiete = 0, totalMiete = 0, belegt = 0;
  for (const u of list) {
    const flaeche = safeNonNeg(u.flaeche, 0);
    const miete = safeNonNeg(u.miete, 0);
    const leer = u.zustand === "vermietet" ? Math.min(1, safeNonNeg(u.leerstand, 0)) : 1;
    totalFlaeche += flaeche;
    sollMiete += miete;
    totalMiete += miete * (1 - leer);
    if (u.zustand === "vermietet") belegt++;
  }
  return {
    einheiten: list.length,
    belegt,
    totalFlaeche,
    sollMiete,
    totalMiete,
    leerstandsquote: sollMiete > 0 ? 1 - totalMiete / sollMiete : 0,
  };
}

/**
 * Grundstück: Ertrag nur aus Wertsteigerung. Gesamtkapital (Kaufpreis + Nebenkosten) gilt als
 * Eigenkapital, da ohne Finanzierung gerechnet wird.
 */
export function calcLandAppreciation(p: Property, kaufpreis: number, gesamtkosten: number): LandAppreciation {
  const pct = landAppreciation(p);
  const wert10J = kaufpreis * Math.pow(1 + pct, 10);
  const gewinn10J = wert10J - gesamtkosten;
  const eigenkapitalrendite10J = gesamtkosten > 0 ? gewinn10J / gesamtkosten : 0;
  const renditePa = gesamtkosten > 0 && wert10J > 0 ? Math.pow(wert10J / gesamtkosten, 1 / 10) - 1 : 0;
  return { wertsteigerungPct: pct, wertsteigerungJahr: kaufpreis * pct, wert10J, gewinn10J, eigenkapitalrendite10J, renditePa };
}

/** Zinshaus mit mindestens einer Einheit: Miete/Fläche kommen aus den Einheiten. */
export const isZinshausWithUnits = (p: Property) => p.propertyType === "zinshaus" && (p.units?.length ?? 0) > 0;

/**
 * Hauptfunktion – komponiert die obigen Bausteine zum Calc-Objekt.
 * Die Felder bleiben 1:1 wie bisher, damit kein UI-Code bricht.
 */
export function calcProperty(p: Property, a: Assumptions, _opts?: { portfolioCashflowMtl?: number }): Calc {
  void _opts;
  // Effektiver Kaufpreis nach propertyType-Logik. Wir reichen ein
  // "normalisiertes" Property an die internen Helfer weiter, damit
  // Pauschalsätze, LTV, Renditen etc. konsistent mit derselben Zahl rechnen.
  const effectiveKaufpreis = resolveTotalPurchasePrice(p);
  // Zinshaus: Leerstand steckt schon pro Einheit in der Miete → allgemeinen Puffer nicht doppelt abziehen.
  const zinshaus = isZinshausWithUnits(p) ? calcZinshaus(p.units) : null;
  const cat = categoryOf(p);
  const isLand = cat === "grundstueck";
  const isGarage = cat === "garage";
  let pn: Property = zinshaus
    ? { ...p, kaufpreis: effectiveKaufpreis, leerstandPufferPct: 0 }
    : { ...p, kaufpreis: effectiveKaufpreis };
  // Büro/Lager: Gewerbe-Leerstandsrisiko statt Wohn-Leerstandspuffer.
  if (isGewerbeMiete(p.propertyType)) pn = { ...pn, leerstandPufferPct: leerstandGewerbe(p) };
  // Garage: Betriebs- und Verwaltungskosten trägt der Eigentümer (Stellplatzmiete ist meist pauschal).
  if (isGarage && p.bkNichtUmlagefaehig == null) {
    pn = { ...pn, bkNichtUmlagefaehig: (p.betriebskostenMtl ?? 0) + (p.verwaltungskostenMtl ?? 0) };
  }
  // Grundstück: ohne Finanzierungs-Tab → Kauf aus Eigenkapital, keine Miete, keine laufenden Kosten.
  if (isLand) pn = { ...pn, financeScenarios: [], activeFinanceId: undefined, bkNichtUmlagefaehig: 0, ruecklageMtl: 0 };
  const aEff: Assumptions = isLand ? { ...a, eigenkapital: Number.MAX_SAFE_INTEGER } : a;

  // Wohnfläche: bei Häusern/Gewerbe nehmen wir alternativ livingAreaSqm
  // bzw. usableAreaSqm, damit Preis/m² und Rücklagen-Pauschale sinnvoll bleiben.
  // Zinshaus: Gesamtfläche und effektive Gesamtmiete aller Einheiten.
  // Garage/Grundstück: keine Wohnfläche (keine m²-Pauschalen für Rücklage und Kosten).
  const m2 = zinshaus ? zinshaus.totalFlaeche : isLand || isGarage ? 0 : p.wohnflaecheM2 ?? p.livingAreaSqm ?? p.usableAreaSqm ?? 0;
  const miete = zinshaus ? zinshaus.totalMiete : isLand ? 0 : isGarage ? garageRent(p) : p.nettomieteMtl ?? 0;

  const purchase = calcPurchaseCosts(pn, aEff);
  const financing = calcFinancing(pn, aEff, purchase.gesamtkosten);
  const rental = calcRentalCosts(pn, aEff, miete, m2);
  const kpisRaw = calcInvestmentKpis(pn, aEff, {
    kaufpreis: effectiveKaufpreis, m2, miete,
    gesamtkosten: purchase.gesamtkosten,
    eigenkapitalEinsatz: financing.eigenkapitalEinsatz,
    kreditBetrag: financing.kreditBetrag,
    kreditRateMtl: financing.kreditRateMtl,
    nichtUmlMtl: rental.nichtUmlMtl,
    ruecklageMtl: rental.ruecklageMtl,
    leerstandMtl: rental.leerstandMtl,
    leerstandPct: rental.leerstandPct,
  });

  // Grundstück: keine Mieterträge – Cashflow und Mietrenditen sind 0, Ertrag nur aus Wertsteigerung.
  const grundstueck = isLand ? calcLandAppreciation(p, effectiveKaufpreis, purchase.gesamtkosten) : undefined;
  const kpis = grundstueck
    ? {
        ...kpisRaw,
        cashflowMtl: 0, cashflowJahr: 0, bruttorendite: 0, nettorendite: 0,
        eigenkapitalrendite: grundstueck.renditePa,
        dscr: 0, breakEvenMiete: 0, requiredBreakEvenRent: 0, requiredBreakEvenRentPerM2: 0,
        cashflowStressZins: 0, cashflowStressLeerstand: 0, cashflowStressReparatur: 0, stressedCashflowMtl: 0, stressedDscr: 0,
      }
    : kpisRaw;

  // Deal-Score aus den KPIs ableiten.
  const deal = calcDealScore(pn, a, {
    cashflowMtl: kpis.cashflowMtl,
    bruttorendite: kpis.bruttorendite,
    nettorendite: kpis.nettorendite,
    eigenkapitalrendite: kpis.eigenkapitalrendite,
    ltv: kpis.ltv,
    dscr: kpis.dscr,
    stressedCashflowMtl: kpis.stressedCashflowMtl,
  });

  return {
    nebenkostenPct: purchase.nebenkostenPct,
    kaufNebenkosten: purchase.kaufNebenkosten,
    gesamtkosten: purchase.gesamtkosten,
    eigenkapitalEinsatz: financing.eigenkapitalEinsatz,
    kreditBetrag: financing.kreditBetrag,
    kreditRateMtl: financing.kreditRateMtl,
    annuitaet: financing.annuitaet,
    nichtUmlMtl: rental.nichtUmlMtl,
    ruecklageMtl: rental.ruecklageMtl,
    leerstandMtl: rental.leerstandMtl,
    cashflowMtl: kpis.cashflowMtl,
    cashflowJahr: kpis.cashflowJahr,
    bruttorendite: kpis.bruttorendite,
    nettorendite: kpis.nettorendite,
    eigenkapitalrendite: kpis.eigenkapitalrendite,
    preisProM2: kpis.preisProM2,
    ltv: kpis.ltv,
    dscr: kpis.dscr,
    cashflowStressZins: kpis.cashflowStressZins,
    cashflowStressLeerstand: kpis.cashflowStressLeerstand,
    cashflowStressReparatur: kpis.cashflowStressReparatur,
    breakEvenMiete: kpis.breakEvenMiete,
    maxKaufpreisZielRendite: kpis.maxKaufpreisZielRendite,
    requiredBreakEvenRent: kpis.requiredBreakEvenRent,
    requiredBreakEvenRentPerM2: kpis.requiredBreakEvenRentPerM2,
    maklerProvisionPct: purchase.maklerProvisionPct,
    maklerProvisionNetto: purchase.maklerProvisionNetto,
    maklerProvisionUst: purchase.maklerProvisionUst,
    maklerProvisionBrutto: purchase.maklerProvisionBrutto,
    maklerProvisionUstPct: purchase.maklerProvisionUstPct,
    maklerKostenZahlbar: purchase.maklerKostenZahlbar,
    stressedCashflowMtl: kpis.stressedCashflowMtl,
    stressedDscr: kpis.stressedDscr,
    dealScore: deal.dealScore,
    dealRating: deal.dealRating,
    dealSummaryShort: deal.dealSummaryShort,
    nebenkostenBreakdown: purchase.breakdown,
    grundstueck,
    investorModel: calcInvestorModel(pn, aEff, {
      kaufpreis: effectiveKaufpreis,
      gesamtkosten: purchase.gesamtkosten,
      eigenkapitalEinsatz: financing.eigenkapitalEinsatz,
      kreditBetrag: financing.kreditBetrag,
      kreditRateMtl: financing.kreditRateMtl,
      cashflowJahr: kpis.cashflowJahr,
      dealScore: deal.dealScore,
    }),
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

/**
 * Pflichtfelder der Datenqualität. `only` schränkt ein Feld auf Objektkategorien ein
 * (fehlt es, gilt das Feld für Wohnung, Haus und Zinshaus wie bisher sowie für die übrigen,
 * sofern nicht `skip` sie ausnimmt).
 */
type DqField = {
  key: string; label: string; check: (p: Property) => boolean;
  group: "basis" | "kosten" | "finanzierung" | "bewertung";
  only?: PropertyCategory[]; skip?: PropertyCategory[];
};
const NO_RENT: PropertyCategory[] = ["grundstueck"];
const REQUIRED_FIELDS: DqField[] = [
  // BASIS
  { key: "kaufpreis",       label: "Kaufpreis",          group: "basis",        check: (p) => !!p.kaufpreis && p.kaufpreis > 0 },
  { key: "wohnflaecheM2",   label: "Wohnfläche m²",      group: "basis",        check: (p) => !!p.wohnflaecheM2 && p.wohnflaecheM2 > 0, skip: ["garage", "grundstueck"] },
  { key: "landAreaSqm",     label: "Grundstücksfläche",  group: "basis",        check: (p) => !!p.landAreaSqm && p.landAreaSqm > 0, only: ["grundstueck"] },
  { key: "widmung",         label: "Widmung",            group: "basis",        check: (p) => !!p.widmung, only: ["grundstueck"] },
  { key: "nettomieteMtl",   label: "Erwartete Miete",    group: "basis",        check: (p) => garageRent(p) > 0 || (!!p.nettomieteMtl && p.nettomieteMtl > 0), skip: NO_RENT },
  { key: "anzahlStellplaetze", label: "Anzahl Stellplätze", group: "basis",    check: (p) => (p.anzahlStellplaetze ?? 0) > 0, only: ["garage"] },
  { key: "zimmer",          label: "Zimmer",             group: "basis",        check: (p) => !!p.zimmer && p.zimmer > 0, only: ["wohnung", "haus", "zinshaus"] },
  { key: "bezirk",          label: "Bezirk / PLZ",       group: "basis",        check: (p) => !!p.bezirk?.trim() || !!p.city?.trim() },
  // KOSTEN
  { key: "makler",            label: "Makler Ja/Nein",      group: "kosten",     check: (p) => p.makler === "Ja" || p.makler === "Nein" },
  { key: "betriebskostenMtl", label: "Betriebskosten",      group: "kosten",     check: (p) => p.betriebskostenMtl != null && p.betriebskostenMtl >= 0, skip: NO_RENT },
  // FINANZIERUNG (Grundstück wird ohne Finanzierung gerechnet)
  { key: "eigenkapital", label: "Eigenkapital", group: "finanzierung", skip: NO_RENT, check: (p) => {
    const fin = getActiveFinance(p);
    return fin != null ? (fin.eigenkapital ?? 0) > 0 : false;
  } },
  { key: "zinssatz", label: "Zinssatz", group: "finanzierung", skip: NO_RENT, check: (p) => {
    const fin = getActiveFinance(p);
    return fin != null ? (fin.zinssatz ?? 0) > 0 : false;
  } },
  // BEWERTUNG
  { key: "baujahr",     label: "Baujahr",      group: "bewertung", check: (p) => !!p.baujahr && p.baujahr > 1800, skip: NO_RENT },
  { key: "zustand",     label: "Zustand",      group: "bewertung", check: (p) => !!p.zustand?.trim(), skip: NO_RENT },
  // Mietrecht nur im Wohnrecht – Gewerbe, Garage und Grundstück haben keine MRG-Einstufung.
  { key: "mietrecht",   label: "Mietrecht",    group: "bewertung", check: (p) => !!p.mietrecht && p.mietrecht !== "unklar – rechtlich prüfen", only: ["wohnung", "haus", "zinshaus"] },
  { key: "energyClass", label: "Energieklasse", group: "bewertung", check: (p) => !!p.energyClass?.trim(), skip: ["garage", "grundstueck"] },
];

const appliesTo = (f: DqField, p: Property) => {
  const c = categoryOf(p);
  if (f.only) return f.only.includes(c);
  return !(f.skip?.includes(c));
};
const fieldsFor = (p: Property) => REQUIRED_FIELDS.filter((f) => appliesTo(f, p));

export function getRequiredFieldGroups() {
  return ["basis", "kosten", "finanzierung", "bewertung"] as const;
}
/** Pflichtfelder einer Gruppe; mit Objekt nur die, die für dessen Kategorie gelten. */
export function getFieldsByGroup(group: string, p?: Property) {
  return (p ? fieldsFor(p) : REQUIRED_FIELDS).filter((f) => f.group === group);
}

export function calcDataQuality(p: Property): DataQuality {
  const fields = fieldsFor(p);
  const missing = fields.filter((f) => !f.check(p)).map((f) => f.label);
  const filled = fields.length - missing.length;
  const score = fields.length ? Math.round((filled / fields.length) * 100) : 100;
  let level: DataQuality["level"] = "Manuelle Prüfung nötig";
  let ampel: DataQuality["ampel"] = "red";
  if (score >= 90) { level = "Sehr gut"; ampel = "green"; }
  else if (score >= 70) { level = "Gut"; ampel = "green"; }
  else if (score >= 50) { level = "Unvollständig"; ampel = "yellow"; }
  return { score, level, ampel, missing, filled, total: fields.length };
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

export function mapsUrl(p: Pick<Property, "adresse" | "bezirk" | "city" | "bundesland" | "land" | "googleMapsUrlOverride">): string | null {
  const override = (p.googleMapsUrlOverride || "").trim();
  if (override) {
    if (/^https?:\/\//i.test(override)) return override;
  }
  // Prefer precise address
  const hasPrecise = !!(p.adresse && p.adresse.trim().length > 2);
  const parts = hasPrecise
    ? [p.adresse, p.bezirk, p.city, p.bundesland, p.land]
    : [p.bezirk, p.city, p.bundesland, p.land];
  const cleaned = parts.map((x) => (x || "").trim()).filter((x) => x.length > 0);
  if (cleaned.length === 0) return null;
  // encodeURIComponent handles Umlaute, spaces, special chars correctly
  const q = encodeURIComponent(cleaned.join(", "));
  return `https://www.openstreetmap.org/search?query=${q}`;
}

export function mapsUrlFromCoords(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`;
}

export { mapsUrl as googleMapsUrl };

export interface ScoreCategory {
  key: "lage" | "zahlen" | "vermietbarkeit" | "zustand" | "recht" | "wiederverkauf";
  label: string;
  max: number;
  value: number;
  explain: string;
  missing?: string[];
}

export function scoreBreakdown(p: Property, a: Assumptions, c: Calc, s: Score): ScoreCategory[] {
  const zahlenMissing: string[] = [];
  if (!p.kaufpreis) zahlenMissing.push("Kaufpreis");
  if (!p.nettomieteMtl) zahlenMissing.push("Miete");
  const zustandMissing: string[] = [];
  if (!p.zustand?.trim()) zustandMissing.push("Zustand");
  if (!p.baujahr) zustandMissing.push("Baujahr");
  const rechtMissing: string[] = [];
  if (!p.mietrecht || p.mietrecht === "unklar – rechtlich prüfen") rechtMissing.push("Mietrechtskategorie");
  return [
    { key: "lage", label: "Lage", max: 25, value: p.scoreLage, explain: "Mikro- & Makrolage, Anbindung, Umfeld.",
      missing: p.bezirk ? undefined : ["Bezirk"] },
    { key: "zahlen", label: "Zahlen / Rendite", max: 25, value: s.zahlen,
      explain: `Bruttorendite ${(c.bruttorendite*100).toFixed(2)}% vs. Ziel ${(a.zielBrutto*100).toFixed(1)}%.`,
      missing: zahlenMissing.length ? zahlenMissing : undefined },
    { key: "vermietbarkeit", label: "Vermietbarkeit", max: 20, value: p.scoreVermietbarkeit,
      explain: "Nachfrage, Zielmiete, Lage zum Mietmarkt.", missing: p.nettomieteMtl ? undefined : ["Mietansatz"] },
    { key: "zustand", label: "Zustand / Sanierungsrisiko", max: 15, value: p.scoreZustand,
      explain: "Allgemeinzustand, Sanierungsbedarf, Alter.", missing: zustandMissing.length ? zustandMissing : undefined },
    { key: "recht", label: "Mietrecht / rechtliches Risiko", max: 10, value: p.scoreRecht,
      explain: "MRG/Richtwert, Mietpreisbremse, Befristungen.", missing: rechtMissing.length ? rechtMissing : undefined },
    { key: "wiederverkauf", label: "Wiederverkaufbarkeit", max: 5, value: p.scoreWiederverkauf,
      explain: "Marktgängigkeit, Lage, Objekttyp." },
  ];
}


export interface MietrechtInference {
  kategorie: Mietrecht;
  erklaerung: string;
  risiko: "niedrig" | "mittel" | "hoch";
  pruefen: string[];
}

export function inferMietrecht(p: Property): MietrechtInference {
  const kat = categoryOf(p);
  if (kat === "buero" || kat === "lager") return {
    kategorie: "Gewerbliche Nutzung relevant",
    erklaerung: GEWERBERECHT_TEXT,
    risiko: "niedrig",
    pruefen: ["Laufzeit des Mietvertrags", "Indexierung (VPI)", "Kündigungsfristen", "Umsatzsteuer-Option"],
  };
  if (kat === "garage") return {
    kategorie: "freie Mietzinsbildung wahrscheinlich",
    erklaerung: GARAGE_RECHT_TEXT,
    risiko: "niedrig",
    pruefen: ["Mietvertrag", "Nutzungsrecht in der Eigentümergemeinschaft"],
  };
  if (kat === "grundstueck") return {
    kategorie: "nicht geeignet",
    erklaerung: "Unbebautes Grundstück: keine Vermietung, kein Mietrecht. Wichtig sind Widmung, Erschließung und Bebaubarkeit.",
    risiko: "niedrig",
    pruefen: ["Flächenwidmung", "Erschließung", "Bebauungsplan / Bebaubarkeit"],
  };
  const y = p.baujahr ?? 0;
  const text = `${p.beschreibung ?? ""} ${p.objekttyp ?? ""} ${p.zustand ?? ""}`.toLowerCase();
  const isAirbnb = /airbnb|kurzzeit|tourist|ferienwohnung/.test(text);
  const isGewerblich = /gewerbl|büro|lokal|geschäftsl/.test(text);
  const land = (p.land ?? "").toLowerCase();
  const isDE = land === "deutschland" || land === "de" || land === "germany";

  if (isAirbnb) return {
    kategorie: "Kurzzeitvermietung / Airbnb prüfen",
    erklaerung: isDE
      ? "Kurzzeitvermietung ist in vielen Städten (Berlin, München, Hamburg) zweckentfremdungsrechtlich beschränkt."
      : "Kurzzeitvermietung wird in Wien strikt reguliert (Bauordnung-Novelle 2024). Vor Kauf widmungsrechtlich prüfen.",
    risiko: "hoch",
    pruefen: ["Widmung / Zweckentfremdung","kommunale Vermietungsregeln","Eigentümergemeinschaft erlaubt es?"],
  };
  if (isGewerblich) return {
    kategorie: "Gewerbliche Nutzung relevant",
    erklaerung: "Gewerbliche Nutzung unterliegt nicht dem Wohnungs-Mietzinsschutz – andere Bewertung der Mieten.",
    risiko: "mittel",
    pruefen: ["Mietvertrag","Indexierung","Befristung","Umsatzsteuer-Option"],
  };

  if (isDE) {
    // Deutschland – Mietpreisbremse / Mietspiegel
    if (y >= 2014) return {
      kategorie: "freie Mietzinsbildung wahrscheinlich",
      erklaerung: `Errichtet ${y}. Erstmals nach 01.10.2014 bezugsfertige Neubauten sind grundsätzlich von der Mietpreisbremse ausgenommen.`,
      risiko: "niedrig",
      pruefen: ["Erstbezug-Datum","umfassende Modernisierung","ortsübliche Vergleichsmiete"],
    };
    if (y > 0) return {
      kategorie: "Mietpreisbremse möglich",
      erklaerung: `Errichtet ${y}. In Gebieten mit angespanntem Wohnungsmarkt darf die Miete bei Wiedervermietung max. 10 % über der ortsüblichen Vergleichsmiete liegen.`,
      risiko: "mittel",
      pruefen: ["Gilt Mietpreisbremse in dieser Gemeinde?","qualifizierter Mietspiegel","Kappungsgrenze 15 % in 3 Jahren","Modernisierungsumlage"],
    };
    return {
      kategorie: "Mietspiegel relevant",
      erklaerung: "Baujahr unbekannt – ortsüblicher Mietspiegel und Mietpreisbremse müssen geprüft werden.",
      risiko: "hoch",
      pruefen: ["Baujahr","Erstbezug-Datum","qualifizierter Mietspiegel","gilt Mietpreisbremse?"],
    };
  }

  // Österreich (Default)
  if (y >= 1953) return {
    kategorie: "freie Mietzinsbildung wahrscheinlich",
    erklaerung: `Errichtet ${y}. Gebäude nach 1953 (bzw. mit Baubewilligung nach 30.06.1953) sind im Vollanwendungsbereich des MRG vom Richtwert ausgenommen → freie Mietzinsvereinbarung möglich.`,
    risiko: "niedrig",
    pruefen: ["Bauwidmung","ev. Förderdarlehen","Befristungsabschlag bei befristeten Verträgen"],
  };
  if (y >= 1945) return {
    kategorie: "MRG Teilanwendung möglich",
    erklaerung: `Errichtet ${y}. Häuser mit Baubewilligung 1945–1953 fallen oft in die Teilanwendung des MRG – freie Mietzinsbildung mit eingeschränkten Schutzbestimmungen.`,
    risiko: "mittel",
    pruefen: ["genaues Baubewilligungsdatum","Förderungs-/Sanierungsstatus","Kategorie der Wohnung"],
  };
  if (y > 0 && y < 1945) return {
    kategorie: "Richtwertmietzins möglich",
    erklaerung: `Errichtet ${y}. Altbau vor 1945 fällt typischerweise in den Vollanwendungsbereich des MRG → Richtwertmietzins + Zu-/Abschläge. Das deckelt die erzielbare Miete erheblich.`,
    risiko: "hoch",
    pruefen: ["Lagezuschlag-Karte","Ausstattungskategorie","Zu-/Abschläge","befristete vs. unbefristete Vermietung"],
  };
  return {
    kategorie: "unklar – professionell prüfen",
    erklaerung: "Baujahr unbekannt – Mietrecht kann nicht eingeschätzt werden.",
    risiko: "hoch",
    pruefen: ["Baujahr/Baubewilligungsdatum","Widmung","bestehende Mietverträge"],
  };
}

export function getActiveFinance(p: Property): FinanceScenario | undefined {
  const list = p.financeScenarios ?? [];
  if (list.length === 0) return undefined;
  return list.find((s) => s.id === p.activeFinanceId) ?? list[0];
}

export interface AmortYear {
  year: number;
  payment: number;
  interest: number;
  principal: number;
  extraPayment: number;
  balanceEnd: number;
  cumulativeInterest: number;
}

export function calcAmortizationSchedule(scn: FinanceScenario): AmortYear[] {
  const periodsPerYear = scn.intervall === "monatlich" ? 12 : scn.intervall === "quartalsweise" ? 4 : 1;
  const totalPeriods = Math.max(1, Math.round(scn.laufzeitJahre * periodsPerYear));
  const periodRate = (scn.zinssatz || 0) / periodsPerYear;
  const principal = scn.kreditBetrag ?? 0;
  if (principal <= 0) return [];

  let payment = 0;
  if (scn.tilgungsart === "annuitaet") {
    payment = periodRate === 0 ? principal / totalPeriods : (principal * periodRate) / (1 - Math.pow(1 + periodRate, -totalPeriods));
  } else if (scn.tilgungsart === "endfaellig") {
    payment = principal * periodRate; // interest only
  }

  const start = scn.startDate ? new Date(scn.startDate) : new Date();
  const startYear = start.getFullYear();
  const sondertilgungenByYear: Record<number, number> = {};
  (scn.sondertilgungen ?? []).forEach((s) => {
    const y = new Date(s.date).getFullYear();
    sondertilgungenByYear[y] = (sondertilgungenByYear[y] ?? 0) + (s.amount || 0);
  });

  let balance = principal;
  let cumInterest = 0;
  const yearAgg: Record<number, AmortYear> = {};

  for (let i = 0; i < totalPeriods && balance > 0.01; i++) {
    const periodDate = new Date(start);
    if (scn.intervall === "monatlich") periodDate.setMonth(start.getMonth() + i);
    else if (scn.intervall === "quartalsweise") periodDate.setMonth(start.getMonth() + i * 3);
    else periodDate.setFullYear(start.getFullYear() + i);
    const y = periodDate.getFullYear();

    let interest = balance * periodRate;
    let principalPay = 0;
    if (scn.tilgungsart === "annuitaet") {
      principalPay = Math.min(balance, payment - interest);
    } else if (scn.tilgungsart === "endfaellig") {
      principalPay = i === totalPeriods - 1 ? balance : 0;
    } else if (scn.tilgungsart === "manuell") {
      const m = (scn.manualSchedule ?? []).find((x) => x.year === y);
      const yearPay = m?.payment ?? 0;
      const perPeriodPay = yearPay / periodsPerYear;
      principalPay = Math.max(0, perPeriodPay - interest);
      if (principalPay > balance) principalPay = balance;
    }

    balance -= principalPay;
    cumInterest += interest;
    const totalPay = principalPay + interest;

    if (!yearAgg[y]) yearAgg[y] = { year: y, payment: 0, interest: 0, principal: 0, extraPayment: 0, balanceEnd: 0, cumulativeInterest: 0 };
    yearAgg[y].payment += totalPay;
    yearAgg[y].interest += interest;
    yearAgg[y].principal += principalPay;
  }

  // Sondertilgungen anwenden
  const years = Object.keys(yearAgg).map(Number).sort((a, b) => a - b);
  let runningBalance = principal;
  let runningCum = 0;
  for (const y of years) {
    runningBalance -= yearAgg[y].principal;
    const extra = sondertilgungenByYear[y] ?? 0;
    const appliedExtra = Math.min(Math.max(0, runningBalance), extra);
    runningBalance -= appliedExtra;
    yearAgg[y].extraPayment = appliedExtra;
    yearAgg[y].payment += appliedExtra;
    yearAgg[y].balanceEnd = Math.max(0, runningBalance);
    runningCum += yearAgg[y].interest;
    yearAgg[y].cumulativeInterest = runningCum;
  }

  return years.map((y) => yearAgg[y]);
}

export function makeFinanceScenario(partial: Partial<FinanceScenario> = {}): FinanceScenario {
  return {
    id: crypto.randomUUID(),
    name: partial.name ?? "Bank-Szenario",
    bankName: "",
    ansprechpartner: "",
    status: "Anfrage",
    kreditBetrag: null,
    eigenkapital: null,
    zinssatz: 0.038,
    zinsbindung: "fix",
    zinsbindungJahre: 10,
    laufzeitJahre: 30,
    intervall: "monatlich",
    tilgungsart: "annuitaet",
    startDate: new Date().toISOString().slice(0, 10),
    sondertilgungen: [],
    manualSchedule: [],
    notizen: "",
    ...partial,
  };
}

export interface ScenarioSummary {
  ratePerPeriod: number;
  ratePerMonth: number;
  annualDebtService: number;
  totalInterest: number;
  totalPayment: number;
  balanceAfter5: number;
  balanceAfter10: number;
  cashflowMtl: number;
  dscr: number;
  breakEvenMiete: number;
}

/** Per-scenario summary using the property's other costs but this scenario's terms. */
export function summarizeScenario(p: Property, a: Assumptions, scn: FinanceScenario): ScenarioSummary {
  const overridden: Property = { ...p, financeScenarios: [scn], activeFinanceId: scn.id };
  const c = calcProperty(overridden, a);
  const sched = calcAmortizationSchedule(scn);
  const totalInterest = sched.reduce((s, y) => s + y.interest, 0);
  const totalPayment = sched.reduce((s, y) => s + y.payment, 0);
  const startYear = sched[0]?.year ?? new Date().getFullYear();
  const findBal = (offset: number) => {
    const target = startYear + offset - 1;
    const row = sched.find((r) => r.year === target);
    return row ? row.balanceEnd : (offset >= sched.length ? 0 : (scn.kreditBetrag ?? 0));
  };
  const periodsPerYear = scn.intervall === "monatlich" ? 12 : scn.intervall === "quartalsweise" ? 4 : 1;
  const ratePerPeriod = c.kreditRateMtl * 12 / periodsPerYear;
  return {
    ratePerPeriod,
    ratePerMonth: c.kreditRateMtl,
    annualDebtService: c.kreditRateMtl * 12,
    totalInterest,
    totalPayment,
    balanceAfter5: findBal(5),
    balanceAfter10: findBal(10),
    cashflowMtl: c.cashflowMtl,
    dscr: c.dscr,
    breakEvenMiete: c.requiredBreakEvenRent,
  };
}

/** Yearly remaining-debt series for charting comparisons. */
export function calcBalanceSeries(scn: FinanceScenario): { year: number; balance: number }[] {
  const sched = calcAmortizationSchedule(scn);
  if (sched.length === 0) return [];
  const out: { year: number; balance: number }[] = [{ year: sched[0].year - 1, balance: scn.kreditBetrag ?? 0 }];
  sched.forEach((y) => out.push({ year: y.year, balance: y.balanceEnd }));
  return out;
}

export interface AfaResult {
  basis: number;
  grundAnteilPct: number;
  gebaeudeAnteilPct: number;
  gebaeudewert: number;
  satzPct: number;
  jahresAfa: number;
  methode: "linear" | "manuell";
  hinweis: string;
}

export function calcAfa(p: Property): AfaResult {
  const a = p.afa ?? {};
  const land: "AT" | "DE" = a.land ?? "AT";
  const methode = a.methode ?? "linear";
  const basis = a.basis ?? p.kaufpreis ?? 0;
  let grundPct = a.grundAnteilPct ?? (p.objektartDetail === "Haus" ? 30 : p.objektartDetail === "Grundstück" ? 100 : 20);
  let gebPct = a.gebaeudeAnteilPct ?? Math.max(0, 100 - grundPct);
  // normalize
  if (grundPct + gebPct === 0) { grundPct = 20; gebPct = 80; }
  const gebaeudewert = basis * (gebPct / 100);
  const kat = categoryOf(p);
  const defaultSatz = kat === "garage" || kat === "grundstueck" ? 0 : land === "DE" ? 2 : defaultAfaSatz(p.propertyType) * 100;
  const satzPct = a.satzPct ?? defaultSatz;
  const jahresAfa = methode === "manuell" && a.jahresBetrag != null
    ? a.jahresBetrag
    : gebaeudewert * (satzPct / 100);
  const hinweis = land === "DE"
    ? "DE: Lineare AfA Wohngebäude i.d.R. 2 % p.a. (bzw. 2,5 % bei Bauantrag vor 1925, 3 % bei Fertigstellung ab 01.01.2023). Keine Steuerberatung."
    : "AT: Lineare AfA für vermietete Wohngebäude i.d.R. 1,5 % p.a. Sonderregeln bei Sanierung/Denkmalschutz möglich. Keine Steuerberatung.";
  return { basis, grundAnteilPct: grundPct, gebaeudeAnteilPct: gebPct, gebaeudewert, satzPct, jahresAfa, methode, hinweis };
}

export interface TaxEstimate {
  steuersatz: number;
  afaSatz: number;
  gebaeudewertPct: number;
  kaufpreis: number;
  gebaeudewert: number;
  afaJahr: number;
  afaMtl: number;
  gewinnVorAfa: number;
  /** Steuerlich relevanter Gewinn (steuerpflichtige Einkünfte). */
  gewinnNachAfa: number;
  steuerBetrag: number;
  cashflowNachSteuer: number;
}

/**
 * Vereinfachte Steuer-Schätzung aus dem Analysen-Tab ("Steuer & AfA").
 * Unverändert aus TaxPanel übernommen, damit App und PDF-Export dieselben Zahlen zeigen.
 */
export function calcTaxEstimate(p: Property, c: Calc): TaxEstimate {
  const steuersatz = p.persSteuersatz ?? 0.35;
  const afaSatz = p.afaSatz ?? defaultAfaSatz(p.propertyType);
  const gebaeudewertPct = p.gebaeudewertPct ?? 0.7;

  const kaufpreis = p.kaufpreis ?? 0;
  const gebaeudewert = kaufpreis * gebaeudewertPct;
  const afaJahr = gebaeudewert * afaSatz;
  const afaMtl = afaJahr / 12;

  const miete = p.nettomieteMtl ?? 0;
  const kosten = (p.betriebskostenMtl ?? 0) + c.ruecklageMtl + (c.kreditRateMtl * 0.6);
  const gewinnVorAfa = (miete - kosten) * 12;
  const gewinnNachAfa = gewinnVorAfa - afaJahr;
  const steuerBetrag = Math.max(0, gewinnNachAfa * steuersatz);
  const cashflowNachSteuer = c.cashflowJahr - steuerBetrag;

  return { steuersatz, afaSatz, gebaeudewertPct, kaufpreis, gebaeudewert, afaJahr, afaMtl, gewinnVorAfa, gewinnNachAfa, steuerBetrag, cashflowNachSteuer };
}

export interface ProjectionYear {
  year: number;
  miete: number;
  betriebskosten: number;
  instandhaltung: number;
  rate: number;
  cashflow: number;
  immoWert: number;
  restschuld: number;
}

export function calcLongTermProjection(p: Property, a: Assumptions, c: Calc): ProjectionYear[] {
  const proj = p.projections ?? {};
  const horizon = Math.max(1, Math.min(40, proj.horizonJahre ?? 10));
  const mSteig = (proj.mietsteigerungPct ?? 2) / 100;
  const kSteig = (proj.kostensteigerungPct ?? 2) / 100;
  const wSteig = (proj.wertsteigerungPct ?? 1.5) / 100;
  const zinshaus = isZinshausWithUnits(p) ? calcZinshaus(p.units) : null;
  // Zinshaus: Leerstand ist pro Einheit bereits in der effektiven Miete enthalten.
  const pcat = categoryOf(p);
  const leer = zinshaus ? 0 : isGewerbeMiete(p.propertyType) && proj.leerstandPct == null
    ? leerstandGewerbe(p)
    : (proj.leerstandPct ?? (p.leerstandPufferPct != null ? p.leerstandPufferPct * 100 : a.leerstandPuffer * 100)) / 100;
  const instand = proj.instandhaltungProJahr ?? 0;
  const mieteBasis = zinshaus ? zinshaus.totalMiete : pcat === "grundstueck" ? 0 : pcat === "garage" ? garageRent(p) : p.nettomieteMtl ?? 0;
  const baseMiete = mieteBasis * 12 * (1 - leer);
  const baseBK = (c.nichtUmlMtl + c.ruecklageMtl) * 12;
  const baseWert = p.kaufpreis ?? 0;
  const rateAnnual = c.kreditRateMtl * 12;
  const balanceSeries = (() => {
    const scn = getActiveFinance(p);
    if (!scn) return null;
    return calcBalanceSeries(scn);
  })();
  const out: ProjectionYear[] = [];
  for (let i = 1; i <= horizon; i++) {
    const miete = baseMiete * Math.pow(1 + mSteig, i - 1);
    const bk = baseBK * Math.pow(1 + kSteig, i - 1);
    const inst = instand * Math.pow(1 + kSteig, i - 1);
    const wert = baseWert * Math.pow(1 + wSteig, i);
    const cf = miete - rateAnnual - bk - inst;
    const restschuld = balanceSeries
      ? (balanceSeries[i]?.balance ?? balanceSeries[balanceSeries.length - 1]?.balance ?? 0)
      : Math.max(0, (c.kreditBetrag) - (rateAnnual - (c.kreditBetrag * (a.zinssatz))) * i);
    out.push({ year: i, miete, betriebskosten: bk, instandhaltung: inst, rate: rateAnnual, cashflow: cf, immoWert: wert, restschuld });
  }
  return out;
}

export interface FollowUpResult {
  aktiv: boolean;
  restschuldNachPhase1: number;
  phase1Years: number;
  ratePhase1: number;
  ratePhase2: number;
  zinssatz2: number;
  restlaufzeit2: number;
  totalInterestPhase1: number;
  totalInterestPhase2: number;
  totalInterestKombiniert: number;
  cashflowVeraenderung: number;
}

export function calcFollowUpFinance(p: Property, a: Assumptions, c: Calc): FollowUpResult | null {
  const f = p.followUpFinance;
  if (!f || !f.aktiv) return null;
  const scn = getActiveFinance(p);
  if (!scn) return null;
  const phase1Years = Math.max(1, scn.zinsbindungJahre ?? 10);
  const sched = calcAmortizationSchedule(scn);
  const startYear = sched[0]?.year ?? new Date().getFullYear();
  const endRow = sched.find((r) => r.year === startYear + phase1Years - 1);
  const restschuldNachPhase1 = endRow ? endRow.balanceEnd : (scn.kreditBetrag ?? 0);
  const totalInterestPhase1 = sched.filter((r) => r.year <= startYear + phase1Years - 1).reduce((s, y) => s + y.interest, 0);
  const zinssatz2 = f.zinssatz ?? scn.zinssatz;
  const restlaufzeit2 = Math.max(1, f.restlaufzeitJahre ?? Math.max(1, scn.laufzeitJahre - phase1Years));
  const ratePhase2 = pmt(zinssatz2 / 12, restlaufzeit2 * 12, restschuldNachPhase1);
  const totalPaymentPhase2 = ratePhase2 * restlaufzeit2 * 12;
  const totalInterestPhase2 = Math.max(0, totalPaymentPhase2 - restschuldNachPhase1);
  return {
    aktiv: true,
    restschuldNachPhase1,
    phase1Years,
    ratePhase1: c.kreditRateMtl,
    ratePhase2,
    zinssatz2,
    restlaufzeit2,
    totalInterestPhase1,
    totalInterestPhase2,
    totalInterestKombiniert: totalInterestPhase1 + totalInterestPhase2,
    cashflowVeraenderung: c.kreditRateMtl - ratePhase2,
  };
}

export const DEFAULT_OPEN_QUESTIONS: { text: string; category: import("./types").OpenQuestionCategory; important?: boolean }[] = [
  { text: "Ist die Wohnung aktuell vermietet?", category: "Mietrecht", important: true },
  { text: "Welche Mietzinsregelung gilt?", category: "Mietrecht", important: true },
  { text: "Gibt es geplante Sanierungen im Haus?", category: "Zustand" },
  { text: "Wie hoch ist die Rücklage?", category: "Finanzierung", important: true },
  { text: "Gibt es Protokolle der Eigentümerversammlung?", category: "Unterlagen" },
  { text: "Sind Betriebskosten vollständig angegeben?", category: "Finanzierung" },
  { text: "Gibt es offene Schäden oder Mängel?", category: "Zustand" },
  { text: "Ist die angegebene Wohnfläche offiziell bestätigt?", category: "Unterlagen" },
  { text: "Gibt es Einschränkungen bei Vermietung oder Kurzzeitvermietung?", category: "Mietrecht", important: true },
  { text: "Welche Unterlagen fehlen noch?", category: "Unterlagen" },
];

import type { Payment } from "./types";

export interface PaymentSummary {
  einnahmenGesamt: number;
  ausgabenGesamt: number;
  nettoCashflow: number;
  cashflowMonat: number;
  cashflowJahr: number;
  offenAnzahl: number;
  offenSumme: number;
  mieteEingegangen: number;
  kreditratenGezahlt: number;
  zinsenGezahlt: number;
  tilgungGezahlt: number;
  reparaturGezahlt: number;
}

export function summarizePayments(list: Payment[]): PaymentSummary {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const y = String(now.getFullYear());
  const paid = list.filter((p) => p.status === "bezahlt");
  const offen = list.filter((p) => p.status === "offen");
  const sumBy = (arr: Payment[], pred: (p: Payment) => boolean) =>
    arr.filter(pred).reduce((a, p) => a + (p.amount || 0), 0);
  const einnahmen = sumBy(paid, (p) => p.direction === "Einnahme");
  const ausgaben = sumBy(paid, (p) => p.direction === "Ausgabe");
  const sign = (p: Payment) => (p.direction === "Einnahme" ? 1 : -1);
  const cashflowMonat = paid.filter((p) => p.date?.startsWith(ym)).reduce((a, p) => a + sign(p) * p.amount, 0);
  const cashflowJahr = paid.filter((p) => p.date?.startsWith(y)).reduce((a, p) => a + sign(p) * p.amount, 0);
  return {
    einnahmenGesamt: einnahmen,
    ausgabenGesamt: ausgaben,
    nettoCashflow: einnahmen - ausgaben,
    cashflowMonat,
    cashflowJahr,
    offenAnzahl: offen.length,
    offenSumme: offen.reduce((a, p) => a + (p.amount || 0), 0),
    mieteEingegangen: sumBy(paid, (p) => p.category === "Miete"),
    kreditratenGezahlt: sumBy(paid, (p) => p.category === "Kreditrate"),
    zinsenGezahlt: sumBy(paid, (p) => p.category === "Zinsen"),
    tilgungGezahlt: sumBy(paid, (p) => p.category === "Tilgung"),
    reparaturGezahlt: sumBy(paid, (p) => p.category === "Reparatur / Instandhaltung"),
  };
}

/* ════════════════════════════════════════════════════════════════════════════
 *  INVESTOR-MODELL (Langzeit-Projektion)
 *
 *  Diese Modul-Erweiterung bildet die Excel-Logik nach:
 *    - Asset-Entwicklung      (Wert, Restschuld, EK im Objekt, Verkaufserlös)
 *    - Cash-Entwicklung       (Jahres-CF, kumuliert, liquide Mittel)
 *    - Kredit-Entwicklung     (Restschuld, Zins, Tilgung pro Jahr)
 *    - Zins/Annuität          (nominal, monatlich/jährlich, Zins/Tilgungs-Anteil)
 *    - Chart-Daten            (saubere Arrays mit deutschen Labels)
 *    - Szenarien              (base / conservative / optimistic)
 *
 *  Alle Felder sind defensiv: keine NaN, keine Infinity, keine negativen
 *  Restschulden, keine kaputten Achsen.
 * ════════════════════════════════════════════════════════════════════════════ */

export interface AssetYear {
  jahr: number;
  estimatedPropertyValue: number;
  remainingDebt: number;
  equityInProperty: number;
  cumulativePrincipalPaid: number;
  hypotheticalSaleProceeds: number;
  wealthChange: number;
}

export interface CashYear {
  jahr: number;
  annualCashflow: number;
  cumulativeCashflow: number;
  liquidFundsDevelopment: number;
  cashflowAfterTax: number | null;
}

export interface LoanYear {
  jahr: number;
  remainingDebt: number;
  interestPaid: number;
  principalPaid: number;
  annuityPayment: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface InterestAnnuity {
  nominalInterestRate: number;
  monthlyAnnuity: number;
  yearlyAnnuity: number;
  /** Zinsanteil im 1. Jahr (Summe Monatszinsen Jahr 1). */
  interestPart: number;
  /** Tilgungsanteil im 1. Jahr. */
  principalPart: number;
}

export interface LoanNeed {
  totalCapitalNeed: number;
  availableEquity: number;
  requiredLoan: number;
  /** > 0 = EK fehlt, < 0 = EK-Überschuss. */
  equityGap: number;
  equitySurplus: number;
  ltv: number;
}

export interface ChartPoint {
  jahr: number;
  label: string;
  value: number;
}

export interface ChartsData {
  loanDevelopmentData: ChartPoint[];
  assetDevelopmentData: ChartPoint[];
  cashDevelopmentData: ChartPoint[];
  depreciationData: ChartPoint[];
  scenarioComparisonData: { label: string; cashflow: number; remainingDebt: number; propertyValue: number; equityInProperty: number; cumulativeCashflow: number; dealScore: number; totalInterestCost: number }[];
}

export interface ScenarioResult {
  key: "base" | "conservative" | "optimistic";
  label: string;
  cashflow: number;
  remainingDebt: number;
  propertyValue: number;
  equityInProperty: number;
  cumulativeCashflow: number;
  dealScore: number;
  totalInterestCost: number;
}

export interface InvestorModel {
  horizonJahre: number;
  loanNeed: LoanNeed;
  interestAnnuity: InterestAnnuity;
  assetDevelopment: AssetYear[];
  cashDevelopment: CashYear[];
  loanDevelopment: LoanYear[];
  scenarios: ScenarioResult[];
  charts: ChartsData;
  totalInterestPaid: number;
}

/** Erzeugt einen Tilgungsplan pro Jahr (Annuität / endfällig / Zins 0). */
function buildLoanSchedule(
  loanAmount: number,
  annualRate: number,
  laufzeitJahre: number,
  horizon: number,
  tilgungsart: "annuitaet" | "endfaellig" = "annuitaet",
): LoanYear[] {
  const out: LoanYear[] = [];
  const principal = safeNonNeg(loanAmount, 0);
  const rate = safeNonNeg(annualRate, 0);
  const n = Math.max(1, Math.round(safeNum(laufzeitJahre, 30)));
  const H = Math.max(1, Math.round(safeNum(horizon, 10)));
  const mRate = rate / 12;
  const monthlyPay = tilgungsart === "endfaellig"
    ? principal * mRate
    : pmt(mRate, n * 12, principal);

  let bal = principal;
  let cumInt = 0;
  let cumPrin = 0;
  for (let j = 1; j <= H; j++) {
    let interestY = 0;
    let principalY = 0;
    if (bal > 0) {
      if (tilgungsart === "endfaellig") {
        interestY = bal * rate;
        principalY = j === n ? bal : 0; // Tilgung am Ende
      } else if (mRate === 0) {
        // Zins 0: lineare Tilgung
        principalY = Math.min(bal, monthlyPay * 12);
      } else {
        // 12 Monate iterieren für genaue Zins/Tilgung-Aufteilung
        for (let m = 0; m < 12 && bal > 0; m++) {
          const i = bal * mRate;
          const t = Math.min(monthlyPay - i, bal);
          interestY += i;
          principalY += t;
          bal -= t;
        }
      }
      if (tilgungsart !== "annuitaet" || mRate === 0) {
        bal = Math.max(0, bal - principalY);
      }
    }
    cumInt += interestY;
    cumPrin += principalY;
    out.push({
      jahr: j,
      remainingDebt: Math.max(0, bal),
      interestPaid: Math.max(0, interestY),
      principalPaid: Math.max(0, principalY),
      annuityPayment: Math.max(0, interestY + principalY),
      cumulativeInterest: Math.max(0, cumInt),
      cumulativePrincipal: Math.max(0, cumPrin),
    });
  }
  return out;
}

/** Asset-Entwicklung: Wert, Restschuld, EK im Objekt, Verkaufserlös. */
export function calcAssetDevelopment(args: {
  startWert: number;
  valueGrowthPct: number;
  loan: LoanYear[];
  initialEquity: number;
  sellingCostPct: number;
}): AssetYear[] {
  const v0 = safeNonNeg(args.startWert, 0);
  const g = safeNum(args.valueGrowthPct, 0);
  const sellCost = Math.max(0, safeNum(args.sellingCostPct, 0));
  const eq0 = safeNonNeg(args.initialEquity, 0);
  return args.loan.map((l) => {
    const value = v0 * Math.pow(1 + g, l.jahr);
    const equityInProperty = value - l.remainingDebt;
    const proceeds = value * (1 - sellCost) - l.remainingDebt;
    return {
      jahr: l.jahr,
      estimatedPropertyValue: Math.max(0, value),
      remainingDebt: l.remainingDebt,
      equityInProperty,
      cumulativePrincipalPaid: l.cumulativePrincipal,
      hypotheticalSaleProceeds: proceeds,
      wealthChange: proceeds - eq0,
    };
  });
}

/** Cash-Entwicklung: jährlicher und kumulierter Cashflow, liquide Mittel. */
export function calcCashDevelopment(args: {
  baseAnnualCashflow: number;
  rentGrowthPct: number;
  costGrowthPct: number;
  horizon: number;
  startLiquidity: number;
  taxRate: number | null;
}): CashYear[] {
  const cf0 = safeNum(args.baseAnnualCashflow, 0);
  const rg = safeNum(args.rentGrowthPct, 0);
  const cg = safeNum(args.costGrowthPct, 0);
  const H = Math.max(1, Math.round(safeNum(args.horizon, 10)));
  const start = safeNum(args.startLiquidity, 0);
  const tax = args.taxRate;
  const out: CashYear[] = [];
  let cumCF = 0;
  let liquid = start;
  // Vereinfachte Steigerung: Mittelwert aus Miet- und Kostenwachstum auf CF.
  const cfGrowth = (rg + cg) / 2;
  for (let j = 1; j <= H; j++) {
    const cf = cf0 * Math.pow(1 + cfGrowth, j - 1);
    cumCF += cf;
    liquid += cf;
    const afterTax = tax != null && tax > 0
      ? cf * (1 - Math.min(1, Math.max(0, tax)))
      : null;
    out.push({
      jahr: j,
      annualCashflow: safeNum(cf, 0),
      cumulativeCashflow: safeNum(cumCF, 0),
      liquidFundsDevelopment: safeNum(liquid, 0),
      cashflowAfterTax: afterTax != null ? safeNum(afterTax, 0) : null,
    });
  }
  return out;
}

/** Zins-/Annuitäten-Übersicht für UI-Anzeige (Jahr 1). */
function calcInterestAnnuity(loan: LoanYear[], annualRate: number, monthlyPay: number): InterestAnnuity {
  const y1 = loan[0];
  return {
    nominalInterestRate: safeNonNeg(annualRate, 0),
    monthlyAnnuity: safeNonNeg(monthlyPay, 0),
    yearlyAnnuity: safeNonNeg(monthlyPay, 0) * 12,
    interestPart: y1?.interestPaid ?? 0,
    principalPart: y1?.principalPaid ?? 0,
  };
}

/** Bedarfs-Analyse: EK-Lücke oder -Überschuss. */
function calcLoanNeed(totalCapitalNeed: number, equity: number, loan: number): LoanNeed {
  const need = Math.max(0, safeNum(totalCapitalNeed, 0));
  const eq = Math.max(0, safeNum(equity, 0));
  const req = Math.max(0, need - eq);
  const gap = Math.max(0, req - safeNum(loan, 0));
  const surplus = Math.max(0, eq - need);
  return {
    totalCapitalNeed: need,
    availableEquity: eq,
    requiredLoan: req,
    equityGap: gap,
    equitySurplus: surplus,
    ltv: need > 0 ? Math.max(0, safeNum(loan, 0)) / need : 0,
  };
}

/** Szenarien base / conservative / optimistic. */
function calcScenarios(args: {
  baseAnnualCashflow: number;
  startWert: number;
  loan: LoanYear[];
  initialEquity: number;
  sellingCostPct: number;
  rentGrowthPct: number;
  valueGrowthPct: number;
  horizon: number;
  baseDealScore: number;
  totalInterestCost: number;
}): ScenarioResult[] {
  const variants: { key: ScenarioResult["key"]; label: string; cfMult: number; valMult: number; scoreDelta: number }[] = [
    { key: "conservative", label: "Konservativ", cfMult: 0.85, valMult: 0.5, scoreDelta: -10 },
    { key: "base",         label: "Basis",       cfMult: 1.00, valMult: 1.0, scoreDelta: 0 },
    { key: "optimistic",   label: "Optimistisch",cfMult: 1.15, valMult: 1.3, scoreDelta: +8 },
  ];
  const H = Math.max(1, Math.round(safeNum(args.horizon, 10)));
  const tic = safeNonNeg(args.totalInterestCost, 0);
  return variants.map((v) => {
    const annualCF = safeNum(args.baseAnnualCashflow, 0) * v.cfMult;
    const cum = annualCF * H;
    const valGrowth = safeNum(args.valueGrowthPct, 0) * v.valMult;
    const value = Math.max(0, safeNonNeg(args.startWert, 0) * Math.pow(1 + valGrowth, H));
    const remDebt = args.loan[H - 1]?.remainingDebt ?? args.loan[args.loan.length - 1]?.remainingDebt ?? 0;
    const equityInProperty = value - remDebt;
    const score = Math.max(0, Math.min(100, Math.round(args.baseDealScore + v.scoreDelta)));
    return {
      key: v.key, label: v.label,
      cashflow: safeNum(annualCF, 0),
      remainingDebt: Math.max(0, remDebt),
      propertyValue: value,
      equityInProperty,
      cumulativeCashflow: safeNum(cum, 0),
      dealScore: score,
      totalInterestCost: tic, // Gesamtzins gilt für die Finanzierung gleich, scenarien-unabhängig
    };
  });
}

/** Hauptaggregat: baut das komplette Investor-Modell aus den Basis-KPIs. */
export function calcInvestorModel(
  p: Property,
  a: Assumptions,
  base: {
    kaufpreis: number;
    gesamtkosten: number;
    eigenkapitalEinsatz: number;
    kreditBetrag: number;
    kreditRateMtl: number;
    cashflowJahr: number;
    dealScore: number;
  },
): InvestorModel {
  const proj = p.projections ?? {};
  // Sichere Defaults für die Wachstumsannahmen.
  const horizon = Math.max(1, Math.round(safeNum(proj.horizonJahre, 10)));
  // Eingaben sind Prozentwerte (z. B. 1.5 = 1,5 % p.a.) → in Bruchteile umrechnen.
  // Defaults identisch mit calcLongTermProjection und den Placeholdern im UI.
  const valueGrowth = safeNum(proj.wertsteigerungPct ?? 1.5, 1.5) / 100;
  const rentGrowth = safeNum(proj.mietsteigerungPct ?? 2, 2) / 100;
  const costGrowth = safeNum(proj.kostensteigerungPct ?? 2, 2) / 100;
  const sellingCostPct = 0.035;                                 // konservativer Default

  const activeFin = getActiveFinance(p);
  const annualRate = safeNonNeg(activeFin?.zinssatz, safeNonNeg(a.zinssatz, 0));
  const laufzeit = (() => {
    const v = safeNum(activeFin?.laufzeitJahre, safeNum(a.laufzeit, 30));
    return v > 0 ? v : 30;
  })();
  const tilgungsart: "annuitaet" | "endfaellig" =
    activeFin?.tilgungsart === "endfaellig" ? "endfaellig" : "annuitaet";

  const loanSchedule = buildLoanSchedule(
    base.kreditBetrag, annualRate, laufzeit, horizon, tilgungsart,
  );
  const interestAnnuity = calcInterestAnnuity(loanSchedule, annualRate, base.kreditRateMtl);
  const loanNeed = calcLoanNeed(base.gesamtkosten, base.eigenkapitalEinsatz, base.kreditBetrag);
  const assetDev = calcAssetDevelopment({
    startWert: base.kaufpreis,
    valueGrowthPct: valueGrowth,
    loan: loanSchedule,
    initialEquity: base.eigenkapitalEinsatz,
    sellingCostPct,
  });
  const cashDev = calcCashDevelopment({
    baseAnnualCashflow: base.cashflowJahr,
    rentGrowthPct: rentGrowth,
    costGrowthPct: -costGrowth, // Kosten erhöhen → CF mindern
    horizon,
    startLiquidity: 0,
    taxRate: null, // keine Steuerfelder vorhanden → pre-tax
  });
  // Zentrale Gesamtzinskosten – einmal berechnet, überall verwendet.
  // Annuität: monthlyPay × n − loanAmount  |  0 %: 0  |  Endfällig: loan × rate × years
  const totalInterestPaid = calcTotalInterestPaid({
    loanAmount: base.kreditBetrag,
    annualRate,
    termYears: laufzeit,
    monthlyPayment: base.kreditRateMtl,
    tilgungsart,
  });

  const scenarios = calcScenarios({
    baseAnnualCashflow: base.cashflowJahr,
    startWert: base.kaufpreis,
    loan: loanSchedule,
    initialEquity: base.eigenkapitalEinsatz,
    sellingCostPct,
    rentGrowthPct: rentGrowth,
    valueGrowthPct: valueGrowth,
    horizon,
    baseDealScore: base.dealScore,
    totalInterestCost: totalInterestPaid,
  });

  // AfA / Abschreibung pro Jahr (vereinfacht: konstanter Jahresbetrag).
  const afaJahr = safeNonNeg(p.afa?.jahresBetrag, 0);
  const depreciationData: ChartPoint[] = loanSchedule.map((l) => ({
    jahr: l.jahr, label: `Jahr ${l.jahr}`, value: afaJahr,
  }));

  const charts: ChartsData = {
    loanDevelopmentData: loanSchedule.map((l) => ({
      jahr: l.jahr, label: `Jahr ${l.jahr}`, value: l.remainingDebt,
    })),
    assetDevelopmentData: assetDev.map((x) => ({
      jahr: x.jahr, label: `Jahr ${x.jahr}`, value: x.estimatedPropertyValue,
    })),
    cashDevelopmentData: cashDev.map((x) => ({
      jahr: x.jahr, label: `Jahr ${x.jahr}`, value: x.cumulativeCashflow,
    })),
    depreciationData,
    scenarioComparisonData: scenarios.map((s) => ({
      label: s.label,
      cashflow: s.cashflow,
      remainingDebt: s.remainingDebt,
      propertyValue: s.propertyValue,
      equityInProperty: s.equityInProperty,
      cumulativeCashflow: s.cumulativeCashflow,
      dealScore: s.dealScore,
      totalInterestCost: s.totalInterestCost,
    })),
  };

  return {
    horizonJahre: horizon,
    loanNeed,
    interestAnnuity,
    assetDevelopment: assetDev,
    cashDevelopment: cashDev,
    loanDevelopment: loanSchedule,
    scenarios,
    charts,
    totalInterestPaid,
  };
}

/**
 * Sum of monthly cashflow across all "Gekauft" properties in the portfolio.
 * Used to factor existing portfolio impact into new-purchase Leistbarkeit.
 */
export function getPortfolioCashflowMtl(properties: Property[]): number {
  return properties
    .filter((p) => p.status === "Gekauft" || p.prozessStatus === "Gekauft")
    .reduce((sum, p) => {
      const pi = p.purchase ?? {};
      const miete = pi.aktuelleMonatsmiete ?? p.nettomieteMtl ?? 0;
      const rate = pi.aktuelleMonatsrate ?? 0;
      const kosten =
        (pi.betriebskostenMtl ?? 0) +
        (pi.nichtUmlMtl ?? 0) +
        (pi.ruecklageMtl ?? 0) +
        (pi.versicherungMtl ?? 0) +
        (pi.verwaltungMtl ?? 0) +
        (pi.sonstigeMtlKosten ?? 0);
      return sum + (miete - rate - kosten);
    }, 0);
}
