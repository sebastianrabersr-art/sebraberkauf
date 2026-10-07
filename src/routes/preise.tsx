import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PricingTable } from "@/components/marketing/PricingTable";

export const Route = createFileRoute("/preise")({
  head: () => ({
    meta: [
      { title: "Preise – kaufma" },
      { name: "description", content: "Kostenlos starten oder mit Plus / Premium mehr Immobilien verwalten." },
      { property: "og:title", content: "Preise – kaufma" },
      { property: "og:description", content: "Kostenlos starten oder mit Plus / Premium mehr Immobilien verwalten." },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: Preise,
});

function Preise() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="heading-page text-center">Preise</h1>
        <p className="text-muted-foreground text-center mt-3 max-w-xl mx-auto">Starte kostenlos. Upgrade jederzeit. Kündige jederzeit.</p>
        <div className="mt-10"><PricingTable /></div>
      </section>
    </MarketingShell>
  );
}