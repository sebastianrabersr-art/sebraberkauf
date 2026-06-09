import { Info } from "lucide-react";
import { useState } from "react";
import { calcProperty, calcScore, scoreBreakdown } from "@/lib/calc";
import { useActiveAssumptions } from "@/lib/store";
import type { Property } from "@/lib/types";

export function ScoreBreakdownCard({ p }: { p: Property }) {
  const a = useActiveAssumptions();
  const c = calcProperty(p, a);
  const s = calcScore(p, a, c);
  const cats = scoreBreakdown(p, a, c, s);
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Score-Zusammensetzung</h3>
            <button
              onClick={() => setOpen((v) => !v)}
              title="Der Score ist eine Orientierung zur Kaufbewertung und ersetzt keine professionelle Prüfung."
              className="text-muted-foreground hover:text-foreground"
            >
              <Info className="size-4" />
            </button>
          </div>
          {open && (
            <p className="text-[11px] text-muted-foreground mt-1 max-w-md">
              Der Score ist eine Orientierung zur Kaufbewertung und ersetzt keine professionelle Prüfung.
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Gesamtscore</div>
          <div className="text-2xl font-semibold">{s.total}<span className="text-sm text-muted-foreground">/100</span></div>
        </div>
      </div>
      <ul className="space-y-2">
        {cats.map((cat) => {
          const pct = cat.max > 0 ? (cat.value / cat.max) * 100 : 0;
          const tone = pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive";
          const lost = cat.max - cat.value;
          return (
            <li key={cat.key} className="border rounded-md p-2.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium">{cat.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {cat.value.toFixed(1)} / {cat.max} Punkte
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{cat.explain}</p>
              {lost > 0.5 && (
                <p className="text-[11px] text-warning-foreground mt-0.5">
                  − {lost.toFixed(1)} Punkte abgezogen
                  {cat.missing && cat.missing.length > 0 ? ` · fehlt: ${cat.missing.join(", ")}` : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
