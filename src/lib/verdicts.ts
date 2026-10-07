import { fmtEUR } from "@/lib/calc";

/** Bewertungston für Rechner-Ergebnisse. "neutral" = Zahl ohne Wertung. */
export type Tone = "good" | "bad" | "caution" | "neutral";
export type Verdict = { tone: Tone; text: string };

/** Textfarbe je Ton – alle ≥ 4.5:1 auf Weiß. */
export const TONE_TEXT: Record<Tone, string> = {
  good: "text-[#2D6A4F]",
  bad: "text-[#B91C1C]",
  caution: "text-[#92400E]",
  neutral: "text-[#1C1917]",
};

/**
 * Bruttorendite (als Anteil, z. B. 0.045). Schwellen wie im Ratgeber
 * „Immobilien Rendite berechnen“: < 3 % niedrig, 3–4 % durchschnittlich,
 * 4–6 % attraktiv, > 6 % sehr attraktiv.
 */
export function bruttoRenditeVerdict(r: number): Verdict | undefined {
  if (!Number.isFinite(r) || r <= 0) return undefined;
  if (r < 0.03) return { tone: "caution", text: "Niedrig – unter 3 % wird es mit Finanzierung schnell eng." };
  if (r < 0.04) return { tone: "neutral", text: "Durchschnittlich – typisch für gute, gefragte Lagen." };
  if (r <= 0.06) return { tone: "good", text: "Attraktiv – rechne trotzdem netto nach." };
  return { tone: "good", text: "Sehr hoch – schau dir Lage, Zustand und Mietrecht besonders genau an." };
}

export function cashflowVerdict(cfMonat: number): Verdict | undefined {
  if (!Number.isFinite(cfMonat)) return undefined;
  if (cfMonat > 0) return { tone: "good", text: `Die Immobilie trägt sich – es bleiben ${fmtEUR(cfMonat)} im Monat.` };
  if (cfMonat < 0) return { tone: "bad", text: `Du zahlst jeden Monat ${fmtEUR(Math.abs(cfMonat))} aus eigener Tasche dazu.` };
  return { tone: "neutral", text: "Genau ausgeglichen – ohne Puffer für Überraschungen." };
}

/** diff = benötigte Miete − aktuelle Miete. */
export function breakEvenVerdict(diff: number, aktuelleMiete: number): Verdict | undefined {
  if (!Number.isFinite(diff) || !(aktuelleMiete > 0)) return undefined;
  if (diff > 0) return { tone: "bad", text: `Die aktuelle Miete liegt ${fmtEUR(diff)} unter der Kostendeckung.` };
  return { tone: "good", text: `Die aktuelle Miete deckt die Kosten – ${fmtEUR(Math.abs(diff))} Puffer im Monat.` };
}

export function flipVerdict(gewinnNachSteuer: number): Verdict | undefined {
  if (!Number.isFinite(gewinnNachSteuer)) return undefined;
  if (gewinnNachSteuer > 0) return { tone: "good", text: "Das Projekt bleibt nach Steuern im Plus." };
  if (gewinnNachSteuer < 0) return { tone: "bad", text: "Nach Steuern bleibt ein Verlust." };
  return { tone: "neutral", text: "Nach Steuern genau ausgeglichen." };
}
