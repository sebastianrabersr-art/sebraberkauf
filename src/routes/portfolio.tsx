import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import { fmtEUR, summarizePayments } from "@/lib/calc";
import { Building2, Plus } from "lucide-react";

export const Route = createFileRoute("/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio – Bestand" }] }),
  component: Portfolio,
});

function Portfolio() {
  const { properties, payments } = useStore();
  const rows = useMemo(() => {
    return properties
      .filter((p) => p.status === "Gekauft")
      .map((p) => {
        const list = payments.filter((x) => x.propertyId === p.id);
        const sum = summarizePayments(list);
        return { p, sum };
      });
  }, [properties, payments]);

  return (
    <AppShell>
      <PageHeader
        title="Portfolio"
        description="Bestand: bereits gekaufte Immobilien — Cashflow nach dem Kauf nachverfolgen."
      />
      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <Building2 className="size-8 mx-auto mb-3 opacity-50" />
          <div className="font-medium text-foreground">Noch keine gekauften Immobilien.</div>
          <div className="text-sm mt-1">Setze den Status einer Immobilie auf „Gekauft", um sie hier zu sehen.</div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {rows.map(({ p, sum }) => {
            const pi = p.purchase ?? {};
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
                  <Cell label="Kaufpreis" value={fmtEUR(pi.tatsKaufpreis ?? p.kaufpreis)} />
                  <Cell label="Eigenkapital" value={fmtEUR(pi.tatsEigenkapital)} />
                  <Cell label="Kredit" value={fmtEUR(pi.tatsKreditbetrag)} />
                  <Cell label="Bank" value={pi.bank || "—"} />
                  <Cell label="Kreditstatus" value={pi.kreditstatus || "—"} />
                  <Cell label="Restschuld" value={fmtEUR(pi.aktuelleRestschuld)} />
                  <Cell label="Rate mtl." value={fmtEUR(pi.aktuelleMonatsrate)} />
                  <Cell label="Miete mtl." value={fmtEUR(pi.aktuelleMonatsmiete)} />
                  <Cell label="Kosten mtl." value={fmtEUR(pi.tatsMonatlicheKosten)} />
                </div>
                <div className="border-t mt-3 pt-3 grid grid-cols-3 gap-2 text-xs">
                  <Cell label="Einnahmen ges." value={fmtEUR(sum.einnahmenGesamt)} tone="good" />
                  <Cell label="Ausgaben ges." value={fmtEUR(sum.ausgabenGesamt)} tone="bad" />
                  <Cell label="Netto-Cashflow" value={fmtEUR(sum.nettoCashflow)} tone={sum.nettoCashflow >= 0 ? "good" : "bad"} />
                  <Cell label="Cashflow Monat" value={fmtEUR(sum.cashflowMonat)} tone={sum.cashflowMonat >= 0 ? "good" : "bad"} />
                  <Cell label="Cashflow Jahr" value={fmtEUR(sum.cashflowJahr)} tone={sum.cashflowJahr >= 0 ? "good" : "bad"} />
                  <Cell label="Offene Zahl." value={`${sum.offenAnzahl} · ${fmtEUR(sum.offenSumme)}`} />
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
