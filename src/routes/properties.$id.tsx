import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useActiveAssumptions, useStore, VIEWING_CHECKLIST } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct, googleMapsUrl, inferMietrecht, isValidUrl } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { CrmPanel } from "@/components/CrmPanel";
import { PdfUploader } from "@/components/PdfUploader";
import { FinancePanel } from "@/components/FinancePanel";
import { MietrechtRiskCard } from "@/components/MietrechtRiskCard";
import { OpenQuestionsPanel, getImportantOpenQuestions } from "@/components/OpenQuestionsPanel";
import { AdvancedInvestmentPanel } from "@/components/AdvancedInvestmentPanel";
import { ScoreBreakdownCard } from "@/components/ScoreBreakdownCard";
import { ScoreInfo } from "@/components/ScoreInfo";
import { PaymentsPanel } from "@/components/PaymentsPanel";
import { PurchaseInfoPanel } from "@/components/PurchaseInfoPanel";
import { ALL_MIETRECHTE, ALL_STATUSES, PROPERTY_TYPES, type Mietrecht, type Property, type PropertyStatus, type PropertyType } from "@/lib/types";
import { countryOf, regionDefaultsForProperty, regionsOf } from "@/lib/regions";
import { AlertTriangle, ArrowLeft, Copy, ExternalLink, Mail, MapPin, Phone, Trash2, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";


export const Route = createFileRoute("/properties/$id")({
  head: () => ({ meta: [{ title: `Objekt – Immo Invest` }] }),
  component: Detail,
  notFoundComponent: () => (<AppShell><div className="p-8">Objekt nicht gefunden.</div></AppShell>),
});

const STATUSES: PropertyStatus[] = ALL_STATUSES;
const MIETRECHTE: Mietrecht[] = ALL_MIETRECHTE;

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
  const mietrechtWarn = p.mietrecht === "unklar – rechtlich prüfen" || p.mietrecht === "Altbau / Richtwert möglich";
  const mapsUrl = googleMapsUrl(p);
  const mietrecht = inferMietrecht(p);
  const country = countryOf(p.land);
  const regions = country ? regionsOf(country) : [];

  const applyRegionDefaults = () => {
    const d = regionDefaultsForProperty(p);
    if (!d) {
      toast.error("Bitte zuerst Land und Bundesland auswählen.");
      return;
    }
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

  const openOriginal = () => {
    if (!linkValid) {
      toast.error("Kein gültiger Original-Link gespeichert. Bitte URL bearbeiten.");
      return;
    }
    window.open(p.link, "_blank", "noopener,noreferrer");
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
    if (newId) {
      toast.success("Dupliziert.");
      navigate({ to: "/properties/$id", params: { id: newId } });
    }
  };

  return (
    <AppShell>
      <Link to="/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="size-4" /> Zurück zur Datenbank
      </Link>
      <PageHeader
        title={p.title || "Objekt"}
        description={`${project?.name ?? "—"} · ${p.bezirk || "—"} · ${p.platform || "—"} · hinzugefügt ${new Date(p.createdAt).toLocaleDateString("de-AT")}${p.updatedAt ? ` · aktualisiert ${new Date(p.updatedAt).toLocaleDateString("de-AT")}` : ""}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <AmpelBadge ampel={s.ampel}>{s.entscheidung} · Score {s.total}</AmpelBadge>
            <ScoreInfo />
            <AmpelBadge ampel={dq.ampel}>DQ {dq.score}% · {dq.level}</AmpelBadge>
            <button
              onClick={openOriginal}
              disabled={!linkValid}
              title={linkValid ? p.link : "Ungültige URL"}
              className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-accent disabled:opacity-50"
            >
              Original-Inserat öffnen <ExternalLink className="size-3.5" />
            </button>
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-accent">
                <MapPin className="size-3.5" /> In Google Maps öffnen
              </a>
            ) : (
              <button disabled title="Keine Ortsdaten vorhanden" className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 opacity-50 cursor-not-allowed">
                <MapPin className="size-3.5" /> Adresse fehlt
              </button>
            )}
            <span className="text-[11px] text-muted-foreground italic px-2">Felder sind inline editierbar</span>

            <button onClick={onDuplicate} className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-accent">
              <Copy className="size-3.5" /> Duplizieren
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-destructive/10 text-destructive">
              <Trash2 className="size-3.5" /> Löschen
            </button>
          </div>
        }
      />

      {/* Investment Summary – die wichtigsten Zahlen, einfach erklärt */}
      <div className="rounded-2xl border bg-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="font-semibold tracking-tight">Die wichtigsten Zahlen</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Schnelle Einschätzung auf einen Blick</p>
          </div>
          <AmpelBadge ampel={s.ampel}>Einschätzung: {s.entscheidung}</AmpelBadge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <Stat label="Kaufpreis" value={fmtEUR(p.kaufpreisBrutto ?? p.kaufpreis)} tip="Kaufpreis brutto laut Inserat." />
          <Stat label="Kaufnebenkosten" value={fmtEUR(c.kaufNebenkosten)} tip="Grunderwerbsteuer, Grundbuch, Notar/Vertrag, Maklerprovision usw." />
          <Stat label="Gesamtkosten beim Kauf" value={fmtEUR(c.gesamtkosten)} tip="Kaufpreis + Nebenkosten + Sanierung + Einrichtung + Reserve." />
          <Stat label="Monatliche Zahlung" value={fmtEUR(c.kreditRateMtl)} tip="Annuität: monatliche Rate an die Bank (Zins + Tilgung)." />
          <Stat label="Erwartete Miete" value={fmtEUR(p.nettomieteMtl)} hint={p.nettomieteGeschaetzt ? "geschätzt" : "lt. Inserat"} tip="Nettokaltmiete pro Monat." />
          <Stat label="Benötigte Miete" value={fmtEUR(c.requiredBreakEvenRent)} hint={`${fmtEUR(c.requiredBreakEvenRentPerM2)}/m²`} tone={p.nettomieteMtl && p.nettomieteMtl >= c.requiredBreakEvenRent ? "good" : "bad"} tip="Break-even-Miete: ab dieser Miete ist der monatliche Geldfluss positiv." />
          <Stat label="Geldfluss pro Monat" value={fmtEUR(c.cashflowMtl)} tone={c.cashflowMtl >= 0 ? "good" : "bad"} hint={`${fmtEUR(c.cashflowJahr)}/Jahr`} tip="Cashflow: Miete minus Rate, Betriebskosten, Rücklage und Leerstand." />
          <Stat label="Einschätzung" value={`${s.entscheidung}`} hint={`Score ${s.total}/100`} tone={s.ampel === "green" ? "good" : s.ampel === "red" ? "bad" : "neutral"} tip="Gesamtbewertung aus Lage, Zahlen, Vermietbarkeit, Zustand, Recht und Wiederverkauf." />
          <Stat label="Mietrecht-Risiko" value={mietrecht.kategorie} hint={`Risiko ${mietrecht.risiko}`} tone={mietrecht.risiko === "niedrig" ? "good" : mietrecht.risiko === "hoch" ? "bad" : "neutral"} tip="Automatische Einschätzung aus Baujahr und Beschreibung." />
        </div>


        {/* Warnungen: nur die wichtigsten 3 zeigen, Rest einklappbar */}
        {(() => {
          const warns: { text: string; critical: boolean }[] = [];
          if (c.cashflowMtl < 0) warns.push({ text: "Cashflow negativ", critical: true });
          if (mietrechtWarn) warns.push({ text: "Mietrecht prüfen (Altbau / unklar)", critical: true });
          if (dq.score < 70) warns.push({ text: `Daten unvollständig (${dq.missing.slice(0, 2).join(", ")}${dq.missing.length > 2 ? "…" : ""})`, critical: false });
          if (c.requiredBreakEvenRentPerM2 > 30) warns.push({ text: "Benötigte Miete pro m² unrealistisch hoch", critical: true });
          if (c.maklerProvisionBrutto === 0 && p.sellerType !== "Privat" && p.makler !== "Nein") warns.push({ text: "Maklerkosten fehlen / nicht erfasst", critical: false });
          if (p.betriebskostenMtl == null) warns.push({ text: "Betriebskosten fehlen", critical: false });
          if (p.ruecklageFonds == null && p.ruecklageMtl == null) warns.push({ text: "Rücklage fehlt", critical: false });
          const importantQs = getImportantOpenQuestions(p);
          importantQs.forEach((q) => warns.push({ text: `Offene Frage (${q.category}): ${q.text}`, critical: false }));
          if (warns.length === 0) return null;
          const top = warns.slice(0, 3);
          const rest = warns.slice(3);
          return (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {top.map((w, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 text-xs rounded-full border px-3 py-1 ${w.critical ? "border-destructive/30 bg-destructive/8 text-destructive" : "border-border bg-muted/60 text-muted-foreground"}`}>
                    <AlertTriangle className="size-3" /> {w.text}
                  </span>
                ))}
              </div>
              {rest.length > 0 && (
                <details className="mt-2 group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground inline-block">
                    +{rest.length} weitere Hinweise
                  </summary>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {rest.map((w, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs rounded-full border border-border bg-muted/40 text-muted-foreground px-3 py-1">
                        {w.text}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })()}


        {/* Quick facts: Verkäufer, Original-Link, Maps, nächste Aktion */}
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t pt-4">
          <QuickFact label="Verkäufer/Makler" value={p.sellerName || p.sellerCompany || "—"}
            hint={[p.sellerType, p.sellerPhone, p.sellerEmail].filter(Boolean).join(" · ") || undefined}
            actions={
              <>
                {p.sellerPhone && <a href={`tel:${p.sellerPhone}`} className="text-xs inline-flex items-center gap-1 text-primary"><Phone className="size-3" />Anruf</a>}
                {p.sellerEmail && <a href={`mailto:${p.sellerEmail}`} className="text-xs inline-flex items-center gap-1 text-primary"><Mail className="size-3" />E-Mail</a>}
              </>
            }
          />
          <QuickFact label="Original-Inserat" value={p.platform || (linkValid ? "Link gespeichert" : "—")}
            actions={linkValid ? (
              <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1 text-primary">Öffnen <ExternalLink className="size-3" /></a>
            ) : <span className="text-xs text-destructive">URL fehlt/ungültig</span>}
          />
          <QuickFact label="Google Maps" value={[p.adresse, p.bezirk, p.city].filter(Boolean).join(", ") || "—"}
            actions={mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1 text-primary">In Maps öffnen <MapPin className="size-3" /></a>
            ) : <span className="text-xs text-muted-foreground">Adresse fehlt</span>}
          />
          <QuickFact label="Nächste Aktion" value={p.nextAction || "—"}
            hint={p.nextActionDate ? `bis ${new Date(p.nextActionDate).toLocaleDateString("de-AT")}` : undefined}
          />
        </div>
      </div>

      {/* Mietrechtliche Einschätzung – prominent direkt unter Investment Summary */}
      <div className="mb-6">
        <MietrechtRiskCard p={p} />
      </div>

      {!linkValid && (
        <Alert tone="destructive">
          <strong>Original-URL ist ungültig oder fehlt.</strong> Im Bearbeiten-Modus kannst du sie ergänzen.
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {p.status === "Gekauft" && (
            <>
              <Section title="Portfolio · Tatsächliche Kaufdaten">
                <PurchaseInfoPanel p={p} />
              </Section>
              <Section title="Zahlungen & Cashflow" defaultOpen>
                <PaymentsPanel p={p} />
              </Section>
            </>
          )}
          <Section title="Objektdaten">
            <div className="grid md:grid-cols-3 gap-3">
              <F label="Titel"><T value={p.title} edit={true} on={(v) => u({ title: v })} /></F>
              <F label="Original-Link">
                <T value={p.link} edit={true} on={(v) => u({ link: v })} />
                {!linkValid && p.link && <div className="text-[10px] text-destructive mt-1">Ungültige URL</div>}
              </F>
              <F label="Projekt">
                <select value={p.projectId} onChange={(e) => u({ projectId: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                  </select>
              </F>
              <F label="Land">
                <select value={p.land ?? ""} onChange={(e) => u({ land: e.target.value, bundesland: "" })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">—</option>
                  <option value="Österreich">Österreich</option>
                  <option value="Deutschland">Deutschland</option>
                </select>
              </F>
              <F label="Bundesland / Region">
                {regions.length > 0 ? (
                  <select value={p.bundesland ?? ""} onChange={(e) => u({ bundesland: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value="">—</option>
                    {regions.map((r) => <option key={r.code} value={r.name}>{r.name}</option>)}
                  </select>
                ) : (
                  <T value={p.bundesland ?? ""} edit={true} on={(v) => u({ bundesland: v })} />
                )}
              </F>
              <F label="Stadt"><T value={p.city ?? ""} edit={true} on={(v) => u({ city: v })} /></F>
              <F label="Bezirk / Landkreis"><T value={p.bezirk} edit={true} on={(v) => u({ bezirk: v })} /></F>
              <F label="Adresse / Gegend"><T value={p.adresse} edit={true} on={(v) => u({ adresse: v })} /></F>
              <F label="Google-Maps-URL (optional, überschreibt automatisch)"><T value={p.googleMapsUrlOverride ?? ""} edit={true} on={(v) => u({ googleMapsUrlOverride: v })} /></F>
              <F label="Wohnfläche m²"><N value={p.wohnflaecheM2} edit={true} on={(v) => u({ wohnflaecheM2: v })} /></F>
              <F label="Zimmer"><N value={p.zimmer} edit={true} on={(v) => u({ zimmer: v })} /></F>
              <F label="Baujahr"><N value={p.baujahr} edit={true} on={(v) => u({ baujahr: v })} /></F>
              <F label="Zustand"><T value={p.zustand} edit={true} on={(v) => u({ zustand: v })} /></F>
              <F label="Stockwerk"><T value={p.stockwerk ?? ""} edit={true} on={(v) => u({ stockwerk: v })} /></F>
              <F label="Energieklasse"><T value={p.energyClass ?? ""} edit={true} on={(v) => u({ energyClass: v })} /></F>
              <F label="HWB"><N value={p.hwb ?? null} edit={true} on={(v) => u({ hwb: v })} /></F>
              <F label="Verfügbarkeit"><T value={p.verfuegbarkeit ?? ""} edit={true} on={(v) => u({ verfuegbarkeit: v })} /></F>
              <F label="Status">
                <select value={p.status} onChange={(e) => u({ status: e.target.value as PropertyStatus })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
              </F>
              <F label="Makler?">
                <select value={p.makler} onChange={(e) => u({ makler: e.target.value as Property["makler"] })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {["Ja","Nein","unklar"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
              </F>
            </div>
          </Section>

          <Section title="Kauf & Nebenkosten" defaultOpen>
            <div className="grid md:grid-cols-3 gap-3">
              <F label="Objektart">
                <select
                  value={p.propertyType ?? "apartment"}
                  onChange={(e) => u({ propertyType: e.target.value as PropertyType })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {PROPERTY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </F>
              {(p.propertyType ?? "apartment") === "house_with_separate_land" ? (
                <>
                  <F label="Kaufpreis Haus €"><N value={p.housePurchasePrice ?? null} edit={true} on={(v) => {
                    const land = p.landPurchasePrice ?? 0;
                    const sum = (v ?? 0) + land;
                    u({ housePurchasePrice: v, totalPurchasePrice: sum || null, kaufpreis: sum || p.kaufpreis });
                  }} /></F>
                  <F label="Kaufpreis Grundstück €"><N value={p.landPurchasePrice ?? null} edit={true} on={(v) => {
                    const haus = p.housePurchasePrice ?? 0;
                    const sum = haus + (v ?? 0);
                    u({ landPurchasePrice: v, totalPurchasePrice: sum || null, kaufpreis: sum || p.kaufpreis });
                  }} /></F>
                  <F label="Gesamtkaufpreis €"><Ro>{fmtEUR((p.housePurchasePrice ?? 0) + (p.landPurchasePrice ?? 0))}</Ro></F>
                </>
              ) : (
                <F label={(p.propertyType ?? "apartment") === "land_only" ? "Kaufpreis Grundstück €" : "Kaufpreis €"}>
                  <N value={p.kaufpreis} edit={true} on={(v) => u({ kaufpreis: v })} />
                </F>
              )}
              {((p.propertyType ?? "apartment") === "house_with_land"
                || (p.propertyType ?? "apartment") === "house_with_separate_land"
                || (p.propertyType ?? "apartment") === "land_only") && (
                <F label="Grundstücksfläche m²"><N value={p.landAreaSqm ?? null} edit={true} on={(v) => u({ landAreaSqm: v })} /></F>
              )}
              {((p.propertyType ?? "apartment") === "house_with_land"
                || (p.propertyType ?? "apartment") === "house_with_separate_land"
                || (p.propertyType ?? "apartment") === "commercial") && (
                <>
                  <F label="Wohnfläche m² (Haus)"><N value={p.livingAreaSqm ?? null} edit={true} on={(v) => u({ livingAreaSqm: v })} /></F>
                  <F label="Nutzfläche m²"><N value={p.usableAreaSqm ?? null} edit={true} on={(v) => u({ usableAreaSqm: v })} /></F>
                </>
              )}
              {(p.propertyType ?? "apartment") === "commercial" && (
                <div className="md:col-span-3 text-xs text-muted-foreground border-l-2 border-warning pl-3">
                  Hinweis: Steuer- und Mietrechtsannahmen sind für Gewerbeimmobilien vereinfacht – bitte gesondert prüfen.
                </div>
              )}
              {(p.propertyType ?? "apartment") === "land_only" && (
                <div className="md:col-span-3 text-xs text-muted-foreground border-l-2 border-warning pl-3">
                  Hinweis: Bei reinem Grundstück wird keine Rendite berechnet, solange keine Miete oder ein Verkaufsszenario eingetragen ist.
                </div>
              )}
              <F label="Sanierung €"><N value={p.sanierung} edit={true} on={(v) => u({ sanierung: v ?? 0 })} /></F>
              <F label="Einrichtung €"><N value={p.einrichtung} edit={true} on={(v) => u({ einrichtung: v ?? 0 })} /></F>
              <F label="Reserve €"><N value={p.reserve} edit={true} on={(v) => u({ reserve: v ?? 0 })} /></F>
              <F label="Betriebskosten €/Mt"><N value={p.betriebskostenMtl ?? null} edit={true} on={(v) => u({ betriebskostenMtl: v })} /></F>
              <F label="Heizkosten €/Mt"><N value={p.heizkostenMtl ?? null} edit={true} on={(v) => u({ heizkostenMtl: v })} /></F>
              <F label="Rücklage Fonds €/Mt"><N value={p.ruecklageFonds ?? null} edit={true} on={(v) => u({ ruecklageFonds: v })} /></F>
              <F label="Nettomiete mtl. €"><N value={p.nettomieteMtl} edit={true} on={(v) => u({ nettomieteMtl: v, nettomieteGeschaetzt: false })} /></F>
              <F label="Miete geschätzt?">
                <label className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background text-sm">
                  <input type="checkbox" checked={p.nettomieteGeschaetzt} onChange={(e) => u({ nettomieteGeschaetzt: e.target.checked })} />
                  Schätzwert
                </label>
              </F>
            </div>
          </Section>

          <Section title="Detaillierte Kaufnebenkosten & Maklerkosten" actions={
            <button onClick={applyRegionDefaults} type="button"
              className="inline-flex items-center gap-1 text-xs border rounded-md px-2.5 py-1 hover:bg-accent">
              <Wand2 className="size-3.5" /> Standardwerte für Region übernehmen
            </button>
          }>
            <div className="grid md:grid-cols-3 gap-3">
              <F label="Maklerprovision %">
                <N value={c.maklerProvisionPct ? c.maklerProvisionPct * 100 : (p.provisionPct != null ? p.provisionPct * 100 : null)} edit={true} on={(v) => u({ provisionPct: v == null ? null : v / 100, provisionLastEdit: "pct", provisionEUR: null, provisionBruttoEUR: null })} />
              </F>
              <F label="Maklerprovision netto €">
                <N value={p.provisionLastEdit === "netto" ? (p.provisionEUR ?? null) : c.maklerProvisionNetto} edit={true} on={(v) => u({ provisionEUR: v, provisionLastEdit: "netto", provisionPct: null, provisionBruttoEUR: null })} />
              </F>
              <F label="Maklerprovision brutto €">
                <N value={p.provisionLastEdit === "brutto" ? (p.provisionBruttoEUR ?? null) : c.maklerProvisionBrutto} edit={true} on={(v) => u({ provisionBruttoEUR: v, provisionLastEdit: "brutto", provisionPct: null, provisionEUR: null })} />
              </F>
              <F label="USt auf Provision %">
                <N value={(p.maklerprovisionUstPct ?? 0.20) * 100} edit={true} on={(v) => u({ maklerprovisionUstPct: v == null ? null : v / 100 })} />
              </F>
              <F label="Maklerprovision USt €"><Ro>{fmtEUR(c.maklerProvisionUst)}</Ro></F>
              <F label="Berechnungsbasis">
                <select value={p.provisionBasis ?? "brutto"} onChange={(e) => u({ provisionBasis: e.target.value as "netto" | "brutto" })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="brutto">Kaufpreis brutto</option>
                  <option value="netto">Kaufpreis netto</option>
                </select>
              </F>
              <F label="Maklerkosten zahlbar?">
                <select
                  value={p.maklerkostenZahlbar == null ? "auto" : p.maklerkostenZahlbar ? "ja" : "nein"}
                  onChange={(e) => u({ maklerkostenZahlbar: e.target.value === "auto" ? null : e.target.value === "ja" })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="auto">Automatisch ({c.maklerKostenZahlbar ? "Ja" : "Nein"})</option>
                  <option value="ja">Ja</option>
                  <option value="nein">Nein</option>
                </select>
              </F>
              <F label="Grunderwerbsteuer €"><N value={p.grunderwerbsteuer ?? null} edit={true} on={(v) => u({ grunderwerbsteuer: v })} /></F>
              <F label="Grundbucheintragung €"><N value={p.grundbuchkosten ?? null} edit={true} on={(v) => u({ grundbuchkosten: v })} /></F>
              <F label="Vertragskosten €"><N value={p.vertragskosten ?? null} edit={true} on={(v) => u({ vertragskosten: v })} /></F>
              <F label="Finanzierungskosten €"><N value={p.finanzierungskosten ?? null} edit={true} on={(v) => u({ finanzierungskosten: v })} /></F>
              <F label="Sonstige NK €"><N value={p.sonstigeNK ?? null} edit={true} on={(v) => u({ sonstigeNK: v })} /></F>
              <F label="Kaufnebenkosten gesamt €"><Ro>{fmtEUR(c.kaufNebenkosten)}</Ro></F>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Bidirektional: ändere %, netto oder brutto – die anderen Werte werden automatisch berechnet. Das zuletzt bearbeitete Feld ({p.provisionLastEdit ?? "pct"}) ist die Quelle der Wahrheit.
            </p>
          </Section>

          <Section title="Finanzierung & Bank" defaultOpen>
            <FinancePanel p={p} />
          </Section>

          <Section title="Risiken & Mietrecht">

            <div className="grid md:grid-cols-2 gap-3">
              <F label="Mietrechtliche Einschätzung">
                <select value={p.mietrecht} onChange={(e) => u({ mietrecht: e.target.value as Mietrecht })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {MIETRECHTE.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
              </F>
              <F label="Fehlende Daten (komma-getrennt)">
                <T value={p.missingData.join(", ")} edit={true} on={(v) => u({ missingData: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
              </F>
            </div>
            <div className="grid md:grid-cols-3 gap-3 mt-4">
              <Stat label="Cashflow @ +Zins" value={fmtEUR(c.cashflowStressZins)} tone={c.cashflowStressZins < 0 ? "bad" : "neutral"} hint={`+${fmtPct(assumptions.zinsStress,1)}`} />
              <Stat label="Cashflow @ Leerstand" value={fmtEUR(c.cashflowStressLeerstand)} tone={c.cashflowStressLeerstand < 0 ? "bad" : "neutral"} hint={`${assumptions.leerstandStressMonate} Mo./J`} />
              <Stat label="Cashflow @ Reparatur" value={fmtEUR(c.cashflowStressReparatur)} tone={c.cashflowStressReparatur < 0 ? "bad" : "neutral"} hint={fmtEUR(assumptions.reparaturStress)} />
              <Stat label="Max. Kaufpreis @ Ziel-Brutto" value={fmtEUR(c.maxKaufpreisZielRendite)} hint={fmtPct(assumptions.zielBrutto)} />
            </div>
          </Section>

          <Section title="Beschreibung & Notizen">
            <textarea
              value={p.beschreibung ?? ""}
             
              onChange={(e) => u({ beschreibung: e.target.value })}
              rows={3}
              placeholder="Beschreibung aus dem Inserat…"
              className="w-full rounded-md border bg-background p-3 text-sm disabled:opacity-80"
            />
            <textarea
              value={p.notizen}
             
              onChange={(e) => u({ notizen: e.target.value })}
              rows={4}
              placeholder="Eigene Notizen…"
              className="w-full rounded-md border bg-background p-3 text-sm mt-3 disabled:opacity-80"
            />
          </Section>

          <Section title="Verkäufer & Makler">
            <CrmPanel p={p} edit={true} u={u} />
          </Section>

          <Section title="Mietrecht – ausführliche Einschätzung">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Kategorie</span>
                <AmpelBadge ampel={mietrecht.risiko === "niedrig" ? "green" : mietrecht.risiko === "mittel" ? "yellow" : "red"}>{mietrecht.kategorie} · Risiko {mietrecht.risiko}</AmpelBadge>
              </div>
              <p className="text-sm text-muted-foreground">{mietrecht.erklaerung}</p>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Vor Kauf prüfen</div>
                <ul className="list-disc list-inside text-sm">
                  {mietrecht.pruefen.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
              <p className="text-[11px] text-muted-foreground border-t pt-2">Hinweis: Keine Rechtsberatung. Verbindliche Einstufung nur durch Fachperson / Anwalt.</p>
            </div>
          </Section>

          <Section title="Dokumente / Exposé-PDF">
            <PdfUploader propertyId={p.id} />
          </Section>

          <Section title="Aktivitäten / Verlauf">
            <ActivitiesPanel propertyId={p.id} />
          </Section>

          <Section title="Advanced: AfA, Projektion & Anschlussfinanzierung">
            <AdvancedInvestmentPanel p={p} />
          </Section>


          <ViewingChecklist propertyId={p.id} viewings={viewings} setViewing={setViewing} />
        </div>

        <div className="space-y-6">
          <ScoreBreakdownCard p={p} />

          <Section title={`Score-Slider (manuell anpassen) – ${s.total} / 100`}>
            <ScoreRow label="Lage" max={25} value={p.scoreLage} onChange={(v) => true && u({ scoreLage: v })} />
            <ScoreRow label="Zahlen / Rendite" max={25} value={s.zahlen} readonly />
            <ScoreRow label="Vermietbarkeit" max={20} value={p.scoreVermietbarkeit} onChange={(v) => true && u({ scoreVermietbarkeit: v })} />
            <ScoreRow label="Zustand" max={15} value={p.scoreZustand} onChange={(v) => true && u({ scoreZustand: v })} />
            <ScoreRow label="Mietrecht" max={10} value={p.scoreRecht} onChange={(v) => true && u({ scoreRecht: v })} />
            <ScoreRow label="Wiederverkauf" max={5} value={p.scoreWiederverkauf} onChange={(v) => true && u({ scoreWiederverkauf: v })} />
            <div className="border-t mt-3 pt-3 flex justify-between text-sm">
              <span className="font-medium">Entscheidung</span>
              <AmpelBadge ampel={s.ampel}>{s.entscheidung}</AmpelBadge>
            </div>
          </Section>

          <Section title={`Datenqualität ${dq.score}% – ${dq.level}`}>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
              <div className={`h-full ${dq.ampel === "green" ? "bg-success" : dq.ampel === "yellow" ? "bg-warning" : "bg-destructive"}`} style={{ width: `${dq.score}%` }} />
            </div>
            <div className="text-xs text-muted-foreground">{dq.filled} von {dq.total} Pflichtfeldern ausgefüllt.</div>
            {dq.missing.length > 0 && (
              <ul className="text-xs mt-2 space-y-0.5">
                {dq.missing.map((m) => <li key={m}>• {m}</li>)}
              </ul>
            )}
          </Section>

          <Section title="Ausstattung">
            {[
              ["hasElevator", "Lift"],
              ["hasBalkon", "Balkon"],
              ["hasTerrasse", "Terrasse"],
              ["hasLoggia", "Loggia"],
              ["hasGarten", "Garten"],
              ["hasKeller", "Keller"],
              ["hasStellplatz", "Stellplatz"],
            ].map(([key, label]) => (
              <label key={key as string} className="flex items-center justify-between text-sm py-1.5">
                <span>{label}</span>
                <select
                 
                  value={(p as any)[key as string] === true ? "ja" : (p as any)[key as string] === false ? "nein" : ""}
                  onChange={(e) => u({ [key as string]: e.target.value === "ja" ? true : e.target.value === "nein" ? false : null } as any)}
                  className="rounded border bg-background px-2 py-1 text-xs"
                >
                  <option value="">—</option>
                  <option value="ja">Ja</option>
                  <option value="nein">Nein</option>
                </select>
              </label>
            ))}
          </Section>

          <Section title="Offene Fragen für Besichtigung & Prüfung">
            <OpenQuestionsPanel p={p} />
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function ViewingChecklist({ propertyId, viewings, setViewing }: { propertyId: string; viewings: Record<string, any>; setViewing: (id: string, key: string, patch: any) => void }) {
  const cur = viewings[propertyId]?.checks ?? {};
  const groups: Record<string, typeof VIEWING_CHECKLIST> = {};
  VIEWING_CHECKLIST.forEach((c) => { (groups[c.group] ??= []).push(c); });
  const done = Object.values(cur).filter((c: any) => c.done).length;
  return (
    <Section title={`Besichtigungs-Checkliste (${done}/${VIEWING_CHECKLIST.length})`}>
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{group}</div>
            <div className="space-y-2">
              {items.map((item) => {
                const v = cur[item.key] ?? { done: false, note: "" };
                return (
                  <div key={item.key} className="border-b last:border-0 pb-2 last:pb-0">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={v.done} onChange={(e) => setViewing(propertyId, item.key, { done: e.target.checked })} />
                      {item.label}
                    </label>
                    <input
                      type="text"
                      placeholder="Notiz…"
                      value={v.note}
                      onChange={(e) => setViewing(propertyId, item.key, { note: e.target.value })}
                      className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Section({ title, children, actions, defaultOpen = false }: { title: string; children: React.ReactNode; actions?: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border bg-card overflow-hidden">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none hover:bg-muted/30 transition-colors [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="size-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <h3 className="font-semibold text-sm tracking-tight truncate">{title}</h3>
        </div>
        {actions && <div onClick={(e) => e.preventDefault()}>{actions}</div>}
      </summary>
      <div className="px-5 pb-5 pt-1 border-t bg-card">{children}</div>
    </details>
  );
}
function Stat({ label, value, hint, tone, tip }: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "neutral"; tip?: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3.5" title={tip}>
      <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold mt-1 tabular-nums ${tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function QuickFact({ label, value, hint, actions }: { label: string; value: string; hint?: string; actions?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5 truncate" title={value}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5 truncate" title={hint}>{hint}</div>}
      {actions && <div className="mt-1.5 flex items-center gap-3">{actions}</div>}
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</label>;
}
function Ro({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm min-h-[36px]">{children}</div>;
}
function T({ value, on, edit }: { value: string; on: (v: string) => void; edit: boolean }) {
  const [local, setLocal] = useState(value);
  const originalRef = useRef(value);
  useEffect(() => { setLocal(value); originalRef.current = value; }, [value]);
  if (!edit) return <Ro>{value || "—"}</Ro>;
  const commit = () => {
    if (local !== originalRef.current) {
      on(local);
      originalRef.current = local;
      toast.success("Gespeichert", { duration: 900 });
    }
  };
  return (
    <input
      value={local}
      placeholder="—"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
        else if (e.key === "Escape") { setLocal(originalRef.current); (e.target as HTMLInputElement).blur(); }
      }}
      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
    />
  );
}
function N({ value, on, edit }: { value: number | null | undefined; on: (v: number | null) => void; edit: boolean }) {
  const [local, setLocal] = useState<string>(value == null ? "" : String(value));
  const originalRef = useRef<string>(value == null ? "" : String(value));
  useEffect(() => {
    const s = value == null ? "" : String(value);
    setLocal(s); originalRef.current = s;
  }, [value]);
  if (!edit) return <Ro>{value ?? "—"}</Ro>;
  const commit = () => {
    if (local === originalRef.current) return;
    if (local !== "" && isNaN(Number(local))) {
      toast.error("Ungültige Zahl");
      setLocal(originalRef.current);
      return;
    }
    on(local === "" ? null : Number(local));
    originalRef.current = local;
    toast.success("Gespeichert", { duration: 900 });
  };
  return (
    <input
      type="number"
      value={local}
      placeholder="—"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
        else if (e.key === "Escape") { setLocal(originalRef.current); (e.target as HTMLInputElement).blur(); }
      }}
      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
    />
  );
}

function Alert({ children, tone = "warning" }: { children: React.ReactNode; tone?: "warning" | "destructive" }) {
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-lg border p-4 text-sm ${tone === "destructive" ? "border-destructive/40 bg-destructive/10" : "border-warning/40 bg-warning/10"}`}>
      <AlertTriangle className="size-4 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}
function ScoreRow({ label, max, value, onChange, readonly, disabled }: { label: string; max: number; value: number; onChange?: (v: number) => void; readonly?: boolean; disabled?: boolean }) {
  return (
    <div className="py-1.5">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">{Math.round(value * 10) / 10} / {max}</span>
      </div>
      {readonly ? (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(value / max) * 100}%` }} /></div>
      ) : (
        <input type="range" min={0} max={max} value={value} disabled={disabled} onChange={(e) => onChange?.(Number(e.target.value))} className="w-full disabled:opacity-50" />
      )}
    </div>
  );
}
