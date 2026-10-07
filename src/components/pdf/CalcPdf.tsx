import { DownloadSimple } from "@phosphor-icons/react";
import { pdfFileName } from "@/lib/pdfExport";
import {
  PDF_COLORS, PdfMetrics, PdfPage, PdfSection, PdfTable, Watermark, pdfDate, usePdfExport,
  type PdfMetric, type PdfRow,
} from "./PdfKit";

export type CalcPdfData = {
  /** Name des Rechners, z. B. "Rendite-Rechner". */
  title: string;
  /** Die drei wichtigsten Ergebnisse. */
  metrics: PdfMetric[];
  inputs: PdfRow[];
  results: PdfRow[];
};

/** Einseitiges Rechner-PDF: Kopf, Kennzahlen, Eingaben, Ergebnis. */
export function CalcPdfDocument({ data }: { data: CalcPdfData }) {
  const date = pdfDate();
  // Viele Zeilen (z. B. Fix & Flip): Eingaben und Ergebnis nebeneinander, damit alles auf eine Seite passt.
  const twoCols = data.inputs.length + data.results.length > 16;
  return (
    <PdfPage title={data.title} date={date} page={1} total={1}>
      <Watermark />
      <div
        style={{
          position: "relative",
          background: PDF_COLORS.cream,
          borderRadius: 12,
          padding: "16px 18px 18px",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: PDF_COLORS.muted }}>Rechner</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: PDF_COLORS.ink, marginTop: 4, marginBottom: 14 }}>{data.title}</div>
        <PdfMetrics metrics={data.metrics} />
      </div>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: twoCols ? "1fr 1fr" : "1fr", gap: twoCols ? 16 : 18, alignItems: "start" }}>
        <PdfSection title="Ihre Eingaben">
          <PdfTable compact={twoCols || data.inputs.length > 9} rows={data.inputs} />
        </PdfSection>
        <PdfSection title="Ergebnis" note="Berechnet mit kaufma.eu auf Basis Ihrer Eingaben.">
          <PdfTable compact={twoCols || data.results.length > 9} rows={data.results} />
        </PdfSection>
      </div>
    </PdfPage>
  );
}

/** "Als PDF exportieren" – für die Rechner im eingeloggten Bereich. */
export function CalcPdfButton({ data }: { data: () => CalcPdfData }) {
  const pdf = usePdfExport();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          const d = data();
          pdf.run(<CalcPdfDocument data={d} />, pdfFileName(d.title));
        }}
        disabled={pdf.exporting}
        className="no-print w-full inline-flex items-center justify-center gap-2 rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-2.5 text-[13px] font-medium text-[#1C1917] transition-colors hover:border-[#1C1917] disabled:opacity-50"
      >
        <DownloadSimple weight="duotone" className="size-4" aria-hidden />
        {pdf.exporting ? "PDF wird erstellt …" : "Als PDF exportieren"}
      </button>
      {pdf.portal}
    </>
  );
}
