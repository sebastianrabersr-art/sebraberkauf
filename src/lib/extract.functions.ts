import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { scrapeListing } from "./scrape";

// Tolerante Feldtypen: Die KI liefert für fehlende Werte oft null statt "", Zahlen als
// Text ("350.000 €", "3,5") oder "ja"/"nein" statt true/false. Ein strenges Schema ließ
// deshalb jeden zweiten Import mit "Antwort konnte nicht geparst werden" scheitern.
export function parseLooseNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.replace(/[^\d.,-]/g, "");
  if (!s || !/\d/.test(s)) return null;
  const hasDot = s.includes("."), hasComma = s.includes(",");
  if (hasDot && hasComma) {
    // "1.234,56" (de) oder "1,234.56" (en): das letzte Trennzeichen ist das Dezimalzeichen.
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (hasComma) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ""); // "350.000" = Tausenderpunkt
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
const looseStr = z.preprocess((v) => (v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : String(v)), z.string());
const looseNum = z.preprocess(parseLooseNumber, z.number().nullable());
const looseBool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (/^(ja|yes|true|vorhanden|1)$/i.test(v.trim())) return true;
    if (/^(nein|no|false|nicht vorhanden|0)$/i.test(v.trim())) return false;
  }
  return null;
}, z.boolean().nullable());
const looseStrArr = z.preprocess(
  (v) => (Array.isArray(v) ? v.filter((x) => x != null).map(String) : typeof v === "string" && v.trim() ? [v] : []),
  z.array(z.string()),
);

const extractedSchema = z.object({
  title: looseStr,
  url: looseStr,
  platform: looseStr,
  country: looseStr,
  purchase_price: looseNum,
  living_area_m2: looseNum,
  plot_area_m2: looseNum,
  outdoor_area_m2: looseNum,
  rooms: looseNum,
  address: looseStr,
  district: looseStr,
  location: looseStr,
  city: looseStr,
  region: looseStr,
  property_type: looseStr,
  year_built: looseNum,
  condition: looseStr,
  floor: looseStr,
  has_elevator: looseBool,
  has_balcony: looseBool,
  has_terrace: looseBool,
  has_loggia: looseBool,
  has_garden: looseBool,
  has_basement: looseBool,
  has_parking: looseBool,
  monthly_operating_costs: looseNum,
  monthly_heating_costs: looseNum,
  commission_pct: looseNum,
  commission_eur: looseNum,
  energy_class: looseStr,
  hwb: looseNum,
  availability: looseStr,
  seller_type: looseStr,
  description: looseStr,
  features: looseStr,
  image_urls: looseStrArr,
  estimated_rent_monthly: looseNum,
  rent_is_estimate: z.preprocess((v) => (v == null ? true : v), looseBool).transform((v) => v ?? true),
  mietrecht_hint: looseStr,
  missing_data: looseStrArr,
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

    // Strg+A auf einer Inseratsseite kann sehr lang werden; mehr als ~60.000 Zeichen
    // verlängern nur die Antwortzeit (Gefahr von Zeitüberschreitung beim ersten Versuch).
    const user = `URL: ${url || "(nicht angegeben)"}\nPlattform: ${platform}\nLand (URL-Heuristik): ${country || "unbekannt"}\n\nInseratstext:\n${text.slice(0, 60000)}`;

    // Bis zu zwei Versuche: Eine kaputte KI-Antwort, ein 5xx-Fehler oder ein Netzwerkfehler
    // werden still wiederholt, statt den Nutzer erneut klicken zu lassen.
    let lastError = "Antwort konnte nicht verarbeitet werden – bitte erneut versuchen.";
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await callExtractionAi(apiKey, system, user);
      if (res.kind === "fatal") return { ok: false as const, platform, country, url, error: res.error };
      if (res.kind === "retry") { lastError = res.error; continue; }

      const json = res.json as Record<string, unknown>;
      const merged = { ...json, url, platform: json?.platform || platform, country: json?.country || country };
      const parsed = extractedSchema.safeParse(merged);
      if (parsed.success) return { ok: true as const, data: parsed.data, fetchedFromUrl: fetched };
      lastError = "Antwort konnte nicht verarbeitet werden – bitte erneut versuchen.";
    }
    return { ok: false as const, platform, country, url, error: lastError };
  });

type AiResult = { kind: "ok"; json: unknown } | { kind: "retry"; error: string } | { kind: "fatal"; error: string };

async function callExtractionAi(apiKey: string, system: string, user: string): Promise<AiResult> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (resp.status === 429) return { kind: "fatal", error: "Rate-Limit – bitte später erneut versuchen." };
    if (resp.status === 402) return { kind: "fatal", error: "Lovable AI Credits aufgebraucht – bitte aufladen." };
    if (!resp.ok) {
      const t = await resp.text();
      const error = `AI-Fehler: ${resp.status} ${t.slice(0, 200)}`;
      return resp.status >= 500 ? { kind: "retry", error } : { kind: "fatal", error };
    }
    const body = await resp.json();
    const content = body?.choices?.[0]?.message?.content ?? "";
    if (typeof content !== "string") return content && typeof content === "object" ? { kind: "ok", json: content } : { kind: "retry", error: "Leere KI-Antwort." };
    const json = parseJsonLoose(content);
    return json ? { kind: "ok", json } : { kind: "retry", error: "Antwort konnte nicht verarbeitet werden – bitte erneut versuchen." };
  } catch (e) {
    return { kind: "retry", error: `AI-Fehler: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** JSON aus einer KI-Antwort holen – auch mit Code-Fences, Text drumherum oder Trailing-Kommas. */
function parseJsonLoose(content: string): Record<string, unknown> | null {
  let cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  cleaned = cleaned.slice(first, last + 1);
  for (const candidate of [cleaned, cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")]) {
    try {
      const v = JSON.parse(candidate);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        // Manche Antworten verpacken das Objekt: { "data": {...} } / { "property": {...} }
        const inner = (v as Record<string, unknown>).data ?? (v as Record<string, unknown>).property;
        return inner && typeof inner === "object" && !Array.isArray(inner) && !("title" in v) ? (inner as Record<string, unknown>) : v;
      }
    } catch { /* nächster Versuch */ }
  }
  return null;
}

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
