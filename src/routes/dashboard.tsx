import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct, isValidUrl } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, CHART_STYLE } from "@/components/ChartCard";
import { ChevronRight, FileText, Pencil, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – Immo Invest" },
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
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A8A29E]">{label}</div>
      <div
        className={`mt-1.5 text-[28px] leading-none tabular-nums ${accent ? "text-[#2D6A4F]" : "text-[#1C1917]"}`}
        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800 }}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-[#78716C] truncate">{sub}</div>}
    </div>
  );
}

function CandidateRow({ r, onClick }: { r: any; onClick: () => void }) {
  const score = r.s.total as number;
  const scoreColor = score >= 65 ? "#2D6A4F" : "#78716C";
  const cf = r.c.cashflowMtl as number;
  const cfColor = cf >= 0 ? "#16A34A" : "#DC2626";
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
      <div
        className="w-10 tabular-nums text-[18px] leading-none shrink-0"
        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, color: scoreColor }}
      >
        {score}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-[#1C1917] truncate">{r.p.title || "—"}</div>
        <div className="text-[11px] text-[#A8A29E] truncate">
          {[r.p.bezirk, r.p.kaufpreis ? fmtEUR(r.p.kaufpreis) : null, r.p.quelle].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeClass}`}>
        {r.s.entscheidung}
      </span>
      <div
        className="hidden md:block w-24 text-right tabular-nums text-[14px]"
        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, color: cfColor }}
      >
        {fmtEUR(cf)}
      </div>
      <ChevronRight className="size-4 text-[#A8A29E] group-hover:text-[#2D6A4F] shrink-0" />
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
          <div className="text-sm text-[#78716C]">Lade dein Projekt…</div>
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

  const username = (profile?.name || profile?.email?.split("@")[0] || "willkommen").trim();

  return (
    <AppShell>
      {/* Personalisierte Begrüßung */}
      <div className="flex flex-col gap-1">
        <h1
          className="text-[24px] leading-tight text-[#1C1917]"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, letterSpacing: "-0.03em" }}
        >
          {greeting()}, {username}.
        </h1>
        <p className="text-[13px] text-[#A8A29E]">
          {total} {total === 1 ? "Objekt" : "Objekte"} in Prüfung · {kritisch} kritische {kritisch === 1 ? "Objekt" : "Objekte"}
        </p>
      </div>

      {/* Haupteingabe – Analyse starten */}
      <div className="mt-6">
        <AnalyzeCard />
      </div>

      {/* Top-Kandidaten – eine einheitliche Liste */}
      <div className="mt-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-3">Top-Kandidaten</div>
        <div className="flex flex-col gap-2">
          {topVisible.map((r) => (
            <CandidateRow key={r.p.id} r={r} onClick={() => navigate({ to: "/properties/$id", params: { id: r.p.id } })} />
          ))}
          {topRanked.length > 4 && (
            <Link
              to="/properties"
              className="text-[13px] font-medium text-[#2D6A4F] hover:underline px-1 pt-1"
            >
              + Alle Kandidaten anzeigen
            </Link>
          )}
          <Link
            to="/analyze"
            className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-[1.5px] border-[#D8D3C8] bg-[#F5F3EE] px-4 py-3 text-[13px] text-[#A8A29E] hover:text-[#2D6A4F] hover:border-[#2D6A4F]/40 transition-colors"
          >
            <Plus className="size-4" /> Neue Immobilie analysieren
          </Link>
        </div>
      </div>

      {/* Kompakte Statistik – nur 2 Karten */}
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
        <Tabs defaultValue="kandidaten" className="w-full">
          <TabsList className="h-auto p-0 bg-transparent border-b border-[#EAE6DF] rounded-none w-full justify-start gap-6">
            {[
              { v: "kandidaten", l: "Top-Kandidaten" },
              { v: "risiken", l: "Risiken & Daten" },
              { v: "followups", l: "Follow-ups" },
              { v: "markt", l: "Markt" },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="rounded-none border-0 bg-transparent px-0 py-3 text-[13px] text-[#78716C] data-[state=active]:text-[#1C1917] data-[state=active]:shadow-none relative data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-[2px] data-[state=active]:after:bg-[#2D6A4F]"
              >
                {t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="kandidaten" className="mt-6">
            <div className="flex flex-col gap-2">
              {topRanked.length === 0 && (
                <div className="text-sm text-[#78716C] py-6 text-center">Noch keine Objekte.</div>
              )}
              {topRanked.map((r) => (
                <CandidateRow key={r.p.id} r={r} onClick={() => navigate({ to: "/properties/$id", params: { id: r.p.id } })} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="risiken" className="mt-6">
            <div className="rounded-[10px] border border-[#EAE6DF] bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-[#1C1917]">Unvollständige Daten</h3>
                <span className="text-[11px] text-[#A8A29E]">{incomplete.length} {incomplete.length === 1 ? "Objekt" : "Objekte"}</span>
              </div>
              {incomplete.length === 0 ? (
                <div className="text-sm text-[#78716C] py-4 text-center">Alles vollständig.</div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-[#A8A29E]">
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
                          <td className="px-2 py-2.5 text-[#78716C]">{r.p.bezirk || "—"}</td>
                          <td className="px-2 py-2.5"><AmpelBadge ampel={r.dq.ampel}>{r.dq.score}%</AmpelBadge></td>
                          <td className="px-2 py-2.5 text-xs text-[#78716C] hidden md:table-cell">{r.dq.missing.slice(0, 3).join(", ")}{r.dq.missing.length > 3 ? "…" : ""}</td>
                          <td className="px-2 py-2.5 text-right text-[#2D6A4F]">→</td>
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
                <div className="text-sm text-[#78716C] py-4 text-center">Keine offenen Follow-ups.</div>
              ) : (
                <div className="space-y-2">
                  {followups.map((p) => (
                    <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#EAE6DF] hover:bg-[#FAFAF8]">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1C1917] truncate">{p.title || "—"}</div>
                        <div className="text-xs text-[#78716C] truncate">{p.nextAction}</div>
                      </div>
                      <div className="text-xs text-[#78716C] whitespace-nowrap">{p.nextActionDate ? new Date(p.nextActionDate).toLocaleDateString("de-AT") : "—"}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="markt" className="mt-6">
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
    </AppShell>
  );
}

function AnalyzeCard() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");

  const start = () => {
    const u = url.trim();
    if (!u) {
      navigate({ to: "/analyze" });
      return;
    }
    if (!isValidUrl(u)) {
      toast.error("Bitte eine gültige URL (mit https://) einfügen.");
      return;
    }
    try { localStorage.setItem("pending_analyze_url", u); } catch { /* ignore */ }
    navigate({ to: "/analyze" });
  };

  return (
    <div className="rounded-[14px] border border-[#EAE6DF] bg-white p-6">
      <div className="text-[11px] font-semibold uppercase text-[#2D6A4F]" style={{ letterSpacing: "0.07em" }}>
        Neue Analyse
      </div>
      <h2
        className="mt-2 text-[20px] leading-tight text-[#1C1917]"
        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800 }}
      >
        Immobilie gefunden? Sofort prüfen.
      </h2>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") start(); }}
          placeholder="Immobilienlink einfügen (willhaben, ImmoScout, immowelt …)"
          className="flex-1 rounded-lg border border-[#EAE6DF] bg-white px-4 py-2.5 text-[13px] text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#2D6A4F]/50"
        />
        <button
          onClick={start}
          className="inline-flex items-center justify-center rounded-lg bg-[#2D6A4F] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#235740] transition-colors"
        >
          Analysieren
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-[#A8A29E]">
        <Link to="/analyze" className="inline-flex items-center gap-1.5 hover:text-[#2D6A4F]">
          <FileText className="size-3.5" /> PDF hochladen
        </Link>
        <Link to="/properties/new" className="inline-flex items-center gap-1.5 hover:text-[#2D6A4F]">
          <Pencil className="size-3.5" /> Manuell eingeben
        </Link>
      </div>
    </div>
  );
}
