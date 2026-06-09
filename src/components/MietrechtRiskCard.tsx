import { AmpelBadge } from "@/components/AmpelBadge";
import { inferMietrecht } from "@/lib/calc";
import { countryOf, findRegion, sourcesFor } from "@/lib/regions";
import type { Property } from "@/lib/types";
import { ExternalLink, Scale } from "lucide-react";

interface Props {
  p: Property;
  compact?: boolean;
}

export function MietrechtRiskCard({ p, compact }: Props) {
  const m = inferMietrecht(p);
  const country = countryOf(p.land);
  const region = findRegion(country, p.bundesland);
  const sources = sourcesFor(country);
  const ampel = m.risiko === "niedrig" ? "green" : m.risiko === "mittel" ? "yellow" : "red";

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Scale className="size-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Mietrechtliche Einschätzung</h3>
        </div>
        <AmpelBadge ampel={ampel}>{m.kategorie} · Risiko {m.risiko}</AmpelBadge>
      </div>

      <p className="text-sm text-muted-foreground">{m.erklaerung}</p>

      {region && (
        <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">
          <strong>{region.name} ({region.country}):</strong> {region.mietrechtHinweis}
        </p>
      )}

      {!compact && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Offene Fragen / vor Kauf prüfen</div>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {m.pruefen.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Quellen ({country === "DE" ? "Deutschland" : "Österreich"})</div>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-xs rounded-md border bg-background px-2 py-1 hover:bg-accent">
                {s.label} <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] italic text-muted-foreground border-t pt-2">
        Diese Einschätzung ist eine KI-basierte Orientierung und ersetzt keine Rechts-, Steuer- oder Finanzberatung.
      </p>
    </div>
  );
}
