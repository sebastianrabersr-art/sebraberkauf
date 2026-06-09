import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const extractedSchema = z.object({
  title: z.string().default(""),
  url: z.string().default(""),
  platform: z.string().default(""),
  purchase_price: z.number().nullable().default(null),
  living_area_m2: z.number().nullable().default(null),
  rooms: z.number().nullable().default(null),
  district: z.string().default(""),
  location: z.string().default(""),
  city: z.string().default(""),
  year_built: z.number().nullable().default(null),
  condition: z.string().default(""),
  floor: z.string().default(""),
  has_elevator: z.boolean().nullable().default(null),
  has_balcony: z.boolean().nullable().default(null),
  has_terrace: z.boolean().nullable().default(null),
  has_loggia: z.boolean().nullable().default(null),
  has_garden: z.boolean().nullable().default(null),
  has_basement: z.boolean().nullable().default(null),
  has_parking: z.boolean().nullable().default(null),
  monthly_operating_costs: z.number().nullable().default(null),
  monthly_heating_costs: z.number().nullable().default(null),
  energy_class: z.string().default(""),
  hwb: z.number().nullable().default(null),
  availability: z.string().default(""),
  seller_type: z.string().default(""),
  description: z.string().default(""),
  estimated_rent_monthly: z.number().nullable().default(null),
  rent_is_estimate: z.boolean().default(true),
  mietrecht_hint: z.string().default(""),
  missing_data: z.array(z.string()).default([]),
});

export type ExtractedProperty = z.infer<typeof extractedSchema>;

// PDF extraction
const pdfExtractedSchema = z.object({
  title: z.string().default(""),
  purchase_price: z.number().nullable().default(null),
  purchase_price_net: z.number().nullable().default(null),
  purchase_price_gross: z.number().nullable().default(null),
  living_area_m2: z.number().nullable().default(null),
  outdoor_area_m2: z.number().nullable().default(null),
  balcony_m2: z.number().nullable().default(null),
  terrace_m2: z.number().nullable().default(null),
  garden_m2: z.number().nullable().default(null),
  basement_m2: z.number().nullable().default(null),
  rooms: z.number().nullable().default(null),
  bathrooms: z.number().nullable().default(null),
  address: z.string().default(""),
  district: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  country: z.string().default(""),
  year_built: z.number().nullable().default(null),
  condition: z.string().default(""),
  floor: z.string().default(""),
  operating_costs: z.number().nullable().default(null),
  heating_costs: z.number().nullable().default(null),
  reserve_fund: z.number().nullable().default(null),
  commission_eur: z.number().nullable().default(null),
  commission_pct: z.number().nullable().default(null),
  seller_name: z.string().default(""),
  seller_company: z.string().default(""),
  seller_phone: z.string().default(""),
  seller_email: z.string().default(""),
  seller_website: z.string().default(""),
  seller_type: z.string().default(""),
  energy_class: z.string().default(""),
  hwb: z.number().nullable().default(null),
  fgee: z.number().nullable().default(null),
  heating_type: z.string().default(""),
  description: z.string().default(""),
  features: z.string().default(""),
  legal_rent_hint: z.string().default(""),
  availability: z.string().default(""),
  has_elevator: z.boolean().nullable().default(null),
  has_balcony: z.boolean().nullable().default(null),
  has_terrace: z.boolean().nullable().default(null),
  has_garden: z.boolean().nullable().default(null),
  has_basement: z.boolean().nullable().default(null),
  has_parking: z.boolean().nullable().default(null),
  missing_data: z.array(z.string()).default([]),
  notes: z.string().default(""),
});
export type PdfExtracted = z.infer<typeof pdfExtractedSchema>;

export function detectPlatform(url: string): string {
  const u = (url || "").toLowerCase();
  if (!u) return "";
  if (u.includes("willhaben.at")) return "willhaben";
  if (u.includes("immobilienscout24") || u.includes("immoscout")) return "ImmoScout24";
  if (u.includes("derstandard.at")) return "derStandard";
  if (u.includes("immowelt")) return "immowelt";
  if (u.includes("immodirekt")) return "ImmoDirekt";
  if (u.includes("findmyhome")) return "FindMyHome";
  if (u.includes("remax")) return "RE/MAX";
  if (u.includes("engelvoelkers") || u.includes("engel-voelkers")) return "Engel & Völkers";
  if (u.includes("otto-immobilien")) return "Otto Immobilien";
  if (u.includes("jp-immobilien")) return "JP Immobilien";
  if (u.includes("ehl.at")) return "EHL";
  if (u.includes("bauträger") || u.includes("bautraeger") || u.includes("neubau")) return "Bauträger";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Sonstige"; }
}

async function fetchPage(url: string): Promise<string> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "de-AT,de;q=0.9,en;q=0.8",
  };
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000), redirect: "follow" });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 22000);
  } catch { return ""; }
}

