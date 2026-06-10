import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { RATGEBER_ARTICLES } from "@/lib/ratgeber";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/pricing", changefreq: "monthly", priority: "0.8" },
          { path: "/faq", changefreq: "monthly", priority: "0.6" },
          { path: "/ratgeber", changefreq: "weekly", priority: "0.9" },
          { path: "/signup", changefreq: "yearly", priority: "0.5" },
          { path: "/login", changefreq: "yearly", priority: "0.3" },
        ];
        const articleEntries: SitemapEntry[] = RATGEBER_ARTICLES.map((a) => ({
          path: `/ratgeber/${a.slug}`,
          lastmod: a.updatedAt ?? a.publishedAt,
          changefreq: "monthly",
          priority: "0.7",
        }));
        const entries = [...staticEntries, ...articleEntries];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
