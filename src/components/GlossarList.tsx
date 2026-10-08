import { useMemo, useState } from "react";
import { GLOSSARY, CATEGORY_LABELS, CATEGORY_COLORS, type GlossaryTerm } from "@/lib/glossary";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { GlossaryArticleLink } from "@/components/marketing/RatgeberLinks";

const CATEGORY_ORDER: GlossaryTerm["category"][] = [
  "rendite",
  "finanzierung",
  "mietrecht",
  "kosten",
  "analyse",
  "allgemein",
];

export function GlossarList() {
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? GLOSSARY.filter(
          (t) =>
            t.term.toLowerCase().includes(needle) ||
            t.short.toLowerCase().includes(needle) ||
            t.long.toLowerCase().includes(needle),
        )
      : GLOSSARY;
    const map = new Map<GlossaryTerm["category"], GlossaryTerm[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const t of filtered) map.get(t.category)!.push(t);
    return map;
  }, [q]);

  return (
    <div>
      <div className="relative mb-6">
        <MagnifyingGlass
          weight="duotone"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Begriff suchen…"
          className="w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white pl-9 pr-3 py-[9px] text-[13px] text-[#1C1917] outline-none focus:border-[#2D6A4F]"
        />
      </div>

      <div className="space-y-8">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <h3
                className="mb-3"
                style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="space-y-2">
                {items.map((t) => {
                  const c = CATEGORY_COLORS[t.category];
                  return (
                    <article
                      key={t.id}
                      id={t.id}
                      className="bg-white"
                      style={{ border: "1px solid #EAE6DF", borderRadius: 10, padding: "14px 16px" }}
                    >
                      <header className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h4
                          style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#1C1917", margin: 0 }}
                        >
                          {t.term}
                        </h4>
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 10,
                            fontWeight: 600,
                            background: c.bg,
                            color: c.fg,
                            padding: "2px 8px",
                            borderRadius: 999,
                          }}
                        >
                          {CATEGORY_LABELS[t.category]}
                        </span>
                      </header>
                      <p
                        style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}
                      >
                        {t.long}
                      </p>
                      <GlossaryArticleLink termId={t.id} />
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        {[...grouped.values()].every((arr) => arr.length === 0) && (
          <div className="text-center text-sm text-ink-2 py-10">Keine Begriffe gefunden.</div>
        )}
      </div>
    </div>
  );
}
