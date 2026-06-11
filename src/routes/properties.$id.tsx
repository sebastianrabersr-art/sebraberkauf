import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveAssumptions, useStore, VIEWING_CHECKLIST } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct, googleMapsUrl, inferMietrecht, isValidUrl, scoreBreakdown } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { CrmPanel } from "@/components/CrmPanel";
import { PdfUploader } from "@/components/PdfUploader";
import { FinancePanel } from "@/components/FinancePanel";
import { MietrechtRiskCard } from "@/components/MietrechtRiskCard";
import { OpenQuestionsPanel } from "@/components/OpenQuestionsPanel";
import { AdvancedInvestmentPanel } from "@/components/AdvancedInvestmentPanel";
import { InvestorChartsPanel } from "@/components/InvestorChartsPanel";
import { ProjectionTable } from "@/components/ProjectionTable";
import { ScoreInfo } from "@/components/ScoreInfo";
import { PaymentsPanel } from "@/components/PaymentsPanel";
import { PurchaseInfoPanel } from "@/components/PurchaseInfoPanel";
import { PurchaseCostsDetails } from "@/components/PurchaseCostsDetails";
import { ALL_BEWERTUNGEN, ALL_MIETRECHTE, ALL_PROZESS_STATUSES, ALL_STATUSES, PROPERTY_TYPES, migrateLegacyStatus, type Bewertung, type Mietrecht, type ProzessStatus, type Property, type PropertyStatus, type PropertyType } from "@/lib/types";
import { countryOf, regionDefaultsForProperty, regionsOf } from "@/lib/regions";
import { AlertTriangle, ArrowLeft, ChevronRight, Copy, ExternalLink, MapPin, Pencil, Trash2, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/properties/$id")({
  head: () => ({ meta: [{ title: `Objekt – Immo Invest` }] }),
  component: Detail,
  notFoundComponent: () => (<AppShell><div className="p-8">Objekt nicht gefunden.</div></AppShell>),
});

const STATUSES: PropertyStatus[] = ALL_STATUSES;
const MIETRECHTE: Mietrecht[] = ALL_MIETRECHTE;
const bricolage = { fontFamily: "'Bricolage Grotesque', sans-serif" } as const;

type TabKey = "uebersicht" | "finanzierung" | "mietrecht" | "analysen" | "besichtigung" | "crm";
const TABS: { key: TabKey; label: string }[] = [
  { key: "uebersicht", label: "Übersicht" },
  { key: "finanzierung", label: "Finanzierung" },
  { key: "mietrecht", label: "Mietrecht" },
  { key: "analysen", label: "Analysen" },
  { key: "besichtigung", label: "Besichtigung" },
  { key: "crm", label: "CRM" },
];

