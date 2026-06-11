import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { detectCountry, detectPlatform, extractProperty } from "@/lib/extract.functions";
import { makeEmptyProperty, useActiveProject, useStore } from "@/lib/store";
import type { Mietrecht, Property } from "@/lib/types";
import { calcDataQuality, isValidUrl } from "@/lib/calc";
import { Link as LinkIcon, Loader2, Sparkles, AlertTriangle, CheckCircle2, FileText } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  head: () => ({ meta: [{ title: "Link analysieren – Immo Invest" }] }),
  component: AnalyzePage,
});

type ImportResult = {
  property: Property;
  quality: ReturnType<typeof calcDataQuality>;
  partial: boolean;
};

function AnalyzePage() {
  const navigate = useNavigate();
  const extract = useServerFn(extractProperty);
  const project = useActiveProject();
  const { addProperty, findByLink, properties } = useStore();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [needsText, setNeedsText] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!loading) { setLoadingPhase(0); return; }
    const id = setInterval(() => setLoadingPhase((p) => (p + 1) % 3), 2500);
    return () => clearInterval(id);
  }, [loading]);
  const loadingTexts = ["Link wird geladen…", "Daten werden extrahiert…", "KI analysiert…"];

  // Pick up a link the visitor pasted on the landing page before signup
  useEffect(() => {
    try {
      const pending = localStorage.getItem("pending_analyze_url");
      if (pending && !url) {
        localStorage.removeItem("pending_analyze_url");
        setUrl(pending);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const platform = detectPlatform(url);
  const country = detectCountry(url);

  const checkDuplicate = (link: string): Property | undefined => {
    const l = link.trim();
    if (!l) return undefined;
    return findByLink(l, project.id) ?? properties.find((p) => p.link.trim() === l);
  };

  const mapObjektart = (s: string): string => {
    const v = (s || "").toLowerCase();
    if (v.includes("wohn")) return "Wohnung";
    if (v.includes("haus") || v.includes("villa") || v.includes("reihen")) return "Haus";
    if (v.includes("grund")) return "Grundstück";
    if (v.includes("zins")) return "Zinshaus";
    if (v.includes("gewerb") || v.includes("büro") || v.includes("buero")) return "Gewerbe";
    return s || "";
  };

  const run = async () => {
    setResult(null);
    if (url && !isValidUrl(url)) {
      toast.error("Bitte eine gültige URL (mit https://) einfügen.");
      return;
    }
    if (!url && !text) {
      toast.error("Bitte Link oder Inseratstext eingeben.");
      return;
    }
    if (url) {
      const dup = checkDuplicate(url);
      if (dup) {
        toast.warning("Diese Immobilie existiert bereits.", {
          action: { label: "Bestehende öffnen", onClick: () => navigate({ to: "/properties/$id", params: { id: dup.id } }) },
        });
        return;
      }
    }
    setLoading(true);
    try {
      const res = await extract({ data: { url, text } });

      // Always save the link as a property, even if extraction fails
      if (!res.ok) {
        const fallbackTitle = url ? `Inserat (${platform || "unbekannt"})` : "Manuelle Immobilie";
        const p = makeEmptyProperty({
          projectId: project.id,
          link: url.trim(),
          platform: platform,
          land: country || "",
          title: fallbackTitle,
          extractionStatus: "failed",
          missingData: ["Automatische Extraktion fehlgeschlagen – bitte Inseratstext einfügen oder PDF hochladen."],
        });
        addProperty(p);
        const q = calcDataQuality(p);
        setResult({ property: p, quality: q, partial: true });
        setNeedsText(true);
        toast.warning(res.error || "Daten konnten nicht ausgelesen werden – Link wurde trotzdem gespeichert.");
        return;
      }

      const d = res.data;
      const mietrecht: Mietrecht = (d.mietrecht_hint as Mietrecht) || "unklar – rechtlich prüfen";
      const objektart = mapObjektart(d.property_type);
      const adresseFull = d.address || d.location || "";
      const draft = makeEmptyProperty({
        projectId: project.id,
        link: url.trim(),
        platform: d.platform || platform,
        land: d.country || country || "",
        bundesland: d.region || "",
        title: d.title || "Ohne Titel",
        bezirk: d.district,
        adresse: adresseFull,
        city: d.city || (country === "Österreich" ? "Wien" : ""),
        objekttyp: objektart,
        baujahr: d.year_built,
        mietrecht,
        zustand: d.condition,
        wohnflaecheM2: d.living_area_m2,
        grundstuecksflaecheM2: d.plot_area_m2,
        aussenflaecheM2: d.outdoor_area_m2,
        zimmer: d.rooms,
        kaufpreis: d.purchase_price,
        makler: d.seller_type === "Makler" ? "Ja" : d.seller_type === "Privat" ? "Nein" : "unklar",
        sellerType: (d.seller_type as Property["sellerType"]) || undefined,
        provisionPct: d.commission_pct,
        provisionEUR: d.commission_eur,
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
        ausstattung: d.features,
        nettomieteMtl: d.estimated_rent_monthly,
        nettomieteGeschaetzt: d.rent_is_estimate,
        missingData: d.missing_data,
      });
      const dq = calcDataQuality(draft);
      const status: Property["extractionStatus"] = dq.score >= 60 ? "ok" : "partial";
      const p = makeEmptyProperty({ ...draft, extractionStatus: status });
      addProperty(p);
      setResult({ property: p, quality: dq, partial: dq.score < 60 });
      if (dq.score < 60) {
        setNeedsText(true);
        toast.warning(`Nur ${dq.score}% der wichtigen Daten gefunden – Import unvollständig.`);
      } else {
        toast.success(`Immobilie analysiert (${dq.score}% Datenqualität).`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  const rerunWithText = async () => {
    if (!text.trim() || !result) return;
    setLoading(true);
    try {
      const res = await extract({ data: { url, text } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const d = res.data;
      const mietrecht: Mietrecht = (d.mietrecht_hint as Mietrecht) || "unklar – rechtlich prüfen";
      const patch: Partial<Property> = {
        title: d.title || result.property.title,
        bezirk: d.district || result.property.bezirk,
        adresse: d.address || d.location || result.property.adresse,
        city: d.city || result.property.city,
        land: d.country || result.property.land,
        bundesland: d.region || result.property.bundesland,
        objekttyp: mapObjektart(d.property_type) || result.property.objekttyp,
        baujahr: d.year_built ?? result.property.baujahr,
        mietrecht,
        zustand: d.condition || result.property.zustand,
        wohnflaecheM2: d.living_area_m2 ?? result.property.wohnflaecheM2,
        grundstuecksflaecheM2: d.plot_area_m2 ?? result.property.grundstuecksflaecheM2,
        aussenflaecheM2: d.outdoor_area_m2 ?? result.property.aussenflaecheM2,
        zimmer: d.rooms ?? result.property.zimmer,
        kaufpreis: d.purchase_price ?? result.property.kaufpreis,
        provisionPct: d.commission_pct ?? result.property.provisionPct,
        provisionEUR: d.commission_eur ?? result.property.provisionEUR,
        betriebskostenMtl: d.monthly_operating_costs ?? result.property.betriebskostenMtl,
        heizkostenMtl: d.monthly_heating_costs ?? result.property.heizkostenMtl,
        energyClass: d.energy_class || result.property.energyClass,
        hwb: d.hwb ?? result.property.hwb,
        beschreibung: d.description || result.property.beschreibung,
        ausstattung: d.features || result.property.ausstattung,
        nettomieteMtl: d.estimated_rent_monthly ?? result.property.nettomieteMtl,
        missingData: d.missing_data,
      };
      const merged = { ...result.property, ...patch } as Property;
      const dq = calcDataQuality(merged);
      merged.extractionStatus = dq.score >= 60 ? "ok" : "partial";
      // overwrite the existing record
      useStore.getState().updateProperty(result.property.id, merged);
      setResult({ property: merged, quality: dq, partial: dq.score < 60 });
      toast.success(`Aktualisiert – ${dq.score}% Datenqualität.`);
    } finally {
      setLoading(false);
    }
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
              onChange={(e) => { setUrl(e.target.value); setNeedsText(false); setResult(null); }}
              placeholder="https://… (willhaben, ImmoScout24, immowelt, kleinanzeigen, Makler-/Bauträgerseiten …)"
              className="flex-1 outline-none bg-transparent text-sm"
            />
            {platform && <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{platform}</span>}
            {country && <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{country}</span>}
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
          Akzeptiert AT & DE: willhaben, ImmoScout24 AT/DE, derStandard, immowelt, immobazar, immonet, kleinanzeigen, Makler-, Bauträger- und Bank-/Verwertungsseiten – sowie unbekannte Immobilienseiten. Der Original-Link wird in jedem Fall gespeichert.
        </p>

        {result && (
          <div className={`mt-5 rounded-md border p-4 text-sm ${result.partial ? "border-warning/50 bg-warning/10" : "border-success/50 bg-success/10"}`}>
            <div className="flex items-start gap-2">
              {result.partial ? <AlertTriangle className="size-5 mt-0.5 shrink-0" /> : <CheckCircle2 className="size-5 mt-0.5 shrink-0" />}
              <div className="flex-1">
                <div className="font-semibold">
                  {result.partial ? "Der automatische Import war unvollständig." : "Import erfolgreich."}
                </div>
                <div className="mt-1">Datenqualität: <strong>{result.quality.score}%</strong> ({result.quality.filled}/{result.quality.total} Pflichtfelder)</div>
                {result.quality.missing.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">Fehlend: {result.quality.missing.join(", ")}</div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate({ to: "/properties/$id", params: { id: result.property.id } })}
                    className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium"
                  >
                    Zur Immobilie
                  </button>
                  {result.partial && (
                    <>
                      <button
                        onClick={() => { setNeedsText(true); document.getElementById("fallback-text")?.scrollIntoView({ behavior: "smooth" }); }}
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                      >
                        Inseratstext einfügen
                      </button>
                      <Link
                        to="/properties/$id"
                        params={{ id: result.property.id }}
                        hash="pdf"
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent inline-flex items-center gap-1"
                      >
                        <FileText className="size-3" /> PDF/Exposé hochladen
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {needsText && !result && (
          <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm flex items-start gap-2">
            <AlertTriangle className="size-4 mt-0.5" />
            <div>
              Die Seite lässt sich nicht direkt auslesen (häufig bei willhaben/ImmoScout). Füge den Inseratstext unten ein – die KI extrahiert daraus.
            </div>
          </div>
        )}

        <details id="fallback-text" open={needsText} className="mt-4">
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
            <button
              onClick={result ? rerunWithText : run}
              disabled={loading || !text}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"
            >
              {result ? "Text neu auswerten" : "Text analysieren"}
            </button>
          </div>
        </details>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {[
          { t: "1. Link einfügen", d: "Original-URL, Plattform, Land und Importdatum werden immer gespeichert." },
          { t: "2. KI extrahiert Daten", d: "Bei < 60 % Datenqualität: Inseratstext einfügen oder Exposé-PDF hochladen." },
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
