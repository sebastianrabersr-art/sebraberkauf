// Importiert Ratgeber-Artikel aus öffentlich geteilten Google Docs nach src/lib/ratgeber.ts.
//
//   node scripts/import-articles.mjs            -> schreibt src/lib/ratgeber.ts
//   node scripts/import-articles.mjs --dry-run  -> zeigt nur an, was passieren würde
//
// Hinweis: Wir laden den HTML-Export statt ?format=txt. Im TXT-Export sind Überschriften
// nicht von normalen Zeilen unterscheidbar; der HTML-Export enthält echte <h1>/<h2>/<h3>,
// Listen und Tabellen.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { transform } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RATGEBER_FILE = path.join(ROOT, "src/lib/ratgeber.ts");
const DRY_RUN = process.argv.includes("--dry-run");
const MATCH_THRESHOLD = 0.6;
const CONCURRENCY = 5;

const DOC_IDS = [
  "1KFta3BuuI9ol-zCHl_raJYVrqHm704ZFEFCW5sKSqn4",
  "18Bc90gud__ZypojaZFvKhYvfce6iBQavG2p7VreMn4c",
  "1NcdZh3BuTdxwuyv8pV68okJwN5Yij7jdd56wu-Q18TU",
  "1KzNZ1xyDr32b2oCsiHixwd8gYOwdndYVgs-99vabaZY",
  "115MflKliZPKBm9kj0oHFuv-ijWAfqFRg_jm93Qv49AU",
  "1w8Vdv5-69l96qsRadg15_5L6N0lPqteyCTGWWePoBP0",
  "11w84cDWrBs2mu2HjiRYPkliBkpFfr8FOUwfcCCaA_qk",
  "1lNqcyzQBDnNWMxkKTH6Gi0bshTHK7z7tUcQskhZDJ94",
  "1bwcjm6I3wIOSwZhaqwMmPXqAJs4b6g3iPorQoxoDXUI",
  "1-ZcJctG1IymYjAnJ1iOwqEoz3oSQowa2YteoZzECST4",
  "1tc9pqWNemkmqkImxJDExYxhOfXqYfKnai7V3cLLgvZU",
  "11pntsWqXiMfqAFH5vWTD0AnaFQ9741AIc_lWRlWVpRI",
  "1MGK-OFwVHsrL9ACE2an3W_8sW-TNVmZywn7flBmgCr8",
  "1oSBJ3rqKttrPlZNp2Mb5sVIan6cbLLa_LaKxU6rW9rM",
  "15m3Tsi-i5k2UwRcBeQ2iDDGuFoNR6K_zjfU7XtxAF_c",
  "1t_ZimFvTfuZTGsrukfRi2HP1gcXWlifSUpYJK5rovQM",
  "1cILmUuLA8mTDR36rRBjLfnWvU2CWr3LA54zdAV-DFtk",
  "1amd4QL3AF85XvXMZtmtDaqllG6ESLWg57hQC4nS22Ro",
  "1gPNgHlhTpESHhcz5uWt96SZIDoy93e95Sm8WcNai3DU",
  "1F-qSzwWA7uqt80RYm2AZaNyGrzX-FiU_UdIPcvcNUTE",
  "1VI3aiSxyyZi4THhgRWuJe0uKCg15cW4dk7I-UxPpTu4",
  "1BVko0Gmsj8OPt77LwovSXHjg8PPAZCnj82X5zuRauSo",
  "13KUGfbfdmIE3ZkPHRDG6agYw_UMRtBcE3eS4AMyBe-c",
  "1ebQuyjWulEdujHfTg1EQglYx9J4R7HKKXVGnGKeslfI",
  "1pCffsSCjiHshkhpkXv-MLcYAJX6KPKOvyyVfLcSloLk",
  "1Gf3jl_H6yfT0-pcdEo695dsfnHrk8mzRT67sbhtrma4",
  "1piB7TjxYe72UiGXHFUMKzQ1vNSyqR6pBDlFBOeTxQ1A",
  "1-Xy_LmjrrEzNPqknq_Nx3Ql7iCLO3CiosvR5YaTDlBI",
  "1uLCH3tRa04Ad8ee7LVZ0X7Q0vWK9iQO_8RunTz-nra8",
  "12pkAQWDFXPQQ7AEoFZguN6TEKe769BVry2AuFO_IWyg",
];

