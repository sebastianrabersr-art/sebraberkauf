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
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "de-AT,de;q=0.9,en;q=0.8",
  };
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000), redirect: "follow" });
    if (!res.ok) return "";
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 22000);
  } catch {
    return "";
  }
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

    if (!text && url) {
      text = await fetchPage(url);
      fetched = text.length > 200;
    }

    if (!text) {
      return {
        ok: false as const,
        platform,
        url,
        error:
          "Inserat konnte nicht automatisch ausgelesen werden. Bitte den Inseratstext kopieren und unten manuell einfügen.",
      };
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
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
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
    if (!parsed.success) {
      return { ok: false as const, platform, url, error: "Antwort konnte nicht geparst werden." };
    }
    return { ok: true as const, data: parsed.data, fetchedFromUrl: fetched };
  });
