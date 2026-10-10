import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import { CaretDown, Check, Minus, CreditCard, CalendarCheck, ShieldCheck } from "@phosphor-icons/react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PricingTable } from "@/components/marketing/PricingTable";
import { FaqList, type FaqItem } from "@/components/marketing/FaqList";
import { PLAN_CARDS, PLAN_COMPARISON, type CompareCell, type PlanId } from "@/lib/planFeatures";

/**
 * Antworten decken sich mit AGB (§ 5 Kündigung, § 7 Datenlöschung) und Datenschutzerklärung
 * (Stripe, Serverstandort Irland). Bei Änderungen dort hier mitziehen.
 */
const PRICING_FAQ: FaqItem[] = [
  {
    q: "Kann ich jederzeit kündigen?",
    a: "Ja. Du kündigst in den Einstellungen oder per E-Mail, wirksam zum Ende der laufenden Abrechnungsperiode, also zum Monats- oder Jahresende deines Abos. Eine zusätzliche Kündigungsfrist gibt es nicht.",
  },
  {
    q: "Was passiert mit meinen Daten, wenn ich kündige?",
    a: "Deine Daten bleiben nach der Kündigung 12 Monate gespeichert und werden danach endgültig gelöscht. Willst du, dass wir sofort löschen, schreib an hallo@kaufma.eu.",
  },
  {
    q: "Gibt es eine kostenlose Testphase?",
    a: "Der Free-Plan ist dauerhaft kostenlos und braucht keine Kreditkarte. Damit rechnest du eine Immobilie vollständig durch, bevor du dich für Plus oder Premium entscheidest.",
  },
  {
    q: "Welche Zahlungsmethoden gibt es?",
    a: "Du zahlst über Stripe mit Kreditkarte oder einer der weiteren Methoden, die Stripe dir im Checkout anbietet. Kreditkartendaten speichern wir nicht.",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Preise – kaufma" },
      { name: "description", content: "Free für den ersten Check, Plus für ernsthafte Käufer, Premium für aktive Investoren. Kein Abo nötig, um eine Immobilie durchzurechnen." },
      { property: "og:title", content: "Preise – kaufma" },
      { property: "og:description", content: "Starte kostenlos. Upgrade, wenn du es wirklich brauchst." },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: PRICING_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }),
      },
    ],
  }),
  component: Pricing,
});

const PLAN_ORDER: PlanId[] = ["free", "plus", "premium"];

function Cell({ value }: { value: CompareCell }) {
  if (value === true) {
    return (
      <>
        <Check weight="bold" className="size-4 text-primary mx-auto" aria-hidden />
        <span className="sr-only">enthalten</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus weight="bold" className="size-4 text-ink-3 mx-auto" aria-hidden />
        <span className="sr-only">nicht enthalten</span>
      </>
    );
  }
  return <span className="text-[13px] font-medium tabular-nums text-[#1C1917]">{value}</span>;
}

/** Vollständiger Vergleich – eingeklappt, damit die Karten die Entscheidung tragen. */
function Comparison() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <section aria-labelledby="vergleich-title" className="max-w-4xl mx-auto">
      <h2 id="vergleich-title" className="sr-only">Alle Funktionen im Vergleich</h2>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#EAE6DF] bg-white px-5 py-2.5 text-[14px] font-medium text-[#1C1917] transition-colors hover:border-[#1C1917] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Alle Features vergleichen
          <CaretDown className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>

      <div id={panelId} hidden={!open} className="mt-8 rounded-[16px] border border-[#EAE6DF] bg-white px-4 sm:px-8 py-6">
        <table className="w-full text-left">
          <caption className="sr-only">Funktionen von Free, Plus und Premium</caption>
          <thead>
            <tr>
              <th scope="col" className="pb-4 text-[13px] font-normal text-ink-2"><span className="sr-only">Funktion</span></th>
              {PLAN_ORDER.map((id) => (
                <th key={id} scope="col" className={`pb-4 w-[4.75rem] sm:w-28 text-center font-display text-[16px] font-extrabold ${id === "plus" ? "text-primary" : "text-[#1C1917]"}`}>
                  {PLAN_CARDS[id].name}
                </th>
              ))}
            </tr>
          </thead>
          {PLAN_COMPARISON.map((g) => (
            <tbody key={g.group}>
              <tr>
                <th colSpan={4} scope="colgroup" className="border-t border-[#EAE6DF] pt-5 pb-2 text-[13px] font-semibold text-[#1C1917]">
                  {g.group}
                </th>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="py-2 pr-3 text-[14px] font-normal leading-snug text-ink-2">{r.label}</th>
                  {PLAN_ORDER.map((id) => (
                    <td key={id} className="py-2 text-center"><Cell value={r[id]} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

function Trust() {
  const items = [
    { icon: CreditCard, text: "Keine Kreditkarte für Free" },
    { icon: CalendarCheck, text: "Jederzeit zum Periodenende kündbar" },
    { icon: ShieldCheck, text: "Daten auf Servern in der EU" },
  ];
  return (
    <ul aria-label="Gut zu wissen" className="flex flex-col sm:flex-row items-center justify-center gap-x-10 gap-y-3">
      {items.map((it) => (
        <li key={it.text} className="flex items-center gap-2 font-sans text-[13px] text-[#78716C]">
          <it.icon className="size-[18px] shrink-0 text-primary" weight="duotone" aria-hidden />
          {it.text}
        </li>
      ))}
    </ul>
  );
}

function Pricing() {
  return (
    <MarketingShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 sm:pt-20">
        <header className="text-center max-w-2xl mx-auto">
          <h1 className="font-display text-[32px] font-extrabold leading-[1.12] tracking-[-0.03em] text-[#1C1917] text-balance">
            Starte kostenlos. Upgrade, wenn du es wirklich brauchst.
          </h1>
          <p className="mt-4 font-sans text-[15px] leading-relaxed text-[#78716C] text-balance">
            Kein Abo nötig, um eine Immobilie durchzurechnen. Plus und Premium lohnen sich, wenn du ernsthaft vergleichst.
          </p>
        </header>

        <div className="mt-10">
          <PricingTable tierHeading="h2" />
        </div>

        <div className="mt-16">
          <Comparison />
        </div>

        <div className="mt-16">
          <Trust />
        </div>

        <section aria-labelledby="preis-faq-title" className="mt-24 max-w-3xl mx-auto">
          <h2 id="preis-faq-title" className="heading-section text-center">Häufige Fragen</h2>
          <div className="mt-8">
            <FaqList items={PRICING_FAQ} />
          </div>
        </section>

        <section aria-labelledby="fragen-title" className="mt-20 text-center">
          <h2 id="fragen-title" className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#1C1917]">Noch Fragen?</h2>
          <p className="mt-2 text-[15px] text-ink-2">
            Schreib uns an{" "}
            <a href="mailto:hallo@kaufma.eu" className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">
              hallo@kaufma.eu
            </a>
            .
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
