import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { exportToPdf } from "@/lib/pdfExport";

/* ════════════════════════════════════════════════════════════════════════════
 * Gemeinsame Bausteine für alle PDF-Exporte (Objekt und Rechner).
 * Ein Export rendert ein Druckdokument aus festen A4-Seiten (.pdf-page): Kopf
 * und Fuß stehen auf jeder Seite, die Seitenzahlen sind deshalb immer exakt.
 * Druck-CSS: src/styles.css (Abschnitt "PDF-Export").
 * ════════════════════════════════════════════════════════════════════════════ */

export const PDF_COLORS = {
  green: "#2D6A4F",
  ink: "#1C1917",
  muted: "#78716C",
  faint: "#A8A29E",
  cream: "#F5F3EE",
  line: "#EAE6DF",
  alt: "#FAFAF8",
  red: "#DC2626",
} as const;

const BRICOLAGE = "'Bricolage Grotesque', sans-serif";
const INTER = "Inter, system-ui, sans-serif";
// #FAFAF8 auf Weiß – halbtransparent, damit das Wasserzeichen hinter Tabellen sichtbar bleibt.
const ROW_ALT = "rgba(120, 113, 108, 0.04)";

/* ───────── Formatierung: immer Tausenderpunkte (de-DE) ───────── */

const eurFmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export const pdfEur = (n: number | null | undefined) => (isNum(n) ? eurFmt.format(n) : "—");
/** Bruchteil → Prozent (0.0425 → "4,25 %"). */
export const pdfPct = (n: number | null | undefined, digits = 2) =>
  isNum(n) ? new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: digits }).format(n) : "—";
/** Prozentzahl → Prozent (3.5 → "3,5 %"). */
export const pdfPctPoints = (n: number | null | undefined, digits = 2) =>
  isNum(n) ? `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: digits }).format(n)} %` : "—";
export const pdfNum = (n: number | null | undefined, digits = 0) =>
  isNum(n) ? new Intl.NumberFormat("de-DE", { maximumFractionDigits: digits }).format(n) : "—";
export const pdfDate = () => new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export type PdfTone = "pos" | "neg" | undefined;
export const toneOf = (n: number | null | undefined): PdfTone => (!isNum(n) ? undefined : n >= 0 ? "pos" : "neg");
const toneColor = (t: PdfTone) => (t === "pos" ? PDF_COLORS.green : t === "neg" ? PDF_COLORS.red : PDF_COLORS.ink);

export type PdfRow = { label: string; value: string; tone?: PdfTone; sub?: string; strong?: boolean };
export type PdfMetric = { label: string; value: string; tone?: PdfTone };

/* ───────── Seite ───────── */

export function PdfHeader({ title, date }: { title: string; date: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        background: PDF_COLORS.cream,
        borderBottom: `2px solid ${PDF_COLORS.green}`,
        padding: "9px 14px",
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 18, color: PDF_COLORS.green, letterSpacing: "-0.02em" }}>kaufma</span>
      <span style={{ textAlign: "right", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: PDF_COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120mm" }}>{title}</span>
        <span style={{ display: "block", fontSize: 10, color: PDF_COLORS.faint }}>Export vom {date}</span>
      </span>
    </div>
  );
}

export function PdfFooter({ page, total, style }: { page: number; total: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 10,
        color: PDF_COLORS.faint,
        paddingTop: 8,
        borderTop: `1px solid ${PDF_COLORS.cream}`,
        flexShrink: 0,
        ...style,
      }}
    >
      <span>kaufma.eu · Keine Anlage- oder Rechtsberatung</span>
      <span>Seite {page} von {total}</span>
    </div>
  );
}

export function PdfPage({ title, date, page, total, children, watermark }: {
  title: string; date: string; page: number; total: number; children: ReactNode; watermark?: boolean;
}) {
  return (
    <div className="pdf-page" style={{ fontFamily: INTER, color: PDF_COLORS.ink, background: "#FFFFFF" }}>
      {watermark && <Watermark />}
      <PdfHeader title={title} date={date} />
      <div style={{ flex: 1, minHeight: 0, padding: "16px 2px 10px", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
        {children}
      </div>
      <PdfFooter page={page} total={total} />
    </div>
  );
}

export function Watermark() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <span
        style={{
          transform: "rotate(-30deg)",
          fontFamily: BRICOLAGE,
          fontWeight: 800,
          fontSize: 44,
          color: PDF_COLORS.line,
          whiteSpace: "nowrap",
          letterSpacing: "-0.01em",
        }}
      >
        Analyse erstellt mit kaufma.eu
      </span>
    </div>
  );
}

