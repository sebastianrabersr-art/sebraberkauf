import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PricingTable } from "@/components/marketing/PricingTable";
import { FaqList } from "@/components/marketing/FaqList";
import { ArrowRight, Calculator, FileText, Link2, ShieldCheck, TrendingUp, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kauf ma – Immobilien-Investments in Sekunden bewerten" },
      { name: "description", content: "Importiere Inserate oder PDFs, berechne Rendite, Cashflow und Mietrecht-Risiko. Für private Käufer, Anleger und Familien." },
      { property: "og:title", content: "kauf ma – Immobilien-Investments in Sekunden bewerten" },
      { property: "og:description", content: "Bewerte Wohnungen blitzschnell: Rendite, Cashflow, Maklerkosten und Mietrecht-Risiko." },
    ],
  }),
  component: Landing,
});

function Feature({ icon: Icon, title, children }: any) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3">
        <Icon className="size-5" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5">{children}</p>
    </div>
  );
}

function Landing() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground mb-5">
          <Calculator className="size-3.5" /> Immobilien-Rechner & CRM für Käufer
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Kauf ich – oder kauf ich nicht?
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-lg text-muted-foreground">
          <strong>kauf ma</strong> bewertet jede Eigentumswohnung in Sekunden: Rendite, Cashflow, Maklerkosten, Kaufnebenkosten, Mietrecht-Risiko. Importiere willhaben-Links oder lade ein Exposé hoch.
        </p>
        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <a href="/signup" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3 font-medium">
            Kostenlos starten <ArrowRight className="size-4" />
          </a>
          <a href="/pricing" className="inline-flex items-center gap-2 rounded-md border bg-card px-6 py-3 font-medium">
            Preise ansehen
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Keine Kreditkarte. 1 Immobilie gratis. Jederzeit upgraden.</p>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t">
        <h2 className="text-3xl font-semibold text-center">Alles in einem Tool</h2>
        <p className="text-muted-foreground text-center mt-2">Von der ersten Inserat-Idee bis zum Notartermin.</p>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          <Feature icon={Link2} title="Link- & PDF-Import">Inserate von willhaben oder ImmoScout per URL erfassen, Exposés als PDF hochladen.</Feature>
          <Feature icon={TrendingUp} title="Rendite & Cashflow">Brutto-/Nettorendite, monatlicher Cashflow, Mindestmiete – inkl. aller Kaufnebenkosten.</Feature>
          <Feature icon={Wallet} title="Maklerkosten transparent">Provision in %, netto, brutto, USt – auch rückwärts gerechnet. Verkäuferart Privat/Makler/Bauträger.</Feature>
          <Feature icon={ShieldCheck} title="Mietrecht-Risiko">MRG-Vollanwendung erkennen, Richtwertzonen, Befristungsabschlag – als Ampel.</Feature>
          <Feature icon={Calculator} title="Bank-Szenarien">Mehrere Finanzierungen vergleichen, Zahlungsplan als Grafik, Sondertilgungen.</Feature>
          <Feature icon={FileText} title="CRM & Follow-ups">Pipeline, Besichtigungen, Aufgaben, Notizen – pro Immobilie und Projekt.</Feature>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 border-t">
        <h2 className="text-3xl font-semibold text-center">Einfache Preise</h2>
        <p className="text-muted-foreground text-center mt-2">Starte gratis, upgrade wenn du mehr brauchst.</p>
        <div className="mt-10"><PricingTable /></div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 border-t">
        <h2 className="text-3xl font-semibold text-center">Häufige Fragen</h2>
        <div className="mt-8"><FaqList /></div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center border-t">
        <h2 className="text-3xl font-semibold">Bereit, die erste Immobilie zu bewerten?</h2>
        <p className="text-muted-foreground mt-2">Kostenlos starten – Upgrade nur, wenn du es wirklich brauchst.</p>
        <a href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3 font-medium">
          Kostenlos starten <ArrowRight className="size-4" />
        </a>
      </section>
    </MarketingShell>
  );
}