// ---------- Fetch ----------

async function fetchDocHtml(id, attempts = 3) {
  const url = `https://docs.google.com/document/d/${id}/export?format=html`;
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (!html.includes("<body")) throw new Error("Antwort ist kein Doc-Export (nicht öffentlich geteilt?)");
      return html;
    } catch (e) {
      if (i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------- HTML -> Text ----------

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß",
  euro: "€", ndash: "–", mdash: "—", hellip: "…", bull: "•", middot: "·",
  bdquo: "„", ldquo: "“", rdquo: "”", sbquo: "‚", lsquo: "‘", rsquo: "’",
  laquo: "«", raquo: "»", divide: "÷", times: "×", deg: "°", sect: "§",
  frac12: "½", frac14: "¼", frac34: "¾", asymp: "≈", le: "≤", ge: "≥",
  plusmn: "±", minus: "−", rarr: "→", larr: "←", eacute: "é", egrave: "è", agrave: "à",
  shy: "", zwj: "", zwnj: "",
};
const unknownEntities = new Set();

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(code);
    }
    if (e in NAMED_ENTITIES) return NAMED_ENTITIES[e];
    unknownEntities.add(m);
    return m;
  });
}

/** Klassen, die Google im <style>-Block als fett definiert. */
function boldClasses(html) {
  const css = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  const set = new Set();
  for (const m of css.matchAll(/\.([\w-]+)\{([^}]*)\}/g)) {
    if (/font-weight:\s*(700|bold)/.test(m[2])) set.add(m[1]);
  }
  return set;
}

function inlineText(fragment) {
  const s = fragment
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(s)
    .replace(/ /g, " ")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();
}

/** true, wenn jeder Textteil des Absatzes in einem fetten <span> steht. */
function isFullyBold(fragment, bold) {
  if (!bold.size) return false;
  const spans = [...fragment.matchAll(/<span([^>]*)>([\s\S]*?)<\/span>/gi)]
    .filter((m) => inlineText(m[2]).length > 0);
  if (!spans.length) return false;
  return spans.every((m) => {
    const cls = m[1].match(/class="([^"]*)"/)?.[1].split(/\s+/) ?? [];
    return cls.some((c) => bold.has(c)) || /font-weight:\s*(700|bold)/.test(m[1]);
  });
}

/** Zerlegt den Doc-Body in Blöcke in Dokumentreihenfolge. */
function parseBlocks(html) {
  const bold = boldClasses(html);
  const body = html.slice(html.indexOf("<body"));
  const blocks = [];
  const re = /<(h[1-6]|p|ul|ol|table)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const m of body.matchAll(re)) {
    const tag = m[1].toLowerCase();
    const inner = m[3];
    if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((li) => inlineText(li[1]).replace(/\n+/g, " "))
        .filter(Boolean);
      if (items.length) blocks.push({ type: "list", items });
    } else if (tag === "table") {
      const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((tr) =>
        [...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((td) => inlineText(td[1]).replace(/\n+/g, " ")),
      ).filter((r) => r.some(Boolean));
      if (rows.length) blocks.push({ type: "table", rows });
    } else {
      const text = inlineText(inner);
      if (!text) continue;
      if (tag === "p") blocks.push({ type: "p", text, bold: isFullyBold(inner, bold) });
      else blocks.push({ type: "h", level: Number(tag[1]), text: text.replace(/\n+/g, " ") });
    }
  }
  return blocks;
}

// ---------- Doc -> Artikel ----------

const META_RE = /^meta[- ]?description\s*:?\s*/i;

