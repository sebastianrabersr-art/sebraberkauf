import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, CHART_STYLE } from "@/components/ChartCard";
import { CaretRight as ChevronRight, ListNumbers, WarningCircle, CalendarCheck } from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportTabsCard } from "@/components/ImportTabsCard";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – kaufma" },
      { name: "description", content: "Übersicht deiner analysierten Kaufkandidaten." },
    ],
  }),
  component: Dashboard,
});

// Begrüßung passend zur Tageszeit
function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-[10px] border border-[#EAE6DF] bg-white px-4 py-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={`mt-1.5 font-display text-[28px] font-extrabold leading-none tabular-nums ${accent ? "text-[#2D6A4F]" : "text-[#1C1917]"}`}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12px] text-ink-2 truncate">{sub}</div>}
    </div>
  );
}

/** Erster Start: kein leeres Gerüst aus Nullen, sondern erklären, was nach der ersten Analyse hier steht. */
function FirstRunHint() {
  const items = [
    { icon: ListNumbers, title: "Deine Kandidaten, nach Score sortiert", text: "Die besten Objekte stehen oben – mit Ampel, Kaufpreis und monatlichem Cashflow." },
    { icon: WarningCircle, title: "Was noch fehlt", text: "Fehlende Angaben wie Betriebskosten oder Baujahr, die die Bewertung unsicher machen." },
    { icon: CalendarCheck, title: "Deine nächsten Schritte", text: "Besichtigungen und Follow-ups, die du bei den Objekten einträgst." },
  ];
  return (
    <section className="mt-8" aria-labelledby="first-run-title">
      <h2 id="first-run-title" className="text-[13px] font-semibold text-[#1C1917] font-sans tracking-normal">
        Nach deiner ersten Analyse siehst du hier:
      </h2>
      <ul className="mt-3 grid sm:grid-cols-3 gap-x-6 gap-y-4">
        {items.map((it) => (
          <li key={it.title} className="flex gap-3">
            <it.icon className="size-5 shrink-0 text-[#2D6A4F] mt-0.5" aria-hidden />
            <div>
              <div className="text-[13px] font-medium text-[#1C1917]">{it.title}</div>
              <p className="text-[13px] text-ink-2 mt-0.5 leading-snug">{it.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] text-ink-2">
        Kein Inserat zur Hand?{" "}
        <Link to="/properties/new" className="text-[#2D6A4F] font-medium underline-offset-4 hover:underline">Daten selbst eingeben</Link>
        {" "}oder{" "}
        <Link to="/rechner" className="text-[#2D6A4F] font-medium underline-offset-4 hover:underline">mit einem Rechner anfangen</Link>.
      </p>
    </section>
  );
}

function CandidateRow({ r, onClick }: { r: any; onClick: () => void }) {
  const score = r.s.total as number;
  const scoreColor = score >= 65 ? "#2D6A4F" : "var(--ink-2)";
  const cf = r.c.cashflowMtl as number;
  const cfColor = cf >= 0 ? "#2D6A4F" : "#B91C1C";
  const badgeClass =
    r.s.ampel === "green"
      ? "bg-[#E8F5EE] text-[#2D6A4F]"
      : r.s.ampel === "yellow"
      ? "bg-[#FEF3C7] text-[#92400E]"
      : "bg-[#FEE2E2] text-[#991B1B]";
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-4 rounded-[10px] border border-[#EAE6DF] bg-white px-4 py-3 hover:bg-[#FAFAF8] transition-colors text-left"
    >
      <div className="w-10 font-display font-extrabold tabular-nums text-[18px] leading-none shrink-0" style={{ color: scoreColor }}>
        {score}
        <span className="sr-only"> von 100 Punkten</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-[#1C1917] truncate">{r.p.title || "—"}</div>
        <div className="text-[11px] text-ink-3 truncate">
          {[r.p.bezirk, r.p.kaufpreis ? fmtEUR(r.p.kaufpreis) : null, r.p.quelle].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeClass}`}>
        {r.s.entscheidung}
      </span>
      <div className="hidden md:block w-28 text-right font-display font-bold tabular-nums text-[14px]" style={{ color: cfColor }}>
        {fmtEUR(cf)}
        <span className="block font-sans font-normal text-[11px] text-ink-3">pro Monat</span>
      </div>
      <ChevronRight className="size-4 text-ink-3 group-hover:text-[#2D6A4F] shrink-0" />
    </button>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const project = useActiveProject();
  const assumptions = useActiveAssumptions();
  const { properties } = useStore();
  const { profile } = useAuth();

  if (!project) {
    return (
      <AppShell>
        <div className="min-h-[60vh] grid place-items-center text-center p-8">
          <div className="text-sm text-ink-2">Lade dein Projekt…</div>
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
  const kritisch = rows.filter((r) => r.s.ampel === "red" || r.c.cashflowMtl < 0).length;
  const best = rows.slice().sort((a, b) => b.s.total - a.s.total)[0];
  const bestRendite = rows.slice().sort((a, b) => b.c.bruttorendite - a.c.bruttorendite)[0];

  const topRanked = rows.slice().sort((a, b) => b.s.total - a.s.total);
  const topVisible = topRanked.slice(0, 4);
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

  // Vorname bevorzugt; ohne Namen kein künstliches "willkommen" als Anrede.
  const firstName = ((profile as any)?.first_name || profile?.name || "").trim().split(/\s+/)[0];
  const isEmpty = total === 0;

  return (
    <AppShell>
      <div className="flex flex-col gap-1">
        <h1 className="heading-page-sm">
          {greeting()}{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="text-[13px] text-ink-2">
          {isEmpty
            ? "Füg den Link zu einem Inserat ein – in wenigen Sekunden siehst du Rendite, Cashflow und Mietrecht-Risiko."
            : <>
                {total} {total === 1 ? "Objekt" : "Objekte"} in Prüfung
                {kritisch > 0 && <> · davon {kritisch} {kritisch === 1 ? "mit Warnsignal" : "mit Warnsignalen"}</>}
              </>}
        </p>
      </div>

      {/* Haupteingabe – Analyse starten */}
      <div className="mt-6 rounded-[12px] border border-[#EAE6DF] bg-white px-5 py-5 sm:px-6">
        <h2 className="mb-4 font-display text-[20px] font-extrabold leading-tight text-[#1C1917]">
          Immobilie gefunden? Sofort prüfen.
        </h2>
        <ImportTabsCard />
      </div>

      {isEmpty ? (
        <FirstRunHint />
      ) : (
      <>
      {/* Top-Kandidaten */}
      <section className="mt-8" aria-labelledby="top-title">
        <div className="flex items-baseline justify-between mb-3">
          <h2 id="top-title" className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 font-sans">Top-Kandidaten</h2>
          {topRanked.length > topVisible.length && (
            <Link to="/properties" className="text-[13px] font-medium text-[#2D6A4F] underline-offset-4 hover:underline">
              Alle {topRanked.length} anzeigen
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {topVisible.map((r) => (
            <CandidateRow key={r.p.id} r={r} onClick={() => navigate({ to: "/properties/$id", params: { id: r.p.id } })} />
          ))}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Objekte in Prüfung"
          value={String(total)}
          sub={best ? `Beste: ${best.p.title?.slice(0, 32) || "—"}` : "Noch keine Objekte"}
        />
        <StatCard
          label="Beste Rendite"
          value={bestRendite ? fmtPct(bestRendite.c.bruttorendite) : "—"}
          sub={bestRendite?.p.title?.slice(0, 40)}
          accent
        />
      </div>

      {/* Detail-Tabs */}
      <div className="mt-6">
        <Tabs defaultValue="risiken" className="w-full">
          <TabsList className="h-auto p-0 bg-transparent border-b border-[#EAE6DF] rounded-none w-full justify-start gap-6 overflow-x-auto">
            {[
              { v: "risiken", l: "Fehlende Daten", n: incomplete.length },
              { v: "followups", l: "Follow-ups", n: followups.length },
              { v: "bewertungen", l: "Bewertungen" },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="rounded-none border-0 bg-transparent px-0 py-3 text-[13px] text-ink-2 whitespace-nowrap data-[state=active]:text-[#1C1917] data-[state=active]:shadow-none relative data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-[2px] data-[state=active]:after:bg-[#2D6A4F]"
              >
                {t.l}
                {t.n ? <span className="ml-1.5 rounded-full bg-[#F5F3EE] px-1.5 text-[11px] tabular-nums text-ink-2">{t.n}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="risiken" className="mt-6">
            <div className="rounded-[10px] border border-[#EAE6DF] bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-[#1C1917]">Unvollständige Daten</h3>
                <span className="text-[11px] text-ink-3">{incomplete.length} {incomplete.length === 1 ? "Objekt" : "Objekte"}</span>
              </div>
              {incomplete.length === 0 ? (
                <div className="text-sm text-ink-2 py-4 text-center">Alles vollständig.</div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-ink-3">
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
                        <tr key={r.p.id} className="border-t border-[#EAE6DF] hover:bg-[#FAFAF8] cursor-pointer" onClick={() => navigate({ to: "/properties/$id", params: { id: r.p.id } })}>
                          <td className="px-2 py-2.5 font-medium text-[#1C1917]">{r.p.title || "—"}</td>
                          <td className="px-2 py-2.5 text-ink-2">{r.p.bezirk || "—"}</td>
                          <td className="px-2 py-2.5"><AmpelBadge ampel={r.dq.ampel}>{r.dq.score}%</AmpelBadge></td>
                          <td className="px-2 py-2.5 text-xs text-ink-2 hidden md:table-cell">{r.dq.missing.slice(0, 3).join(", ")}{r.dq.missing.length > 3 ? "…" : ""}</td>
                          <td className="px-2 py-2.5 text-right text-[#2D6A4F]"><ChevronRight className="size-4 inline" aria-hidden /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="followups" className="mt-6">
            <div className="rounded-[10px] border border-[#EAE6DF] bg-white p-5">
              <h3 className="text-[13px] font-semibold text-[#1C1917] mb-3">Anstehende Follow-ups</h3>
              {followups.length === 0 ? (
                <div className="text-sm text-ink-2 py-4 text-center">Keine offenen Follow-ups.</div>
              ) : (
                <div className="space-y-2">
                  {followups.map((p) => (
                    <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#EAE6DF] hover:bg-[#FAFAF8]">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1C1917] truncate">{p.title || "—"}</div>
                        <div className="text-xs text-ink-2 truncate">{p.nextAction}</div>
                      </div>
                      <div className="text-xs text-ink-2 whitespace-nowrap">{p.nextActionDate ? new Date(p.nextActionDate).toLocaleDateString("de-AT") : "—"}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bewertungen" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-4">
              <ChartCard title="Score-Verteilung">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreBuckets} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <CartesianGrid {...CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="name" tick={CHART_STYLE.axisTick} tickLine={false} axisLine={CHART_STYLE.axisLine} />
                    <YAxis tick={CHART_STYLE.axisTick} allowDecimals={false} tickLine={false} axisLine={CHART_STYLE.axisLine} />
                    <Tooltip cursor={{ fill: "#FAFAF8" }} contentStyle={CHART_STYLE.tooltipContent} />
                    <Bar dataKey="count" radius={CHART_STYLE.bar.radius}>
                      {scoreBuckets.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? CHART_STYLE.colors.negative : i === 1 ? "#D97706" : CHART_STYLE.colors.positive} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Kaufpreis vs. Bruttorendite">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid {...CHART_STYLE.grid} />
                    <XAxis dataKey="x" name="Kaufpreis" tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={CHART_STYLE.axisTick} tickLine={false} axisLine={CHART_STYLE.axisLine} />
                    <YAxis dataKey="y" name="Bruttorendite %" tick={CHART_STYLE.axisTick} tickLine={false} axisLine={CHART_STYLE.axisLine} />
                    <Tooltip formatter={(v: any, n) => (n === "x" ? fmtEUR(v) : `${Number(v).toFixed(2)}%`)} labelFormatter={() => ""} contentStyle={CHART_STYLE.tooltipContent} />
                    <Scatter data={scatter}>
                      {scatter.map((d, i) => (
                        <Cell key={i} fill={d.ampel === "green" ? CHART_STYLE.colors.positive : d.ampel === "yellow" ? "#D97706" : CHART_STYLE.colors.negative} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </>
      )}
    </AppShell>
  );
}
