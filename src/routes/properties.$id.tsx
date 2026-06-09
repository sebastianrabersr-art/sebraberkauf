import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useActiveAssumptions, useStore, VIEWING_CHECKLIST } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct, googleMapsUrl, inferMietrecht, isValidUrl } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { CrmPanel } from "@/components/CrmPanel";
import { PdfUploader } from "@/components/PdfUploader";
import { ALL_STATUSES, type Mietrecht, type Property, type PropertyStatus } from "@/lib/types";
import { AlertTriangle, ArrowLeft, Copy, ExternalLink, MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
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

  const [editMode, setEditMode] = useState(false);
  const c = calcProperty(p, assumptions);
  const s = calcScore(p, assumptions, c);
  const dq = calcDataQuality(p);
  const project = projects.find((x) => x.id === p.projectId);
  const u = (patch: Partial<Property>) => updateProperty(p.id, patch);

  const linkValid = isValidUrl(p.link);
  const mietrechtWarn = p.mietrecht === "unklar – rechtlich prüfen" || p.mietrecht === "Altbau / Richtwert möglich";

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
            <button onClick={() => setEditMode((v) => !v)} className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-accent">
              <Pencil className="size-3.5" /> {editMode ? "Fertig" : "Bearbeiten"}
            </button>
            <button onClick={onDuplicate} className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-accent">
              <Copy className="size-3.5" /> Duplizieren
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-destructive/10 text-destructive">
              <Trash2 className="size-3.5" /> Löschen
            </button>
          </div>
        }
      />

      {mietrechtWarn && (
        <Alert>
          <strong>Mietrecht vor Kauf prüfen.</strong> Bei Altbau / unklarer Einstufung ist rechtliche Prüfung empfohlen.
        </Alert>
      )}
      {dq.score < 50 && (
        <Alert tone="destructive">
          <strong>Wichtige Daten fehlen</strong> – bitte Immobilie manuell ergänzen. Fehlend: {dq.missing.join(", ")}.
        </Alert>
      )}
      {!linkValid && (
        <Alert tone="destructive">
          <strong>Original-URL ist ungültig oder fehlt.</strong> Im Bearbeiten-Modus kannst du sie ergänzen.
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        <Stat label="Kaufpreis" value={fmtEUR(p.kaufpreis)} />
        <Stat label="Kaufnebenkosten" value={fmtEUR(c.kaufNebenkosten)} hint={`NK ${fmtPct(c.nebenkostenPct, 1)}`} />
        <Stat label="Gesamtkapital" value={fmtEUR(c.gesamtkosten)} />
        <Stat label="Eigenkapital" value={fmtEUR(c.eigenkapitalEinsatz)} hint={`Projekt-EK ${fmtEUR(assumptions.eigenkapital)}`} />
        <Stat label="Kredit" value={fmtEUR(c.kreditBetrag)} hint={`LTV ${fmtPct(c.ltv, 0)}`} />
        <Stat label="Rate mtl." value={fmtEUR(c.kreditRateMtl)} hint={`${assumptions.laufzeit} J. @ ${fmtPct(assumptions.zinssatz, 2)}`} />
        <Stat label="Miete mtl." value={fmtEUR(p.nettomieteMtl)} hint={p.nettomieteGeschaetzt ? "geschätzt" : "Inserat"} />
        <Stat label="Jahresmiete" value={fmtEUR((p.nettomieteMtl ?? 0) * 12)} />
        <Stat label="Cashflow" value={fmtEUR(c.cashflowMtl)} tone={c.cashflowMtl >= 0 ? "good" : "bad"} hint={`${fmtEUR(c.cashflowJahr)}/Jahr`} />
        <Stat label="Bruttorendite" value={fmtPct(c.bruttorendite)} />
        <Stat label="Nettorendite" value={fmtPct(c.nettorendite)} />
        <Stat label="EK-Rendite" value={fmtPct(c.eigenkapitalrendite)} />
        <Stat label="Preis/m²" value={fmtEUR(c.preisProM2)} />
        <Stat label="DSCR" value={c.dscr ? c.dscr.toFixed(2) : "—"} />
        <Stat label="Break-even Miete" value={fmtEUR(c.breakEvenMiete)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Objektdaten">
            <div className="grid md:grid-cols-3 gap-3">
              <F label="Titel"><T value={p.title} edit={editMode} on={(v) => u({ title: v })} /></F>
              <F label="Original-Link">
                <T value={p.link} edit={editMode} on={(v) => u({ link: v })} />
                {!linkValid && p.link && <div className="text-[10px] text-destructive mt-1">Ungültige URL</div>}
              </F>
              <F label="Projekt">
                {editMode ? (
                  <select value={p.projectId} onChange={(e) => u({ projectId: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                  </select>
                ) : <Ro>{project?.name ?? "—"}</Ro>}
              </F>
              <F label="Bezirk"><T value={p.bezirk} edit={editMode} on={(v) => u({ bezirk: v })} /></F>
              <F label="Stadt"><T value={p.city ?? ""} edit={editMode} on={(v) => u({ city: v })} /></F>
              <F label="Adresse / Gegend"><T value={p.adresse} edit={editMode} on={(v) => u({ adresse: v })} /></F>
              <F label="Wohnfläche m²"><N value={p.wohnflaecheM2} edit={editMode} on={(v) => u({ wohnflaecheM2: v })} /></F>
              <F label="Zimmer"><N value={p.zimmer} edit={editMode} on={(v) => u({ zimmer: v })} /></F>
              <F label="Baujahr"><N value={p.baujahr} edit={editMode} on={(v) => u({ baujahr: v })} /></F>
              <F label="Zustand"><T value={p.zustand} edit={editMode} on={(v) => u({ zustand: v })} /></F>
              <F label="Stockwerk"><T value={p.stockwerk ?? ""} edit={editMode} on={(v) => u({ stockwerk: v })} /></F>
              <F label="Energieklasse"><T value={p.energyClass ?? ""} edit={editMode} on={(v) => u({ energyClass: v })} /></F>
              <F label="HWB"><N value={p.hwb ?? null} edit={editMode} on={(v) => u({ hwb: v })} /></F>
              <F label="Verfügbarkeit"><T value={p.verfuegbarkeit ?? ""} edit={editMode} on={(v) => u({ verfuegbarkeit: v })} /></F>
              <F label="Status">
                {editMode ? (
                  <select value={p.status} onChange={(e) => u({ status: e.target.value as PropertyStatus })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : <Ro>{p.status}</Ro>}
              </F>
              <F label="Makler?">
                {editMode ? (
                  <select value={p.makler} onChange={(e) => u({ makler: e.target.value as Property["makler"] })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {["Ja","Nein","unklar"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : <Ro>{p.makler}</Ro>}
              </F>
            </div>
          </Section>

          <Section title="Kauf, Miete & Nebenkosten">
            <div className="grid md:grid-cols-3 gap-3">
              <F label="Kaufpreis €"><N value={p.kaufpreis} edit={editMode} on={(v) => u({ kaufpreis: v })} /></F>
              <F label="Sanierung €"><N value={p.sanierung} edit={editMode} on={(v) => u({ sanierung: v ?? 0 })} /></F>
              <F label="Einrichtung €"><N value={p.einrichtung} edit={editMode} on={(v) => u({ einrichtung: v ?? 0 })} /></F>
              <F label="Reserve €"><N value={p.reserve} edit={editMode} on={(v) => u({ reserve: v ?? 0 })} /></F>
              <F label="Betriebskosten €/Mt"><N value={p.betriebskostenMtl ?? null} edit={editMode} on={(v) => u({ betriebskostenMtl: v })} /></F>
              <F label="Heizkosten €/Mt"><N value={p.heizkostenMtl ?? null} edit={editMode} on={(v) => u({ heizkostenMtl: v })} /></F>
              <F label="Rücklage Fonds €/Mt"><N value={p.ruecklageFonds ?? null} edit={editMode} on={(v) => u({ ruecklageFonds: v })} /></F>
              <F label="Nettomiete mtl. €"><N value={p.nettomieteMtl} edit={editMode} on={(v) => u({ nettomieteMtl: v, nettomieteGeschaetzt: false })} /></F>
              <F label="Miete geschätzt?">
                <label className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background text-sm">
                  <input type="checkbox" disabled={!editMode} checked={p.nettomieteGeschaetzt} onChange={(e) => u({ nettomieteGeschaetzt: e.target.checked })} />
                  Schätzwert
                </label>
              </F>
            </div>
          </Section>

          <Section title="Mietrecht & Risiko">
            <div className="grid md:grid-cols-2 gap-3">
              <F label="Mietrechtliche Einschätzung">
                {editMode ? (
                  <select value={p.mietrecht} onChange={(e) => u({ mietrecht: e.target.value as Mietrecht })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {MIETRECHTE.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : <Ro>{p.mietrecht}</Ro>}
              </F>
              <F label="Fehlende Daten (komma-getrennt)">
                <T value={p.missingData.join(", ")} edit={editMode} on={(v) => u({ missingData: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
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
              disabled={!editMode}
              onChange={(e) => u({ beschreibung: e.target.value })}
              rows={3}
              placeholder="Beschreibung aus dem Inserat…"
              className="w-full rounded-md border bg-background p-3 text-sm disabled:opacity-80"
            />
            <textarea
              value={p.notizen}
              disabled={!editMode}
              onChange={(e) => u({ notizen: e.target.value })}
              rows={4}
              placeholder="Eigene Notizen…"
              className="w-full rounded-md border bg-background p-3 text-sm mt-3 disabled:opacity-80"
            />
          </Section>

          <ViewingChecklist propertyId={p.id} viewings={viewings} setViewing={setViewing} />
        </div>

        <div className="space-y-6">
          <Section title={`Score ${s.total} / 100`}>
            <ScoreRow label="Lage" max={25} value={p.scoreLage} onChange={(v) => editMode && u({ scoreLage: v })} disabled={!editMode} />
            <ScoreRow label="Zahlen / Rendite" max={25} value={s.zahlen} readonly />
            <ScoreRow label="Vermietbarkeit" max={20} value={p.scoreVermietbarkeit} onChange={(v) => editMode && u({ scoreVermietbarkeit: v })} disabled={!editMode} />
            <ScoreRow label="Zustand" max={15} value={p.scoreZustand} onChange={(v) => editMode && u({ scoreZustand: v })} disabled={!editMode} />
            <ScoreRow label="Mietrecht" max={10} value={p.scoreRecht} onChange={(v) => editMode && u({ scoreRecht: v })} disabled={!editMode} />
            <ScoreRow label="Wiederverkauf" max={5} value={p.scoreWiederverkauf} onChange={(v) => editMode && u({ scoreWiederverkauf: v })} disabled={!editMode} />
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
                  disabled={!editMode}
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
function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "neutral" }) {
  return (
    <div className="rounded-lg border bg-card p-4">
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
