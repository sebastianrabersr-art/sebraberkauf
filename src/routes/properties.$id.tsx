import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useActiveAssumptions, useStore, VIEWING_CHECKLIST } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct, googleMapsUrl, inferMietrecht, isValidUrl } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { CrmPanel } from "@/components/CrmPanel";
import { PdfUploader } from "@/components/PdfUploader";
import { FinancePanel } from "@/components/FinancePanel";
import { ALL_STATUSES, type Mietrecht, type Property, type PropertyStatus } from "@/lib/types";
import { AlertTriangle, ArrowLeft, Copy, ExternalLink, MapPin, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";


export const Route = createFileRoute("/properties/$id")({
  head: ({ params }) => ({ meta: [{ title: `Objekt – Immo Invest` }] }),
  component: Detail,
  notFoundComponent: () => (<AppShell><div className="p-8">Objekt nicht gefunden.</div></AppShell>),
});

const STATUSES: PropertyStatus[] = ALL_STATUSES;
const MIETRECHTE: Mietrecht[] = ["Neubau / freie Miete","Teilanwendung MRG","Vollanwendung MRG","Altbau / Richtwert möglich","Befristung relevant","Gewerbliche Nutzung relevant","Kurzzeitvermietung / Airbnb prüfen","unklar – rechtlich prüfen","nicht geeignet"];

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
            <AmpelBadge ampel={dq.ampel}>DQ {dq.score}% · {dq.level}</AmpelBadge>
            <button
              onClick={openOriginal}
              disabled={!linkValid}
              title={linkValid ? p.link : "Ungültige URL"}
              className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-accent disabled:opacity-50"
            >
              Original-Inserat öffnen <ExternalLink className="size-3.5" />
            </button>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-accent">
                <MapPin className="size-3.5" /> Google Maps
              </a>
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

      {/* Investment Summary – die wichtigsten Kennzahlen ganz oben */}
      <div className="rounded-2xl border bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold">Investment Summary</h2>
          <div className="flex items-center gap-2">
            <AmpelBadge ampel={s.ampel}>Entscheidung: {s.entscheidung}</AmpelBadge>
            <span className="text-xs text-muted-foreground">Status: {p.status}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat label="Kaufpreis (brutto)" value={fmtEUR(p.kaufpreisBrutto ?? p.kaufpreis)} tip="Kaufpreis inkl. USt falls relevant. Wird in Renditen und Nebenkosten verwendet." />
          <Stat label="Kaufpreis netto" value={fmtEUR(p.kaufpreisNetto ?? p.kaufpreis)} tip="Kaufpreis ohne USt (bei gewerblicher Vermietung relevant)." />
          <Stat label="Gesamtkapitalbedarf" value={fmtEUR(c.gesamtkosten)} tip="Kaufpreis + Kaufnebenkosten + Sanierung + Einrichtung + Reserve." />
          <Stat label="Kaufnebenkosten" value={fmtEUR(c.kaufNebenkosten)} hint={`Anteil ${fmtPct(c.gesamtkosten>0 ? c.kaufNebenkosten/c.gesamtkosten:0,1)}`} tip="Grunderwerbsteuer, Eintragung, Vertrag, Finanzierungskosten, Maklerkosten brutto." />
          <Stat label="Maklerkosten brutto" value={fmtEUR(c.maklerProvisionBrutto)} hint={c.maklerKostenZahlbar ? `${fmtPct(c.maklerProvisionPct,2)} + USt ${fmtPct(c.maklerProvisionUstPct,0)}` : "nicht zahlbar"} tone={c.maklerProvisionBrutto > 0 ? "neutral" : undefined} tip="Maklerprovision netto + Umsatzsteuer (Standard 3% + 20% USt)." />
          <Stat label="Eigenkapital" value={fmtEUR(c.eigenkapitalEinsatz)} hint={`Projekt-EK ${fmtEUR(assumptions.eigenkapital)}`} tip="Tatsächlich eingesetztes Eigenkapital." />
          <Stat label="Kreditbedarf" value={fmtEUR(c.kreditBetrag)} hint={`LTV ${fmtPct(c.ltv, 0)}`} tip="Gesamtkapital minus Eigenkapital." />
          <Stat label="Monatliche Rate" value={fmtEUR(c.kreditRateMtl)} hint={`${assumptions.laufzeit} J. @ ${fmtPct(assumptions.zinssatz, 2)}`} tip="Annuitätenrate Kredit pro Monat." />
          <Stat label="Erwartete Miete" value={fmtEUR(p.nettomieteMtl)} hint={p.nettomieteGeschaetzt ? "geschätzt" : "lt. Inserat"} tip="Erzielbare Nettomiete pro Monat." />
          <Stat label="Mindestmiete CF≥0" value={fmtEUR(c.requiredBreakEvenRent)} hint={`${fmtEUR(c.requiredBreakEvenRentPerM2)}/m²`} tone={p.nettomieteMtl && p.nettomieteMtl >= c.requiredBreakEvenRent ? "good" : "bad"} tip="Benötigte Nettomiete für positiven Cashflow inkl. Leerstandspuffer." />
          <Stat label="Cashflow mtl." value={fmtEUR(c.cashflowMtl)} tone={c.cashflowMtl >= 0 ? "good" : "bad"} hint={`${fmtEUR(c.cashflowJahr)}/Jahr`} tip="Miete – Rate – nicht umlagefähige BK – Rücklage – Leerstand." />
          <Stat label="Bruttorendite" value={fmtPct(c.bruttorendite)} tip="Jahresmiete / Kaufpreis." />
          <Stat label="Nettorendite" value={fmtPct(c.nettorendite)} tip="Jahresnettomieten / Gesamtkapitalbedarf." />
          <Stat label="EK-Rendite" value={fmtPct(c.eigenkapitalrendite)} tip="Jahres-Cashflow / eingesetztes Eigenkapital." />
          <Stat label="Preis/m²" value={fmtEUR(c.preisProM2)} tip="Kaufpreis / Wohnfläche." />
          <Stat label="Wohnfläche" value={p.wohnflaecheM2 ? `${p.wohnflaecheM2} m²` : "—"} tip="Nutzbare Wohnfläche laut Inserat." />
          <Stat label="Außenfläche" value={(() => { const x = (p.aussenflaecheM2 ?? 0) + (p.balkonM2 ?? 0) + (p.terrasseM2 ?? 0) + (p.gartenM2 ?? 0); return x > 0 ? `${x} m²` : "—"; })()} tip="Summe aus Balkon, Terrasse, Garten und sonstigen Außenflächen." />
          <Stat label="DSCR" value={c.dscr ? c.dscr.toFixed(2) : "—"} tone={c.dscr >= 1.2 ? "good" : c.dscr < 1 ? "bad" : "neutral"} tip="Debt Service Coverage Ratio: Miete / Rate. ≥1.2 = solide." />
          <Stat label="Score" value={`${s.total}/100`} tone={s.ampel === "green" ? "good" : s.ampel === "red" ? "bad" : "neutral"} tip="Gesamtbewertung aus Lage, Zahlen, Vermietbarkeit, Zustand, Recht, Wiederverkauf." />
          <Stat label="Datenqualität" value={`${dq.score}% · ${dq.level}`} tone={dq.ampel === "green" ? "good" : dq.ampel === "red" ? "bad" : "neutral"} tip="Anteil der ausgefüllten Pflichtfelder." />
          <Stat label="Mietrecht-Risiko" value={mietrecht.kategorie} hint={`Risiko ${mietrecht.risiko}`} tone={mietrecht.risiko === "niedrig" ? "good" : mietrecht.risiko === "hoch" ? "bad" : "neutral"} tip="Automatische Einschätzung aus Baujahr und Beschreibung. Keine Rechtsberatung." />
        </div>

        {/* Warnungen direkt unter den KPIs */}
        {(() => {
          const warns: string[] = [];
          if (mietrechtWarn) warns.push("Mietrecht prüfen (Altbau / unklar)");
          if (dq.score < 70) warns.push(`Daten unvollständig (${dq.missing.slice(0,3).join(", ")}${dq.missing.length>3?", …":""})`);
          if (c.cashflowMtl < 0) warns.push("Cashflow negativ");
          if (c.requiredBreakEvenRentPerM2 > 30) warns.push("Benötigte Miete pro m² unrealistisch hoch (> 30 €/m²)");
          if (c.maklerProvisionBrutto === 0 && p.sellerType !== "Privat" && p.makler !== "Nein") warns.push("Maklerkosten fehlen / nicht erfasst");
          if (p.betriebskostenMtl == null) warns.push("Betriebskosten fehlen");
          if (p.ruecklageFonds == null && p.ruecklageMtl == null) warns.push("Rücklage fehlt");
          if (warns.length === 0) return null;
          return (
            <div className="mt-4 flex flex-wrap gap-2">
              {warns.map((w) => (
                <span key={w} className="inline-flex items-center gap-1 text-xs rounded-full border border-warning/40 bg-warning/10 text-warning-foreground px-2.5 py-1">
                  <AlertTriangle className="size-3" /> {w}
                </span>
              ))}
            </div>
          );
        })()}
      </div>

      {!linkValid && (
        <Alert tone="destructive">
          <strong>Original-URL ist ungültig oder fehlt.</strong> Im Bearbeiten-Modus kannst du sie ergänzen.
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Objektdaten">
            <div className="grid md:grid-cols-3 gap-3">
              <F label="Titel"><T value={p.title} edit={true} on={(v) => u({ title: v })} /></F>
              <F label="Original-Link">
                <T value={p.link} edit={true} on={(v) => u({ link: v })} />
                {!linkValid && p.link && <div className="text-[10px] text-destructive mt-1">Ungültige URL</div>}
              </F>
              <F label="Projekt">
                {true ? (
                  <select value={p.projectId} onChange={(e) => u({ projectId: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                  </select>
                ) : <Ro>{project?.name ?? "—"}</Ro>}
              </F>
              <F label="Bezirk"><T value={p.bezirk} edit={true} on={(v) => u({ bezirk: v })} /></F>
              <F label="Stadt"><T value={p.city ?? ""} edit={true} on={(v) => u({ city: v })} /></F>
              <F label="Adresse / Gegend"><T value={p.adresse} edit={true} on={(v) => u({ adresse: v })} /></F>
              <F label="Wohnfläche m²"><N value={p.wohnflaecheM2} edit={true} on={(v) => u({ wohnflaecheM2: v })} /></F>
              <F label="Zimmer"><N value={p.zimmer} edit={true} on={(v) => u({ zimmer: v })} /></F>
              <F label="Baujahr"><N value={p.baujahr} edit={true} on={(v) => u({ baujahr: v })} /></F>
              <F label="Zustand"><T value={p.zustand} edit={true} on={(v) => u({ zustand: v })} /></F>
              <F label="Stockwerk"><T value={p.stockwerk ?? ""} edit={true} on={(v) => u({ stockwerk: v })} /></F>
              <F label="Energieklasse"><T value={p.energyClass ?? ""} edit={true} on={(v) => u({ energyClass: v })} /></F>
              <F label="HWB"><N value={p.hwb ?? null} edit={true} on={(v) => u({ hwb: v })} /></F>
              <F label="Verfügbarkeit"><T value={p.verfuegbarkeit ?? ""} edit={true} on={(v) => u({ verfuegbarkeit: v })} /></F>
              <F label="Status">
                {true ? (
                  <select value={p.status} onChange={(e) => u({ status: e.target.value as PropertyStatus })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : <Ro>{p.status}</Ro>}
              </F>
              <F label="Makler?">
                {true ? (
                  <select value={p.makler} onChange={(e) => u({ makler: e.target.value as Property["makler"] })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {["Ja","Nein","unklar"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : <Ro>{p.makler}</Ro>}
              </F>
            </div>
          </Section>

          <Section title="Kauf, Miete & Nebenkosten">
            <div className="grid md:grid-cols-3 gap-3">
              <F label="Kaufpreis €"><N value={p.kaufpreis} edit={true} on={(v) => u({ kaufpreis: v })} /></F>
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

          <Section title="Maklerkosten & Kaufnebenkosten">
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

          <Section title="Finanzierung & Bank-Zahlungsplan">
            <FinancePanel p={p} />
          </Section>


          <Section title="Mietrecht & Risiko">
            <div className="grid md:grid-cols-2 gap-3">
              <F label="Mietrechtliche Einschätzung">
                {true ? (
                  <select value={p.mietrecht} onChange={(e) => u({ mietrecht: e.target.value as Mietrecht })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {MIETRECHTE.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : <Ro>{p.mietrecht}</Ro>}
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

          <Section title="CRM · Verkäufer & Follow-up">
            <CrmPanel p={p} edit={true} u={u} />
          </Section>

          <Section title="Mietrecht-Einschätzung (automatisch aus Baujahr / Beschreibung)">
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

          <ViewingChecklist propertyId={p.id} viewings={viewings} setViewing={setViewing} />
        </div>

        <div className="space-y-6">
          <Section title={`Score ${s.total} / 100`}>
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

          <Section title="Offene Fragen für Besichtigung">
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Rücklage der Eigentümergemeinschaft?</li>
              <li>Geplante Sanierungen am Haus?</li>
              <li>Letzte Mieten in der Anlage?</li>
              <li>Mietrechtliche Einstufung schriftlich?</li>
              <li>Versteckte Mängel / Feuchtigkeit?</li>
            </ul>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Stat({ label, value, hint, tone, tip }: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "neutral"; tip?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4" title={tip}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
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
  if (!edit) return <Ro>{value || "—"}</Ro>;
  return <input value={value} onChange={(e) => on(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
function N({ value, on, edit }: { value: number | null | undefined; on: (v: number | null) => void; edit: boolean }) {
  if (!edit) return <Ro>{value ?? "—"}</Ro>;
  return <input type="number" value={value ?? ""} onChange={(e) => on(e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
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
