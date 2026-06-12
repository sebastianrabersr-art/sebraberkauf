import { useEffect, useState, type ReactNode } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * Globale Chart-Stilkonstanten — auf jeden Recharts-Chart anwendbar.
 */
export const CHART_STYLE = {
  grid: { stroke: "#EAE6DF", strokeDasharray: "3 3" as const },
  axisTick: { fontSize: 11, fill: "#A8A29E" } as const,
  axisLine: { stroke: "#EAE6DF" } as const,
  tooltipContent: {
    background: "#FFFFFF",
    border: "1px solid #EAE6DF",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "none",
  } as React.CSSProperties,
  line: { strokeWidth: 2, dot: false } as const,
  bar: { radius: [4, 4, 0, 0] as [number, number, number, number] },
  colors: {
    positive: "#2D6A4F",
    negative: "#DC2626",
    neutral: "#A8A29E",
    secondary: "#1A4FD6",
  },
  referenceLine: { strokeDasharray: "4 4", labelStyle: { fontSize: 11, fontFamily: "Inter" } },
} as const;

export type ChartRange = "5J" | "10J" | "20J" | "30J";

export interface ChartCardProps {
  title: string;
  children: ReactNode;
  /** Optional: chips for time range. */
  ranges?: ChartRange[];
  range?: ChartRange;
  onRangeChange?: (r: ChartRange) => void;
  /** Optional: editable assumption inputs (rendered below chips). */
  assumptions?: ReactNode;
  /** Optional: summary line rendered below chart. */
  footer?: ReactNode;
  /** Height of chart wrapper in the card. Defaults to 240. Modal always 500. */
  height?: number;
}

export function ChartCard({
  title,
  children,
  ranges,
  range,
  onRangeChange,
  assumptions,
  footer,
  height = 240,
}: ChartCardProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const header = (
    <div className="flex items-center justify-between mb-3">
      <h3
        className="text-[13px] text-[#1C1917]"
        style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
      >
        {title}
      </h3>
      <button
        onClick={() => setExpanded(true)}
        aria-label="Vollbild"
        className="text-[#A8A29E] hover:text-[#1C1917] transition-colors"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );

  const controls = (
    <>
      {ranges && ranges.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          {ranges.map((r) => {
            const active = range === r;
            return (
              <button
                key={r}
                onClick={() => onRangeChange?.(r)}
                className="text-[11px] font-medium px-2 py-1 rounded-[6px] transition-colors"
                style={{
                  background: active ? "#2D6A4F" : "#F5F3EE",
                  color: active ? "#FFFFFF" : "#78716C",
                  border: active ? "1px solid #2D6A4F" : "1px solid #EAE6DF",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
      )}
      {assumptions && <div className="mb-3">{assumptions}</div>}
    </>
  );

  return (
    <>
      <div className="rounded-[12px] bg-white border border-[#EAE6DF] py-4 px-5">
        {header}
        {controls}
        <div style={{ height }}>{children}</div>
        {footer && <div className="mt-2 text-[12px] text-[#78716C]">{footer}</div>}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setExpanded(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-[16px] p-6 w-full"
            style={{ maxWidth: "90vw", maxHeight: "90vh", overflow: "auto" }}
          >
            <button
              onClick={() => setExpanded(false)}
              aria-label="Schließen"
              className="absolute top-4 right-4 text-[#A8A29E] hover:text-[#1C1917]"
            >
              <X className="w-5 h-5" />
            </button>
            <h3
              className="text-[15px] text-[#1C1917] mb-3 pr-8"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              {title}
            </h3>
            {controls}
            <div style={{ height: 500 }}>{children}</div>
            {footer && <div className="mt-2 text-[13px] text-[#78716C]">{footer}</div>}
          </div>
        </div>
      )}
    </>
  );
}