export const extractProperty = createServerFn({ method: "POST" })
  .inputValidator((d: { url?: string; text?: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "LOVABLE_API_KEY fehlt." };

    const url = (data.url || "").trim();
    const platform = detectPlatform(url);
    let text = (data.text || "").trim();
    let fetched = false;

    if (!text && url) { text = await fetchPage(url); fetched = text.length > 200; }

    if (!text) {
      return { ok: false as const, platform, url,
        error: "Inserat konnte nicht automatisch ausgelesen werden. Bitte den Inseratstext kopieren und unten manuell einfügen." };
    }

    const system = `Du extrahierst strukturierte Daten aus Immobilien-Inseraten (Österreich, vor allem Wien).
Antworte AUSSCHLIESSLICH mit gültigem JSON nach folgendem Schema. Werte die nicht eindeutig sind = null bzw. "" und in missing_data eintragen. Niemals raten.
Schema-Felder: title, platform, purchase_price (EUR), living_area_m2, rooms, district (z.B. "1070"), location, city, year_built, condition, floor, has_elevator, has_balcony, has_terrace, has_loggia, has_garden, has_basement, has_parking, monthly_operating_costs, monthly_heating_costs, energy_class, hwb, availability, seller_type ("Makler"|"Privat"|""), description (max 500 Zeichen), estimated_rent_monthly (realistisch geschätzte Netto-Kaltmiete für Wien je Lage/Größe/Zustand), rent_is_estimate (true wenn geschätzt), mietrecht_hint ("Neubau / freie Miete" | "Teilanwendung MRG" | "Altbau / Richtwert möglich" | "unklar – rechtlich prüfen" | "nicht geeignet"), missing_data (string[]).`;

    const user = `URL: ${url || "(nicht angegeben)"}\nPlattform: ${platform}\n\nInseratstext:\n${text}`;

    let json: unknown;
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          response_format: { type: "json_object" },
        }),
      });
      if (resp.status === 429) return { ok: false as const, platform, url, error: "Rate-Limit – bitte später erneut versuchen." };
      if (resp.status === 402) return { ok: false as const, platform, url, error: "Lovable AI Credits aufgebraucht – bitte aufladen." };
      if (!resp.ok) {
        const t = await resp.text();
        return { ok: false as const, platform, url, error: `AI-Fehler: ${resp.status} ${t.slice(0, 200)}` };
      }
      const body = await resp.json();
      const content = body?.choices?.[0]?.message?.content ?? "{}";
      json = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      return { ok: false as const, platform, url, error: `AI-Fehler: ${e instanceof Error ? e.message : String(e)}` };
    }

    const merged = { ...(json as object), url, platform: (json as any)?.platform || platform };
    const parsed = extractedSchema.safeParse(merged);
    if (!parsed.success) return { ok: false as const, platform, url, error: "Antwort konnte nicht geparst werden." };
    return { ok: true as const, data: parsed.data, fetchedFromUrl: fetched };
  });

// PDF -> structured fields via Gemini (file content block)
export const extractFromPdf = createServerFn({ method: "POST" })
  .inputValidator((d: { pdfBase64: string; fileName: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "LOVABLE_API_KEY fehlt." };
    if (!data.pdfBase64) return { ok: false as const, error: "Keine PDF-Daten." };

    const system = `Du extrahierst strukturierte Daten aus Immobilien-Exposés / Makler-PDFs (Österreich/Wien).
Antworte AUSSCHLIESSLICH mit gültigem JSON. Werte, die nicht eindeutig im Dokument stehen, MÜSSEN null bzw. "" sein und in "missing_data" gelistet werden. Niemals raten.
Felder: title, purchase_price, purchase_price_net, purchase_price_gross, living_area_m2, outdoor_area_m2, balcony_m2, terrace_m2, garden_m2, basement_m2, rooms, bathrooms, address, district (z.B. "1070"), city, state, country, year_built, condition, floor, operating_costs (mtl), heating_costs (mtl), reserve_fund (mtl), commission_eur, commission_pct, seller_name, seller_company, seller_phone, seller_email, seller_website, seller_type ("Privat"|"Makler"|"Bauträger"|"Bank"|"Sonstige"|""), energy_class, hwb, fgee, heating_type, description (max 600 Zeichen), features (max 400 Zeichen), legal_rent_hint, availability, has_elevator, has_balcony, has_terrace, has_garden, has_basement, has_parking, missing_data (string[]), notes.`;

    const dataUrl = data.pdfBase64.startsWith("data:") ? data.pdfBase64 : `data:application/pdf;base64,${data.pdfBase64}`;

    let json: unknown;
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: [
              { type: "text", text: `Bitte extrahiere die Felder aus diesem Exposé (Dateiname: ${data.fileName}).` },
              { type: "file", file: { filename: data.fileName, file_data: dataUrl } },
            ]},
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (resp.status === 429) return { ok: false as const, error: "Rate-Limit – bitte später erneut versuchen." };
      if (resp.status === 402) return { ok: false as const, error: "Lovable AI Credits aufgebraucht – bitte aufladen." };
      if (!resp.ok) {
        const t = await resp.text();
        return { ok: false as const, error: `AI-Fehler: ${resp.status} ${t.slice(0, 300)}` };
      }
      const body = await resp.json();
      const content = body?.choices?.[0]?.message?.content ?? "{}";
      json = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      return { ok: false as const, error: `AI-Fehler: ${e instanceof Error ? e.message : String(e)}` };
    }
    const parsed = pdfExtractedSchema.safeParse(json);
    if (!parsed.success) return { ok: false as const, error: "Antwort konnte nicht geparst werden." };
    return { ok: true as const, data: parsed.data };
  });
