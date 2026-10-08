import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, CHART_STYLE } from "@/components/ChartCard";
import { CHART_MARGIN, ChartTooltip, GRID_PROPS, X_AXIS_CATEGORY, fmtAxisNumber, fmtEuro } from "@/components/charts/chartKit";
import { CaretRight as ChevronRight, ListNumbers, WarningCircle, CalendarCheck, GridFour, Rows, ArrowDown } from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportTabsCard } from "@/components/ImportTabsCard";
import type { Property } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – kaufma" },
      { name: "description", content: "Übersicht deiner analysierten Kaufkandidaten." },
    ],
  }),
  component: Dashboard,
});

type Row = {
  p: Property;
  c: ReturnType<typeof calcProperty>;
  s: ReturnType<typeof calcScore>;
  dq: ReturnType<typeof calcDataQuality>;
};

/* ───────── Kleine Bausteine ───────── */

/** Ampel → Badge-Farben. Grau = keine Bewertung möglich (Kaufpreis oder Miete fehlt), nicht "schlecht". */
function decisionBadge(ampel: Row["s"]["ampel"]) {
  if (ampel === "green") return "bg-[#E8F5EE] text-primary";
  if (ampel === "yellow") return "bg-[#FEF3C7] text-[#92400E]";
  if (ampel === "gray") return "bg-[#F5F3EE] text-[#78716C]";
  return "bg-[#FEE2E2] text-[#991B1B]";
}
const decisionLabel = (r: Row) => (r.s.ampel === "gray" ? "Ohne Bewertung" : r.s.entscheidung);
const scoreColor = (score: number) => (score >= 65 ? "#2D6A4F" : "var(--ink-2)");
const cashColor = (cf: number) => (cf >= 0 ? "#2D6A4F" : "#B91C1C");
const addressOf = (p: Row["p"]) => [p.adresse, p.bezirk].map((s) => (s ?? "").trim()).filter(Boolean).join(", ");

/** Erster Start: kein leeres Gerüst aus Nullen, sondern erklären, was nach der ersten Analyse hier steht. */
function FirstRunHint() {
  const items = [
    { icon: ListNumbers, title: "Deine Kandidaten, nach Score sortiert", text: "Die besten Objekte stehen oben – mit Ampel, Kaufpreis und monatlichem Cashflow." },
    { icon: WarningCircle, title: "Was noch fehlt", text: "Fehlende Angaben wie Betriebskosten oder Baujahr, die die Bewertung unsicher machen." },
    { icon: CalendarCheck, title: "Deine nächsten Schritte", text: "Besichtigungen und Follow-ups, die du bei den Objekten einträgst." },
  ];
  return (
    <section className="mt-10" aria-labelledby="first-run-title">
      <h2 id="first-run-title" className="text-[13px] font-semibold text-[#1C1917] font-sans tracking-normal">
        Nach deiner ersten Analyse siehst du hier:
      </h2>
      <ul className="mt-3 grid sm:grid-cols-3 gap-x-6 gap-y-4">
        {items.map((it) => (
          <li key={it.title} className="flex gap-3">
            <it.icon className="size-5 shrink-0 text-primary mt-0.5" aria-hidden />
            <div>
              <div className="text-[13px] font-medium text-[#1C1917]">{it.title}</div>
              <p className="text-[13px] text-ink-2 mt-0.5 leading-snug">{it.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] text-ink-2">
        Kein Inserat zur Hand?{" "}
        <Link to="/properties/new" className="text-primary font-medium underline-offset-4 hover:underline">Daten selbst eingeben</Link>
        {" "}oder{" "}
        <Link to="/rechner" className="text-primary font-medium underline-offset-4 hover:underline">mit einem Rechner anfangen</Link>.
      </p>
    </section>
  );
}

/* ───────── Kaufkandidaten: Raster / Liste ───────── */

type ViewMode = "grid" | "list";
const VIEW_KEY = "kaufma_dashboard_view";

/** Ansicht merken (pro Browser). Startwert "grid", gespeicherter Wert erst nach dem Laden – sonst Hydration-Konflikt. */
function useDashboardView(): [ViewMode, (v: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>("grid");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch { /* privater Modus o. Ä. */ }
  }, []);
  const update = (v: ViewMode) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignorieren */ }
  };
  return [view, update];
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const btn = (mode: ViewMode, label: string, Icon: typeof GridFour) => {
    const active = view === mode;
    return (
      <button
        type="button"
        onClick={() => onChange(mode)}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className="grid place-items-center size-8 rounded-[8px] transition-colors hover:bg-[#F5F3EE] focus-visible:outline-2 focus-visible:outline-primary"
        style={{ color: active ? "#2D6A4F" : "#A8A29E" }}
      >
        <Icon size={18} weight={active ? "fill" : "regular"} aria-hidden />
      </button>
    );
  };
  return (
    <div className="flex items-center" role="group" aria-label="Ansicht">
      {btn("grid", "Rasteransicht", GridFour)}
      {btn("list", "Listenansicht", Rows)}
    </div>
  );
}

