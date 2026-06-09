import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { extractProperty } from "@/lib/extract.functions";
import { makeEmptyProperty, useStore } from "@/lib/store";
import type { Mietrecht, Property } from "@/lib/types";
import { Link as LinkIcon, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  head: () => ({ meta: [{ title: "Link analysieren – Immo Invest" }] }),
  component: AnalyzePage,
});

function AnalyzePage() {
  const navigate = useNavigate();
  const extract = useServerFn(extractProperty);
  const { addProperty, findByLink } = useStore();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const dup = url && findByLink(url);
    if (dup) {
      toast.warning("Dieses Objekt existiert bereits.", {
        action: { label: "Öffnen", onClick: () => navigate({ to: "/properties/$id", params: { id: dup.id } }) },
      });
      return;
    }
    if (!url && !text) {
      toast.error("Bitte Link oder Inseratstext eingeben.");
      return;
    }
    setLoading(true);
    try {
      const res = await extract({ data: { url, text } });
      if (!res.ok) {
        toast.error(res.error);
        // Allow manual entry
        const p = makeEmptyProperty({ link: url, missingData: ["Automatische Extraktion fehlgeschlagen"] });
        addProperty(p);
        navigate({ to: "/properties/$id", params: { id: p.id } });
        return;
      }
      const d = res.data;
      const mietrecht: Mietrecht = (d.mietrecht_hint as Mietrecht) || "unklar – rechtlich prüfen";
      const p: Property = makeEmptyProperty({
        link: url || d.url,
        platform: d.platform,
        title: d.title || "Ohne Titel",
        bezirk: d.district,
        adresse: d.location,
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
      addProperty(p);
      toast.success("Immobilie analysiert und gespeichert.");
      navigate({ to: "/properties/$id", params: { id: p.id } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Immobilie analysieren"
        description="Link einfügen – die KI liest die wichtigsten Daten aus und übernimmt sie in deine Investment-Kalkulation."
      />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <label className="block text-sm font-medium mb-2">Immobilien-Link einfügen</label>
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="flex-1 flex items-center gap-2 border rounded-md px-3 py-2.5 bg-background focus-within:ring-2 ring-ring">
            <LinkIcon className="size-4 text-muted-foreground" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.willhaben.at/iad/immobilien/..."
              className="flex-1 outline-none bg-transparent text-sm"
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Immobilie analysieren
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Unterstützt: willhaben, ImmoScout24, derStandard, immowelt, Makler- und Bauträgerseiten.
        </p>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium select-none">
            Falls der Link nicht ausgelesen werden kann: Inseratstext manuell einfügen
          </summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Hier den Exposé-/Inseratstext einfügen…"
            className="mt-3 w-full rounded-md border bg-background p-3 text-sm font-mono"
          />
        </details>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {[
          { t: "1. Link einfügen", d: "Wir versuchen zuerst, das Inserat direkt zu lesen." },
          { t: "2. KI extrahiert Daten", d: "Preis, Fläche, Bezirk, Zustand, Energieklasse u.v.m." },
          { t: "3. Kalkulation & Score", d: "Cashflow, Rendite, Ampel und Entscheidungsvorschlag." },
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
