import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { RatgeberArticle } from "@/lib/ratgeber";
import { ArrowRight } from "@phosphor-icons/react";

/**
 * Inline-Markdown für Artikeltexte: **fett** und *kursiv*.
 * Alles andere bleibt Klartext – die Inhalte kommen aus Google Docs, nicht von Nutzern.
 */
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(\S(?:[^*\n]*\S)?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      m[1] !== undefined ? (
        <strong key={m.index} className="font-semibold text-[#1C1917]">{m[1]}</strong>
      ) : (
        <em key={m.index}>{m[2]}</em>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}

const slugId = (text: string) => text.toLowerCase().replace(/[^a-z0-9äöü]/g, "-").replace(/-+/g, "-");

/** Blöcke des Volltexts; Zeilen werden getrimmt, damit auch eingerückte Altinhalte funktionieren. */
function contentBlocks(full: string) {
  return full
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map((l) => l.trim()).join("\n").trim())
    .filter(Boolean);
}

const h2Cls = "font-display text-[24px] font-extrabold text-[#1C1917] mt-12 mb-3 scroll-mt-24";
const bodyCls = "text-[16px] leading-[1.7] text-[#1C1917]/90 my-4";

export function ArticleLayout({ article }: { article: RatgeberArticle; origin?: string }) {
  const blocks = article.fullContent ? contentBlocks(article.fullContent) : [];
  const tocHeadings = blocks.filter((b) => b.startsWith("## ")).map((b) => b.slice(3));
  const toc = article.fullContent
    ? tocHeadings.map((t) => ({ id: slugId(t), label: t }))
    : article.sections.length > 1
      ? article.sections.map((s) => ({ id: s.id, label: s.heading }))
      : [];

  return (
    <article className="max-w-3xl mx-auto px-6 py-12">
      <nav className="text-[13px] text-ink-2 mb-8 flex gap-2 flex-wrap" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#1C1917]">Start</Link>
        <span aria-hidden>/</span>
        <Link to="/ratgeber" className="hover:text-[#1C1917]">Ratgeber</Link>
        <span aria-hidden>/</span>
        <span className="text-[#1C1917]">{article.category}</span>
      </nav>

      <header className="mb-10">
        <h1 className="font-display text-[34px] md:text-[42px] font-extrabold leading-[1.08] text-[#1C1917] text-balance">
          {article.title}
        </h1>
        <p className="text-ink-2 mt-4 text-[18px] leading-relaxed">{article.description}</p>
        <div className="text-[13px] text-ink-3 mt-5">
          <span className="text-[#2D6A4F] font-medium">{article.category}</span>
          {" · "}
          {new Date(article.publishedAt).toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })}
          {" · "}
          {article.readingMinutes} min Lesezeit
        </div>
      </header>

      <p className="text-[18px] leading-[1.65] text-[#1C1917] mb-10">{renderInline(article.intro)}</p>

      {toc.length > 0 && (
        <aside className="border-y border-[#EAE6DF] py-5 mb-10">
          <div className="text-[13px] font-semibold text-[#1C1917] mb-3">Inhalt</div>
          <ol className="space-y-1.5 text-[14px] list-decimal list-inside marker:text-ink-3">
            {toc.map((t, i) => (
              <li key={`${i}-${t.id}`}>
                <a href={`#${t.id}`} className="text-[#2D6A4F] underline-offset-4 hover:underline">{t.label}</a>
              </li>
            ))}
            {article.faq && article.faq.length > 0 && (
              <li><a href="#faq" className="text-[#2D6A4F] underline-offset-4 hover:underline">Häufige Fragen</a></li>
            )}
          </ol>
        </aside>
      )}

      {article.fullContent ? (
        <div>
          {blocks.map((block, i) => {
            if (block.startsWith("## ")) {
              const text = block.slice(3);
              return <h2 key={i} id={slugId(text)} className={h2Cls}>{text}</h2>;
            }
            if (block.startsWith("### ")) {
              return <h3 key={i} className="text-[18px] font-semibold text-[#1C1917] mt-8 mb-2">{block.slice(4)}</h3>;
            }
            if (block.startsWith("- ")) {
              const items = block.split("\n").filter((l) => l.startsWith("- "));
              return (
                <ul key={i} className="list-disc pl-5 space-y-1.5 my-4 text-[16px] leading-[1.6] text-[#1C1917]/90 marker:text-[#2D6A4F]">
                  {items.map((item, j) => <li key={j}>{renderInline(item.slice(2))}</li>)}
                </ul>
              );
            }
            if (block.startsWith("**") && block.endsWith("**") && !block.slice(2, -2).includes("**")) {
              return <p key={i} className="font-semibold text-[#1C1917] my-3">{block.slice(2, -2)}</p>;
            }
            return <p key={i} className={bodyCls}>{renderInline(block.replace(/\n/g, " "))}</p>;
          })}
        </div>
      ) : (
        <div className="space-y-10">
          {article.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className={h2Cls.replace("mt-12", "mt-0")}>{s.heading}</h2>
              <p className={bodyCls}>{renderInline(s.body)}</p>
            </section>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-14 rounded-[12px] bg-[#1C1917] text-white p-7">
        <h3 className="font-display text-[22px] font-extrabold">Immobilie gefunden?</h3>
        <p className="text-[15px] text-white/75 mt-2 max-w-[52ch]">
          Füg den Link zum Inserat ein und sieh dir Rendite, Cashflow und das Mietrechts-Risiko an – bevor du einen Besichtigungstermin ausmachst.
        </p>
        <Link
          to="/signup"
          className="mt-5 inline-flex items-center gap-1.5 rounded-[8px] bg-[#2D6A4F] text-white px-4 py-2.5 text-[14px] font-medium hover:bg-[#235740] transition-colors"
        >
          Kostenlos ausprobieren <ArrowRight className="size-4" />
        </Link>
      </div>

      {article.faq && article.faq.length > 0 && (
        <section id="faq" className="mt-14 scroll-mt-24">
          <h2 className={h2Cls.replace("mt-12", "mt-0")}>Häufige Fragen</h2>
          <div className="divide-y divide-[#EAE6DF] border-y border-[#EAE6DF]">
            {article.faq.map((f, i) => (
              <div key={i} className="py-4">
                <div className="font-semibold text-[#1C1917]">{f.q}</div>
                <p className="text-[15px] text-ink-2 mt-1.5 leading-relaxed">{renderInline(f.a)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Internal linking */}
      <section className="mt-14 grid sm:grid-cols-3 gap-3">
        <Link to="/rechner" className="rounded-[12px] border border-[#EAE6DF] bg-white p-4 hover:border-[#2D6A4F] transition-colors">
          <div className="text-[14px] font-semibold text-[#1C1917]">Rechner öffnen</div>
          <div className="text-[13px] text-ink-2 mt-1">Rendite & Cashflow selbst durchrechnen</div>
        </Link>
        <Link to="/pricing" className="rounded-[12px] border border-[#EAE6DF] bg-white p-4 hover:border-[#2D6A4F] transition-colors">
          <div className="text-[14px] font-semibold text-[#1C1917]">Preise ansehen</div>
          <div className="text-[13px] text-ink-2 mt-1">Kostenlos, Plus, Premium</div>
        </Link>
        <Link to="/signup" className="rounded-[12px] border border-[#EAE6DF] bg-white p-4 hover:border-[#2D6A4F] transition-colors">
          <div className="text-[14px] font-semibold text-[#1C1917]">Konto anlegen</div>
          <div className="text-[13px] text-ink-2 mt-1">Eine Immobilie gratis analysieren</div>
        </Link>
      </section>

      {article.legalDisclaimer && (
        <p className="mt-12 text-[13px] text-ink-3 border-t border-[#EAE6DF] pt-6">
          Hinweis: Dieser Artikel dient der allgemeinen Information und ersetzt keine Rechts-, Steuer- oder Finanzberatung. Für deinen konkreten Fall solltest du fachkundigen Rat einholen.
        </p>
      )}
    </article>
  );
}
