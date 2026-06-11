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
import { ScoreInfo } from "@/components/ScoreInfo";
import { PaymentsPanel } from "@/components/PaymentsPanel";
import { PurchaseInfoPanel } from "@/components/PurchaseInfoPanel";
import { PurchaseCostsDetails } from "@/components/PurchaseCostsDetails";
import { ALL_MIETRECHTE, ALL_STATUSES, PROPERTY_TYPES, type Mietrecht, type Property, type PropertyStatus, type PropertyType } from "@/lib/types";
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

type TabKey = "uebersicht" | "finanzierung" | "mietrecht" | "kalkulation" | "charts" | "crm";
const TABS: { key: TabKey; label: string }[] = [
  { key: "uebersicht", label: "Übersicht" },
  { key: "finanzierung", label: "Finanzierung" },
  { key: "mietrecht", label: "Mietrecht" },
  { key: "kalkulation", label: "Kalkulation" },
  { key: "charts", label: "Charts" },
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

  const onDelete = () => {
    if (confirm("Diese Immobilie wirklich löschen?")) {
      deleteProperty(p.id);
      toast.success("Gelöscht.");
      navigate({ to: "/properties" });
    }
  };
  const onDuplicate = () => {
    const newId = duplicateProperty(p.id);
    if (newId) { toast.success("Dupliziert."); navigate({ to: "/properties/$id", params: { id: newId } }); }
  };

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
              <DataCheckBanner propertyId={p.id} dqScore={dq.score} onCheck={() => navTo("kalkulation")} />
              <SetupWalkthrough propertyId={p.id} navTo={navTo} />
            </>
          )}
          {tab === "uebersicht" && <OverviewTab p={p} c={c} dq={dq} mietrecht={mietrecht} project={project?.name} linkValid={linkValid} mapsUrl={mapsUrl} />}
          {tab === "finanzierung" && (
            <Section id="sec-finanzierung" title="Finanzierung & Bank" defaultOpen>
              <FinancePanel p={p} />
            </Section>
          )}
          {tab === "mietrecht" && (
            <>
              <MietrechtRiskCard p={p} />
              <Section title="Mietrechtliche Einschätzung" defaultOpen>
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
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-[#A8A29E]">Kategorie</span>
                    <AmpelBadge ampel={mietrecht.risiko === "niedrig" ? "green" : mietrecht.risiko === "mittel" ? "yellow" : "red"}>{mietrecht.kategorie} · Risiko {mietrecht.risiko}</AmpelBadge>
                  </div>
                  <p className="text-sm text-[#78716C]">{mietrecht.erklaerung}</p>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#A8A29E] mb-1">Vor Kauf prüfen</div>
                    <ul className="list-disc list-inside text-sm text-[#1C1917]">
                      {mietrecht.pruefen.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  </div>
                  <p className="text-[11px] text-[#A8A29E] border-t border-[#EAE6DF] pt-2">Hinweis: Keine Rechtsberatung. Verbindliche Einstufung nur durch Fachperson / Anwalt.</p>
                </div>
              </Section>
            </>
          )}
          {tab === "kalkulation" && (
            <KalkulationTab p={p} c={c} u={u} projects={projects} regions={regions} applyRegionDefaults={applyRegionDefaults} linkValid={linkValid} />
          )}
          {tab === "charts" && (
            <>
              <Section title="Investor-Charts (Darlehen, Asset, Cash, Szenarien, AfA)" defaultOpen>
                <InvestorChartsPanel p={p} />
              </Section>
              <Section title="Advanced: AfA, Projektion & Anschlussfinanzierung">
                <AdvancedInvestmentPanel p={p} />
              </Section>
            </>
          )}
          {tab === "crm" && (
            <CrmTab p={p} u={u} viewings={viewings} setViewing={setViewing} />
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
function OverviewTab({ p, c, dq, mietrecht, project, linkValid, mapsUrl }: {
  p: Property; c: ReturnType<typeof calcProperty>; dq: ReturnType<typeof calcDataQuality>;
  mietrecht: ReturnType<typeof inferMietrecht>; project?: string; linkValid: boolean; mapsUrl: string | null;
}) {
  const mietrechtWarn = p.mietrecht === "unklar – rechtlich prüfen" || p.mietrecht === "Altbau / Richtwert möglich";
  const alerts: { text: string; tone: "red" | "amber" }[] = [];
  if (c.cashflowMtl < 0) alerts.push({ text: "Cashflow negativ", tone: "red" });
  if (mietrechtWarn) alerts.push({ text: "Mietrecht prüfen", tone: "red" });
  if (p.betriebskostenMtl == null) alerts.push({ text: "Betriebskosten fehlen", tone: "amber" });
  if (p.ruecklageFonds == null && p.ruecklageMtl == null) alerts.push({ text: "Rücklage fehlt", tone: "amber" });
  if (dq.score < 70) alerts.push({ text: `Daten unvollständig (${dq.missing.slice(0, 2).join(", ")}${dq.missing.length > 2 ? "…" : ""})`, tone: "amber" });

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <OverviewStat label="Kaufpreis" value={fmtEUR(p.kaufpreisBrutto ?? p.kaufpreis)} />
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

      <AccordionCard title="Objektdaten">
        <FieldGrid>
          <ReadField label="Bezirk" value={p.bezirk || "—"} />
          <ReadField label="Adresse" value={p.adresse || "—"} />
          <ReadField label="Stadt" value={p.city || "—"} />
          <ReadField label="Wohnfläche" value={p.wohnflaecheM2 ? `${p.wohnflaecheM2} m²` : "—"} />
          <ReadField label="Zimmer" value={p.zimmer ? String(p.zimmer) : "—"} />
          <ReadField label="Baujahr" value={p.baujahr ? String(p.baujahr) : "—"} />
          <ReadField label="Zustand" value={p.zustand || "—"} />
          <ReadField label="Stockwerk" value={p.stockwerk || "—"} />
          <ReadField label="Energieklasse" value={p.energyClass || "—"} />
        </FieldGrid>
      </AccordionCard>

      <AccordionCard title="Kauf & Nebenkosten">
        <FieldGrid>
          <ReadField label="Kaufpreis" value={fmtEUR(p.kaufpreis)} />
          <ReadField label="Sanierung" value={fmtEUR(p.sanierung)} />
          <ReadField label="Einrichtung" value={fmtEUR(p.einrichtung)} />
          <ReadField label="Reserve" value={fmtEUR(p.reserve)} />
          <ReadField label="Maklerkosten brutto" value={fmtEUR(c.maklerProvisionBrutto)} />
          <ReadField label="Nebenkosten gesamt" value={fmtEUR(c.kaufNebenkosten)} />
          <ReadField label="Gesamtkapital" value={fmtEUR(c.gesamtkosten)} />
          <ReadField label="Nettomiete" value={p.nettomieteMtl ? `${fmtEUR(p.nettomieteMtl)}${p.nettomieteGeschaetzt ? " (geschätzt)" : ""}` : "—"} />
          <ReadField label="Betriebskosten" value={p.betriebskostenMtl != null ? fmtEUR(p.betriebskostenMtl) : "—"} />
        </FieldGrid>
      </AccordionCard>

      <AccordionCard title="Mietrecht-Kurzinfo">
        <FieldGrid>
          <ReadField label="Kategorie" value={mietrecht.kategorie} />
          <ReadField label="Risiko" value={mietrecht.risiko} />
          <ReadField label="Erfasste Einstufung" value={p.mietrecht} />
        </FieldGrid>
        <p className="text-[12px] text-[#78716C] mt-3">{mietrecht.erklaerung}</p>
      </AccordionCard>

      <AccordionCard title="Verkäufer & Makler">
        <FieldGrid>
          <ReadField label="Name" value={p.sellerName || "—"} />
          <ReadField label="Firma" value={p.sellerCompany || "—"} />
          <ReadField label="Typ" value={p.sellerType || "—"} />
          <ReadField label="Telefon" value={p.sellerPhone || "—"} />
          <ReadField label="E-Mail" value={p.sellerEmail || "—"} />
          <ReadField label="Plattform" value={p.platform || (linkValid ? "Link gespeichert" : "—")} />
          <ReadField label="Projekt" value={project || "—"} />
          <ReadField label="Maps" value={mapsUrl ? [p.adresse, p.bezirk, p.city].filter(Boolean).join(", ") || "Verfügbar" : "Adresse fehlt"} />
        </FieldGrid>
      </AccordionCard>
    </>
  );
}

// ============ KALKULATION TAB ============
function KalkulationTab({ p, c, u, projects, regions, applyRegionDefaults, linkValid }: {
  p: Property; c: ReturnType<typeof calcProperty>; u: (patch: Partial<Property>) => void;
  projects: { id: string; name: string }[]; regions: ReturnType<typeof regionsOf>; applyRegionDefaults: () => void; linkValid: boolean;
}) {
  return (
    <>
      {p.status === "Gekauft" && (
        <>
          <Section title="Portfolio · Tatsächliche Kaufdaten"><PurchaseInfoPanel p={p} /></Section>
          <Section title="Zahlungen & Cashflow" defaultOpen><PaymentsPanel p={p} /></Section>
        </>
      )}
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
          <F label="Bezirk / Landkreis"><T value={p.bezirk} edit on={(v) => u({ bezirk: v })} /></F>
          <F label="Adresse / Gegend"><T value={p.adresse} edit on={(v) => u({ adresse: v })} /></F>
          <F label="Google-Maps-URL"><T value={p.googleMapsUrlOverride ?? ""} edit on={(v) => u({ googleMapsUrlOverride: v })} /></F>
          <F label="Wohnfläche m²"><N value={p.wohnflaecheM2} edit on={(v) => u({ wohnflaecheM2: v })} /></F>
          <F label="Zimmer"><N value={p.zimmer} edit on={(v) => u({ zimmer: v })} /></F>
          <F label="Baujahr"><N value={p.baujahr} edit on={(v) => u({ baujahr: v })} /></F>
          <F label="Zustand"><T value={p.zustand} edit on={(v) => u({ zustand: v })} /></F>
          <F label="Stockwerk"><T value={p.stockwerk ?? ""} edit on={(v) => u({ stockwerk: v })} /></F>
          <F label="Energieklasse"><T value={p.energyClass ?? ""} edit on={(v) => u({ energyClass: v })} /></F>
          <F label="HWB"><N value={p.hwb ?? null} edit on={(v) => u({ hwb: v })} /></F>
          <F label="Verfügbarkeit"><T value={p.verfuegbarkeit ?? ""} edit on={(v) => u({ verfuegbarkeit: v })} /></F>
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

      <Section id="sec-kauf-nebenkosten" title="Kauf & Nebenkosten" defaultOpen>
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
          {((p.propertyType ?? "apartment") === "house_with_land"
            || (p.propertyType ?? "apartment") === "house_with_separate_land"
            || (p.propertyType ?? "apartment") === "land_only") && (
            <F label="Grundstücksfläche m²"><N value={p.landAreaSqm ?? null} edit on={(v) => u({ landAreaSqm: v })} /></F>
          )}
          {((p.propertyType ?? "apartment") === "house_with_land"
            || (p.propertyType ?? "apartment") === "house_with_separate_land"
            || (p.propertyType ?? "apartment") === "commercial") && (
            <>
              <F label="Wohnfläche m² (Haus)"><N value={p.livingAreaSqm ?? null} edit on={(v) => u({ livingAreaSqm: v })} /></F>
              <F label="Nutzfläche m²"><N value={p.usableAreaSqm ?? null} edit on={(v) => u({ usableAreaSqm: v })} /></F>
            </>
          )}
          <F label="Sanierung €"><N value={p.sanierung} edit on={(v) => u({ sanierung: v ?? 0 })} /></F>
          <F label="Einrichtung €"><N value={p.einrichtung} edit on={(v) => u({ einrichtung: v ?? 0 })} /></F>
          <F label="Reserve €"><N value={p.reserve} edit on={(v) => u({ reserve: v ?? 0 })} /></F>
          <F label="Betriebskosten €/Mt"><N value={p.betriebskostenMtl ?? null} edit on={(v) => u({ betriebskostenMtl: v })} /></F>
          <F label="Heizkosten €/Mt"><N value={p.heizkostenMtl ?? null} edit on={(v) => u({ heizkostenMtl: v })} /></F>
          <F label="Rücklage Fonds €/Mt"><N value={p.ruecklageFonds ?? null} edit on={(v) => u({ ruecklageFonds: v })} /></F>
          <F label="Nettomiete mtl. €"><N value={p.nettomieteMtl} edit on={(v) => u({ nettomieteMtl: v, nettomieteGeschaetzt: false })} /></F>
          <F label="Miete geschätzt?">
            <label className="flex items-center gap-2 px-3 py-2 border border-[#EAE6DF] rounded-lg bg-white text-sm">
              <input type="checkbox" checked={p.nettomieteGeschaetzt} onChange={(e) => u({ nettomieteGeschaetzt: e.target.checked })} className="accent-[#2D6A4F]" />
              Schätzwert
            </label>
          </F>
        </div>
      </Section>

      <PurchaseCostsDetails p={p} c={c} u={u} />

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
      </Section>

      <Section title="Ausstattung">
        {[
          ["hasElevator", "Lift"],["hasBalkon", "Balkon"],["hasTerrasse", "Terrasse"],
          ["hasLoggia", "Loggia"],["hasGarten", "Garten"],["hasKeller", "Keller"],["hasStellplatz", "Stellplatz"],
        ].map(([key, label]) => (
          <label key={key as string} className="flex items-center justify-between text-sm py-1.5">
            <span>{label}</span>
            <select
              value={(p as any)[key as string] === true ? "ja" : (p as any)[key as string] === false ? "nein" : ""}
              onChange={(e) => u({ [key as string]: e.target.value === "ja" ? true : e.target.value === "nein" ? false : null } as any)}
              className="rounded border border-[#EAE6DF] bg-white px-2 py-1 text-xs"
            >
              <option value="">—</option>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </select>
          </label>
        ))}
      </Section>
    </>
  );
}

// ============ CRM TAB ============
function CrmTab({ p, u, viewings, setViewing }: {
  p: Property; u: (patch: Partial<Property>) => void;
  viewings: Record<string, any>; setViewing: (id: string, key: string, patch: any) => void;
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

      <Section title="Dokumente / Exposé-PDF">
        <PdfUploader propertyId={p.id} />
      </Section>

      <Section title="Offene Fragen für Besichtigung & Prüfung">
        <OpenQuestionsPanel p={p} />
      </Section>
    </>
  );
}

// ============ HELPER COMPONENTS ============
const selectCls = "w-full rounded-lg border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] text-[13px] text-[#1C1917] focus:border-[#2D6A4F] outline-none";

function OverviewStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "#2D6A4F" : tone === "bad" ? "#DC2626" : "#1C1917";
  return (
    <div className="rounded-[10px] border border-[#EAE6DF] bg-white px-[14px] py-3">
      <div className="text-[11px] uppercase tracking-wider text-[#A8A29E] font-medium">{label}</div>
      <div className="mt-1 text-[20px] leading-tight tabular-nums" style={{ ...bricolage, fontWeight: 700, color }}>{value}</div>
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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-[11px] text-[#78716C] mb-1">{label}</div>{children}</label>;
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
    { label: "Kaufpreis & Fläche prüfen (Kalkulation → Objektdaten)", go: () => navTo("kalkulation", "sec-objektdaten") },
    { label: "Erwartete Miete eingeben (Kalkulation → Kauf & Nebenkosten)", go: () => navTo("kalkulation", "sec-kauf-nebenkosten") },
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

