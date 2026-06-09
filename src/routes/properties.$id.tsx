import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import { calcProperty, calcScore, fmtEUR, fmtPct } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import type { Mietrecht, Property, PropertyStatus } from "@/lib/types";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/properties/$id")({
  head: ({ params }) => ({ meta: [{ title: `Objekt ${params.id} – Immo Invest` }] }),
  component: Detail,
  notFoundComponent: () => (
    <AppShell><div className="p-8">Objekt nicht gefunden.</div></AppShell>
  ),
});

const STATUSES: PropertyStatus[] = ["Neu","Prüfen","Interessant","Besichtigung","Angebot","Abgelehnt","Gekauft"];
const MIETRECHTE: Mietrecht[] = [
  "Neubau / freie Miete",
  "Teilanwendung MRG",
  "Altbau / Richtwert möglich",
  "unklar – rechtlich prüfen",
  "nicht geeignet",
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function NumInput({ value, onChange, suffix }: { value: number | null | undefined; onChange: (v: number | null) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="flex-1 outline-none bg-transparent text-sm w-full"
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function TxtInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
    />
  );
}

function Sel<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: T[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
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

function Detail() {
  const { id } = Route.useParams();
  const { properties, assumptions, updateProperty } = useStore();
  const p = properties.find((x) => x.id === id);
  if (!p) throw notFound();

  const c = calcProperty(p, assumptions);
  const s = calcScore(p, assumptions, c);
  const u = (patch: Partial<Property>) => updateProperty(p.id, patch);

  const mietrechtWarn = p.mietrecht === "unklar – rechtlich prüfen" || p.mietrecht === "Altbau / Richtwert möglich";

  return (
    <AppShell>
      <Link to="/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="size-4" /> Zurück zur Datenbank
      </Link>
      <PageHeader
        title={p.title || "Objekt"}
        description={`${p.bezirk || "—"} · ${p.platform || "—"} · ${new Date(p.createdAt).toLocaleDateString("de-AT")}`}
        actions={
          <div className="flex items-center gap-2">
            <AmpelBadge ampel={s.ampel}>{s.entscheidung} · Score {s.total}</AmpelBadge>
            {p.link && (
              <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-accent">
                Inserat <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        }
      />

      {mietrechtWarn && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="size-4 mt-0.5 text-warning-foreground" />
          <div><strong>Mietrecht vor Kauf prüfen.</strong> Bei Altbau / unklarer Einstufung ist eine rechtliche Prüfung empfohlen.</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        <Stat label="Kaufpreis" value={fmtEUR(p.kaufpreis)} />
        <Stat label="Gesamtkosten" value={fmtEUR(c.gesamtkosten)} hint={`NK ${fmtPct(c.nebenkostenPct, 1)}`} />
        <Stat label="Kredit" value={fmtEUR(c.kreditBetrag)} hint={`LTV ${fmtPct(c.ltv, 0)}`} />
        <Stat label="Rate mtl." value={fmtEUR(c.kreditRateMtl)} hint={`${assumptions.laufzeit} J. @ ${fmtPct(assumptions.zinssatz, 2)}`} />
        <Stat label="Miete mtl." value={fmtEUR(p.nettomieteMtl)} hint={p.nettomieteGeschaetzt ? "geschätzt" : "Inserat"} />
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
              <Field label="Titel"><TxtInput value={p.title} onChange={(v) => u({ title: v })} /></Field>
              <Field label="Bezirk"><TxtInput value={p.bezirk} onChange={(v) => u({ bezirk: v })} /></Field>
              <Field label="Adresse / Gegend"><TxtInput value={p.adresse} onChange={(v) => u({ adresse: v })} /></Field>
              <Field label="Wohnfläche m²"><NumInput value={p.wohnflaecheM2} onChange={(v) => u({ wohnflaecheM2: v })} suffix="m²" /></Field>
              <Field label="Zimmer"><NumInput value={p.zimmer} onChange={(v) => u({ zimmer: v })} /></Field>
              <Field label="Baujahr"><NumInput value={p.baujahr} onChange={(v) => u({ baujahr: v })} /></Field>
              <Field label="Zustand"><TxtInput value={p.zustand} onChange={(v) => u({ zustand: v })} /></Field>
              <Field label="Stockwerk"><TxtInput value={p.stockwerk ?? ""} onChange={(v) => u({ stockwerk: v })} /></Field>
              <Field label="Energieklasse"><TxtInput value={p.energyClass ?? ""} onChange={(v) => u({ energyClass: v })} /></Field>
              <Field label="HWB"><NumInput value={p.hwb ?? null} onChange={(v) => u({ hwb: v })} /></Field>
              <Field label="Status"><Sel value={p.status} onChange={(v) => u({ status: v })} options={STATUSES} /></Field>
              <Field label="Makler?"><Sel value={p.makler} onChange={(v) => u({ makler: v })} options={["Ja","Nein","unklar"] as const} /></Field>
            </div>
          </Section>

          <Section title="Kauf & Finanzierung">
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Kaufpreis €"><NumInput value={p.kaufpreis} onChange={(v) => u({ kaufpreis: v })} suffix="€" /></Field>
              <Field label="Sanierung €"><NumInput value={p.sanierung} onChange={(v) => u({ sanierung: v ?? 0 })} suffix="€" /></Field>
              <Field label="Einrichtung €"><NumInput value={p.einrichtung} onChange={(v) => u({ einrichtung: v ?? 0 })} suffix="€" /></Field>
              <Field label="Reserve €"><NumInput value={p.reserve} onChange={(v) => u({ reserve: v ?? 0 })} suffix="€" /></Field>
              <Field label="Nettomiete mtl. €">
                <NumInput value={p.nettomieteMtl} onChange={(v) => u({ nettomieteMtl: v, nettomieteGeschaetzt: false })} suffix="€" />
              </Field>
              <Field label="Miete geschätzt?">
                <label className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background text-sm">
                  <input type="checkbox" checked={p.nettomieteGeschaetzt} onChange={(e) => u({ nettomieteGeschaetzt: e.target.checked })} />
                  Schätzwert – prüfen
                </label>
              </Field>
            </div>
          </Section>

          <Section title="Mietrecht & Risiko">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Mietrechtliche Einschätzung"><Sel value={p.mietrecht} onChange={(v) => u({ mietrecht: v })} options={MIETRECHTE} /></Field>
              <Field label="Fehlende Daten">
                <TxtInput value={p.missingData.join(", ")} onChange={(v) => u({ missingData: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
              </Field>
            </div>
            <div className="grid md:grid-cols-3 gap-3 mt-4">
              <Stat label="Cashflow @ +Zins" value={fmtEUR(c.cashflowStressZins)} tone={c.cashflowStressZins < 0 ? "bad" : "neutral"} hint={`+${fmtPct(assumptions.zinsStress,1)}`} />
              <Stat label="Cashflow @ Leerstand" value={fmtEUR(c.cashflowStressLeerstand)} tone={c.cashflowStressLeerstand < 0 ? "bad" : "neutral"} hint={`${assumptions.leerstandStressMonate} Mo./J`} />
              <Stat label="Cashflow @ Reparatur" value={fmtEUR(c.cashflowStressReparatur)} tone={c.cashflowStressReparatur < 0 ? "bad" : "neutral"} hint={fmtEUR(assumptions.reparaturStress)} />
              <Stat label="Max. Kaufpreis @ Ziel-Brutto" value={fmtEUR(c.maxKaufpreisZielRendite)} hint={fmtPct(assumptions.zielBrutto)} />
            </div>
          </Section>

          <Section title="Notizen & Beschreibung">
            <textarea
              value={p.beschreibung ?? ""}
              onChange={(e) => u({ beschreibung: e.target.value })}
              rows={3}
              placeholder="Beschreibung aus dem Inserat…"
              className="w-full rounded-md border bg-background p-3 text-sm"
            />
            <textarea
              value={p.notizen}
              onChange={(e) => u({ notizen: e.target.value })}
              rows={4}
              placeholder="Eigene Notizen…"
              className="w-full rounded-md border bg-background p-3 text-sm mt-3"
            />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title={`Score ${s.total} / 100`}>
            <ScoreRow label="Lage" max={25} value={p.scoreLage} onChange={(v) => u({ scoreLage: v })} />
            <ScoreRow label="Zahlen / Rendite" max={25} value={s.zahlen} readonly />
            <ScoreRow label="Vermietbarkeit" max={20} value={p.scoreVermietbarkeit} onChange={(v) => u({ scoreVermietbarkeit: v })} />
            <ScoreRow label="Zustand" max={15} value={p.scoreZustand} onChange={(v) => u({ scoreZustand: v })} />
            <ScoreRow label="Mietrecht" max={10} value={p.scoreRecht} onChange={(v) => u({ scoreRecht: v })} />
            <ScoreRow label="Wiederverkauf" max={5} value={p.scoreWiederverkauf} onChange={(v) => u({ scoreWiederverkauf: v })} />
            <div className="border-t mt-3 pt-3 flex justify-between text-sm">
              <span className="font-medium">Entscheidung</span>
              <AmpelBadge ampel={s.ampel}>{s.entscheidung}</AmpelBadge>
            </div>
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
              <label key={key} className="flex items-center justify-between text-sm py-1.5">
                <span>{label}</span>
                <select
                  value={(p as any)[key] === true ? "ja" : (p as any)[key] === false ? "nein" : ""}
                  onChange={(e) => u({ [key]: e.target.value === "ja" ? true : e.target.value === "nein" ? false : null } as any)}
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
            <Link to="/viewing" className="text-primary text-sm inline-block mt-3 hover:underline">→ Besichtigungs-Checkliste öffnen</Link>
          </Section>
        </div>
      </div>
    </AppShell>
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

function ScoreRow({ label, max, value, onChange, readonly }: { label: string; max: number; value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="py-1.5">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">{Math.round(value * 10) / 10} / {max}</span>
      </div>
      {readonly ? (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${(value / max) * 100}%` }} />
        </div>
      ) : (
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="w-full"
        />
      )}
    </div>
  );
}
