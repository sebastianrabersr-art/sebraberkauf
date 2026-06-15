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
  debt: "#DC2626", // rot — Schulden
  value: "#2D6A4F", // grün — Wert
  equity: "#2D6A4F",
  cashPos: "#2D6A4F",
  cashNeg: "#DC2626",
  cashCum: "#1C1917",
  liquid: "#78716C",
  amber: "#D97706",
  base: "#1C1917",
  conservative: "#D97706",
  optimistic: "#2D6A4F",
  grid: "#EAE6DF",
} as const;

const eurLocale = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const niceStep = (max: number) => {
  if (max <= 0) return 50000;
  const rough = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const m = rough / pow;
  const step = m >= 5 ? 5 : m >= 2 ? 2 : 1;
  return step * pow;
};
const buildTicks = (min: number, max: number) => {
  const step = niceStep(Math.max(Math.abs(min), Math.abs(max)));
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + 0.5; v += step) ticks.push(v);
  return { ticks, domain: [start, end] as [number, number] };
};
const fmtCompactEUR = (n: number) => `€ ${eurLocale.format(n)}`;

const tooltipStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--card-foreground)",
};

import { GlossaryTooltip } from "@/components/GlossaryTooltip";

function ChartCard({
  title,
  caption,
  termId,
  children,
}: {
  title: string;
  caption: string;
  termId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="font-semibold text-sm mb-3 flex items-center">
        {title}
        {termId && <GlossaryTooltip termId={termId} />}
      </h4>
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

  // Y-Axis scales
  const loanMax = Math.max(...loan.map((l) => l.restschuld), 0);
  const loanScale = buildTicks(0, loanMax * 1.1);
  const assetMax = Math.max(...asset.map((x) => Math.max(x.immoWert, x.restschuld, x.eigenkapital)), 0);
  const assetScale = buildTicks(0, assetMax * 1.3);
  const cashMin = Math.min(...cash.map((x) => Math.min(x.cashflow, x.cumCashflow, x.liquide)), 0);
  const cashMax = Math.max(...cash.map((x) => Math.max(x.cashflow, x.cumCashflow, x.liquide)), 0);
  const cashScale = buildTicks(cashMin < 0 ? cashMin * 1.2 : 0, Math.max(0, cashMax * 1.1));

  return (
    <div className="grid gap-4">
      {/* 1. Darlehen */}
      <ChartCard
        title="Darlehenshöhe im Zeitverlauf"
        termId="darlehenshoehe"
        caption="Verlauf der Restschuld über die geplante Halteperiode."
      >
        <ResponsiveContainer>
          <LineChart data={loan}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} domain={loanScale.domain} ticks={loanScale.ticks} />
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
        termId="asset_entwicklung"
        caption="Immobilienwert vs. Restschuld ergibt das Eigenkapital im Objekt."
      >
        <ResponsiveContainer>
          <LineChart data={asset}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} domain={assetScale.domain} ticks={assetScale.ticks} />
            <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="immoWert" name="Immobilienwert" stroke={COLORS.value} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="restschuld" name="Restschuld" stroke={COLORS.debt} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="eigenkapital" name="Eigenkapital im Objekt" stroke={COLORS.equity} strokeWidth={2.5} strokeDasharray="5 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 3. Cash */}
      <ChartCard
        title="Cash-Entwicklung"
        termId="cash_entwicklung"
        caption="Jährlicher Cashflow (grün/rot), kumulierter Cashflow und liquide Mittel."
      >
        <ResponsiveContainer>
          <ComposedChart data={cash}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} domain={cashScale.domain} ticks={cashScale.ticks} />
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
        termId="abschreibung"
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
