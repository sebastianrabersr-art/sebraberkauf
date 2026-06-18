// Lightweight localStorage handoff for "save calculation → signup → create property"
export type PendingCalc =
  | {
      type: "kaufnebenkosten";
      createdAt: string;
      inputs: { land: "AT" | "DE"; region: string; kp: number; maklerPct: number; vertragPct: number; gbPct: number; grestPct: number; sonst: number };
      result: { total: number; gesamt: number; pct: number };
    }
  | {
      type: "rendite";
      createdAt: string;
      inputs: { kp: number; nk: number; jahresmiete: number; laufend: number; ek: number };
      result: { brutto: number; netto: number; ekRendite: number };
    }
  | {
      type: "cashflow";
      createdAt: string;
      inputs: { miete: number; rate: number; bk: number; ruecklage: number; leerstand: number; sonst: number };
      result: { cfMonth: number; cfYear: number; breakEven: number };
    }
  | {
      type: "finanzierung";
      createdAt: string;
      inputs: { kp: number; ek: number; zins: number; laufzeit: number };
      result: { rate: number; kredit: number; zinsenTotal: number; restschuld10: number };
    }
  | {
      type: "breakeven";
      createdAt: string;
      inputs: { rate: number; bk: number; ruecklage: number; leerstand: number; wfl: number; aktMiete: number };
      result: { required: number; perM2: number; diff: number };
    }
  | {
      type: "leistbarkeit";
      createdAt: string;
      inputs: { ek: number; zins: number; laufzeit: number; rate: number; nkPct: number };
      result: { maxKp: number; kredit: number; nk: number; gesamt: number };
    }
  | {
      type: "fixflip";
      createdAt: string;
      inputs: {
        kaufpreis: number; nebenkosten: number; renovierung: number; sonstigeKosten: number;
        eigenkapital: number; zinssatz: number; haltedauerMonate: number;
        mieteinnahmen: number; betriebskosten: number;
        verkaufspreis: number; maklerVerkaufPct: number; immoEstSteuer: number;
      };
      result: { gewinnNachSteuer: number; roiPct: number; annualisiertePct: number };
    };

const KEY = "pending_calc_v1";

export function savePendingCalc(calc: PendingCalc) {
  try { localStorage.setItem(KEY, JSON.stringify(calc)); } catch {}
}

export function getPendingCalc(): PendingCalc | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCalc;
  } catch { return null; }
}

export function clearPendingCalc() {
  try { localStorage.removeItem(KEY); } catch {}
}

export function hasPendingCalc(): boolean {
  return !!getPendingCalc();
}

export function calcToPropertyDraft(calc: PendingCalc): {
  title: string;
  kaufpreis: number | null;
  nettomieteMtl: number | null;
  notizen: string;
} {
  if (calc.type === "kaufnebenkosten") {
    return {
      title: `Kalkulation Kaufnebenkosten${calc.inputs.region ? " – " + calc.inputs.region : ""}`,
      kaufpreis: calc.inputs.kp || null,
      nettomieteMtl: null,
      notizen: `Aus Kaufnebenkosten-Rechner übernommen.\nLand: ${calc.inputs.land}\nKaufpreis: ${calc.inputs.kp} €\nNebenkosten: ${Math.round(calc.result.total)} € (${calc.result.pct.toFixed(1)}%)`,
    };
  }
  if (calc.type === "rendite") {
    return {
      title: "Kalkulation Rendite",
      kaufpreis: calc.inputs.kp || null,
      nettomieteMtl: calc.inputs.jahresmiete ? Math.round(calc.inputs.jahresmiete / 12) : null,
      notizen: `Aus Renditerechner übernommen.\nKaufpreis: ${calc.inputs.kp} €\nNebenkosten: ${calc.inputs.nk} €\nJahresmiete: ${calc.inputs.jahresmiete} €\nBruttorendite: ${(calc.result.brutto * 100).toFixed(2)}%\nNettorendite: ${(calc.result.netto * 100).toFixed(2)}%`,
    };
  }
  if (calc.type === "cashflow") {
    return {
      title: "Kalkulation Cashflow",
      kaufpreis: null,
      nettomieteMtl: calc.inputs.miete || null,
      notizen: `Aus Cashflow-Rechner übernommen.\nMiete: ${calc.inputs.miete} €/M\nKreditrate: ${calc.inputs.rate} €/M\nCashflow: ${Math.round(calc.result.cfMonth)} €/M`,
    };
  }
  if (calc.type === "finanzierung") {
    return {
      title: "Kalkulation Finanzierung",
      kaufpreis: calc.inputs.kp || null,
      nettomieteMtl: null,
      notizen: `Aus Finanzierungsrechner übernommen.\nKaufpreis: ${calc.inputs.kp} €\nEigenkapital: ${calc.inputs.ek} €\nZinssatz: ${calc.inputs.zins}%\nRate: ${Math.round(calc.result.rate)} €/M\nRestschuld 10J: ${Math.round(calc.result.restschuld10)} €`,
    };
  }
  if (calc.type === "breakeven") {
    return {
      title: "Kalkulation Break-even-Miete",
      kaufpreis: null,
      nettomieteMtl: calc.inputs.aktMiete || null,
      notizen: `Aus Break-even-Rechner übernommen.\nBenötigte Miete: ${Math.round(calc.result.required)} €/M\nAktuelle Miete: ${calc.inputs.aktMiete} €/M\nWohnfläche: ${calc.inputs.wfl} m²`,
    };
  }
  return {
    title: "Kalkulation Leistbarkeit",
    kaufpreis: calc.result.maxKp || null,
    nettomieteMtl: null,
    notizen: `Aus Leistbarkeitsrechner übernommen.\nMax. Kaufpreis: ${Math.round(calc.result.maxKp)} €\nEigenkapital: ${calc.inputs.ek} €\nRate: ${calc.inputs.rate} €/M\nLaufzeit: ${calc.inputs.laufzeit} J`,
  };
}
