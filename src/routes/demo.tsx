import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PricingTable } from "@/components/marketing/PricingTable";
import { FaqList } from "@/components/marketing/FaqList";
import { ArrowRight, Calculator, Link2, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo – kauf ma Immobilienanalyse" },
      { name: "description", content: "Sieh dir die kauf ma Demo öffentlich an: Link-Analyse, Rechner, Preise und Ratgeber ohne Login." },
      { property: "og:title", content: "Demo – kauf ma Immobilienanalyse" },
      { property: "og:description", content: "Öffentliche Demo für Immobilienanalyse, Rechner und Investment-Workflow." },
    ],
  }),
  component: Demo,
});

function Demo() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-center">Demo ansehen</h1>
        <p className="text-muted-foreground text-center mt-3 max-w-2xl mx-auto">
          Teste die öffentlichen Bereiche von kauf ma: Link-Preview auf der Startseite, Rechner, Preise und Ratgeber – ohne Login.
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          <a href="/" className="rounded-2xl border bg-card p-6 hover:border-primary transition-colors">
            <Link2 className="size-8 text-primary" />
            <h2 className="font-semibold mt-4">Immobilie analysieren</h2>
            <p className="text-sm text-muted-foreground mt-2">Zurück zur Startseite und Immobilienlink für eine Preview einfügen.</p>
          </a>
          <a href="/rechner" className="rounded-2xl border bg-card p-6 hover:border-primary transition-colors">
            <Calculator className="size-8 text-primary" />
            <h2 className="font-semibold mt-4">Rechner nutzen</h2>
            <p className="text-sm text-muted-foreground mt-2">Kaufnebenkosten, Rendite und Cashflow öffentlich berechnen.</p>
          </a>
          <a href="/ratgeber" className="rounded-2xl border bg-card p-6 hover:border-primary transition-colors">
            <TrendingUp className="size-8 text-primary" />
            <h2 className="font-semibold mt-4">Ratgeber lesen</h2>
            <p className="text-sm text-muted-foreground mt-2">Grundlagen zu Immobilienkauf, Rendite und Cashflow lesen.</p>
          </a>
        </div>

        <div className="mt-14 text-center">
          <a href="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold text-sm hover:bg-primary/90">
            Preise ansehen <ArrowRight className="size-4" />
          </a>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 border-t">
        <h2 className="text-3xl font-semibold text-center">Preise</h2>
        <div className="mt-10"><PricingTable /></div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 border-t">
        <h2 className="text-3xl font-semibold text-center">Häufige Fragen</h2>
        <div className="mt-8"><FaqList /></div>
      </section>
    </MarketingShell>
  );
}