/**
 * Inserat-Seite abrufen – für (fast) jedes Immobilienportal.
 *
 * Stufen, jeweils nur wenn die vorherige nichts Verwertbares liefert:
 *  1. Direktabruf mit vollständigen Browser-Headern. Liest eingebettete Daten aus
 *     (JSON-LD, __NEXT_DATA__ & Co., Meta-Tags) statt sie wegzuwerfen – dort stehen bei
 *     willhaben, derStandard, kleinanzeigen, immowelt usw. Preis, Fläche und Adresse.
 *  2. Firecrawl (wenn FIRECRAWL_API_KEY gesetzt): rendert JavaScript. Erst mit Proxy
 *     "auto"; bei Bot-Sperre (z. B. ImmoScout24 DE / Imperva) zweiter Versuch mit
 *     "enhanced"-Proxy, Länder-Standort und Wartezeit.
 *  3. Jina Reader (r.jina.ai, ohne Schlüssel nutzbar, optional JINA_API_KEY) als Notfall.
 *
 * Nur Server-seitig verwenden (Server-Funktionen).
 */

export type ScrapeResult = {
  /** Text für die KI: strukturierte Daten zuerst, dann sichtbarer Text. Leer = nichts gefunden. */
  text: string;
  images: string[];
  /** Welche Stufe geliefert hat – hilfreich für Logs. */
  via: "direct" | "firecrawl" | "firecrawl-enhanced" | "jina" | "none";
  /** true, wenn mindestens eine Stufe eine Bot-Sperre gemeldet hat. */
  blocked: boolean;
};

const MAX_TEXT = 30000;
const MAX_STRUCTURED = 9000;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "de-AT,de;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

// Typische Sperr- und Prüfseiten (Imperva, Cloudflare, DataDome, PerimeterX, eigene Captchas).
const BOT_PAGE =
  /ich bin kein roboter|gleich geht.s weiter|captcha|just a moment|checking your browser|access denied|attention required|verify you are (a )?human|enable javascript and cookies|request unsuccessful|px-captcha|datadome|zugriff verweigert/i;

/** Tracking-Parameter entfernen; bei einigen Portalen stören Query-Parameter den Abruf. */
export function normalizeListingUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    for (const p of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "tracking"]) {
      u.searchParams.delete(p);
    }
    const host = u.hostname.toLowerCase();
    if (/immobilienscout24|immoscout24|immowelt|kleinanzeigen/.test(host)) u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return raw.trim();
  }
}

function countryOf(url: string): "AT" | "DE" | "CH" {
  try {
    const h = new URL(url).hostname;
    if (h.endsWith(".de")) return "DE";
    if (h.endsWith(".ch")) return "CH";
  } catch { /* ignore */ }
  return "AT";
}

function looksBlocked(status: number, sample: string): boolean {
  if (status === 401 || status === 403 || status === 429 || status === 503) return true;
  return BOT_PAGE.test(sample.slice(0, 6000)) && sample.length < 40000;
}

// ---------- Strukturierte Daten aus HTML ----------

// Schlüssel, die für die Bewertung relevant sind (deutsch/englisch, wie Portale sie benennen).
const RELEVANT_KEY =
  /price|preis|kaufpreis|area|fl(ae|ä)che|m2|sqm|size|room|zimmer|address|adresse|street|strasse|straße|zip|plz|postal|postcode|city|ort|stadt|district|bezirk|region|bundesland|state|country|land|year|baujahr|construction|condition|zustand|floor|etage|stockwerk|geschoss|lift|elevator|aufzug|balcon|balkon|terrace|terrasse|loggia|garden|garten|keller|cellar|basement|parking|garage|stellplatz|heating|heizung|energy|energie|hwb|fgee|betriebskosten|operating|nebenkosten|hausgeld|ruecklage|rücklage|reserve|commission|provision|courtage|title|titel|headline|description|beschreibung|type|typ|kategorie|category|available|verfügbar|bezug|seller|anbieter|makler|lat|lon|geo/i;

