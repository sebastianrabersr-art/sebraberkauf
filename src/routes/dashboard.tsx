import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { calcProperty, calcScore, fmtEUR, fmtPct } from "@/lib/calc";
import { CaretRight as ChevronRight, GridFour, Rows, ArrowRight } from "@phosphor-icons/react";
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

/** Die eine Hauptaktion der Seite: ein Inserat prüfen (Import liegt unter /analyze). */
function PrimaryAction() {
  return (
    <Link
      to="/analyze"
      className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#235740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      Inserat prüfen <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

/** Begrüßung: leise, eine Zeile – die Zahlen darunter tragen die Seite. */
function Greeting() {
  const { profile } = useAuth();
  const first = ((profile as { first_name?: string | null } | null)?.first_name ?? profile?.name ?? "").trim().split(/\s+/)[0];
  return (
    <h1 className="font-sans text-[16px] font-normal tracking-normal text-[#78716C]">
      {first ? `Hallo ${first}.` : "Willkommen zurück."}
    </h1>
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
        className="grid place-items-center size-8 rounded-[8px] transition-colors hover:bg-[#EAE6DF] focus-visible:outline-2 focus-visible:outline-primary"
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
      className="group flex flex-col text-left rounded-[12px] border border-[#EAE6DF] bg-white p-5 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-display font-extrabold tabular-nums text-[24px] leading-none" style={{ color: scoreColor(score) }}>
          {score}
          <span className="font-sans font-normal text-[12px] text-ink-3"> / 100</span>
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${decisionBadge(r.s.ampel)}`}>{decisionLabel(r)}</span>
      </div>
      <div className="mt-4 text-[14px] font-semibold leading-snug text-[#1C1917] line-clamp-2">{r.p.title || "Ohne Titel"}</div>
      <div className="mt-0.5 text-[12px] text-ink-3 truncate">{address || "Adresse fehlt"}</div>
      <dl className="mt-auto pt-5 grid grid-cols-3 gap-2">
        <div>
          <dt className="text-[12px] text-ink-3">Kaufpreis</dt>
          <dd className="text-[13px] font-semibold tabular-nums text-[#1C1917]">{r.p.kaufpreis ? fmtEUR(r.p.kaufpreis) : "–"}</dd>
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
        className="group w-full grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_4.5rem_6.5rem_1rem] items-center gap-x-3 px-4 py-3.5 text-left transition-colors hover:bg-[#FAFAF8] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
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
            <span>{r.p.kaufpreis ? fmtEUR(r.p.kaufpreis) : "–"}</span>
            <span aria-hidden>·</span>
            <span>{fmtPct(r.c.bruttorendite)}</span>
            <span aria-hidden>·</span>
            <span style={{ color: cashColor(cf) }}>{fmtEUR(cf)}/Mt</span>
          </span>
        </span>
        <span className="hidden sm:block text-right text-[13px] tabular-nums text-[#1C1917]">{r.p.kaufpreis ? fmtEUR(r.p.kaufpreis) : "–"}</span>
        <span className="hidden sm:block text-right text-[13px] tabular-nums text-[#1C1917]">{fmtPct(r.c.bruttorendite)}</span>
        <span className="hidden sm:block text-right text-[13px] font-semibold tabular-nums" style={{ color: cashColor(cf) }}>{fmtEUR(cf)}</span>
        <ChevronRight className="size-4 text-ink-3 group-hover:text-primary justify-self-end" aria-hidden />
      </button>
    </li>
  );
}

/** Kennzahl: große Zahl, kleines Label – keine Karte, kein Icon, nur Weißraum. */
function Metric({ value, label, tone }: { value: React.ReactNode; label: string; tone?: "bad" }) {
  return (
    // dt vor dd im DOM (Semantik), optisch steht die Zahl oben
    <div className="flex flex-col-reverse">
      <dt className="mt-2 text-[13px] text-ink-2">{label}</dt>
      <dd
        className="font-display font-extrabold tabular-nums text-[36px] leading-none tracking-[-0.03em]"
        style={{ color: tone === "bad" ? "#B91C1C" : "#1C1917" }}
      >
        {value}
      </dd>
    </div>
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
    return { p, c, s };
  });
  const total = rows.length;
  const kritisch = rows.filter((r) => r.s.ampel === "red" || r.c.cashflowMtl < 0).length;
  const bestRendite = rows.slice().sort((a, b) => b.c.bruttorendite - a.c.bruttorendite)[0];
  const interessant = rows.filter((r) => r.s.ampel === "green").length;

  const topRanked = rows.slice().sort((a, b) => b.s.total - a.s.total);
  const topVisible = topRanked.slice(0, MAX_CANDIDATES);
  const followups = inProject.filter((p) => !!p.nextAction);

  const open = (id: string) => navigate({ to: "/properties/$id", params: { id } });

  /* ───── Erster Start: eine Botschaft, ein Button ───── */
  if (total === 0) {
    return (
      <AppShell>
        <Greeting />
        <section className="mt-16 sm:mt-24 max-w-md" aria-labelledby="first-run-title">
          <h2 id="first-run-title" className="heading-page-sm">Prüf dein erstes Inserat.</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Link einfügen und in wenigen Sekunden Rendite, Cashflow und Mietrecht-Risiko sehen.
          </p>
          <div className="mt-8">
            <PrimaryAction />
          </div>
        </section>
      </AppShell>
    );
  }

  /* ───── Mit Objekten ───── */
  return (
    <AppShell>
      <div className="space-y-12 sm:space-y-16">
        {/* Kopf: leise Begrüßung, die eine Hauptaktion */}
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <Greeting />
          <PrimaryAction />
        </header>

        {/* Drei Kennzahlen, nur Weißraum */}
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-8 max-w-4xl">
          <Metric
            value={<>{interessant}<span className="text-[20px] font-sans font-normal text-ink-3 tracking-normal"> von {total}</span></>}
            label="interessant (Score ab 70)"
          />
          <Metric
            value={bestRendite ? fmtPct(bestRendite.c.bruttorendite) : "–"}
            label={bestRendite?.p.title ? `beste Bruttorendite · ${bestRendite.p.title.slice(0, 28)}` : "beste Bruttorendite"}
          />
          <Metric
            value={kritisch}
            label={kritisch === 1 ? "Objekt mit Warnsignal" : "Objekte mit Warnsignal"}
            tone={kritisch > 0 ? "bad" : undefined}
          />
        </dl>

        {/* Kaufkandidaten */}
        <section aria-labelledby="kandidaten-title">
          <div className="flex items-center justify-between gap-3 mb-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                <span className="text-right">Cashflow/Mt</span>
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

        {/* Nächste Schritte – nur wenn es welche gibt */}
        {followups.length > 0 && (
          <section aria-labelledby="followups-title" className="max-w-3xl">
            <h2 id="followups-title" className="mb-4 text-[15px] font-semibold text-[#1C1917] font-sans tracking-normal">
              Nächste Schritte
            </h2>
            <ul className="divide-y divide-[#EAE6DF] border-y border-[#EAE6DF]">
              {followups.map((p) => (
                <li key={p.id}>
                  <Link to="/properties/$id" params={{ id: p.id }} className="flex items-center justify-between gap-4 py-3.5 hover:bg-[#FAFAF8] -mx-2 px-2 rounded-[8px]">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-[#1C1917] truncate">{p.title || "Ohne Titel"}</span>
                      <span className="block text-[12px] text-ink-2 truncate">{p.nextAction}</span>
                    </span>
                    <span className="text-[12px] tabular-nums text-ink-2 whitespace-nowrap">
                      {p.nextActionDate ? new Date(p.nextActionDate).toLocaleDateString("de-AT") : "ohne Datum"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
