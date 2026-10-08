import jsPDF from "jspdf";

/* ════════════════════════════════════════════════════════════════════════════
 * PDF-Export über den Druckdialog des Browsers ("Als PDF speichern").
 *
 * Objekt- und Rechner-Exporte rendern ein eigenes Druckdokument (siehe
 * src/components/pdf/) und übergeben es hier. Recharts-Diagramme werden vor dem
 * Drucken per html2canvas in Bilder umgewandelt: Beim Druck ändert sich die
 * Seitenbreite, Recharts würde neu messen und seine Animation neu starten –
 * im PDF landeten dann leere oder halb gezeichnete Diagramme.
 * ════════════════════════════════════════════════════════════════════════════ */

/** Wartet, bis Schriften geladen und das Layout zweimal gezeichnet ist. */
export async function waitForLayout(extraMs = 150): Promise<void> {
  try { await document.fonts?.ready; } catch { /* ignore */ }
  // requestAnimationFrame pausiert in Hintergrund-Tabs – ohne Zeitgrenze bliebe der
  // Export hängen, wenn jemand direkt nach dem Klick den Tab wechselt.
  const frame = () =>
    new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      requestAnimationFrame(finish);
      setTimeout(finish, 100);
    });
  await frame();
  await frame();
  if (extraMs > 0) await new Promise((r) => setTimeout(r, extraMs));
}

/** Ersetzt alle Recharts-Diagramme in `element` durch Bilder; gibt eine Funktion zum Wiederherstellen zurück. */
export async function captureCharts(element: HTMLElement): Promise<() => void> {
  const restores: (() => void)[] = [];
  const wrappers = Array.from(element.querySelectorAll<HTMLElement>(".recharts-wrapper"));
  if (wrappers.length === 0) return () => {};
  const { default: html2canvas } = await import("html2canvas");
  for (const w of wrappers) {
    try {
      const canvas = await html2canvas(w, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        logging: false,
        useCORS: true,
        // Ohne Ausgleich verschiebt html2canvas das Bild um die aktuelle Scrollposition.
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
      });
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/png");
      img.alt = "";
      img.className = "pdf-chart-img";
      img.style.width = `${w.offsetWidth}px`;
      img.style.height = `${w.offsetHeight}px`;
      w.parentElement?.insertBefore(img, w);
      const prevDisplay = w.style.display;
      w.style.display = "none";
      restores.push(() => { img.remove(); w.style.display = prevDisplay; });
    } catch {
      // Ein Diagramm, das sich nicht erfassen lässt, wird als SVG gedruckt.
    }
  }
  return () => restores.forEach((r) => r());
}

/**
 * Druckt `element` als PDF: Diagramme erfassen → Druckdialog öffnen → danach alles
 * wiederherstellen. `filename` wird als Dokumenttitel gesetzt – Browser schlagen ihn
 * beim Speichern als Dateinamen vor.
 */
export async function exportToPdf(element: HTMLElement, filename: string): Promise<void> {
  await waitForLayout();
  const restoreCharts = await captureCharts(element);

  const prevTitle = document.title;
  document.title = filename.replace(/\.pdf$/i, "");
  document.body.classList.add("kaufma-printing");
  element.classList.add("kaufma-print-active");

  try {
    await new Promise<void>((resolve) => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        window.removeEventListener("afterprint", done);
        resolve();
      };
      window.addEventListener("afterprint", done);
      window.print();
      // Die meisten Browser blockieren in print(), bis der Dialog zu ist; wo nicht,
      // hat der Browser das Dokument bereits für den Druck übernommen.
      setTimeout(done, 300);
    });
  } finally {
    element.classList.remove("kaufma-print-active");
    document.body.classList.remove("kaufma-printing");
    document.title = prevTitle;
    restoreCharts();
  }
}

export function pdfFileName(...parts: (string | null | undefined)[]): string {
  const slug = parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `kaufma_${slug || "export"}_${new Date().toISOString().slice(0, 10)}.pdf`;
}

/* ═════════════════════════ Vergleichs-PDF (jsPDF) ═════════════════════════ */

const M = 50; // margin pt
const PAGE_W = 595;
const PAGE_H = 842;
const FOOTER = "kaufma.eu · Keine Anlage- oder Rechtsberatung";

function fmtDate(d = new Date()): string {
  return d.toLocaleDateString("de-AT");
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
