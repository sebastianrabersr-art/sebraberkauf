import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import { fmtEUR, summarizePayments } from "@/lib/calc";
import { Building2, Plus } from "lucide-react";

export const Route = createFileRoute("/portfolio/")({
  head: () => ({ meta: [{ title: "Portfolio – Bestand" }] }),
  component: Portfolio,
});

function Portfolio() {
  const { properties, payments } = useStore();
  const navigate = useNavigate();
  const rows = useMemo(() => {
    return properties
      .filter((p) => p.status === "Gekauft")
      .map((p) => {
        const list = payments.filter((x) => x.propertyId === p.id);
        const sum = summarizePayments(list);
        return { p, sum };
      });
  }, [properties, payments]);

  const addBtn = (
    <button
      onClick={() => navigate({ to: "/portfolio/new" })}
      className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
    >
      <Plus className="size-4" /> Gekaufte Immobilie hinzufügen
    </button>
  );

  return (
    <AppShell>
      <PageHeader
        title="Portfolio"
        description="Bestand: bereits gekaufte Immobilien — Cashflow nach dem Kauf nachverfolgen."
        actions={addBtn}
      />
      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <Building2 className="size-8 mx-auto mb-3 opacity-50" />
          <div className="font-medium text-foreground">Noch keine gekauften Immobilien.</div>
          <div className="text-sm mt-1">Klicke oben auf „Gekaufte Immobilie hinzufügen", um eine bereits gekaufte Immobilie zu erfassen — auch wenn der Kauf schon Jahre zurückliegt.</div>
          <div className="mt-4">{addBtn}</div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {rows.map(({ p, sum }) => {
            const pi = p.purchase ?? {};
            const mtlMiete = pi.aktuelleMonatsmiete ?? p.nettomieteMtl ?? 0;
            const mtlRate = pi.aktuelleMonatsrate ?? 0;
            const mtlKosten =
              (pi.tatsMonatlicheKosten ?? 0) ||
              ((pi.betriebskostenMtl ?? 0) + (pi.nichtUmlMtl ?? 0) + (pi.ruecklageMtl ?? 0) +
                (pi.versicherungMtl ?? 0) + (pi.verwaltungMtl ?? 0) + (pi.sonstigeMtlKosten ?? 0));
            const mtlCashflow = mtlMiete - mtlRate - mtlKosten;
            return (
              <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="rounded-xl border bg-card p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold">{p.title || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {[p.adresse, p.bezirk, p.city, p.land].filter(Boolean).join(", ") || "—"}
                    </div>
                    {pi.kaufdatum && <div className="text-[11px] text-muted-foreground mt-0.5">Kaufdatum: {pi.kaufdatum}</div>}
                  </div>
                  <span className="text-[11px] rounded-full border bg-success/10 text-success border-success/40 px-2 py-0.5">Gekauft</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Cell label="Aktueller Wert" value={fmtEUR(pi.aktuellerObjektwert)} />
                  <Cell label="Kaufpreis" value={fmtEUR(pi.tatsKaufpreis ?? p.kaufpreis)} />
                  <Cell label="Restschuld" value={fmtEUR(pi.aktuelleRestschuld)} />
                  <Cell label="Rate mtl." value={fmtEUR(mtlRate)} />
                  <Cell label="Miete mtl." value={fmtEUR(mtlMiete)} />
                  <Cell label="Cashflow mtl." value={fmtEUR(mtlCashflow)} tone={mtlCashflow >= 0 ? "good" : "bad"} />
                  <Cell label="Bank" value={pi.bank || "—"} />
                  <Cell label="Kreditstatus" value={pi.kreditstatus || "—"} />
                  <Cell label="Nächste Zinsanp." value={pi.naechsteZinsanpassung || "—"} />
                </div>
                <div className="border-t mt-3 pt-3 grid grid-cols-3 gap-2 text-xs">
                  <Cell label="Einnahmen ges." value={fmtEUR(sum.einnahmenGesamt)} tone="good" />
                  <Cell label="Ausgaben ges." value={fmtEUR(sum.ausgabenGesamt)} tone="bad" />
                  <Cell label="Netto-Cashflow bisher" value={fmtEUR(sum.nettoCashflow)} tone={sum.nettoCashflow >= 0 ? "good" : "bad"} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-medium tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
