import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PricingTable } from "@/components/marketing/PricingTable";
import { FaqList } from "@/components/marketing/FaqList";
import {
  ArrowRight,
  Calculator,
  Check,
  ChevronRight,
  FileText,
  Link2,
  Play,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Wallet,
  X,
  GitCompareArrows,
} from "lucide-react";

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

function HeroMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0 perspective-1000">
      {/* Main app window */}
      <div className="relative bg-card rounded-2xl border shadow-2xl shadow-primary/5 overflow-hidden">
        {/* Title bar */}
        <div className="px-4 py-3 border-b flex items-center gap-2 bg-muted/30">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-destructive/80" />
            <div className="size-2.5 rounded-full bg-warning/80" />
            <div className="size-2.5 rounded-full bg-success/80" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-[11px] text-muted-foreground font-medium">kauf ma – Eigentumswohnung Wien</span>
          </div>
        </div>
        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Score bar */}
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold text-lg">7.8</div>
            <div className="flex-1">
              <div className="text-sm font-medium">Gesamtbewertung</div>
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= 4 ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
            </div>
            <div className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">Interessant</div>
          </div>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bruttorendite</div>
              <div className="text-lg font-semibold mt-0.5">4.8 %</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Monatl. Cashflow</div>
              <div className="text-lg font-semibold mt-0.5 text-success">+ 312 €</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Kaufpreis / m²</div>
              <div className="text-lg font-semibold mt-0.5">4.120 €</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mietrecht-Risiko</div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="size-2.5 rounded-full bg-warning" />
                <span className="text-sm font-medium">Mittel</span>
              </div>
            </div>
          </div>
          {/* Mini chart */}
          <div className="rounded-xl bg-muted/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Zahlungsplan (10 Jahre)</div>
            <div className="flex items-end gap-1 h-16">
              {[40, 55, 48, 62, 58, 70, 65, 78, 72, 85].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm bg-primary/70" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Jahr 1</span>
              <span>Jahr 10</span>
            </div>
          </div>
        </div>
      </div>
      {/* Floating cards */}
      <div className="absolute -top-4 -right-4 bg-card rounded-xl border shadow-lg p-3 max-w-[180px] animate-float">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-success/10 grid place-items-center">
            <Check className="size-3.5 text-success" />
          </div>
          <span className="text-xs font-medium">Kaufnebenkosten OK</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">Grunderwerbsteuer & Notar berücksichtigt</div>
      </div>
      <div className="absolute -bottom-3 -left-4 bg-card rounded-xl border shadow-lg p-3 max-w-[190px] animate-float-delayed">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-primary/10 grid place-items-center">
            <Link2 className="size-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium">willhaben importiert</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">Alle Daten automatisch erkannt</div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <MarketingShell>
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-20 md:pt-20 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-left">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs text-muted-foreground mb-6 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                Für private Käufer und Anleger in Österreich & Deutschland
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.1]">
                Immobilie gefunden?{" "}
                <span className="text-primary">Link einfügen.</span>{" "}
                Sofort wissen, ob sie sich lohnt.
              </h1>

              {/* Subheadline */}
              <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Berechne Kaufpreis, Nebenkosten, Finanzierung, Miete, Rendite und Cashflow in wenigen Minuten –{" "}
                <strong className="text-foreground">ohne Excel-Chaos</strong>{" "}
                und ohne großes Immobilien-Vorwissen.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex gap-3 justify-center lg:justify-start flex-wrap">
                <a
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3.5 font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
                >
                  Kostenlos starten <ArrowRight className="size-4" />
                </a>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border bg-card px-7 py-3.5 font-medium text-sm hover:bg-accent transition-colors"
                >
                  <Play className="size-3.5" /> Demo ansehen
                </a>
              </div>

              {/* Micro trust */}
              <p className="mt-3 text-xs text-muted-foreground">
                Keine Kreditkarte. 1 Immobilie gratis. Jederzeit upgraden.
              </p>

              {/* Hero bullets */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 max-w-lg mx-auto lg:mx-0">
                {[
                  "Inserat-Link einfügen",
                  "Daten automatisch übernehmen",
                  "Cashflow & Rendite berechnen",
                  "Immobilien vergleichen",
                  "Risiken erkennen",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="size-5 rounded-full bg-success/10 grid place-items-center shrink-0">
                      <Check className="size-3 text-success" />
                    </div>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Mockup */}
            <div className="hidden lg:block">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ===== SO FUNKTIONIERT'S SECTION ===== */}
      <section className="border-t bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          {/* Header */}
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Immobilienanalyse in 3 einfachen Schritten
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Kein Excel, keine komplizierten Formeln. Du fügst eine Immobilie hinzu und bekommst eine strukturierte Bewertung.
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line — desktop only */}
            <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="relative inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mb-5 shadow-sm">
                <Link2 className="size-6" />
                <span className="absolute -top-2 -right-2 size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center shadow-sm">1</span>
              </div>
              <h3 className="font-semibold text-base">Link einfügen oder PDF hochladen</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                Füge einfach den Link eines Immobilieninserats ein, lade ein Exposé hoch oder trage die Daten manuell ein.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="relative inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mb-5 shadow-sm">
                <Calculator className="size-6" />
                <span className="absolute -top-2 -right-2 size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center shadow-sm">2</span>
              </div>
              <h3 className="font-semibold text-base">Kosten, Finanzierung und Cashflow verstehen</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                Die App berechnet Kaufnebenkosten, Maklerkosten, Kreditrate, Break-even-Miete, Rendite, Cashflow und wichtige Risiken.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="relative inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mb-5 shadow-sm">
                <GitCompareArrows className="size-6" />
                <span className="absolute -top-2 -right-2 size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center shadow-sm">3</span>
              </div>
              <h3 className="font-semibold text-base">Vergleichen und entscheiden</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                Vergleiche mehrere Immobilien nebeneinander und erkenne, welches Objekt wirklich interessant ist – und welches du lieber aussortierst.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-14 text-center">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3.5 font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              Kostenlos starten <ArrowRight className="size-4" />
            </a>
            <p className="mt-3 text-xs text-muted-foreground">Keine Kreditkarte. 1 Immobilie gratis. Jederzeit upgraden.</p>
          </div>
        </div>
      </section>

      {/* ===== REST UNCHANGED ===== */}
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
