import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { RATGEBER_ARTICLES, RATGEBER_CATEGORIES } from "@/lib/ratgeber";

export const Route = createFileRoute("/ratgeber/")({
  head: () => ({
    meta: [
      { title: "Ratgeber – Immobilienkauf, Rendite & Cashflow | kauf ma" },
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

function RatgeberIndex() {
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-center">Ratgeber</h1>
        <p className="text-muted-foreground text-center mt-3 max-w-2xl mx-auto">
          Klare Antworten zu Kaufnebenkosten, Rendite, Cashflow, Finanzierung und Mietrecht – für Käufer in Österreich und Deutschland.
        </p>

        <div className="mt-10 flex flex-wrap gap-2 justify-center">
          {RATGEBER_CATEGORIES.map((c) => (
            <a key={c} href={`#cat-${slug(c)}`} className="text-xs px-3 py-1.5 rounded-full border hover:border-primary hover:text-primary">
              {c}
            </a>
          ))}
        </div>

        <div className="mt-12 space-y-12">
          {RATGEBER_CATEGORIES.map((cat) => {
            const items = RATGEBER_ARTICLES.filter((a) => a.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} id={`cat-${slug(cat)}`} className="scroll-mt-24">
                <h2 className="text-xl font-semibold mb-4">{cat}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((a) => (
                    <Link
                      key={a.slug}
                      to="/ratgeber/$slug"
                      params={{ slug: a.slug }}
                      className="rounded-xl border p-5 hover:border-primary hover:shadow-sm transition block"
                    >
                      <div className="text-xs text-primary font-medium">{a.category}</div>
                      <div className="mt-2 font-semibold leading-snug">{a.title}</div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{a.description}</p>
                      <div className="text-xs text-muted-foreground mt-3">{a.readingMinutes} min Lesezeit</div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </MarketingShell>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/&/g, "und").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
