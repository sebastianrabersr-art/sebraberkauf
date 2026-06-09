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

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("willhaben")) return "willhaben";
  if (u.includes("immoscout")) return "ImmoScout24";
  if (u.includes("derstandard")) return "derStandard";
  if (u.includes("immowelt")) return "immowelt";
  return "Sonstige";
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    // crude text extract
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 20000);
  } catch (e) {
    return "";
  }
}

export const extractProperty = createServerFn({ method: "POST" })
  .inputValidator((d: { url?: string; text?: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "LOVABLE_API_KEY fehlt." };
    }
    const url = (data.url || "").trim();
    let text = (data.text || "").trim();
    let fetched = false;

    if (!text && url) {
      text = await fetchPage(url);
      fetched = text.length > 200;
    }

    if (!text) {
      return {
        ok: false as const,
        error:
          "Inserat konnte nicht ausgelesen werden. Bitte den Inseratstext kopieren und manuell einfügen.",
        platform: detectPlatform(url),
      };
    }

    const system = `Du extrahierst strukturierte Daten aus Immobilien-Inseraten (Österreich, vor allem Wien).
Antworte AUSSCHLIESSLICH mit gültigem JSON nach folgendem Schema. Werte die nicht eindeutig sind = null bzw. "" und in missing_data eintragen.
Schema:
{
 "title": string,
 "platform": string,
 "purchase_price": number|null (in EUR),
 "living_area_m2": number|null,
 "rooms": number|null,
 "district": string (z.B. "1070"),
 "location": string,
 "year_built": number|null,
 "condition": string,
 "floor": string,
 "has_elevator": boolean|null,
 "has_balcony": boolean|null,
 "has_terrace": boolean|null,
 "has_loggia": boolean|null,
 "has_garden": boolean|null,
 "has_basement": boolean|null,
 "has_parking": boolean|null,
 "monthly_operating_costs": number|null,
 "monthly_heating_costs": number|null,
 "energy_class": string,
 "hwb": number|null,
 "availability": string,
 "seller_type": string ("Makler"|"Privat"|""),
 "description": string (max 500 Zeichen),
 "estimated_rent_monthly": number|null (realistische geschätzte Netto-Kaltmiete Wien je Lage/Größe/Zustand),
 "rent_is_estimate": boolean (true wenn geschätzt, false wenn echte Miete im Inserat genannt),
 "mietrecht_hint": "Neubau / freie Miete" | "Teilanwendung MRG" | "Altbau / Richtwert möglich" | "unklar – rechtlich prüfen" | "nicht geeignet",
 "missing_data": string[]
}
Niemals raten. Wenn unklar -> null und in missing_data.`;

    const user = `URL: ${url || "(nicht angegeben)"}\n\nInseratstext:\n${text}`;

    let json: unknown;
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (resp.status === 429) return { ok: false as const, error: "Rate limit – bitte später nochmal." };
      if (resp.status === 402)
        return { ok: false as const, error: "Lovable AI Credits aufgebraucht – bitte aufladen." };
      if (!resp.ok) {
        const t = await resp.text();
        return { ok: false as const, error: `AI Fehler: ${resp.status} ${t.slice(0, 200)}` };
      }
      const body = await resp.json();
      const content = body?.choices?.[0]?.message?.content ?? "{}";
      json = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      return { ok: false as const, error: `AI Fehler: ${e instanceof Error ? e.message : String(e)}` };
    }

    const parsed = extractedSchema.safeParse({ ...(json as object), url, platform: (json as any)?.platform || detectPlatform(url) });
    if (!parsed.success) {
      return { ok: false as const, error: "Antwort konnte nicht geparst werden." };
    }
    return { ok: true as const, data: parsed.data, fetchedFromUrl: fetched };
  });
