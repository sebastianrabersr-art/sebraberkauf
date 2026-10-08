import { type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ArrowDown, ShieldCheck } from "@phosphor-icons/react";
import { SaveCalcCTA } from "@/components/marketing/SaveCalcCTA";
import type { PendingCalc } from "@/lib/pendingCalc";
import { TONE_TEXT, type Tone, type Verdict } from "@/lib/verdicts";
import { Breadcrumb } from "@/components/marketing/Breadcrumb";

export type CalcFaqItem = { q: string; a: string };

/** Hauptergebnis für die mobile Ergebnisleiste. */
export type CalcSummary = { label: string; value: string; tone?: Tone };

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
  summary,
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
  /** Hauptergebnis – wird auf kleinen Bildschirmen als feste Leiste unten gezeigt. */
  summary: CalcSummary;
}) {
  const resultRef = useRef<HTMLDivElement>(null);
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-28 lg:pb-12 bg-[#F5F3EE]">
        <Breadcrumb
          className="mb-5"
          items={[
            { label: "Startseite", href: "/" },
            { label: "Rechner", href: "/rechner" },
            { label: category.includes(" ") ? `${category} Rechner` : `${category}-Rechner` },
          ]}
        />

        <header className="mb-8">
          <h1 className="heading-page-sm sm:text-[32px]">{h1}</h1>
          <p className="text-[14px] text-ink-2 mt-2 max-w-2xl leading-relaxed">{intro}</p>
        </header>

        <div className="grid lg:grid-cols-5 gap-5 items-start">
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 font-sans">Deine Angaben</h2>
            <div className="rounded-[10px] border border-[#EAE6DF] bg-white p-4 space-y-3">{inputs}</div>
          </div>
          <div ref={resultRef} className="lg:col-span-2 lg:sticky lg:top-6 scroll-mt-20">
            <div className="rounded-[12px] border border-[#EAE6DF] bg-white p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-3 font-sans">Ergebnis</h2>
              {result}
            </div>
          </div>
        </div>

        <MobileResultBar summary={summary} targetRef={resultRef} />

        <SaveCalcCTA snapshot={snapshot} />

        {explanation && (
          <section className="mt-10">
            <h2 className="font-display text-[20px] font-bold mb-3 text-[#1C1917]">So wird gerechnet</h2>
            <div className="max-w-[70ch] text-[14px] text-[#1C1917]/90 leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:my-1 [&_strong]:text-[#1C1917]">{explanation}</div>
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
            <div className="text-[12px] text-ink-2 mt-1">Eine Immobilie gratis analysieren</div>
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

/** "300.000", "3,5", "1.250,50" → Zahl; leer → 0; Unlesbares → null (Eingabe wird ignoriert). */
export function parseDeNumber(raw: string): number | null {
  const s = raw.replace(/\s|€|%/g, "");
  if (s === "" || s === "-") return 0;
  const normalized = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

// de-DE statt de-AT: de-AT gruppiert mit schmalem Leerzeichen ("300 000"), gewohnt ist "300.000".
const fmtDe = (n: number) => (Number.isFinite(n) ? n.toLocaleString("de-DE", { maximumFractionDigits: 2 }) : "");

/**
 * Zahlenfeld im deutschen Format: Tausenderpunkte und Dezimalkomma, Einheit im Feld.
 * Beim Bearbeiten steht die rohe Zahl da (leicht zu überschreiben), danach wieder formatiert.
 */
export function NumInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  /** Nicht mehr genutzt (Textfeld statt Spinner); bleibt für Kompatibilität. */
  step?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? fmtDe(value);
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] text-ink-2 mb-1">
        {label}
        {suffix && <span className="sr-only"> in {suffix}</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={shown}
          onFocus={(e) => {
            setDraft(Number.isFinite(value) ? String(value).replace(".", ",") : "");
            const el = e.currentTarget;
            requestAnimationFrame(() => el.select());
          }}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseDeNumber(e.target.value);
            if (n !== null) onChange(n);
          }}
          className={inputCls + " tabular-nums" + (suffix ? " pr-16" : "")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-3" aria-hidden>
            {suffix}
          </span>
        )}
      </div>
    </div>
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
      <div className="text-[12px] text-ink-2 mb-1">{label}</div>
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

/**
 * Hauptergebnis. Ohne Ton bleibt die Zahl neutral (Tinte) – Farbe gibt es nur,
 * wenn das Ergebnis eine Wertung trägt, und dann immer mit Text (nie Farbe allein).
 */
export function BigResult({ label, value, tone, verdict }: { label: string; value: string; tone?: Tone; verdict?: Verdict }) {
  const t = tone ?? verdict?.tone ?? "neutral";
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={`font-display text-[32px] font-extrabold tabular-nums mt-1 leading-tight ${TONE_TEXT[t]}`} style={{ letterSpacing: "-0.02em" }}>{value}</div>
      {verdict && <VerdictLine verdict={verdict} />}
    </div>
  );
}

const TONE_DOT: Record<Tone, string> = {
  good: "bg-[#2D6A4F]",
  bad: "bg-[#B91C1C]",
  caution: "bg-[#D97706]",
  neutral: "bg-[#A8A29E]",
};

export function VerdictLine({ verdict }: { verdict: Verdict }) {
  return (
    <p className="mt-2 flex items-start gap-2 text-[13px] leading-snug text-[#1C1917]">
      <span className={`mt-[6px] size-[7px] shrink-0 rounded-full ${TONE_DOT[verdict.tone]}`} aria-hidden />
      <span>{verdict.text}</span>
    </p>
  );
}

export function ResultRow({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[#F5F3EE] last:border-0 py-2">
      <span className="text-[13px] text-ink-2">{label}</span>
      <span className={`font-medium text-[13px] tabular-nums ${TONE_TEXT[tone ?? "neutral"]}`}>{value}</span>
    </div>
  );
}

/**
 * Unter lg liegt das Ergebnis unter den Eingaben. Die Leiste zeigt das Hauptergebnis
 * live beim Tippen und verschwindet, sobald das ausführliche Ergebnis im Bild ist.
 */
function MobileResultBar({ summary, targetRef }: { summary: CalcSummary; targetRef: RefObject<HTMLDivElement | null> }) {
  const [resultVisible, setResultVisible] = useState(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setResultVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetRef]);

  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#EAE6DF] bg-white px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out motion-reduce:transition-none ${
        resultVisible ? "translate-y-full" : "translate-y-0"
      }`}
      aria-hidden={resultVisible}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-ink-3 truncate">{summary.label}</div>
          <div className={`font-display text-[22px] font-extrabold tabular-nums leading-tight ${TONE_TEXT[summary.tone ?? "neutral"]}`}>
            {summary.value}
          </div>
        </div>
        <button
          type="button"
          tabIndex={resultVisible ? -1 : 0}
          onClick={() => targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] rounded-[8px] border-[1.5px] border-[#EAE6DF] px-3.5 text-[13px] font-medium text-[#1C1917] active:border-[#1C1917]"
        >
          Details <ArrowDown size={14} weight="bold" aria-hidden />
        </button>
      </div>
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