function parseDoc(html) {
  const blocks = parseBlocks(html);
  if (!blocks.length) throw new Error("Doc ist leer");

  // Titel: erste H1, sonst der erste Block ("erste Zeile").
  let titleIdx = blocks.findIndex((b) => b.type === "h" && b.level === 1);
  if (titleIdx === -1 || titleIdx > 2) titleIdx = 0;
  const titleBlock = blocks[titleIdx];
  const title = (titleBlock.text ?? titleBlock.items?.[0] ?? "").replace(/\s+/g, " ").trim();

  // Meta-Description: Block, der mit "Meta-Description:" beginnt (Text in derselben
  // oder – wie im Export üblich – in der nächsten Zeile bzw. im nächsten Block).
  let description = "";
  let bodyStart = titleIdx + 1;
  const metaIdx = blocks.findIndex((b, i) => i > titleIdx && i <= titleIdx + 2 && b.text && META_RE.test(b.text));
  if (metaIdx !== -1) {
    description = blocks[metaIdx].text.replace(META_RE, "").replace(/\s+/g, " ").trim();
    bodyStart = metaIdx + 1;
    if (!description && blocks[bodyStart]?.type === "p") {
      description = blocks[bodyStart].text.replace(/\s+/g, " ").trim();
      bodyStart++;
    }
  }

  const body = blocks.slice(bodyStart);
  return { title, description, fullContent: toMarkdown(body), firstParagraph: body.find((b) => b.type === "p")?.text ?? "" };
}

/** Format, das ArticleLayout versteht: Blöcke durch Leerzeilen getrennt, "## "/"### ", "- ". */
function toMarkdown(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === "h") {
      out.push(`${b.level <= 2 ? "##" : "###"} ${b.text}`);
    } else if (b.type === "list") {
      out.push(b.items.map((i) => `- ${i}`).join("\n"));
    } else if (b.type === "table") {
      // ArticleLayout kann keine Tabellen: Kopfzeile als Absatz, Zeilen als Liste.
      const [head, ...rows] = b.rows;
      if (rows.length) {
        out.push(head.filter(Boolean).join(" | "));
        out.push(rows.map((r) => `- ${r.filter(Boolean).join(r.length === 2 ? ": " : " | ")}`).join("\n"));
      } else {
        out.push(`- ${head.filter(Boolean).join(" | ")}`);
      }
    } else {
      // Einzelne Zeilenumbrüche würden im Renderer ohnehin zu Leerzeichen; zusammenziehen.
      const text = b.text.replace(/\n+/g, " ");
      out.push(b.bold ? `**${text}**` : text);
    }
  }
  return out.join("\n\n");
}

// ---------- Matching ----------

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

