import { Link } from "@tanstack/react-router";
import type { RatgeberArticle } from "@/lib/ratgeber";
import { Calculator, ArrowRight } from "lucide-react";

export function ArticleLayout({ article, origin = "" }: { article: RatgeberArticle; origin?: string }) {
  return (
    <article className="max-w-3xl mx-auto px-6 py-12">
      <nav className="text-sm text-muted-foreground mb-6 flex gap-2 flex-wrap" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">Start</Link>
        <span>/</span>
        <Link to="/ratgeber" className="hover:text-foreground">Ratgeber</Link>
        <span>/</span>
        <span className="text-foreground">{article.category}</span>
      </nav>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-wide text-primary font-medium mb-3">
          {article.category}
        </div>
        <h1 className="text-4xl font-bold leading-tight">{article.title}</h1>
        <p className="text-muted-foreground mt-4 text-lg">{article.description}</p>
        <div className="text-xs text-muted-foreground mt-4">
          {new Date(article.publishedAt).toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })} · {article.readingMinutes} min Lesezeit
        </div>
      </header>

      <p className="text-base leading-relaxed mb-8">{article.intro}</p>

      {article.sections.length > 1 && !article.fullContent && (
        <aside className="rounded-lg border bg-muted/30 p-5 mb-10">
          <div className="text-sm font-semibold mb-3">Inhaltsverzeichnis</div>
          <ol className="space-y-1.5 text-sm list-decimal list-inside">
            {article.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-primary hover:underline">{s.heading}</a>
              </li>
            ))}
            {article.faq && article.faq.length > 0 && (
              <li><a href="#faq" className="text-primary hover:underline">Häufige Fragen</a></li>
            )}
          </ol>
        </aside>
      )}

      {article.fullContent && (
        <aside className="rounded-lg border bg-muted/30 p-5 mb-10">
          <div className="text-sm font-semibold mb-3">Inhaltsverzeichnis</div>
          <ol className="space-y-1.5 text-sm list-decimal list-inside">
            {article.fullContent.split('\n').filter((l) => l.startsWith('## ')).map((h, i) => {
              const text = h.replace('## ', '');
              const id = text.toLowerCase().replace(/[^a-z0-9äöü]/g, '-').replace(/-+/g, '-');
              return <li key={i}><a href={`#${id}`} className="text-primary hover:underline">{text}</a></li>;
            })}
            {article.faq && article.faq.length > 0 && (
              <li><a href="#faq" className="text-primary hover:underline">Häufige Fragen</a></li>
            )}
          </ol>
        </aside>
      )}

      {article.fullContent ? (
        <div className="prose prose-neutral max-w-none">
          {article.fullContent.split('\n\n').map((block, i) => {
            const trimmed = block.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('## ')) {
              const id = trimmed.replace('## ', '').toLowerCase().replace(/[^a-z0-9äöü]/g, '-').replace(/-+/g, '-');
              return <h2 key={i} id={id} className="text-2xl font-semibold mt-10 mb-3 scroll-mt-24">{trimmed.replace('## ', '')}</h2>;
            }
            if (trimmed.startsWith('### ')) {
              return <h3 key={i} className="text-xl font-medium mt-6 mb-2">{trimmed.replace('### ', '')}</h3>;
            }
            if (trimmed.startsWith('- ')) {
              const items = trimmed.split('\n').filter((l) => l.trim().startsWith('- '));
              return (
                <ul key={i} className="list-disc list-inside space-y-1 my-3 text-foreground/90">
                  {items.map((item, j) => <li key={j}>{item.replace(/^- /, '')}</li>)}
                </ul>
              );
            }
            if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.slice(2, -2).includes('**')) {
              return <p key={i} className="font-semibold my-2">{trimmed.slice(2, -2)}</p>;
            }
            return <p key={i} className="leading-relaxed text-foreground/90 my-3">{trimmed}</p>;
          })}
        </div>
      ) : (
        <div className="space-y-10">
          {article.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-2xl font-semibold mb-3">{s.heading}</h2>
              <p className="leading-relaxed text-foreground/90">{s.body}</p>
            </section>
          ))}
        </div>
      )}


      {/* CTA */}
      <div className="mt-12 rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
            <Calculator className="size-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Immobilie gefunden?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Link einfügen und kostenlos analysieren – Rendite, Cashflow und Mietrechts-Risiko in Sekunden.
            </p>
            <Link to="/signup" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
              Kostenlos starten <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {article.faq && article.faq.length > 0 && (
        <section id="faq" className="mt-12 scroll-mt-24">
          <h2 className="text-2xl font-semibold mb-4">Häufige Fragen</h2>
          <div className="space-y-4">
            {article.faq.map((f, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="font-medium">{f.q}</div>
                <p className="text-sm text-muted-foreground mt-1.5">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Internal linking */}
      <section className="mt-12 grid sm:grid-cols-3 gap-3">
        <Link to="/rechner" className="rounded-lg border p-4 hover:border-primary transition">
          <div className="text-sm font-medium">Rechner öffnen</div>
          <div className="text-xs text-muted-foreground mt-1">Rendite & Cashflow live berechnen</div>
        </Link>
        <Link to="/pricing" className="rounded-lg border p-4 hover:border-primary transition">
          <div className="text-sm font-medium">Preise ansehen</div>
          <div className="text-xs text-muted-foreground mt-1">Gratis, Plus, Premium</div>
        </Link>
        <Link to="/signup" className="rounded-lg border p-4 hover:border-primary transition">
          <div className="text-sm font-medium">Konto anlegen</div>
          <div className="text-xs text-muted-foreground mt-1">In 30 Sekunden starten</div>
        </Link>
      </section>

      {article.legalDisclaimer && (
        <p className="mt-12 text-xs text-muted-foreground border-t pt-6">
          Hinweis: Dieser Artikel dient der allgemeinen Information und ersetzt keine Rechts-, Steuer- oder Finanzberatung. Für deinen konkreten Fall solltest du fachkundigen Rat einholen.
        </p>
      )}
    </article>
  );
}
