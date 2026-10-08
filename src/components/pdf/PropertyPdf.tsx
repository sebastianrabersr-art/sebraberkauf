import type { ReactNode } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import type { Assumptions, Property } from "@/lib/types";
import { userRatingAvg } from "@/lib/types";
import { VIEWING_CHECKLIST } from "@/lib/store";
import { calcAmortizationSchedule, calcProperty, calcTaxEstimate, getActiveFinance } from "@/lib/calc";
import { CHART_COLORS, CHART_MARGIN, GRID_PROPS, LINE_PROPS, X_AXIS_TIME, yAxisProps } from "@/components/charts/chartKit";
import {
  PdfChart, PdfCover, PdfCoverPageStyle, PdfEmpty, PdfGridTable, PdfPage, PdfSection, PdfTable,
  pdfDate, pdfEur, pdfNum, pdfPct, toneOf, type PdfGridCell, type PdfRow,
} from "./PdfKit";

export type PropertyPdfSections = {
  uebersicht: boolean;
  finanzierung: boolean;
  analysen: boolean;
  steuer: boolean;
  besichtigung: boolean;
};

type ViewingChecks = Record<string, { done?: boolean; note?: string }> | undefined;

const CHART_W = 664;
const CHART_H = 250;
const NO_ANIM = { isAnimationActive: false } as const;
// Im PDF ist Platz: rechts etwas Rand, damit das letzte Jahr an der X-Achse nicht abgeschnitten wird.
// Die Legende steht im PDF über dem Diagramm (PdfChart), nicht im erfassten Bild.
const PDF_CHART_MARGIN = { ...CHART_MARGIN, right: 18 };

