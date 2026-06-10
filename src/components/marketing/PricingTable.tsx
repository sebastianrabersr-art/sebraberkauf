import { Check } from "lucide-react";
import { useState } from "react";
import { PLAN_PRICING, useAuth } from "@/lib/auth";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useNavigate } from "@tanstack/react-router";
import { isStripeConfigured } from "@/lib/stripe";
import { toast } from "sonner";

type Cycle = "monthly" | "yearly";

const TIERS = [
  {
    id: "free" as const,
    name: "Kostenlos",
    cta: "Kostenlos starten",
    highlight: false,
    features: [
      "1 Immobilie",
      "1 Projekt",
      "Volle Analyse für diese eine Immobilie",
      "Link-Import",
      "Finanzierung, Miete & Cashflow, Rendite",
      "Score",
      "Keine Vergleichsfunktion",
      "Kein Portfolio",
    ],
  },
  {
    id: "plus" as const,
    name: "Plus",
    cta: "Plus starten",
    highlight: true,
    features: [
      "Bis zu 5 Immobilien",
      "1 Projekt",
      "Alle Analysen",
      "Vergleichsfunktion",
      "Finanzierungsszenarien",
      "PDF-Upload",
      "Pipeline, Follow-ups, Besichtigungen",
      "Kein Portfolio",
    ],
  },
  {
    id: "premium" as const,
    name: "Premium",
    cta: "Premium starten",
    highlight: false,
    features: [
      "Unbegrenzt Immobilien",
      "Unbegrenzt Projekte",
      "Alle Funktionen",
      "Portfolio & Zahlungs-Tracking",
      "Export",
      "Advanced-Berechnungen",
    ],
  },
];

function priceFor(id: "free" | "plus" | "premium", cycle: Cycle) {
  const p = PLAN_PRICING[id];
  if (id === "free") return { amount: "0 €", period: "für immer" };
  if (cycle === "yearly") return { amount: `${p.yearly.toString().replace(".", ",")} €`, period: "pro Jahr" };
  return { amount: `${p.monthly.toString().replace(".", ",")} €`, period: "pro Monat" };
}

export function PricingTable() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const { user, subscription } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, checkoutDialog } = useStripeCheckout();

  const handleCta = (id: "free" | "plus" | "premium") => {
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

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setCycle("monthly")}
          className={`px-4 py-1.5 rounded-full text-sm border ${cycle === "monthly" ? "bg-foreground text-background" : "bg-card"}`}
        >Monatlich</button>
        <button
          onClick={() => setCycle("yearly")}
          className={`px-4 py-1.5 rounded-full text-sm border ${cycle === "yearly" ? "bg-foreground text-background" : "bg-card"}`}
        >Jährlich · spare mit jährlicher Zahlung</button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map((t) => {
          const price = priceFor(t.id, cycle);
          const isCurrent = user && subscription?.plan === t.id;
          return (
            <div key={t.id} className={`rounded-2xl border p-6 bg-card flex flex-col ${t.highlight ? "ring-2 ring-primary shadow-lg" : ""}`}>
              {t.highlight && <div className="text-xs font-medium uppercase text-primary mb-2">Empfohlen</div>}
              <h3 className="text-xl font-semibold">{t.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{price.amount}</span>
                <span className="text-sm text-muted-foreground">{price.period}</span>
              </div>
              {cycle === "yearly" && t.id !== "free" && (
                <div className="text-xs text-muted-foreground mt-1">Spare mit jährlicher Zahlung.</div>
              )}
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="size-4 text-primary mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <button
                onClick={() => handleCta(t.id)}
                disabled={!!isCurrent}
                className={`mt-6 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${t.highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
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
