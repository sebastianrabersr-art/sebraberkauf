import { Check, Minus } from "@phosphor-icons/react";
import { useState } from "react";
import { PLAN_PRICING, useAuth } from "@/lib/auth";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useNavigate } from "@tanstack/react-router";
import { isStripeConfigured } from "@/lib/stripe";
import { toast } from "sonner";

type Cycle = "monthly" | "yearly";
type PaidPlan = "plus" | "premium";
type Feature = { label: string; included: boolean };

const yes = (label: string): Feature => ({ label, included: true });
const no = (label: string): Feature => ({ label, included: false });

const TIERS = [
  {
    id: "free" as const,
    name: "Kostenlos",
    cta: "Kostenlos starten",
    highlight: false,
    features: [
      yes("1 Immobilie"),
      yes("1 Projekt"),
      yes("Volle Analyse für diese eine Immobilie"),
      yes("Link-Import"),
      yes("Finanzierung, Miete & Cashflow, Rendite"),
      yes("Score"),
      no("Vergleichsfunktion"),
      no("Portfolio"),
    ],
  },
  {
    id: "plus" as const,
    name: "Plus",
    cta: "Plus starten",
    highlight: true,
    features: [
      yes("Bis zu 5 Immobilien"),
      yes("1 Projekt"),
      yes("Alle Analysen"),
      yes("Vergleichsfunktion"),
      yes("Finanzierungsszenarien"),
      yes("PDF-Upload"),
      yes("Pipeline, Follow-ups, Besichtigungen"),
      no("Portfolio"),
    ],
  },
  {
    id: "premium" as const,
    name: "Premium",
    cta: "Premium starten",
    highlight: false,
    features: [
      yes("Unbegrenzt Immobilien"),
      yes("Unbegrenzt Projekte"),
      yes("Alle Funktionen"),
      yes("Portfolio & Zahlungs-Tracking"),
      yes("Export"),
      yes("Advanced-Berechnungen"),
    ],
  },
];

const eur = (n: number) =>
  n.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/** Ersparnis beim Jahresabo gegenüber 12 Monatszahlungen. */
function yearlySavings(id: PaidPlan) {
  const p = PLAN_PRICING[id];
  const saved = p.monthly * 12 - p.yearly;
  return { saved, freeMonths: Math.round(saved / p.monthly), perMonth: p.yearly / 12 };
}

// Gleich für Plus und Premium (2 Monate) – für den Umschalter genügt ein Wert.
const FREE_MONTHS = yearlySavings("plus").freeMonths;

function priceFor(id: "free" | PaidPlan, cycle: Cycle) {
  if (id === "free") return { amount: "0 €", period: "für immer" };
  const p = PLAN_PRICING[id];
  if (cycle === "yearly") return { amount: eur(p.yearly), period: "pro Jahr" };
  return { amount: eur(p.monthly), period: "pro Monat" };
}

export function PricingTable() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const { user, subscription } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, checkoutDialog } = useStripeCheckout();

  const handleCta = (id: "free" | PaidPlan) => {
    if (id === "free") {
      navigate({ to: user ? "/dashboard" : "/signup" });
      return;
    }
    if (!user) {
      navigate({ to: "/signup", search: { plan: id } as any });
      return;
    }
    if (subscription?.plan === id) {
      toast.info(`Du bist bereits auf ${id === "plus" ? "Plus" : "Premium"}.`);
      return;
    }
    if (!isStripeConfigured()) return toast.error("Zahlungen sind noch nicht konfiguriert.");
    openCheckout({
      priceId: `${id}_${cycle === "monthly" ? "monthly" : "yearly"}`,
      title: `Upgrade auf ${id === "plus" ? "Plus" : "Premium"}`,
    });
  };

  const cycleBtn = (c: Cycle, label: string) => (
    <button
      type="button"
      onClick={() => setCycle(c)}
      aria-pressed={cycle === c}
      className={`px-4 py-1.5 rounded-full text-[13px] border transition-colors ${
        cycle === c ? "bg-[#1C1917] text-white border-[#1C1917]" : "bg-white text-[#1C1917] border-[#EAE6DF] hover:border-[#1C1917]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-8">
        {cycleBtn("monthly", "Monatlich")}
        {cycleBtn("yearly", `Jährlich · ${FREE_MONTHS} Monate gratis`)}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map((t) => {
          const price = priceFor(t.id, cycle);
          const isCurrent = user && subscription?.plan === t.id;
          const savings = t.id !== "free" ? yearlySavings(t.id) : null;
          return (
            <div
              key={t.id}
              className={`rounded-[12px] border bg-white p-6 flex flex-col ${t.highlight ? "border-[#2D6A4F] ring-1 ring-[#2D6A4F]" : "border-[#EAE6DF]"}`}
            >
              <h3 className="flex items-center gap-2 font-display text-[20px] font-extrabold text-[#1C1917]">
                {t.name}
                {t.highlight && (
                  <span className="font-sans text-[11px] font-semibold tracking-normal rounded-full bg-[#E8F5EE] text-[#2D6A4F] px-2 py-0.5">
                    Empfohlen
                  </span>
                )}
              </h3>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-[30px] font-extrabold tabular-nums text-[#1C1917]">{price.amount}</span>
                <span className="text-[13px] text-ink-2">{price.period}</span>
              </div>
              {cycle === "yearly" && savings && (
                <div className="text-[12px] text-ink-2 mt-1">
                  {eur(savings.perMonth)} pro Monat · du sparst {eur(savings.saved)}
                </div>
              )}
              <ul className="mt-5 space-y-2 text-[14px] flex-1">
                {t.features.map((f) =>
                  f.included ? (
                    <li key={f.label} className="flex gap-2 text-[#1C1917]">
                      <Check weight="bold" className="size-4 text-[#2D6A4F] mt-0.5 shrink-0" aria-hidden />
                      {f.label}
                    </li>
                  ) : (
                    <li key={f.label} className="flex gap-2 text-ink-3">
                      <Minus weight="bold" className="size-4 mt-0.5 shrink-0" aria-hidden />
                      <span>
                        <span className="sr-only">Nicht enthalten: </span>
                        <span className="line-through decoration-[#D4CFC8]">{f.label}</span>
                      </span>
                    </li>
                  ),
                )}
              </ul>
              <button
                type="button"
                onClick={() => handleCta(t.id)}
                disabled={!!isCurrent}
                className={`mt-6 inline-flex items-center justify-center rounded-[8px] px-4 py-2.5 text-[14px] font-medium transition-colors disabled:opacity-60 ${
                  t.highlight
                    ? "bg-[#2D6A4F] text-white hover:bg-[#235740]"
                    : "bg-white text-[#1C1917] border-[1.5px] border-[#EAE6DF] hover:border-[#1C1917]"
                }`}
              >
                {isCurrent ? "Aktueller Plan" : t.cta}
              </button>
            </div>
          );
        })}
      </div>
      {checkoutDialog}
    </div>
  );
}
