import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { detectCountry, detectPlatform, extractProperty } from "@/lib/extract.functions";
import { makeEmptyProperty, useActiveProject, useStore } from "@/lib/store";
import type { Mietrecht, Property, FinanceScenario } from "@/lib/types";
import { calcDataQuality, isValidUrl } from "@/lib/calc";
import { Warning as AlertTriangle, CheckCircle as CheckCircle2, House as Home, Hammer } from "@phosphor-icons/react";
import { PropertyTypePicker } from "@/components/PropertyTypePicker";
import { CATEGORY_LABEL, propertyCategory } from "@/lib/propertyKinds";
import { LinkSimple, ClipboardText, Table as TableIcon, PencilSimple, DownloadSimple } from "@phosphor-icons/react";
import * as XLSX from "xlsx";
import { usePropertyLimit } from "@/hooks/usePropertyLimit";

type TabKey = "link" | "text" | "excel" | "manuell";

const EXCEL_MAP: Record<string, string> = {
  "Titel": "title",
  "Kaufpreis €": "kaufpreis", "Kaufpreis": "kaufpreis",
  "Wohnfläche m²": "wohnflaecheM2", "Wohnfläche": "wohnflaecheM2",
  "Zimmer": "zimmer",
  "Bezirk / PLZ": "bezirk", "Bezirk": "bezirk",
  "Stadt": "city", "Bundesland": "bundesland", "Land": "land",
  "Baujahr": "baujahr", "Zustand": "zustand",
  "Energieklasse": "energyClass", "Objektart": "objekttyp", "Adresse": "adresse",
  "Nettomiete mtl. €": "nettomieteMtl", "Nettomiete mtl.": "nettomieteMtl",
  "Betriebskosten mtl. €": "betriebskostenMtl", "Betriebskosten mtl.": "betriebskostenMtl",
  "Heizkosten mtl. €": "heizkostenMtl", "Heizkosten mtl.": "heizkostenMtl",
  "Rücklagenfonds mtl. €": "ruecklageMtl", "Rücklagenfonds mtl.": "ruecklageMtl",
  "Beschreibung": "beschreibung", "Link zum Inserat": "link",
};
const FINANCE_KEYS = new Set(["Eigenkapital €", "Eigenkapital", "Zinssatz %", "Zinssatz", "Laufzeit Jahre", "Laufzeit"]);
const NUMERIC_FIELDS = new Set(["kaufpreis","wohnflaecheM2","zimmer","baujahr","nettomieteMtl","betriebskostenMtl","heizkostenMtl","ruecklageMtl"]);

function parseNum(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

function parseTSV(input: string): { rows: Record<string, string>[]; hasHeader: boolean } {
  const lines = input.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], hasHeader: false };
  const firstCells = lines[0].split("\t");
  const hasHeader = firstCells.some((c) => EXCEL_MAP[c.trim()] || FINANCE_KEYS.has(c.trim()));
  if (!hasHeader) return { rows: [], hasHeader: false };
  const headers = firstCells.map((c) => c.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split("\t");
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = (cells[j] ?? "").trim(); });
    if (Object.values(row).some((v) => v !== "")) rows.push(row);
  }
  return { rows, hasHeader: true };
}

function rowToProperty(row: Record<string, string>, projectId: string): Partial<Property> & { financeScenarios?: FinanceScenario[] } {
  const out: Record<string, unknown> = { projectId };
  for (const [key, val] of Object.entries(row)) {
    const propKey = EXCEL_MAP[key];
    if (!propKey || !val) continue;
    out[propKey] = NUMERIC_FIELDS.has(propKey) ? parseNum(val) : val;
  }
  const ek = parseNum(row["Eigenkapital €"] ?? row["Eigenkapital"] ?? "");
  const zs = parseNum(row["Zinssatz %"] ?? row["Zinssatz"] ?? "");
  const lz = parseNum(row["Laufzeit Jahre"] ?? row["Laufzeit"] ?? "");
  if (ek != null || zs != null || lz != null) {
    const kp = (out.kaufpreis as number | null) ?? null;
    out.financeScenarios = [{
      id: crypto.randomUUID(), name: "Importiert",
      kreditBetrag: kp != null && ek != null ? Math.max(0, kp - ek) : null,
      eigenkapital: ek, zinssatz: zs != null ? zs / 100 : 0.035,
      laufzeitJahre: lz ?? 25,
      intervall: "monatlich" as FinanceScenario["intervall"],
      tilgungsart: "annuitaet" as FinanceScenario["tilgungsart"],
      startDate: new Date().toISOString(),
    }];
  }
  if (row["Link zum Inserat"]) out.link = row["Link zum Inserat"];
  return out as Partial<Property> & { financeScenarios?: FinanceScenario[] };
}

