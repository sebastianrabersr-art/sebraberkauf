import { Link } from "@tanstack/react-router";
import { BookOpen } from "@phosphor-icons/react";
import { RATGEBER_ARTICLES, type RatgeberArticle, type RatgeberCategory } from "@/lib/ratgeber";

/* Querverweise: Artikel → verwandte Artikel, Rechner → passender Artikel. */

export const RATGEBER_CATEGORY_COLORS: Record<RatgeberCategory, { bg: string; fg: string }> = {
  "Immobilienkauf": { bg: "#F2F0EC", fg: "#57534E" },
  "Kaufnebenkosten": { bg: "#FFF4E0", fg: "#92580B" },
  "Finanzierung": { bg: "#E0ECFB", fg: "#1E4F8B" },
  "Rendite & Cashflow": { bg: "#E6F4EA", fg: "#2D6A4F" },
  "Mietrecht": { bg: "#FBE9E7", fg: "#9C3527" },
  "Österreich": { bg: "#EFE6FB", fg: "#5B3E9B" },
  "Deutschland": { bg: "#E3F0F0", fg: "#2F5E5E" },
  "Checklisten": { bg: "#F5F3EE", fg: "#78716C" },
};

/**
 * Bis zu `max` verwandte Artikel: zuerst gleiche Kategorie, dann gemeinsame Tags.
 * Innerhalb gleicher Relevanz gewinnen mehr gemeinsame Tags, dann der neuere Artikel.
 */
export function findRelatedArticles(article: RatgeberArticle, max = 3): RatgeberArticle[] {
  const tags = new Set((article.tags ?? []).map((t) => t.toLowerCase()));
  return RATGEBER_ARTICLES
    .filter((a) => a.slug !== article.slug)
    .map((a) => {
      const sharedTags = (a.tags ?? []).filter((t) => tags.has(t.toLowerCase())).length;
      const sameCategory = a.category === article.category;
      return { a, sameCategory, sharedTags };
    })
    .filter((x) => x.sameCategory || x.sharedTags > 0)
    .sort((x, y) =>
      Number(y.sameCategory) - Number(x.sameCategory) ||
      y.sharedTags - x.sharedTags ||
      y.a.publishedAt.localeCompare(x.a.publishedAt),
    )
    .slice(0, max)
    .map((x) => x.a);
}

