import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import { fmtEUR, summarizePayments } from "@/lib/calc";
import { Building2, Plus } from "lucide-react";
import { planLimits, useAuth } from "@/lib/auth";
import { FeatureLocked } from "@/components/FeatureLocked";

export const Route = createFileRoute("/portfolio/")({
  head: () => ({ meta: [{ title: "Portfolio – Bestand" }] }),
  component: Portfolio,
});

const bricolage = { fontFamily: "'Bricolage Grotesque', sans-serif" } as const;

function Portfolio() {
  const { properties, payments } = useStore();
  const navigate = useNavigate();
  const { subscription } = useAuth();
  const rows = useMemo(() => {
    return properties
      .filter((p) => p.status === "Gekauft" || p.prozessStatus === "Gekauft")
      .map((p) => {
        const list = payments.filter((x) => x.propertyId === p.id);
        const sum = summarizePayments(list);
        return { p, sum };
      });
  }, [properties, payments]);

  if (!planLimits(subscription?.plan).portfolio) {
    return (
      <AppShell>
        <div className="bg-[#F5F3EE] min-h-full -m-6 p-6">
          <div className="mb-5">
            <h1 className="text-[28px] text-[#1C1917]" style={{ ...bricolage, fontWeight: 800, letterSpacing: "-0.03em" }}>Portfolio</h1>
            <p className="text-[13px] text-[#78716C] mt-1">Bestand: bereits gekaufte Immobilien.</p>
          </div>
          <FeatureLocked
            title="Portfolio ist in Premium enthalten"
            description="Mit Premium verwaltest du deinen Bestand, trackst Zahlungen und siehst den realen Cashflow nach dem Kauf."
            recommendPlan="premium"
          />
        </div>
      </AppShell>
    );
  }

  const addBtn = (
    <button
      onClick={() => navigate({ to: "/portfolio/new" })}
      className="inline-flex items-center gap-2 rounded-[8px] bg-[#2D6A4F] text-white px-3 py-2 text-[13px] font-medium hover:bg-[#235940]"
    >
      <Plus className="w-4 h-4" /> Gekaufte Immobilie hinzufügen
    </button>
  );

  return (
    <AppShell>
      <div className="bg-[#F5F3EE] min-h-full -m-6 p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-[28px] text-[#1C1917]" style={{ ...bricolage, fontWeight: 800, letterSpacing: "-0.03em" }}>Portfolio</h1>
            <p className="text-[13px] text-[#78716C] mt-1">Bestand: bereits gekaufte Immobilien — Cashflow nach dem Kauf nachverfolgen.</p>
          </div>
          {addBtn}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-[12px] border border-[#EAE6DF] bg-white p-10 text-center text-[#78716C]">
            <Building2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <div className="font-medium text-[#1C1917]">Noch keine gekauften Immobilien.</div>
            <div className="text-[13px] mt-1">Klicke oben auf „Gekaufte Immobilie hinzufügen", um eine bereits gekaufte Immobilie zu erfassen.</div>
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
              const cashColor = mtlCashflow >= 0 ? "#2D6A4F" : "#DC2626";
              return (
                <Link
                  key={p.id}
                  to="/portfolio/$id"
                  params={{ id: p.id }}
                  className="block rounded-[12px] border border-[#EAE6DF] bg-white p-5 hover:border-[#2D6A4F] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="text-[16px] text-[#1C1917] truncate" style={{ ...bricolage, fontWeight: 700 }}>{p.title || "—"}</div>
                      <div className="text-[12px] text-[#A8A29E] mt-0.5 truncate">
                        {[p.adresse, p.bezirk, p.city, p.land].filter(Boolean).join(", ") || "—"}
                      </div>
                      {pi.kaufdatum && <div className="text-[11px] text-[#A8A29E] mt-0.5">Kaufdatum: {pi.kaufdatum}</div>}
                    </div>
                    <span className="text-[11px] rounded-[6px] px-2 py-0.5 shrink-0" style={{ background: "#E8F5EE", color: "#2D6A4F" }}>Gekauft</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="Aktueller Wert" value={fmtEUR(pi.aktuellerObjektwert)} />
                    <Stat label="Restschuld" value={fmtEUR(pi.aktuelleRestschuld)} />
                    <Stat label="Cashflow mtl." value={fmtEUR(mtlCashflow)} color={cashColor} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#EAE6DF]">
                    <Stat label="Einnahmen ges." value={fmtEUR(sum.einnahmenGesamt)} color="#2D6A4F" small />
                    <Stat label="Ausgaben ges." value={fmtEUR(sum.ausgabenGesamt)} color="#DC2626" small />
                    <Stat label="Netto bisher" value={fmtEUR(sum.nettoCashflow)} color={sum.nettoCashflow >= 0 ? "#2D6A4F" : "#DC2626"} small />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-medium">{label}</div>
      <div
        className={`tabular-nums ${small ? "text-[14px]" : "text-[16px]"}`}
        style={{ ...bricolage, fontWeight: 700, color: color ?? "#1C1917" }}
      >
        {value}
      </div>
    </div>
  );
}
