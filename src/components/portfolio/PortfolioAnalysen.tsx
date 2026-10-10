import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { CHART_COLORS, CHART_MARGIN, ChartTooltip, GRID_PROPS, LEGEND_PROPS, LINE_PROPS, X_AXIS_CATEGORY, X_AXIS_TIME, yAxisProps } from "@/components/charts/chartKit";
import { fmtEUR, fmtPct } from "@/lib/calc";
import { useActiveAssumptions } from "@/lib/store";
import { isGewerbeMiete, leerstandGewerbe } from "@/lib/propertyKinds";
import { diversification, portfolioProjection, portfolioSummary, type HoldingRow } from "@/lib/portfolioAnalytics";

const POS = "#2D6A4F";
const NEG = "#DC2626";
const signColor = (v: number | null) => (v == null ? "#1C1917" : v >= 0 ? POS : NEG);

const card = "rounded-[12px] border border-[#EAE6DF] bg-white";

function SectionTitle({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="text-[15px] font-semibold text-[#1C1917] font-sans tracking-normal mb-3">
      {children}
    </h2>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={`${card} px-5 py-4 flex flex-col-reverse`}>
      <dt className="mt-1.5 text-[11px] text-[#A8A29E]">{label}</dt>
      <dd className="font-display font-extrabold text-[24px] leading-none tabular-nums tracking-[-0.02em]" style={{ color: color ?? "#1C1917" }}>
        {value}
      </dd>
    </div>
  );
}

