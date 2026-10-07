import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { scrapeListing } from "./scrape";

const extractedSchema = z.object({
  title: z.string().default(""),
  url: z.string().default(""),
  platform: z.string().default(""),
  country: z.string().default(""),
  purchase_price: z.number().nullable().default(null),
  living_area_m2: z.number().nullable().default(null),
  plot_area_m2: z.number().nullable().default(null),
  outdoor_area_m2: z.number().nullable().default(null),
  rooms: z.number().nullable().default(null),
  address: z.string().default(""),
  district: z.string().default(""),
  location: z.string().default(""),
  city: z.string().default(""),
  region: z.string().default(""),
  property_type: z.string().default(""),
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
  commission_pct: z.number().nullable().default(null),
  commission_eur: z.number().nullable().default(null),
  energy_class: z.string().default(""),
  hwb: z.number().nullable().default(null),
  availability: z.string().default(""),
  seller_type: z.string().default(""),
  description: z.string().default(""),
  features: z.string().default(""),
  image_urls: z.array(z.string()).default([]),
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
  // Österreich
  if (u.includes("willhaben.at")) return "willhaben";
  if (u.includes("immobilienscout24.at") || u.includes("immoscout24.at")) return "ImmoScout24 AT";
  if (u.includes("derstandard.at")) return "derStandard";
  if (u.includes("immowelt.at")) return "immowelt AT";
  if (u.includes("immobazar")) return "immobazar";
  if (u.includes("immodirekt")) return "ImmoDirekt";
  if (u.includes("findmyhome")) return "FindMyHome";
  if (u.includes("ehl.at")) return "EHL";
  if (u.includes("otto-immobilien")) return "Otto Immobilien";
  if (u.includes("jp-immobilien")) return "JP Immobilien";
  if (u.includes("immo.at")) return "immo.at";
  if (u.includes("remax.at")) return "RE/MAX AT";
  if (u.includes("bazar.at")) return "bazar.at";
  if (u.includes("wohnnet.at")) return "wohnnet";
  if (u.includes("immounited")) return "ImmoUnited";
  if (u.includes("s-real.at")) return "s Real";
  if (u.includes("raiffeisen-immobilien")) return "Raiffeisen Immobilien";
  if (u.includes("century21")) return "Century 21";
  if (u.includes("buwog")) return "BUWOG";
  if (u.includes("arealis")) return "Arealis";
  // Deutschland
  if (u.includes("immobilienscout24.de") || u.includes("immoscout24.de")) return "ImmoScout24 DE";
  if (u.includes("immowelt.de")) return "immowelt DE";
  if (u.includes("immonet")) return "immonet";
  if (u.includes("kleinanzeigen.de") || u.includes("ebay-kleinanzeigen")) return "kleinanzeigen";
  if (u.includes("meinestadt.de")) return "meinestadt";
  if (u.includes("immobilien.de")) return "immobilien.de";
  if (u.includes("ohne-makler.net")) return "ohne-makler";
  if (u.includes("homeday")) return "Homeday";
  if (u.includes("mcmakler")) return "McMakler";
  // International / Makler
  if (u.includes("remax")) return "RE/MAX";
  if (u.includes("engelvoelkers") || u.includes("engel-voelkers")) return "Engel & Völkers";
  if (u.includes("sothebys")) return "Sotheby's";
  if (u.includes("bauträger") || u.includes("bautraeger") || u.includes("neubau")) return "Bauträger";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Sonstige"; }
}

export function detectCountry(url: string): "Österreich" | "Deutschland" | "" {
  const u = (url || "").toLowerCase();
  if (!u) return "";
  if (/\.at(\/|$|\?)/.test(u) || u.includes("willhaben") || u.includes("derstandard") || u.includes("immobazar") || u.includes("ehl.at")) return "Österreich";
  if (/\.de(\/|$|\?)/.test(u) || u.includes("kleinanzeigen") || u.includes("immonet") || u.includes("meinestadt")) return "Deutschland";
  return "";
}

export const extractProperty = createServerFn({ method: "POST" })
  .inputValidator((d: { url?: string; text?: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "LOVABLE_API_KEY fehlt." };

    const url = (data.url || "").trim();
    const platform = detectPlatform(url);
    const country = detectCountry(url);
    let text = (data.text || "").trim();
    let fetched = false;

    if (!text && url) { text = (await scrapeListing(url)).text; fetched = text.length > 200; }

    if (!text) {
      return { ok: false as const, platform, country, url,
        error: "Inserat konnte nicht automatisch ausgelesen werden. Bitte den Inseratstext kopieren und unten manuell einfügen." };
    }

    const system = `Du extrahierst strukturierte Daten aus Immobilien-Inseraten in Österreich und Deutschland (willhaben, ImmoScout24 AT/DE, derStandard, immowelt AT/DE, immobazar, immonet, kleinanzeigen, Makler- und Bauträgerseiten, Bank-/Verwertungsseiten, sowie unbekannte Immobilienseiten).
Antworte AUSSCHLIESSLICH mit gültigem JSON nach folgendem Schema. Werte die nicht eindeutig sind = null bzw. "" und in missing_data eintragen. Niemals raten, niemals erfinden.
Schema-Felder:
- title, platform, country ("Österreich"|"Deutschland"|""), purchase_price (EUR, Kaufpreis als Zahl)
- living_area_m2, plot_area_m2 (Grundstücksfläche), outdoor_area_m2 (Balkon+Terrasse+Garten gesamt falls nur summiert), rooms
- address (Straße/Hausnummer falls genannt), district (AT z.B. "1070", DE z.B. Stadtteilname), location (freie Lagebeschreibung), city, region (Bundesland/Region)
- property_type ("Wohnung"|"Haus"|"Grundstück"|"Zinshaus"|"Gewerbe"|"Sonstiges")
- year_built, condition, floor
- has_elevator, has_balcony, has_terrace, has_loggia, has_garden, has_basement, has_parking
- monthly_operating_costs, monthly_heating_costs
- commission_pct (Maklerprovision in %), commission_eur (Provision in EUR falls fix angegeben)
- energy_class (A++..H), hwb (kWh/m²a), availability, seller_type ("Makler"|"Privat"|"Bauträger"|"Bank"|"")
- description (max 500 Zeichen, neutrale Zusammenfassung), features (Ausstattungsliste max 400 Zeichen)
- image_urls (Array mit bis zu 6 absoluten Bild-URLs aus dem Inserat falls im Text/JSON-LD erkennbar)
- estimated_rent_monthly (realistisch geschätzte Netto-Kaltmiete je Lage/Größe/Zustand), rent_is_estimate (true wenn geschätzt)
- mietrecht_hint nur für AT: ("Neubau / freie Miete" | "Teilanwendung MRG" | "Altbau / Richtwert möglich" | "unklar – rechtlich prüfen" | "nicht geeignet"). Für DE: ""
- missing_data (string[] aller nicht gefundenen relevanten Felder).

Zusätzliche Hinweise für schwierige Fälle:
- Bei willhaben: Kaufpreis steht oft als 'Kaufpreis: X €' oder im JSON-LD als 'price'. Bezirk = PLZ (4-stellig bei AT).
- Bei ImmoScout24: Preis steht als 'Kaufpreis' oder 'Gesamtpreis' im Expose. Zimmer als 'Zi.' abgekürzt.
- Bei immowelt: 'Kaufpreis' oder 'Gesamtpreis inkl. NK'. Provision oft als '3,57 % inkl. MwSt'.
- Bei kleinanzeigen.de: Preis direkt im Titel oder als 'VB' (Verhandlungsbasis). Land = Deutschland.
- Bei Bauträger-/Maklerseiten: Preis oft als 'ab X €' — nimm den niedrigsten genannten Preis.
- Wenn commission_pct nicht explizit genannt aber 'provisionsfrei' oder 'ohne Makler' steht: commission_pct = 0.
- Wenn 'Makler' oder 'Provision' erwähnt wird ohne Prozentsatz: AT-Standard = 3.0, DE-Standard = 3.57.
- estimated_rent_monthly: Berechne als (Kaufpreis / 200) als grobe Schätzung wenn keine Mietangaben vorhanden, aber markiere rent_is_estimate = true.`;

    const user = `URL: ${url || "(nicht angegeben)"}\nPlattform: ${platform}\nLand (URL-Heuristik): ${country || "unbekannt"}\n\nInseratstext:\n${text}`;

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
      if (resp.status === 429) return { ok: false as const, platform, country, url, error: "Rate-Limit – bitte später erneut versuchen." };
      if (resp.status === 402) return { ok: false as const, platform, country, url, error: "Lovable AI Credits aufgebraucht – bitte aufladen." };
      if (!resp.ok) {
        const t = await resp.text();
        return { ok: false as const, platform, country, url, error: `AI-Fehler: ${resp.status} ${t.slice(0, 200)}` };
      }
      const body = await resp.json();
      const content = body?.choices?.[0]?.message?.content ?? "{}";
      if (typeof content === "string") {
        let cleaned = content.trim();
        // Strip markdown code fences
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
        // Extract just the JSON object
        const first = cleaned.indexOf("{");
        const last = cleaned.lastIndexOf("}");
        if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
        try {
          json = JSON.parse(cleaned);
        } catch {
          try {
            json = JSON.parse(cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
          } catch {
            return { ok: false as const, platform, country, url, error: "Antwort konnte nicht geparst werden – bitte erneut versuchen." };
          }
        }
      } else {
        json = content;
      }
    } catch (e) {
      return { ok: false as const, platform, country, url, error: `AI-Fehler: ${e instanceof Error ? e.message : String(e)}` };
    }

    const merged = { ...(json as object), url, platform: (json as Record<string, unknown>)?.platform || platform, country: (json as Record<string, unknown>)?.country || country };
    const parsed = extractedSchema.safeParse(merged);
    if (!parsed.success) return { ok: false as const, platform, country, url, error: "Antwort konnte nicht geparst werden." };
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
