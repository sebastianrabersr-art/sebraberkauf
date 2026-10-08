import { useMemo, useState } from "react";
import { CaretRight as ChevronRight } from "@phosphor-icons/react";
import type { Property } from "@/lib/types";
import { calcLongTermProjection, calcProperty, fmtEUR } from "@/lib/calc";
import { useActiveAssumptions } from "@/lib/store";

const bricolage = { fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', letterSpacing: "-0.02em" } as const;
const inter = { fontFamily: "Inter, system-ui, sans-serif" } as const;
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type ViewMode = "year" | "month";

export function ProjectionTable({ p }: { p: Property }) {
  const a = useActiveAssumptions();
  const c = useMemo(() => calcProperty(p, a), [p, a]);
  const rows = useMemo(() => calcLongTermProjection(p, a, c), [p, a, c]);
  const [view, setView] = useState<ViewMode>("year");
  const [openYear, setOpenYear] = useState<number | null>(null);

  const totals = useMemo(() => {
    const miete = rows.reduce((s, r) => s + r.miete, 0);
    const kosten = rows.reduce((s, r) => s + r.betriebskosten + r.instandhaltung + r.rate, 0);
    const cashflow = rows.reduce((s, r) => s + r.cashflow, 0);
    const last = rows[rows.length - 1];
    const endVerm = last ? last.immoWert - last.restschuld : 0;
    return { miete, kosten, cashflow, endVerm };
  }, [rows]);

  const monthsFor = (i: number) => {
    const r = rows[i];
    const prev = rows[i - 1];
    if (!r) return [];
    const startDebt = prev ? prev.restschuld : (c.kreditBetrag ?? r.restschuld);
    const endDebt = r.restschuld;
    const mMiete = r.miete / 12;
    const mBK = (r.betriebskosten + r.instandhaltung) / 12;
    const mRate = r.rate / 12;
    const mCF = r.cashflow / 12;
    return MONTHS.map((label, idx) => {
      const debt = startDebt + ((endDebt - startDebt) * (idx + 1)) / 12;
      return { label, miete: mMiete, bk: mBK, rate: mRate, cashflow: mCF, restschuld: debt };
    });
  };

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-5 mb-3 border-b border-[#EAE6DF]">
        {([
          ["year", "Jahresansicht"],
          ["month", "Monatsansicht"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className="pb-2 text-[13px] cursor-pointer"
            style={{
              ...inter,
              color: view === k ? "#1C1917" : "var(--ink-2)",
              borderBottom: view === k ? "2px solid #2D6A4F" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-[#EAE6DF]">
        <table className="w-full text-left" style={inter}>
          <thead>
            <tr style={{ background: "#FAFAF8" }}>
              {(view === "year"
                ? ["Jahr", "Miete p.a.", "BK + Rücklage", "Rate p.a.", "Cashflow", "Rendite", "Restschuld", "Immobilienwert", "Vermögen"]
                : ["Monat", "Miete", "BK", "Rate", "Cashflow", "Restschuld"]
              ).map((h, i) => (
                <th
                  key={h}
                  className="px-[14px] py-[10px] text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--ink-3)", textAlign: i === 0 ? "left" : "right" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view === "year"
              ? rows.map((r, i) => {
                  const verm = r.immoWert - r.restschuld;
                  const ek = c.eigenkapitalEinsatz || 1;
                  const rendite = (r.cashflow / ek) * 100;
                  const isOpen = openYear === r.year;
                  const months = isOpen ? monthsFor(i) : [];
                  return (
                    <YearRow
                      key={r.year}
                      year={r.year}
                      isOpen={isOpen}
                      onToggle={() => setOpenYear(isOpen ? null : r.year)}
                      cols={[
                        fmtEUR(r.miete),
                        fmtEUR(r.betriebskosten + r.instandhaltung),
                        fmtEUR(r.rate),
                        { value: fmtEUR(r.cashflow), tone: r.cashflow >= 0 ? "good" : "bad", bold: true },
                        `${rendite >= 0 ? "+" : ""}${rendite.toFixed(1).replace(".", ",")} %`,
                        { value: fmtEUR(r.restschuld), bric: true },
                        fmtEUR(r.immoWert),
                        { value: fmtEUR(verm), tone: verm >= 0 ? "good" : "bad" },
                      ]}
                      months={months}
                    />
                  );
                })
              : rows.flatMap((r, i) =>
                  monthsFor(i).map((m, mi) => (
                    <tr key={`${r.year}-${mi}`} className="border-b border-[#F5F3EE]">
                      <td className="px-[14px] py-[8px] text-[12px]" style={{ color: "var(--ink-3)" }}>
                        Jahr {r.year} · {m.label}
                      </td>
                      <td className="px-[14px] py-[8px] text-[12px] text-right tabular-nums">{fmtEUR(m.miete)}</td>
                      <td className="px-[14px] py-[8px] text-[12px] text-right tabular-nums">{fmtEUR(m.bk)}</td>
                      <td className="px-[14px] py-[8px] text-[12px] text-right tabular-nums">{fmtEUR(m.rate)}</td>
                      <td
                        className="px-[14px] py-[8px] text-[12px] text-right tabular-nums font-semibold"
                        style={{ color: m.cashflow >= 0 ? "#2D6A4F" : "#DC2626" }}
                      >
                        {fmtEUR(m.cashflow)}
                      </td>
                      <td className="px-[14px] py-[8px] text-[12px] text-right tabular-nums">{fmtEUR(m.restschuld)}</td>
                    </tr>
                  )),
                )}

            {/* Summary */}
            {view === "year" && (
              <tr style={{ background: "#F5F3EE", borderTop: "2px solid #EAE6DF" }}>
                <td className="px-[14px] py-[12px] text-[13px] font-semibold" style={{ color: "#1C1917" }}>
                  Gesamt {rows.length} Jahre
                </td>
                <td className="px-[14px] py-[12px] text-[13px] font-semibold text-right tabular-nums">{fmtEUR(totals.miete)}</td>
                <td className="px-[14px] py-[12px] text-[13px] font-semibold text-right tabular-nums">{fmtEUR(totals.kosten)}</td>
                <td className="px-[14px] py-[12px] text-[13px] font-semibold text-right tabular-nums">—</td>
                <td
                  className="px-[14px] py-[12px] text-[13px] font-semibold text-right tabular-nums"
                  style={{ color: totals.cashflow >= 0 ? "#2D6A4F" : "#DC2626" }}
                >
                  {fmtEUR(totals.cashflow)}
                </td>
                <td colSpan={3} />
                <td
                  className="px-[14px] py-[12px] text-[13px] font-semibold text-right tabular-nums"
                  style={{ color: totals.endVerm >= 0 ? "#2D6A4F" : "#DC2626" }}
                >
                  {fmtEUR(totals.endVerm)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Cell = string | { value: string; tone?: "good" | "bad"; bold?: boolean; bric?: boolean };

function YearRow({
  year,
  isOpen,
  onToggle,
  cols,
  months,
}: {
  year: number;
  isOpen: boolean;
  onToggle: () => void;
  cols: Cell[];
  months: { label: string; miete: number; bk: number; rate: number; cashflow: number; restschuld: number }[];
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-[#F5F3EE] cursor-pointer group hover:bg-[#FAFAF8] transition-colors"
      >
        <td className="px-[14px] py-[10px] text-[12px] font-medium" style={{ color: "#1C1917" }}>
          <span className="inline-flex items-center gap-1.5">
            <ChevronRight
              className="size-[14px] transition-transform group-hover:text-primary"
              style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", color: isOpen ? "#2D6A4F" : "var(--ink-3)" }}
            />
            Jahr {year}
          </span>
        </td>
        {cols.map((col, i) => {
          const isObj = typeof col === "object";
          const value = isObj ? col.value : col;
          const tone = isObj ? col.tone : undefined;
          const color = tone === "good" ? "#2D6A4F" : tone === "bad" ? "#DC2626" : "#1C1917";
          const fontWeight = isObj && col.bold ? 600 : 400;
          const style: React.CSSProperties = isObj && col.bric
            ? { ...bricolage, fontWeight: 600, color }
            : { color, fontWeight };
          return (
            <td key={i} className="px-[14px] py-[10px] text-[13px] text-right tabular-nums" style={style}>
              {value}
            </td>
          );
        })}
      </tr>
      {isOpen &&
        months.map((m, idx) => (
          <tr key={idx} style={{ background: "#FAFAF8" }} className="border-b border-[#F5F3EE]">
            <td className="text-[12px]" style={{ paddingLeft: 28, paddingRight: 14, paddingTop: 6, paddingBottom: 6, color: "var(--ink-3)" }}>
              {m.label}
            </td>
            <td className="px-[14px] py-[6px] text-[12px] text-right tabular-nums">{fmtEUR(m.miete)}</td>
            <td className="px-[14px] py-[6px] text-[12px] text-right tabular-nums">{fmtEUR(m.bk)}</td>
            <td className="px-[14px] py-[6px] text-[12px] text-right tabular-nums">{fmtEUR(m.rate)}</td>
            <td
              className="px-[14px] py-[6px] text-[12px] text-right tabular-nums font-semibold"
              style={{ color: m.cashflow >= 0 ? "#2D6A4F" : "#DC2626" }}
            >
              {fmtEUR(m.cashflow)}
            </td>
            <td className="px-[14px] py-[6px] text-[12px] text-right tabular-nums">{fmtEUR(m.restschuld)}</td>
            {/* fill remaining year-view columns */}
            <td /><td /><td />
          </tr>
        ))}
    </>
  );
}
