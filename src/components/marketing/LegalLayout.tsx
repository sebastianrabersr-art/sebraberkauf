import type { ReactNode } from "react";
import { MarketingShell } from "./MarketingShell";

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <MarketingShell>
      <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">{title}</h1>
        <div className="prose prose-sm md:prose-base max-w-none text-foreground/90 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:my-1 [&_strong]:text-foreground">
          {children}
        </div>
      </article>
    </MarketingShell>
  );
}
