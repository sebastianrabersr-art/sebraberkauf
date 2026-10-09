import { Check, Minus } from "@phosphor-icons/react";
import { useState } from "react";
import { PLAN_PRICING, useAuth } from "@/lib/auth";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useNavigate } from "@tanstack/react-router";
import { isStripeConfigured } from "@/lib/stripe";
import { toast } from "sonner";
import { PLAN_CARDS, type PlanId } from "@/lib/planFeatures";

type Cycle = "monthly" | "yearly";
type PaidPlan = Exclude<PlanId, "free">;

/** Optik pro Plan: Plus ist die klare Empfehlung, Premium leise abgesetzt, Free neutral. */
const TIERS: { id: PlanId; cta: string; tone: "neutral" | "primary" | "subtle" }[] = [
  { id: "free", cta: "Kostenlos starten", tone: "neutral" },
  { id: "plus", cta: "Plus starten", tone: "primary" },
  { id: "premium", cta: "Premium starten", tone: "subtle" },
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

function priceFor(id: PlanId, cycle: Cycle) {
  if (id === "free") return { amount: "0 €", period: "für immer" };
  const p = PLAN_PRICING[id];
  if (cycle === "yearly") return { amount: eur(p.yearly), period: "pro Jahr" };
  return { amount: eur(p.monthly), period: "pro Monat" };
}

/** tierHeading: "h2" auf eigenen Preisseiten (direkt unter dem h1), "h3" in einem Abschnitt mit eigener h2. */
export function PricingTable({ tierHeading: TierHeading = "h3" }: { tierHeading?: "h2" | "h3" } = {}) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const { user, subscription } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, checkoutDialog } = useStripeCheckout();

  const handleCta = (id: PlanId) => {
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

  const segment = (c: Cycle, children: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setCycle(c)}
      aria-pressed={cycle === c}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        cycle === c ? "bg-[#1C1917] text-white" : "text-[#1C1917] hover:bg-[#F5F3EE]"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div>
      {/* Abrechnung: ein Schalter, die Ersparnis steht direkt daneben */}
      <div className="flex justify-center mb-12">
        <div role="group" aria-label="Abrechnungszeitraum" className="inline-flex items-center gap-1 rounded-full border border-[#EAE6DF] bg-white p-1">
          {segment("monthly", "Monatlich")}
          {segment(
            "yearly",
            <>
              Jährlich
              <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${cycle === "yearly" ? "bg-white/15 text-white" : "bg-[#E8F5EE] text-primary"}`}>
                {FREE_MONTHS} Monate gratis
              </span>
            </>,
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 md:items-stretch">
        {TIERS.map((t) => {
          const card = PLAN_CARDS[t.id];
          const price = priceFor(t.id, cycle);
          const isCurrent = !!user && subscription?.plan === t.id;
          const savings = t.id !== "free" ? yearlySavings(t.id) : null;
          const primary = t.tone === "primary";
          return (
            <div
              key={t.id}
              className={`relative flex flex-col rounded-[16px] bg-white p-6 sm:p-7 ${
                primary
                  ? "border-2 border-primary shadow-[0_18px_40px_-24px_rgba(45,106,79,0.45)] md:-my-3 md:py-10"
                  : t.tone === "subtle"
                    ? "border-[1.5px] border-primary/30"
                    : "border border-[#EAE6DF]"
              }`}
            >
              {primary && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[12px] font-semibold text-white">
                  Unsere Empfehlung
                </span>
              )}

              <TierHeading className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#1C1917]">
                {card.name}
              </TierHeading>
              <p className="mt-1 text-[14px] text-ink-2">{card.sub}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] tabular-nums text-[#1C1917]">
                  {price.amount}
                </span>
                <span className="text-[14px] text-ink-2">{price.period}</span>
              </div>
              {/* Feste Höhe, damit die Karten beim Umschalten nicht springen */}
              <p className="mt-2 min-h-[20px] text-[13px] text-ink-2">
                {cycle === "yearly" && savings ? <>entspricht {eur(savings.perMonth)} pro Monat, du sparst {eur(savings.saved)}</> : null}
              </p>

              <ul className="mt-6 space-y-3 text-[14px] leading-snug flex-1">
                {card.features.map((f) =>
                  f.included ? (
                    <li key={f.label} className="flex gap-2.5 text-[#1C1917]">
                      <Check weight="bold" className="size-4 text-primary mt-0.5 shrink-0" aria-hidden />
                      {f.label}
                    </li>
                  ) : (
                    <li key={f.label} className="flex gap-2.5 text-ink-3">
                      <Minus weight="bold" className="size-4 mt-0.5 shrink-0" aria-hidden />
                      <span>
                        <span className="sr-only">Nicht enthalten: </span>
                        {f.label}
                      </span>
                    </li>
                  ),
                )}
              </ul>

              <button
                type="button"
                onClick={() => handleCta(t.id)}
                disabled={isCurrent}
                className={`mt-8 inline-flex w-full items-center justify-center rounded-[8px] px-4 py-3 text-[14px] font-semibold transition-[background-color,border-color,transform] active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  primary
                    ? "bg-primary text-white hover:bg-[#235740]"
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