/** Deckblatt: ganze A4-Seite in #F5F3EE (der Druckrand der ersten Seite ist 0, siehe PdfCoverPageStyle). */
export function PdfCover({ title, kicker, subtitle, metrics, date, page, total }: {
  title: string; kicker: string; subtitle?: string; metrics: PdfMetric[]; date: string; page: number; total: number;
}) {
  return (
    <div
      className="pdf-page pdf-cover"
      style={{ fontFamily: INTER, color: PDF_COLORS.ink, background: PDF_COLORS.cream, padding: "22mm 18mm 15mm" }}
    >
      <Watermark />
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 32, color: PDF_COLORS.green, letterSpacing: "-0.03em" }}>kaufma</div>
        <div style={{ height: 2, width: 40, background: PDF_COLORS.green, marginTop: 10 }} />

        <div style={{ marginTop: "38mm" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: PDF_COLORS.muted }}>{kicker}</div>
          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.25, marginTop: 8, color: PDF_COLORS.ink }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: PDF_COLORS.muted, marginTop: 8 }}>{subtitle}</div>}
        </div>

        <div style={{ marginTop: "24mm" }}>
          <PdfMetrics metrics={metrics} large />
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right", fontSize: 11, color: PDF_COLORS.faint, marginBottom: 10 }}>Export vom {date}</div>
        <PdfFooter page={page} total={total} style={{ borderTopColor: PDF_COLORS.line }} />
      </div>
    </div>
  );
}

/** Der erste Druckbogen ohne Rand, damit das Deckblatt randlos in #F5F3EE erscheint. */
export function PdfCoverPageStyle() {
  return <style>{"@media print { @page :first { margin: 0; } }"}</style>;
}

/* ───────── Inhalte ───────── */

