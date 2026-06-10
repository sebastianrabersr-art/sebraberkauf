import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { makeEmptyProperty, useActiveProject, useStore } from "@/lib/store";
import type { ObjektartDetail, PurchaseInfo } from "@/lib/types";
import { planLimits, useAuth } from "@/lib/auth";
import { FeatureLocked } from "@/components/FeatureLocked";

export const Route = createFileRoute("/portfolio/new")({
  head: () => ({ meta: [{ title: "Gekaufte Immobilie hinzufügen – Portfolio" }] }),
  component: NewPortfolioProperty,
});

type Form = {
  // Basis
  title: string;
  objektart: ObjektartDetail;
  adresse: string;
  city: string;
  land: string;
  googleMapsUrlOverride: string;
  kaufdatum: string;
  tatsKaufpreis: string;
  wohnflaecheM2: string;
  grundstuecksflaecheM2: string;
  aktuelleNutzung: NonNullable<PurchaseInfo["aktuelleNutzung"]>;
  aktuellerObjektwert: string;
  // Kaufkosten
  tatsKaufnebenkosten: string;
  tatsMaklerkosten: string;
  notarkosten: string;
  grundbuchkosten: string;
  sonstigeKaufkosten: string;
  sanierungskosten: string;
  einrichtungskosten: string;
  tatsEigenkapital: string;
  // Finanzierung
  bank: string;
  kreditstatus: NonNullable<PurchaseInfo["kreditstatus"]>;
  ursprKreditbetrag: string;
  tatsKreditbetrag: string;
  aktuelleRestschuld: string;
  zinssatzPct: string;
  fixzinsBis: string;
  laufzeitJahre: string;
  aktuelleMonatsrate: string;
  tilgungsart: NonNullable<PurchaseInfo["tilgungsart"]>;
  startdatumKredit: string;
  naechsteZinsanpassung: string;
  notizenKreditvertrag: string;
  // Miete & laufende Kosten
  aktuelleMonatsmiete: string;
  betriebskostenMtl: string;
  nichtUmlMtl: string;
  ruecklageMtl: string;
  versicherungMtl: string;
  verwaltungMtl: string;
  sonstigeMtlKosten: string;
};

const empty: Form = {
  title: "", objektart: "Wohnung", adresse: "", city: "", land: "Österreich", googleMapsUrlOverride: "",
  kaufdatum: "", tatsKaufpreis: "", wohnflaecheM2: "", grundstuecksflaecheM2: "",
  aktuelleNutzung: "vermietet", aktuellerObjektwert: "",
  tatsKaufnebenkosten: "", tatsMaklerkosten: "", notarkosten: "", grundbuchkosten: "",
  sonstigeKaufkosten: "", sanierungskosten: "", einrichtungskosten: "", tatsEigenkapital: "",
  bank: "", kreditstatus: "laufend", ursprKreditbetrag: "", tatsKreditbetrag: "",
  aktuelleRestschuld: "", zinssatzPct: "", fixzinsBis: "", laufzeitJahre: "",
  aktuelleMonatsrate: "", tilgungsart: "annuitaet", startdatumKredit: "",
  naechsteZinsanpassung: "", notizenKreditvertrag: "",
  aktuelleMonatsmiete: "", betriebskostenMtl: "", nichtUmlMtl: "", ruecklageMtl: "",
  versicherungMtl: "", verwaltungMtl: "", sonstigeMtlKosten: "",
};

const num = (s: string): number | null => (s.trim() === "" ? null : Number(s.replace(",", ".")));

