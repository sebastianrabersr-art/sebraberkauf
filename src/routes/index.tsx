import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PricingTable } from "@/components/marketing/PricingTable";
import { FaqList } from "@/components/marketing/FaqList";
import { detectPlatform } from "@/lib/extract.functions";
import { analyzePropertyUrl, type AnalyzeResult } from "@/lib/analyze.functions";
import { isValidUrl } from "@/lib/calc";
import {
  ArrowRight,
  Calculator,
  FileText,
  Link2,
  Loader2,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Wallet,
  AlertTriangle,
  GitCompareArrows,
  Upload,
} from "lucide-react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kauf ma – Immobilien-Investments in Sekunden bewerten" },
      { name: "description", content: "Importiere Inserate oder PDFs, berechne Rendite, Cashflow und Mietrecht-Risiko. Für private Käufer, Anleger und Familien." },
      { property: "og:title", content: "kauf ma – Immobilien-Investments in Sekunden bewerten" },
      { property: "og:description", content: "Bewerte Wohnungen blitzschnell: Rendite, Cashflow, Maklerkosten und Mietrecht-Risiko." },
    ],
  }),
  component: Landing,
});

function Feature({ icon: Icon, title, children }: any) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3">
        <Icon className="size-5" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5">{children}</p>
    </div>
  );
}

const DEMO_PREVIEW: AnalyzeResult = {
  success: true,
  source_url: "",
  platform: "Demo",
  title: "Demo: 2-Zimmer-Altbau, 1070 Wien",
  purchase_price: 285000,
  living_area_m2: 54,
  property_type: "Wohnung",
  rooms: 2,
  address: "",
  city: "Wien",
  district: "1070",
  region: "Wien",
  country: "Österreich",
  price_per_m2: Math.round(285000 / 54),
  monthly_operating_costs: null,
  year_built: null,
  condition: "",
  description: "Demo-Datensatz – nur zur Veranschaulichung.",
  images: [],
  missing_fields: ["Betriebskosten", "Baujahr"],
  data_quality_score: 55,
};

function fmtEUR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function estimateNebenkostenPct(country: string): number {
  if (country === "Deutschland") return 0.12;
  return 0.10;
}