function flattenRelevant(value: unknown, out: string[], path = "", depth = 0): void {
  if (out.length > 400 || depth > 12 || value == null) return;
  if (Array.isArray(value)) {
    // Muster wie willhaben: [{ name: "PRICE", values: ["129000"] }]
    if (value.length && value.every((v) => v && typeof v === "object" && "name" in (v as object) && ("values" in (v as object) || "value" in (v as object)))) {
      for (const v of value as { name: unknown; values?: unknown; value?: unknown }[]) {
        const vals = Array.isArray(v.values) ? v.values.join(", ") : String(v.value ?? v.values ?? "");
        if (vals && String(vals).length < 600) out.push(`${String(v.name)}: ${vals}`);
      }
      return;
    }
    value.slice(0, 40).forEach((v, i) => flattenRelevant(v, out, `${path}[${i}]`, depth + 1));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flattenRelevant(v, out, path ? `${path}.${k}` : k, depth + 1);
    }
    return;
  }
  const s = String(value).trim();
  if (!s || s.length > 1200) return;
  const keys = path.split(/[.[\]]/).filter((k) => k && !/^\d+$/.test(k));
  let key = keys.pop() ?? "";
  if (key.startsWith("@")) return; // @type, @context – Schema-Rauschen
  // Generische Blätter (floorSize.value, price.amount) nach dem Elternschlüssel beurteilen.
  if (/^(value|amount|text|name|unitText|unitCode|minValue|maxValue)$/i.test(key)) key = `${keys.pop() ?? ""}.${key}`;
  if (RELEVANT_KEY.test(key)) out.push(`${path}: ${s}`);
}

function parseJsonSafe(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&euro;/g, "€")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractFromHtml(html: string, baseUrl: string): { text: string; images: string[]; hasStructured: boolean } {
  const parts: string[] = [];
  const images = new Set<string>();

  // Meta-Tags (Attributreihenfolge egal)
  const meta: string[] = [];
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const key = /(?:property|name|itemprop)=["']([^"']+)["']/i.exec(tag)?.[1];
    const content = /content=["']([^"']*)["']/i.exec(tag)?.[1];
    if (!key || !content) continue;
    if (/^(og:|twitter:|description$|keywords$|product:|place:|price|geo\.)/i.test(key)) {
      meta.push(`${key}: ${decodeEntities(content)}`);
      if (/image$/i.test(key)) images.add(content);
    }
  }
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  if (title) parts.push(`Seitentitel: ${decodeEntities(title.trim())}`);
  if (meta.length) parts.push(`Meta:\n${meta.slice(0, 60).join("\n")}`);

  // JSON-LD, __NEXT_DATA__, Nuxt und andere eingebettete JSON-Daten
  const structured: string[] = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    const body = m[2].trim();
    if (!body) continue;
    const isLd = /application\/ld\+json/i.test(attrs);
    const isJson = isLd || /application\/json/i.test(attrs) || /id=["']__NEXT_DATA__["']/i.test(attrs);
    let data: unknown = null;
    if (isJson) data = parseJsonSafe(body);
    else {
      // window.__INITIAL_STATE__ = {...}; / window.__NUXT__=...
      const assign = /window\.(__[A-Z_]+__|__NUXT__|__APOLLO_STATE__)\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(body);
      if (assign) data = parseJsonSafe(assign[2]);
    }
    if (!data) continue;
    const lines: string[] = [];
    flattenRelevant(data, lines);
    if (lines.length) structured.push(...lines);
    if (isLd) collectImages(data, images);
  }
  const hasStructured = structured.length > 0;
  if (hasStructured) {
    const uniq = Array.from(new Set(structured));
    parts.push(`Strukturierte Daten:\n${uniq.join("\n").slice(0, MAX_STRUCTURED)}`);
  }

  for (const m of html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)) {
    if (images.size >= 12) break;
    const src = absolutize(m[1], baseUrl);
    if (src && /\.(jpe?g|png|webp)(\?|$)/i.test(src)) images.add(src);
  }

  const visible = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(nav|footer|header)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
  if (visible) parts.push(`Text:\n${visible}`);

  return {
    text: parts.join("\n\n").slice(0, MAX_TEXT),
    images: Array.from(images).map((s) => absolutize(s, baseUrl)).filter((s): s is string => !!s).slice(0, 6),
    hasStructured,
  };
}

function collectImages(data: unknown, into: Set<string>, depth = 0): void {
  if (depth > 6 || data == null || into.size >= 12) return;
  if (Array.isArray(data)) { data.forEach((d) => collectImages(d, into, depth + 1)); return; }
  if (typeof data === "object") {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (/^(image|photo|contentUrl|url)$/i.test(k) && typeof v === "string" && /\.(jpe?g|png|webp)|picture|image/i.test(v)) into.add(v);
      else collectImages(v, into, depth + 1);
    }
  }
}

function absolutize(src: string, base: string): string | null {
  try { return new URL(src, base).toString(); } catch { return null; }
}

// ---------- Stufen ----------

