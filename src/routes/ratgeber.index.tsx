import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "@phosphor-icons/react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { RATGEBER_ARTICLES, RATGEBER_CATEGORIES, type RatgeberArticle } from "@/lib/ratgeber";

export const Route = createFileRoute("/ratgeber/")({
  head: () => ({
    meta: [
      { title: "Ratgeber – Immobilienkauf, Rendite & Cashflow | kaufma" },
      { name: "description", content: "Verständliche Ratgeber zu Immobilienkauf, Kaufnebenkosten, Finanzierung, Rendite, Cashflow und Mietrecht in Österreich und Deutschland." },
      { property: "og:title", content: "Ratgeber – Immobilienkauf, Rendite & Cashflow" },
      { property: "og:description", content: "Verständliche Ratgeber zu Immobilienkauf, Rendite, Cashflow und Mietrecht." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/ratgeber" },
    ],
    links: [{ rel: "canonical", href: "/ratgeber" }],
  }),
  component: RatgeberIndex,
});

/** Einstiegsartikel: die Grundlage, auf die die meisten anderen Artikel aufbauen. */
const LEAD_SLUG = "immobilien-rendite-berechnen";

function RatgeberIndex() {
  const lead = RATGEBER_ARTICLES.find((a) => a.slug === LEAD_SLUG) ?? RATGEBER_ARTICLES[0];
  const groups = RATGEBER_CATEGORIES.map((cat) => ({
    cat,
    items: RATGEBER_ARTICLES.filter((a) => a.category === cat && a.slug !== lead?.slug),
  })).filter((g) => g.items.length > 0);

  return (
    <MarketingShell>
      <section className="max-w-5xl mx-auto px-6 py-14 md:py-16">
        <header className="max-w-2xl">
          <h1 className="heading-page">Ratgeber</h1>
          <p className="text-[16px] text-ink-2 mt-3 leading-relaxed">
            Klare Antworten zu Kaufnebenkosten, Rendite, Cashflow, Finanzierung und Lage – für Käuferinnen und Käufer in Österreich und Deutschland.
          </p>
        </header>

        {lead && (
          <Link
            to="/ratgeber/$slug"
            params={{ slug: lead.slug }}
            className="group mt-10 block rounded-[12px] bg-[#1C1917] text-white px-6 py-7 md:px-8 md:py-8"
          >
            <div className="text-[13px] text-white/70">Zum Einstieg · {lead.readingMinutes} min Lesezeit</div>
            <div className="mt-2 font-display text-[24px] md:text-[30px] font-extrabold leading-tight max-w-3xl text-balance">{lead.title}</div>
            <p className="mt-3 text-[15px] text-white/80 max-w-2xl leading-relaxed">{lead.description}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#CFE5D8] group-hover:underline underline-offset-4">
              Artikel lesen <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
        )}

        <nav className="mt-10 flex flex-wrap gap-2" aria-label="Kategorien">
          {groups.map((g) => (
            <a
              key={g.cat}
              href={`#cat-${slug(g.cat)}`}
              className="text-[13px] px-3 py-1.5 rounded-full border border-[#EAE6DF] bg-white text-[#1C1917] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            >
              {g.cat} <span className="text-ink-3 tabular-nums">{g.items.length}</span>
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-12">
          {groups.map((g) => (
            <section key={g.cat} id={`cat-${slug(g.cat)}`} className="scroll-mt-24" aria-labelledby={`h-${slug(g.cat)}`}>
              <h2 id={`h-${slug(g.cat)}`} className="heading-section">{g.cat}</h2>
              <ul className="mt-4 grid lg:grid-cols-2 gap-x-10 border-t border-[#EAE6DF]">
                {g.items.map((a) => <ArticleRow key={a.slug} a={a} />)}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

function ArticleRow({ a }: { a: RatgeberArticle }) {
  return (
    <li className="border-b border-[#EAE6DF]">
      <Link to="/ratgeber/$slug" params={{ slug: a.slug }} className="group block py-5">
        <div className="text-[16px] font-semibold leading-snug text-[#1C1917] group-hover:text-[#2D6A4F] text-balance">{a.title}</div>
        <p className="text-[14px] text-ink-2 mt-1.5 line-clamp-2 leading-relaxed">{a.description}</p>
        <div className="text-[12px] text-ink-3 mt-2">{a.readingMinutes} min Lesezeit</div>
      </Link>
    </li>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/&/g, "und").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