function PreviewCard({ data, isDemo }: { data: AnalyzeResult; isDemo: boolean }) {
  const price = data.purchase_price;
  const area = data.living_area_m2;
  const pricePerM2 = data.price_per_m2 ?? (price && area ? Math.round(price / area) : null);
  const nebenPct = estimateNebenkostenPct(data.country);
  const neben = price ? Math.round(price * nebenPct) : null;
  const total = price && neben ? price + neben : null;
  const quality = data.data_quality_score;
  const qualityClass = quality >= 70 ? "text-success bg-success/10" : quality >= 40 ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10";
  const location = [data.district, data.city].filter(Boolean).join(" · ") || data.region || "—";

  const handleCtaClick = () => {
    if (data.source_url) {
      try {
        localStorage.setItem("pending_analyze_url", data.source_url);
        localStorage.setItem("pending_analyze_preview", JSON.stringify(data));
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="mt-5 rounded-2xl border bg-card p-5 text-left shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{isDemo ? "Demo-Vorschau" : "Erste Analyse"}</div>
          <div className="font-semibold truncate">{data.title || "Immobilie"}</div>
        </div>
        {data.platform && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-muted shrink-0">{data.platform}</span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Kaufpreis" value={fmtEUR(price)} />
        <Stat label="Wohnfläche" value={area ? `${area} m²` : "—"} />
        <Stat label="Preis / m²" value={pricePerM2 ? fmtEUR(pricePerM2) : "—"} />
        <Stat label="Stadt / Bezirk" value={location} />
        <Stat label={`Nebenkosten (≈${Math.round(nebenPct * 100)} %)`} value={fmtEUR(neben)} />
        <Stat label="Gesamtkapital" value={fmtEUR(total)} highlight />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
        <div className="text-xs text-muted-foreground">Datenqualität</div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${qualityClass}`}>{quality}%</span>
      </div>

      {data.missing_fields && data.missing_fields.length > 0 && (
        <div className="mt-3 rounded-lg border border-warning/40 bg-warning/5 p-3 flex items-start gap-2 text-xs">
          <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-foreground">Fehlende Daten</div>
            <div className="text-muted-foreground mt-0.5">{data.missing_fields.slice(0, 6).join(", ")}</div>
          </div>
        </div>
      )}

      <a
        href="/signup"
        onClick={handleCtaClick}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
      >
        Account erstellen und vollständige Analyse sehen
        <ArrowRight className="size-4" />
      </a>
      <p className="mt-2 text-[11px] text-muted-foreground text-center">
        Inkl. Finanzierungs-Szenarien, Mietrecht-Risiko, Vergleich & CRM. Keine Kreditkarte.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-primary/10" : "bg-muted/40"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold mt-0.5 ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function LinkAnalyzer() {
  const analyze = useServerFn(analyzePropertyUrl);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AnalyzeResult | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const platform = detectPlatform(url);

  const persistPending = (u: string) => {
    try { localStorage.setItem("pending_analyze_url", u); } catch { /* ignore */ }
  };

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setPreview(null);
    setFailedUrl(null);
    const trimmed = url.trim();
    if (!trimmed) { setError("Bitte einen Immobilienlink einfügen."); return; }
    if (!isValidUrl(trimmed)) { setError("Bitte eine gültige URL mit https:// einfügen."); return; }
    setLoading(true);
    track("landing_link_submitted", { platform: platform || "unknown" });
    try {
      const res = await analyze({ data: { url: trimmed, source: "landingpage" } });
      if (!res.success) {
        persistPending(trimmed);
        setFailedUrl(trimmed);
        setError(res.error || "Analyse aktuell nicht möglich.");
        track("landing_preview_failed", { platform: platform || "unknown", error_code: res.error?.slice(0, 40) || "unknown" });
        return;
      }
      persistPending(trimmed);
      try { localStorage.setItem("pending_analyze_preview", JSON.stringify(res)); } catch { /* ignore */ }
      setPreview(res);
      setIsDemo(false);
      track("landing_preview_shown", { platform: platform || "unknown", ok: true });
    } catch (err) {
      persistPending(trimmed);
      setFailedUrl(trimmed);
      setError(err instanceof Error ? err.message : "Analyse aktuell nicht möglich.");
      track("landing_preview_failed", { platform: platform || "unknown", error_code: "exception" });
    } finally {
      setLoading(false);
    }
  };

  const showDemo = () => {
    setPreview(DEMO_PREVIEW);
    setIsDemo(true);
    setError(null);
    setFailedUrl(null);
  };

  return (
    <div>
      <form onSubmit={run} className="flex flex-col sm:flex-row gap-2 rounded-2xl border bg-card p-2 shadow-lg shadow-primary/5">
        <div className="flex-1 flex items-center gap-2 px-3">
          <Link2 className="size-4 text-muted-foreground shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Immobilienlink einfügen"
            className="flex-1 outline-none bg-transparent text-sm py-3 min-w-0"
            aria-label="Immobilienlink"
          />
          {platform && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted hidden sm:inline">{platform}</span>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {loading ? "Immobilie wird analysiert…" : "Kostenlos analysieren"}
        </button>
      </form>

      {error && (
        <div className="mt-3 text-xs text-left bg-warning/5 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="size-3.5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-2">
            <div className="text-foreground">{error}</div>
            {failedUrl && (
              <div className="flex flex-wrap gap-2 pt-1">
                <a href="/signup" className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-1.5 font-medium hover:bg-primary/90">
                  <ArrowRight className="size-3" /> Trotzdem in App öffnen
                </a>
                <a href="/signup" className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1.5 font-medium hover:bg-muted">
                  <FileText className="size-3" /> Inseratstext einfügen
                </a>
                <a href="/signup" className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1.5 font-medium hover:bg-muted">
                  <Upload className="size-3" /> PDF hochladen
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {!preview && !loading && (
        <button
          type="button"
          onClick={showDemo}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Kein Link zur Hand? Demo ansehen
        </button>
      )}

      {preview && <PreviewCard data={preview} isDemo={isDemo} />}
    </div>
  );
}





function Landing() {
  return (
    <MarketingShell>
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-20 md:pt-20 md:pb-28">
          <div className="max-w-3xl mx-auto text-center">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs text-muted-foreground mb-6 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              Für private Käufer und Anleger in Österreich & Deutschland
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.1]">
              Immobilie gefunden?{" "}
              <span className="text-primary">Link einfügen</span>{" "}
              und sofort prüfen.
            </h1>

            {/* Subheadline */}
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Erhalte erste Kennzahlen zu Kaufpreis, Nebenkosten, Finanzierung, Miete und Cashflow –{" "}
              <strong className="text-foreground">ohne Excel</strong> und ohne Vorwissen.
            </p>

            {/* Link input — central element */}
            <div className="mt-8 max-w-2xl mx-auto">
              <LinkAnalyzer />
              <p className="mt-3 text-xs text-muted-foreground">
                Funktioniert mit Immobilienlinks aus Österreich und Deutschland.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SO FUNKTIONIERT'S SECTION ===== */}
      <section className="border-t bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          {/* Header */}
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Immobilienanalyse in 3 einfachen Schritten
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Kein Excel, keine komplizierten Formeln. Du fügst eine Immobilie hinzu und bekommst eine strukturierte Bewertung.
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line — desktop only */}
            <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="relative inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mb-5 shadow-sm">
                <Link2 className="size-6" />
                <span className="absolute -top-2 -right-2 size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center shadow-sm">1</span>
              </div>
              <h3 className="font-semibold text-base">Link einfügen oder PDF hochladen</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                Füge einfach den Link eines Immobilieninserats ein, lade ein Exposé hoch oder trage die Daten manuell ein.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="relative inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mb-5 shadow-sm">
                <Calculator className="size-6" />
                <span className="absolute -top-2 -right-2 size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center shadow-sm">2</span>
              </div>
              <h3 className="font-semibold text-base">Kosten, Finanzierung und Cashflow verstehen</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                Die App berechnet Kaufnebenkosten, Maklerkosten, Kreditrate, Break-even-Miete, Rendite, Cashflow und wichtige Risiken.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="relative inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mb-5 shadow-sm">
                <GitCompareArrows className="size-6" />
                <span className="absolute -top-2 -right-2 size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center shadow-sm">3</span>
              </div>
              <h3 className="font-semibold text-base">Vergleichen und entscheiden</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                Vergleiche mehrere Immobilien nebeneinander und erkenne, welches Objekt wirklich interessant ist – und welches du lieber aussortierst.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-14 text-center">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3.5 font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              Kostenlos starten <ArrowRight className="size-4" />
            </a>
            <p className="mt-3 text-xs text-muted-foreground">Keine Kreditkarte. 1 Immobilie gratis. Jederzeit upgraden.</p>
          </div>
        </div>
      </section>

      {/* ===== REST UNCHANGED ===== */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t">
        <h2 className="text-3xl font-semibold text-center">Alles in einem Tool</h2>
        <p className="text-muted-foreground text-center mt-2">Von der ersten Inserat-Idee bis zum Notartermin.</p>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          <Feature icon={Link2} title="Link- & PDF-Import">Inserate von willhaben oder ImmoScout per URL erfassen, Exposés als PDF hochladen.</Feature>
          <Feature icon={TrendingUp} title="Rendite & Cashflow">Brutto-/Nettorendite, monatlicher Cashflow, Mindestmiete – inkl. aller Kaufnebenkosten.</Feature>
          <Feature icon={Wallet} title="Maklerkosten transparent">Provision in %, netto, brutto, USt – auch rückwärts gerechnet. Verkäuferart Privat/Makler/Bauträger.</Feature>
          <Feature icon={ShieldCheck} title="Mietrecht-Risiko">MRG-Vollanwendung erkennen, Richtwertzonen, Befristungsabschlag – als Ampel.</Feature>
          <Feature icon={Calculator} title="Bank-Szenarien">Mehrere Finanzierungen vergleichen, Zahlungsplan als Grafik, Sondertilgungen.</Feature>
          <Feature icon={FileText} title="CRM & Follow-ups">Pipeline, Besichtigungen, Aufgaben, Notizen – pro Immobilie und Projekt.</Feature>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 border-t">
        <h2 className="text-3xl font-semibold text-center">Einfache Preise</h2>
        <p className="text-muted-foreground text-center mt-2">Starte gratis, upgrade wenn du mehr brauchst.</p>
        <div className="mt-10"><PricingTable /></div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 border-t">
        <h2 className="text-3xl font-semibold text-center">Häufige Fragen</h2>
        <div className="mt-8"><FaqList /></div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center border-t">
        <h2 className="text-3xl font-semibold">Bereit, die erste Immobilie zu bewerten?</h2>
        <p className="text-muted-foreground mt-2">Kostenlos starten – Upgrade nur, wenn du es wirklich brauchst.</p>
        <a href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3 font-medium">
          Kostenlos starten <ArrowRight className="size-4" />
        </a>
      </section>
    </MarketingShell>
  );
}
