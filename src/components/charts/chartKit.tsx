import type { ReactNode } from "react";

/**
 * Einheitliches Aussehen aller Recharts-Diagramme.
 * Achsen ohne Linie, nur horizontale Rasterlinien, Linien ohne Punkte (nur beim Hover),
 * Legende oben rechts, eigener Tooltip. Werte ohne "€" an jedem Tick – die Einheit steht
 * einmal an der Achse.
 *
 * Recharts schreibt Farben als SVG-Attribute; dort greifen keine CSS-Variablen,
 * deshalb Hex-Werte.
 */

export const CHART_COLORS = {
  debt: "#DC2626", // Restschuld / negativ
  value: "#2D6A4F", // Immobilienwert / positiv
  equity: "#D97706", // Eigenkapital
  cashflowPre: "#78716C", // Cashflow vor Steuer
  cashflowPost: "#1C1917", // Cashflow nach Steuer / kumuliert
  grid: "#F5F3EE",
  tick: "#A8A29E",
  legend: "#78716C",
} as const;

const numberFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const euroFmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** Achsen-Ticks: "300.000" – ohne Währungszeichen. */
export const fmtAxisNumber = (v: number) => numberFmt.format(Math.round(Number(v) || 0));
/** Tooltip-Werte: "300.000 €". */
export const fmtEuro = (v: number) => euroFmt.format(Number(v) || 0);

/** Ränder: links/rechts 0, damit auf 375px Breite Platz für die Kurven bleibt. */
// top: Platz für die Einheit über der Y-Achse.
export const CHART_MARGIN = { top: 24, right: 0, bottom: 0, left: 0 } as const;

export const GRID_PROPS = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: "3 3",
  vertical: false,
} as const;

const TICK = { fontSize: 11, fill: CHART_COLORS.tick } as const;

/** X-Achse für Zeitreihen (Jahre): nur jedes 5. Label. */
export const X_AXIS_TIME = {
  tick: TICK,
  tickLine: false,
  axisLine: false,
  interval: 4,
  tickMargin: 6,
} as const;

/** X-Achse für Kategorien (Szenarien, Gruppen): alle Labels, sonst verliert man die Zuordnung. */
export const X_AXIS_CATEGORY = {
  tick: TICK,
  tickLine: false,
  axisLine: false,
  interval: 0,
  tickMargin: 6,
} as const;

/**
 * Y-Achse mit Beträgen. Die Einheit steht einmal über der Achse (`unitLabel`), nicht an jedem Tick.
 * Für eine rechte Achse `orientation: "right"` ergänzen.
 */
export function yAxisProps(unitLabel = "€", side: "left" | "right" = "left") {
  return {
    tick: TICK,
    tickLine: false,
    axisLine: false,
    width: 55,
    tickFormatter: fmtAxisNumber,
    orientation: side,
    // Bündig an der Außenkante der Achse statt zentriert – sonst werden längere
    // Einheiten wie "€ / Jahr" bei 55px Achsenbreite links abgeschnitten.
    label: ({ viewBox }: { viewBox?: { x: number; y: number; width: number } }) =>
      viewBox ? (
        <text
          x={side === "left" ? viewBox.x : viewBox.x + viewBox.width}
          y={viewBox.y - 8}
          textAnchor={side === "left" ? "start" : "end"}
          fontSize={11}
          fill={CHART_COLORS.tick}
        >
          {unitLabel}
        </text>
      ) : null,
  };
}

/** Linien: 2px, keine Punkte, nur beim Hover ein Punkt. */
export const LINE_PROPS = {
  strokeWidth: 2,
  dot: false,
  activeDot: { r: 4, strokeWidth: 0 },
  type: "monotone" as const,
} as const;

/** Legende oben rechts, horizontal, kleine Kreise. */
export const LEGEND_PROPS = {
  verticalAlign: "top" as const,
  align: "right" as const,
  layout: "horizontal" as const,
  iconType: "circle" as const,
  iconSize: 8,
  // Keine feste Höhe: Recharts misst die Legende (auch zweizeilig auf 375px);
  // das paddingBottom hält die Einheit über der Y-Achse frei.
  wrapperStyle: { fontSize: 11, color: CHART_COLORS.legend, lineHeight: "16px", paddingBottom: 22 },
  formatter: (value: ReactNode) => <span style={{ color: CHART_COLORS.legend, marginLeft: 2 }}>{value}</span>,
};

type TooltipEntry = { name?: ReactNode; value?: number | string; color?: string; payload?: Record<string, unknown> };

/**
 * Eigener Tooltip ohne Recharts-Standardstil.
 * `labelFormatter` bekommt den X-Wert (z. B. Jahr), `valueFormatter` jeden Wert.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter = (l) => (typeof l === "number" ? `Jahr ${l}` : String(l ?? "")),
  valueFormatter = (v) => fmtEuro(Number(v)),
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string | number | undefined) => ReactNode;
  valueFormatter?: (value: number | string, entry: TooltipEntry) => ReactNode;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const heading = labelFormatter(label);
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #EAE6DF",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "#1C1917",
        fontFamily: "Inter, system-ui, sans-serif",
        boxShadow: "none",
      }}
    >
      {heading ? <div style={{ fontWeight: 600, marginBottom: 4 }}>{heading}</div> : null}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, lineHeight: "18px" }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: p.color, flexShrink: 0 }} aria-hidden />
          <span style={{ color: CHART_COLORS.legend }}>{p.name}</span>
          <span style={{ marginLeft: "auto", paddingLeft: 12, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
            {p.value == null ? "—" : valueFormatter(p.value, p)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Container für eigenständige Diagramme: weiß, 1px Rand, 12px Radius, 20px Innenabstand, kein Schatten. */
export const CHART_CONTAINER_CLS = "rounded-[12px] border border-[#EAE6DF] bg-white p-5";
