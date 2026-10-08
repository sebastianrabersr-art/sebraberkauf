// Erzeugt public/llms-full.txt aus llms.txt + Ratgeber-Artikeln, Rechnern und Glossar.
// Aufruf nach neuen Artikeln/Begriffen:  node scripts/generate-llms-full.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

const SITE = "https://kaufma.eu";
const base = read("public/llms.txt").replace(/\n## Mehr[\s\S]*$/, "").trimEnd();

// Pakete im Detail (Stand: src/lib/auth.tsx → planLimits / PLAN_PRICING)
const plans = `## Funktionen pro Paket
### Free (kostenlos)
- 1 Immobilie, 1 Projekt
- Grundkalkulation: Kaufnebenkosten, Finanzierung, Rendite, Cashflow, Mietrecht-Einschätzung
- Inserat-Import per Link, Text oder Excel-Vorlage
- CRM und Pipeline
### Plus (€9,99/Monat oder €99,99/Jahr)
- 5 Immobilien, 1 Projekt
- Vergleich von bis zu 4 Objekten
- PDF-Export
- CRM und Pipeline, Excel-Import
### Premium (€29,99/Monat oder €299,99/Jahr)
- Unbegrenzt viele Immobilien und Projekte
- Vergleich von bis zu 10 Objekten
- Portfolio-Verwaltung (gekaufte Immobilien, Zahlungen, Cashflow nach dem Kauf)
- Kaufangebote erstellen
- Fix & Flip Kalkulationen
- PDF-Export, CRM und Pipeline, Excel-Import`;

// Ratgeber: slug + title + Kategorie aus src/lib/ratgeber.ts
const ratgeberSrc = read("src/lib/ratgeber.ts");
const articles = [...ratgeberSrc.matchAll(/slug:\s*"([^"]+)",\s*\n\s*title:\s*"([^"]+)",[\s\S]*?category:\s*"([^"]+)"/g)]
  .map((m) => ({ slug: m[1], title: m[2], category: m[3] }));
const byCat = new Map();
for (const a of articles) {
  if (!byCat.has(a.category)) byCat.set(a.category, []);
  byCat.get(a.category).push(a);
}
const ratgeber = ["## Ratgeber-Artikel", `Übersicht: ${SITE}/ratgeber`, ""];
for (const [cat, list] of byCat) {
  ratgeber.push(`### ${cat}`);
  for (const a of list) ratgeber.push(`- ${a.title} – ${SITE}/ratgeber/${a.slug}`);
  ratgeber.push("");
}

// Rechner: h1 + description aus src/routes/rechner.$slug.tsx (META)
const rechnerSrc = read("src/routes/rechner.$slug.tsx");
const calcs = [...rechnerSrc.matchAll(/\n  (\w+): \{\n\s*title:[^\n]*\n\s*description:\s*"([^"]+)",[\s\S]*?h1:\s*"([^"]+)"/g)]
  .map((m) => ({ slug: m[1], description: m[2], h1: m[3] }));
const rechner = ["## Rechner (kostenlos, ohne Anmeldung)", `Übersicht: ${SITE}/rechner`, ""];
for (const c of calcs) rechner.push(`- ${c.h1} – ${SITE}/rechner/${c.slug}`, `  ${c.description}`);

// Glossar: Begriff + Kurzerklärung aus src/lib/glossary.ts
const glossarSrc = read("src/lib/glossary.ts");
const terms = [...glossarSrc.matchAll(/term:\s*"([^"]+)",[^\n]*\n\s*short:\s*"([^"]+)"/g)]
  .map((m) => ({ term: m[1], short: m[2] }))
  .sort((a, b) => a.term.localeCompare(b.term, "de"));
const glossar = ["## Glossar", `${SITE}/glossar`, "", ...terms.map((t) => `- ${t.term}: ${t.short}`)];

const out = [base, "", plans, "", ...ratgeber, ...rechner, "", ...glossar, ""].join("\n");
writeFileSync(join(root, "public/llms-full.txt"), out);
console.log(`llms-full.txt: ${articles.length} Artikel, ${calcs.length} Rechner, ${terms.length} Glossarbegriffe`);
