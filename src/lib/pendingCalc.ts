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
  return {
    title: "Kalkulation Cashflow",
    kaufpreis: null,
    nettomieteMtl: calc.inputs.miete || null,
    notizen: `Aus Cashflow-Rechner übernommen.\nMiete: ${calc.inputs.miete} €/M\nKreditrate: ${calc.inputs.rate} €/M\nCashflow: ${Math.round(calc.result.cfMonth)} €/M`,
  };
}
