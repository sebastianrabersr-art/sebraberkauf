import { Fragment } from "react";

const SITE = "https://kaufma.eu";

export type BreadcrumbItem = {
  label: string;
  /** Fehlt bei der aktuellen Seite (letzter Eintrag). */
  href?: string;
};

/**
 * Breadcrumb für öffentliche Seiten (Ratgeber-Artikel, Rechner) – mit BreadcrumbList als JSON-LD.
 * Nicht auf Startseite, Preisen, Rechtstexten oder in der App verwenden.
 */
export function Breadcrumb({ items, className = "" }: { items: BreadcrumbItem[]; className?: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: `${SITE}${it.href}` } : {}),
    })),
  };

  return (
    <>
      <nav aria-label="Brotkrumen-Navigation" className={className}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]" style={{ color: "#A8A29E", fontFamily: "Inter, sans-serif" }}>
          {items.map((it, i) => {
            const last = i === items.length - 1;
            return (
              <Fragment key={`${i}-${it.label}`}>
                <li className={last ? "min-w-0" : "shrink-0"}>
                  {it.href && !last ? (
                    <a href={it.href} className="text-[#78716C] no-underline transition-colors hover:text-[#2D6A4F]">
                      {it.label}
                    </a>
                  ) : (
                    <span aria-current="page" className="block truncate text-[#1C1917]">{it.label}</span>
                  )}
                </li>
                {!last && (
                  <li aria-hidden className="shrink-0" style={{ color: "#EAE6DF" }}>/</li>
                )}
              </Fragment>
            );
          })}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
