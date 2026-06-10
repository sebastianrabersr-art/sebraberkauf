import { createServerFn } from "@tanstack/react-start";
import { detectCountry, detectPlatform } from "./extract.functions";

// Source: 'landingpage' = öffentliche Vorschau (keine Auth nötig).
// 'app' = aus eingeloggter App (später kann hier User-Quota geprüft werden).
type AnalyzeInput = { url: string; country?: string; source?: "landingpage" | "app" };

export type AnalyzeResult = {
  success: boolean;
  source_url: string;
  platform: string;
  title: string;
  purchase_price: number | null;
  living_area_m2: number | null;
  property_type: string;
  rooms: number | null;
  address: string;
  city: string;
  district: string;
  region: string;
  country: string;
  price_per_m2: number | null;
  monthly_operating_costs: number | null;
  year_built: number | null;
  condition: string;
  description: string;
  images: string[];
  missing_fields: string[];
  data_quality_score: number;
  error?: string;
  error_code?: "invalid_url" | "fetch_failed" | "ai_failed" | "rate_limited" | "no_credits" | "no_data";
};

function isValidHttpUrl(s: string): boolean {
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

function emptyResult(url: string, platform: string, country: string): Omit<AnalyzeResult, "success"> {
  return {
    source_url: url, platform, title: "",
    purchase_price: null, living_area_m2: null, property_type: "",
    rooms: null, address: "", city: "", district: "", region: "", country,
    price_per_m2: null, monthly_operating_costs: null, year_built: null,
    condition: "", description: "", images: [],
    missing_fields: [], data_quality_score: 0,
  };
}

// Pluggable Content-Fetcher: bevorzugt Firecrawl (wenn FIRECRAWL_API_KEY gesetzt),
// sonst direkter Fetch. So kann später Apify o.ä. ergänzt werden.
async function fetchContent(url: string): Promise<{ text: string; images: string[] }> {
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (fcKey) {
    try {
      const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${fcKey}` },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const j: any = await r.json();
        const md: string = j?.data?.markdown || j?.markdown || "";
        const links: string[] = j?.data?.links || j?.links || [];
        const images = links.filter((l) => /\.(jpe?g|png|webp)(\?|$)/i.test(l)).slice(0, 6);
        if (md && md.length > 200) return { text: md.slice(0, 22000), images };
      }
    } catch { /* fall through to direct fetch */ }
  }
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-AT,de;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (!res.ok) return { text: "", images: [] };
    const html = await res.text();
    const ld = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
      .map((m) => m[1]).join("\n").slice(0, 6000);
    const imgs = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi))
      .map((m) => m[1])
      .filter((s) => /^https?:\/\//.test(s) && /\.(jpe?g|png|webp)(\?|$)/i.test(s))
      .slice(0, 6);
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 22000);
    return { text: ld ? `JSON-LD:\n${ld}\n\nText:\n${text}` : text, images: imgs };
  } catch { return { text: "", images: [] }; }
}

function score(d: AnalyzeResult): number {
  // 0..100 nach befüllten Schlüsselfeldern
  const fields: (keyof AnalyzeResult)[] = [
    "title","purchase_price","living_area_m2","property_type","rooms",
    "address","city","district","country","monthly_operating_costs","year_built","condition","description",
  ];
  let filled = 0;
  for (const f of fields) {
    const v = d[f];
    if (v == null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    filled++;
  }
  return Math.round((filled / fields.length) * 100);
}

export const analyzePropertyUrl = createServerFn({ method: "POST" })
  .inputValidator((d: AnalyzeInput) => d)
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    const url = (data.url || "").trim();
    const platform = detectPlatform(url);
    const country = data.country || detectCountry(url);

    if (!url || !isValidHttpUrl(url)) {
      return { success: false, ...emptyResult(url, platform, country), error: "Bitte eine gültige URL einfügen.", error_code: "invalid_url" };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { success: false, ...emptyResult(url, platform, country), error: "AI-Schlüssel fehlt – bitte später erneut versuchen.", error_code: "ai_failed" };
    }

    const { text, images } = await fetchContent(url);
    if (!text || text.length < 200) {
      return { success: false, ...emptyResult(url, platform, country), error: "Inserat konnte nicht ausgelesen werden. Bitte Inseratstext einfügen oder PDF hochladen.", error_code: "fetch_failed" };
    }

    const system = `Du extrahierst strukturierte Immobiliendaten aus Inseraten (AT/DE: willhaben, ImmoScout24 AT/DE, immowelt, immonet, kleinanzeigen, derStandard, Maklerseiten, Bauträger, sonstige).
Antworte AUSSCHLIESSLICH mit gültigem JSON. Werte, die nicht eindeutig im Text stehen, MÜSSEN null bzw. "" sein und in "missing_fields" gelistet werden. Niemals raten, niemals erfinden.
Felder: title, purchase_price (EUR Zahl), living_area_m2 (Zahl), property_type ("Wohnung"|"Haus"|"Grundstück"|"Zinshaus"|"Gewerbe"|"Sonstiges"|""), rooms, address, city, district, region, country ("Österreich"|"Deutschland"|""), monthly_operating_costs, year_built, condition, description (max 500 Zeichen), missing_fields (string[]).`;

    const user = `URL: ${url}\nPlattform: ${platform}\nLand: ${country || "unbekannt"}\n\nInseratstext:\n${text}`;

    let parsed: any;
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          response_format: { type: "json_object" },
        }),
      });
      if (resp.status === 429) return { success: false, ...emptyResult(url, platform, country), error: "Rate-Limit – bitte später erneut versuchen.", error_code: "rate_limited" };
      if (resp.status === 402) return { success: false, ...emptyResult(url, platform, country), error: "AI-Credits aufgebraucht.", error_code: "no_credits" };
      if (!resp.ok) {
        const t = await resp.text();
        return { success: false, ...emptyResult(url, platform, country), error: `AI-Fehler: ${resp.status} ${t.slice(0, 160)}`, error_code: "ai_failed" };
      }
      const body = await resp.json();
      const content = body?.choices?.[0]?.message?.content ?? "{}";
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      return { success: false, ...emptyResult(url, platform, country), error: `AI-Fehler: ${e instanceof Error ? e.message : String(e)}`, error_code: "ai_failed" };
    }

    const price = typeof parsed?.purchase_price === "number" ? parsed.purchase_price : null;
    const area = typeof parsed?.living_area_m2 === "number" ? parsed.living_area_m2 : null;

    const result: AnalyzeResult = {
      success: true,
      source_url: url,
      platform: parsed?.platform || platform,
      title: parsed?.title || "",
      purchase_price: price,
      living_area_m2: area,
      property_type: parsed?.property_type || "",
      rooms: typeof parsed?.rooms === "number" ? parsed.rooms : null,
      address: parsed?.address || "",
      city: parsed?.city || "",
      district: parsed?.district || "",
      region: parsed?.region || "",
      country: parsed?.country || country || "",
      price_per_m2: price && area ? Math.round(price / area) : null,
      monthly_operating_costs: typeof parsed?.monthly_operating_costs === "number" ? parsed.monthly_operating_costs : null,
      year_built: typeof parsed?.year_built === "number" ? parsed.year_built : null,
      condition: parsed?.condition || "",
      description: parsed?.description || "",
      images,
      missing_fields: Array.isArray(parsed?.missing_fields) ? parsed.missing_fields : [],
      data_quality_score: 0,
    };
    result.data_quality_score = score(result);

    if (result.data_quality_score < 10 && !price && !area) {
      return { ...result, success: false, error: "Keine verwertbaren Daten gefunden.", error_code: "no_data" };
    }

    return result;
  });
