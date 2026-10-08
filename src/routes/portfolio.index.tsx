import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import { fmtEUR, summarizePayments } from "@/lib/calc";
import { Buildings as Building2, Plus } from "@phosphor-icons/react";
import { planLimits, useAuth } from "@/lib/auth";
import { FeatureLocked } from "@/components/FeatureLocked";
import { isInPortfolio } from "@/lib/statusSync";

export const Route = createFileRoute("/portfolio/")({
  head: () => ({ meta: [{ title: "Portfolio – Bestand" }] }),
  component: Portfolio,
});

const bricolage = { fontFamily: "'Bricolage Grotesque', sans-serif" } as const;

function Portfolio() {
  const { properties, payments, activities } = useStore();
  const navigate = useNavigate();
  const { subscription } = useAuth();
  const rows = useMemo(() => {
    return properties
      // Gekauft und Aufnahme bestätigt (bzw. Altbestand) – "Später" bleibt draußen.
      .filter(isInPortfolio)
      .map((p) => {
        const list = payments.filter((x) => x.propertyId === p.id);
        const sum = summarizePayments(list);
        const crmCount = activities.filter((a) => a.propertyId === p.id).length;
        return { p, sum, crmCount };
      });
  }, [properties, payments, activities]);

  if (!planLimits(subscription?.plan).portfolio) {
    return (
      <AppShell>
        <div className="bg-[#F5F3EE] min-h-full">
          <div className="mb-5">
            <h1 className="heading-page-sm">Portfolio</h1>
            <p className="text-[13px] text-ink-2 mt-1">Bestand: bereits gekaufte Immobilien.</p>
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
      className="inline-flex items-center gap-2 rounded-[8px] bg-primary text-white px-3 py-2 text-[13px] font-medium hover:bg-[#235740]"
    >
      <Plus className="w-4 h-4" /> Gekaufte Immobilie hinzufügen
    </button>
  );

  return (
    <AppShell>
      <div className="bg-[#F5F3EE] min-h-full">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="heading-page-sm">Portfolio</h1>
            <p className="text-[13px] text-ink-2 mt-1">Bestand: bereits gekaufte Immobilien. Hier verfolgst du den Cashflow nach dem Kauf.</p>
          </div>
          {rows.length > 0 && addBtn}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-[12px] border border-[#EAE6DF] bg-white p-10 text-center text-ink-2">
            <Building2 className="w-8 h-8 mx-auto mb-3 opacity-50" aria-hidden />
            <div className="font-medium text-[#1C1917]">Noch keine gekauften Immobilien.</div>
            <div className="text-[13px] mt-1 max-w-md mx-auto">
              Setz einen Kaufkandidaten in der{" "}
              <Link to="/pipeline" className="font-medium text-primary underline-offset-4 hover:underline">Pipeline</Link>{" "}
              auf „Gekauft“ und bestätige die Übernahme ins Portfolio. Oder erfasse eine Immobilie, die du schon besitzt.
            </div>
            <div className="mt-4">{addBtn}</div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {rows.map(({ p, sum, crmCount }) => {
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
                  className="block rounded-[12px] border border-[#EAE6DF] bg-white p-5 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="text-[16px] text-[#1C1917] truncate" style={{ ...bricolage, fontWeight: 700 }}>{p.title || "—"}</div>
                      <div className="text-[12px] text-ink-3 mt-0.5 truncate">
                        {[p.adresse, p.bezirk, p.city, p.land].filter(Boolean).join(", ") || "—"}
                      </div>
                      {pi.kaufdatum && <div className="text-[12px] text-ink-3 mt-0.5">Kaufdatum: {pi.kaufdatum}</div>}
                    </div>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {crmCount > 0 && (
                        <span
                          className="text-[12px] rounded-[8px] px-2 py-0.5"
                          style={{ background: "#F5F3EE", color: "#78716C", border: "1px solid #EAE6DF" }}
                          title={`${crmCount} CRM-Aktivität${crmCount === 1 ? "" : "en"}`}
                        >
                          CRM · {crmCount}
                        </span>
                      )}
                      <span className="text-[12px] rounded-[8px] px-2 py-0.5" style={{ background: "#E8F5EE", color: "#2D6A4F" }}>Gekauft</span>
                    </span>
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
      <div className="text-[10px] uppercase tracking-wider text-ink-3 font-medium">{label}</div>
      <div
        className={`tabular-nums ${small ? "text-[14px]" : "text-[16px]"}`}
        style={{ ...bricolage, fontWeight: 700, color: color ?? "#1C1917" }}
      >
        {value}
      </div>
    </div>
  );
}