type ImportResult = { property: Property; quality: ReturnType<typeof calcDataQuality>; partial: boolean; };

export function ImportTabsCard({ initialUrl = "" }: { initialUrl?: string }) {
  const navigate = useNavigate();
  const extractOnce = useServerFn(extractProperty);
  // Ein Netzwerk- oder Kaltstartfehler des Servers soll nicht als "fehlgeschlagen" beim
  // Nutzer landen: einmal still wiederholen.
  const extract = async (args: Parameters<typeof extractOnce>[0]) => {
    try {
      return await extractOnce(args);
    } catch {
      await new Promise((r) => setTimeout(r, 800));
      return await extractOnce(args);
    }
  };
  const project = useActiveProject();
  const { addProperty, findByLink, properties } = useStore();
  const propertyLimit = usePropertyLimit();

  const [activeTab, setActiveTab] = useState<TabKey>("link");
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState("");
  const [textUrl, setTextUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  // "zinshaus" ist keine eigene Strategie, sondern ein Objekttyp mit Einheiten (vermietet = Buy & Hold).
  // Vorauswahl aus dem Onboarding-Ziel ("Fix & Flip" → Fix & Flip, sonst Vermieten).
  const [strategy, setStrategy] = useState<"buy_and_hold" | "fix_and_flip">(() => {
    try { return localStorage.getItem("kaufma_goal") === "fixflip" ? "fix_and_flip" : "buy_and_hold"; } catch { return "buy_and_hold"; }
  });
  const [propertyType, setPropertyType] = useState<NonNullable<Property["propertyType"]>>("apartment");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [autoSwitchNotice, setAutoSwitchNotice] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!loading) { setLoadingPhase(0); return; }
    const id = setInterval(() => setLoadingPhase((p) => (p + 1) % 3), 2500);
    return () => clearInterval(id);
  }, [loading]);
  const loadingTexts = ["Link wird geladen…", "Daten werden extrahiert…", "KI analysiert…"];

  const downloadTemplate = () => {
    const headers = [
      "Titel","Kaufpreis €","Wohnfläche m²","Zimmer","Objektart","Baujahr","Zustand",
      "Energieklasse","Verfügbarkeit","Adresse","Bezirk / PLZ","Stadt","Bundesland","Land",
      "Nettomiete mtl. €","Betriebskosten mtl. €","Heizkosten mtl. €","Rücklagenfonds mtl. €",
      "Reserve €","Sanierungskosten €","Makler","Provision % netto","Provision % brutto",
      "Grunderwerbsteuer %","Notar & Grundbuch %","Sonstige Nebenkosten €",
      "Eigenkapital €","Zinssatz %","Laufzeit Jahre","Tilgungsart","Zinsbindung Jahre",
      "Beschreibung","Eigene Notizen","Link zum Inserat"
    ];
    const example = [
      "Schöne 2-Zimmer Wohnung Wien","350000","65","2","Wohnung","1995","Gut","C",
      "sofort","Quellenstraße 12/15","1100","Wien","Wien","Österreich",
      "1200","180","80","60","5000","15000","Ja","3","3.6","3.5","1.1","500",
      "80000","3.8","30","Annuität","10","Helle Wohnung mit Balkon","Gute Lage, nahe U-Bahn",
      "https://www.willhaben.at/..."
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Immobilien Import");
    XLSX.writeFile(wb, "kaufma_import_vorlage.xlsx");
  };

  useEffect(() => {
    try {
      const pending = localStorage.getItem("pending_analyze_url");
      if (pending && !url) {
        localStorage.removeItem("pending_analyze_url");
        setUrl(pending);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const platform = detectPlatform(url);
  const country = detectCountry(url);

  const checkDuplicate = (link: string): Property | undefined => {
    const l = link.trim();
    if (!l) return undefined;
    return findByLink(l, project.id) ?? properties.find((p) => p.link.trim() === l);
  };

  const mapPropertyType = (s: string): Property["propertyType"] => {
    const v = (s || "").toLowerCase();
    if (/garage|stellplatz|parkplatz/.test(v)) return "garage";
    if (/lager|logistik|halle/.test(v)) return "lager";
    if (/büro|buero|gewerb|geschäftslokal|praxis/.test(v)) return "commercial";
    if (/grundstück|grundstueck|bauland|baugrund/.test(v)) return "land_only";
    if (/haus|villa|reihen/.test(v) && !/zins|mehrfamilien/.test(v)) return "house_with_land";
    return "apartment";
  };

  const mapObjektart = (s: string): string => {
    const v = (s || "").toLowerCase();
    if (/garage|stellplatz|parkplatz/.test(v)) return "Garage";
    if (/lager|logistik/.test(v)) return "Lager";
    if (v.includes("wohn")) return "Wohnung";
    if (v.includes("haus") || v.includes("villa") || v.includes("reihen")) return "Haus";
    if (v.includes("grund")) return "Grundstück";
    if (v.includes("zins")) return "Zinshaus";
    if (v.includes("gewerb") || v.includes("büro") || v.includes("buero")) return "Gewerbe";
    return s || "";
  };

  const applyExtracted = (d: any, linkUrl: string) => {
    const mietrecht: Mietrecht = (d.mietrecht_hint as Mietrecht) || "unklar – rechtlich prüfen";
    const objektart = mapObjektart(d.property_type);
    const adresseFull = d.address || d.location || "";
    const draft = makeEmptyProperty({
      projectId: project.id, link: linkUrl.trim(),
      platform: d.platform || detectPlatform(linkUrl),
      land: d.country || detectCountry(linkUrl) || "",
      bundesland: d.region || "", title: d.title || "Ohne Titel",
      bezirk: d.district, adresse: adresseFull,
      city: d.city || (detectCountry(linkUrl) === "Österreich" ? "Wien" : ""),
      objekttyp: objektart, propertyType: mapPropertyType(d.property_type), baujahr: d.year_built, mietrecht,
      zustand: d.condition, wohnflaecheM2: d.living_area_m2,
      grundstuecksflaecheM2: d.plot_area_m2, aussenflaecheM2: d.outdoor_area_m2,
      zimmer: d.rooms, kaufpreis: d.purchase_price,
      makler: d.seller_type === "Makler" ? "Ja" : d.seller_type === "Privat" ? "Nein" : "unklar",
      sellerType: (d.seller_type as Property["sellerType"]) || undefined,
      provisionPct: d.commission_pct, provisionEUR: d.commission_eur,
      stockwerk: d.floor, hasElevator: d.has_elevator, hasBalkon: d.has_balcony,
      hasTerrasse: d.has_terrace, hasLoggia: d.has_loggia, hasGarten: d.has_garden,
      hasKeller: d.has_basement, hasStellplatz: d.has_parking,
      betriebskostenMtl: d.monthly_operating_costs, heizkostenMtl: d.monthly_heating_costs,
      energyClass: d.energy_class, hwb: d.hwb, verfuegbarkeit: d.availability,
      beschreibung: d.description, ausstattung: d.features,
      nettomieteMtl: d.estimated_rent_monthly, nettomieteGeschaetzt: d.rent_is_estimate,
      missingData: d.missing_data,
    });
    const draftDq = calcDataQuality(draft);
    const status: Property["extractionStatus"] = draftDq.score >= 60 ? "ok" : "partial";
    addProperty(makeEmptyProperty({ ...draft, extractionStatus: status }));
    // Der Store ergänzt ggf. die Standard-Finanzierung – Qualität am gespeicherten Objekt messen.
    const p = useStore.getState().properties.find((x) => x.id === draft.id) ?? draft;
    const dq = calcDataQuality(p);
    setResult({ property: p, quality: dq, partial: dq.score < 60 });
    if (dq.score < 60) {
      toast.warning(`Nur ${dq.score}% der wichtigen Daten gefunden – Import unvollständig.`);
    } else {
      toast.success(`Immobilie analysiert (${dq.score}% Datenqualität).`);
    }
  };

  const runLink = async () => {
    setResult(null);
    setAutoSwitchNotice(false);
    if (!url) { toast.error("Bitte einen Link einfügen."); return; }
    if (!isValidUrl(url)) { toast.error("Bitte eine gültige URL (mit https://) einfügen."); return; }
    const dup = checkDuplicate(url);
    if (dup) {
      toast.warning("Diese Immobilie existiert bereits.", {
        action: { label: "Bestehende öffnen", onClick: () => navigate({ to: "/properties/$id", params: { id: dup.id } }) },
      });
      return;
    }
    if (!propertyLimit.guard()) return;
    setLoading(true);
    try {
      const res = await extract({ data: { url, text: "" } });
      if (!res.ok) {
        setTextUrl(url); setActiveTab("text"); setAutoSwitchNotice(true);
        return;
      }
      applyExtracted(res.data, url);
    } catch (e) {
      console.error("Link-Import:", e);
      // Gleicher Ausweg wie bei einem nicht lesbaren Inserat: Text einfügen.
      setTextUrl(url); setActiveTab("text"); setAutoSwitchNotice(true);
      toast.error("Das Inserat konnte gerade nicht geladen werden. Kopier den Text des Inserats hier hinein – das klappt fast immer.");
    } finally { setLoading(false); }
  };

  const runText = async () => {
    setResult(null);
    if (!text.trim()) { toast.error("Bitte Inseratstext einfügen."); return; }
    if (text.includes("\t")) {
      const { rows, hasHeader } = parseTSV(text);
      if (hasHeader && rows.length > 0) {
        if (!propertyLimit.guard()) return;
        let created = 0;
        let skippedByLimit = 0;
        for (const row of rows) {
          const partial = rowToProperty(row, project.id);
          if (partial.link) {
            const dup = checkDuplicate(partial.link as string);
            if (dup) continue;
          }
          if (created >= propertyLimit.remaining) { skippedByLimit++; continue; }
          const p = makeEmptyProperty({ ...partial, projectId: project.id, extractionStatus: "manuell" });
          addProperty(p);
          created++;
          if (rows.length === 1) {
            const dq = calcDataQuality(p);
            setResult({ property: p, quality: dq, partial: dq.score < 60 });
          }
        }
        toast.success(rows.length === 1 ? "Immobilie aus Excel importiert" : `${created} Immobilien aus Excel importiert`);
        if (skippedByLimit > 0) {
          toast.warning(`${skippedByLimit} weitere Zeile${skippedByLimit === 1 ? "" : "n"} nicht importiert: Plan-Limit erreicht.`);
        }
        setText("");
        return;
      }
    }
    if (textUrl) {
      const dup = checkDuplicate(textUrl);
      if (dup) {
        toast.warning("Diese Immobilie existiert bereits.", {
          action: { label: "Bestehende öffnen", onClick: () => navigate({ to: "/properties/$id", params: { id: dup.id } }) },
        });
        return;
      }
    }
    if (!propertyLimit.guard()) return;
    setLoading(true);
    try {
      const res = await extract({ data: { url: textUrl, text } });
      if (!res.ok) {
        toast.error("Aus dem Text ließen sich keine Daten auslesen. Prüf, ob Preis und Fläche enthalten sind, oder leg das Objekt manuell an.", {
          action: { label: "Manuell anlegen", onClick: () => setActiveTab("manuell") },
        });
        return;
      }
      applyExtracted(res.data, textUrl);
    } catch (e) {
      console.error("Text-Import:", e);
      toast.error("Das Auslesen hat gerade nicht geklappt. Bitte versuch es gleich noch einmal oder leg das Objekt manuell an.", {
        action: { label: "Manuell anlegen", onClick: () => setActiveTab("manuell") },
      });
    } finally { setLoading(false); }
  };

  const createManual = () => {
    if (!propertyLimit.guard()) return;
    const title = manualTitle.trim() || "Neue Immobilie";
    const cat = propertyCategory(propertyType);
    const p = makeEmptyProperty({
      projectId: project.id,
      title,
      extractionStatus: "manuell",
      // Grundstück und Garage: keine Fix-&-Flip-Rechnung, immer halten.
      investmentStrategy: cat === "grundstueck" || cat === "garage" ? "buy_and_hold" : strategy,
      propertyType,
      objekttyp: CATEGORY_LABEL[cat],
      ...(cat === "zinshaus" ? { units: [] } : {}),
      ...(cat === "garage" ? { anzahlStellplaetze: 1 } : {}),
    });
    addProperty(p);
    navigate({ to: "/properties/$id", params: { id: p.id } });
  };

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "link", label: "Link", icon: <LinkSimple weight="duotone" size={14} /> },
    { key: "text", label: "Text einfügen", icon: <ClipboardText weight="duotone" size={14} /> },
    { key: "excel", label: "Excel-Vorlage", icon: <TableIcon weight="duotone" size={14} /> },
    { key: "manuell", label: "Manuell", icon: <PencilSimple weight="duotone" size={14} /> },
  ];

  return (
    <div>
      {propertyLimit.dialog}
      {/* Tab Pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#1C1917";
                  e.currentTarget.style.color = "#1C1917";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#EAE6DF";
                  e.currentTarget.style.color = "#78716C";
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: isActive ? "#1C1917" : "#fff",
                color: isActive ? "#fff" : "var(--ink-2)",
                border: `1.5px solid ${isActive ? "#1C1917" : "#EAE6DF"}`,
                borderRadius: 8, padding: "8px 14px",
                fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {t.icon}{t.label}
            </button>
          );
        })}
      </div>

      {/* Card */}
      <div style={{ background: "white", border: "1px solid #EAE6DF", borderRadius: 12, padding: "20px 24px" }}>
        {activeTab === "link" && (
          <div>
            {autoSwitchNotice && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#92400E" }}>
                Dieser Link konnte nicht automatisch ausgelesen werden — das passiert bei ImmoScout24 und Immowelt. Öffne das Inserat, drücke <strong>Strg+A → Strg+C</strong> und füge den Text in "Text einfügen" ein.
              </div>
            )}
            <label className="block text-[13px] font-medium text-[#1C1917] mb-2">Link zum Inserat</label>
            <div className="flex gap-2">
              <input
                type="url" value={url} placeholder="https://www.willhaben.at/..."
                onChange={(e) => { setUrl(e.target.value); setAutoSwitchNotice(false); setResult(null); }}
                onKeyDown={(e) => e.key === "Enter" && runLink()}
                style={{ flex: 1, border: "1.5px solid #EAE6DF", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none" }}
              />
              <button onClick={runLink} disabled={loading}
                style={{ background: "#2D6A4F", color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Lädt…" : "Analysieren"}
              </button>
            </div>
            <p className="text-[12px] text-ink-3 mt-2">Funktioniert bei willhaben, kleinanzeigen, ohne-makler und vielen weiteren Portalen.</p>
            {(platform || country) && (
              <div className="mt-2 flex gap-1">
                {platform && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F3EE] border border-[#EAE6DF] text-ink-2">{platform}</span>}
                {country && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F3EE] border border-[#EAE6DF] text-ink-2">{country}</span>}
              </div>
            )}
            {loading && <div className="mt-3 text-center text-[12px] text-ink-3">{loadingTexts[loadingPhase]}</div>}
          </div>
        )}

        {activeTab === "text" && (
          <div>
            <label className="block text-[13px] font-medium text-[#1C1917] mb-2">Seiteninhalt einfügen</label>
            <textarea
              value={text}
              placeholder={"Gesamten Seiteninhalt hier einfügen — inklusive Werbung und Navigation.\n\nTipp: Strg+A → Strg+C auf der Inseratsseite, dann hier einfügen.\n\nFunktioniert auch mit kopierten Excel-Zeilen aus dem kaufma Template."}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith("http") && !val.includes("\n") && !val.includes("\t")) {
                  setUrl(val.trim()); setActiveTab("link"); return;
                }
                setText(val);
              }}
              style={{ width: "100%", minHeight: 200, border: "1.5px solid #EAE6DF", borderRadius: 8, padding: "9px 12px", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit" }}
            />
            <div className="mt-3">
              <label className="block text-[12px] text-ink-3 mb-1">Link zur Immobilie (optional)</label>
              <input type="url" value={textUrl} placeholder="https://..." onChange={(e) => setTextUrl(e.target.value)}
                style={{ width: "100%", border: "1.5px solid #EAE6DF", borderRadius: 8, padding: "7px 12px", fontSize: 12, outline: "none" }} />
            </div>
            <button onClick={runText} disabled={loading}
              style={{ marginTop: 12, background: "#2D6A4F", color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Analysiert…" : "Text analysieren"}
            </button>
            {loading && <div className="mt-3 text-center text-[12px] text-ink-3">{loadingTexts[loadingPhase]}</div>}
          </div>
        )}

        {activeTab === "excel" && (
          <div>
            <p className="text-[13px] text-[#1C1917] font-medium mb-3">Excel-Vorlage verwenden</p>
            <div style={{ background: "#F5F3EE", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div className="text-[13px] text-[#1C1917] font-medium mb-2">So geht's:</div>
              <ol style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8, paddingLeft: 16 }}>
                <li>Vorlage herunterladen</li>
                <li>Daten eintragen (Pflichtfelder sind grün markiert)</li>
                <li>Ausgefüllte Zeilen markieren (ohne Header-Zeile) → Strg+C</li>
                <li>In "Text einfügen" einfügen → automatisch erkannt</li>
              </ol>
            </div>
            <button
              onClick={downloadTemplate}
              style={{display:"inline-flex",alignItems:"center",gap:8,background:"white",border:"1.5px solid #EAE6DF",borderRadius:8,padding:"9px 16px",fontSize:13,fontWeight:500,color:"#1C1917",cursor:"pointer"}}
            >
              <DownloadSimple weight="duotone" size={16} /> Vorlage herunterladen
            </button>
            <p className="text-[12px] text-ink-3 mt-3">Die Vorlage enthält alle importierbaren Felder mit Beispielwerten und Hinweisen.</p>
          </div>
        )}

        {activeTab === "manuell" && (
          <div>
            <p className="text-[13px] text-ink-2 mb-4">Immobilie ohne Link manuell erfassen. Alle weiteren Felder kannst du direkt in der Immobilie ausfüllen.</p>

            <div className="mb-4">
              <div className="text-[13px] font-medium text-[#1C1917] mb-2">Objektart</div>
              <PropertyTypePicker value={propertyType} onChange={setPropertyType} />
              {propertyCategory(propertyType) === "zinshaus" && (
                <p className="mt-2 text-[12px] text-ink-2">Die Einheiten (Tops, Geschäftslokale) legst du danach im Tab „Einheiten“ an.</p>
              )}

              {propertyCategory(propertyType) !== "grundstueck" && propertyCategory(propertyType) !== "garage" && (
                <>
                  <div className="mt-5 text-[13px] font-medium text-[#1C1917] mb-2">Investmentstrategie</div>
                  <div role="radiogroup" aria-label="Investmentstrategie" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      { key: "buy_and_hold" as const, label: "Buy & Hold", sub: "Kaufen & vermieten" },
                      { key: "fix_and_flip" as const, label: "Fix & Flip", sub: "Kaufen, sanieren, verkaufen" },
                    ]).map((st) => {
                      const active = strategy === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setStrategy(st.key)}
                          className="flex items-center gap-3 rounded-[12px] border-[1.5px] px-4 py-3 text-left transition-colors"
                          style={{ borderColor: active ? "#2D6A4F" : "#EAE6DF", background: active ? "#E8F5EE" : "white" }}
                        >
                          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                            style={{ background: active ? "#2D6A4F" : "#F5F3EE" }}>
                            {st.key === "buy_and_hold"
                              ? <Home className="size-4" style={{ color: active ? "white" : "var(--ink-2)" }} aria-hidden />
                              : <Hammer className="size-4" style={{ color: active ? "white" : "var(--ink-2)" }} aria-hidden />}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold" style={{ color: active ? "#2D6A4F" : "#1C1917" }}>{st.label}</div>
                            <div className="text-[12px] text-ink-3">{st.sub}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <label className="block text-[13px] font-medium text-[#1C1917] mb-2">Titel *</label>
            <input type="text" value={manualTitle} placeholder="z.B. Schöne 2-Zimmer Wohnung Wien 1020"
              onChange={(e) => setManualTitle(e.target.value)}
              style={{ width: "100%", border: "1.5px solid #EAE6DF", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none" }} />
            <button onClick={createManual}
              style={{ marginTop: 12, background: "#2D6A4F", color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Leere Immobilie erstellen
            </button>
          </div>
        )}

        {result && (
          <div className={`mt-5 rounded-[12px] border p-4 text-[13px] ${result.partial ? "border-[#F59E0B]/40 bg-[#FEF3C7]" : "border-primary/30 bg-[#ECFDF5]"}`}>
            <div className="flex items-start gap-2">
              {result.partial ? <AlertTriangle className="size-5 mt-0.5 shrink-0 text-[#92400E]" /> : <CheckCircle2 className="size-5 mt-0.5 shrink-0 text-primary" />}
              <div className="flex-1">
                <div className="font-semibold text-[#1C1917]">
                  {result.partial ? "Import unvollständig" : "Import erfolgreich"}
                </div>
                <div className="mt-1 text-ink-2">Datenqualität: <strong className="text-[#1C1917]">{result.quality.score}%</strong> ({result.quality.filled}/{result.quality.total} Pflichtfelder)</div>
                {result.quality.missing.length > 0 && (
                  <div className="mt-1 text-[12px] text-ink-2">Fehlend: {result.quality.missing.join(", ")}</div>
                )}
                <div className="mt-3">
                  <button onClick={() => navigate({ to: "/properties/$id", params: { id: result.property.id } })}
                    className="rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-white"
                    style={{ background: "#2D6A4F" }}>
                    Zur Immobilie
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
