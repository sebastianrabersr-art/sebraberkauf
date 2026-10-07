import { createFileRoute, notFound } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ArticleLayout } from "@/components/marketing/ArticleLayout";
import { getArticleBySlug } from "@/lib/ratgeber";

export const Route = createFileRoute("/ratgeber/$slug")({
  loader: ({ params }) => {
    const article = getArticleBySlug(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [] };
    const a = loaderData.article;
    const url = `/ratgeber/${params.slug}`;
    const scripts: Array<{ type: string; children: string }> = [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.description,
          datePublished: a.publishedAt,
          dateModified: a.updatedAt ?? a.publishedAt,
          author: { "@type": "Organization", name: "kaufma" },
          publisher: { "@type": "Organization", name: "kaufma" },
          articleSection: a.category,
          keywords: a.tags?.join(", "),
        }),
      },
    ];
    if (a.faq && a.faq.length > 0) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: a.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      });
    }
    return {
      meta: [
        { title: a.seoTitle },
        { name: "description", content: a.description },
        { property: "og:title", content: a.seoTitle },
        { property: "og:description", content: a.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:section", content: a.category },
        { property: "article:published_time", content: a.publishedAt },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  notFoundComponent: () => (
    <MarketingShell>
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="heading-page-sm">Artikel nicht gefunden</h1>
        <p className="text-muted-foreground mt-3">Dieser Ratgeber-Artikel existiert nicht (mehr).</p>
        <a href="/ratgeber" className="inline-block mt-6 text-primary underline">Zur Ratgeber-Übersicht</a>
      </div>
    </MarketingShell>
  ),
  errorComponent: ({ error }) => (
    <MarketingShell>
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="heading-page-sm">Fehler beim Laden</h1>
        <p className="text-muted-foreground mt-2 text-sm">{error.message}</p>
      </div>
    </MarketingShell>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article } = Route.useLoaderData();
  return (
    <MarketingShell>
      <ArticleLayout article={article} />
    </MarketingShell>
  );
}