/** Restschuld-Verlauf und Tilgungsplan aus derselben Quelle wie der Finanzierungs-Tab. */
function loanRows(p: Property, c: ReturnType<typeof calcProperty>) {
  const fin = getActiveFinance(p);
  if (fin && (fin.kreditBetrag ?? 0) > 0) {
    return {
      source: "scenario" as const,
      rows: calcAmortizationSchedule(fin).map((y) => ({
        label: String(y.year),
        restschuld: y.balanceEnd,
        zinsen: y.interest,
        tilgung: y.principal + y.extraPayment,
      })),
    };
  }
  return {
    source: "model" as const,
    rows: (c.investorModel?.loanDevelopment ?? []).map((l) => ({
      label: `Jahr ${l.jahr}`,
      restschuld: l.remainingDebt,
      zinsen: l.interestPaid,
      tilgung: l.principalPaid,
    })),
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const strategyLabel = (s?: Property["investmentStrategy"]) =>
  s === "fix_and_flip" ? "Fix & Flip" : s === "buy_and_hold" ? "Buy & Hold" : "—";

export function PropertyPdfDocument({ p, a, sections, viewingChecks }: {
  p: Property; a: Assumptions; sections: PropertyPdfSections; viewingChecks: ViewingChecks;
}) {
  const c = calcProperty(p, a);
  const im = c.investorModel;
  const date = pdfDate();
  const title = p.title || "Objekt ohne Titel";
  const address = [p.adresse, p.bezirk, p.city, p.bundesland, p.land].filter(Boolean).join(", ");
  const fin = getActiveFinance(p);

  // Jede Seite als Funktion der Seitenzahl, damit "Seite X von Y" exakt stimmt.
  const pages: ((page: number, total: number) => ReactNode)[] = [];
  const page = (children: ReactNode) =>
    pages.push((n, total) => <PdfPage key={n} title={title} date={date} page={n} total={total}>{children}</PdfPage>);

  /* ───── Übersicht ───── */
  if (sections.uebersicht) {
    const b = c.nebenkostenBreakdown;
    const miete = p.nettomieteMtl ?? 0;
    const kaufpreisfaktor = miete > 0 && (p.kaufpreis ?? 0) > 0 ? (p.kaufpreis as number) / (miete * 12) : null;
    const nkRows: PdfRow[] = b
      ? [
          { label: "Grunderwerbsteuer", value: pdfEur(b.grunderwerbsteuer) },
          { label: "Grundbucheintragung", value: pdfEur(b.grundbuchkosten) },
          { label: "Vertrag / Notar", value: pdfEur(b.vertragskosten) },
          { label: "Finanzierungseintragung / Pfandrecht", value: pdfEur(b.finanzierungskosten) },
          { label: "Sonstige Nebenkosten", value: pdfEur(b.sonstigeNK) },
          { label: "Maklerprovision (brutto)", value: pdfEur(c.maklerProvisionBrutto) },
        ]
      : [];
    page(
      <>
        <PdfSection title="Objekt">
          <PdfTable rows={[
            { label: "Adresse", value: address || "—" },
            { label: "Objektart", value: p.objekttyp || p.objektartDetail || "—" },
            { label: "Strategie", value: strategyLabel(p.investmentStrategy) },
            { label: "Wohnfläche", value: p.wohnflaecheM2 ? `${pdfNum(p.wohnflaecheM2, 1)} m²` : "—" },
          ]} />
        </PdfSection>
        <PdfSection title="Kauf & Nebenkosten">
          <PdfTable compact rows={[
            { label: "Kaufpreis", value: pdfEur(p.kaufpreis) },
            ...nkRows,
            { label: "Kaufnebenkosten gesamt", value: `${pdfEur(c.kaufNebenkosten)} (${pdfPct(c.nebenkostenPct, 1)})`, strong: true },
            { label: "Gesamtkosten", sub: "Kaufpreis + Nebenkosten + Sanierung + Einrichtung + Reserve", value: pdfEur(c.gesamtkosten), strong: true },
          ]} />
        </PdfSection>
        <PdfSection title="Kennzahlen">
          <PdfTable rows={[
            { label: "Bruttorendite", value: pdfPct(c.bruttorendite) },
            { label: "Nettorendite", value: pdfPct(c.nettorendite) },
            { label: "Cashflow / Monat", value: pdfEur(c.cashflowMtl), tone: toneOf(c.cashflowMtl) },
            { label: "Kaufpreisfaktor", sub: "Kaufpreis ÷ Jahresnettomiete", value: kaufpreisfaktor != null ? pdfNum(kaufpreisfaktor, 1) : "—" },
            { label: "Break-even-Miete", sub: "Rate + nicht umlegbare Kosten + Rücklage", value: pdfEur(c.breakEvenMiete) },
          ]} />
        </PdfSection>
      </>,
    );
  }

  /* ───── Finanzierung ───── */
  if (sections.finanzierung) {
    const loan = loanRows(p, c);
    page(
      <>
        <PdfSection title="Finanzierung">
          <PdfTable rows={[
            ...(fin?.bankName ? [{ label: "Bank", value: fin.bankName }] : []),
            { label: "Kreditbetrag", value: pdfEur(c.kreditBetrag) },
            { label: "Eigenkapital", value: pdfEur(c.eigenkapitalEinsatz) },
            { label: "Zinssatz p.a.", value: pdfPct(fin?.zinssatz ?? a.zinssatz) },
            { label: "Laufzeit", value: `${pdfNum(fin?.laufzeitJahre ?? a.laufzeit)} Jahre` },
            { label: "Rate / Monat", value: pdfEur(c.kreditRateMtl), strong: true },
            ...(im ? [{ label: "Zinskosten gesamt", value: pdfEur(im.totalInterestPaid) }] : []),
          ]} />
        </PdfSection>
        {loan.rows.length > 0 ? (
          <PdfChart title="Darlehenshöhe im Zeitverlauf" legend={[{ label: "Restschuld", color: CHART_COLORS.debt }]}>
            <LineChart width={CHART_W} height={CHART_H} data={loan.rows} margin={PDF_CHART_MARGIN}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...X_AXIS_TIME} />
              <YAxis {...yAxisProps()} />
              <Line {...LINE_PROPS} {...NO_ANIM} dataKey="restschuld" name="Restschuld" stroke={CHART_COLORS.debt} />
            </LineChart>
          </PdfChart>
        ) : (
          <PdfEmpty>Keine Finanzierung erfasst – kein Darlehensverlauf.</PdfEmpty>
        )}
      </>,
    );
    // Tilgungsplan: max. 40 Jahre pro Seite, damit die Seite nie überläuft.
    const tablePages = chunk(loan.rows, 40);
    tablePages.forEach((rows, i) => {
      page(
        <PdfSection
          title={tablePages.length > 1 ? `Tilgungsplan (${i + 1}/${tablePages.length})` : "Tilgungsplan"}
          note={loan.source === "scenario"
            ? "Aus dem aktiven Finanzierungsszenario, Kalenderjahre inkl. Sondertilgungen."
            : "Aus den Standard-Annahmen, da kein Finanzierungsszenario mit Kreditbetrag erfasst ist."}
        >
          <PdfGridTable
            compact={rows.length > 30}
            columns={["Jahr", "Restschuld", "Zinsen", "Tilgung"]}
            rows={rows.map((r) => [r.label, pdfEur(r.restschuld), pdfEur(r.zinsen), pdfEur(r.tilgung)])}
          />
        </PdfSection>,
      );
    });
  }

  /* ───── Analysen ───── */
  if (sections.analysen) {
    const H = im?.horizonJahre ?? 10;
    const order = ["conservative", "base", "optimistic"] as const;
    const sc = order.map((k) => im?.scenarios.find((s) => s.key === k));
    const cell = (n: number | undefined, toned = false): PdfGridCell => ({ value: pdfEur(n), tone: toned ? toneOf(n) : undefined });
    // Wertsteigerung wie in der Langfrist-Projektion (calcLongTermProjection): Eingabe in %, Standard 1,5 %.
    const wSteigPct = p.projections?.wertsteigerungPct ?? 1.5;
    const kp = p.kaufpreis ?? 0;
    const wert = (n: number) => kp * Math.pow(1 + wSteigPct / 100, n);

    page(
      <>
        <PdfSection
          title="Szenarien"
          note={`Betrachtungszeitraum ${H} Jahre. Konservativ: Cashflow −15 %, halbe Wertsteigerung. Optimistisch: Cashflow +15 %, 1,3-fache Wertsteigerung.`}
        >
          {im ? (
            <PdfGridTable
              columns={["Kennzahl", "Konservativ", "Basis", "Optimistisch"]}
              rows={[
                ["Cashflow p.a.", ...sc.map((s) => cell(s?.cashflow, true))],
                [`Kumulierter Cashflow (${H} J.)`, ...sc.map((s) => cell(s?.cumulativeCashflow, true))],
                [`Immobilienwert nach ${H} J.`, ...sc.map((s) => cell(s?.propertyValue))],
                [`Restschuld nach ${H} J.`, ...sc.map((s) => cell(s?.remainingDebt))],
                ["Eigenkapital im Objekt", ...sc.map((s) => cell(s?.equityInProperty, true))],
              ]}
            />
          ) : (
            <PdfEmpty>Für Szenarien fehlen Kaufpreis oder Finanzierung.</PdfEmpty>
          )}
        </PdfSection>
        <PdfSection title="Wertsteigerungsprognose" note={`Annahme: ${pdfNum(wSteigPct, 2)} % Wertsteigerung pro Jahr auf den Kaufpreis.`}>
          {kp > 0 ? (
            <PdfGridTable
              columns={["Zeitraum", "Immobilienwert", "Wertzuwachs"]}
              rows={[5, 10, 20].map((n) => [`${n} Jahre`, pdfEur(wert(n)), { value: pdfEur(wert(n) - kp), tone: toneOf(wert(n) - kp) }])}
            />
          ) : (
            <PdfEmpty>Kein Kaufpreis erfasst.</PdfEmpty>
          )}
        </PdfSection>
      </>,
    );

    if (im) {
      const cash = im.cashDevelopment.map((x) => ({ jahr: x.jahr, cashflow: Math.round(x.annualCashflow), cumCashflow: Math.round(x.cumulativeCashflow) }));
      const asset = im.assetDevelopment.map((x) => ({
        jahr: x.jahr,
        immoWert: Math.round(x.estimatedPropertyValue),
        restschuld: Math.round(x.remainingDebt),
        eigenkapital: Math.round(x.equityInProperty),
      }));
      // Jede 5. Beschriftung nur bei langen Reihen – bei ≤ 15 Jahren überlappt im PDF nichts.
      const xInterval = cash.length > 15 ? X_AXIS_TIME.interval : 0;
      page(
        <>
          <PdfChart title="Cashflow-Entwicklung" legend={[{ label: "Cashflow p.a.", color: CHART_COLORS.value }, { label: "Kumulierter Cashflow", color: CHART_COLORS.cashflowPost }]}>
            <ComposedChart width={CHART_W} height={CHART_H} data={cash} margin={PDF_CHART_MARGIN}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="jahr" {...X_AXIS_TIME} interval={xInterval} />
              <YAxis {...yAxisProps()} />
              <ReferenceLine y={0} stroke={CHART_COLORS.grid} />
              <Bar {...NO_ANIM} dataKey="cashflow" name="Cashflow p.a." fill={CHART_COLORS.value} radius={[3, 3, 0, 0]}>
                {cash.map((r) => <Cell key={r.jahr} fill={r.cashflow >= 0 ? CHART_COLORS.value : CHART_COLORS.debt} />)}
              </Bar>
              <Line {...LINE_PROPS} {...NO_ANIM} dataKey="cumCashflow" name="Kumulierter Cashflow" stroke={CHART_COLORS.cashflowPost} />
            </ComposedChart>
          </PdfChart>
          <PdfChart title="Asset-Entwicklung" legend={[{ label: "Immobilienwert", color: CHART_COLORS.value }, { label: "Restschuld", color: CHART_COLORS.debt }, { label: "Eigenkapital im Objekt", color: CHART_COLORS.equity }]}>
            <LineChart width={CHART_W} height={CHART_H} data={asset} margin={PDF_CHART_MARGIN}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="jahr" {...X_AXIS_TIME} interval={xInterval} />
              <YAxis {...yAxisProps()} />
              <Line {...LINE_PROPS} {...NO_ANIM} dataKey="immoWert" name="Immobilienwert" stroke={CHART_COLORS.value} />
              <Line {...LINE_PROPS} {...NO_ANIM} dataKey="restschuld" name="Restschuld" stroke={CHART_COLORS.debt} />
              <Line {...LINE_PROPS} {...NO_ANIM} dataKey="eigenkapital" name="Eigenkapital im Objekt" stroke={CHART_COLORS.equity} strokeDasharray="5 3" />
            </LineChart>
          </PdfChart>
        </>,
      );
    }
  }

  /* ───── Steuer & AfA ───── */
  if (sections.steuer) {
    const t = calcTaxEstimate(p, c);
    page(
      <PdfSection title="Steuer & AfA" note="Vereinfachte Schätzung. Keine Steuerberatung.">
        <PdfTable rows={[
          { label: "Gebäudewert", sub: `${pdfNum(t.gebaeudewertPct * 100)} % von ${pdfEur(t.kaufpreis)}`, value: pdfEur(t.gebaeudewert) },
          { label: "AfA-Satz", value: pdfPct(t.afaSatz, 2) },
          { label: "AfA pro Jahr", value: pdfEur(t.afaJahr) },
          { label: "Überschuss vor AfA", sub: "Mieteinnahmen − Kosten (p.a.)", value: pdfEur(t.gewinnVorAfa), tone: toneOf(t.gewinnVorAfa) },
          { label: "Steuerpflichtige Einkünfte", sub: "Überschuss nach AfA", value: pdfEur(t.gewinnNachAfa), tone: toneOf(t.gewinnNachAfa) },
          { label: "Persönlicher Steuersatz", value: pdfPct(t.steuersatz, 0) },
          { label: "Steuerlast", sub: "geschätzt, p.a.", value: pdfEur(t.steuerBetrag) },
          { label: "Cashflow vor Steuer (p.a.)", value: pdfEur(c.cashflowJahr), tone: toneOf(c.cashflowJahr) },
          { label: "Cashflow nach Steuer (p.a.)", value: pdfEur(t.cashflowNachSteuer), tone: toneOf(t.cashflowNachSteuer), strong: true },
        ]} />
      </PdfSection>,
    );
  }

  /* ───── Besichtigung & Notizen ───── */
  if (sections.besichtigung) {
    const checks = viewingChecks ?? {};
    const doneCount = VIEWING_CHECKLIST.filter((i) => checks[i.key]?.done).length;
    const r = p.userRating;
    const avg = userRatingAvg(r);
    const notes = (p.notizen ?? "").trim();
    const NOTES_MAX = 900;
    page(
      <>
        <PdfSection title={`Besichtigungs-Checkliste (${doneCount}/${VIEWING_CHECKLIST.length})`}>
          <PdfGridTable
            compact
            template="minmax(0, 2.2fr) minmax(0, 0.7fr) minmax(0, 1.6fr)"
            columns={["Punkt", "Status", "Notiz"]}
            rows={VIEWING_CHECKLIST.map((item) => {
              const v = checks[item.key];
              const note = (v?.note ?? "").trim();
              return [
                `${item.group} · ${item.label}`,
                { value: v?.done ? "✓ geprüft" : "offen", tone: v?.done ? "pos" : undefined },
                note || "—",
              ];
            })}
          />
        </PdfSection>
        <PdfSection title="Eigene Notizen">
          {notes ? (
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "#1C1917", whiteSpace: "pre-wrap" }}>
              {notes.length > NOTES_MAX ? `${notes.slice(0, NOTES_MAX)}… (gekürzt)` : notes}
            </div>
          ) : (
            <PdfEmpty>Keine Notizen erfasst.</PdfEmpty>
          )}
        </PdfSection>
        <PdfSection title="Eigene Bewertung">
          {avg != null ? (
            <PdfGridTable
              compact
              columns={["Ø Gesamt", "Lage", "Preis/Leistung", "Zustand", "Vermietbarkeit", "Bauchgefühl"]}
              rows={[[`${pdfNum(avg, 1)} / 10`, ...[r?.lage, r?.preisLeistung, r?.zustand, r?.vermietbarkeit, r?.bauchgefuehl].map((v) => (v != null ? `${v} / 10` : "—"))]]}
            />
          ) : (
            <PdfEmpty>Noch keine vollständige Bewertung erfasst.</PdfEmpty>
          )}
        </PdfSection>
      </>,
    );
  }

  const total = pages.length + 1; // + Deckblatt
  return (
    <>
      <PdfCoverPageStyle />
      <PdfCover
        kicker="Immobilien-Analyse"
        title={title}
        subtitle={address || undefined}
        date={date}
        page={1}
        total={total}
        metrics={[
          { label: "Kaufpreis", value: pdfEur(p.kaufpreis) },
          { label: "Bruttorendite", value: pdfPct(c.bruttorendite) },
          { label: "Cashflow / Monat", value: pdfEur(c.cashflowMtl), tone: toneOf(c.cashflowMtl) },
        ]}
      />
      {pages.map((render, i) => render(i + 2, total))}
    </>
  );
}
