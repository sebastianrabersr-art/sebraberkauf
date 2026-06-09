import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PricingTable } from "@/components/marketing/PricingTable";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Preise – kauf ma" },
      { name: "description", content: "Kostenlos starten oder mit Plus / Premium mehr Immobilien verwalten." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-center">Preise</h1>
        <p className="text-muted-foreground text-center mt-3 max-w-xl mx-auto">Starte kostenlos. Upgrade jederzeit. Kündige jederzeit.</p>
        <div className="mt-10"><PricingTable /></div>
      </section>
    </MarketingShell>
  );
}