async function viaDirect(url: string): Promise<{ text: string; images: string[]; blocked: boolean; good: boolean }> {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const html = await res.text();
    if (looksBlocked(res.status, html)) return { text: "", images: [], blocked: true, good: false };
    if (!res.ok) return { text: "", images: [], blocked: false, good: false };
    const { text, images, hasStructured } = extractFromHtml(html, res.url || url);
    // Reine JS-Hülle ohne Daten (SPA) gilt nicht als Treffer → nächste Stufe rendert.
    const good = hasStructured ? text.length > 300 : text.length > 1500;
    return { text, images, blocked: false, good };
  } catch {
    return { text: "", images: [], blocked: false, good: false };
  }
}

async function viaFirecrawl(url: string, enhanced: boolean): Promise<{ text: string; images: string[]; blocked: boolean }> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return { text: "", images: [], blocked: false };
  const country = countryOf(url);
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        proxy: enhanced ? "enhanced" : "auto",
        waitFor: enhanced ? 8000 : 2000,
        location: { country, languages: [country === "DE" ? "de-DE" : country === "CH" ? "de-CH" : "de-AT"] },
        maxAge: 3600000, // 1 h Cache: wiederholte Analysen desselben Inserats kosten nichts extra
        timeout: enhanced ? 60000 : 30000,
      }),
      signal: AbortSignal.timeout(enhanced ? 70000 : 40000),
    });
    if (!r.ok) return { text: "", images: [], blocked: r.status === 403 };
    const j: any = await r.json();
    const md: string = j?.data?.markdown || "";
    const meta = j?.data?.metadata || {};
    const status = Number(meta.statusCode) || 200;
    if (looksBlocked(status, `${meta.title ?? ""}\n${md}`)) return { text: "", images: [], blocked: true };
    const images: string[] = [];
    if (typeof meta.ogImage === "string") images.push(meta.ogImage);
    for (const m of md.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)\)/g)) {
      if (images.length >= 6) break;
      images.push(m[1]);
    }
    const head = [meta.title && `Seitentitel: ${meta.title}`, meta.description && `Beschreibung: ${meta.description}`].filter(Boolean).join("\n");
    const text = `${head}\n\n${md}`.trim();
    return { text: text.length > 300 ? text.slice(0, MAX_TEXT) : "", images, blocked: false };
  } catch {
    return { text: "", images: [], blocked: false };
  }
}

async function viaJina(url: string): Promise<{ text: string; images: string[]; blocked: boolean }> {
  const headers: Record<string, string> = { Accept: "text/plain", "X-Return-Format": "markdown", "X-Timeout": "25" };
  const jinaKey = process.env.JINA_API_KEY;
  if (jinaKey) headers.Authorization = `Bearer ${jinaKey}`;
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, { headers, signal: AbortSignal.timeout(35000) });
    if (!r.ok) return { text: "", images: [], blocked: false };
    const t = await r.text();
    if (looksBlocked(200, t) || /requiring captcha|returned error 4\d\d/i.test(t.slice(0, 1000))) return { text: "", images: [], blocked: true };
    const images: string[] = [];
    for (const m of t.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)\)/g)) {
      if (images.length >= 6) break;
      if (/\.(jpe?g|png|webp)|picture|image/i.test(m[1])) images.push(m[1]);
    }
    return { text: t.length > 300 ? t.slice(0, MAX_TEXT) : "", images, blocked: false };
  } catch {
    return { text: "", images: [], blocked: false };
  }
}

/** Ruft ein Inserat ab und liefert Text für die KI-Extraktion. */
export async function scrapeListing(rawUrl: string): Promise<ScrapeResult> {
  const url = normalizeListingUrl(rawUrl);
  let blocked = false;

  const direct = await viaDirect(url);
  blocked ||= direct.blocked;
  if (direct.good) return { text: direct.text, images: direct.images, via: "direct", blocked };

  const fc = await viaFirecrawl(url, false);
  blocked ||= fc.blocked;
  if (fc.text) return { text: fc.text, images: fc.images.length ? fc.images : direct.images, via: "firecrawl", blocked };

  if (fc.blocked || direct.blocked) {
    const fc2 = await viaFirecrawl(url, true);
    blocked ||= fc2.blocked;
    if (fc2.text) return { text: fc2.text, images: fc2.images, via: "firecrawl-enhanced", blocked };
  }

  const jina = await viaJina(url);
  blocked ||= jina.blocked;
  if (jina.text) return { text: jina.text, images: jina.images, via: "jina", blocked };

  // Letzter Rest: was der Direktabruf hatte (z. B. nur Meta-Daten) ist besser als nichts.
  if (direct.text.length > 200) return { text: direct.text, images: direct.images, via: "direct", blocked };
  return { text: "", images: [], via: "none", blocked };
}
