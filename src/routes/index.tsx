import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PricingTable } from "@/components/marketing/PricingTable";
import { FaqList } from "@/components/marketing/FaqList";
import { detectPlatform } from "@/lib/extract.functions";
import { analyzePropertyUrl, type AnalyzeResult } from "@/lib/analyze.functions";
import { fmtPct, isValidUrl, pmt } from "@/lib/calc";
import { cashflowVerdict, TONE_TEXT } from "@/lib/verdicts";
import { track } from "@/lib/analytics";
import { ArrowRight, Coins, FileText, House, LinkSimple, CircleNotch, TrendUp, Warning, UploadSimple } from "@phosphor-icons/react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kaufma – Wohnungen als Kapitalanlage durchrechnen" },
      { name: "description", content: "Link zum Inserat einfügen und sehen, ob sich die Wohnung rechnet: Kaufnebenkosten, Kreditrate, Cashflow, Rendite und Mietrecht-Risiko – für Österreich und Deutschland." },
      { property: "og:title", content: "kaufma – Wohnungen als Kapitalanlage durchrechnen" },
      { property: "og:description", content: "Kaufnebenkosten, Kreditrate, Cashflow, Rendite und Mietrecht-Risiko – ausgerechnet, bevor du zur Besichtigung fährst." },
    ],
  }),
  component: Landing,
});

function fmtEUR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function estimateNebenkostenPct(country: string): number {
  if (country === "Deutschland") return 0.12;
  return 0.10;
}

/* ───────── Beispielrechnung im Hero ───────── */

/**
 * Ausgedachtes, aber realistisches Beispiel – live mit derselben Logik gerechnet wie die Rechner.
 * Zeigt bewusst eine Wohnung, die sich nicht von selbst trägt: genau dort spart kaufma Geld.
 */
const EXAMPLE = {
  title: "2 Zimmer, Altbau, Wien-Favoriten",
  kaufpreis: 289_000,
  flaeche: 58,
  miete: 920, // Nettomiete kalt / Monat
  nkPct: 0.1,
  eigenkapital: 80_000,
  zins: 0.038,
  jahre: 30,
  nichtUmlagefaehig: 60,
  ruecklageProM2: 1,
};

function ExampleAnalysis() {
  const e = EXAMPLE;
  const nk = e.kaufpreis * e.nkPct;
  const kredit = Math.max(0, e.kaufpreis + nk - e.eigenkapital);
  const rate = pmt(e.zins / 12, e.jahre * 12, kredit);
  const ruecklage = e.ruecklageProM2 * e.flaeche;
  const cashflow = e.miete - rate - e.nichtUmlagefaehig - ruecklage;
  const brutto = (e.miete * 12) / e.kaufpreis;
  const faktor = e.kaufpreis / (e.miete * 12);
  const verdict = cashflowVerdict(cashflow);

  const rows: [string, string][] = [
    ["Kaufpreis", fmtEUR(e.kaufpreis)],
    [`Nebenkosten (≈ ${Math.round(e.nkPct * 100)} %)`, fmtEUR(nk)],
    ["Kreditrate / Monat", fmtEUR(rate)],
    ["Bruttorendite", fmtPct(brutto)],
    ["Kaufpreisfaktor", faktor.toLocaleString("de-DE", { maximumFractionDigits: 1 })],
  ];

  return (
    <figure className="rounded-[16px] border border-[#EAE6DF] bg-white p-5 sm:p-6" aria-labelledby="example-title">
      <div className="text-[12px] text-ink-3">Beispielrechnung</div>
      <div id="example-title" className="mt-1 text-[16px] font-semibold text-[#1C1917]">{e.title}</div>
      <div className="text-[13px] text-ink-2">{e.flaeche} m² · vermietet um {fmtEUR(e.miete)} netto kalt</div>

      <div className="mt-5 border-t border-[#EAE6DF] pt-4">
        <div className="text-[12px] text-ink-3">Cashflow pro Monat</div>
        <div className={`font-display text-[40px] font-extrabold leading-none tabular-nums mt-1 ${TONE_TEXT[verdict?.tone ?? "neutral"]}`}>
          {fmtEUR(cashflow)}
        </div>
        {verdict && <p className="mt-2 text-[14px] text-[#1C1917]">{verdict.text}</p>}
      </div>

      <dl className="mt-4 divide-y divide-[#F5F3EE]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between py-2 text-[13px]">
            <dt className="text-ink-2">{k}</dt>
            <dd className="font-medium tabular-nums text-[#1C1917]">{v}</dd>
          </div>
        ))}
        <div className="flex items-start justify-between gap-4 py-2 text-[13px]">
          <dt className="text-ink-2">Mietrecht</dt>
          <dd className="text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[12px] font-medium text-[#92400E]">
              <Warning size={13} aria-hidden /> prüfen
            </span>
            <div className="mt-1 text-[12px] text-ink-2 max-w-[220px]">Altbau vor 1945: Richtwert-Mietzins wahrscheinlich – die angesetzte Miete könnte zu hoch sein.</div>
          </dd>
        </div>
      </dl>

      <figcaption className="mt-3 text-[12px] text-ink-3 leading-relaxed">
        Annahmen: {fmtEUR(e.eigenkapital)} Eigenkapital, {(e.zins * 100).toLocaleString("de-DE")} % Zins, {e.jahre} Jahre, Rücklage {e.ruecklageProM2} €/m², {fmtEUR(e.nichtUmlagefaehig)} nicht umlagefähige Kosten. Keine echte Immobilie.
      </figcaption>
    </figure>
  );
}