export function RelatedArticles({ article }: { article: RatgeberArticle }) {
  const related = findRelatedArticles(article);
  if (related.length === 0) return null;
  return (
    <section className="mt-14" aria-labelledby="related-heading">
      <h2 id="related-heading" className="text-[13px] uppercase tracking-wider mb-4" style={{ color: "#A8A29E", fontFamily: "Inter, sans-serif" }}>
        Das könnte dich auch interessieren
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {related.map((a) => {
          const c = RATGEBER_CATEGORY_COLORS[a.category];
          return (
            <Link
              key={a.slug}
              to="/ratgeber/$slug"
              params={{ slug: a.slug }}
              className="group flex flex-col rounded-[10px] border border-[#EAE6DF] bg-white p-4 transition-colors duration-150 hover:border-[#2D6A4F] focus-visible:border-[#2D6A4F] focus-visible:outline-none"
            >
              <span className="self-start rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: c.bg, color: c.fg }}>
                {a.category}
              </span>
              <span className="mt-2.5 text-[14px] font-semibold leading-snug text-[#1C1917] line-clamp-3">{a.title}</span>
              <span className="mt-auto pt-3 text-[11px]" style={{ color: "#A8A29E" }}>{a.readingMinutes} min Lesezeit</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ───────── Artikel → passender Rechner (Umkehrung der Rechner-Chips) ───────── */

type CalcLink = { slug: string; name: string };

const CALC_BY_ARTICLE: Record<string, CalcLink> = {
  "immobilien-rendite-berechnen": { slug: "rendite", name: "Rendite-Rechner" },
  "cashflow-immobilie-berechnen": { slug: "cashflow", name: "Cashflow-Rechner" },
  "kaufnebenkosten-oesterreich": { slug: "kaufnebenkosten", name: "Kaufnebenkosten-Rechner" },
  "annuitaetendarlehen-erklaert": { slug: "finanzierung", name: "Finanzierungsrechner" },
  "wie-viel-kredit-leisten": { slug: "leistbarkeit", name: "Leistbarkeitsrechner" },
  "break-even-miete-berechnen": { slug: "breakeven", name: "Break-even-Miete-Rechner" },
  "eigenkapitalrendite-berechnen": { slug: "fixflip", name: "Fix & Flip Rechner" },
};
const CALC_BY_CATEGORY: Partial<Record<RatgeberCategory, CalcLink>> = {
  "Rendite & Cashflow": { slug: "rendite", name: "Rendite-Rechner" },
  "Kaufnebenkosten": { slug: "kaufnebenkosten", name: "Kaufnebenkosten-Rechner" },
  "Österreich": { slug: "kaufnebenkosten", name: "Kaufnebenkosten-Rechner" },
  "Deutschland": { slug: "kaufnebenkosten", name: "Kaufnebenkosten-Rechner" },
  "Finanzierung": { slug: "finanzierung", name: "Finanzierungsrechner" },
};

/** Rechner zum Artikel: erst die feste Zuordnung, dann nach Kategorie; sonst null (→ Rechner-Übersicht). */
export function calculatorForArticle(article: RatgeberArticle): CalcLink | null {
  return CALC_BY_ARTICLE[article.slug] ?? CALC_BY_CATEGORY[article.category] ?? null;
}

/** "Selbst berechnen: …" am Artikelende. */
export function SelfCalcCta({ article }: { article: RatgeberArticle }) {
  const calc = calculatorForArticle(article);
  return (
    <p className="mt-10 text-[15px] text-[#1C1917]">
      Selbst berechnen:{" "}
      {calc ? (
        <Link to="/rechner/$slug" params={{ slug: calc.slug }} className="font-semibold text-[#2D6A4F] underline-offset-4 hover:underline">
          {calc.name}
        </Link>
      ) : (
        <Link to="/rechner" className="font-semibold text-[#2D6A4F] underline-offset-4 hover:underline">
          alle Rechner ohne Anmeldung
        </Link>
      )}
    </p>
  );
}

/* ───────── Glossar → Ratgeber ───────── */

/** Höchstens 5 Begriffe (Linkbudget der Glossar-Seite) – die Artikel, die den Begriff wirklich vertiefen. */
export const ARTICLE_BY_GLOSSARY_ID: Record<string, string> = {
  bruttorendite: "bruttorendite-vs-nettorendite",
  cashflow: "cashflow-immobilie-berechnen",
  annuitaetendarlehen: "annuitaetendarlehen-erklaert",
  zinsbindung: "zinsbindung-immobilien",
  leerstand: "leerstand-immobilien-kalkulieren",
};

export function GlossaryArticleLink({ termId }: { termId: string }) {
  const slug = ARTICLE_BY_GLOSSARY_ID[termId];
  const article = slug ? RATGEBER_ARTICLES.find((a) => a.slug === slug) : undefined;
  if (!article) return null;
  return (
    <p className="mt-2 text-[12px] text-ink-2">
      Mehr dazu:{" "}
      <Link to="/ratgeber/$slug" params={{ slug }} className="font-medium text-[#2D6A4F] underline-offset-4 hover:underline">
        {shortTitle(article.title)}
      </Link>
    </p>
  );
}

/** Haupttitel ohne Untertitel ("Break-even-Miete berechnen: Ab welcher …" → "Break-even-Miete berechnen"). */
function shortTitle(title: string): string {
  const q = title.indexOf("? ");
  if (q > 0) return title.slice(0, q + 1);
  const colon = title.indexOf(": ");
  return colon > 0 ? title.slice(0, colon) : title;
}

/** Kleiner Chip unter einem Rechner-Ergebnis: "Ratgeber: …" → /ratgeber/[slug] (gleicher Tab). */
export function RatgeberChip({ slug }: { slug: string }) {
  const article = RATGEBER_ARTICLES.find((a) => a.slug === slug);
  if (!article) return null;
  return (
    <Link
      to="/ratgeber/$slug"
      params={{ slug }}
      title={article.title}
      className="inline-flex max-w-full items-center gap-1.5 rounded-[20px] border border-[#EAE6DF] bg-[#F5F3EE] px-[14px] py-[6px] text-[12px] text-[#78716C] transition-colors duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F] focus-visible:border-[#2D6A4F] focus-visible:text-[#2D6A4F] focus-visible:outline-none"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <BookOpen size={14} weight="duotone" className="shrink-0" aria-hidden />
      <span className="truncate">Ratgeber: {shortTitle(article.title)}</span>
    </Link>
  );
}