function slugify(title) {
  return normalize(title).replace(/%/g, "-prozent").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function bigrams(s) {
  const t = normalize(s).replace(/\s+/g, " ");
  const grams = new Map();
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  return grams;
}

/** Sørensen–Dice-Koeffizient über Zeichen-Bigramme (0..1). */
function similarity(a, b) {
  const A = bigrams(a), B = bigrams(b);
  let overlap = 0, total = 0;
  for (const [g, n] of A) { total += n; overlap += Math.min(n, B.get(g) ?? 0); }
  for (const n of B.values()) total += n;
  return total ? (2 * overlap) / total : 0;
}

// ---------- Kategorie für neue Artikel ----------

function guessCategory(title) {
  const t = title.toLowerCase();
  if (t.includes("österreich")) return "Österreich";
  if (t.includes("deutschland")) return "Deutschland";
  if (t.includes("nebenkosten")) return "Kaufnebenkosten";
  if (/miet(recht|vertrag|erhöhung|preisbremse)|richtwert|kündigung/.test(t)) return "Mietrecht";
  if (/checkliste/.test(t)) return "Checklisten";
  if (/kredit|finanzierung|darlehen|zins|eigenkapital|hebel|bank/.test(t)) return "Finanzierung";
  if (/rendite|cashflow|kaufpreisfaktor|leerstand|rücklage|break-even/.test(t)) return "Rendite & Cashflow";
  return "Immobilienkauf";
}

// ---------- ratgeber.ts lesen/schreiben ----------

async function loadArticles(source) {
  const { code } = await transform(source, { loader: "ts", format: "esm" });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  return mod.RATGEBER_ARTICLES;
}

const tpl = (s) => "`" + s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
const str = (s) => JSON.stringify(s);

function serializeArticle(a) {
  const L = ["  {"];
  L.push(`    slug: ${str(a.slug)},`);
  L.push(`    title: ${str(a.title)},`);
  L.push(`    seoTitle: ${str(a.seoTitle)},`);
  L.push(`    description: ${tpl(a.description)},`);
  L.push(`    category: ${str(a.category)},`);
  if (a.tags) L.push(`    tags: [${a.tags.map(str).join(", ")}],`);
  L.push(`    publishedAt: ${str(a.publishedAt)},`);
  if (a.updatedAt) L.push(`    updatedAt: ${str(a.updatedAt)},`);
  L.push(`    readingMinutes: ${a.readingMinutes},`);
  L.push(`    intro: ${tpl(a.intro)},`);
  if (a.sections.length) {
    L.push("    sections: [");
    for (const s of a.sections) {
      L.push("      {");
      L.push(`        id: ${str(s.id)},`);
      L.push(`        heading: ${str(s.heading)},`);
      L.push(`        body: ${tpl(s.body)},`);
      L.push("      },");
    }
    L.push("    ],");
  } else {
    L.push("    sections: [],");
  }
  if (a.faq) {
    if (a.faq.length) {
      L.push("    faq: [");
      for (const f of a.faq) {
        L.push("      {");
        L.push(`        q: ${tpl(f.q)},`);
        L.push(`        a: ${tpl(f.a)},`);
        L.push("      },");
      }
      L.push("    ],");
    } else {
      L.push("    faq: [],");
    }
  }
  if (a.legalDisclaimer !== undefined) L.push(`    legalDisclaimer: ${a.legalDisclaimer},`);
  if (a.fullContent !== undefined) L.push(`    fullContent: ${tpl(a.fullContent)},`);
  L.push("  },");
  return L.join("\n");
}

function replaceArticlesArray(source, articles) {
  const startMarker = "export const RATGEBER_ARTICLES: RatgeberArticle[] = [";
  const start = source.indexOf(startMarker);
  const fnIdx = source.indexOf("export function getArticleBySlug");
  const end = source.lastIndexOf("\n];", fnIdx);
  if (start === -1 || fnIdx === -1 || end === -1 || end < start) {
    throw new Error("RATGEBER_ARTICLES-Array in ratgeber.ts nicht gefunden");
  }
  const array = `${startMarker}\n${articles.map(serializeArticle).join("\n")}\n];`;
  return source.slice(0, start) + array + source.slice(end + 3);
}

// ---------- Main ----------

async function main() {
  const source = await readFile(RATGEBER_FILE, "utf8");
  const articles = (await loadArticles(source)).map((a) => ({ ...a }));
  console.log(`${articles.length} bestehende Artikel in src/lib/ratgeber.ts\n`);

  console.log(`Lade ${DOC_IDS.length} Google Docs …`);
  const docs = await mapLimit(DOC_IDS, CONCURRENCY, async (id, i) => {
    const tag = `[${String(i + 1).padStart(2)}/${DOC_IDS.length}]`;
    try {
      const doc = parseDoc(await fetchDocHtml(id));
      if (!doc.title) throw new Error("kein Titel gefunden");
      if (!doc.description) console.warn(`${tag} ⚠ keine Meta-Description gefunden (${id})`);
      console.log(`${tag} ✓ ${doc.title}`);
      return { id, ...doc };
    } catch (e) {
      console.error(`${tag} ✗ ${id}: ${e.message}`);
      return { id, error: e.message };
    }
  });

  // Matching: beste Paarungen zuerst vergeben, jeder Artikel höchstens einmal.
  const ok = docs.filter((d) => !d.error);
  const candidates = [];
  for (const d of ok) {
    const docSlug = slugify(d.title);
    articles.forEach((a, ai) => {
      const score = a.slug === docSlug ? 1 : similarity(d.title, a.title);
      candidates.push({ d, ai, score });
    });
  }
  candidates.sort((x, y) => y.score - x.score);
  const takenArticles = new Set();
  const matchOf = new Map();
  for (const c of candidates) {
    if (c.score < MATCH_THRESHOLD || matchOf.has(c.d) || takenArticles.has(c.ai)) continue;
    matchOf.set(c.d, c);
    takenArticles.add(c.ai);
  }

  const updated = [], created = [], unchanged = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const d of ok) {
    const m = matchOf.get(d);
    if (m) {
      const a = articles[m.ai];
      if (a.fullContent === d.fullContent) unchanged.push({ d, a, score: m.score });
      else updated.push({ d, a, score: m.score });
      a.fullContent = d.fullContent;
    } else {
      let slug = slugify(d.title);
      while (articles.some((a) => a.slug === slug)) slug += "-2";
      const words = d.fullContent.split(/\s+/).length;
      const a = {
        slug,
        title: d.title,
        seoTitle: d.title,
        description: d.description,
        category: guessCategory(d.title),
        tags: [],
        publishedAt: today,
        readingMinutes: Math.max(1, Math.ceil(words / 200)),
        intro: d.firstParagraph.replace(/\n+/g, " "),
        sections: [],
        faq: [],
        legalDisclaimer: true,
        fullContent: d.fullContent,
      };
      articles.push(a);
      created.push({ d, a });
    }
  }

  // ---------- Report ----------
  const pct = (s) => `${Math.round(s * 100)} %`;
  console.log(`\n=== Aktualisiert (${updated.length}) ===`);
  for (const { d, a, score } of updated) {
    console.log(`  ${a.slug}  [Ähnlichkeit ${pct(score)}]`);
    if (normalize(d.title) !== normalize(a.title)) console.log(`      Doc-Titel: ${d.title}`);
  }
  if (unchanged.length) {
    console.log(`\n=== Gematcht, Inhalt identisch (${unchanged.length}) ===`);
    for (const { a, score } of unchanged) console.log(`  ${a.slug}  [${pct(score)}]`);
  }
  console.log(`\n=== Neu angelegt (${created.length}) ===`);
  for (const { a } of created) console.log(`  ${a.slug}  (Kategorie geraten: ${a.category})`);
  const failed = docs.filter((d) => d.error);
  if (failed.length) {
    console.log(`\n=== Fehlgeschlagen (${failed.length}) ===`);
    for (const d of failed) console.log(`  ${d.id}: ${d.error}`);
  }
  const untouched = articles.filter((_, i) => !takenArticles.has(i) && !created.some((c) => c.a === articles[i]));
  console.log(`\n=== Bestehende Artikel ohne Doc, unverändert (${untouched.length}) ===`);
  for (const a of untouched) console.log(`  ${a.slug}`);
  if (unknownEntities.size) console.warn(`\n⚠ Unbekannte HTML-Entities: ${[...unknownEntities].join(", ")}`);

  if (DRY_RUN) {
    console.log("\n--dry-run: ratgeber.ts nicht geschrieben.");
    return;
  }
  const next = replaceArticlesArray(source, articles);
  // Sicherheitscheck: neue Datei muss sich wieder laden lassen und dieselben Daten enthalten.
  const reloaded = await loadArticles(next);
  if (reloaded.length !== articles.length || JSON.stringify(reloaded) !== JSON.stringify(articles)) {
    throw new Error("Round-Trip-Prüfung fehlgeschlagen – ratgeber.ts wurde NICHT geschrieben");
  }
  await writeFile(RATGEBER_FILE, next, "utf8");
  console.log(`\nsrc/lib/ratgeber.ts geschrieben (${articles.length} Artikel).`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
