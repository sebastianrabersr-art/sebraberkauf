import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct, fmtNum, isValidUrl } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Bell, Building, FileText, Link as LinkIcon, Pencil, Sparkles, Target, TrendingUp, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – Immo Invest" },
      { name: "description", content: "Übersicht deiner analysierten Kaufkandidaten." },
    ],
  }),
  component: Dashboard,
});

function KpiCard({ label, value, sub, icon: Icon, tone = "default" }: { label: string; value: string; sub?: string; icon: any; tone?: "default" | "primary" | "success" | "warning" | "danger" }) {
  const iconTone =
    tone === "success" ? "bg-success/10 text-success" :
    tone === "warning" ? "bg-warning/15 text-warning-foreground" :
    tone === "danger" ? "bg-destructive/10 text-destructive" :
    tone === "primary" ? "bg-primary/10 text-primary" :
    "bg-muted text-muted-foreground";
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
          <div className="text-[28px] leading-tight font-semibold mt-2 tabular-nums">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1 truncate">{sub}</div>}
        </div>
        <div className={`size-9 rounded-xl grid place-items-center ${iconTone}`}>
          <Icon className="size-4.5" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="font-semibold text-base tracking-tight">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const project = useActiveProject();
  const assumptions = useActiveAssumptions();
  const { properties } = useStore();
  if (!project) {
    return (
      <AppShell>
        <div className="min-h-[60vh] grid place-items-center text-center p-8">
          <div className="text-sm text-muted-foreground">Lade dein Projekt…</div>
        </div>
      </AppShell>
    );
  }
  const inProject = properties.filter((p) => p.projectId === project.id && p.status !== "Gekauft");
  const rows = inProject.map((p) => {
    const c = calcProperty(p, assumptions);
    const s = calcScore(p, assumptions, c);
    const dq = calcDataQuality(p);
    return { p, c, s, dq };
  });
  const total = rows.length;
  const avgScore = total ? rows.reduce((a, r) => a + r.s.total, 0) / total : 0;
  const best = rows.slice().sort((a, b) => b.s.total - a.s.total)[0];
  const avgCashflow = total ? rows.reduce((a, r) => a + r.c.cashflowMtl, 0) / total : 0;
  const kritisch = rows.filter((r) => r.s.ampel === "red" || r.c.cashflowMtl < 0).length;
  const today = new Date();
  const offeneFollowups = inProject.filter((p) => p.nextAction && (!p.nextActionDate || new Date(p.nextActionDate) <= new Date(today.getTime() + 7 * 86400000))).length;

  const topScore = rows.slice().sort((a, b) => b.s.total - a.s.total).slice(0, 8);
  const topCashflow = rows.slice().sort((a, b) => b.c.cashflowMtl - a.c.cashflowMtl).slice(0, 8);
  const topRendite = rows.slice().sort((a, b) => b.c.bruttorendite - a.c.bruttorendite).slice(0, 8);
  const incomplete = rows.filter((r) => r.dq.score < 70);
  const followups = inProject.filter((p) => !!p.nextAction);

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
        description={`${project.name} · ${total} ${total === 1 ? "Objekt" : "Objekte"} in Prüfung`}
        actions={
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-95 transition shadow-sm"
          >
            <Sparkles className="size-4" /> Neue Immobilie analysieren
          </Link>
        }
      />

      {/* Top KPIs — nur die wichtigsten 6 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="In Prüfung" value={String(total)} icon={Building} tone="primary" />
        <KpiCard label="Beste Immobilie" value={best ? `${best.s.total}` : "—"} sub={best?.p.title?.slice(0, 28)} icon={TrendingUp} tone="success" />
        <KpiCard label="Ø Score" value={fmtNum(avgScore, 1)} icon={Target} />
        <KpiCard label="Ø Cashflow / Monat" value={fmtEUR(avgCashflow)} icon={Wallet} tone={avgCashflow >= 0 ? "success" : "danger"} />
        <KpiCard label="Kritische Objekte" value={String(kritisch)} icon={AlertTriangle} tone={kritisch > 0 ? "warning" : "default"} />
        <KpiCard label="Offene Follow-ups" value={String(offeneFollowups)} icon={Bell} tone={offeneFollowups > 0 ? "primary" : "default"} />
      </div>

      {/* Strukturierte Bereiche in Tabs */}
      <div className="mt-8">
        <Tabs defaultValue="kandidaten" className="w-full">
          <TabsList className="h-10 p-1 bg-muted/60">
            <TabsTrigger value="kandidaten">Top-Kandidaten</TabsTrigger>
            <TabsTrigger value="risiken">Risiken & Daten</TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            <TabsTrigger value="markt">Markt</TabsTrigger>
          </TabsList>

          <TabsContent value="kandidaten" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-5">
              <RankTable title="Score" rows={topScore} metric={(r) => `${r.s.total}`} onClick={(id) => navigate({ to: "/properties/$id", params: { id } })} />
              <RankTable title="Cashflow / Monat" rows={topCashflow} metric={(r) => fmtEUR(r.c.cashflowMtl)} onClick={(id) => navigate({ to: "/properties/$id", params: { id } })} />
              <RankTable title="Bruttorendite" rows={topRendite} metric={(r) => fmtPct(r.c.bruttorendite)} onClick={(id) => navigate({ to: "/properties/$id", params: { id } })} />
            </div>
          </TabsContent>

          <TabsContent value="risiken" className="mt-6 space-y-5">
            <SectionCard title="Unvollständige Daten" action={<span className="text-xs text-muted-foreground">{incomplete.length} {incomplete.length === 1 ? "Objekt" : "Objekte"}</span>}>
              {incomplete.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Alles vollständig. ✓</div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 font-medium">Objekt</th>
                        <th className="px-2 py-2 font-medium">Bezirk</th>
                        <th className="px-2 py-2 font-medium">DQ</th>
                        <th className="px-2 py-2 font-medium hidden md:table-cell">Fehlend</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomplete.map((r) => (
                        <tr key={r.p.id} className="border-t hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => navigate({ to: "/properties/$id", params: { id: r.p.id } })}>
                          <td className="px-2 py-2.5 font-medium">{r.p.title || "—"}</td>
                          <td className="px-2 py-2.5 text-muted-foreground">{r.p.bezirk || "—"}</td>
                          <td className="px-2 py-2.5"><AmpelBadge ampel={r.dq.ampel}>{r.dq.score}%</AmpelBadge></td>
                          <td className="px-2 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{r.dq.missing.slice(0, 3).join(", ")}{r.dq.missing.length > 3 ? "…" : ""}</td>
                          <td className="px-2 py-2.5 text-right text-primary text-sm">→</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="followups" className="mt-6">
            <SectionCard title="Anstehende Follow-ups">
              {followups.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Keine offenen Follow-ups.</div>
              ) : (
                <div className="space-y-2">
                  {followups.map((p) => (
                    <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.title || "—"}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.nextAction}</div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">{p.nextActionDate ? new Date(p.nextActionDate).toLocaleDateString("de-AT") : "—"}</div>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="markt" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-5">
              <SectionCard title="Score-Verteilung">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={scoreBuckets} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {scoreBuckets.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "var(--destructive)" : i === 1 ? "var(--warning)" : "var(--success)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
              <SectionCard title="Kaufpreis vs. Bruttorendite">
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="x" name="Kaufpreis" tickFormatter={(v) => `${Math.round(v / 1000)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis dataKey="y" name="Bruttorendite %" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: any, n) => (n === "x" ? fmtEUR(v) : `${Number(v).toFixed(2)}%`)} labelFormatter={() => ""} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
                    <Scatter data={scatter}>
                      {scatter.map((d, i) => (
                        <Cell key={i} fill={d.ampel === "green" ? "var(--success)" : d.ampel === "yellow" ? "var(--warning)" : "var(--destructive)"} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function RankTable({ title, rows, metric, onClick }: { title: string; rows: any[]; metric: (r: any) => string; onClick: (id: string) => void }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold text-sm tracking-tight mb-3">{title}</h3>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <button key={r.p.id} onClick={() => onClick(r.p.id)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-left transition-colors">
            <span className="text-xs text-muted-foreground w-5 tabular-nums">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{r.p.title || "—"}</div>
              <div className="text-[11px] text-muted-foreground truncate">{r.p.bezirk || "—"} · {fmtEUR(r.p.kaufpreis)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums">{metric(r)}</div>
              <div className="text-[10px]"><AmpelBadge ampel={r.s.ampel}>{r.s.entscheidung}</AmpelBadge></div>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
          </button>
        ))}
        {rows.length === 0 && (
          <div className="py-6 text-center text-muted-foreground text-sm">Keine Objekte.</div>
        )}
      </div>
    </div>
  );
}