function NewPortfolioProperty() {
  const navigate = useNavigate();
  const project = useActiveProject();
  const { addProperty } = useStore();
  const [f, setF] = useState<Form>(empty);
  const u = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));

  const submit = () => {
    if (!f.title.trim()) { toast.error("Bitte Titel angeben."); return; }
    const purchase: PurchaseInfo = {
      kaufdatum: f.kaufdatum || undefined,
      tatsKaufpreis: num(f.tatsKaufpreis),
      tatsKaufnebenkosten: num(f.tatsKaufnebenkosten),
      tatsMaklerkosten: num(f.tatsMaklerkosten),
      notarkosten: num(f.notarkosten),
      grundbuchkosten: num(f.grundbuchkosten),
      sonstigeKaufkosten: num(f.sonstigeKaufkosten),
      sanierungskosten: num(f.sanierungskosten),
      einrichtungskosten: num(f.einrichtungskosten),
      tatsEigenkapital: num(f.tatsEigenkapital),
      tatsKreditbetrag: num(f.tatsKreditbetrag),
      ursprKreditbetrag: num(f.ursprKreditbetrag),
      bank: f.bank.trim() || undefined,
      kreditstatus: f.kreditstatus,
      zinssatzPct: num(f.zinssatzPct),
      fixzinsBis: f.fixzinsBis || undefined,
      laufzeitJahre: num(f.laufzeitJahre),
      tilgungsart: f.tilgungsart,
      startdatumKredit: f.startdatumKredit || undefined,
      naechsteZinsanpassung: f.naechsteZinsanpassung || undefined,
      notizenKreditvertrag: f.notizenKreditvertrag.trim() || undefined,
      aktuelleRestschuld: num(f.aktuelleRestschuld),
      aktuelleMonatsrate: num(f.aktuelleMonatsrate),
      aktuelleMonatsmiete: num(f.aktuelleMonatsmiete),
      betriebskostenMtl: num(f.betriebskostenMtl),
      nichtUmlMtl: num(f.nichtUmlMtl),
      ruecklageMtl: num(f.ruecklageMtl),
      versicherungMtl: num(f.versicherungMtl),
      verwaltungMtl: num(f.verwaltungMtl),
      sonstigeMtlKosten: num(f.sonstigeMtlKosten),
      aktuelleNutzung: f.aktuelleNutzung,
      aktuellerObjektwert: num(f.aktuellerObjektwert),
    };
    const p = makeEmptyProperty({
      projectId: project.id,
      status: "Gekauft",
      title: f.title.trim(),
      adresse: f.adresse.trim(),
      city: f.city.trim(),
      land: f.land.trim() || "Österreich",
      objekttyp: f.objektart,
      objektartDetail: f.objektart,
      wohnflaecheM2: num(f.wohnflaecheM2),
      grundstuecksflaecheM2: num(f.grundstuecksflaecheM2),
      kaufpreis: num(f.tatsKaufpreis),
      sanierung: num(f.sanierungskosten) ?? 0,
      einrichtung: num(f.einrichtungskosten) ?? 0,
      nettomieteMtl: num(f.aktuelleMonatsmiete),
      nettomieteGeschaetzt: false,
      betriebskostenMtl: num(f.betriebskostenMtl),
      googleMapsUrlOverride: f.googleMapsUrlOverride.trim() || undefined,
      purchase,
    });
    addProperty(p);
    toast.success("Gekaufte Immobilie ins Portfolio aufgenommen.");
    navigate({ to: "/properties/$id", params: { id: p.id } });
  };

  return (
    <AppShell>
      <PageHeader
        title="Gekaufte Immobilie hinzufügen"
        description='Trage hier eine bereits gekaufte Immobilie ein. Status wird automatisch auf „Gekauft“ gesetzt.'
        actions={
          <button onClick={() => navigate({ to: "/portfolio" })} className="rounded-md border px-3 py-2 text-sm hover:bg-accent">
            Abbrechen
          </button>
        }
      />
      <div className="space-y-4 max-w-5xl">
        <Section title="Basisdaten">
          <Grid>
            <F label="Titel *"><I value={f.title} on={(v) => u({ title: v })} /></F>
            <F label="Objektart">
              <Sel value={f.objektart} on={(v) => u({ objektart: v as ObjektartDetail })}
                opts={["Wohnung","Haus","Grundstück","Zinshaus","Sonstiges"]} />
            </F>
            <F label="Aktuelle Nutzung">
              <Sel value={f.aktuelleNutzung} on={(v) => u({ aktuelleNutzung: v as Form["aktuelleNutzung"] })}
                opts={["vermietet","selbst genutzt","leer","teilweise vermietet"]} />
            </F>
            <F label="Adresse"><I value={f.adresse} on={(v) => u({ adresse: v })} /></F>
            <F label="Stadt"><I value={f.city} on={(v) => u({ city: v })} /></F>
            <F label="Land">
              <Sel value={f.land} on={(v) => u({ land: v })} opts={["Österreich","Deutschland"]} />
            </F>
            <F label="Google-Maps-Link (optional)" wide><I value={f.googleMapsUrlOverride} on={(v) => u({ googleMapsUrlOverride: v })} placeholder="https://maps.google.com/…" /></F>
            <F label="Kaufdatum"><I type="date" value={f.kaufdatum} on={(v) => u({ kaufdatum: v })} /></F>
            <F label="Tatsächlicher Kaufpreis €"><I type="number" value={f.tatsKaufpreis} on={(v) => u({ tatsKaufpreis: v })} /></F>
            <F label="Aktueller Objektwert €"><I type="number" value={f.aktuellerObjektwert} on={(v) => u({ aktuellerObjektwert: v })} /></F>
            <F label="Wohnfläche m²"><I type="number" value={f.wohnflaecheM2} on={(v) => u({ wohnflaecheM2: v })} /></F>
            {(f.objektart === "Haus" || f.objektart === "Grundstück" || f.objektart === "Zinshaus") && (
              <F label="Grundstücksfläche m²"><I type="number" value={f.grundstuecksflaecheM2} on={(v) => u({ grundstuecksflaecheM2: v })} /></F>
            )}
          </Grid>
        </Section>

        <Section title="Kaufkosten">
          <Grid>
            <F label="Kaufnebenkosten €"><I type="number" value={f.tatsKaufnebenkosten} on={(v) => u({ tatsKaufnebenkosten: v })} /></F>
            <F label="Maklerkosten €"><I type="number" value={f.tatsMaklerkosten} on={(v) => u({ tatsMaklerkosten: v })} /></F>
            <F label="Notar / Vertragserrichtung €"><I type="number" value={f.notarkosten} on={(v) => u({ notarkosten: v })} /></F>
            <F label="Grundbuchkosten €"><I type="number" value={f.grundbuchkosten} on={(v) => u({ grundbuchkosten: v })} /></F>
            <F label="Sonstige Kaufkosten €"><I type="number" value={f.sonstigeKaufkosten} on={(v) => u({ sonstigeKaufkosten: v })} /></F>
            <F label="Sanierungskosten €"><I type="number" value={f.sanierungskosten} on={(v) => u({ sanierungskosten: v })} /></F>
            <F label="Einrichtungskosten €"><I type="number" value={f.einrichtungskosten} on={(v) => u({ einrichtungskosten: v })} /></F>
            <F label="Tats. Eigenkapital €"><I type="number" value={f.tatsEigenkapital} on={(v) => u({ tatsEigenkapital: v })} /></F>
          </Grid>
        </Section>

        <Section title="Finanzierung">
          <Grid>
            <F label="Bank"><I value={f.bank} on={(v) => u({ bank: v })} /></F>
            <F label="Kreditstatus">
              <Sel value={f.kreditstatus} on={(v) => u({ kreditstatus: v as Form["kreditstatus"] })}
                opts={["laufend","abbezahlt","refinanziert","in Auszahlung","Sondertilgung geplant","abgelöst","in Verzug"]} />
            </F>
            <F label="Ursprünglicher Kreditbetrag €"><I type="number" value={f.ursprKreditbetrag} on={(v) => u({ ursprKreditbetrag: v })} /></F>
            <F label="Tats. Kreditbetrag €"><I type="number" value={f.tatsKreditbetrag} on={(v) => u({ tatsKreditbetrag: v })} /></F>
            <F label="Aktuelle Restschuld €"><I type="number" value={f.aktuelleRestschuld} on={(v) => u({ aktuelleRestschuld: v })} /></F>
            <F label="Zinssatz % p.a."><I type="number" value={f.zinssatzPct} on={(v) => u({ zinssatzPct: v })} /></F>
            <F label="Fixzins bis"><I type="date" value={f.fixzinsBis} on={(v) => u({ fixzinsBis: v })} /></F>
            <F label="Laufzeit (Jahre)"><I type="number" value={f.laufzeitJahre} on={(v) => u({ laufzeitJahre: v })} /></F>
            <F label="Monatliche Rate €"><I type="number" value={f.aktuelleMonatsrate} on={(v) => u({ aktuelleMonatsrate: v })} /></F>
            <F label="Tilgungsart">
              <Sel value={f.tilgungsart} on={(v) => u({ tilgungsart: v as Form["tilgungsart"] })}
                opts={["annuitaet","endfaellig","manuell"]} />
            </F>
            <F label="Startdatum Kredit"><I type="date" value={f.startdatumKredit} on={(v) => u({ startdatumKredit: v })} /></F>
            <F label="Nächste Zinsanpassung"><I type="date" value={f.naechsteZinsanpassung} on={(v) => u({ naechsteZinsanpassung: v })} /></F>
            <F label="Notizen Kreditvertrag" wide>
              <textarea value={f.notizenKreditvertrag} onChange={(e) => u({ notizenKreditvertrag: e.target.value })} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </F>
          </Grid>
        </Section>

        <Section title="Miete & laufende Kosten (monatlich)">
          <Grid>
            <F label="Aktuelle Monatsmiete €"><I type="number" value={f.aktuelleMonatsmiete} on={(v) => u({ aktuelleMonatsmiete: v })} /></F>
            <F label="Betriebskosten €"><I type="number" value={f.betriebskostenMtl} on={(v) => u({ betriebskostenMtl: v })} /></F>
            <F label="Nicht umlagefähige Kosten €"><I type="number" value={f.nichtUmlMtl} on={(v) => u({ nichtUmlMtl: v })} /></F>
            <F label="Instandhaltung / Rücklage €"><I type="number" value={f.ruecklageMtl} on={(v) => u({ ruecklageMtl: v })} /></F>
            <F label="Versicherung €"><I type="number" value={f.versicherungMtl} on={(v) => u({ versicherungMtl: v })} /></F>
            <F label="Verwaltungskosten €"><I type="number" value={f.verwaltungMtl} on={(v) => u({ verwaltungMtl: v })} /></F>
            <F label="Sonstige monatl. Kosten €"><I type="number" value={f.sonstigeMtlKosten} on={(v) => u({ sonstigeMtlKosten: v })} /></F>
          </Grid>
        </Section>

        <div className="flex gap-2">
          <button onClick={submit} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Ins Portfolio aufnehmen</button>
          <button onClick={() => navigate({ to: "/portfolio" })} className="rounded-md border px-4 py-2 text-sm">Abbrechen</button>
        </div>
        <p className="text-xs text-muted-foreground">Tipp: Historische Zahlungen (Miete, Kreditraten, Reparaturen …) kannst du anschließend in der Detailseite unter „Zahlungen & Cashflow" nachtragen.</p>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>;
}
function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`block text-sm ${wide ? "md:col-span-3" : ""}`}><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</label>;
}
function I({ value, on, type = "text", placeholder }: { value: string; on: (v: string) => void; type?: string; placeholder?: string }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={(e) => on(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
function Sel({ value, on, opts }: { value: string; on: (v: string) => void; opts: string[] }) {
  return (
    <select value={value} onChange={(e) => on(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
