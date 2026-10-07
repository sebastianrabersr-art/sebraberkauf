import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ShieldCheck } from "@phosphor-icons/react";
import { SaveCalcCTA } from "@/components/marketing/SaveCalcCTA";
import type { PendingCalc } from "@/lib/pendingCalc";

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
  snapshot,
}: {
  category: string;
  h1: string;
  intro: string;
  inputs: ReactNode;
  result: ReactNode;
  explanation?: ReactNode;
  faq?: CalcFaqItem[];
  breadcrumbSlug: string;
  snapshot: PendingCalc;
}) {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-6 py-12 bg-[#F5F3EE]">
        <nav className="text-[12px] text-ink-3 mb-5 flex gap-2 flex-wrap" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-[#1C1917]">Start</Link>
          <span>/</span>
          <Link to="/rechner" className="hover:text-[#1C1917]">Rechner</Link>
          <span>/</span>
          <span className="text-[#1C1917]">{category}</span>
        </nav>

        <header className="mb-8">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">{category}</div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-extrabold leading-tight text-[#1C1917]" style={{ letterSpacing: "-0.03em" }}>{h1}</h1>
          <p className="text-[13px] text-ink-2 mt-2 max-w-2xl">{intro}</p>
        </header>

        <div className="grid lg:grid-cols-5 gap-5 items-start">
          <div className="lg:col-span-3 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Deine Angaben</div>
            <div className="rounded-[10px] border border-[#EAE6DF] bg-white p-4 space-y-3">{inputs}</div>
          </div>
          <div className="lg:col-span-2 lg:sticky lg:top-6">
            <div className="rounded-[12px] border border-[#EAE6DF] bg-white p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-3">Ergebnis</div>
              {result}
            </div>
          </div>
        </div>

        <SaveCalcCTA snapshot={snapshot} />

        {explanation && (
          <section className="mt-10">
            <h2 className="font-display text-[20px] font-bold mb-3 text-[#1C1917]">So wird gerechnet</h2>
            <div className="prose prose-sm max-w-none text-[#1C1917]/90 leading-relaxed">{explanation}</div>
          </section>
        )}

        {faq && faq.length > 0 && (
          <section id="faq" className="mt-10 scroll-mt-24">
            <h2 className="font-display text-[20px] font-bold mb-4 text-[#1C1917]">Häufige Fragen</h2>
            <div className="space-y-3">
              {faq.map((f, i) => (
                <div key={i} className="rounded-[10px] border border-[#EAE6DF] bg-white p-4">
                  <div className="font-medium text-[14px] text-[#1C1917]">{f.q}</div>
                  <p className="text-[13px] text-ink-2 mt-1.5">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 grid sm:grid-cols-3 gap-3">
          <Link to="/ratgeber" className="rounded-[10px] border border-[#EAE6DF] bg-white p-4 hover:border-[#2D6A4F] transition">
            <div className="text-[13px] font-medium text-[#1C1917]">Ratgeber lesen</div>
            <div className="text-[12px] text-ink-2 mt-1">Hintergrundwissen zu Kauf, Rendite & Cashflow</div>
          </Link>
          <Link to="/pricing" className="rounded-[10px] border border-[#EAE6DF] bg-white p-4 hover:border-[#2D6A4F] transition">
            <div className="text-[13px] font-medium text-[#1C1917]">Preise ansehen</div>
            <div className="text-[12px] text-ink-2 mt-1">Gratis, Plus, Premium</div>
          </Link>
          <Link to="/signup" className="rounded-[10px] border border-[#EAE6DF] bg-white p-4 hover:border-[#2D6A4F] transition">
            <div className="text-[13px] font-medium text-[#1C1917]">Konto anlegen</div>
            <div className="text-[12px] text-ink-2 mt-1">In 30 Sekunden starten</div>
          </Link>
        </section>

        <p className="mt-10 text-[12px] text-ink-2 border-t border-[#EAE6DF] pt-6 flex items-start gap-2">
          <ShieldCheck className="size-4 mt-0.5 shrink-0" />
          <span>Die Berechnung ersetzt keine Rechts-, Steuer- oder Finanzberatung. Werte sind Richtwerte und können je nach Region, Anbieter und individueller Situation abweichen.</span>
        </p>

        <span className="sr-only" data-breadcrumb={breadcrumbSlug} />
      </section>
    </MarketingShell>
  );
}

const inputCls =
  "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-[14px] py-[11px] text-[13px] text-[#1C1917] outline-none focus:border-[#2D6A4F] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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
      <div className="text-[11px] text-ink-2 mb-1">{label}{suffix ? ` (${suffix})` : ""}</div>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputCls + " tabular-nums"}
      />
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
      <div className="text-[11px] text-ink-2 mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={inputCls}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function BigResult({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const c = tone === "good" ? "text-[#2D6A4F]" : tone === "bad" ? "text-[#DC2626]" : "text-[#2D6A4F]";
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={`font-display text-[32px] font-extrabold tabular-nums mt-1 leading-tight ${c}`} style={{ letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

export function ResultRow({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[#F5F3EE] last:border-0 py-2">
      <span className="text-[13px] text-ink-2">{label}</span>
      <span className={`font-medium text-[13px] tabular-nums ${tone === "good" ? "text-[#2D6A4F]" : tone === "bad" ? "text-[#DC2626]" : "text-[#1C1917]"}`}>{value}</span>
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
