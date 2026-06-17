import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { detectCountry, detectPlatform, extractProperty } from "@/lib/extract.functions";
import { makeEmptyProperty, useActiveProject, useStore } from "@/lib/store";
import type { Mietrecht, Property, FinanceScenario } from "@/lib/types";
import { calcDataQuality, isValidUrl } from "@/lib/calc";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Download, Link as LinkIcon, FileSpreadsheet, FileText, Pencil } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  head: () => ({ meta: [{ title: "Immobilie importieren – kaufma" }] }),
  component: AnalyzePage,
});

type TabKey = "link" | "text" | "excel" | "manuell";

const FONT = { fontFamily: "Inter, sans-serif" } as const;

const inputClass =
  "w-full bg-white border-[1.5px] border-[#EAE6DF] rounded-[8px] px-3 py-[9px] text-[13px] outline-none focus:border-[#2D6A4F] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const EXCEL_MAP: Record<string, string> = {
  "Titel": "title",
  "Kaufpreis €": "kaufpreis",
  "Kaufpreis": "kaufpreis",
  "Wohnfläche m²": "wohnflaecheM2",
  "Wohnfläche": "wohnflaecheM2",
  "Zimmer": "zimmer",
  "Bezirk / PLZ": "bezirk",
  "Bezirk": "bezirk",
  "Stadt": "city",
  "Bundesland": "bundesland",
  "Land": "land",
  "Baujahr": "baujahr",
  "Zustand": "zustand",
  "Energieklasse": "energyClass",
  "Objektart": "objekttyp",
  "Adresse": "adresse",
  "Nettomiete mtl. €": "nettomieteMtl",
  "Nettomiete mtl.": "nettomieteMtl",
  "Betriebskosten mtl. €": "betriebskostenMtl",
  "Betriebskosten mtl.": "betriebskostenMtl",
  "Heizkosten mtl. €": "heizkostenMtl",
  "Heizkosten mtl.": "heizkostenMtl",
  "Rücklagenfonds mtl. €": "ruecklageMtl",
  "Rücklagenfonds mtl.": "ruecklageMtl",
  "Beschreibung": "beschreibung",
  "Link zum Inserat": "link",
};

const FINANCE_KEYS = new Set(["Eigenkapital €", "Eigenkapital", "Zinssatz %", "Zinssatz", "Laufzeit Jahre", "Laufzeit"]);

const NUMERIC_FIELDS = new Set([
  "kaufpreis","wohnflaecheM2","zimmer","baujahr","nettomieteMtl","betriebskostenMtl","heizkostenMtl","ruecklageMtl",
]);

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
  // Heuristic: header row if any cell matches a known key
  const hasHeader = firstCells.some((c) => EXCEL_MAP[c.trim()] || FINANCE_KEYS.has(c.trim()));
  if (!hasHeader) {
    // Treat all rows as data with no header → cannot map; bail
    return { rows: [], hasHeader: false };
  }
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
  // Finance scenario
  const ek = parseNum(row["Eigenkapital €"] ?? row["Eigenkapital"] ?? "");
  const zs = parseNum(row["Zinssatz %"] ?? row["Zinssatz"] ?? "");
  const lz = parseNum(row["Laufzeit Jahre"] ?? row["Laufzeit"] ?? "");
  if (ek != null || zs != null || lz != null) {
    const kp = (out.kaufpreis as number | null) ?? null;
    const scenario: FinanceScenario = {
      id: crypto.randomUUID(),
      name: "Importiert",
      kreditBetrag: kp != null && ek != null ? Math.max(0, kp - ek) : null,
      eigenkapital: ek,
      zinssatz: zs != null ? zs / 100 : 0.035,
      laufzeitJahre: lz ?? 25,
      intervall: "monatlich" as FinanceScenario["intervall"],
      tilgungsart: "annuitaet" as FinanceScenario["tilgungsart"],
      startDate: new Date().toISOString(),
    };
    out.financeScenarios = [scenario];
  }
  if (row["Link zum Inserat"]) out.link = row["Link zum Inserat"];
  return out as Partial<Property> & { financeScenarios?: FinanceScenario[] };
}