/* ───────── Ergebnis nach eigener Link-Analyse ───────── */

function PreviewCard({ data }: { data: AnalyzeResult }) {
  const price = data.purchase_price;
  const area = data.living_area_m2;
  const pricePerM2 = data.price_per_m2 ?? (price && area ? Math.round(price / area) : null);
  const nebenPct = estimateNebenkostenPct(data.country);
  const neben = price ? Math.round(price * nebenPct) : null;
  const total = price && neben ? price + neben : null;
  const quality = data.data_quality_score;
  const qualityClass = quality >= 70 ? "bg-[#E8F5EE] text-primary" : quality >= 40 ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#FEE2E2] text-[#991B1B]";
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
    <div className="mt-5 rounded-[16px] border border-[#EAE6DF] bg-white p-5 text-left">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-[#1C1917] truncate">{data.title || "Deine Immobilie"}</div>
          <div className="text-[13px] text-ink-2">Erste Auswertung aus dem Inserat</div>
        </div>
        {data.platform && <span className="text-[11px] px-2 py-1 rounded-full bg-[#F5F3EE] text-ink-2 shrink-0">{data.platform}</span>}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        <Stat label="Kaufpreis" value={fmtEUR(price)} />
        <Stat label="Wohnfläche" value={area ? `${area} m²` : "—"} />
        <Stat label="Preis / m²" value={pricePerM2 ? fmtEUR(pricePerM2) : "—"} />
        <Stat label="Lage" value={location} />
        <Stat label={`Nebenkosten (≈ ${Math.round(nebenPct * 100)} %)`} value={fmtEUR(neben)} />
        <Stat label="Gesamtkapital" value={fmtEUR(total)} highlight />
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#EAE6DF] pt-3 text-[13px]">
        <span className="text-ink-2">Vollständigkeit der Angaben</span>
        <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${qualityClass}`}>{quality} %</span>
      </div>

      {data.missing_fields && data.missing_fields.length > 0 && (
        <div className="mt-3 rounded-[12px] bg-[#FEF3C7]/60 p-3 flex items-start gap-2 text-[13px]">
          <Warning className="size-4 text-[#92400E] shrink-0 mt-0.5" aria-hidden />
          <div>
            <div className="font-medium text-[#1C1917]">Im Inserat fehlt noch</div>
            <div className="text-ink-2 mt-0.5">{data.missing_fields.slice(0, 6).join(", ")}</div>
          </div>
        </div>
      )}

      <a
        href="/signup"
        onClick={handleCtaClick}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-[12px] bg-primary text-white px-5 py-3 font-semibold text-[14px] hover:bg-[#235740] transition-colors"
      >
        Konto anlegen und ganze Auswertung sehen
        <ArrowRight className="size-4" aria-hidden />
      </a>
      <p className="mt-2 text-[12px] text-ink-3 text-center">
        Mit Finanzierung, Cashflow, Mietrecht-Risiko und Vergleich. Keine Kreditkarte.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className={`text-[15px] font-semibold mt-0.5 tabular-nums ${highlight ? "text-primary" : "text-[#1C1917]"}`}>{value}</dd>
    </div>
  );
}

function LinkAnalyzer() {
  const analyze = useServerFn(analyzePropertyUrl);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AnalyzeResult | null>(null);
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
    if (!trimmed) { setError("Bitte füg zuerst einen Link zu einem Inserat ein."); return; }
    if (!isValidUrl(trimmed)) { setError("Das sieht nicht nach einem Link aus. Er sollte mit https:// beginnen."); return; }
    setLoading(true);
    track("landing_link_submitted", { platform: platform || "unknown" });
    try {
      const res = await analyze({ data: { url: trimmed, source: "landingpage" } });
      if (!res.success) {
        persistPending(trimmed);
        setFailedUrl(trimmed);
        setError(res.error || "Dieses Inserat konnten wir gerade nicht auslesen.");
        track("landing_preview_failed", { platform: platform || "unknown", error_code: res.error?.slice(0, 40) || "unknown" });
        return;
      }
      persistPending(trimmed);
      try { localStorage.setItem("pending_analyze_preview", JSON.stringify(res)); } catch { /* ignore */ }
      setPreview(res);
      track("landing_preview_shown", { platform: platform || "unknown", ok: true });
    } catch (err) {
      persistPending(trimmed);
      setFailedUrl(trimmed);
      setError(err instanceof Error ? err.message : "Dieses Inserat konnten wir gerade nicht auslesen.");
      track("landing_preview_failed", { platform: platform || "unknown", error_code: "exception" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={run} className="flex flex-col sm:flex-row gap-2 rounded-[12px] border-[1.5px] border-[#EAE6DF] bg-white p-2 focus-within:border-primary transition-colors">
        <div className="flex-1 flex items-center gap-2 px-3">
          <LinkSimple className="size-4 text-ink-3 shrink-0" aria-hidden />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.willhaben.at/…"
            className="flex-1 outline-none bg-transparent text-[15px] py-3 min-w-0 placeholder:text-ink-3"
            aria-label="Link zum Inserat"
          />
          {platform && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F3EE] text-ink-2 hidden sm:inline">{platform}</span>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-primary text-white px-5 py-3 text-[14px] font-semibold hover:bg-[#235740] disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {loading ? <CircleNotch className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
          {loading ? "Inserat wird ausgelesen…" : "Inserat prüfen"}
        </button>
      </form>

      {error && (
        <div className="mt-3 text-[13px] text-left rounded-[12px] bg-[#FEF3C7]/60 p-3 flex items-start gap-2" role="alert">
          <Warning className="size-4 text-[#92400E] shrink-0 mt-0.5" aria-hidden />
          <div className="space-y-2">
            <div className="text-[#1C1917]">{error}</div>
            {failedUrl && (
              <div className="flex flex-wrap gap-2 pt-1">
                <a href="/signup" className="inline-flex items-center gap-1 rounded-[8px] bg-primary text-white px-2.5 py-1.5 font-medium hover:bg-[#235740]">
                  <ArrowRight className="size-3" aria-hidden /> Trotzdem in der App öffnen
                </a>
                <a href="/signup" className="inline-flex items-center gap-1 rounded-[8px] border border-[#EAE6DF] bg-white px-2.5 py-1.5 font-medium hover:border-[#1C1917]">
                  <FileText className="size-3" aria-hidden /> Inseratstext einfügen
                </a>
                <a href="/signup" className="inline-flex items-center gap-1 rounded-[8px] border border-[#EAE6DF] bg-white px-2.5 py-1.5 font-medium hover:border-[#1C1917]">
                  <UploadSimple className="size-3" aria-hidden /> Exposé als PDF hochladen
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {preview && <PreviewCard data={preview} />}
    </div>
  );
}

/* ───────── So prüfst du eine Wohnung ───────── */

const STEPS: { title: string; text: string; details: string[]; more?: { label: string; href: string } }[] = [
  {
    title: "Inserat einfügen",
    text: "Link von willhaben, ImmoScout24 & Co. einfügen – kaufma liest Preis, Fläche, Lage und Baujahr aus.",
    details: ["Exposé als PDF hochladen", "oder Daten selbst eingeben"],
  },
  {
    title: "Die echten Kosten sehen",
    text: "Nicht nur der Kaufpreis: Grunderwerbsteuer, Grundbuch, Notar und Makler – auch rückwärts aus dem Bruttobetrag gerechnet.",
    details: ["Kreditrate und Bank-Szenarien", "Sondertilgungen im Zahlungsplan"],
    more: { label: "Kaufnebenkosten-Rechner", href: "/rechner/kaufnebenkosten" },
  },
  {
    title: "Rechnet sie sich?",
    text: "Cashflow nach Rate, Rücklage und Leerstand, Brutto- und Nettorendite, und die Miete, ab der du nichts mehr zuzahlst.",
    details: ["Mietrecht-Ampel: MRG, Richtwert, Befristungsabschlag", "fehlende Angaben werden markiert"],
    more: { label: "Rendite berechnen", href: "/rechner" },
  },
  {
    title: "Vergleichen und dranbleiben",
    text: "Kandidaten nebeneinanderlegen und sehen, welche bleibt. Besichtigungen, Notizen und nächste Schritte pro Wohnung.",
    details: ["Pipeline vom ersten Blick bis zum Angebot", "Erinnerungen für Follow-ups"],
  },
];

function Landing() {
  return (
    <MarketingShell>
      {/* ===== HERO ===== */}
      <section id="analyse" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-16 md:pt-16 md:pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
          <div>
            <h1 className="font-display text-[38px] sm:text-[48px] lg:text-[56px] font-extrabold leading-[1.04] text-[#1C1917] text-balance" style={{ letterSpacing: "-0.035em" }}>
              Immobilie gefunden? <span className="text-primary">Link einfügen</span> und sofort prüfen.
            </h1>
            <p className="mt-5 text-[17px] text-ink-2 max-w-xl leading-relaxed">
              Kaufnebenkosten, Kreditrate, Cashflow und Mietrecht-Risiko – ausgerechnet, bevor du zur Besichtigung fährst. Für Käuferinnen und Käufer in Österreich und Deutschland.
            </p>

            <div className="mt-8 max-w-xl">
              <LinkAnalyzer />
              <p className="mt-3 text-[13px] text-ink-2">
                Eine Immobilie ist gratis, ohne Kreditkarte. Kein Link zur Hand?{" "}
                <a href="/demo" className="font-medium text-primary underline underline-offset-4">Demo ansehen</a>
                {" "}oder{" "}
                <Link to="/rechner" className="font-medium text-primary underline underline-offset-4">Rechner ohne Anmeldung</Link>.
              </p>
            </div>
          </div>

          <ExampleAnalysis />
        </div>
      </section>

      {/* ===== SO PRÜFST DU EINE WOHNUNG ===== */}
      <section id="features" className="border-t border-[#EAE6DF] bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="heading-section">So prüfst du eine Wohnung mit kaufma</h2>
            <p className="text-[16px] text-ink-2 mt-3 leading-relaxed">
              Vom Inserat zur Entscheidung, ohne Excel. Jeder Schritt steht für sich – du kannst auch nur einen davon nutzen. Was hinter den Zahlen steckt, erklärt der{" "}
              <Link to="/ratgeber" className="font-medium text-primary underline underline-offset-4">Ratgeber</Link>.
            </p>
          </div>

          <ol className="mt-12 grid md:grid-cols-2 gap-x-14 gap-y-12">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t-2 border-[#1C1917] pt-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[15px] font-extrabold text-primary tabular-nums" aria-hidden>{i + 1}</span>
                  <h3 className="font-display text-[22px] font-extrabold text-[#1C1917]" style={{ letterSpacing: "-0.02em" }}>{s.title}</h3>
                </div>
                <p className="mt-2 text-[15px] text-[#1C1917]/85 leading-relaxed">{s.text}</p>
                <ul className="mt-3 space-y-1">
                  {s.details.map((d) => (
                    <li key={d} className="flex items-baseline gap-2 text-[14px] text-ink-2">
                      <span className="size-1 shrink-0 rounded-full bg-primary translate-y-[-3px]" aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
                {s.more && (
                  <a href={s.more.href} className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium text-primary underline-offset-4 hover:underline">
                    {s.more.label} <ArrowRight className="size-3.5" aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a href="/signup" className="inline-flex items-center gap-2 rounded-[12px] bg-primary text-white px-6 py-3 font-semibold text-[14px] hover:bg-[#235740] transition-colors">
              Kostenlos starten <ArrowRight className="size-4" aria-hidden />
            </a>
            <span className="text-[13px] text-ink-2">Eine Immobilie gratis. Upgrade nur, wenn du vergleichen willst.</span>
          </div>
        </div>
      </section>

      {/* ===== RECHNER ===== */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="heading-section">Rechner ohne Anmeldung</h2>
            <p className="text-[15px] text-ink-2 mt-2">Für die schnelle Frage zwischendurch – direkt im Browser.</p>
          </div>
          <Link to="/rechner" className="text-[14px] text-primary font-medium underline-offset-4 hover:underline">
            Alle 7 Rechner ansehen
          </Link>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            { slug: "kaufnebenkosten", icon: Coins, title: "Kaufnebenkosten", text: "Steuern, Notar, Makler und Grundbuch" },
            { slug: "cashflow", icon: House, title: "Cashflow", text: "Was nach Rate und Rücklage übrig bleibt" },
            { slug: "rendite", icon: TrendUp, title: "Rendite", text: "Brutto, netto und auf dein Eigenkapital" },
          ] as const).map((c) => (
            <Link
              key={c.slug}
              to="/rechner/$slug"
              params={{ slug: c.slug }}
              className="group rounded-[12px] border border-[#EAE6DF] bg-white p-4 flex items-center gap-4 transition-colors hover:border-primary"
            >
              <c.icon className="size-7 text-primary shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-[#1C1917]">{c.title}</div>
                <div className="text-[13px] text-ink-2 mt-0.5">{c.text}</div>
              </div>
              <ArrowRight className="size-4 text-ink-3 group-hover:text-primary shrink-0" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {/* ===== PREISE ===== */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#EAE6DF]">
        <h2 className="heading-section text-center">Preise</h2>
        <p className="text-[15px] text-ink-2 text-center mt-2">Eine Immobilie ist gratis. Mehr brauchst du erst, wenn du ernsthaft vergleichst.</p>
        <div className="mt-10"><PricingTable /></div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-[#EAE6DF]">
        <h2 className="heading-section text-center">Häufige Fragen</h2>
        <div className="mt-8"><FaqList /></div>
      </section>

      {/* ===== ABSCHLUSS ===== */}
      <section className="border-t border-[#EAE6DF] bg-[#1C1917] text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 text-center">
          <h2 className="font-display text-[30px] md:text-[38px] font-extrabold leading-tight text-balance" style={{ letterSpacing: "-0.03em" }}>
            Hast du gerade ein Inserat offen?
          </h2>
          <p className="text-[16px] text-white/75 mt-3">Füg den Link ein und sieh, ob sich die Wohnung rechnet – bevor du Zeit in Besichtigungen steckst.</p>
          <a href="#analyse" className="mt-7 inline-flex items-center gap-2 rounded-[12px] bg-primary text-white px-6 py-3 font-semibold text-[14px] hover:bg-[#235740] transition-colors">
            Inserat prüfen <ArrowRight className="size-4" aria-hidden />
          </a>
          <p className="mt-4 text-[14px] text-white/75">
            Mehr als eine Immobilie im Blick?{" "}
            <Link to="/pricing" className="font-medium text-white underline underline-offset-4">Preise ansehen</Link>
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
