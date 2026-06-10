import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ArrowRight, ShieldCheck } from "lucide-react";

export type CalcFaqItem = { q: string; a: string };

export function PublicCalcLayout({
  category,
  h1,
  intro,
  inputs,
  result,
  explanation,
  faq,
  breadcrumbSlug,
}: {
  category: string;
  h1: string;
  intro: string;
  inputs: ReactNode;
  result: ReactNode;
  explanation?: ReactNode;
  faq?: CalcFaqItem[];
  breadcrumbSlug: string;
}) {
  return (
    <MarketingShell>
      <section className="max-w-5xl mx-auto px-6 py-12">
        <nav className="text-sm text-muted-foreground mb-5 flex gap-2 flex-wrap" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Start</Link>
          <span>/</span>
          <Link to="/rechner" className="hover:text-foreground">Rechner</Link>
          <span>/</span>
          <span className="text-foreground">{category}</span>
        </nav>

        <header className="mb-6">
          <div className="text-xs uppercase tracking-wide text-primary font-medium mb-2">{category}</div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{h1}</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">{intro}</p>
        </header>

        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-6">
            <div className="text-sm font-semibold mb-4">Deine Angaben</div>
            <div className="space-y-3">{inputs}</div>
          </div>
          <div className="lg:col-span-3 rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-6">
            <div className="text-sm font-semibold mb-4">Ergebnis</div>
            {result}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-xl border-2 border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <div className="font-semibold">Berechnung speichern und Immobilie vollständig analysieren</div>
            <p className="text-sm text-muted-foreground mt-1">Link eines Inserats einfügen – Rendite, Cashflow, Mietrecht-Risiko in Sekunden.</p>
          </div>
          <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 shrink-0">
            Kostenlos starten <ArrowRight className="size-4" />
          </Link>
        </div>

        {explanation && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-3">So wird gerechnet</h2>
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed">{explanation}</div>
          </section>
        )}

        {faq && faq.length > 0 && (
          <section id="faq" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-4">Häufige Fragen</h2>
            <div className="space-y-3">
              {faq.map((f, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="font-medium">{f.q}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 grid sm:grid-cols-3 gap-3">
          <Link to="/ratgeber" className="rounded-lg border p-4 hover:border-primary transition">
            <div className="text-sm font-medium">Ratgeber lesen</div>
            <div className="text-xs text-muted-foreground mt-1">Hintergrundwissen zu Kauf, Rendite & Cashflow</div>
          </Link>
          <Link to="/pricing" className="rounded-lg border p-4 hover:border-primary transition">
            <div className="text-sm font-medium">Preise ansehen</div>
            <div className="text-xs text-muted-foreground mt-1">Gratis, Plus, Premium</div>
          </Link>
          <Link to="/signup" className="rounded-lg border p-4 hover:border-primary transition">
            <div className="text-sm font-medium">Konto anlegen</div>
            <div className="text-xs text-muted-foreground mt-1">In 30 Sekunden starten</div>
          </Link>
        </section>

        <p className="mt-10 text-xs text-muted-foreground border-t pt-6 flex items-start gap-2">
          <ShieldCheck className="size-4 mt-0.5 shrink-0" />
          <span>Die Berechnung ersetzt keine Rechts-, Steuer- oder Finanzberatung. Werte sind Richtwerte und können je nach Region, Anbieter und individueller Situation abweichen.</span>
        </p>

        <span className="sr-only" data-breadcrumb={breadcrumbSlug} />
      </section>
    </MarketingShell>
  );
}

export function NumInput({
  label,
  value,
  onChange,
  suffix,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 focus-within:ring-2 ring-ring/40">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 outline-none bg-transparent text-sm tabular-nums"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

export function SelectInput<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function BigResult({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const c = tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "";
  return (
    <div>
      <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
      <div className={`text-3xl font-semibold tabular-nums mt-1 ${c}`}>{value}</div>
    </div>
  );
}

export function ResultRow({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="flex items-baseline justify-between border-b last:border-0 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-medium text-sm tabular-nums ${tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

export function buildFaqJsonLd(faq: CalcFaqItem[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}