type ImportResult = {
  property: Property;
  quality: ReturnType<typeof calcDataQuality>;
  partial: boolean;
};

function AnalyzePage() {
  const navigate = useNavigate();
  const extract = useServerFn(extractProperty);
  const project = useActiveProject();
  const { addProperty, findByLink, properties } = useStore();

  const [tab, setTab] = useState<TabKey>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [textUrl, setTextUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
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

  const mapObjektart = (s: string): string => {
    const v = (s || "").toLowerCase();
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
      projectId: project.id,
      link: linkUrl.trim(),
      platform: d.platform || detectPlatform(linkUrl),
      land: d.country || detectCountry(linkUrl) || "",
      bundesland: d.region || "",
      title: d.title || "Ohne Titel",
      bezirk: d.district,
      adresse: adresseFull,
      city: d.city || (detectCountry(linkUrl) === "Österreich" ? "Wien" : ""),
      objekttyp: objektart,
      baujahr: d.year_built,
      mietrecht,
      zustand: d.condition,
      wohnflaecheM2: d.living_area_m2,
      grundstuecksflaecheM2: d.plot_area_m2,
      aussenflaecheM2: d.outdoor_area_m2,
      zimmer: d.rooms,
      kaufpreis: d.purchase_price,
      makler: d.seller_type === "Makler" ? "Ja" : d.seller_type === "Privat" ? "Nein" : "unklar",
      sellerType: (d.seller_type as Property["sellerType"]) || undefined,
      provisionPct: d.commission_pct,
      provisionEUR: d.commission_eur,
      stockwerk: d.floor,
      hasElevator: d.has_elevator,
      hasBalkon: d.has_balcony,
      hasTerrasse: d.has_terrace,
      hasLoggia: d.has_loggia,
      hasGarten: d.has_garden,
      hasKeller: d.has_basement,
      hasStellplatz: d.has_parking,
      betriebskostenMtl: d.monthly_operating_costs,
      heizkostenMtl: d.monthly_heating_costs,
      energyClass: d.energy_class,
      hwb: d.hwb,
      verfuegbarkeit: d.availability,
      beschreibung: d.description,
      ausstattung: d.features,
      nettomieteMtl: d.estimated_rent_monthly,
      nettomieteGeschaetzt: d.rent_is_estimate,
      missingData: d.missing_data,
    });
    const dq = calcDataQuality(draft);
    const status: Property["extractionStatus"] = dq.score >= 60 ? "ok" : "partial";
    const p = makeEmptyProperty({ ...draft, extractionStatus: status });
    addProperty(p);
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
    setLoading(true);
    try {
      const res = await extract({ data: { url, text: "" } });
      if (!res.ok) {
        // Auto-switch to text tab
        setTextUrl(url);
        setTab("text");
        setAutoSwitchNotice(true);
        return;
      }
      applyExtracted(res.data, url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  const runText = async () => {
    setResult(null);
    if (!text.trim()) { toast.error("Bitte Inseratstext einfügen."); return; }
    // Excel TSV detection
    if (text.includes("\t")) {
      const { rows, hasHeader } = parseTSV(text);
      if (hasHeader && rows.length > 0) {
        let created = 0;
        for (const row of rows) {
          const partial = rowToProperty(row, project.id);
          if (partial.link) {
            const dup = checkDuplicate(partial.link as string);
            if (dup) continue;
          }
          const p = makeEmptyProperty({ ...partial, projectId: project.id, extractionStatus: "manuell" });
          addProperty(p);
          created++;
          if (rows.length === 1) {
            const dq = calcDataQuality(p);
            setResult({ property: p, quality: dq, partial: dq.score < 60 });
          }
        }
        toast.success(rows.length === 1 ? "Immobilie aus Excel importiert" : `${created} Immobilien aus Excel importiert`);
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
    setLoading(true);
    try {
      const res = await extract({ data: { url: textUrl, text } });
      if (!res.ok) { toast.error(res.error || "Extraktion fehlgeschlagen."); return; }
      applyExtracted(res.data, textUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  const createManual = () => {
    const title = manualTitle.trim() || "Neue Immobilie";
    const p = makeEmptyProperty({ projectId: project.id, title, extractionStatus: "manuell" });
    addProperty(p);
    navigate({ to: "/properties/$id", params: { id: p.id } });
  };

  // Smart paste on textarea
  const onTextPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    const trimmed = pasted.trim();
    if (/^https?:\/\/\S+$/.test(trimmed) && !trimmed.includes("\n")) {
      e.preventDefault();
      setUrl(trimmed);
      setTab("link");
      toast.info("Link erkannt – zu Tab 'Link' gewechselt.");
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof LinkIcon }[] = [
    { key: "link", label: "Link", icon: LinkIcon },
    { key: "text", label: "Text / Seite kopieren", icon: FileText },
    { key: "excel", label: "Excel-Vorlage", icon: FileSpreadsheet },
    { key: "manuell", label: "Manuell", icon: Pencil },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Immobilie importieren"
        description={`Aktives Projekt: ${project.name}`}
      />

      <div
        className="rounded-[12px] border border-[#EAE6DF] bg-white px-6 py-5"
        style={FONT}
      >
        {/* Pill tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setAutoSwitchNotice(false); }}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
                style={{
                  background: active ? "#1C1917" : "#F5F3EE",
                  color: active ? "#ffffff" : "#78716C",
                  border: active ? "1px solid #1C1917" : "1px solid #EAE6DF",
                }}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB: LINK */}
        {tab === "link" && (
          <div>
            <label className="block text-[13px] font-medium mb-2 text-[#1C1917]">Immobilien-Link</label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className={inputClass + " flex-1"}
              />
              <button
                onClick={runLink}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] px-5 py-[9px] text-[13px] font-medium text-white disabled:opacity-60"
                style={{ background: "#2D6A4F" }}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Analysieren
              </button>
            </div>
            <p className="text-[12px] text-[#78716C] mt-2">
              Funktioniert bei willhaben, kleinanzeigen, ohne-makler und vielen weiteren.
            </p>
            {(platform || country) && (
              <div className="mt-2 flex gap-1">
                {platform && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F3EE] border border-[#EAE6DF] text-[#78716C]">{platform}</span>}
                {country && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F3EE] border border-[#EAE6DF] text-[#78716C]">{country}</span>}
              </div>
            )}
            {loading && (
              <div className="mt-3 text-center text-[12px] text-[#A8A29E]">{loadingTexts[loadingPhase]}</div>
            )}
          </div>
        )}

        {/* TAB: TEXT */}
        {tab === "text" && (
          <div>
            {autoSwitchNotice && (
              <div className="mb-4 rounded-[10px] border border-[#F59E0B]/40 bg-[#FEF3C7] p-3 text-[13px] text-[#92400E] flex items-start gap-2">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                <div>
                  Dieser Link konnte nicht automatisch ausgelesen werden — das passiert bei ImmoScout24 und Immowelt. Öffne das Inserat, drücke Strg+A → Strg+C und füge den Text unten ein.
                </div>
              </div>
            )}
            <label className="block text-[13px] font-medium mb-2 text-[#1C1917]">Inseratstext</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={onTextPaste}
              placeholder={"Gesamten Seiteninhalt hier einfügen — inklusive Werbung und Navigation.\n\nTipp: Strg+A → Strg+C auf der Inseratsseite, dann hier einfügen.\n\nFunktioniert auch mit kopierten Excel-Zeilen aus dem kaufma Template."}
              className={inputClass + " font-mono"}
              style={{ minHeight: 200, resize: "vertical" }}
            />
            <label className="block text-[13px] font-medium mt-3 mb-2 text-[#1C1917]">Link zur Immobilie (optional)</label>
            <input
              type="url"
              value={textUrl}
              onChange={(e) => setTextUrl(e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
            <div className="mt-3">
              <button
                onClick={runText}
                disabled={loading || !text.trim()}
                className="inline-flex items-center gap-2 rounded-[8px] px-5 py-[9px] text-[13px] font-medium text-white disabled:opacity-60"
                style={{ background: "#2D6A4F" }}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Text analysieren
              </button>
            </div>
            {loading && (
              <div className="mt-3 text-center text-[12px] text-[#A8A29E]">{loadingTexts[loadingPhase]}</div>
            )}
          </div>
        )}

        {/* TAB: EXCEL */}
        {tab === "excel" && (
          <div>
            <div className="text-[13px] font-semibold text-[#1C1917]">Excel-Vorlage verwenden</div>
            <p className="text-[13px] text-[#78716C] mt-1">
              Lade die Vorlage herunter, fülle sie aus und kopiere die Zeilen direkt in Tab 2.
            </p>
            <ol className="mt-3 space-y-1 text-[13px] text-[#78716C] list-decimal pl-5">
              <li>Vorlage herunterladen</li>
              <li>Daten eintragen</li>
              <li>Zeilen markieren (inklusive Header) → Strg+C</li>
              <li>In Tab "Text / Seite kopieren" einfügen</li>
            </ol>
            <a
              href="/kaufma_import_vorlage.xlsx"
              download
              className="mt-4 inline-flex items-center gap-2 rounded-[8px] border border-[#EAE6DF] bg-white px-4 py-[9px] text-[13px] font-medium text-[#1C1917] hover:bg-[#F5F3EE]"
            >
              <Download className="size-4" />
              Vorlage herunterladen
            </a>
            <p className="text-[12px] text-[#78716C] mt-3">
              Pflichtfelder sind grün markiert. Alle anderen Felder sind optional.
            </p>
          </div>
        )}

        {/* TAB: MANUELL */}
        {tab === "manuell" && (
          <div>
            <p className="text-[13px] text-[#78716C] mb-3">Immobilie ohne Link manuell erfassen.</p>
            <label className="block text-[13px] font-medium mb-2 text-[#1C1917]">Titel</label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="z. B. Altbauwohnung 1070"
              className={inputClass}
            />
            <div className="mt-3">
              <button
                onClick={createManual}
                className="inline-flex items-center gap-2 rounded-[8px] px-5 py-[9px] text-[13px] font-medium text-white"
                style={{ background: "#2D6A4F" }}
              >
                Leere Immobilie erstellen
              </button>
            </div>
            <p className="text-[12px] text-[#78716C] mt-3">
              Alle weiteren Felder kannst du direkt in der Immobilie ausfüllen.
            </p>
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className={`mt-5 rounded-[10px] border p-4 text-[13px] ${result.partial ? "border-[#F59E0B]/40 bg-[#FEF3C7]" : "border-[#2D6A4F]/30 bg-[#ECFDF5]"}`}>
            <div className="flex items-start gap-2">
              {result.partial ? <AlertTriangle className="size-5 mt-0.5 shrink-0 text-[#92400E]" /> : <CheckCircle2 className="size-5 mt-0.5 shrink-0 text-[#2D6A4F]" />}
              <div className="flex-1">
                <div className="font-semibold text-[#1C1917]">
                  {result.partial ? "Import unvollständig" : "Import erfolgreich"}
                </div>
                <div className="mt-1 text-[#78716C]">Datenqualität: <strong className="text-[#1C1917]">{result.quality.score}%</strong> ({result.quality.filled}/{result.quality.total} Pflichtfelder)</div>
                {result.quality.missing.length > 0 && (
                  <div className="mt-1 text-[12px] text-[#78716C]">Fehlend: {result.quality.missing.join(", ")}</div>
                )}
                <div className="mt-3">
                  <button
                    onClick={() => navigate({ to: "/properties/$id", params: { id: result.property.id } })}
                    className="rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-white"
                    style={{ background: "#2D6A4F" }}
                  >
                    Zur Immobilie
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
