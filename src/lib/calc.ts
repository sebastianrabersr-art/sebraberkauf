import type { Assumptions, FinanceScenario, Mietrecht, Property } from "./types";
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
  //    - Zins == 0: lineare Tilgung (pmt() handhabt das).
  //    - sonst: Annuität.
  let monthlyLoanPayment = 0;
  if (loanAmount > 0) {
    if (activeScn?.tilgungsart === "endfaellig") {
      monthlyLoanPayment = loanAmount * monthlyRate; // 0 bei Zins 0
    } else {
      monthlyLoanPayment = pmt(monthlyRate, totalMonths, loanAmount);
    }
  }
  monthlyLoanPayment = Number.isFinite(monthlyLoanPayment) && monthlyLoanPayment > 0
    ? monthlyLoanPayment
    : 0;

  const yearlyLoanPayment = monthlyLoanPayment * 12;

  // 6) Gezahlte Zinsen gesamt über die Laufzeit.
  //    - endfaellig: Zinsen × Laufzeit (Tilgung erst am Ende).
  //    - Annuität:   (Rate × n) − Kreditbetrag.
  //    - Zins 0:     0.
  let totalInterestPaid = 0;
  if (loanAmount > 0 && monthlyRate > 0) {
    totalInterestPaid = activeScn?.tilgungsart === "endfaellig"
      ? monthlyLoanPayment * totalMonths
      : Math.max(0, monthlyLoanPayment * totalMonths - loanAmount);
  }

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
  const { kaufpreis, m2, miete, gesamtkosten, eigenkapitalEinsatz, kreditBetrag,
    kreditRateMtl, nichtUmlMtl, ruecklageMtl, leerstandMtl, leerstandPct } = inputs;

  const cashflowMtl = miete - kreditRateMtl - nichtUmlMtl - ruecklageMtl - leerstandMtl;
  const cashflowJahr = cashflowMtl * 12;

  const bruttorendite = kaufpreis > 0 ? (miete * 12) / kaufpreis : 0;
  const nettoJahr = miete * 12 - (nichtUmlMtl + ruecklageMtl + leerstandMtl) * 12;
  const nettorendite = gesamtkosten > 0 ? nettoJahr / gesamtkosten : 0;
  const eigenkapitalrendite = eigenkapitalEinsatz > 0 ? cashflowJahr / eigenkapitalEinsatz : 0;
  const preisProM2 = m2 > 0 ? kaufpreis / m2 : 0;
  const ltv = gesamtkosten > 0 ? kreditBetrag / gesamtkosten : 0;
  const dscr = kreditRateMtl > 0 ? miete / kreditRateMtl : 0;

  // Stresstests – jeweils nur eine Variable verändert.
  const rateStress = pmt((a.zinssatz + a.zinsStress) / 12, a.laufzeit * 12, kreditBetrag);
  const cashflowStressZins = miete - rateStress - nichtUmlMtl - ruecklageMtl - leerstandMtl;
  const cashflowStressLeerstand = cashflowMtl - (miete * a.leerstandStressMonate) / 12;
  const cashflowStressReparatur = cashflowMtl - a.reparaturStress / 12;

  const breakEvenMiete = kreditRateMtl + nichtUmlMtl + ruecklageMtl;
  const maxKaufpreisZielRendite = a.zielBrutto > 0 ? (miete * 12) / a.zielBrutto : 0;

  // Mit Leerstandspuffer hochskaliert: tatsächlich nötige Sollmiete.
  const denom = Math.max(0.0001, 1 - leerstandPct);
  const requiredBreakEvenRent = (kreditRateMtl + nichtUmlMtl + ruecklageMtl) / denom;
  const requiredBreakEvenRentPerM2 = m2 > 0 ? requiredBreakEvenRent / m2 : 0;

  return {
    cashflowMtl, cashflowJahr,
    bruttorendite, nettorendite, eigenkapitalrendite, preisProM2, ltv, dscr,
    cashflowStressZins, cashflowStressLeerstand, cashflowStressReparatur,
    breakEvenMiete, maxKaufpreisZielRendite,
    requiredBreakEvenRent, requiredBreakEvenRentPerM2,
  };
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

/**
 * Hauptfunktion – komponiert die obigen Bausteine zum Calc-Objekt.
 * Die Felder bleiben 1:1 wie bisher, damit kein UI-Code bricht.
 */
export function calcProperty(p: Property, a: Assumptions): Calc {
  // Effektiver Kaufpreis nach propertyType-Logik. Wir reichen ein
  // "normalisiertes" Property an die internen Helfer weiter, damit
  // Pauschalsätze, LTV, Renditen etc. konsistent mit derselben Zahl rechnen.
  const effectiveKaufpreis = resolveTotalPurchasePrice(p);
  const pn: Property = { ...p, kaufpreis: effectiveKaufpreis };

  // Wohnfläche: bei Häusern/Gewerbe nehmen wir alternativ livingAreaSqm
  // bzw. usableAreaSqm, damit Preis/m² und Rücklagen-Pauschale sinnvoll bleiben.
  const m2 = p.wohnflaecheM2 ?? p.livingAreaSqm ?? p.usableAreaSqm ?? 0;
  const miete = p.nettomieteMtl ?? 0;

  const purchase = calcPurchaseCosts(pn, a);
  const financing = calcFinancing(pn, a, purchase.gesamtkosten);
  const rental = calcRentalCosts(pn, a, miete, m2);
  const kpis = calcInvestmentKpis(pn, a, {
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

export function googleMapsUrl(p: Pick<Property, "adresse" | "bezirk" | "city" | "bundesland" | "land" | "googleMapsUrlOverride">): string | null {
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
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

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
  const defaultSatz = land === "DE" ? 2 : 1.5;
  const satzPct = a.satzPct ?? defaultSatz;
  const jahresAfa = methode === "manuell" && a.jahresBetrag != null
    ? a.jahresBetrag
    : gebaeudewert * (satzPct / 100);
  const hinweis = land === "DE"
    ? "DE: Lineare AfA Wohngebäude i.d.R. 2 % p.a. (bzw. 2,5 % bei Bauantrag vor 1925, 3 % bei Fertigstellung ab 01.01.2023). Keine Steuerberatung."
    : "AT: Lineare AfA für vermietete Wohngebäude i.d.R. 1,5 % p.a. Sonderregeln bei Sanierung/Denkmalschutz möglich. Keine Steuerberatung.";
  return { basis, grundAnteilPct: grundPct, gebaeudeAnteilPct: gebPct, gebaeudewert, satzPct, jahresAfa, methode, hinweis };
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
  const leer = (proj.leerstandPct ?? (p.leerstandPufferPct != null ? p.leerstandPufferPct * 100 : a.leerstandPuffer * 100)) / 100;
  const instand = proj.instandhaltungProJahr ?? 0;
  const baseMiete = (p.nettomieteMtl ?? 0) * 12 * (1 - leer);
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
