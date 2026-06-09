import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import { calcProperty, calcScore, fmtEUR, fmtPct, fmtNum } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Building, Target, TrendingUp, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard – Immo Invest" },
      { name: "description", content: "Überblick aller analysierten Immobilien-Investments." },
    ],
  }),
  component: Dashboard,
});

function KpiCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: any }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold mt-1.5">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { properties, assumptions } = useStore();
  const rows = properties.map((p) => {
    const c = calcProperty(p, assumptions);
    const s = calcScore(p, assumptions, c);
    return { p, c, s };
  });
  const total = rows.length;
  const avgScore = total ? rows.reduce((a, r) => a + r.s.total, 0) / total : 0;
  const best = rows.slice().sort((a, b) => b.s.total - a.s.total)[0];
  const avgBrutto = total ? rows.reduce((a, r) => a + r.c.bruttorendite, 0) / total : 0;
  const avgCashflow = total ? rows.reduce((a, r) => a + r.c.cashflowMtl, 0) / total : 0;
  const interessant = rows.filter((r) => r.s.total >= 70).length;
  const fehlend = rows.filter((r) => r.p.missingData.length > 0 || !r.p.kaufpreis || !r.p.nettomieteMtl).length;

  const topScore = rows.slice().sort((a, b) => b.s.total - a.s.total).slice(0, 10);
  const topCashflow = rows.slice().sort((a, b) => b.c.cashflowMtl - a.c.cashflowMtl).slice(0, 10);

  const scoreBuckets = [
    { name: "0-54", count: rows.filter((r) => r.s.total < 55).length },
    { name: "55-69", count: rows.filter((r) => r.s.total >= 55 && r.s.total < 70).length },
    { name: "70-84", count: rows.filter((r) => r.s.total >= 70 && r.s.total < 85).length },
    { name: "85-100", count: rows.filter((r) => r.s.total >= 85).length },
  ];

  const scatter = rows
    .filter((r) => r.p.kaufpreis && r.c.bruttorendite > 0)
    .map((r) => ({ x: r.p.kaufpreis, y: r.c.bruttorendite * 100, name: r.p.title, ampel: r.s.ampel }));

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Überblick deiner analysierten Immobilien-Investments in Wien."
        actions={
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-95"
          >
            Neue Immobilie analysieren <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Objekte" value={String(total)} icon={Building} />
        <KpiCard label="Ø Score" value={fmtNum(avgScore, 1)} icon={Target} />
        <KpiCard label="Beste" value={best ? `${best.s.total}` : "—"} sub={best?.p.title.slice(0, 24)} icon={TrendingUp} />
        <KpiCard label="Ø Bruttorendite" value={fmtPct(avgBrutto)} icon={TrendingUp} />
        <KpiCard label="Ø Cashflow mtl." value={fmtEUR(avgCashflow)} icon={Wallet} />
        <KpiCard label="Interessant" value={String(interessant)} sub={`${fehlend} mit fehlenden Daten`} icon={AlertTriangle} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-3">Score-Verteilung</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreBuckets}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {scoreBuckets.map((b, i) => (
                  <Cell key={i} fill={i === 0 ? "var(--destructive)" : i === 1 ? "var(--warning)" : "var(--success)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-3">Kaufpreis vs. Bruttorendite</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="x" name="Kaufpreis" tickFormatter={(v) => `${Math.round(v / 1000)}k`} fontSize={12} />
              <YAxis dataKey="y" name="Bruttorendite %" fontSize={12} />
              <Tooltip
                formatter={(v: any, n) => (n === "x" ? fmtEUR(v) : `${Number(v).toFixed(2)}%`)}
                labelFormatter={() => ""}
              />
              <Scatter data={scatter}>
                {scatter.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.ampel === "green" ? "var(--success)" : d.ampel === "yellow" ? "var(--warning)" : "var(--destructive)"}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <RankTable title="Top 10 nach Score" rows={topScore} metric={(r) => `${r.s.total}`} />
        <RankTable title="Top 10 nach Cashflow" rows={topCashflow} metric={(r) => fmtEUR(r.c.cashflowMtl)} />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-3">Objekte mit fehlenden Daten / Warnungen</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-3">Objekt</th>
                <th className="py-2 pr-3">Bezirk</th>
                <th className="py-2 pr-3">Mietrecht</th>
                <th className="py-2 pr-3">Fehlend</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => r.p.missingData.length > 0 || !r.p.kaufpreis || !r.p.nettomieteMtl)
                .map((r) => (
                  <tr key={r.p.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.p.title || "—"}</td>
                    <td className="py-2 pr-3">{r.p.bezirk || "—"}</td>
                    <td className="py-2 pr-3 text-xs">{r.p.mietrecht}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {[...r.p.missingData, !r.p.kaufpreis && "Kaufpreis", !r.p.nettomieteMtl && "Miete"]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                    <td className="py-2">
                      <Link to="/properties/$id" params={{ id: r.p.id }} className="text-primary text-sm hover:underline">
                        Öffnen
                      </Link>
                    </td>
                  </tr>
                ))}
              {rows.every((r) => r.p.missingData.length === 0 && r.p.kaufpreis && r.p.nettomieteMtl) && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground text-sm">
                    Alles vollständig.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function RankTable({ title, rows, metric }: { title: string; rows: any[]; metric: (r: any) => string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.p.id} className="border-b last:border-0">
              <td className="py-2 pr-2 text-muted-foreground w-6">{i + 1}.</td>
              <td className="py-2 pr-2">
                <Link to="/properties/$id" params={{ id: r.p.id }} className="hover:underline font-medium">
                  {r.p.title || "—"}
                </Link>
                <div className="text-xs text-muted-foreground">{r.p.bezirk} · {fmtEUR(r.p.kaufpreis)}</div>
              </td>
              <td className="py-2 text-right">
                <div className="font-semibold">{metric(r)}</div>
                <div className="text-xs"><AmpelBadge ampel={r.s.ampel}>{r.s.entscheidung}</AmpelBadge></div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="py-4 text-center text-muted-foreground text-sm">Keine Objekte.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