/** Tab "Analysen" in Meine Objekte: Auswertung über den ganzen Bestand. */
export function PortfolioAnalysen({ rows }: { rows: HoldingRow[] }) {
  const a = useActiveAssumptions();
  const projection = useMemo(() => portfolioProjection(rows, 20, 0.02), [rows]);
  const summary = useMemo(() => portfolioSummary(rows), [rows]);
  const div = useMemo(() => diversification(rows), [rows]);

  const nettoNachLeerstand = rows.reduce((s, h) => {
    const pct = isGewerbeMiete(h.p.propertyType) ? leerstandGewerbe(h.p) : h.p.leerstandPufferPct ?? a.leerstandPuffer;
    return s + h.mieteMtl * (1 - pct);
  }, 0);
  const rentData = rows.map((h) => ({ name: h.name, Miete: Math.round(h.mieteMtl) }));
  const y20 = projection[projection.length - 1];

  return (
    <div className="space-y-10">
      {/* A — Wertentwicklung */}
      <section aria-labelledby="pa-wert">
        <SectionTitle id="pa-wert">Wertentwicklung</SectionTitle>
        <ChartCard
          title="Bestand über 20 Jahre"
          height={300}
          footer={
            <>
              In 20 Jahren: Immobilienwert {fmtEUR(y20.Immobilienwert)} · Eigenkapital {fmtEUR(y20["Eigenkapital im Portfolio"])}.
              Annahme: 2 % Wertsteigerung p.a., gleichbleibende Raten.
            </>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            {/* Rechts etwas Luft für "20", Y-Achse breiter für Millionenbeträge */}
            <LineChart data={projection} margin={{ ...CHART_MARGIN, right: 12 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="jahr" {...X_AXIS_TIME} />
              <YAxis {...yAxisProps()} width={70} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#EAE6DF" }} />
              <Legend {...LEGEND_PROPS} />
              <Line {...LINE_PROPS} dataKey="Immobilienwert" stroke={CHART_COLORS.value} />
              <Line {...LINE_PROPS} dataKey="Eigenkapital im Portfolio" stroke={CHART_COLORS.equity} />
              <Line {...LINE_PROPS} dataKey="Gesamte Restschuld" stroke={CHART_COLORS.debt} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* B — Mieteinnahmen */}
      <section aria-labelledby="pa-miete">
        <SectionTitle id="pa-miete">Mieteinnahmen</SectionTitle>
        <ChartCard title="Monatliche Miete je Objekt" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rentData} margin={CHART_MARGIN}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="name" {...X_AXIS_CATEGORY} />
              <YAxis {...yAxisProps("€ / Monat")} />
              <Tooltip content={<ChartTooltip labelFormatter={(l) => String(l ?? "")} />} cursor={{ fill: "#F5F3EE" }} />
              <Bar dataKey="Miete" fill={POS} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <dl className={`${card} mt-3 divide-y divide-[#EAE6DF] text-[13px]`}>
          {[
            ["Gesamte Bruttomiete", `${fmtEUR(summary.bruttoMieteMtl)} / Mo`],
            ["Effektive Nettomiete (nach Leerstand)", `${fmtEUR(nettoNachLeerstand)} / Mo`],
            ["Jahresertrag", fmtEUR(nettoNachLeerstand * 12)],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3">
              <dt className="text-ink-2">{k}</dt>
              <dd className="font-semibold tabular-nums text-[#1C1917]">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* C — Cashflow */}
      <section aria-labelledby="pa-cashflow">
        <SectionTitle id="pa-cashflow">Cashflow</SectionTitle>
        <div className={`${card} overflow-hidden`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#EAE6DF] text-[12px] text-ink-3">
                <th scope="col" className="text-left font-normal px-5 py-2.5">Objekt</th>
                <th scope="col" className="text-right font-normal px-3 py-2.5 whitespace-nowrap">Cashflow / Mo</th>
                <th scope="col" className="text-right font-normal px-5 py-2.5">Rendite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {rows.map((h) => (
                <tr key={h.p.id}>
                  <th scope="row" className="text-left font-medium text-[#1C1917] px-5 py-3 max-w-0 w-full truncate">{h.p.title || "Ohne Titel"}</th>
                  <td className="text-right tabular-nums font-semibold px-3 py-3 whitespace-nowrap" style={{ color: signColor(h.cashflowMtl) }}>{fmtEUR(h.cashflowMtl)}</td>
                  <td className="text-right tabular-nums px-5 py-3 whitespace-nowrap text-[#1C1917]">{h.bruttorendite == null ? "—" : fmtPct(h.bruttorendite)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#D4CFC8] bg-[#FAFAF8]">
                <th scope="row" className="text-left font-semibold text-[#1C1917] px-5 py-3">Gesamt-Cashflow / Mo</th>
                <td className="text-right tabular-nums font-bold px-3 py-3 whitespace-nowrap" style={{ color: signColor(summary.cashflowMtl) }}>{fmtEUR(summary.cashflowMtl)}</td>
                <td className="px-5 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* D — Kennzahlen */}
      <section aria-labelledby="pa-kpi">
        <SectionTitle id="pa-kpi">Portfolio-Kennzahlen</SectionTitle>
        <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Kpi label="Ø Bruttorendite" value={summary.avgBruttorendite == null ? "—" : fmtPct(summary.avgBruttorendite)} color={signColor(summary.avgBruttorendite)} />
          <Kpi label="Cashflow gesamt / Mo" value={fmtEUR(summary.cashflowMtl)} color={signColor(summary.cashflowMtl)} />
          <Kpi label="Loan-to-Value (Restschuld / Wert)" value={summary.ltv == null ? "—" : fmtPct(summary.ltv)} />
          <Kpi label="Eigenkapitalrendite (gewichtet)" value={summary.ekRendite == null ? "—" : fmtPct(summary.ekRendite)} color={signColor(summary.ekRendite)} />
        </dl>
        <p className="mt-2 text-[12px] text-ink-3">
          Eigenkapitalrendite: Cashflow plus Tilgung im ersten Jahr, geteilt durch das gesamte eingesetzte Eigenkapital.
        </p>
      </section>

      {/* E — Diversifikation */}
      <section aria-labelledby="pa-div">
        <SectionTitle id="pa-div">Diversifikation</SectionTitle>
        <div className={`${card} px-5 py-4 space-y-1.5 text-[14px] text-[#1C1917]`}>
          <p>{div.typen || "—"}</p>
          <p className="text-ink-2">
            Standorte: {div.standorte.length ? div.standorte.join(", ") : "noch keine Adressen erfasst"}
          </p>
        </div>
      </section>
    </div>
  );
}