function Detail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { properties, projects, updateProperty, deleteProperty, duplicateProperty, viewings, setViewing } = useStore();
  const assumptions = useActiveAssumptions();
  const p = properties.find((x) => x.id === id);
  if (!p) throw notFound();

  const c = calcProperty(p, assumptions);
  const s = calcScore(p, assumptions, c);
  const dq = calcDataQuality(p);
  const project = projects.find((x) => x.id === p.projectId);
  const u = (patch: Partial<Property>) => updateProperty(p.id, patch);

  const linkValid = isValidUrl(p.link);
  const mapsUrl = googleMapsUrl(p);
  const mietrecht = inferMietrecht(p);
  const country = countryOf(p.land);
  const regions = country ? regionsOf(country) : [];
  const cats = scoreBreakdown(p, assumptions, c, s);

  const [tab, setTab] = useState<TabKey>("uebersicht");

  const applyRegionDefaults = () => {
    const d = regionDefaultsForProperty(p);
    if (!d) { toast.error("Bitte zuerst Land und Bundesland auswählen."); return; }
    u({
      grunderwerbsteuer: d.grunderwerbsteuer,
      grundbuchkosten: d.grundbuchkosten,
      vertragskosten: d.vertragskosten,
      provisionPct: d.provisionPct,
      maklerprovisionUstPct: d.maklerprovisionUstPct,
      provisionLastEdit: "pct",
      provisionEUR: null,
      provisionBruttoEUR: null,
    });
    toast.success(`Standardwerte für ${d.region.name} übernommen`);
  };

  const suppressLeaveWarnRef = useRef(false);
  const onDelete = () => {
    if (confirm("Diese Immobilie wirklich löschen?")) {
      suppressLeaveWarnRef.current = true;
      deleteProperty(p.id);
      toast.success("Gelöscht.");
      navigate({ to: "/properties" });
    }
  };
  const onDuplicate = () => {
    const newId = duplicateProperty(p.id);
    if (newId) { toast.success("Dupliziert."); navigate({ to: "/properties/$id", params: { id: newId } }); }
  };

  // Leave-warning: fire toast on unmount if required fields are missing
  const dqRef = useRef(dq);
  useEffect(() => { dqRef.current = dq; }, [dq]);
  useEffect(() => {
    const pid = p.id;
    return () => {
      if (suppressLeaveWarnRef.current) return;
      const d = dqRef.current;
      if (d.score < 70 && d.missing.length > 0) {
        const more = d.missing.length > 3 ? ` und ${d.missing.length - 3} weitere` : "";
        toast.warning("Einige Pflichtfelder fehlen noch", {
          description: `Fehlend: ${d.missing.slice(0, 3).join(", ")}${more}`,
          duration: 5000,
          action: {
            label: "Zurück",
            onClick: () => navigate({ to: "/properties/$id", params: { id: pid } }),
          },
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Navigate to a tab and optionally scroll to a section id
  const navTo = (target: TabKey, sectionId?: string) => {
    setTab(target);
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId) as HTMLDetailsElement | null;
        if (el) {
          if (el.tagName === "DETAILS") el.open = true;
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
    } else {
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
    }
  };

  // Negative margins to break out of AppShell padding (p-6 md:p-10)
  const breakout = "-mx-6 md:-mx-10";



  return (
    <AppShell>
      {/* ============ HEADER BAR ============ */}
      <div className={`${breakout} -mt-6 md:-mt-10 bg-white border-b border-[#EAE6DF] px-6 md:px-10 py-4`}>
        <Link to="/properties" className="inline-flex items-center gap-1 text-[13px] text-[#2D6A4F] hover:text-[#235740] mb-2">
          <ArrowLeft className="size-3.5" /> Zurück
        </Link>
        <h1
          className="text-[20px] leading-tight text-[#1C1917] max-w-3xl"
          style={{ ...bricolage, fontWeight: 800, letterSpacing: "-0.03em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {p.title || "Objekt ohne Titel"}
        </h1>
        <div className="mt-1.5 text-[12px] text-[#A8A29E]">
          {[p.bezirk, p.platform, project?.name, `hinzugefügt ${new Date(p.createdAt).toLocaleDateString("de-AT")}`].filter(Boolean).join(" · ")}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-[#E8F5EE] text-[#2D6A4F] px-3 py-1 text-[12px] font-medium">
            Score {s.total} · {s.entscheidung}
          </span>
          <ScoreInfo />
          <span className="inline-flex items-center rounded-full bg-[#E0F2FE] text-[#075985] px-3 py-1 text-[12px] font-medium">
            DQ {dq.score}% · {dq.level}
          </span>
          {linkValid && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-[#78716C] hover:text-[#2D6A4F] px-2 py-1">
              <ExternalLink className="size-3.5" /> Inserat öffnen
            </a>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-[#78716C] hover:text-[#2D6A4F] px-2 py-1">
              <MapPin className="size-3.5" /> Maps
            </a>
          )}
          <button onClick={onDuplicate} className="inline-flex items-center gap-1 text-[12px] text-[#78716C] hover:text-[#2D6A4F] px-2 py-1">
            <Copy className="size-3.5" /> Duplizieren
          </button>
          <button onClick={onDelete} className="inline-flex items-center gap-1 text-[12px] text-[#78716C] hover:text-[#DC2626] px-2 py-1">
            <Trash2 className="size-3.5" /> Löschen
          </button>
        </div>

        {/* ============ TAB NAV ============ */}
        <div className="mt-4 -mb-4 flex items-center gap-6 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative pb-3 text-[13px] whitespace-nowrap transition-colors ${active ? "text-[#1C1917] font-medium" : "text-[#78716C] hover:text-[#1C1917]"}`}
              >
                {t.label}
                {active && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#2D6A4F]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ TWO COLUMN LAYOUT ============ */}
      <div className={`${breakout} flex items-start`}>
        <div className="flex-1 min-w-0 px-6 md:px-10 py-6 space-y-6">
          {tab === "uebersicht" && (
            <>
              <DataCheckBanner propertyId={p.id} dqScore={dq.score} onCheck={() => navTo("analysen")} />
              <SetupWalkthrough propertyId={p.id} navTo={navTo} />
            </>
          )}
          {tab === "uebersicht" && (
            <OverviewTab
              p={p} c={c} dq={dq} mietrecht={mietrecht}
              u={u} projects={projects} regions={regions}
              applyRegionDefaults={applyRegionDefaults} linkValid={linkValid}
              onGoMietrecht={() => navTo("mietrecht")}
              onGoCrm={() => navTo("crm")}
            />
          )}
          {tab === "finanzierung" && (
            <Section id="sec-finanzierung" title="Finanzierung & Bank" defaultOpen>
              <FinancePanel p={p} />
            </Section>
          )}
          {tab === "mietrecht" && (
            <>
              <MietrechtRiskCard p={p} />
              <Section title="Eigene Einschätzung & fehlende Daten" defaultOpen>
                <div className="grid md:grid-cols-2 gap-3">
                  <F label="Mietrechtliche Einschätzung">
                    <select value={p.mietrecht} onChange={(e) => u({ mietrecht: e.target.value as Mietrecht })} className={selectCls}>
                      {MIETRECHTE.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </F>
                  <F label="Fehlende Daten (komma-getrennt)">
                    <T value={p.missingData.join(", ")} edit={true} on={(v) => u({ missingData: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
                  </F>
                </div>
                <p className="text-[11px] text-[#A8A29E] border-t border-[#EAE6DF] pt-2 mt-3">Hinweis: Keine Rechtsberatung. Verbindliche Einstufung nur durch Fachperson / Anwalt.</p>
              </Section>
            </>
          )}
          {tab === "analysen" && (
            <AnalysenTab p={p} c={c} />
          )}
          {tab === "besichtigung" && (
            <BesichtigungTab p={p} viewings={viewings} setViewing={setViewing} />
          )}
          {tab === "crm" && (
            <CrmTab p={p} u={u} />
          )}
        </div>

        {/* ============ STICKY SIDEBAR ============ */}
        <aside
          className="hidden lg:block bg-[#FAFAF8] border-l border-[#EAE6DF] px-4 py-5 overflow-y-auto"
          style={{ width: 240, flex: "0 0 240px", position: "sticky", top: 0, height: "100vh" }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E]">Score</div>
          <div className="mt-1 text-[44px] leading-none text-[#1C1917]" style={{ ...bricolage, fontWeight: 800 }}>{s.total}</div>
          <div className="text-[12px] text-[#78716C]">von 100 Punkten</div>

          <div className="mt-5 space-y-2.5">
            {cats.map((cat) => {
              const pct = cat.max > 0 ? (cat.value / cat.max) * 100 : 0;
              const color = pct >= 70 ? "#2D6A4F" : pct >= 40 ? "#D97706" : "#DC2626";
              return (
                <div key={cat.key}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-[12px] font-medium text-[#1C1917] truncate">{cat.label}</span>
                    <span className="text-[12px] text-[#78716C] tabular-nums shrink-0">{cat.value.toFixed(1)}/{cat.max}</span>
                  </div>
                  <div className="h-[5px] rounded-[3px] bg-[#EAE6DF] overflow-hidden">
                    <div className="h-full rounded-[3px]" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-lg bg-[#E8F5EE] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#2D6A4F]">Einschätzung</div>
            <div className="text-[14px] font-semibold text-[#1C1917] mt-0.5">{s.entscheidung}</div>
            <div className="text-[11px] text-[#78716C] mt-0.5">Ampel {s.ampel}</div>
          </div>

          {mietrecht.risiko !== "niedrig" && (
            <div className="mt-3 rounded-lg bg-[#FEF3C7] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#92400E]">Mietrecht-Risiko</div>
              <div className="text-[13px] font-semibold text-[#1C1917] mt-0.5">{mietrecht.kategorie}</div>
              <div className="text-[11px] text-[#78716C] mt-0.5">Risiko: {mietrecht.risiko}</div>
            </div>
          )}

          <div className="mt-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-1.5">Datenqualität</div>
            <div className="h-[5px] rounded-[3px] bg-[#EAE6DF] overflow-hidden mb-1.5">
              <div className="h-full rounded-[3px]" style={{ width: `${dq.score}%`, background: dq.ampel === "green" ? "#2D6A4F" : dq.ampel === "yellow" ? "#D97706" : "#DC2626" }} />
            </div>
            <div className="text-[12px] text-[#78716C]">{dq.filled} von {dq.total} Pflichtfeldern</div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

// ============ OVERVIEW TAB ============
function OverviewTab({ p, c, dq, mietrecht, u, projects, regions, applyRegionDefaults, linkValid, onGoMietrecht, onGoCrm }: {
  p: Property; c: ReturnType<typeof calcProperty>; dq: ReturnType<typeof calcDataQuality>;
  mietrecht: ReturnType<typeof inferMietrecht>;
  u: (patch: Partial<Property>) => void;
  projects: { id: string; name: string }[]; regions: ReturnType<typeof regionsOf>;
  applyRegionDefaults: () => void; linkValid: boolean;
  onGoMietrecht: () => void; onGoCrm: () => void;
}) {
  const mietrechtWarn = p.mietrecht === "unklar – rechtlich prüfen" || p.mietrecht === "Altbau / Richtwert möglich";
  const alerts: { text: string; tone: "red" | "amber" }[] = [];
  if (c.cashflowMtl < 0) alerts.push({ text: "Cashflow negativ", tone: "red" });
  if (mietrechtWarn) alerts.push({ text: "Mietrecht prüfen", tone: "red" });
  if (p.betriebskostenMtl == null) alerts.push({ text: "Betriebskosten fehlen", tone: "amber" });
  if (p.ruecklageFonds == null && p.ruecklageMtl == null) alerts.push({ text: "Rücklage fehlt", tone: "amber" });
  if (dq.score < 70) alerts.push({ text: `Daten unvollständig (${dq.missing.slice(0, 2).join(", ")}${dq.missing.length > 2 ? "…" : ""})`, tone: "amber" });

  const ampelColor = mietrecht.risiko === "niedrig" ? "green" as const : mietrecht.risiko === "mittel" ? "yellow" as const : "red" as const;

  return (
    <>
      {/* === SECTION A: Kennzahlen === */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <OverviewStat
          label="Kaufpreis"
          value={fmtEUR(p.kaufpreisBrutto ?? p.kaufpreis)}
          editable={{
            current: (p.kaufpreisBrutto ?? p.kaufpreis) ?? null,
            onCommit: (v) => u(p.kaufpreisBrutto != null ? { kaufpreisBrutto: v } : { kaufpreis: v }),
          }}
        />
        <OverviewStat label="Kaufnebenkosten" value={fmtEUR(c.kaufNebenkosten)} />
        <OverviewStat label="Gesamtkapital" value={fmtEUR(c.gesamtkosten)} />
        <OverviewStat label="Monatl. Rate" value={fmtEUR(c.kreditRateMtl)} />
        <OverviewStat label="Cashflow/Mo" value={fmtEUR(c.cashflowMtl)} tone={c.cashflowMtl >= 0 ? "good" : "bad"} sub={`${fmtEUR(c.cashflowJahr)}/Jahr`} />
        <OverviewStat label="Bruttorendite" value={fmtPct(c.bruttorendite)} sub={p.wohnflaecheM2 && p.kaufpreis ? `${fmtEUR(c.preisProM2)}/m²` : undefined} />
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[12px] rounded-full px-3 py-1" style={{
              background: a.tone === "red" ? "#FEE2E2" : "#FEF3C7",
              color: a.tone === "red" ? "#991B1B" : "#92400E",
            }}>
              <AlertTriangle className="size-3" /> {a.text}
            </span>
          ))}
        </div>
      )}

      {/* === SECTION B: Objektdaten (editable, open) === */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5 text-[11px]" style={{ color: "#D97706" }}>
          <AlertTriangle className="size-3" />
          <span>Bitte nach Import prüfen</span>
        </div>
        <Section id="sec-objektdaten" title="Objektdaten" defaultOpen>
          <div className="grid md:grid-cols-3 gap-3">
            <F label="Titel"><T value={p.title} edit on={(v) => u({ title: v })} /></F>
            <F label="Original-Link">
              <T value={p.link} edit on={(v) => u({ link: v })} />
              {!linkValid && p.link && <div className="text-[10px] text-[#DC2626] mt-1">Ungültige URL</div>}
            </F>
            <F label="Projekt">
              <select value={p.projectId} onChange={(e) => u({ projectId: e.target.value })} className={selectCls}>
                {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
            </F>
            <F label="Kaufpreis €" hint={!p.kaufpreis ? <RequiredHint /> : undefined}><N value={p.kaufpreis} edit on={(v) => u({ kaufpreis: v })} /></F>
            <F label="Wohnfläche m²" hint={!p.wohnflaecheM2 ? <RequiredHint /> : undefined}><N value={p.wohnflaecheM2} edit on={(v) => u({ wohnflaecheM2: v })} /></F>
            <F label="Zimmer" hint={!p.zimmer ? <RequiredHint /> : undefined}><N value={p.zimmer} edit on={(v) => u({ zimmer: v })} /></F>
            <F label="Baujahr" hint={!p.baujahr ? <RequiredHint /> : undefined}><N value={p.baujahr} edit on={(v) => u({ baujahr: v })} /></F>
            <F label="Zustand" hint={!p.zustand?.trim() ? <RequiredHint /> : undefined}><T value={p.zustand} edit on={(v) => u({ zustand: v })} /></F>
            <F label="Stockwerk"><T value={p.stockwerk ?? ""} edit on={(v) => u({ stockwerk: v })} /></F>
            <F label="Energieklasse" hint={!p.energyClass?.trim() ? <RequiredHint /> : undefined}><T value={p.energyClass ?? ""} edit on={(v) => u({ energyClass: v })} /></F>

            <F label="HWB"><N value={p.hwb ?? null} edit on={(v) => u({ hwb: v })} /></F>
            <F label="Verfügbarkeit"><T value={p.verfuegbarkeit ?? ""} edit on={(v) => u({ verfuegbarkeit: v })} /></F>
            <F label="Land">
              <select value={p.land ?? ""} onChange={(e) => u({ land: e.target.value, bundesland: "" })} className={selectCls}>
                <option value="">—</option>
                <option value="Österreich">Österreich</option>
                <option value="Deutschland">Deutschland</option>
              </select>
            </F>
            <F label="Bundesland / Region">
              {regions.length > 0 ? (
                <select value={p.bundesland ?? ""} onChange={(e) => u({ bundesland: e.target.value })} className={selectCls}>
                  <option value="">—</option>
                  {regions.map((r) => <option key={r.code} value={r.name}>{r.name}</option>)}
                </select>
              ) : (
                <T value={p.bundesland ?? ""} edit on={(v) => u({ bundesland: v })} />
              )}
            </F>
            <F label="Stadt"><T value={p.city ?? ""} edit on={(v) => u({ city: v })} /></F>
            <F label="Bezirk / Landkreis" hint={!p.bezirk?.trim() ? <RequiredHint /> : undefined}><T value={p.bezirk} edit on={(v) => u({ bezirk: v })} /></F>
            <F label="Adresse"><T value={p.adresse} edit on={(v) => u({ adresse: v })} /></F>
            <F label="Status">
              <select value={p.status} onChange={(e) => u({ status: e.target.value as PropertyStatus })} className={selectCls}>
                {STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </F>
            <F label="Makler?">
              <select value={p.makler} onChange={(e) => u({ makler: e.target.value as Property["makler"] })} className={selectCls}>
                {["Ja","Nein","unklar"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </F>
          </div>
        </Section>
      </div>

      {/* === SECTION C: Kauf & Nebenkosten === */}
      <Section id="sec-kauf-nebenkosten" title="Kauf & Nebenkosten">
        <div className="grid md:grid-cols-3 gap-3">
          <F label="Objektart">
            <select value={p.propertyType ?? "apartment"} onChange={(e) => u({ propertyType: e.target.value as PropertyType })} className={selectCls}>
              {PROPERTY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </F>
          {(p.propertyType ?? "apartment") === "house_with_separate_land" ? (
            <>
              <F label="Kaufpreis Haus €"><N value={p.housePurchasePrice ?? null} edit on={(v) => {
                const land = p.landPurchasePrice ?? 0;
                const sum = (v ?? 0) + land;
                u({ housePurchasePrice: v, totalPurchasePrice: sum || null, kaufpreis: sum || p.kaufpreis });
              }} /></F>
              <F label="Kaufpreis Grundstück €"><N value={p.landPurchasePrice ?? null} edit on={(v) => {
                const haus = p.housePurchasePrice ?? 0;
                const sum = haus + (v ?? 0);
                u({ landPurchasePrice: v, totalPurchasePrice: sum || null, kaufpreis: sum || p.kaufpreis });
              }} /></F>
              <F label="Gesamtkaufpreis €"><Ro>{fmtEUR((p.housePurchasePrice ?? 0) + (p.landPurchasePrice ?? 0))}</Ro></F>
            </>
          ) : (
            <F label={(p.propertyType ?? "apartment") === "land_only" ? "Kaufpreis Grundstück €" : "Kaufpreis €"}>
              <N value={p.kaufpreis} edit on={(v) => u({ kaufpreis: v })} />
            </F>
          )}
          <F label="Sanierung €"><N value={p.sanierung} edit on={(v) => u({ sanierung: v ?? 0 })} /></F>
          <F label="Einrichtung €"><N value={p.einrichtung} edit on={(v) => u({ einrichtung: v ?? 0 })} /></F>
          <F label="Reserve €"><N value={p.reserve} edit on={(v) => u({ reserve: v ?? 0 })} /></F>
          <F label="Betriebskosten €/Mt" hint={p.betriebskostenMtl == null ? <RequiredHint /> : undefined}><N value={p.betriebskostenMtl ?? null} edit on={(v) => u({ betriebskostenMtl: v })} /></F>
          <F label="Heizkosten €/Mt"><N value={p.heizkostenMtl ?? null} edit on={(v) => u({ heizkostenMtl: v })} /></F>
          <F label="Rücklage Fonds €/Mt"><N value={p.ruecklageFonds ?? null} edit on={(v) => u({ ruecklageFonds: v })} /></F>
          <F label="Nettomiete mtl. €" hint={!p.nettomieteMtl ? <RequiredHint /> : undefined}><N value={p.nettomieteMtl} edit on={(v) => u({ nettomieteMtl: v, nettomieteGeschaetzt: false })} /></F>

        </div>
        <div className="mt-4 pt-3 border-t border-[#EAE6DF] grid md:grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#FAFAF8] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-semibold">Kaufnebenkosten gesamt</div>
            <div className="mt-0.5 text-[18px] text-[#1C1917]" style={{ ...bricolage, fontWeight: 700 }}>{fmtEUR(c.kaufNebenkosten)}</div>
          </div>
          <div className="rounded-lg bg-[#E8F5EE] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-[#2D6A4F] font-semibold">Gesamter Kapitalbedarf</div>
            <div className="mt-0.5 text-[18px] text-[#1C1917]" style={{ ...bricolage, fontWeight: 700 }}>{fmtEUR(c.gesamtkosten)}</div>
          </div>
        </div>
      </Section>

      {/* === SECTION D: Maklerprovision Details === */}
      <Section title="Maklerprovision – Details" actions={
        <button onClick={applyRegionDefaults} type="button" className="inline-flex items-center gap-1 text-xs border border-[#EAE6DF] rounded-md px-2.5 py-1 hover:bg-[#FAFAF8]">
          <Wand2 className="size-3.5" /> Standardwerte für Region
        </button>
      }>
        <div className="grid md:grid-cols-3 gap-3">
          <F label="Maklerprovision %">
            <N value={c.maklerProvisionPct ? c.maklerProvisionPct * 100 : (p.provisionPct != null ? p.provisionPct * 100 : null)} edit on={(v) => u({ provisionPct: v == null ? null : v / 100, provisionLastEdit: "pct", provisionEUR: null, provisionBruttoEUR: null })} />
          </F>
          <F label="Maklerprovision netto €">
            <N value={p.provisionLastEdit === "netto" ? (p.provisionEUR ?? null) : c.maklerProvisionNetto} edit on={(v) => u({ provisionEUR: v, provisionLastEdit: "netto", provisionPct: null, provisionBruttoEUR: null })} />
          </F>
          <F label="Maklerprovision brutto €">
            <N value={p.provisionLastEdit === "brutto" ? (p.provisionBruttoEUR ?? null) : c.maklerProvisionBrutto} edit on={(v) => u({ provisionBruttoEUR: v, provisionLastEdit: "brutto", provisionPct: null, provisionEUR: null })} />
          </F>
          <F label="USt auf Provision %">
            <N value={(p.maklerprovisionUstPct ?? 0.20) * 100} edit on={(v) => u({ maklerprovisionUstPct: v == null ? null : v / 100 })} />
          </F>
          <F label="Maklerprovision USt €"><Ro>{fmtEUR(c.maklerProvisionUst)}</Ro></F>
          <F label="Berechnungsbasis">
            <select value={p.provisionBasis ?? "brutto"} onChange={(e) => u({ provisionBasis: e.target.value as "netto" | "brutto" })} className={selectCls}>
              <option value="brutto">Kaufpreis brutto</option>
              <option value="netto">Kaufpreis netto</option>
            </select>
          </F>
          <F label="Maklerkosten zahlbar?">
            <select
              value={p.maklerkostenZahlbar == null ? "auto" : p.maklerkostenZahlbar ? "ja" : "nein"}
              onChange={(e) => u({ maklerkostenZahlbar: e.target.value === "auto" ? null : e.target.value === "ja" })}
              className={selectCls}
            >
              <option value="auto">Automatisch ({c.maklerKostenZahlbar ? "Ja" : "Nein"})</option>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </select>
          </F>
        </div>
        <div className="mt-3"><PurchaseCostsDetails p={p} c={c} u={u} /></div>
      </Section>

      {/* === SECTION E: Miete & Betriebskosten === */}
      <Section title="Miete & Betriebskosten">
        <div className="grid md:grid-cols-3 gap-3">
          <F label="Erwartete Miete €/Mt"><N value={p.nettomieteMtl} edit on={(v) => u({ nettomieteMtl: v, nettomieteGeschaetzt: false })} /></F>
          <F label="Miete geschätzt?">
            <label className="flex items-center gap-2 px-3 py-2 border border-[#EAE6DF] rounded-lg bg-white text-[13px]">
              <input type="checkbox" checked={p.nettomieteGeschaetzt} onChange={(e) => u({ nettomieteGeschaetzt: e.target.checked })} className="accent-[#2D6A4F]" />
              Schätzwert
            </label>
          </F>
          <F label="Betriebskosten €/Mt"><N value={p.betriebskostenMtl ?? null} edit on={(v) => u({ betriebskostenMtl: v })} /></F>
          <F label="Heizkosten €/Mt"><N value={p.heizkostenMtl ?? null} edit on={(v) => u({ heizkostenMtl: v })} /></F>
          <F label="Rücklage Fonds €/Mt"><N value={p.ruecklageFonds ?? null} edit on={(v) => u({ ruecklageFonds: v })} /></F>
        </div>
        <div className="mt-4 pt-3 border-t border-[#EAE6DF] rounded-lg bg-[#E8F5EE] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-[#2D6A4F] font-semibold">Break-even Miete</div>
          <div className="mt-0.5 text-[18px] text-[#1C1917]" style={{ ...bricolage, fontWeight: 700 }}>{fmtEUR(c.breakEvenMiete)} / Monat</div>
          <div className="text-[11px] text-[#78716C] mt-0.5">Ab dieser Miete ist der Cashflow ausgeglichen.</div>
        </div>
      </Section>

      {/* === SECTION F: Ausstattung (chips) === */}
      <Section title="Ausstattung">
        <div className="flex flex-wrap gap-2">
          {([
            ["hasElevator", "Lift"], ["hasBalkon", "Balkon"], ["hasTerrasse", "Terrasse"],
            ["hasLoggia", "Loggia"], ["hasGarten", "Garten"], ["hasKeller", "Keller"],
            ["hasStellplatz", "Stellplatz"],
          ] as const).map(([key, label]) => {
            const active = (p as any)[key] === true;
            return (
              <button
                key={key}
                type="button"
                onClick={() => u({ [key]: active ? null : true } as any)}
                className="inline-flex items-center text-[12px] px-3 py-1.5 transition-colors"
                style={{
                  borderRadius: 20,
                  fontWeight: active ? 600 : 500,
                  background: active ? "#2D6A4F" : "#F5F3EE",
                  color: active ? "#FFFFFF" : "#78716C",
                  border: active ? "1px solid #2D6A4F" : "1px solid #EAE6DF",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* === SECTION G: Mietrecht Kurzinfo === */}
      <Section title="Mietrecht – Kurzinfo">
        <div className="flex items-center gap-2 flex-wrap">
          <AmpelBadge ampel={ampelColor}>{mietrecht.kategorie} · Risiko {mietrecht.risiko}</AmpelBadge>
        </div>
        <p className="text-[13px] text-[#78716C] mt-2">{mietrecht.erklaerung}</p>
        <button onClick={onGoMietrecht} className="mt-3 text-[12px] text-[#2D6A4F] hover:underline">Details im Mietrecht-Tab →</button>
      </Section>

      {/* === SECTION H: Verkäufer & Makler === */}
      <Section title="Verkäufer & Makler">
        <div className="grid md:grid-cols-2 gap-3">
          <F label="Name"><T value={p.sellerName ?? ""} edit on={(v) => u({ sellerName: v })} /></F>
          <F label="Firma"><T value={p.sellerCompany ?? ""} edit on={(v) => u({ sellerCompany: v })} /></F>
          <F label="Telefon"><T value={p.sellerPhone ?? ""} edit on={(v) => u({ sellerPhone: v })} /></F>
          <F label="E-Mail"><T value={p.sellerEmail ?? ""} edit on={(v) => u({ sellerEmail: v })} /></F>
        </div>
        <button onClick={onGoCrm} className="mt-3 text-[12px] text-[#2D6A4F] hover:underline">Vollständiges CRM → CRM Tab</button>
      </Section>

      {p.status === "Gekauft" && (
        <>
          <Section title="Portfolio · Tatsächliche Kaufdaten"><PurchaseInfoPanel p={p} /></Section>
          <Section title="Zahlungen & Cashflow"><PaymentsPanel p={p} /></Section>
        </>
      )}
    </>
  );
}

// ============ ANALYSEN TAB ============
function AnalysenTab({ p, c }: { p: Property; c: ReturnType<typeof calcProperty> }) {
  const a = useActiveAssumptions();
  const miete = p.nettomieteMtl ?? 0;
  const rate = c.kreditRateMtl;
  const bk = p.betriebskostenMtl ?? 0;
  const ruecklage = c.ruecklageMtl;
  const instandh = (p.projections?.instandhaltungProJahr ?? 0) / 12;
  const renditeZielDelta = c.bruttorendite - (a.zielBrutto ?? 0);

  return (
    <>
      {/* Top summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyseStat label="Cashflow/Mo" value={fmtEUR(c.cashflowMtl)} tone={c.cashflowMtl >= 0 ? "good" : "bad"} />
        <AnalyseStat label="Bruttorendite" value={fmtPct(c.bruttorendite)} tone={c.bruttorendite >= (a.zielBrutto ?? 0) ? "good" : "bad"} />
        <AnalyseStat label="Nettorendite" value={fmtPct(c.nettorendite)} />
        <AnalyseStat label="Break-even Miete" value={fmtEUR(c.breakEvenMiete)} />
      </div>

      <AccordionCard title="Cashflow im Detail" defaultOpen>
        <div className="space-y-1.5 text-[13px]">
          <CfLine label="Miete (mtl.)" value={miete} sign="+" />
          <CfLine label="Rate" value={-rate} />
          <CfLine label="Betriebskosten" value={-bk} />
          <CfLine label="Rücklage" value={-ruecklage} />
          <CfLine label="Instandhaltung (mtl.)" value={-instandh} />
          <div className="border-t border-[#EAE6DF] pt-1.5 mt-1.5 flex justify-between">
            <span className="font-semibold">= Cashflow / Monat</span>
            <span className={`font-semibold tabular-nums ${c.cashflowMtl >= 0 ? "text-[#2D6A4F]" : "text-[#DC2626]"}`}>{fmtEUR(c.cashflowMtl)}</span>
          </div>
          <div className="flex justify-between text-[#78716C]">
            <span>Cashflow p.a. (×12)</span>
            <span className="tabular-nums">{fmtEUR(c.cashflowJahr)}</span>
          </div>
        </div>
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <MiniBox label="Cashflow @ Leerstand (2 Mo)" value={fmtEUR(c.cashflowStressLeerstand)} />
          <MiniBox label="Cashflow @ Reparatur" value={fmtEUR(c.cashflowStressReparatur)} />
        </div>
      </AccordionCard>

      <AccordionCard title="Rendite im Detail">
        <div className="space-y-2 text-[13px]">
          <RendLine label="Bruttorendite" formula="Jahresmiete / Kaufpreis" value={fmtPct(c.bruttorendite)} />
          <RendLine label="Nettorendite" formula="(Miete − lfd. Kosten) / Gesamtinvest." value={fmtPct(c.nettorendite)} />
          <RendLine label="Eigenkapitalrendite" formula="Jahres-Cashflow / Eigenkapital" value={fmtPct(c.eigenkapitalrendite)} />
          <div className="pt-2 border-t border-[#EAE6DF] flex justify-between">
            <span>vs. Renditeziel ({fmtPct(a.zielBrutto ?? 0)})</span>
            <span className={`tabular-nums font-medium ${renditeZielDelta >= 0 ? "text-[#2D6A4F]" : "text-[#DC2626]"}`}>{renditeZielDelta >= 0 ? "+" : ""}{fmtPct(renditeZielDelta)}</span>
          </div>
        </div>
      </AccordionCard>

      <AccordionCard title="Break-even & Leistbarkeit">
        <div className="grid md:grid-cols-2 gap-3 text-[13px]">
          <MiniBox label="Break-even Miete" value={fmtEUR(c.breakEvenMiete)} sub="Rate + nicht-umlegbare BK + Rücklage" />
          <MiniBox label="DSCR" value={c.dscr.toFixed(2)} sub="Miete / Kreditrate (Bank-Sicht)" />
          <MiniBox label="Max. Kaufpreis @ Zielrendite" value={fmtEUR(c.maxKaufpreisZielRendite)} sub={`Bei ${fmtPct(a.zielBrutto ?? 0)} Zielrendite`} />
          <MiniBox label="Leistbarkeit" value={c.dscr >= 1.25 ? "Gut" : c.dscr >= 1.0 ? "Knapp" : "Risiko"} tone={c.dscr >= 1.25 ? "good" : c.dscr >= 1.0 ? "neutral" : "bad"} />
        </div>
      </AccordionCard>

      <AccordionCard title="Asset-Entwicklung & Projektion">
        <div className="space-y-5">
          <InvestorChartsPanel p={p} />
          <ProjectionTable p={p} />
        </div>
      </AccordionCard>

      <AccordionCard title="Finanzierungsszenarien-Vergleich">
        <FinancePanel p={p} />
      </AccordionCard>

      <AccordionCard title="Abschreibung / AfA · Anschlussfinanzierung">
        <AdvancedInvestmentPanel p={p} />
      </AccordionCard>

      {/* Rechner-Links */}
      <div className="rounded-[12px] border border-[#EAE6DF] bg-white p-4">
        <div className="text-[13px] font-semibold text-[#1C1917] mb-3">Diese Immobilie im Rechner öffnen</div>
        <div className="flex flex-wrap gap-2">
          <Link to="/rechner/$slug" params={{ slug: "kaufnebenkosten" }} className="inline-flex items-center text-[12px] border border-[#EAE6DF] rounded-md px-3 py-1.5 text-[#1C1917] hover:bg-[#FAFAF8]">Kaufnebenkosten-Rechner</Link>
          <Link to="/rechner/$slug" params={{ slug: "rendite" }} className="inline-flex items-center text-[12px] border border-[#EAE6DF] rounded-md px-3 py-1.5 text-[#1C1917] hover:bg-[#FAFAF8]">Rendite-Rechner</Link>
          <Link to="/rechner/$slug" params={{ slug: "cashflow" }} className="inline-flex items-center text-[12px] border border-[#EAE6DF] rounded-md px-3 py-1.5 text-[#1C1917] hover:bg-[#FAFAF8]">Cashflow-Rechner</Link>
        </div>
      </div>
    </>
  );
}

function AnalyseStat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "#2D6A4F" : tone === "bad" ? "#DC2626" : "#1C1917";
  return (
    <div className="rounded-[10px] border border-[#EAE6DF] bg-white px-[14px] py-3">
      <div className="text-[11px] uppercase tracking-wider text-[#A8A29E] font-medium">{label}</div>
      <div className="mt-1 text-[22px] leading-tight tabular-nums" style={{ ...bricolage, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
function CfLine({ label, value, sign }: { label: string; value: number; sign?: "+" }) {
  const positive = value >= 0;
  return (
    <div className="flex justify-between">
      <span className="text-[#78716C]">{label}</span>
      <span className={`tabular-nums ${positive ? "text-[#1C1917]" : "text-[#DC2626]"}`}>{sign === "+" && positive ? "+" : ""}{fmtEUR(value)}</span>
    </div>
  );
}
function RendLine({ label, formula, value }: { label: string; formula: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <div className="text-[#1C1917]">{label}</div>
        <div className="text-[11px] text-[#A8A29E]">{formula}</div>
      </div>
      <span className="tabular-nums font-medium text-[#1C1917]">{value}</span>
    </div>
  );
}
function MiniBox({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "#2D6A4F" : tone === "bad" ? "#DC2626" : "#1C1917";
  return (
    <div className="rounded-lg border border-[#EAE6DF] bg-[#FAFAF8] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-semibold">{label}</div>
      <div className="mt-0.5 text-[15px] tabular-nums" style={{ ...bricolage, fontWeight: 700, color }}>{value}</div>
      {sub && <div className="text-[11px] text-[#78716C] mt-0.5">{sub}</div>}
    </div>
  );
}

// ============ BESICHTIGUNG TAB ============
function BesichtigungTab({ p, viewings, setViewing }: {
  p: Property; viewings: Record<string, any>; setViewing: (id: string, key: string, patch: any) => void;
}) {
  const cur = viewings[p.id]?.checks ?? {};
  const groups: Record<string, typeof VIEWING_CHECKLIST> = {};
  VIEWING_CHECKLIST.forEach((c) => { (groups[c.group] ??= []).push(c); });
  const done = Object.values(cur).filter((c: any) => c.done).length;
  return (
    <>
      <Section title={`Besichtigungs-Checkliste (${done}/${VIEWING_CHECKLIST.length})`} defaultOpen>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="text-xs uppercase tracking-wide text-[#A8A29E] mb-2">{group}</div>
              <div className="space-y-2">
                {items.map((item) => {
                  const v = cur[item.key] ?? { done: false, note: "" };
                  return (
                    <div key={item.key} className="border-b border-[#EAE6DF] last:border-0 pb-2 last:pb-0">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={v.done} onChange={(e) => setViewing(p.id, item.key, { done: e.target.checked })} className="accent-[#2D6A4F]" />
                        {item.label}
                      </label>
                      <input
                        type="text" placeholder="Notiz…" value={v.note}
                        onChange={(e) => setViewing(p.id, item.key, { note: e.target.value })}
                        className="mt-1 w-full rounded border border-[#EAE6DF] bg-white px-2 py-1 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Dokumente / Exposé-PDF">
        <PdfUploader propertyId={p.id} />
      </Section>
    </>
  );
}

// ============ CRM TAB ============
function CrmTab({ p, u }: { p: Property; u: (patch: Partial<Property>) => void }) {
  const mig = migrateLegacyStatus(p.status);
  const bewertung: Bewertung = p.bewertung ?? mig.bewertung;
  const prozess: ProzessStatus = (p.prozessStatus ?? mig.prozessStatus) as ProzessStatus;

  const chip = (active: boolean) => ({
    background: active ? "#2D6A4F" : "#F5F3EE",
    color: active ? "#FFFFFF" : "#78716C",
    border: active ? "1px solid #2D6A4F" : "1px solid #EAE6DF",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: active ? 600 : 500,
  });

  return (
    <>
      <Section title="Status" defaultOpen>
        <div className="space-y-3">
          <div>
            <div className="text-[11px] text-[#A8A29E] mb-1.5">Prozess-Status:</div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => u({ prozessStatus: "" })} style={chip(!prozess)}>—</button>
              {ALL_PROZESS_STATUSES.map((s) => (
                <button key={s} onClick={() => u({ prozessStatus: s })} style={chip(prozess === s)}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#A8A29E] mb-1.5">Bewertung:</div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_BEWERTUNGEN.map((b) => (
                <button key={b} onClick={() => u({ bewertung: b })} style={chip(bewertung === b)}>{b}</button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Follow-ups & Nächste Aktion" defaultOpen>
        <div className="grid md:grid-cols-3 gap-3">
          <F label="Priorität">
            <select value={p.priority ?? ""} onChange={(e) => u({ priority: (e.target.value || null) as any })} className={selectCls}>
              <option value="">—</option>
              <option value="A">A – hoch</option>
              <option value="B">B – mittel</option>
              <option value="C">C – niedrig</option>
            </select>
          </F>
          <F label="Nächste Aktion"><T value={p.nextAction ?? ""} edit on={(v) => u({ nextAction: v })} /></F>
          <F label="Fällig am">
            <input type="date" value={p.nextActionDate ?? ""} onChange={(e) => u({ nextActionDate: e.target.value || undefined })} className={selectCls} />
          </F>
        </div>
      </Section>

      <Section title="Aktivitäten / Verlauf" defaultOpen>
        <ActivitiesPanel propertyId={p.id} />
      </Section>

      <Section title="Verkäufer & Makler" defaultOpen>
        <CrmPanel p={p} edit={true} u={u} />
      </Section>

      <Section title="Beschreibung & Notizen">
        <textarea
          value={p.beschreibung ?? ""}
          onChange={(e) => u({ beschreibung: e.target.value })}
          rows={3} placeholder="Beschreibung aus dem Inserat…"
          className="w-full rounded-lg border border-[#EAE6DF] bg-white p-3 text-sm focus:border-[#2D6A4F] outline-none"
        />
        <textarea
          value={p.notizen}
          onChange={(e) => u({ notizen: e.target.value })}
          rows={4} placeholder="Eigene Notizen…"
          className="w-full rounded-lg border border-[#EAE6DF] bg-white p-3 text-sm mt-3 focus:border-[#2D6A4F] outline-none"
        />
      </Section>

      <Section title="Offene Fragen für Besichtigung & Prüfung">
        <OpenQuestionsPanel p={p} />
      </Section>
    </>
  );
}

// ============ HELPER COMPONENTS ============
const selectCls = "w-full rounded-lg border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] text-[13px] text-[#1C1917] focus:border-[#2D6A4F] outline-none";

function OverviewStat({ label, value, sub, tone, editable }: {
  label: string; value: string; sub?: string; tone?: "good" | "bad" | "neutral";
  editable?: { current: number | null; onCommit: (v: number | null) => void };
}) {
  const color = tone === "good" ? "#2D6A4F" : tone === "bad" ? "#DC2626" : "#1C1917";
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<string>(editable?.current == null ? "" : String(editable.current));
  useEffect(() => {
    if (!editing) setLocal(editable?.current == null ? "" : String(editable?.current));
  }, [editable?.current, editing]);

  const commit = () => {
    setEditing(false);
    if (!editable) return;
    const orig = editable.current == null ? "" : String(editable.current);
    if (local === orig) return;
    if (local !== "" && isNaN(Number(local))) {
      toast.error("Ungültige Zahl");
      setLocal(orig);
      return;
    }
    editable.onCommit(local === "" ? null : Number(local));
    toast.success("Gespeichert", { duration: 900 });
  };

  return (
    <div className="group rounded-[10px] border border-[#EAE6DF] bg-white px-[14px] py-3">
      <div className="text-[11px] uppercase tracking-wider text-[#A8A29E] font-medium">{label}</div>
      {editable && editing ? (
        <input
          autoFocus
          type="number"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            else if (e.key === "Escape") { setLocal(editable.current == null ? "" : String(editable.current)); setEditing(false); }
          }}
          className="mt-1 w-full bg-transparent outline-none text-[14px] tabular-nums px-0 py-0.5"
          style={{ ...bricolage, fontWeight: 700, color, borderBottom: "1.5px solid #2D6A4F" }}
        />
      ) : editable ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 flex items-center gap-1.5 text-left w-full"
        >
          <span className="text-[20px] leading-tight tabular-nums" style={{ ...bricolage, fontWeight: 700, color }}>{value}</span>
          <Pencil className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#A8A29E" }} />
        </button>
      ) : (
        <div className="mt-1 text-[20px] leading-tight tabular-nums" style={{ ...bricolage, fontWeight: 700, color }}>{value}</div>
      )}
      {sub && <div className="text-[11px] text-[#A8A29E] mt-0.5">{sub}</div>}
    </div>
  );
}

function AccordionCard({ title, children, defaultOpen = false, id }: { title: string; children: React.ReactNode; defaultOpen?: boolean; id?: string }) {
  return (
    <details id={id} open={defaultOpen} className="group rounded-[10px] border border-[#EAE6DF] bg-white overflow-hidden">
      <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none hover:bg-[#FAFAF8] [&::-webkit-details-marker]:hidden">
        <span className="text-[13px] font-medium text-[#1C1917]">{title}</span>
        <ChevronRight className="size-4 text-[#A8A29E] transition-transform group-open:rotate-90" />
      </summary>
      <div className="bg-[#FAFAF8] px-4 py-3 border-t border-[#EAE6DF]">{children}</div>
    </details>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2.5">{children}</div>;
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-medium">{label}</div>
      <div className="text-[13px] text-[#1C1917] mt-0.5 truncate" title={value}>{value}</div>
    </div>
  );
}

function Section({ title, children, actions, defaultOpen = false, id }: { title: string; children: React.ReactNode; actions?: React.ReactNode; defaultOpen?: boolean; id?: string }) {
  return (
    <details id={id} open={defaultOpen} className="group rounded-[12px] border border-[#EAE6DF] bg-white overflow-hidden">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none hover:bg-[#FAFAF8] [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight className="size-4 text-[#A8A29E] shrink-0 transition-transform group-open:rotate-90" />
          <h3 className="text-[14px] font-semibold text-[#1C1917] truncate">{title}</h3>
        </div>
        {actions && <div onClick={(e) => e.preventDefault()}>{actions}</div>}
      </summary>
      <div className="px-5 pb-5 pt-1 border-t border-[#EAE6DF] bg-white">{children}</div>
    </details>
  );
}

function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return <label className="block"><div className="text-[11px] text-[#78716C] mb-1">{label}</div>{children}{hint}</label>;
}
function RequiredHint({ text = "Pflichtfeld – wird für die Kalkulation benötigt" }: { text?: string }) {
  return (
    <div className="flex items-center gap-1 mt-1 text-[11px]" style={{ color: "#D97706" }}>
      <AlertTriangle style={{ width: 12, height: 12 }} />
      <span>{text}</span>
    </div>
  );
}

function Ro({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-[9px] rounded-lg border-[1.5px] border-[#EAE6DF] bg-[#FAFAF8] text-[13px] text-[#1C1917] min-h-[36px]">{children}</div>;
}
function T({ value, on, edit }: { value: string; on: (v: string) => void; edit: boolean }) {
  const [local, setLocal] = useState(value);
  const originalRef = useRef(value);
  useEffect(() => { setLocal(value); originalRef.current = value; }, [value]);
  if (!edit) return <Ro>{value || "—"}</Ro>;
  const commit = () => {
    if (local !== originalRef.current) {
      on(local); originalRef.current = local;
      toast.success("Gespeichert", { duration: 900 });
    }
  };
  return (
    <input
      value={local} placeholder="—"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
        else if (e.key === "Escape") { setLocal(originalRef.current); (e.target as HTMLInputElement).blur(); }
      }}
      className={selectCls}
    />
  );
}
function N({ value, on, edit }: { value: number | null | undefined; on: (v: number | null) => void; edit: boolean }) {
  const [local, setLocal] = useState<string>(value == null ? "" : String(value));
  const originalRef = useRef<string>(value == null ? "" : String(value));
  useEffect(() => { const s = value == null ? "" : String(value); setLocal(s); originalRef.current = s; }, [value]);
  if (!edit) return <Ro>{value ?? "—"}</Ro>;
  const commit = () => {
    if (local === originalRef.current) return;
    if (local !== "" && isNaN(Number(local))) {
      toast.error("Ungültige Zahl"); setLocal(originalRef.current); return;
    }
    on(local === "" ? null : Number(local));
    originalRef.current = local;
    toast.success("Gespeichert", { duration: 900 });
  };
  return (
    <input
      type="number" value={local} placeholder="—"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
        else if (e.key === "Escape") { setLocal(originalRef.current); (e.target as HTMLInputElement).blur(); }
      }}
      className={selectCls}
    />
  );
}

// ============ DATA CHECK BANNER ============
function DataCheckBanner({ propertyId, dqScore, onCheck }: { propertyId: string; dqScore: number; onCheck: () => void }) {
  const key = `pwt:${propertyId}:bannerDismissed`;
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try { if (sessionStorage.getItem(key) === "1") setDismissed(true); } catch {}
  }, [key]);
  if (dismissed || dqScore >= 100) return null;
  return (
    <div className="flex items-start gap-3 rounded-[10px] px-4 py-3" style={{ background: "#FEF3C7", border: "1px solid #FCD34D" }}>
      <AlertTriangle className="size-4 mt-0.5 shrink-0" style={{ color: "#D97706" }} />
      <p className="text-[13px] flex-1" style={{ color: "#92400E" }}>
        Bitte prüfe die importierten Daten bevor du kalkulierst – nicht alle Felder werden automatisch korrekt ausgelesen.
      </p>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onCheck} className="text-[13px] font-medium hover:underline" style={{ color: "#92400E" }}>Jetzt prüfen →</button>
        <button
          onClick={() => { try { sessionStorage.setItem(key, "1"); } catch {} setDismissed(true); }}
          className="text-[13px] hover:underline"
          style={{ color: "#92400E" }}
        >Ignorieren ✕</button>
      </div>
    </div>
  );
}

// ============ SETUP WALKTHROUGH ============
function SetupWalkthrough({ propertyId, navTo }: { propertyId: string; navTo: (tab: TabKey, sectionId?: string) => void }) {
  const dismissKey = `pwt:${propertyId}:walkthroughDismissed`;
  const stepKey = (n: number) => `pwt:${propertyId}:step${n}`;
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false]);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey) === "1");
      setChecked([1, 2, 3, 4].map((n) => localStorage.getItem(stepKey(n)) === "1"));
    } catch { setDismissed(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  if (dismissed === null) return null;
  const allDone = checked.every(Boolean);
  if (dismissed || allDone) return null;

  const steps: { label: string; go: () => void }[] = [
    { label: "Kaufpreis & Fläche prüfen (Übersicht → Objektdaten)", go: () => navTo("uebersicht", "sec-objektdaten") },
    { label: "Erwartete Miete eingeben (Übersicht → Kauf & Nebenkosten)", go: () => navTo("uebersicht", "sec-kauf-nebenkosten") },
    { label: "Finanzierung eintragen (Finanzierung Tab)", go: () => navTo("finanzierung", "sec-finanzierung") },
    { label: "Score & Cashflow prüfen (du bist hier)", go: () => navTo("uebersicht") },
  ];

  const toggle = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
    try { localStorage.setItem(stepKey(i + 1), next[i] ? "1" : "0"); } catch {}
  };

  return (
    <div className="rounded-[10px] border border-[#EAE6DF] bg-white p-4">
      <div className="text-[13px] font-semibold text-[#1C1917] mb-3">In 4 Schritten zur ersten Einschätzung</div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 text-[13px] text-[#78716C]">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => toggle(i)}
              className="size-4 rounded border-[#EAE6DF] accent-[#2D6A4F] cursor-pointer"
            />
            <span className="text-[11px] text-[#A8A29E] font-medium w-4">{i + 1}.</span>
            <button onClick={s.go} className="text-left hover:text-[#1C1917] hover:underline flex-1">{s.label}</button>
          </li>
        ))}
      </ol>
      <div className="flex justify-end mt-3">
        <button
          onClick={() => { try { localStorage.setItem(dismissKey, "1"); } catch {} setDismissed(true); }}
          className="text-[12px] text-[#A8A29E] hover:text-[#78716C]"
        >Walkthrough ausblenden</button>
      </div>
    </div>
  );
}

