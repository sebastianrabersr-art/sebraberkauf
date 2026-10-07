import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Property } from "@/lib/types";
import { calcProperty, fmtEUR, getActiveFinance, calcTotalInterestPaid } from "@/lib/calc";
import { useActiveAssumptions } from "@/lib/store";
import { GlossaryTooltip } from "@/components/GlossaryTooltip";

const COLORS = {
  debt: "#DC2626",
  value: "#2D6A4F",
  equity: "#D97706",
  cashPos: "#2D6A4F",
  cashNeg: "#DC2626",
  cashCum: "#1C1917",
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

function ChartCard({
  title,
  caption,
  termId,
  children,
  controls,
}: {
  title: string;
  caption: string;
  termId?: string;
  children: React.ReactNode;
  controls?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h4 className="font-semibold text-sm flex items-center">
          {title}
          {termId && <GlossaryTooltip termId={termId} />}
        </h4>
        {controls}
      </div>
      <div className="h-72 w-full">{children}</div>
      <p className="text-[11px] text-muted-foreground mt-2 border-t pt-2">{caption}</p>
    </div>
  );
}




export function InvestorChartsPanel({ p }: { p: Property }) {
  const a = useActiveAssumptions();
  const c = useMemo(() => calcProperty(p, a), [p, a]);
  const im = c.investorModel;
  const activeFin = getActiveFinance(p);
  const loanTermYears = Math.max(
    im?.horizonJahre ?? 30,
    activeFin?.laufzeitJahre ?? 30
  );
  const [sliderYears, setSliderYears] = useState<number>(loanTermYears);

  if (!im) {
    return (
      <div className="text-sm text-muted-foreground">
        Investor-Modell noch nicht verfügbar. Bitte Kaufpreis, Finanzierung und Projektion vollständig erfassen.
      </div>
    );
  }

  // Build loan data for full term using simple annuity math
  const fullLoanData = useMemo(() => {
    const loanAmount = im.loanNeed?.requiredLoan ?? 0;
    if (loanAmount <= 0) return [];
    const annualRate = activeFin?.zinssatz ?? 0.038;
    const termYears = activeFin?.laufzeitJahre ?? 30;
    const monthlyRate = annualRate / 12;
    const n = termYears * 12;
    const monthlyPay = monthlyRate === 0
      ? loanAmount / n
      : (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));

    const result: { jahr: number; restschuld: number }[] = [];
    let balance = loanAmount;
    for (let year = 1; year <= termYears; year++) {
      for (let m = 0; m < 12 && balance > 0; m++) {
        const interest = balance * monthlyRate;
        const principal = Math.min(monthlyPay - interest, balance);
        balance -= principal;
      }
      result.push({ jahr: year, restschuld: Math.max(0, Math.round(balance)) });
      if (balance <= 0) break;
    }
    return result;
  }, [p, a]);

  const loan = fullLoanData.filter((l) => l.jahr <= sliderYears);
  const paidOffIdx = fullLoanData.findIndex((l) => l.restschuld <= 0);

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
  }));

  const loanMax = Math.max(...loan.map((l) => l.restschuld), 0);
  const loanScale = buildTicks(0, loanMax * 1.1);
  const assetMax = Math.max(...asset.map((x) => Math.max(x.immoWert, x.restschuld, x.eigenkapital)), 0);
  const assetScale = buildTicks(0, assetMax * 1.3);
  const cashMin = Math.min(...cash.map((x) => Math.min(x.cashflow, x.cumCashflow)), 0);
  const cashMax = Math.max(...cash.map((x) => Math.max(x.cashflow, x.cumCashflow)), 0);
  const cashScale = buildTicks(cashMin < 0 ? cashMin * 1.2 : 0, Math.max(0, cashMax * 1.1));

  return (
    <div className="grid gap-4">
      <ChartCard
        title="Darlehenshöhe im Zeitverlauf"
        termId="darlehenshoehe"
        caption="Verlauf der Restschuld über die geplante Halteperiode. Wenn die Linie 0 erreicht, ist das Darlehen abbezahlt."
        controls={
          <div className="w-full sm:w-80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-2">Zeitraum: <strong>{sliderYears} Jahre</strong></span>
              <span className="text-[12px] text-ink-3">
                {paidOffIdx >= 0
                  ? `Abbezahlt in Jahr ${paidOffIdx + 1}`
                  : `Restschuld: ${fmtEUR(loan[loan.length - 1]?.restschuld ?? 0)}`}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={loanTermYears}
              step={1}
              value={sliderYears}
              onChange={(e) => setSliderYears(Number(e.target.value))}
              className="w-full accent-[#2D6A4F]"
            />
            <div className="flex justify-between text-[10px] text-ink-3">
              <span>5J</span>
              <span>{Math.round(loanTermYears / 2)}J</span>
              <span>{loanTermYears}J</span>
            </div>
          </div>
        }
      >
        {loan.length > 0 ? (
          <ResponsiveContainer>
            <LineChart data={loan}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis dataKey="jahr" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} domain={loanScale.domain} ticks={loanScale.ticks} />
              <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine
                y={0}
                stroke="#2D6A4F"
                strokeDasharray="4 4"
                label={{ value: "Abbezahlt", position: "insideTopRight", fontSize: 11, fill: "#2D6A4F" }}
              />
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
        ) : (
          <div className="h-full flex items-center justify-center text-[13px] text-ink-3">
            Bitte Eigenkapital und Zinssatz eintragen, um die Darlehenskurve zu berechnen.
          </div>
        )}
      </ChartCard>

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

      <ChartCard
        title="Cash-Entwicklung"
        termId="cash_entwicklung"
        caption="Jährlicher Cashflow (Balken) und kumulierter Cashflow (Linie). Wenn die Linie die Nulllinie kreuzt, hat sich die Investition amortisiert."
      >
        <ResponsiveContainer>
          <ComposedChart data={cash}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompactEUR} domain={cashScale.domain} ticks={cashScale.ticks} />
            <Tooltip formatter={(v: any) => fmtEUR(Number(v))} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="#EAE6DF" strokeDasharray="3 3" />
            <Bar dataKey="cashflow" name="Cashflow p.a.">
              {cash.map((row) => (
                <Cell key={row.jahr} fill={row.cashflow >= 0 ? COLORS.cashPos : COLORS.cashNeg} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="cumCashflow" name="Kumulierter Cashflow" stroke={COLORS.cashCum} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
