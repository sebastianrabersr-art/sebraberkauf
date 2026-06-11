import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Property } from "@/lib/types";
import { calcProperty, fmtEUR } from "@/lib/calc";
import { useActiveAssumptions } from "@/lib/store";

/**
 * Visuelle Aufbereitung des calc.investorModel.
 * Verwendet ein zentrales Farbsystem über CSS-Variablen (light + dark sicher).
 *  - Blau   = Finanzierung / Restschuld
 *  - Lila   = Immobilienwert
 *  - Grün   = Eigenkapital / positiver Cashflow / Wachstum
 *  - Rot    = negativer Cashflow / Risiko
 *  - Amber  = Warnungen / AfA
 */
const COLORS = {
  debt: "oklch(0.62 0.16 250)", // blau
  value: "oklch(0.58 0.18 300)", // lila
  equity: "oklch(0.62 0.14 155)", // grün
  cashPos: "oklch(0.62 0.14 155)", // grün
  cashNeg: "oklch(0.58 0.20 25)", // rot
  cashCum: "oklch(0.52 0.13 165)", // dunkelgrün
  liquid: "oklch(0.55 0.10 200)", // teal
  amber: "oklch(0.74 0.14 75)", // amber
  base: "oklch(0.55 0.18 250)", // blau (Basis)
  conservative: "oklch(0.66 0.16 50)", // amber/orange (konservativ)
  optimistic: "oklch(0.60 0.15 155)", // grün (optimistisch)
} as const;

const compact = new Intl.NumberFormat("de-DE", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fmtCompactEUR = (n: number) => `${compact.format(n)} €`;

const tooltipStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--card-foreground)",
};

function ChartCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="font-semibold text-sm mb-3">{title}</h4>
      <div className="h-72 w-full">{children}</div>
      <p className="text-[11px] text-muted-foreground mt-2 border-t pt-2">{caption}</p>
    </div>
  );
}

export function InvestorChartsPanel({ p }: { p: Property }) {
  const a = useActiveAssumptions();
  const c = useMemo(() => calcProperty(p, a), [p, a]);
  const im = c.investorModel;

  if (!im) {
    return (
      <div className="text-sm text-muted-foreground">
        Investor-Modell noch nicht verfügbar. Bitte Kaufpreis, Finanzierung und Projektion vollständig erfassen.
      </div>
    );
  }

  const loan = im.loanDevelopment.map((l) => ({
    jahr: l.jahr,
    restschuld: Math.round(l.remainingDebt),
  }));

  const asset = im.assetDevelopment.map((x) => ({
    jahr: x.jahr,
    immoWert: Math.round(x.estimatedPropertyValue),
    restschuld: Math.round(x.remainingDebt),
    eigenkapital: Math.round(x.equityInProperty),
  }));

  const cash = im.cashDevelopment.map((x) => ({
    jahr: x.jahr,
    cashflow: Math.round(x.annualCashflow),
    cumCashflow: Math.round(x.cumulativeCashflow),
    liquide: Math.round(x.liquidFundsDevelopment),
  }));

  const afa = im.charts.depreciationData.map((d) => ({
    jahr: d.jahr,
    afa: Math.round(d.value),
  }));

  const scn = im.charts.scenarioComparisonData.map((s) => ({
    label: s.label,
    cashflow: Math.round(s.cashflow),
    eigenkapital: Math.round(s.equityInProperty),
    dealScore: Math.round(s.dealScore),
  }));

  return (
    <div className="grid gap-4">
      {/* 1. Darlehen */}
      <ChartCard
        title="Darlehenshöhe im Zeitverlauf"
        caption="Verlauf der Restschuld über die geplante Halteperiode. Blau = Restschuld in €."
      >
        <ResponsiveContainer>
          <LineChart data={loan}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} />
            <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="restschuld"
              name="Restschuld"
              stroke={COLORS.debt}
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 2. Asset */}
      <ChartCard
        title="Asset-Entwicklung"
        caption="Immobilienwert (lila) vs. Restschuld (blau) ergibt das Eigenkapital im Objekt (grün)."
      >
        <ResponsiveContainer>
          <LineChart data={asset}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} />
            <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="immoWert" name="Immobilienwert" stroke={COLORS.value} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="restschuld" name="Restschuld" stroke={COLORS.debt} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="eigenkapital" name="Eigenkapital im Objekt" stroke={COLORS.equity} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 3. Cash */}
      <ChartCard
        title="Cash-Entwicklung"
        caption="Jährlicher Cashflow (grün/rot je nach Vorzeichen), kumulierter Cashflow und Entwicklung der liquiden Mittel."
      >
        <ResponsiveContainer>
          <ComposedChart data={cash}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} />
            <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="cashflow" name="Cashflow p.a.">
              {cash.map((row) => (
                <Cell key={row.jahr} fill={row.cashflow >= 0 ? COLORS.cashPos : COLORS.cashNeg} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="cumCashflow" name="Kumulierter Cashflow" stroke={COLORS.cashCum} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="liquide" name="Liquide Mittel" stroke={COLORS.liquid} strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 4. Szenarien */}
      <ChartCard
        title="Szenarien-Vergleich"
        caption="Vergleich Basis, Konservativ und Optimistisch: Cashflow p.a., Eigenkapital im Objekt am Ende des Horizonts, Deal Score."
      >
        <ResponsiveContainer>
          <BarChart data={scn}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip
              formatter={(v: any, name: any) =>
                name === "Deal Score" ? `${Math.round(Number(v))} / 100` : fmtEUR(Number(v))
              }
              contentStyle={tooltipStyle}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" dataKey="cashflow" name="Cashflow p.a.">
              {scn.map((row) => (
                <Cell
                  key={`cf-${row.label}`}
                  fill={
                    row.label === "Optimistisch"
                      ? COLORS.optimistic
                      : row.label === "Konservativ"
                      ? COLORS.conservative
                      : COLORS.base
                  }
                />
              ))}
            </Bar>
            <Bar yAxisId="l" dataKey="eigenkapital" name="Eigenkapital im Objekt" fill={COLORS.equity} />
            <Bar yAxisId="r" dataKey="dealScore" name="Deal Score" fill={COLORS.amber} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 5. AfA */}
      <ChartCard
        title="Abschreibung (AfA)"
        caption="Jährliche AfA in €. Bei sehr kleinen Werten wird als Balkendiagramm dargestellt, um Skalenprobleme zu vermeiden."
      >
        <ResponsiveContainer>
          <BarChart data={afa}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} />
            <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="afa" name="AfA p.a." fill={COLORS.amber} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
