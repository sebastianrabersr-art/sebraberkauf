import jsPDF from "jspdf";
import type { Property } from "./types";
import { userRatingAvg } from "./types";
import {
  calcProperty,
  fmtEUR,
  fmtPct,
  getActiveFinance,
  inferMietrecht,
} from "./calc";

export interface PropertyExportOptions {
  eckdaten: boolean;
  rendite: boolean;
  finanzierung: boolean;
  mietrecht: boolean;
  bewertung: boolean;
}

const M = 50; // margin pt
const PAGE_W = 595;
const PAGE_H = 842;
const FOOTER = "kaufma.eu · Keine Anlage- oder Rechtsberatung";

function fmtDate(d = new Date()): string {
  return d.toLocaleDateString("de-AT");
}

function safeFile(s: string | undefined | null): string {
  return (s || "objekt").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "objekt";
}

function ensureSpace(doc: jsPDF, y: number, needed: number, onNewPage: () => number): number {
  if (y + needed > PAGE_H - 60) {
    doc.addPage();
    return onNewPage();
  }
  return y;
}

function drawHeader(doc: jsPDF, title: string, subtitle: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text(title, M, 60, { maxWidth: PAGE_W - 2 * M - 140 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 113, 108);
  doc.text(subtitle, M, 78, { maxWidth: PAGE_W - 2 * M - 140 });

  doc.setFontSize(9);
  doc.text(`Erstellt am ${fmtDate()}`, PAGE_W - M, 60, { align: "right" });

  doc.setDrawColor(234, 230, 223);
  doc.setLineWidth(0.5);
  doc.line(M, 92, PAGE_W - M, 92);

  return 110;
}

function drawFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(168, 162, 158);
    doc.text(`${FOOTER} · Seite ${i} von ${total}`, PAGE_W / 2, PAGE_H - 25, { align: "center" });
  }
}

function sectionHeading(doc: jsPDF, label: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(45, 106, 79);
  doc.text(label, M, y);
  return y + 14;
}

function kv(doc: jsPDF, rows: [string, string][], y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const labelX = M;
  const valueX = M + 220;
  for (const [k, v] of rows) {
    doc.setTextColor(120, 113, 108);
    doc.text(k, labelX, y);
    doc.setTextColor(28, 25, 23);
    doc.text(v, valueX, y);
    y += 14;
  }
  return y + 6;
}

