import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { makeActivity, useActiveAssumptions, useStore, VIEWING_CHECKLIST } from "@/lib/store";
import { calcDataQuality, calcProperty, fmtEUR, fmtPct, getFieldsByGroup, googleMapsUrl, inferMietrecht, isValidUrl } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { PdfUploader } from "@/components/PdfUploader";
import { FinancePanel } from "@/components/FinancePanel";
import { MietrechtRiskCard } from "@/components/MietrechtRiskCard";
import { OpenQuestionsPanel } from "@/components/OpenQuestionsPanel";

import { InvestorChartsPanel } from "@/components/InvestorChartsPanel";
import { ProjectionTable } from "@/components/ProjectionTable";

import { PaymentsPanel } from "@/components/PaymentsPanel";
import { PurchaseInfoPanel } from "@/components/PurchaseInfoPanel";
import { PurchaseCostsDetails } from "@/components/PurchaseCostsDetails";
import { ALL_BEWERTUNGEN, ALL_MIETRECHTE, ALL_PROZESS_STATUSES, ALL_STATUSES, PROPERTY_TYPES, migrateLegacyStatus, userRatingAvg, type Bewertung, type Mietrecht, type ProzessStatus, type Property, type PropertyStatus, type PropertyType, type UserRating } from "@/lib/types";
import { countryOf, regionDefaultsForProperty, regionsOf } from "@/lib/regions";
import { resolvePurchaseCostRules } from "@/lib/purchaseCostRules";
import { AlertTriangle, ArrowLeft, Building2, Calendar, CalendarPlus, ChevronDown, ChevronRight, Copy, Download, ExternalLink, Globe, Lock, Mail, MapPin, MoreHorizontal, Pencil, Phone, Trash2, User, Wand2, X } from "lucide-react";
import { useEffect, useRef, useState, type SelectHTMLAttributes } from "react";
import { toast } from "sonner";
import { usePlan } from "@/lib/auth";
import { ExportPdfDialog } from "@/components/ExportPdfDialog";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { GlossaryTooltip } from "@/components/GlossaryTooltip";

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

  useEffect(() => {
    if (p?.title) document.title = `${p.title} – kaufma`;
    return () => { document.title = "kaufma"; };
  }, [p?.title]);

  const c = calcProperty(p, assumptions);
  const dq = calcDataQuality(p);
  const project = projects.find((x) => x.id === p.projectId);
  const u = (patch: Partial<Property>) => updateProperty(p.id, patch);

  const linkValid = isValidUrl(p.link);
  const mapsUrl = googleMapsUrl(p);
  useEffect(() => {
    updateProperty(p.id, { lastViewed: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);
  const mietrecht = inferMietrecht(p);
  const country = countryOf(p.land);
  const regions = country ? regionsOf(country) : [];

  const [tab, setTab] = useState<TabKey>("uebersicht");
  const [dqBannerDismissed, setDqBannerDismissed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportUpgradeOpen, setExportUpgradeOpen] = useState(false);
  const plan = usePlan();
  const canExport = plan === "plus" || plan === "premium";

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
    if (newId) {
      suppressLeaveWarnRef.current = true;
      toast.success("Dupliziert.");
      navigate({ to: "/properties/$id", params: { id: newId } });
    }
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
          <span className="inline-flex items-center rounded-full bg-[#E0F2FE] text-[#075985] px-3 py-1 text-[12px] font-medium">
            DQ {dq.score}% · {dq.level}
          </span>
          {linkValid && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-[#78716C] hover:text-[#2D6A4F] px-2 py-1">
              <ExternalLink className="size-3.5" /> Inserat öffnen
            </a>
          )}
          <button
            onClick={() => (canExport ? setExportOpen(true) : setExportUpgradeOpen(true))}
            className="inline-flex items-center gap-1 text-[12px] text-[#78716C] hover:text-[#2D6A4F] px-2 py-1"
          >
            {canExport ? <Download className="size-3.5" /> : <Lock className="size-3.5" />} Exportieren
          </button>
          <button onClick={onDelete} className="inline-flex items-center gap-1 text-[12px] text-[#78716C] hover:text-[#DC2626] px-2 py-1">
            <Trash2 className="size-3.5" /> Löschen
          </button>
          <HeaderMoreMenu mapsUrl={mapsUrl} onDuplicate={onDuplicate} />
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
            <DataCheckBanner propertyId={p.id} dqScore={dq.score} onCheck={() => navTo("uebersicht", "sec-objektdaten")} />
          )}
          {tab === "uebersicht" && (
            <OverviewTab
              p={p} c={c} dq={dq} mietrecht={mietrecht}
              u={u} projects={projects} regions={regions}
              applyRegionDefaults={applyRegionDefaults} linkValid={linkValid}
              onGoMietrecht={() => navTo("mietrecht")}
              onGoCrm={() => navTo("crm")}
              dqBannerDismissed={dqBannerDismissed}
              setDqBannerDismissed={setDqBannerDismissed}
              navTo={navTo}
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
                  <F
                    label="Mietrechtliche Einschätzung"
                    hint={p.mietrecht === "unklar – rechtlich prüfen" ? <RequiredHint text="Mietrechtskategorie prüfen – beeinflusst Score und Risikoeinschätzung" /> : undefined}
                  >
                    <Sel value={p.mietrecht} onChange={(e) => u({ mietrecht: e.target.value as Mietrecht })}>
                      {MIETRECHTE.map((o) => <option key={o} value={o}>{o}</option>)}
                    </Sel>
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
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-1.5">Datenqualität</div>
          <div className="text-[44px] leading-none text-[#1C1917]" style={{ ...bricolage, fontWeight: 800 }}>{dq.score}%</div>
          <div className="text-[12px] text-[#78716C]">{dq.level}</div>
          <div className="h-[5px] rounded-[3px] bg-[#EAE6DF] overflow-hidden my-2">
            <div className="h-full rounded-[3px]" style={{ width: `${dq.score}%`, background: dq.ampel === "green" ? "#2D6A4F" : dq.ampel === "yellow" ? "#D97706" : "#DC2626" }} />
          </div>
          <div className="text-[12px] text-[#78716C]">{dq.filled} von {dq.total} Pflichtfeldern</div>

          {mietrecht.risiko !== "niedrig" && (
            <div className="mt-5 rounded-lg bg-[#FEF3C7] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#92400E]">Mietrecht-Risiko</div>
              <div className="text-[13px] font-semibold text-[#1C1917] mt-0.5">{mietrecht.kategorie}</div>
              <div className="text-[11px] text-[#78716C] mt-0.5">Risiko: {mietrecht.risiko}</div>
            </div>
          )}
        </aside>
      </div>
      <ExportPdfDialog open={exportOpen} onClose={() => setExportOpen(false)} property={p} assumptions={assumptions} />
      <UpgradeDialog
        open={exportUpgradeOpen}
        onOpenChange={setExportUpgradeOpen}
        title="PDF-Export ist in Plus & Premium enthalten"
        description="Exportiere Eckdaten, Rendite, Finanzierung und mehr als PDF."
        recommendPlan="plus"
      />
    </AppShell>
  );
}

// ============ OVERVIEW TAB ============
function OverviewTab({ p, c, dq, mietrecht, u, projects, regions, applyRegionDefaults, linkValid, onGoMietrecht, onGoCrm, dqBannerDismissed, setDqBannerDismissed, navTo }: {
  p: Property; c: ReturnType<typeof calcProperty>; dq: ReturnType<typeof calcDataQuality>;
  mietrecht: ReturnType<typeof inferMietrecht>;
  u: (patch: Partial<Property>) => void;
  projects: { id: string; name: string }[]; regions: ReturnType<typeof regionsOf>;
  applyRegionDefaults: () => void; linkValid: boolean;
  onGoMietrecht: () => void; onGoCrm: () => void;
  dqBannerDismissed: boolean;
  setDqBannerDismissed: (v: boolean) => void;
  navTo: (target: TabKey, sectionId?: string) => void;
}) {
  const mietrechtWarn = p.mietrecht === "unklar – rechtlich prüfen" || p.mietrecht === "Altbau / Richtwert möglich";
  const alerts: { text: string; tone: "red" | "amber" }[] = [];
  if (c.cashflowMtl < 0) alerts.push({ text: "Cashflow negativ", tone: "red" });
  if (mietrechtWarn) alerts.push({ text: "Mietrecht prüfen", tone: "red" });
  if (p.betriebskostenMtl == null) alerts.push({ text: "Betriebskosten fehlen", tone: "amber" });
  if (p.ruecklageFonds == null && p.ruecklageMtl == null) alerts.push({ text: "Rücklage fehlt", tone: "amber" });
  if (dq.score < 70) alerts.push({ text: `Daten unvollständig (${dq.missing.slice(0, 2).join(", ")}${dq.missing.length > 2 ? "…" : ""})`, tone: "amber" });

  const ampelColor = mietrecht.risiko === "niedrig" ? "green" as const : mietrecht.risiko === "mittel" ? "yellow" as const : "red" as const;
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const visibleAlerts = alertsExpanded ? alerts : alerts.slice(0, 2);
  const hiddenAlertsCount = alerts.length - visibleAlerts.length;

  const scrollToFirstMissing = () => {
    const el = document.getElementById("sec-objektdaten") as HTMLDetailsElement | null;
    if (el) {
      if (el.tagName === "DETAILS") el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {!dqBannerDismissed && <DataQualityBanner dq={dq} onScroll={scrollToFirstMissing} onDismiss={() => setDqBannerDismissed(true)} />}

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
        <div className="flex flex-wrap gap-2 items-center">
          {visibleAlerts.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[12px] rounded-full px-3 py-1" style={{
              background: a.tone === "red" ? "#FEE2E2" : "#FEF3C7",
              color: a.tone === "red" ? "#991B1B" : "#92400E",
            }}>
              <AlertTriangle className="size-3" /> {a.text}
            </span>
          ))}
          {hiddenAlertsCount > 0 && (
            <button
              type="button"
              onClick={() => setAlertsExpanded(true)}
              className="text-[12px] text-[#78716C] hover:text-[#1C1917] underline-offset-2 hover:underline"
            >
              + {hiddenAlertsCount} weitere
            </button>
          )}
          {alertsExpanded && alerts.length > 2 && (
            <button
              type="button"
              onClick={() => setAlertsExpanded(false)}
              className="text-[12px] text-[#78716C] hover:text-[#1C1917] underline-offset-2 hover:underline"
            >
              weniger
            </button>
          )}
        </div>
      )}

      {!p.dataVerified && (
        <SetupWalkthrough propertyId={p.id} navTo={navTo} p={p} dq={dq} />
      )}

      <VerificationChecklist p={p} dq={dq} u={u} />




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
              <Sel value={p.projectId} onChange={(e) => u({ projectId: e.target.value })}>
                {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </Sel>
            </F>
            <F label="Kaufpreis €" hint={!p.kaufpreis ? <RequiredHint /> : undefined}><N value={p.kaufpreis} edit on={(v) => u({ kaufpreis: v })} /></F>
            <F label="Wohnfläche m²" hint={!p.wohnflaecheM2 ? <RequiredHint /> : undefined}><N value={p.wohnflaecheM2} edit on={(v) => u({ wohnflaecheM2: v })} /></F>
            <F label="Zimmer" hint={!p.zimmer ? <RequiredHint /> : undefined}><N value={p.zimmer} edit on={(v) => u({ zimmer: v })} /></F>
            <F label="Baujahr" hint={!p.baujahr ? <RequiredHint /> : undefined}><N value={p.baujahr} edit on={(v) => u({ baujahr: v })} /></F>
            <F label="Zustand" hint={!p.zustand?.trim() ? <RequiredHint /> : undefined}>
              <Sel value={p.zustand ?? ""} onChange={(e) => u({ zustand: e.target.value })}>
                <option value="">—</option>
                {["Erstbezug","Neuwertig","Sehr gut","Gut","Sanierungsbedürftig","Abrissreif"].map((o) => <option key={o} value={o}>{o}</option>)}
              </Sel>
            </F>
            <F label="Stockwerk"><T value={p.stockwerk ?? ""} edit on={(v) => u({ stockwerk: v })} /></F>
            <F label="Energieklasse" hint={!p.energyClass?.trim() ? <RequiredHint /> : undefined}>
              <Sel value={p.energyClass ?? ""} onChange={(e) => u({ energyClass: e.target.value })}>
                <option value="">—</option>
                {["A++","A+","A","B","C","D","E","F","G","Unbekannt"].map((o) => <option key={o} value={o}>{o}</option>)}
              </Sel>
            </F>

            <F label="HWB"><N value={p.hwb ?? null} edit on={(v) => u({ hwb: v })} /></F>
            <F label="Verfügbarkeit"><T value={p.verfuegbarkeit ?? ""} edit on={(v) => u({ verfuegbarkeit: v })} /></F>
            <F label="Land">
              <Sel value={p.land ?? ""} onChange={(e) => u({ land: e.target.value, bundesland: "" })}>
                <option value="">—</option>
                <option value="Österreich">Österreich</option>
                <option value="Deutschland">Deutschland</option>
                <option value="Schweiz">Schweiz</option>
              </Sel>
            </F>
            <F label="Bundesland / Region">
              {regions.length > 0 ? (
                <Sel value={p.bundesland ?? ""} onChange={(e) => u({ bundesland: e.target.value })}>
                  <option value="">—</option>
                  {regions.map((r) => <option key={r.code} value={r.name}>{r.name}</option>)}
                </Sel>
              ) : (
                <T value={p.bundesland ?? ""} edit on={(v) => u({ bundesland: v })} />
              )}
            </F>
            <F label="Stadt"><T value={p.city ?? ""} edit on={(v) => u({ city: v })} /></F>
            <F label="Bezirk / Landkreis" hint={!p.bezirk?.trim() ? <RequiredHint /> : undefined}><T value={p.bezirk} edit on={(v) => u({ bezirk: v })} /></F>
            <F label="Adresse"><T value={p.adresse} edit on={(v) => u({ adresse: v })} /></F>
            <F label="Status">
              <Sel value={p.status} onChange={(e) => u({ status: e.target.value as PropertyStatus })}>
                {STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
              </Sel>
            </F>
            <F label="Makler?">
              <Sel value={p.makler} onChange={(e) => u({ makler: e.target.value as Property["makler"] })}>
                <option value="Ja">Ja</option>
                <option value="Nein">Nein</option>
                <option value="unklar">Unbekannt</option>
              </Sel>
            </F>
          </div>
        </Section>
      </div>

      {/* === SECTION C: Kauf & Nebenkosten === */}
      <Section id="sec-kauf-nebenkosten" title="Kauf & Nebenkosten">
        <div className="grid md:grid-cols-3 gap-3">
          <F label="Objektart">
            <Sel value={p.propertyType ?? "apartment"} onChange={(e) => u({ propertyType: e.target.value as PropertyType })}>
              {PROPERTY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Sel>
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


        </div>
        {(() => {
          const rules = resolvePurchaseCostRules(p);
          const kp = p.kaufpreisBrutto ?? p.kaufpreis ?? 0;
          const kredit = c.kreditBetrag ?? 0;
          const grESt = p.grunderwerbsteuer ?? kp * rules.realEstateTransferTaxRate;
          const grundbuch = p.grundbuchkosten ?? kp * rules.landRegisterRate;
          const vertrag = p.vertragskosten ?? kp * rules.notaryContractRate;
          const finReg = p.finanzierungskosten ?? (kredit > 0 ? kredit * rules.mortgageRegisterRate : 0);
          const sonstige = p.sonstigeNK ?? 0;
          const rows = [
            { label: "Kaufpreis", value: kp, pct: null as string | null, highlight: true },
            { label: "Maklerprovision (brutto)", value: c.maklerProvisionBrutto, pct: p.provisionPct != null ? `${(p.provisionPct * 100).toFixed(2)}%` : null },
            { label: "Grunderwerbsteuer", value: grESt, pct: `${(rules.realEstateTransferTaxRate * 100).toFixed(2)}%` },
            { label: "Grundbucheintragung", value: grundbuch, pct: `${(rules.landRegisterRate * 100).toFixed(2)}%` },
            { label: "Notar / Vertrag", value: vertrag, pct: `${(rules.notaryContractRate * 100).toFixed(2)}%` },
            { label: "Finanzierung / Pfandrecht", value: finReg, pct: kredit > 0 ? `${(rules.mortgageRegisterRate * 100).toFixed(2)}%` : null },
            { label: "Sonstige Nebenkosten", value: sonstige, pct: null },
            { label: "Sanierung", value: p.sanierung ?? 0, pct: null },
            { label: "Einrichtung", value: p.einrichtung ?? 0, pct: null },
            { label: "Reserve", value: p.reserve ?? 0, pct: null },
          ].filter((item) => item.value > 0);
          return (
            <div className="mt-4 pt-3 border-t border-[#EAE6DF] space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-2">Kaufkostenaufschlüsselung</div>
              {rows.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#F5F3EE] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#78716C]">{item.label}</span>
                    {item.pct && <span className="text-[11px] text-[#A8A29E] bg-[#F5F3EE] px-1.5 py-0.5 rounded">{item.pct}</span>}
                  </div>
                  <span
                    className="text-[13px] font-medium text-[#1C1917] tabular-nums"
                    style={item.highlight ? { ...bricolage, fontWeight: 700, fontSize: 15 } : undefined}
                  >
                    {fmtEUR(item.value)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t-2 border-[#EAE6DF]">
                <span className="text-[13px] font-semibold text-[#1C1917]">Kaufnebenkosten gesamt</span>
                <span className="tabular-nums font-bold text-[#1C1917]" style={{ ...bricolage, fontSize: 16 }}>{fmtEUR(c.kaufNebenkosten)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#2D6A4F]">Gesamter Kapitalbedarf</span>
                <span className="tabular-nums font-bold text-[#2D6A4F]" style={{ ...bricolage, fontSize: 18 }}>{fmtEUR(c.gesamtkosten)}</span>
              </div>
            </div>
          );
        })()}
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
            <Sel value={p.provisionBasis ?? "brutto"} onChange={(e) => u({ provisionBasis: e.target.value as "netto" | "brutto" })}>
              <option value="brutto">Kaufpreis brutto</option>
              <option value="netto">Kaufpreis netto</option>
            </Sel>
          </F>
          <F label="Maklerkosten zahlbar?">
            <Sel
              value={p.maklerkostenZahlbar == null ? "auto" : p.maklerkostenZahlbar ? "ja" : "nein"}
              onChange={(e) => u({ maklerkostenZahlbar: e.target.value === "auto" ? null : e.target.value === "ja" })}
            >
              <option value="auto">Automatisch ({c.maklerKostenZahlbar ? "Ja" : "Nein"})</option>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </Sel>
          </F>
        </div>
        <div className="mt-3"><PurchaseCostsDetails p={p} c={c} u={u} /></div>
      </Section>

      {/* === SECTION E: Miete & Betriebskosten === */}
      <Section title="Miete & Betriebskosten">
        <div className="grid md:grid-cols-3 gap-3">
          <F label="Erwartete Miete €/Mt" hint={!p.nettomieteMtl ? <RequiredHint /> : undefined}><N value={p.nettomieteMtl} edit on={(v) => u({ nettomieteMtl: v, nettomieteGeschaetzt: false })} /></F>
          <F label="Miete geschätzt?">
            <label className="flex items-center gap-2 px-3 py-2 border border-[#EAE6DF] rounded-lg bg-white text-[13px]">
              <input type="checkbox" checked={p.nettomieteGeschaetzt} onChange={(e) => u({ nettomieteGeschaetzt: e.target.checked })} className="accent-[#2D6A4F]" />
              Schätzwert
            </label>
          </F>
          <F label="Betriebskosten €/Mt" hint={p.betriebskostenMtl == null ? <RequiredHint /> : undefined}><N value={p.betriebskostenMtl ?? null} edit on={(v) => u({ betriebskostenMtl: v })} /></F>

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

      <MeineBewertung p={p} u={u} />
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
            <span className="font-semibold">= Cashflow / Monat<GlossaryTooltip termId="cashflow" /></span>
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
          <RendLine label="Bruttorendite" termId="bruttorendite" formula="Jahresmiete / Kaufpreis" value={fmtPct(c.bruttorendite)} />
          <RendLine label="Nettorendite" termId="nettorendite" formula="(Miete − lfd. Kosten) / Gesamtinvest." value={fmtPct(c.nettorendite)} />
          <RendLine label="Eigenkapitalrendite" formula="Jahres-Cashflow / Eigenkapital" value={fmtPct(c.eigenkapitalrendite)} />
          <div className="pt-2 border-t border-[#EAE6DF] flex justify-between">
            <span>vs. Renditeziel ({fmtPct(a.zielBrutto ?? 0)})</span>
            <span className={`tabular-nums font-medium ${renditeZielDelta >= 0 ? "text-[#2D6A4F]" : "text-[#DC2626]"}`}>{renditeZielDelta >= 0 ? "+" : ""}{fmtPct(renditeZielDelta)}</span>
          </div>
        </div>
      </AccordionCard>

      <AccordionCard title="Steuer & AfA">
        <TaxPanel p={p} c={c} />
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

function TaxPanel({ p, c }: { p: Property; c: ReturnType<typeof calcProperty> }) {
  const { updateProperty } = useStore();
  const u = (patch: Partial<Property>) => updateProperty(p.id, patch);

  const steuersatz = p.persSteuersatz ?? 0.35;
  const afaSatz = p.afaSatz ?? 0.015;
  const gebaeudewertPct = p.gebaeudewertPct ?? 0.7;

  const kaufpreis = p.kaufpreis ?? 0;
  const gebaeudewert = kaufpreis * gebaeudewertPct;
  const afaJahr = gebaeudewert * afaSatz;
  const afaMtl = afaJahr / 12;

  const miete = p.nettomieteMtl ?? 0;
  const kosten = (p.betriebskostenMtl ?? 0) + c.ruecklageMtl + (c.kreditRateMtl * 0.6);
  const gewinnVorAfa = (miete - kosten) * 12;
  const gewinnNachAfa = gewinnVorAfa - afaJahr;
  const steuerBetrag = Math.max(0, gewinnNachAfa * steuersatz);
  const cashflowNachSteuer = c.cashflowJahr - steuerBetrag;

  const inputCls = "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] text-[13px] focus:border-[#2D6A4F] outline-none";

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <div className="text-[11px] text-[#78716C] mb-1">Persönlicher Steuersatz %</div>
          <input
            type="number"
            value={(steuersatz * 100).toFixed(0)}
            onChange={(e) => u({ persSteuersatz: Number(e.target.value) / 100 })}
            className={inputCls}
          />
        </div>
        <div>
          <div className="text-[11px] text-[#78716C] mb-1">AfA-Satz % (AT: 1,5 % / DE: 2 %)</div>
          <input
            type="number"
            step="0.1"
            value={(afaSatz * 100).toFixed(1)}
            onChange={(e) => u({ afaSatz: Number(e.target.value) / 100 })}
            className={inputCls}
          />
        </div>
        <div>
          <div className="text-[11px] text-[#78716C] mb-1">Gebäudewert % vom Kaufpreis</div>
          <input
            type="number"
            value={(gebaeudewertPct * 100).toFixed(0)}
            onChange={(e) => u({ gebaeudewertPct: Number(e.target.value) / 100 })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="rounded-[10px] border border-[#EAE6DF] overflow-hidden">
        <div className="bg-[#FAFAF8] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#A8A29E]">Berechnung</div>
        {[
          { label: "Gebäudewert", value: fmtEUR(gebaeudewert), sub: `${(gebaeudewertPct * 100).toFixed(0)}% von ${fmtEUR(kaufpreis)}` },
          { label: "AfA pro Jahr", value: fmtEUR(afaJahr), sub: `${(afaSatz * 100).toFixed(1)}% von ${fmtEUR(gebaeudewert)}` },
          { label: "AfA pro Monat", value: fmtEUR(afaMtl), sub: "steuerliche Abschreibung" },
          { label: "Gewinn vor AfA", value: fmtEUR(gewinnVorAfa), sub: "Mieteinnahmen − Kosten" },
          { label: "Gewinn nach AfA", value: fmtEUR(gewinnNachAfa), sub: "steuerlich relevanter Gewinn" },
          { label: `Steuer (${(steuersatz * 100).toFixed(0)}%)`, value: fmtEUR(steuerBetrag), sub: "geschätzte Steuerlast" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-2.5 border-t border-[#EAE6DF] first:border-0">
            <div>
              <div className="text-[13px] text-[#78716C]">{row.label}</div>
              <div className="text-[11px] text-[#A8A29E]">{row.sub}</div>
            </div>
            <div className="text-[13px] font-medium text-[#1C1917] tabular-nums">{row.value}</div>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3 border-t-2 border-[#EAE6DF] bg-[#E8F5EE]">
          <span className="text-[13px] font-semibold text-[#2D6A4F]">Cashflow nach Steuer (p.a.)</span>
          <span className="text-[16px] font-bold tabular-nums" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: cashflowNachSteuer >= 0 ? "#2D6A4F" : "#DC2626" }}>
            {fmtEUR(cashflowNachSteuer)}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-[#A8A29E]">Hinweis: Vereinfachte Schätzung. Keine Steuerberatung. Individuelle Berechnung durch Steuerberater empfohlen.</p>
    </div>
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
function RendLine({ label, formula, value, termId }: { label: string; formula: string; value: string; termId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <div className="text-[#1C1917]">{label}{termId && <GlossaryTooltip termId={termId} />}</div>
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
  const assumptions = useActiveAssumptions();

  const card: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #EAE6DF",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 12,
  };

  // ---- Bewertung chip colors ----
  const bewertungActiveBg: Record<Bewertung, string> = {
    "Neu": "#78716C",
    "Interessant": "#2D6A4F",
    "Prüfen": "#D97706",
    "Nicht interessant": "#DC2626",
  };

  return (
    <>
      {/* SECTION A — STATUS */}
      <div style={card}>
        <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: "#A8A29E", letterSpacing: "0.05em", textTransform: "uppercase" }}>Prozess</div>
        <div className="flex flex-wrap gap-2 mb-1">
          {ALL_PROZESS_STATUSES.map((s) => {
            const active = prozess === s;
            return (
              <button
                key={s}
                onClick={() => u({ prozessStatus: active ? "" : s })}
                className="inline-flex items-center gap-1.5 rounded-full transition-colors"
                style={{
                  fontSize: 13, fontWeight: 500, padding: "8px 16px",
                  border: active ? "1.5px solid #1C1917" : "1.5px solid #EAE6DF",
                  background: active ? "#1C1917" : "#F5F3EE",
                  color: active ? "#FFFFFF" : "#78716C",
                }}
              >
                {s}
                {active && <X className="size-3" />}
              </button>
            );
          })}
        </div>

        <div style={{ height: 1, background: "#EAE6DF", margin: "12px 0" }} />

        <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: "#A8A29E", letterSpacing: "0.05em", textTransform: "uppercase" }}>Bewertung</div>
        <div className="flex flex-wrap gap-2">
          {ALL_BEWERTUNGEN.map((b) => {
            const active = bewertung === b;
            return (
              <button
                key={b}
                onClick={() => u({ bewertung: b })}
                className="rounded-full transition-colors"
                style={{
                  fontSize: 12, fontWeight: 500, padding: "6px 12px",
                  border: active ? `1.5px solid ${bewertungActiveBg[b]}` : "1.5px solid #EAE6DF",
                  background: active ? bewertungActiveBg[b] : "#F5F3EE",
                  color: active ? "#FFFFFF" : "#78716C",
                }}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION B — NÄCHSTE AKTION */}
      <div style={card}>
        <NextActionCard p={p} u={u} />
      </div>

      {/* SECTION C — KONTAKT */}
      <div style={card}>
        <ContactList p={p} u={u} />
      </div>

      {/* SECTION D — ANGEBOTE & VERHANDLUNG */}
      <div style={card}>
        <OffersCard p={p} u={u} assumptions={assumptions} />
      </div>

      {/* SECTION E — AKTIVITÄTEN TIMELINE */}
      <div style={card}>
        <ActivityTimeline propertyId={p.id} />
      </div>

      {/* SECTION F — BESCHREIBUNG & NOTIZEN (Accordion) */}
      <details className="group" style={card}>
        <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <h3 className="text-[14px] font-semibold text-[#1C1917]">Beschreibung & Notizen</h3>
          <ChevronDown className="size-4 text-[#A8A29E] transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-[11px] text-[#78716C] mb-1">Beschreibung (aus Inserat)</div>
            <textarea
              value={p.beschreibung ?? ""}
              onChange={(e) => u({ beschreibung: e.target.value })}
              rows={3}
              className="w-full rounded-lg border-[1.5px] border-[#EAE6DF] bg-[#FAFAF8] italic p-3 text-[13px] text-[#1C1917] focus:border-[#2D6A4F] outline-none"
            />
          </div>
          <div>
            <div className="text-[11px] text-[#78716C] mb-1">Eigene Notizen</div>
            <textarea
              value={p.notizen}
              onChange={(e) => u({ notizen: e.target.value })}
              rows={4}
              className="w-full rounded-lg border-[1.5px] border-[#EAE6DF] bg-white p-3 text-[13px] text-[#1C1917] focus:border-[#2D6A4F] outline-none"
            />
          </div>
        </div>
      </details>

      {/* SECTION G — CHECKLISTE & FRAGEN */}
      <details className="group" style={card}>
        <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <h3 className="text-[14px] font-semibold text-[#1C1917]">Checkliste & Fragen</h3>
          <ChevronDown className="size-4 text-[#A8A29E] transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3">
          <OpenQuestionsPanel p={p} />
        </div>
      </details>
    </>
  );
}

// ---------- CRM helper subcomponents ----------
const CRM_INPUT = "w-full rounded-lg border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] text-[13px] text-[#1C1917] focus:border-[#2D6A4F] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function activityIconFor(type?: string) {
  if (type === "Telefonat") return Phone;
  if (type === "E-Mail" || type === "WhatsApp") return Mail;
  if (type === "Besichtigung") return Calendar;
  return CalendarPlus;
}

function NextActionCard({ p, u }: { p: Property; u: (patch: Partial<Property>) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(p.nextAction ?? "");
  const [date, setDate] = useState(p.nextActionDate ?? "");
  const [type, setType] = useState<string>("Telefonat");
  const [prio, setPrio] = useState<"Hoch" | "Mittel" | "Niedrig">(p.priority ?? "Mittel");

  useEffect(() => { setTitle(p.nextAction ?? ""); setDate(p.nextActionDate ?? ""); }, [p.nextAction, p.nextActionDate]);

  const hasAction = !!(p.nextAction || p.nextActionDate);
  const Icon = activityIconFor(type);

  const save = () => {
    u({ nextAction: title.trim(), nextActionDate: date || undefined, priority: prio });
    setEditing(false);
  };

  if (!hasAction && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-[#F5F3EE]"
        style={{ border: "1.5px dashed #D4CFC8", background: "#FAFAF8", borderRadius: 10, padding: 16 }}
      >
        <CalendarPlus className="size-6" style={{ color: "#A8A29E" }} />
        <span className="text-[13px]" style={{ color: "#A8A29E" }}>Nächste Aktion planen</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {hasAction && (
        <div
          className="flex items-center gap-3"
          style={{ background: "#E8F5EE", border: "1px solid #2D6A4F", borderRadius: 10, padding: "12px 16px" }}
        >
          <div className="grid place-items-center shrink-0" style={{ width: 36, height: 36, background: "#2D6A4F", borderRadius: 8 }}>
            <Icon className="size-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#1C1917] truncate">{p.nextAction || "Nächste Aktion"}</div>
            <div className="text-[11px] text-[#78716C]">
              {p.nextActionDate && <>Fällig: {p.nextActionDate}</>}
              {p.nextActionDate && p.priority && " · "}
              {p.priority && <>Priorität: {p.priority}</>}
            </div>
          </div>
          <button
            onClick={() => u({ nextAction: "", nextActionDate: "", lastContactDate: new Date().toISOString().slice(0, 10) })}
            className="text-[12px] rounded-md px-3 py-1.5 hover:bg-[#FAFAF8]"
            style={{ border: "1px solid #EAE6DF", background: "#FFFFFF", color: "#1C1917" }}
          >
            Erledigt
          </button>
        </div>
      )}

      {!editing && hasAction && (
        <button onClick={() => setEditing(true)} className="text-[12px] text-[#2D6A4F] hover:underline">+ Weitere Aktion</button>
      )}

      {editing && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className={CRM_INPUT}>
              {["Telefonat", "E-Mail", "WhatsApp", "Besichtigung", "Follow-up", "Notiz"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel der Aktion" className={CRM_INPUT} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={CRM_INPUT} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["Hoch", "Mittel", "Niedrig"] as const).map((x) => {
              const active = prio === x;
              return (
                <button
                  key={x}
                  onClick={() => setPrio(x)}
                  className="rounded-full"
                  style={{
                    fontSize: 12, fontWeight: 500, padding: "6px 12px",
                    border: active ? "1.5px solid #1C1917" : "1.5px solid #EAE6DF",
                    background: active ? "#1C1917" : "#F5F3EE",
                    color: active ? "#FFFFFF" : "#78716C",
                  }}
                >
                  {x}
                </button>
              );
            })}
            <div className="flex-1" />
            <button onClick={() => setEditing(false)} className="text-[12px] px-3 py-1.5 text-[#78716C] hover:underline">Abbrechen</button>
            <button onClick={save} className="text-[13px] rounded-lg px-4 py-2 font-medium" style={{ background: "#2D6A4F", color: "#FFFFFF" }}>Speichern</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, onChange, type = "text" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="grid place-items-center shrink-0 rounded-full" style={{ width: 26, height: 26, background: "#F5F3EE" }}>
        <Icon className="size-[14px] text-[#78716C]" />
      </div>
      <div className="text-[11px] text-[#A8A29E] w-20 shrink-0">{label}</div>
      {editing ? (
        <input
          type={type}
          autoFocus
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => { setEditing(false); if (local !== (value ?? "")) onChange(local); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className={CRM_INPUT + " flex-1"}
        />
      ) : (
        <button onClick={() => setEditing(true)} className="flex-1 text-left text-[13px] text-[#1C1917] truncate hover:text-[#2D6A4F]">
          {value || <span className="text-[#A8A29E]">—</span>}
        </button>
      )}
    </div>
  );
}

function ContactList({ p, u }: { p: Property; u: (patch: Partial<Property>) => void }) {
  const empty = !p.sellerName && !p.sellerCompany && !p.sellerPhone && !p.sellerEmail && !p.sellerWebsite && !p.sellerAddress;
  const [expand, setExpand] = useState(!empty);

  if (empty && !expand) {
    return (
      <button onClick={() => setExpand(true)} className="w-full flex items-center justify-center gap-2 py-3 text-[13px] text-[#A8A29E] hover:text-[#1C1917]">
        <Pencil className="size-3.5" /> Noch kein Kontakt eingetragen
      </button>
    );
  }

  return (
    <div>
      <div className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wider mb-2">Kontakt</div>
      <div className="flex items-center gap-3 py-2">
        <div className="grid place-items-center shrink-0 rounded-full" style={{ width: 26, height: 26, background: "#F5F3EE" }}>
          <User className="size-[14px] text-[#78716C]" />
        </div>
        <div className="text-[11px] text-[#A8A29E] w-20 shrink-0">Typ</div>
        <select value={p.sellerType ?? "unklar"} onChange={(e) => u({ sellerType: e.target.value as Property["sellerType"] })} className={CRM_INPUT + " flex-1"}>
          {(["Privat", "Makler", "Bauträger", "Bank", "Sonstige", "unklar"] as const).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <ContactRow icon={User} label="Name" value={p.sellerName} onChange={(v) => u({ sellerName: v })} />
      <ContactRow icon={Building2} label="Firma" value={p.sellerCompany} onChange={(v) => u({ sellerCompany: v })} />
      <ContactRow icon={Phone} label="Telefon" value={p.sellerPhone} onChange={(v) => u({ sellerPhone: v })} type="tel" />
      <ContactRow icon={Mail} label="E-Mail" value={p.sellerEmail} onChange={(v) => u({ sellerEmail: v })} type="email" />
      <ContactRow icon={Globe} label="Website" value={p.sellerWebsite} onChange={(v) => u({ sellerWebsite: v })} type="url" />
      <ContactRow icon={MapPin} label="Adresse" value={p.sellerAddress} onChange={(v) => u({ sellerAddress: v })} />
    </div>
  );
}

function OffersCard({ p, u, assumptions }: { p: Property; u: (patch: Partial<Property>) => void; assumptions: ReturnType<typeof useActiveAssumptions> }) {
  const [adding, setAdding] = useState(false);
  const [newAmount, setNewAmount] = useState<string>("");
  const today = new Date().toISOString().slice(0, 10);

  const offer = p.offerAmount;
  const status = p.negotiationStatus || "Offen";
  const statusStyles: Record<string, { bg: string; color: string }> = {
    "Offen": { bg: "#FEF3C7", color: "#92400E" },
    "Abgelehnt": { bg: "#FEE2E2", color: "#991B1B" },
    "Angenommen": { bg: "#E8F5EE", color: "#2D6A4F" },
  };

  // Live preview at offer price
  const previewPrice = offer ?? p.kaufpreis ?? 0;
  const cPreview = previewPrice > 0
    ? calcProperty({ ...p, kaufpreis: previewPrice }, assumptions)
    : null;

  const save = () => {
    const n = Number(newAmount);
    if (!isNaN(n) && n > 0) {
      u({
        offerAmount: n,
        negotiationStatus: "Offen",
        offerDate: new Date().toISOString().slice(0, 10),
      });
      setAdding(false);
      setNewAmount("");
    }
  };

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[#1C1917] mb-3">Angebote</h3>
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #EAE6DF" }}>
        <table className="w-full text-left">
          <thead>
            <tr style={{ background: "#FAFAF8" }}>
              {["Preis", "Von", "Datum", "Status"].map((h) => (
                <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#A8A29E]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: "1px solid #EAE6DF" }}>
              <td className="px-3 py-2.5" style={{ ...bricolage, fontWeight: 700, fontSize: 15, color: "#1C1917" }}>{fmtEUR(p.kaufpreis ?? 0)}</td>
              <td className="px-3 py-2.5 text-[12px] text-[#78716C]">Inserat</td>
              <td className="px-3 py-2.5 text-[12px] text-[#A8A29E]">{p.inseratsdatum || "—"}</td>
              <td className="px-3 py-2.5">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#F5F3EE", color: "#78716C" }}>Original</span>
              </td>
            </tr>
            {offer != null && offer > 0 && (
              <tr style={{ borderTop: "1px solid #EAE6DF", background: status === "Offen" ? "#FFFBEB" : undefined }}>
                <td className="px-3 py-2.5" style={{ ...bricolage, fontWeight: 700, fontSize: 15, color: "#1C1917" }}>{fmtEUR(offer)}</td>
                <td className="px-3 py-2.5 text-[12px] text-[#78716C]">Ich</td>
                <td className="px-3 py-2.5 text-[12px] text-[#A8A29E]">{p.offerDate || today}</td>
                <td className="px-3 py-2.5">
                  <select
                    value={status}
                    onChange={(e) => u({ negotiationStatus: e.target.value })}
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold border-0 outline-none"
                    style={{ background: statusStyles[status]?.bg ?? "#F5F3EE", color: statusStyles[status]?.color ?? "#78716C" }}
                  >
                    {["Offen", "Abgelehnt", "Angenommen"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="Angebotssumme €"
            className={CRM_INPUT + " flex-1"}
            autoFocus
          />
          <button onClick={save} className="text-[13px] rounded-lg px-4 py-2 font-medium" style={{ background: "#2D6A4F", color: "#FFFFFF" }}>Speichern</button>
          <button onClick={() => setAdding(false)} className="text-[12px] px-3 py-2 text-[#78716C]">Abbrechen</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full text-[13px] text-[#78716C] hover:text-[#1C1917] py-2.5"
          style={{ border: "1.5px dashed #D4CFC8", borderRadius: 8, background: "transparent" }}
        >
          + Angebot hinzufügen
        </button>
      )}

      {cPreview && previewPrice > 0 && (
        <div className="mt-4 rounded-[10px] p-4" style={{ background: "#F5F3EE", border: "1px solid #EAE6DF" }}>
          <div className="text-[11px] text-[#78716C] mb-2">Kalkulation bei {fmtEUR(previewPrice)}</div>
          <div className="grid grid-cols-3 gap-2">
            <PreviewStat label="Rendite" value={fmtPct(cPreview.bruttorendite)} />
            <PreviewStat label="Cashflow/Mo" value={fmtEUR(cPreview.cashflowMtl)} tone={cPreview.cashflowMtl >= 0 ? "good" : "bad"} />
            <PreviewStat label="Rate/Mo" value={fmtEUR(cPreview.kreditRateMtl)} />
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewStat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "#2D6A4F" : tone === "bad" ? "#DC2626" : "#1C1917";
  return (
    <div className="rounded-lg p-2.5" style={{ background: "#FFFFFF" }}>
      <div className="text-[10px] uppercase tracking-wider text-[#A8A29E]">{label}</div>
      <div className="mt-0.5 text-[14px] font-semibold" style={{ color, ...bricolage }}>{value}</div>
    </div>
  );
}

function ActivityTimeline({ propertyId }: { propertyId: string }) {
  const { activities, addActivity, deleteActivity } = useStore();
  const items = activities.filter((a) => a.propertyId === propertyId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [type, setType] = useState<string>("Telefonat");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const dotColor: Record<string, string> = {
    "Telefonat": "#2D6A4F",
    "E-Mail": "#1A4FD6",
    "Besichtigung": "#6D28D9",
    "Angebot abgegeben": "#D97706",
    "Import": "#D4CFC8",
  };

  const add = () => {
    if (!title.trim()) return;
    addActivity(makeActivity({
      propertyId,
      type: type as Parameters<typeof makeActivity>[0]["type"],
      title: title.trim(),
      description: note || undefined,
      date: new Date(date).toISOString(),
    }));
    setTitle(""); setNote("");
  };

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[#1C1917] mb-3">Aktivitäten</h3>

      {items.length === 0 ? (
        <div className="text-center py-6 text-[13px] text-[#A8A29E]">Noch keine Aktivitäten</div>
      ) : (
        <ol className="relative pl-5" style={{ borderLeft: "1.5px solid #EAE6DF" }}>
          {items.map((a) => {
            const color = dotColor[a.type] ?? "#A8A29E";
            const open = expandedId === a.id;
            return (
              <li key={a.id} className="relative mb-3 last:mb-0">
                <span className="absolute rounded-full" style={{ width: 8, height: 8, background: color, left: -24, top: 6 }} />
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : a.id)}
                  className="w-full text-left"
                >
                  <span className="rounded-full px-2 py-0.5 mr-2 text-[10px] font-medium" style={{ background: color + "22", color }}>{a.type}</span>
                  <span className="text-[13px] font-medium text-[#1C1917]">{a.title}</span>
                  <span className="text-[11px] text-[#A8A29E] ml-2">{new Date(a.date).toLocaleDateString("de-AT")}</span>
                </button>
                {open && a.description && (
                  <div className="mt-1.5 text-[12px] text-[#78716C] whitespace-pre-wrap">{a.description}</div>
                )}
                {open && (
                  <button onClick={() => { if (confirm("Aktivität löschen?")) deleteActivity(a.id); }} className="mt-1.5 text-[11px] text-[#DC2626] hover:underline ml-2">
                    Löschen
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4 pt-4 border-t border-[#EAE6DF] space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className={CRM_INPUT}>
            {["Telefonat", "E-Mail", "WhatsApp", "Besichtigung", "Follow-up", "Unterlagen angefragt", "Unterlagen erhalten", "Angebot abgegeben", "Notiz"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" className={CRM_INPUT} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={CRM_INPUT} />
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Notiz (optional)" className={CRM_INPUT} />
        <div className="flex justify-end">
          <button onClick={add} className="text-[13px] rounded-lg px-4 py-2 font-medium" style={{ background: "#FFFFFF", color: "#2D6A4F", border: "1px solid #EAE6DF" }}>
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}


// ============ HELPER COMPONENTS ============
const selectCls = "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] pr-8 text-[13px] text-[#1C1917] appearance-none cursor-pointer focus:border-[#2D6A4F] focus:outline-none hover:border-[#1C1917]";
const inputCls = "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] text-[13px] text-[#1C1917] focus:border-[#2D6A4F] focus:outline-none hover:border-[#1C1917]";
function Sel({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={selectCls + (className ? " " + className : "")}>{children}</select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-[#A8A29E] pointer-events-none" />
    </div>
  );
}

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

function VerificationChecklist({ p, dq, u }: {
  p: Property;
  dq: ReturnType<typeof calcDataQuality>;
  u: (patch: Partial<Property>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (p.dataVerified) return null;

  const groups = [
    { key: "basis", label: "Basisdaten" },
    { key: "kosten", label: "Kaufnebenkosten" },
    { key: "finanzierung", label: "Finanzierung" },
    { key: "bewertung", label: "Bewertung & Score" },
  ] as const;

  const basisOk = getFieldsByGroup("basis").every((f) => f.check(p));
  const kostenOk = getFieldsByGroup("kosten").every((f) => f.check(p));
  const canVerify = basisOk && kostenOk;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 text-[12px] text-[#78716C] hover:text-[#1C1917] underline-offset-2 hover:underline"
      >
        Daten prüfen <ChevronDown className="size-3.5" /> ({dq.filled}/{dq.total})
      </button>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#EAE6DF] bg-white" style={{ padding: "16px 20px" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold text-[#1C1917]">Daten prüfen vor Kalkulation</div>

        <div className="text-[11px] text-[#78716C]">{dq.filled}/{dq.total} ausgefüllt</div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        {groups.map((group) => {
          const fields = getFieldsByGroup(group.key);
          const allOk = fields.every((f) => f.check(p));
          return (
            <div
              key={group.key}
              className="rounded-[10px] border"
              style={{
                borderColor: allOk ? "#2D6A4F" : "#EAE6DF",
                background: allOk ? "#F0FAF4" : "#FAFAF8",
                padding: "10px 12px",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="grid place-items-center rounded-full text-[10px] font-bold size-4"
                  style={{
                    background: allOk ? "#2D6A4F" : "#FCD34D",
                    color: allOk ? "#FFFFFF" : "#92400E",
                  }}
                >
                  {allOk ? "✓" : "!"}
                </span>
                <div className="text-[12px] font-semibold text-[#1C1917]">{group.label}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fields.map((f) => {
                  const ok = f.check(p);
                  return (
                    <span
                      key={f.key}
                      className="inline-flex items-center gap-1 rounded-full text-[10px]"
                      style={{
                        background: ok ? "#E8F5EE" : "#FEF3C7",
                        color: ok ? "#2D6A4F" : "#92400E",
                        padding: "2px 8px",
                      }}
                    >
                      {ok ? "✓" : "!"} {f.label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <label
        className={`flex items-start gap-2 rounded-[10px] ${canVerify ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
        style={{ background: "#FAFAF8", border: "1px solid #EAE6DF", padding: "10px 12px" }}
      >
        <input
          type="checkbox"
          disabled={!canVerify}
          checked={!!p.dataVerified}
          onChange={(e) => u({ dataVerified: e.target.checked })}
          className="mt-0.5 accent-[#2D6A4F] size-4"
        />
        <span className="text-[12px] text-[#1C1917]">
          Ich habe alle Daten geprüft und bestätigt – die Kalkulation kann beginnen.
          {!canVerify && (
            <span className="block text-[11px] text-[#92400E] mt-0.5">
              Bitte zuerst Basisdaten und Kaufnebenkosten vollständig ausfüllen.
            </span>
          )}
        </span>
      </label>
    </div>
  );
}


function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return <label className="block"><div className="text-[11px] text-[#78716C] mb-1">{label}</div>{children}{hint}</label>;
}
function DataQualityBanner({ dq, onScroll, onDismiss }: { dq: ReturnType<typeof calcDataQuality>; onScroll: () => void; onDismiss?: () => void }) {
  if (dq.score === 100) return null;
  if (dq.score >= 70) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full"
        style={{ background: "#E8F5EE", border: "1px solid #2D6A4F", padding: "4px 12px" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span className="text-[12px]" style={{ color: "#2D6A4F" }}>{dq.score}% Datenqualität · {dq.level}</span>
      </div>
    );
  }
  return (
    <div className="rounded-[10px] flex items-start gap-2.5 relative" style={{ background: "#FEF3C7", border: "1px solid #FCD34D", padding: "10px 16px" }}>
      <AlertTriangle className="size-4 shrink-0 mt-[2px]" style={{ color: "#D97706" }} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium" style={{ color: "#92400E" }}>
          {dq.filled} von {dq.total} Pflichtfeldern ausgefüllt · {dq.score}% Datenqualität
        </div>
        {dq.missing.length > 0 && (
          <div className="text-[11px] mt-0.5" style={{ color: "#92400E" }}>
            Fehlend: {dq.missing.join(", ")}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onScroll}
        className="text-[12px] font-medium shrink-0 hover:underline"
        style={{ color: "#92400E" }}
      >
        Felder ausfüllen ↓
      </button>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 text-[#92400E] hover:text-[#1C1917]"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
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
      className={inputCls}
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
      className={inputCls}
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
function SetupWalkthrough({ propertyId, navTo, p, dq }: {
  propertyId: string;
  navTo: (tab: TabKey, sectionId?: string) => void;
  p: Property;
  dq: ReturnType<typeof calcDataQuality>;
}) {
  const seenKey = `walkthrough_${propertyId}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(seenKey) === "1") setDismissed(true); } catch {}
  }, [seenKey]);

  const activeScenario = p.financeScenarios?.find((s) => s.id === p.activeFinanceId) ?? p.financeScenarios?.[0];

  const steps = [
    { label: "Kaufpreis & Fläche prüfen", go: () => navTo("uebersicht", "sec-objektdaten"), checked: (p.kaufpreis ?? 0) > 0 && (p.wohnflaecheM2 ?? 0) > 0 },
    { label: "Erwartete Miete eingeben", go: () => navTo("uebersicht", "sec-kauf-nebenkosten"), checked: (p.nettomieteMtl ?? 0) > 0 },
    { label: "Finanzierung eintragen", go: () => navTo("finanzierung", "sec-finanzierung"), checked: (activeScenario?.eigenkapital ?? 0) > 0 && (activeScenario?.zinssatz ?? 0) > 0 },
    { label: "Score & Cashflow prüfen", go: () => navTo("uebersicht"), checked: dq.score >= 70 },
  ];

  const allDone = steps.every((s) => s.checked);

  useEffect(() => {
    if (!allDone || dismissed) return;
    const t = setTimeout(() => {
      setDismissed(true);
      try { localStorage.setItem(seenKey, "1"); } catch {}
    }, 2000);
    return () => clearTimeout(t);
  }, [allDone, dismissed, seenKey]);

  if (dismissed) return null;

  return (
    <div className="rounded-[12px] border border-[#EAE6DF] bg-white p-[16px_20px]">
      <div className="text-[13px] font-semibold text-[#1C1917] mb-3">In 4 Schritten zur ersten Einschätzung</div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={s.checked}
              readOnly
              className="size-4 rounded border-[#EAE6DF] accent-[#2D6A4F]"
            />
            <span className={`text-[13px] ${s.checked ? "text-[#2D6A4F] line-through" : "text-[#78716C]"}`}>
              {s.label}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex justify-end mt-3">
        <button
          onClick={() => { try { localStorage.setItem(seenKey, "1"); } catch {} setDismissed(true); }}
          className="text-[12px] text-[#A8A29E] hover:text-[#78716C]"
        >Walkthrough ausblenden</button>
      </div>
    </div>
  );
}


// ============ MEINE BEWERTUNG ============
function MeineBewertung({ p, u }: { p: Property; u: (patch: Partial<Property>) => void }) {
  const [open, setOpen] = useState(false);
  const r = p.userRating ?? {};
  const avg = userRatingAvg(r);
  const sliders: { key: keyof UserRating; label: string }[] = [
    { key: "lage", label: "Lage" },
    { key: "preisLeistung", label: "Preis-Leistung" },
    { key: "zustand", label: "Zustand" },
    { key: "vermietbarkeit", label: "Vermietbarkeit" },
    { key: "bauchgefuehl", label: "Bauchgefühl" },
  ];
  const set = (k: keyof UserRating, v: number) => {
    u({ userRating: { ...r, [k]: v } });
  };
  return (
    <div className="rounded-[12px] border border-[#EAE6DF] bg-white" style={{ padding: "12px 16px" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="text-[13px] font-semibold text-[#1C1917]">Meine Bewertung</span>
        <span className="flex items-center gap-2">
          {avg != null && !open && (
            <span className="text-[12px] text-[#78716C]">⭐ {avg.toFixed(1)}</span>
          )}
          <ChevronRight className={`size-4 text-[#A8A29E] transition-transform ${open ? "rotate-90" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {sliders.map((s) => {
            const val = (r[s.key] ?? 5) as number;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-[12px] text-[#1C1917] w-32 shrink-0">{s.label}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={val}
                  onChange={(e) => set(s.key, Number(e.target.value))}
                  className="flex-1 accent-[#2D6A4F]"
                />
                <span className="text-[14px] w-7 text-right tabular-nums" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, color: "#2D6A4F" }}>
                  {r[s.key] != null ? val : "—"}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-end gap-2 border-t border-[#EAE6DF] pt-2">
            <span className="text-[12px] text-[#78716C]">Ø</span>
            <span className="text-[14px]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, color: "#2D6A4F" }}>
              {avg != null ? avg.toFixed(1) : "—"} / 10
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderMoreMenu({ mapsUrl, onDuplicate }: { mapsUrl: string | null; onDuplicate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[12px] text-[#78716C] hover:text-[#1C1917] px-2 py-1"
        aria-label="Weitere Aktionen"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-[10px] border border-[#EAE6DF] bg-white shadow-md py-1">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#1C1917] hover:bg-[#FAFAF8]"
            >
              <MapPin className="size-3.5 text-[#78716C]" /> In Karte öffnen
            </a>
          )}
          <button
            type="button"
            onClick={() => { setOpen(false); onDuplicate(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#1C1917] hover:bg-[#FAFAF8] text-left"
          >
            <Copy className="size-3.5 text-[#78716C]" /> Duplizieren
          </button>
        </div>
      )}
    </div>
  );
}
