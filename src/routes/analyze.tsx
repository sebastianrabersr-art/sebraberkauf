import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { detectPlatform, extractProperty } from "@/lib/extract.functions";
import { makeEmptyProperty, useActiveProject, useStore } from "@/lib/store";
import type { Mietrecht, Property } from "@/lib/types";
import { calcDataQuality, isValidUrl } from "@/lib/calc";
import { Link as LinkIcon, Loader2, Sparkles, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  head: () => ({ meta: [{ title: "Link analysieren – Immo Invest" }] }),
  component: AnalyzePage,
});

function AnalyzePage() {
  const navigate = useNavigate();
  const extract = useServerFn(extractProperty);
  const project = useActiveProject();
  const { addProperty, findByLink } = useStore();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsText, setNeedsText] = useState(false);

  const platform = detectPlatform(url);

  const buildAndSave = (
    base: Partial<Property>,
    extras: { extractionStatus: Property["extractionStatus"]; missingExtra?: string[] },
  ): Property => {
    const p = makeEmptyProperty({
      ...base,
      projectId: project.id,
      link: url.trim(),
      platform: base.platform || platform,
      extractionStatus: extras.extractionStatus,
      missingData: [...(base.missingData || []), ...(extras.missingExtra || [])],
    });
    addProperty(p);
    return p;
  };

  const run = async () => {
    if (url && !isValidUrl(url)) {
      toast.error("Bitte eine gültige URL (mit https://) einfügen.");
      return;
    }
    if (!url && !text) {
      toast.error("Bitte Link oder Inseratstext eingeben.");
      return;
    }
    if (url) {
      const dup = findByLink(url, project.id);
      if (dup) {
        toast.warning("Dieses Objekt existiert bereits in diesem Projekt.", {
          action: { label: "Öffnen", onClick: () => navigate({ to: "/properties/$id", params: { id: dup.id } }) },
        });
        return;
      }
    }
    setLoading(true);
    try {
      const res = await extract({ data: { url, text } });
      if (!res.ok) {
        toast.error(res.error);
        setNeedsText(true);
        return;
      }
      const d = res.data;
      const mietrecht: Mietrecht = (d.mietrecht_hint as Mietrecht) || "unklar – rechtlich prüfen";
      const draft = makeEmptyProperty({
        projectId: project.id,
        link: url.trim(),
        platform: d.platform || platform,
        title: d.title || "Ohne Titel",
        bezirk: d.district,
        adresse: d.location,
        city: d.city || "Wien",
        baujahr: d.year_built,
        mietrecht,
        zustand: d.condition,
        wohnflaecheM2: d.living_area_m2,
        zimmer: d.rooms,
        kaufpreis: d.purchase_price,
        makler: d.seller_type === "Makler" ? "Ja" : d.seller_type === "Privat" ? "Nein" : "unklar",
        stockwerk: d.floor,
        hasElevator: d.has_elevator,
        hasBalkon: d.has_balcony,
        hasTerrasse: d.has_terrace,
        hasLoggia: d.has_loggia,
        hasGarten: d.has_garden,
        hasKeller: d.has_basement,
        hasStellplatz: d.has_parking,
        betriebskostenMtl: d.monthly_operating_costs,
        heizkostenMtl: d.monthly_heating_costs,
        energyClass: d.energy_class,
        hwb: d.hwb,
        verfuegbarkeit: d.availability,
        beschreibung: d.description,
        nettomieteMtl: d.estimated_rent_monthly,
        nettomieteGeschaetzt: d.rent_is_estimate,
        missingData: d.missing_data,
      });
      const dq = calcDataQuality(draft);
      const status: Property["extractionStatus"] = dq.score >= 60 ? "ok" : "partial";
      const p = buildAndSave(draft, { extractionStatus: status });
      if (dq.score < 60) {
        toast.warning(`Nur ${dq.score}% der Pflichtdaten gefunden – bitte manuell ergänzen.`);
      } else {
        toast.success("Immobilie analysiert und gespeichert.");
      }
      navigate({ to: "/properties/$id", params: { id: p.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  const createManualPlaceholder = () => {
    if (url && !isValidUrl(url)) { toast.error("Bitte gültige URL angeben."); return; }
    const p = buildAndSave(
      { title: url ? `Inserat (${platform})` : "Manuelle Immobilie", missingData: ["Automatische Extraktion fehlgeschlagen"] },
      { extractionStatus: "failed" },
    );
    toast.info("Leerer Datensatz angelegt – bitte Felder manuell ergänzen.");
    navigate({ to: "/properties/$id", params: { id: p.id } });
  };

  return (
    <AppShell>
      <PageHeader
        title="Immobilie analysieren"
        description={`Aktives Projekt: ${project.name} – die Immobilie wird hier zugeordnet.`}
        actions={
          <Link to="/properties/new" className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
            Manuell hinzufügen
          </Link>
        }
      />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <label className="block text-sm font-medium mb-2">Immobilien-Link einfügen</label>
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="flex-1 flex items-center gap-2 border rounded-md px-3 py-2.5 bg-background focus-within:ring-2 ring-ring">
            <LinkIcon className="size-4 text-muted-foreground" />
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setNeedsText(false); }}
              placeholder="https://www.willhaben.at/iad/immobilien/..."
              className="flex-1 outline-none bg-transparent text-sm"
            />
            {platform && <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{platform}</span>}
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Analysieren
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Erkannt: willhaben, ImmoScout24, derStandard, immowelt, RE/MAX, Engel & Völkers, EHL, Otto, JP, Bauträger u.v.m.
          Die Original-URL wird unverändert gespeichert.
        </p>

        {needsText && (
          <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm flex items-start gap-2">
            <AlertTriangle className="size-4 mt-0.5" />
            <div>
              Die Seite lässt sich nicht direkt auslesen (häufig bei willhaben/ImmoScout). Füge den Inseratstext unten ein – die KI extrahiert daraus, oder lege einen leeren Datensatz an.
            </div>
          </div>
        )}

        <details open={needsText} className="mt-4">
          <summary className="cursor-pointer text-sm font-medium select-none">
            Inseratstext manuell einfügen (Fallback)
          </summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Hier den Exposé-/Inseratstext einfügen…"
            className="mt-3 w-full rounded-md border bg-background p-3 text-sm font-mono"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={run} disabled={loading || !text} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">
              Text analysieren
            </button>
            <button onClick={createManualPlaceholder} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
              Leeren Datensatz anlegen
            </button>
          </div>
        </details>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {[
          { t: "1. Link einfügen", d: "Original-URL wird gespeichert und die Seite ausgelesen." },
          { t: "2. KI extrahiert Daten", d: "Bei Lücken (< 60 %) wirst du gefragt, ob du den Text einfügst." },
          { t: "3. Kalkulation & Score", d: "Berechnet mit den Annahmen des aktiven Projekts." },
        ].map((s) => (
          <div key={s.t} className="rounded-xl border bg-card p-5">
            <div className="font-semibold">{s.t}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.d}</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