export function PdfMetrics({ metrics, large }: { metrics: PdfMetric[]; large?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))`, gap: 14 }}>
      {metrics.map((m) => (
        <div
          key={m.label}
          style={{
            background: "#FFFFFF",
            border: `1px solid ${PDF_COLORS.line}`,
            borderRadius: 10,
            padding: large ? "16px 16px 14px" : "12px 14px 10px",
          }}
        >
          <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: large ? 26 : 20, lineHeight: 1.1, color: toneColor(m.tone), fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {m.value}
          </div>
          <div style={{ fontSize: 11, color: PDF_COLORS.muted, marginTop: 6 }}>{m.label}</div>
        </div>
      ))}
    </div>
  );
}

export function PdfSection({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section>
      <div style={{ fontFamily: BRICOLAGE, fontWeight: 700, fontSize: 15, color: PDF_COLORS.ink, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ height: 2, width: 40, background: PDF_COLORS.green, margin: "5px 0 8px" }} />
      {children}
      {note && <div style={{ fontSize: 10, color: PDF_COLORS.faint, marginTop: 6, lineHeight: 1.4 }}>{note}</div>}
    </section>
  );
}

/** Zweispaltige Daten-Tabelle: Bezeichnung | Wert. */
export function PdfTable({ rows, compact }: { rows: PdfRow[]; compact?: boolean }) {
  return (
    <div>
      {rows.map((r, i) => (
        <div
          key={`${r.label}-${i}`}
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            padding: compact ? "4px 10px" : "6px 10px",
            background: i % 2 === 0 ? "transparent" : ROW_ALT,
            borderBottom: `1px solid ${PDF_COLORS.cream}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: PDF_COLORS.muted }}>{r.label}</div>
            {r.sub && <div style={{ fontSize: 10, color: PDF_COLORS.faint }}>{r.sub}</div>}
          </div>
          <div
            style={{
              fontSize: compact ? 12 : 14,
              fontWeight: 700,
              color: toneColor(r.tone),
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              ...(r.strong ? { fontFamily: BRICOLAGE, fontSize: compact ? 13 : 15 } : null),
            }}
          >
            {r.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export type PdfGridCell = { value: string; tone?: PdfTone };

/** Mehrspaltige Tabelle (Tilgungsplan, Szenarien). Erste Spalte links, Rest rechtsbündig. */
export function PdfGridTable({ columns, rows, compact, template }: {
  columns: string[]; rows: (string | PdfGridCell)[][]; compact?: boolean;
  /** Eigene Spaltenbreiten (CSS grid-template-columns), Standard: erste Spalte etwas breiter. */
  template?: string;
}) {
  const grid = template ?? `minmax(0, 1.2fr) repeat(${columns.length - 1}, minmax(0, 1fr))`;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: grid, gap: 8, padding: "5px 10px", borderBottom: `1px solid ${PDF_COLORS.line}` }}>
        {columns.map((c, i) => (
          <div key={c} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: PDF_COLORS.muted, textAlign: i === 0 ? "left" : "right" }}>{c}</div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: "grid",
            gridTemplateColumns: grid,
            gap: 8,
            padding: compact ? "2.5px 10px" : "5px 10px",
            background: ri % 2 === 0 ? "transparent" : ROW_ALT,
            borderBottom: `1px solid ${PDF_COLORS.cream}`,
          }}
        >
          {row.map((cell, ci) => {
            const c = typeof cell === "string" ? { value: cell } : cell;
            return (
              <div
                key={ci}
                style={{
                  fontSize: ci === 0 ? 11 : compact ? 11 : 12,
                  color: ci === 0 ? PDF_COLORS.muted : toneColor(c.tone),
                  fontWeight: ci === 0 ? 400 : 600,
                  textAlign: ci === 0 ? "left" : "right",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                {c.value}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export type PdfLegendItem = { label: string; color: string };

/**
 * Rahmen für ein Diagramm im PDF: Titel, grüne Linie, Legende rechts oben, Diagramm,
 * Quellenhinweis. Die Legende steht bewusst außerhalb des Diagramms: Das Diagramm wird
 * per html2canvas zum Bild, und html2canvas setzt Legendentext versetzt – als normales
 * HTML wird sie dagegen scharf gedruckt.
 */
export function PdfChart({ title, legend, children }: { title: string; legend?: PdfLegendItem[]; children: ReactNode }) {
  return (
    <div style={{ background: "#FFFFFF" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: PDF_COLORS.ink }}>{title}</div>
          <div style={{ height: 2, width: 40, background: PDF_COLORS.green, marginTop: 5 }} />
        </div>
        {legend && legend.length > 0 && (
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: PDF_COLORS.muted }}>
            {legend.map((l) => (
              <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ height: 10 }} />
      {children}
      <div style={{ fontSize: 10, color: PDF_COLORS.faint, marginTop: 6 }}>Berechnet mit kaufma.eu auf Basis Ihrer Eingaben</div>
    </div>
  );
}

export function PdfEmpty({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: PDF_COLORS.muted, padding: "8px 10px", background: PDF_COLORS.alt, borderRadius: 8 }}>{children}</div>;
}

/* ───────── Export-Ablauf ───────── */

type PdfJob = { id: number; doc: ReactNode; filename: string; onDone?: () => void };

/**
 * Rendert ein Druckdokument, wartet auf das Layout, erfasst die Diagramme und öffnet den
 * Druckdialog. `portal` muss im Komponentenbaum des Aufrufers gerendert werden.
 */
export function usePdfExport() {
  const [job, setJob] = useState<PdfJob | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const handled = useRef<number>(0);
  const nextId = useRef<number>(1);

  useEffect(() => {
    if (!job || handled.current === job.id) return; // StrictMode ruft Effekte doppelt auf
    handled.current = job.id;
    const current = job;
    (async () => {
      try {
        if (rootRef.current) await exportToPdf(rootRef.current, current.filename);
      } finally {
        setJob(null);
        current.onDone?.();
      }
    })();
  }, [job]);

  const run = (doc: ReactNode, filename: string, onDone?: () => void) => {
    if (job) return;
    setJob({ id: nextId.current++, doc, filename, onDone });
  };

  const portal =
    job && typeof document !== "undefined"
      ? createPortal(
          <>
            <div className="kaufma-print-overlay no-print" role="status" aria-live="polite">
              <div style={{ textAlign: "center", fontFamily: INTER }}>
                <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 22, color: PDF_COLORS.green }}>kaufma</div>
                <div style={{ fontSize: 13, color: PDF_COLORS.muted, marginTop: 6 }}>PDF wird erstellt …</div>
              </div>
            </div>
            <div ref={rootRef} className="kaufma-print-root" aria-hidden>
              {job.doc}
            </div>
          </>,
          document.body,
        )
      : null;

  return { run, exporting: job != null, portal };
}