function CandidateCard({ r, onOpen }: { r: Row; onOpen: () => void }) {
  const score = r.s.total;
  const cf = r.c.cashflowMtl;
  const address = addressOf(r.p);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col text-left rounded-[12px] border border-[#EAE6DF] bg-white p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-display font-extrabold tabular-nums text-[24px] leading-none" style={{ color: scoreColor(score) }}>
          {score}
          <span className="font-sans font-normal text-[12px] text-ink-3"> / 100</span>
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${decisionBadge(r.s.ampel)}`}>{decisionLabel(r)}</span>
      </div>
      <div className="mt-3 text-[14px] font-semibold leading-snug text-[#1C1917] line-clamp-2">{r.p.title || "Ohne Titel"}</div>
      <div className="mt-0.5 text-[12px] text-ink-3 truncate">{address || "Adresse fehlt"}</div>
      <dl className="mt-auto pt-4 grid grid-cols-3 gap-2">
        <div>
          <dt className="text-[12px] text-ink-3">Kaufpreis</dt>
          <dd className="text-[13px] font-semibold tabular-nums text-[#1C1917]">{r.p.kaufpreis ? fmtEUR(r.p.kaufpreis) : "—"}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-3">Rendite</dt>
          <dd className="text-[13px] font-semibold tabular-nums text-[#1C1917]">{fmtPct(r.c.bruttorendite)}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-3">Cashflow</dt>
          <dd className="text-[13px] font-semibold tabular-nums" style={{ color: cashColor(cf) }}>{fmtEUR(cf)}</dd>
        </div>
      </dl>
    </button>
  );
}

/** Kompakte Zeile: ab sm alle Kennzahlen in einer Zeile, darunter als zweite Textzeile – nie horizontal scrollen. */
function CandidateListRow({ r, onOpen }: { r: Row; onOpen: () => void }) {
  const score = r.s.total;
  const cf = r.c.cashflowMtl;
  const address = addressOf(r.p);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group w-full grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_4.5rem_6.5rem_1rem] items-center gap-x-3 px-4 py-3 text-left transition-colors hover:bg-[#FAFAF8] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <span className="font-display font-extrabold tabular-nums text-[18px] leading-none" style={{ color: scoreColor(score) }}>
          {score}
          <span className="sr-only"> von 100 Punkten</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-[#1C1917] truncate">{r.p.title || "Ohne Titel"}</span>
          <span className="block text-[12px] text-ink-3 truncate">{address || "Adresse fehlt"}</span>
          {/* Mobil: Kennzahlen als zweite Zeile */}
          <span className="sm:hidden mt-1 flex flex-wrap gap-x-2 text-[12px] tabular-nums text-ink-2">
            <span>{r.p.kaufpreis ? fmtEUR(r.p.kaufpreis) : "—"}</span>
            <span aria-hidden>·</span>
            <span>{fmtPct(r.c.bruttorendite)}</span>
            <span aria-hidden>·</span>
            <span style={{ color: cashColor(cf) }}>{fmtEUR(cf)}/M</span>
          </span>
        </span>
        <span className="hidden sm:block text-right text-[13px] tabular-nums text-[#1C1917]">{r.p.kaufpreis ? fmtEUR(r.p.kaufpreis) : "—"}</span>
        <span className="hidden sm:block text-right text-[13px] tabular-nums text-[#1C1917]">{fmtPct(r.c.bruttorendite)}</span>
        <span className="hidden sm:block text-right text-[13px] font-semibold tabular-nums" style={{ color: cashColor(cf) }}>{fmtEUR(cf)}</span>
        <ChevronRight className="size-4 text-ink-3 group-hover:text-primary justify-self-end" aria-hidden />
      </button>
    </li>
  );
}

/* ───────── Seite ───────── */

const MAX_CANDIDATES = 6;

function Dashboard() {
  const navigate = useNavigate();
  const project = useActiveProject();
  const assumptions = useActiveAssumptions();
  const { properties } = useStore();
  const [view, setView] = useDashboardView();
  const [detailTab, setDetailTab] = useState("risiken");

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
  const rows: Row[] = inProject.map((p) => {
    const c = calcProperty(p, assumptions);
    const s = calcScore(p, assumptions, c);
    const dq = calcDataQuality(p);
    return { p, c, s, dq };
  });
  const total = rows.length;
  const kritisch = rows.filter((r) => r.s.ampel === "red" || r.c.cashflowMtl < 0).length;
  const bestRendite = rows.slice().sort((a, b) => b.c.bruttorendite - a.c.bruttorendite)[0];
  const interessant = rows.filter((r) => r.s.ampel === "green").length;
  const ohneBewertung = rows.filter((r) => r.s.ampel === "gray").length;

  const topRanked = rows.slice().sort((a, b) => b.s.total - a.s.total);
  const topVisible = topRanked.slice(0, MAX_CANDIDATES);
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

  const isEmpty = total === 0;
  const open = (id: string) => navigate({ to: "/properties/$id", params: { id } });
  const showDetail = (tab: string) => {
    setDetailTab(tab);
    document.getElementById("details")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ───── Erster Start ───── */
  if (isEmpty) {
    return (
      <AppShell>
        <h1 className="heading-page-sm">
          Prüf dein erstes Inserat.
        </h1>
        <p className="mt-2 max-w-[60ch] text-[14px] text-ink-2">
          Link einfügen – in wenigen Sekunden siehst du Rendite, Cashflow und Mietrecht-Risiko.
        </p>
        <div className="mt-6">
          <ImportTabsCard />
        </div>
        <FirstRunHint />
      </AppShell>
    );
  }

  /* ───── Mit Objekten ───── */
  return (
    <AppShell>
      {/* Kopf: die wichtigste Zahl ist die Überschrift selbst */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="heading-page-sm">
            {interessant > 0 ? (
              <>
                <span className="text-primary tabular-nums">{interessant}</span> von {total}{" "}
                {total === 1 ? "Kaufkandidat ist" : "Kaufkandidaten sind"} interessant.
              </>
            ) : (
              <>Noch keiner deiner {total} Kaufkandidaten ist interessant.</>
            )}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-2">Interessant heißt: Score ab 70 von 100.</p>
        </div>
        <a
          href="#neues-inserat"
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#235740]"
        >
          Inserat prüfen <ArrowDown className="size-3.5" aria-hidden />
        </a>
      </header>

      {/* Nebenkennzahlen: eine ruhige Zeile statt gleich gewichteter Karten */}
      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-[13px]">
        <div>
          <dt className="text-ink-3">Beste Bruttorendite</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-[#1C1917]">
            {bestRendite ? fmtPct(bestRendite.c.bruttorendite) : "—"}
            {bestRendite?.p.title && <span className="font-normal text-ink-2"> · {bestRendite.p.title.slice(0, 32)}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">Warnsignale</dt>
          <dd className="mt-0.5 font-semibold tabular-nums" style={{ color: kritisch > 0 ? "#B91C1C" : "#1C1917" }}>
            {kritisch} {kritisch === 1 ? "Objekt" : "Objekte"}
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">Fehlende Daten</dt>
          <dd className="mt-0.5">
            <button type="button" onClick={() => showDetail("risiken")} className="font-semibold tabular-nums text-[#1C1917] underline decoration-[#D4CFC8] underline-offset-4 hover:decoration-primary">
              {incomplete.length} {incomplete.length === 1 ? "Objekt" : "Objekte"}
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">Offene Follow-ups</dt>
          <dd className="mt-0.5">
            <button type="button" onClick={() => showDetail("followups")} className="font-semibold tabular-nums text-[#1C1917] underline decoration-[#D4CFC8] underline-offset-4 hover:decoration-primary">
              {followups.length}
            </button>
          </dd>
        </div>
        {ohneBewertung > 0 && (
          <div>
            <dt className="text-ink-3">Ohne Bewertung</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-[#1C1917]">
              {ohneBewertung} <span className="font-normal text-ink-2">· Kaufpreis oder Miete fehlt</span>
            </dd>
          </div>
        )}
      </dl>

      {/* Kaufkandidaten */}
      <section className="mt-10" aria-labelledby="kandidaten-title">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 id="kandidaten-title" className="text-[15px] font-semibold text-[#1C1917] font-sans tracking-normal">
            Kaufkandidaten <span className="font-normal text-ink-3">nach Score</span>
          </h2>
          <div className="flex items-center gap-3">
            {topRanked.length > topVisible.length && (
              <Link to="/properties" className="text-[13px] font-medium text-primary underline-offset-4 hover:underline">
                Alle {topRanked.length}
              </Link>
            )}
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {topVisible.map((r) => (
              <CandidateCard key={r.p.id} r={r} onOpen={() => open(r.p.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-[12px] border border-[#EAE6DF] bg-white">
            <div className="hidden sm:grid grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_4.5rem_6.5rem_1rem] gap-x-3 px-4 py-2 border-b border-[#EAE6DF] text-[12px] text-ink-3">
              <span>Score</span>
              <span>Objekt</span>
              <span className="text-right">Kaufpreis</span>
              <span className="text-right">Rendite</span>
              <span className="text-right">Cashflow/M</span>
              <span />
            </div>
            <ul className="divide-y divide-[#EAE6DF]">
              {topVisible.map((r) => (
                <CandidateListRow key={r.p.id} r={r} onOpen={() => open(r.p.id)} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Neues Inserat – das Formular trägt seine eigene Karte, kein zweiter Rahmen */}
      <section id="neues-inserat" className="mt-10 scroll-mt-6" aria-labelledby="neues-inserat-title">
        <h2 id="neues-inserat-title" className="mb-3 text-[15px] font-semibold text-[#1C1917] font-sans tracking-normal">
          Neues Inserat prüfen
        </h2>
        <ImportTabsCard />
      </section>

      {/* Details */}
      <section id="details" className="mt-10 scroll-mt-6" aria-label="Details">
        <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
          {/* overflow-y-hidden: die 1px-Unterstreichung des aktiven Tabs erzeugt sonst eine senkrechte Mini-Scrollleiste */}
          <TabsList className="h-auto p-0 bg-transparent border-b border-[#EAE6DF] rounded-none w-full justify-start gap-6 overflow-x-auto overflow-y-hidden">
            {[
              { v: "risiken", l: "Fehlende Daten", n: incomplete.length },
              { v: "followups", l: "Follow-ups", n: followups.length },
              { v: "bewertungen", l: "Bewertungen" },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="rounded-none border-0 bg-transparent px-0 py-3 text-[13px] text-ink-2 whitespace-nowrap data-[state=active]:text-[#1C1917] data-[state=active]:shadow-none relative data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary"
              >
                {t.l}
                {t.n ? <span className="ml-1.5 rounded-full bg-[#F5F3EE] px-1.5 text-[11px] tabular-nums text-ink-2">{t.n}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="risiken" className="mt-4">
            {incomplete.length === 0 ? (
              <p className="py-2 text-[13px] text-ink-2">
                Bei allen Objekten sind die wichtigsten Angaben da – die Scores beruhen auf vollständigen Daten.
              </p>
            ) : (
              <div className="rounded-[12px] border border-[#EAE6DF] bg-white">
                <table className="w-full text-[13px]">
                  <thead className="text-left text-[12px] text-ink-3">
                    <tr>
                      <th className="px-4 py-2 font-normal">Objekt</th>
                      <th className="px-2 py-2 font-normal hidden sm:table-cell">Bezirk</th>
                      <th className="px-2 py-2 font-normal">Daten</th>
                      <th className="px-2 py-2 font-normal hidden md:table-cell">Es fehlen</th>
                      <th className="px-4 py-2"><span className="sr-only">Öffnen</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomplete.map((r) => (
                      <tr key={r.p.id} className="border-t border-[#EAE6DF] hover:bg-[#FAFAF8] cursor-pointer" onClick={() => open(r.p.id)}>
                        <td className="px-4 py-2.5 font-medium text-[#1C1917] max-w-[16rem] truncate">{r.p.title || "Ohne Titel"}</td>
                        <td className="px-2 py-2.5 text-ink-2 hidden sm:table-cell">{r.p.bezirk || "—"}</td>
                        <td className="px-2 py-2.5"><AmpelBadge ampel={r.dq.ampel}>{r.dq.score}%</AmpelBadge></td>
                        <td className="px-2 py-2.5 text-[12px] text-ink-2 hidden md:table-cell">{r.dq.missing.slice(0, 3).join(", ")}{r.dq.missing.length > 3 ? "…" : ""}</td>
                        <td className="px-4 py-2.5 text-right text-primary"><ChevronRight className="size-4 inline" aria-hidden /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="followups" className="mt-4">
            {followups.length === 0 ? (
              <p className="py-2 text-[13px] text-ink-2">
                Keine Follow-ups geplant. Im CRM-Tab einer Immobilie legst du die nächste Aktion fest – Anruf, Besichtigung oder Unterlagen.
              </p>
            ) : (
              <ul className="rounded-[12px] border border-[#EAE6DF] bg-white divide-y divide-[#EAE6DF]">
                {followups.map((p) => (
                  <li key={p.id}>
                    <Link to="/properties/$id" params={{ id: p.id }} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#FAFAF8]">
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-[#1C1917] truncate">{p.title || "Ohne Titel"}</span>
                        <span className="block text-[12px] text-ink-2 truncate">{p.nextAction}</span>
                      </span>
                      <span className="text-[12px] tabular-nums text-ink-2 whitespace-nowrap">{p.nextActionDate ? new Date(p.nextActionDate).toLocaleDateString("de-AT") : "ohne Datum"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="bewertungen" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <ChartCard title="Score-Verteilung">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreBuckets} margin={CHART_MARGIN}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="name" {...X_AXIS_CATEGORY} />
                    <YAxis tick={{ fontSize: 11, fill: "#736C67" }} allowDecimals={false} tickLine={false} axisLine={false} width={40}
                      label={{ value: "Objekte", position: "top", offset: 10, fontSize: 11, fill: "#736C67" }} />
                    <Tooltip
                      content={<ChartTooltip labelFormatter={(l) => `Score ${l}`} valueFormatter={(v) => `${v} ${Number(v) === 1 ? "Objekt" : "Objekte"}`} />}
                      cursor={{ fill: "#FAFAF8" }}
                    />
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
                  <ScatterChart margin={{ ...CHART_MARGIN, bottom: 4 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis type="number" dataKey="x" name="Kaufpreis" tickFormatter={fmtAxisNumber} tick={{ fontSize: 11, fill: "#736C67" }} tickLine={false} axisLine={false} tickCount={4} />
                    <YAxis type="number" dataKey="y" name="Bruttorendite" tick={{ fontSize: 11, fill: "#736C67" }} tickLine={false} axisLine={false} width={40}
                      label={{ value: "%", position: "top", offset: 10, fontSize: 11, fill: "#736C67" }} />
                    <Tooltip
                      content={<ChartTooltip labelFormatter={() => ""} valueFormatter={(v, e) => (e.name === "Kaufpreis" ? fmtEuro(Number(v)) : `${Number(v).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`)} />}
                      cursor={{ stroke: "#EAE6DF" }}
                    />
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
      </section>
    </AppShell>
  );
}