export function exportPropertyPdf(p: Property, opts: PropertyExportOptions, assumptions: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const c = calcProperty(p, assumptions);

  const title = p.title || "Objekt ohne Titel";
  const address = [p.adresse, p.bezirk, p.city, p.bundesland, p.land].filter(Boolean).join(", ") || "—";

  let y = drawHeader(doc, title, address);
  const newPage = () => drawHeader(doc, title, address);

  if (opts.eckdaten) {
    y = ensureSpace(doc, y, 100, newPage);
    y = sectionHeading(doc, "Eckdaten", y);
    y = kv(doc, [
      ["Kaufpreis", p.kaufpreis != null ? fmtEUR(p.kaufpreis) : "—"],
      ["Kaufnebenkosten", c.kaufNebenkosten != null ? fmtEUR(c.kaufNebenkosten) : "—"],
      ["Gesamtkapital", c.gesamtkosten != null ? fmtEUR(c.gesamtkosten) : "—"],
      ["Monatliche Rate", c.kreditRateMtl != null && isFinite(c.kreditRateMtl) ? fmtEUR(c.kreditRateMtl) : "—"],
    ], y);
  }

  if (opts.rendite) {
    y = ensureSpace(doc, y, 100, newPage);
    y = sectionHeading(doc, "Rendite & Cashflow", y);
    y = kv(doc, [
      ["Bruttorendite", c.bruttorendite != null ? fmtPct(c.bruttorendite, 2) : "—"],
      ["Nettorendite", c.nettorendite != null ? fmtPct(c.nettorendite, 2) : "—"],
      ["Cashflow / Monat", c.cashflowMtl != null && isFinite(c.cashflowMtl) ? fmtEUR(c.cashflowMtl) : "—"],
      ["Break-even Miete", c.requiredBreakEvenRent != null ? fmtEUR(c.requiredBreakEvenRent) : "—"],
    ], y);
  }

  if (opts.finanzierung) {
    const fin = getActiveFinance(p);
    y = ensureSpace(doc, y, 110, newPage);
    y = sectionHeading(doc, "Finanzierung (aktives Szenario)", y);
    if (fin) {
      y = kv(doc, [
        ["Bank", fin.bankName || fin.name || "—"],
        ["Kreditbetrag", fin.kreditBetrag != null ? fmtEUR(fin.kreditBetrag) : "—"],
        ["Zinssatz", fmtPct(fin.zinssatz, 2)],
        ["Rate / Monat", c.kreditRateMtl != null && isFinite(c.kreditRateMtl) ? fmtEUR(c.kreditRateMtl) : "—"],
        ["Laufzeit", fin.laufzeitJahre != null ? `${fin.laufzeitJahre} Jahre` : "—"],
      ], y);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 113, 108);
      doc.text("Kein Finanzierungs-Szenario hinterlegt.", M, y);
      y += 20;
    }
  }

  if (opts.mietrecht) {
    const m = inferMietrecht(p);
    y = ensureSpace(doc, y, 90, newPage);
    y = sectionHeading(doc, "Mietrecht-Einschätzung", y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const color = m.risiko === "hoch" ? [220, 38, 38] : m.risiko === "mittel" ? [217, 119, 6] : [45, 106, 79];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`Risiko: ${m.risiko}`, M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(28, 25, 23);
    const lines = doc.splitTextToSize(`${m.kategorie}. ${m.erklaerung}`, PAGE_W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 12 + 10;
  }

  if (opts.bewertung) {
    const r = p.userRating;
    const avg = userRatingAvg(r);
    y = ensureSpace(doc, y, 110, newPage);
    y = sectionHeading(doc, "Meine Bewertung", y);
    if (avg == null) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 113, 108);
      doc.text("Noch keine Bewertung erfasst.", M, y);
      y += 20;
    } else {
      y = kv(doc, [
        ["Ø Gesamt", `${avg.toFixed(1).replace(".", ",")} / 10`],
        ["Lage", r?.lage != null ? `${r.lage} / 10` : "—"],
        ["Preis / Leistung", r?.preisLeistung != null ? `${r.preisLeistung} / 10` : "—"],
        ["Zustand", r?.zustand != null ? `${r.zustand} / 10` : "—"],
        ["Vermietbarkeit", r?.vermietbarkeit != null ? `${r.vermietbarkeit} / 10` : "—"],
        ["Bauchgefühl", r?.bauchgefuehl != null ? `${r.bauchgefuehl} / 10` : "—"],
      ], y);
    }
  }

  drawFooters(doc);
  const filename = `kaufma_${safeFile(p.bezirk || p.city)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// =========== Comparison PDF ===========

export interface ComparisonRow {
  label: string;
  values: string[]; // formatted per property
  tones?: ("best" | "worst" | "")[];
}

export interface ComparisonSection {
  title: string;
  rows: ComparisonRow[];
}

export function exportComparisonPdf(propertyNames: string[], sections: ComparisonSection[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const title = "Immobilien-Vergleich";
  const subtitle = propertyNames.join(" · ");

  let y = drawHeader(doc, title, subtitle);
  const newPage = () => drawHeader(doc, title, subtitle);

  const cols = propertyNames.length;
  const labelW = 160;
  const colW = (PAGE_W - 2 * M - labelW) / cols;

  // Header row
  const drawTableHeader = (yPos: number): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text("Kennzahl", M, yPos);
    propertyNames.forEach((n, i) => {
      const x = M + labelW + colW * i + colW - 4;
      const lines = doc.splitTextToSize(n, colW - 6);
      doc.text(lines.slice(0, 2), x, yPos, { align: "right" });
    });
    doc.setDrawColor(234, 230, 223);
    doc.line(M, yPos + 6, PAGE_W - M, yPos + 6);
    return yPos + 18;
  };

  y = drawTableHeader(y);

  for (const sec of sections) {
    y = ensureSpace(doc, y, 40, () => drawTableHeader(newPage()));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 106, 79);
    doc.text(sec.title, M, y);
    y += 14;

    for (const r of sec.rows) {
      y = ensureSpace(doc, y, 16, () => drawTableHeader(newPage()));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 113, 108);
      doc.text(r.label, M, y);

      r.values.forEach((v, i) => {
        const tone = r.tones?.[i];
        if (tone === "best") {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(45, 106, 79);
        } else if (tone === "worst") {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(220, 38, 38);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(28, 25, 23);
        }
        const x = M + labelW + colW * i + colW - 4;
        doc.text(v, x, y, { align: "right" });
      });
      y += 14;
    }
    y += 6;
  }

  drawFooters(doc);
  doc.save(`kaufma_vergleich_${new Date().toISOString().slice(0, 10)}.pdf`);
}
