import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Question as HelpCircle, Warning } from "@phosphor-icons/react";
import type { AfaLand, AfaMethode, ObjektartDetail, Property } from "@/lib/types";
import { calcAfa, calcFollowUpFinance, calcLongTermProjection, calcProperty, fmtEUR, fmtPct, getActiveFinance } from "@/lib/calc";
import { useActiveAssumptions, useStore } from "@/lib/store";
import { GlossaryTooltip } from "@/components/GlossaryTooltip";
import { CHART_COLORS, CHART_MARGIN, ChartTooltip, GRID_PROPS, LEGEND_PROPS, LINE_PROPS, X_AXIS_TIME, yAxisProps } from "@/components/charts/chartKit";

const OBJEKTARTEN: ObjektartDetail[] = ["Wohnung", "Haus", "Grundstück", "Zinshaus", "Sonstiges"];

export function AdvancedInvestmentPanel({ p }: { p: Property }) {
  const { updateProperty } = useStore();
  const a = useActiveAssumptions();
  const c = useMemo(() => calcProperty(p, a), [p, a]);
  const u = (patch: Partial<Property>) => updateProperty(p.id, patch);
  const objektart = p.objektartDetail ?? "Wohnung";
  const isHaus = objektart === "Haus" || objektart === "Zinshaus" || objektart === "Grundstück";

  const afa = useMemo(() => calcAfa(p), [p]);
  const projection = useMemo(() => calcLongTermProjection(p, a, c), [p, a, c]);
  const follow = useMemo(() => calcFollowUpFinance(p, a, c), [p, a, c]);
  const activeScn = getActiveFinance(p);

  const proj = p.projections ?? {};

  return (
    <div className="space-y-6">
      {/* Objektart */}
      <Block title="Objektart">
        <div className="grid md:grid-cols-3 gap-3">
          <Fld label="Objektart">
            <select value={objektart} onChange={(e) => u({ objektartDetail: e.target.value as ObjektartDetail })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              {OBJEKTARTEN.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Fld>
          {isHaus && (
            <>
              <Fld label="Grundstücksfläche m²"><NumInp v={p.grundstuecksflaecheM2 ?? null} onChange={(v) => u({ grundstuecksflaecheM2: v })} /></Fld>
              <Fld label="geschätzter Grundwert €"><NumInp v={p.grundwert ?? null} onChange={(v) => u({ grundwert: v })} /></Fld>
              <Fld label="Gebäudewert €"><NumInp v={p.gebaeudewert ?? null} onChange={(v) => u({ gebaeudewert: v })} /></Fld>
              <Fld label="Anteil Grund %"><NumInp v={p.anteilGrundPct ?? null} onChange={(v) => u({ anteilGrundPct: v, anteilGebaeudePct: v == null ? null : 100 - v })} /></Fld>
              <Fld label="Anteil Gebäude %"><NumInp v={p.anteilGebaeudePct ?? null} onChange={(v) => u({ anteilGebaeudePct: v, anteilGrundPct: v == null ? null : 100 - v })} /></Fld>
              <Fld label="Bodenwert / Grundwert €/m²"><NumInp v={p.bodenwert ?? null} onChange={(v) => u({ bodenwert: v })} /></Fld>
            </>
          )}
        </div>
        {!isHaus && (
          <p className="text-[11px] text-muted-foreground mt-2">Grund-/Gebäudeaufteilung ist bei Wohnungen meist nicht relevant. Aktiviere „Haus" / „Zinshaus" / „Grundstück" für die zusätzlichen Felder.</p>
        )}
      </Block>

      {/* AfA */}
      <AfaSection p={p} u={u} afa={afa} />


      {/* Projections */}
      <Block title="Langfristige Projektion (Mietsteigerung, Wertsteigerung, Leerstand)">
        <div className="grid md:grid-cols-3 gap-3">
          <Fld label={<>Jährliche Mietpreissteigerung %<GlossaryTooltip termId="mietsteigerung" /></>}><NumInp v={proj.mietsteigerungPct ?? null} onChange={(v) => u({ projections: { ...proj, mietsteigerungPct: v } })} step={0.1} placeholder="2.0" /></Fld>
          <Fld label={<>Jährliche Kostensteigerung %<GlossaryTooltip termId="kostensteigerung" /></>}><NumInp v={proj.kostensteigerungPct ?? null} onChange={(v) => u({ projections: { ...proj, kostensteigerungPct: v } })} step={0.1} placeholder="2.0" /></Fld>
          <Fld label={<>Jährliche Wertsteigerung %<GlossaryTooltip termId="wertsteigerung" /></>}><NumInp v={proj.wertsteigerungPct ?? null} onChange={(v) => u({ projections: { ...proj, wertsteigerungPct: v } })} step={0.1} placeholder="1.5" /></Fld>
          <Fld label={<>Leerstand %<GlossaryTooltip termId="leerstand" /></>}><NumInp v={proj.leerstandPct ?? null} onChange={(v) => u({ projections: { ...proj, leerstandPct: v } })} step={0.5} placeholder="4.0" /></Fld>
          <Fld label={<>Instandhaltungsreserve pro Jahr €<GlossaryTooltip termId="instandhaltungsreserve" /></>}><NumInp v={proj.instandhaltungProJahr ?? null} onChange={(v) => u({ projections: { ...proj, instandhaltungProJahr: v } })} placeholder="0" /></Fld>
          <Fld label="Horizont (Jahre)"><NumInp v={proj.horizonJahre ?? null} onChange={(v) => u({ projections: { ...proj, horizonJahre: v } })} placeholder="10" /></Fld>
        </div>

        {projection.length > 0 && (
          <>
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer>
                <ComposedChart data={projection} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="year" {...X_AXIS_TIME} />
                  <YAxis {...yAxisProps()} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#FAFAF8" }} />
                  <Legend {...LEGEND_PROPS} />
                  <Bar dataKey="cashflow" fill={CHART_COLORS.cashflowPre} name="Cashflow p.a." radius={[3, 3, 0, 0]} />
                  <Line {...LINE_PROPS} dataKey="immoWert" stroke={CHART_COLORS.value} name="Immobilienwert" />
                  <Line {...LINE_PROPS} dataKey="restschuld" stroke={CHART_COLORS.debt} name="Restschuld" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b text-[10px] uppercase text-muted-foreground">
                    <th className="py-1.5 pr-2">Jahr</th>
                    <th className="py-1.5 pr-2 text-right">Miete p.a.</th>
                    <th className="py-1.5 pr-2 text-right">BK + Rücklage</th>
                    <th className="py-1.5 pr-2 text-right">Instandh.</th>
                    <th className="py-1.5 pr-2 text-right">Rate p.a.</th>
                    <th className="py-1.5 pr-2 text-right">Cashflow</th>
                    <th className="py-1.5 pr-2 text-right">Restschuld</th>
                    <th className="py-1.5 pr-2 text-right">Immobilienwert</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.map((y) => (
                    <tr key={y.year} className="border-b last:border-0">
                      <td className="py-1 pr-2 font-medium">+{y.year}</td>
                      <td className="py-1 pr-2 text-right">{fmtEUR(y.miete)}</td>
                      <td className="py-1 pr-2 text-right">{fmtEUR(y.betriebskosten)}</td>
                      <td className="py-1 pr-2 text-right">{fmtEUR(y.instandhaltung)}</td>
                      <td className="py-1 pr-2 text-right">{fmtEUR(y.rate)}</td>
                      <td className={`py-1 pr-2 text-right ${y.cashflow >= 0 ? "text-success" : "text-destructive"}`}>{fmtEUR(y.cashflow)}</td>
                      <td className="py-1 pr-2 text-right">{fmtEUR(y.restschuld)}</td>
                      <td className="py-1 pr-2 text-right text-success">{fmtEUR(y.immoWert)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Block>

      {/* Follow-up financing */}
      <Block title="Anschlussfinanzierung (Phase 2)">
        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={!!p.followUpFinance?.aktiv} onChange={(e) => u({ followUpFinance: { ...(p.followUpFinance ?? {}), aktiv: e.target.checked } })} />
          Anschlussfinanzierung aktivieren
        </label>
        {p.followUpFinance?.aktiv && (
          <>
            <div className="grid md:grid-cols-3 gap-3">
              <Fld label="Phase 1 – Fixzinsdauer (J)">
                <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm">{activeScn?.zinsbindungJahre ?? activeScn?.laufzeitJahre ?? "—"}</div>
              </Fld>
              <Fld label="Phase 2 – Zinssatz %">
                <NumInp v={p.followUpFinance?.zinssatz != null ? p.followUpFinance.zinssatz * 100 : null}
                        onChange={(v) => u({ followUpFinance: { ...(p.followUpFinance ?? {}), zinssatz: v == null ? null : v / 100 } })}
                        step={0.01} placeholder={activeScn ? String((activeScn.zinssatz * 100).toFixed(2)) : "4.5"} />
              </Fld>
              <Fld label="Phase 2 – Restlaufzeit (J)">
                <NumInp v={p.followUpFinance?.restlaufzeitJahre ?? null}
                        onChange={(v) => u({ followUpFinance: { ...(p.followUpFinance ?? {}), restlaufzeitJahre: v } })} />
              </Fld>
              <Fld label="Notiz">
                <input value={p.followUpFinance?.notiz ?? ""} onChange={(e) => u({ followUpFinance: { ...(p.followUpFinance ?? {}), notiz: e.target.value } })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </Fld>
            </div>

            {follow && (
              <>
                <div className="grid md:grid-cols-4 gap-3 mt-4">
                  <Kpi label="Rate Phase 1 (mtl.)" value={fmtEUR(follow.ratePhase1)} />
                  <Kpi label="Restschuld nach Phase 1" value={fmtEUR(follow.restschuldNachPhase1)} />
                  <Kpi label={`Rate Phase 2 @ ${fmtPct(follow.zinssatz2, 2)}`} value={fmtEUR(follow.ratePhase2)} tone={follow.ratePhase2 > follow.ratePhase1 ? "bad" : "good"} />
                  <Kpi label="Cashflow-Δ" value={`${follow.cashflowVeraenderung >= 0 ? "+" : ""}${fmtEUR(follow.cashflowVeraenderung)}/Mt`} tone={follow.cashflowVeraenderung >= 0 ? "good" : "bad"} />
                  <Kpi label="Zinsen Phase 1" value={fmtEUR(follow.totalInterestPhase1)} />
                  <Kpi label="Zinsen Phase 2" value={fmtEUR(follow.totalInterestPhase2)} />
                  <Kpi label="Σ Zinsen kombiniert" value={fmtEUR(follow.totalInterestKombiniert)} />
                </div>

                <FollowUpChart phase1Years={follow.phase1Years} ratePhase1={follow.ratePhase1} ratePhase2={follow.ratePhase2} restlaufzeit2={follow.restlaufzeit2} restschuldStart={activeScn?.kreditBetrag ?? 0} restschuldNach1={follow.restschuldNachPhase1} />
              </>
            )}
            {!follow && <div className="text-xs text-muted-foreground mt-2">Bitte zuerst ein aktives Finanzierungs-Szenario anlegen.</div>}
          </>
        )}
      </Block>
    </div>
  );
}

function FollowUpChart({ phase1Years, ratePhase1, ratePhase2, restlaufzeit2, restschuldStart, restschuldNach1 }: { phase1Years: number; ratePhase1: number; ratePhase2: number; restlaufzeit2: number; restschuldStart: number; restschuldNach1: number }) {
  const data: { year: number; rate: number; restschuld: number; phase: string }[] = [];
  const totalYears = phase1Years + restlaufzeit2;
  for (let i = 0; i <= totalYears; i++) {
    let restschuld = 0;
    if (i <= phase1Years) {
      const frac = i / Math.max(1, phase1Years);
      restschuld = restschuldStart - (restschuldStart - restschuldNach1) * frac;
    } else {
      const frac = (i - phase1Years) / Math.max(1, restlaufzeit2);
      restschuld = restschuldNach1 * (1 - frac);
    }
    data.push({ year: i, rate: i < phase1Years ? ratePhase1 : ratePhase2, restschuld: Math.max(0, restschuld), phase: i < phase1Years ? "Phase 1" : "Phase 2" });
  }
  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="year" {...X_AXIS_TIME} />
          <YAxis yAxisId="l" {...yAxisProps("€")} />
          <YAxis yAxisId="r" {...yAxisProps("€ / Monat", "right")} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#EAE6DF" }} />
          <Legend {...LEGEND_PROPS} />
          <Line yAxisId="l" {...LINE_PROPS} dataKey="restschuld" stroke={CHART_COLORS.debt} name="Restschuld" />
          <Line yAxisId="r" {...LINE_PROPS} type="stepAfter" dataKey="rate" stroke={CHART_COLORS.value} name="Rate mtl." />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-4 first:border-t-0 first:pt-0">
      <h4 className="font-semibold text-sm mb-3">{title}</h4>
      {children}
    </div>
  );
}
function Fld({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</label>;
}
function NumInp({ v, onChange, step, placeholder }: { v: number | null | undefined; onChange: (v: number | null) => void; step?: number; placeholder?: string }) {
  return <input type="number" step={step ?? 1} value={v ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
function Kpi({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold mt-0.5 ${tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

const bricolage = { fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', letterSpacing: "-0.02em" } as const;

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group align-middle ml-1">
      <HelpCircle className="size-[14px] text-ink-3 cursor-help" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-10 hidden group-hover:block w-56 rounded-md border border-[#EAE6DF] bg-white px-2.5 py-1.5 text-[12px] leading-snug text-[#1C1917] shadow-sm" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {text}
      </span>
    </span>
  );
}

function ResultCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[8px] border border-[#EAE6DF] bg-[#FAFAF8] px-[14px] py-[12px]">
      <div className="text-[11px] uppercase tracking-wider text-ink-3 font-medium">{label}</div>
      <div className="mt-1 text-[18px] tabular-nums" style={{ ...bricolage, fontWeight: 700, color: accent ? "#2D6A4F" : "#1C1917" }}>{value}</div>
    </div>
  );
}

function AfaSection({ p, u, afa }: { p: Property; u: (patch: Partial<Property>) => void; afa: ReturnType<typeof calcAfa> }) {
  const [expert, setExpert] = useState(false);
  const kaufpreis = p.afa?.basis ?? p.kaufpreis ?? 0;

  return (
    <div className="rounded-[10px] border border-[#EAE6DF] bg-white p-4">
      <h4 className="font-semibold text-[13px] text-[#1C1917] mb-3">Abschreibung / AfA<GlossaryTooltip termId="abschreibung" /></h4>

      {!expert ? (
        <>
          <Fld label="Kaufpreis €">
            <NumInp v={kaufpreis || null} onChange={(v) => u({ afa: { ...(p.afa ?? {}), basis: v } })} placeholder={String(p.kaufpreis ?? "")} />
          </Fld>
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <ResultCard label="Gebäudewert" value={fmtEUR(afa.gebaeudewert)} />
            <ResultCard label="AfA-Satz" value={`${afa.satzPct.toFixed(1).replace(".", ",")} % p.a.`} />
            <ResultCard label="AfA pro Jahr" value={fmtEUR(afa.jahresAfa)} accent />
          </div>
          <p className="text-[12px] text-ink-2 mt-3 leading-relaxed">
            Die Abschreibung (AfA) senkt dein zu versteuerndes Einkommen. Bei vermieteten Wohnungen in Österreich beträgt der Satz 1,5% des Gebäudewerts pro Jahr. Der Gebäudewert wird mit 80% des Kaufpreises angesetzt (Standard AT).
          </p>
          <button onClick={() => setExpert(true)} className="mt-3 text-[12px] text-ink-3 hover:text-[#1C1917] cursor-pointer" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            Experteneinstellungen anzeigen ›
          </button>
        </>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            <Fld label={<>Land<InfoTip text="Land bestimmt die gesetzlichen Standardwerte für AfA-Satz und Aufteilung." /></>}>
              <select value={p.afa?.land ?? "AT"} onChange={(e) => u({ afa: { ...(p.afa ?? {}), land: e.target.value as AfaLand } })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="AT">Österreich</option>
                <option value="DE">Deutschland</option>
              </select>
            </Fld>
            <Fld label={<>AfA-Methode<InfoTip text="Linear bedeutet: jedes Jahr gleich viel abschreiben." /></>}>
              <select value={p.afa?.methode ?? "linear"} onChange={(e) => u({ afa: { ...(p.afa ?? {}), methode: e.target.value as AfaMethode } })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="linear">linear</option>
                <option value="manuell">manuell</option>
              </select>
            </Fld>
            <Fld label="Abschreibungsbasis €">
              <NumInp v={p.afa?.basis ?? null} onChange={(v) => u({ afa: { ...(p.afa ?? {}), basis: v } })} placeholder={`Standard: Kaufpreis ${fmtEUR(p.kaufpreis)}`} />
            </Fld>
            <Fld label={<>Grundstücksanteil %<InfoTip text="Der Anteil des Kaufpreises der auf das Grundstück entfällt. Grundstücke werden nicht abgeschrieben." /></>}>
              <NumInp v={p.afa?.grundAnteilPct ?? null} onChange={(v) => u({ afa: { ...(p.afa ?? {}), grundAnteilPct: v, gebaeudeAnteilPct: v == null ? (p.afa?.gebaeudeAnteilPct ?? null) : Math.max(0, 100 - v) } })} placeholder={String(afa.grundAnteilPct)} />
            </Fld>
            <Fld label={<>Gebäudeanteil %<InfoTip text="Der Anteil der abgeschrieben werden kann. Standard bei Wohnungen: 80%." /></>}>
              <NumInp v={p.afa?.gebaeudeAnteilPct ?? null} onChange={(v) => u({ afa: { ...(p.afa ?? {}), gebaeudeAnteilPct: v, grundAnteilPct: v == null ? (p.afa?.grundAnteilPct ?? null) : Math.max(0, 100 - v) } })} placeholder={String(afa.gebaeudeAnteilPct)} />
            </Fld>
            <Fld label={<>AfA-Satz %<InfoTip text="Gesetzlicher Satz für vermietete Wohngebäude in Österreich: 1,5% p.a." /></>}>
              <NumInp v={p.afa?.satzPct ?? null} onChange={(v) => u({ afa: { ...(p.afa ?? {}), satzPct: v } })} step={0.1} placeholder={String(afa.satzPct)} />
            </Fld>
            {p.afa?.methode === "manuell" && (
              <Fld label="AfA pro Jahr € (manuell)">
                <NumInp v={p.afa?.jahresBetrag ?? null} onChange={(v) => u({ afa: { ...(p.afa ?? {}), jahresBetrag: v } })} />
              </Fld>
            )}
          </div>
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <ResultCard label="Gebäudewert" value={fmtEUR(afa.gebaeudewert)} />
            <ResultCard label="AfA-Satz" value={`${afa.satzPct.toFixed(2).replace(".", ",")} %`} />
            <ResultCard label="AfA pro Jahr" value={fmtEUR(afa.jahresAfa)} accent />
          </div>
          <p className="text-[11px] text-ink-2 mt-2">{afa.hinweis}</p>
          <p className="inline-flex items-center gap-1 text-[11px] text-[#92400E] font-medium mt-1">
            <Warning size={12} aria-hidden /> Keine Steuerberatung. Nur vereinfachte Modellrechnung.
          </p>
          <button onClick={() => setExpert(false)} className="mt-3 text-[12px] text-ink-3 hover:text-[#1C1917] cursor-pointer" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            ‹ Einfache Ansicht
          </button>
        </>
      )}
    </div>
  );
}
