import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import { fmtEUR, summarizePayments } from "@/lib/calc";
import {
  AUSGABE_KATEGORIEN,
  EINNAHME_KATEGORIEN,
  PORTFOLIO_DOCUMENT_TYPES,
  type Payment,
  type PaymentKategorie,
  type PortfolioDocument,
  type PortfolioDocumentTyp,
  type Property,
  type VerwaltungInfo,
} from "@/lib/types";
import { planLimits, useAuth } from "@/lib/auth";
import { FeatureLocked } from "@/components/FeatureLocked";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import { ChartCard, CHART_STYLE, type ChartRange } from "@/components/ChartCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export const Route = createFileRoute("/portfolio/$id")({
  head: () => ({ meta: [{ title: "Portfolio – Detail" }] }),
  component: PortfolioDetail,
});

const bricolage = { fontFamily: "'Bricolage Grotesque', sans-serif" } as const;
const inputCls =
  "w-full bg-white border-[1.5px] border-[#EAE6DF] rounded-[8px] px-3 py-[9px] text-[13px] outline-none focus:border-[#2D6A4F] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const labelCls = "text-[11px] uppercase tracking-wider text-[#A8A29E] font-medium mb-1 block";

type TabKey = "uebersicht" | "finanzen" | "dokumente" | "verwaltung";

function PortfolioDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { properties, payments, updateProperty, addPayment, deletePayment } = useStore();
  const { subscription } = useAuth();
  const [tab, setTab] = useState<TabKey>("uebersicht");

  const p = properties.find((x) => x.id === id);

  if (!planLimits(subscription?.plan).portfolio) {
    return (
      <AppShell>
        <FeatureLocked
          title="Portfolio ist in Premium enthalten"
          description="Mit Premium verwaltest du deinen Bestand."
          recommendPlan="premium"
        />
      </AppShell>
    );
  }

  if (!p) {
    return (
      <AppShell>
        <div className="bg-[#F5F3EE] min-h-full -m-6 p-6">
          <div className="text-[14px] text-[#78716C]">Objekt nicht gefunden.</div>
          <Link to="/portfolio" className="text-[13px] text-[#2D6A4F] hover:underline">← Zum Portfolio</Link>
        </div>
      </AppShell>
    );
  }

  const pi = p.purchase ?? {};
  const patchPurchase = (patch: Partial<typeof pi>) =>
    updateProperty(p.id, { purchase: { ...pi, ...patch } });

  return (
    <AppShell>
      <div className="bg-[#F5F3EE] min-h-full -m-6 p-6">
        <button
          onClick={() => navigate({ to: "/portfolio" })}
          className="inline-flex items-center gap-1.5 text-[12px] text-[#78716C] hover:text-[#1C1917] mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Zurück zum Portfolio
        </button>
        <div className="mb-5">
          <h1 className="text-[28px] text-[#1C1917]" style={{ ...bricolage, fontWeight: 800, letterSpacing: "-0.03em" }}>
            {p.title || "—"}
          </h1>
          <p className="text-[13px] text-[#78716C] mt-1">
            {[p.adresse, p.bezirk, p.city, p.land].filter(Boolean).join(", ") || "—"}
            {pi.kaufdatum && ` · gekauft ${pi.kaufdatum}`}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-[#EAE6DF]">
          {([
            ["uebersicht", "Übersicht"],
            ["finanzen", "Finanzen"],
            ["dokumente", "Dokumente & Kosten"],
            ["verwaltung", "Verwaltung"],
          ] as [TabKey, string][]).map(([k, label]) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="px-4 py-2 text-[13px] font-medium transition-colors -mb-px"
                style={{
                  color: active ? "#1C1917" : "#78716C",
                  borderBottom: active ? "2px solid #2D6A4F" : "2px solid transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {tab === "uebersicht" && <UebersichtTab p={p} />}
        {tab === "finanzen" && <FinanzenTab p={p} pi={pi} patchPurchase={patchPurchase} />}
        {tab === "dokumente" && (
          <DokumenteTab
            p={p}
            pi={pi}
            patchPurchase={patchPurchase}
            payments={payments.filter((x) => x.propertyId === p.id)}
            addPayment={addPayment}
            deletePayment={deletePayment}
          />
        )}
        {tab === "verwaltung" && <VerwaltungTab pi={pi} patchPurchase={patchPurchase} />}
      </div>
    </AppShell>
  );
}

/* ─────────── Übersicht ─────────── */
function UebersichtTab({ p }: { p: Property }) {
  const pi = p.purchase ?? {};
  const wert = pi.aktuellerObjektwert ?? 0;
  const kauf = pi.tatsKaufpreis ?? p.kaufpreis ?? 0;
  const wertzuwachs = wert - kauf;
  const wertzuwachsPct = kauf > 0 ? wertzuwachs / kauf : 0;
  const restschuld = pi.aktuelleRestschuld ?? 0;

  const mtlMiete = pi.aktuelleMonatsmiete ?? p.nettomieteMtl ?? 0;
  const mtlRate = pi.aktuelleMonatsrate ?? 0;
  const mtlKosten =
    (pi.tatsMonatlicheKosten ?? 0) ||
    ((pi.betriebskostenMtl ?? 0) + (pi.nichtUmlMtl ?? 0) + (pi.ruecklageMtl ?? 0) +
      (pi.versicherungMtl ?? 0) + (pi.verwaltungMtl ?? 0) + (pi.sonstigeMtlKosten ?? 0));
  const mtlCash = mtlMiete - mtlRate - mtlKosten;

  const [range, setRange] = useState<ChartRange>("10J");
  const [wertSteigPct, setWertSteigPct] = useState<number>(2.5);
  const [tilgungAnteilPct, setTilgungAnteilPct] = useState<number>(40);

  const years = useMemo(() => ({ "5J": 5, "10J": 10, "20J": 20, "30J": 30 }[range]), [range]);

  const { chartData, kreditAbbezahltJahr, breakEvenJahr, ekIn10J } = useMemo(() => {
    const wertSteig = wertSteigPct / 100;
    const tilgungProJahr = mtlRate * 12 * (tilgungAnteilPct / 100);
    const out: { jahr: number; Objektwert: number; Restschuld: number; Eigenkapital: number }[] = [];
    let abbezahlt: number | null = null;
    let breakEven: number | null = null;
    for (let j = 0; j <= years; j++) {
      const w = wert * Math.pow(1 + wertSteig, j);
      const r = Math.max(0, restschuld - tilgungProJahr * j);
      const e = w - r;
      if (abbezahlt === null && r <= 0 && restschuld > 0) abbezahlt = j;
      if (breakEven === null && e >= kauf && kauf > 0) breakEven = j;
      out.push({ jahr: j, Objektwert: Math.round(w), Restschuld: Math.round(r), Eigenkapital: Math.round(e) });
    }
    const ek10 = out[Math.min(10, out.length - 1)]?.Eigenkapital ?? 0;
    return { chartData: out, kreditAbbezahltJahr: abbezahlt, breakEvenJahr: breakEven, ekIn10J: ek10 };
  }, [wert, restschuld, mtlRate, wertSteigPct, tilgungAnteilPct, years, kauf]);

  const assumptions = (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1.5 text-[11px] text-[#78716C]">
        Wertsteigerung % p.a.
        <input
          type="number"
          step={0.1}
          value={wertSteigPct}
          onChange={(e) => setWertSteigPct(Number(e.target.value) || 0)}
          className="w-16 bg-white border-[1.5px] border-[#EAE6DF] rounded-[6px] px-2 py-[3px] text-[12px] outline-none focus:border-[#2D6A4F] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </label>
      <label className="flex items-center gap-1.5 text-[11px] text-[#78716C]">
        Tilgungsanteil %
        <input
          type="number"
          step={1}
          value={tilgungAnteilPct}
          onChange={(e) => setTilgungAnteilPct(Number(e.target.value) || 0)}
          className="w-16 bg-white border-[1.5px] border-[#EAE6DF] rounded-[6px] px-2 py-[3px] text-[12px] outline-none focus:border-[#2D6A4F] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </label>
    </div>
  );

  const footer = (
    <>
      {kreditAbbezahltJahr !== null
        ? `Kredit abbezahlt in ${kreditAbbezahltJahr} Jahren`
        : "Kredit innerhalb des Horizonts nicht abbezahlt"}
      {" · "}Eigenkapital in 10J: {fmtEUR(ekIn10J)}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Aktueller Wert" value={fmtEUR(wert)} />
        <StatCard label="Kaufpreis" value={fmtEUR(kauf)} />
        <StatCard
          label="Wertzuwachs"
          value={`${fmtEUR(wertzuwachs)} (${(wertzuwachsPct * 100).toFixed(1)}%)`}
          color={wertzuwachs >= 0 ? "#2D6A4F" : "#DC2626"}
        />
        <StatCard label="Restschuld" value={fmtEUR(restschuld)} />
      </div>

      <ChartCard
        title="Wertentwicklung (Prognose)"
        ranges={["5J", "10J", "20J", "30J"]}
        range={range}
        onRangeChange={setRange}
        assumptions={assumptions}
        footer={footer}
        height={280}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid {...CHART_STYLE.grid} />
            <XAxis dataKey="jahr" tick={CHART_STYLE.axisTick} axisLine={CHART_STYLE.axisLine} />
            <YAxis tick={CHART_STYLE.axisTick} axisLine={CHART_STYLE.axisLine} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={CHART_STYLE.tooltipContent} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Objektwert" stroke={CHART_STYLE.colors.positive} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Restschuld" stroke={CHART_STYLE.colors.negative} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Eigenkapital" stroke={CHART_STYLE.colors.secondary} strokeWidth={2} dot={false} />
            {kreditAbbezahltJahr !== null && (
              <ReferenceLine
                x={kreditAbbezahltJahr}
                stroke={CHART_STYLE.colors.positive}
                strokeDasharray="4 4"
                label={{ value: `Kredit abbezahlt (J${kreditAbbezahltJahr})`, position: "top", fontSize: 11, fill: CHART_STYLE.colors.positive }}
              />
            )}
            {breakEvenJahr !== null && (
              <ReferenceLine
                x={breakEvenJahr}
                stroke="#D97706"
                strokeDasharray="4 4"
                label={{ value: `Break-even (J${breakEvenJahr})`, position: "insideTopRight", fontSize: 11, fill: "#D97706" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card title="Cashflow-Übersicht">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Mini label="Miete" value={fmtEUR(mtlMiete)} />
          <Mini label="Rate" value={fmtEUR(mtlRate)} />
          <Mini label="Kosten" value={fmtEUR(mtlKosten)} />
        </div>
        <div className="border-t border-[#EAE6DF] pt-3">
          <div className="text-[11px] text-[#A8A29E] uppercase tracking-wider">Cashflow mtl.</div>
          <div
            className="tabular-nums"
            style={{ ...bricolage, fontWeight: 800, fontSize: 32, color: mtlCash >= 0 ? "#2D6A4F" : "#DC2626" }}
          >
            {fmtEUR(mtlCash)}
          </div>
          <div className="text-[12px] text-[#78716C] mt-1">Jährlich: {fmtEUR(mtlCash * 12)}</div>
        </div>
      </Card>
    </div>
  );
}

/* ─────────── Finanzen ─────────── */
function FinanzenTab({
  p,
  pi,
  patchPurchase,
}: {
  p: Property;
  pi: NonNullable<Property["purchase"]>;
  patchPurchase: (patch: Partial<NonNullable<Property["purchase"]>>) => void;
}) {
  const mtlMiete = pi.aktuelleMonatsmiete ?? p.nettomieteMtl ?? 0;
  const mtlRate = pi.aktuelleMonatsrate ?? 0;
  const mtlKostenSum =
    (pi.betriebskostenMtl ?? 0) +
    (pi.nichtUmlMtl ?? 0) +
    (pi.ruecklageMtl ?? 0) +
    (pi.versicherungMtl ?? 0) +
    (pi.verwaltungMtl ?? 0) +
    (pi.sonstigeMtlKosten ?? 0);
  const cashflow = mtlMiete - mtlRate - mtlKostenSum;

  return (
    <div className="space-y-4">
      <Card title="Kredit">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Bank">
            <input type="text" defaultValue={pi.bank ?? ""} onBlur={(e) => patchPurchase({ bank: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Kreditbetrag">
            <NumInput value={pi.tatsKreditbetrag} onCommit={(v) => patchPurchase({ tatsKreditbetrag: v })} />
          </Field>
          <Field label="Zinssatz %">
            <NumInput value={pi.zinssatzPct} onCommit={(v) => patchPurchase({ zinssatzPct: v })} step={0.01} />
          </Field>
          <Field label="Monatliche Rate">
            <NumInput value={pi.aktuelleMonatsrate} onCommit={(v) => patchPurchase({ aktuelleMonatsrate: v })} />
          </Field>
          <Field label="Restschuld">
            <NumInput value={pi.aktuelleRestschuld} onCommit={(v) => patchPurchase({ aktuelleRestschuld: v })} />
          </Field>
          <Field label="Kreditstatus">
            <input type="text" defaultValue={pi.kreditstatus ?? ""} onBlur={(e) => patchPurchase({ kreditstatus: e.target.value as typeof pi.kreditstatus })} className={inputCls} />
          </Field>
          <Field label="Nächste Zinsanpassung">
            <input type="date" defaultValue={pi.naechsteZinsanpassung ?? ""} onBlur={(e) => patchPurchase({ naechsteZinsanpassung: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Laufzeit (Jahre)">
            <NumInput value={pi.laufzeitJahre} onCommit={(v) => patchPurchase({ laufzeitJahre: v })} />
          </Field>
        </div>
      </Card>

      <Card title="Einnahmen">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Aktuelle Monatsmiete">
            <NumInput value={pi.aktuelleMonatsmiete} onCommit={(v) => patchPurchase({ aktuelleMonatsmiete: v })} />
          </Field>
          <Field label="Aktueller Objektwert">
            <NumInput value={pi.aktuellerObjektwert} onCommit={(v) => patchPurchase({ aktuellerObjektwert: v })} />
          </Field>
        </div>
      </Card>

      <Card title="Ausgaben (mtl.)">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Betriebskosten"><NumInput value={pi.betriebskostenMtl} onCommit={(v) => patchPurchase({ betriebskostenMtl: v })} /></Field>
          <Field label="Nicht umlagefähig"><NumInput value={pi.nichtUmlMtl} onCommit={(v) => patchPurchase({ nichtUmlMtl: v })} /></Field>
          <Field label="Rücklage"><NumInput value={pi.ruecklageMtl} onCommit={(v) => patchPurchase({ ruecklageMtl: v })} /></Field>
          <Field label="Versicherung"><NumInput value={pi.versicherungMtl} onCommit={(v) => patchPurchase({ versicherungMtl: v })} /></Field>
          <Field label="Verwaltung"><NumInput value={pi.verwaltungMtl} onCommit={(v) => patchPurchase({ verwaltungMtl: v })} /></Field>
          <Field label="Sonstige"><NumInput value={pi.sonstigeMtlKosten} onCommit={(v) => patchPurchase({ sonstigeMtlKosten: v })} /></Field>
        </div>
      </Card>

      <Card title="Netto-Cashflow (mtl.)">
        <div
          className="tabular-nums"
          style={{ ...bricolage, fontWeight: 800, fontSize: 32, color: cashflow >= 0 ? "#2D6A4F" : "#DC2626" }}
        >
          {fmtEUR(cashflow)}
        </div>
        <div className="text-[12px] text-[#78716C] mt-1">
          {fmtEUR(mtlMiete)} − {fmtEUR(mtlRate)} − {fmtEUR(mtlKostenSum)} · jährlich {fmtEUR(cashflow * 12)}
        </div>
      </Card>
    </div>
  );
}

/* ─────────── Dokumente & Kosten ─────────── */
const REPAIR_STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  "Offen": { bg: "#FEE2E2", fg: "#991B1B" },
  "In Arbeit": { bg: "#FEF3C7", fg: "#92400E" },
  "Erledigt": { bg: "#E8F5EE", fg: "#2D6A4F" },
};

function DokumenteTab({
  p,
  pi,
  patchPurchase,
  payments,
  addPayment,
  deletePayment,
}: {
  p: Property;
  pi: NonNullable<Property["purchase"]>;
  patchPurchase: (patch: Partial<NonNullable<Property["purchase"]>>) => void;
  payments: Payment[];
  addPayment: (p: Payment) => void;
  deletePayment: (id: string) => void;
}) {
  const repairs = pi.repairs ?? [];
  const [newRepair, setNewRepair] = useState({ title: "", kosten: "" });
  const [newPay, setNewPay] = useState({
    direction: "Ausgabe" as "Einnahme" | "Ausgabe",
    category: "Betriebskosten" as PaymentKategorie,
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const addRepair = () => {
    if (!newRepair.title.trim()) return;
    patchPurchase({
      repairs: [
        ...repairs,
        {
          id: crypto.randomUUID(),
          title: newRepair.title.trim(),
          kosten: newRepair.kosten ? Number(newRepair.kosten) : null,
          status: "Offen",
          datum: new Date().toISOString().slice(0, 10),
        },
      ],
    });
    setNewRepair({ title: "", kosten: "" });
  };
  const updateRepair = (id: string, patch: Partial<(typeof repairs)[number]>) => {
    patchPurchase({ repairs: repairs.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };
  const removeRepair = (id: string) => {
    patchPurchase({ repairs: repairs.filter((r) => r.id !== id) });
  };

  const submitPayment = () => {
    const amount = Number(newPay.amount);
    if (!amount) return;
    addPayment({
      id: crypto.randomUUID(),
      propertyId: p.id,
      date: newPay.date,
      direction: newPay.direction,
      category: newPay.category,
      amount,
      description: newPay.description || undefined,
      status: "bezahlt",
      createdAt: new Date().toISOString(),
    });
    setNewPay({ ...newPay, amount: "", description: "" });
  };

  const sum = summarizePayments(payments);

  return (
    <div className="space-y-4">
      <Card title="Offene Reparaturen">
        <div className="space-y-2">
          {repairs.length === 0 && <div className="text-[12px] text-[#A8A29E]">Keine Reparaturen erfasst.</div>}
          {repairs.map((r) => {
            const st = REPAIR_STATUS_STYLE[r.status];
            return (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-[8px] border border-[#EAE6DF]">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1C1917] truncate">{r.title}</div>
                  <div className="text-[11px] text-[#A8A29E]">{r.datum} · {fmtEUR(r.kosten ?? 0)}</div>
                </div>
                <select
                  value={r.status}
                  onChange={(e) => updateRepair(r.id, { status: e.target.value as typeof r.status })}
                  className="text-[11px] font-medium px-2 py-1 rounded-[6px] border-none outline-none"
                  style={{ background: st.bg, color: st.fg }}
                >
                  <option>Offen</option>
                  <option>In Arbeit</option>
                  <option>Erledigt</option>
                </select>
                <button onClick={() => removeRepair(r.id)} className="text-[#A8A29E] hover:text-[#DC2626]">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            placeholder="Titel"
            value={newRepair.title}
            onChange={(e) => setNewRepair({ ...newRepair, title: e.target.value })}
            className={inputCls + " flex-1"}
          />
          <input
            type="number"
            placeholder="Kosten €"
            value={newRepair.kosten}
            onChange={(e) => setNewRepair({ ...newRepair, kosten: e.target.value })}
            className={inputCls + " w-32"}
          />
          <button
            onClick={addRepair}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#2D6A4F] text-white px-3 text-[12px] font-medium hover:bg-[#235940]"
          >
            <Plus className="w-3.5 h-3.5" /> Reparatur
          </button>
        </div>
      </Card>

      <Card title="Rechnungen & Belege">
        <div className="space-y-2 mb-3">
          {payments.length === 0 && <div className="text-[12px] text-[#A8A29E]">Noch keine Zahlungen erfasst.</div>}
          {payments.map((pay) => {
            const isInc = pay.direction === "Einnahme";
            return (
              <div key={pay.id} className="flex items-center gap-3 p-2 rounded-[8px] border border-[#EAE6DF]">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1C1917] truncate">{pay.description || pay.category}</div>
                  <div className="text-[11px] text-[#A8A29E]">{pay.date} · {pay.category}</div>
                </div>
                <div className="text-[13px] tabular-nums font-semibold" style={{ color: isInc ? "#2D6A4F" : "#DC2626" }}>
                  {isInc ? "+" : "−"}{fmtEUR(pay.amount)}
                </div>
                <button onClick={() => deletePayment(pay.id)} className="text-[#A8A29E] hover:text-[#DC2626]">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-12 gap-2">
          <select
            value={newPay.direction}
            onChange={(e) => {
              const dir = e.target.value as "Einnahme" | "Ausgabe";
              setNewPay({
                ...newPay,
                direction: dir,
                category: (dir === "Einnahme" ? EINNAHME_KATEGORIEN[0] : AUSGABE_KATEGORIEN[0]) as PaymentKategorie,
              });
            }}
            className={inputCls + " col-span-2"}
          >
            <option>Ausgabe</option>
            <option>Einnahme</option>
          </select>
          <select
            value={newPay.category}
            onChange={(e) => setNewPay({ ...newPay, category: e.target.value as PaymentKategorie })}
            className={inputCls + " col-span-3"}
          >
            {(newPay.direction === "Einnahme" ? EINNAHME_KATEGORIEN : AUSGABE_KATEGORIEN).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input
            type="date"
            value={newPay.date}
            onChange={(e) => setNewPay({ ...newPay, date: e.target.value })}
            className={inputCls + " col-span-2"}
          />
          <input
            type="number"
            placeholder="Betrag €"
            value={newPay.amount}
            onChange={(e) => setNewPay({ ...newPay, amount: e.target.value })}
            className={inputCls + " col-span-2"}
          />
          <input
            placeholder="Bezeichnung"
            value={newPay.description}
            onChange={(e) => setNewPay({ ...newPay, description: e.target.value })}
            className={inputCls + " col-span-2"}
          />
          <button
            onClick={submitPayment}
            className="col-span-1 inline-flex items-center justify-center rounded-[8px] bg-[#2D6A4F] text-white text-[12px] font-medium hover:bg-[#235940]"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>

      <Card title="Zusammenfassung">
        <div className="grid grid-cols-3 gap-3">
          <Mini label="Einnahmen gesamt" value={fmtEUR(sum.einnahmenGesamt)} color="#2D6A4F" />
          <Mini label="Ausgaben gesamt" value={fmtEUR(sum.ausgabenGesamt)} color="#DC2626" />
          <Mini
            label="Netto-Cashflow"
            value={fmtEUR(sum.nettoCashflow)}
            color={sum.nettoCashflow >= 0 ? "#2D6A4F" : "#DC2626"}
          />
        </div>
      </Card>
    </div>
  );
}

/* ─────────── Helpers ─────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] bg-white border border-[#EAE6DF] p-5">
      <div className="text-[13px] font-semibold text-[#1C1917] mb-3" style={bricolage}>{title}</div>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-[12px] bg-white border border-[#EAE6DF] p-4">
      <div className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-medium">{label}</div>
      <div className="tabular-nums mt-1" style={{ ...bricolage, fontWeight: 700, fontSize: 22, color: color ?? "#1C1917" }}>
        {value}
      </div>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-medium">{label}</div>
      <div className="tabular-nums" style={{ ...bricolage, fontWeight: 700, fontSize: 16, color: color ?? "#1C1917" }}>
        {value}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  );
}

function NumInput({
  value,
  onCommit,
  step,
}: {
  value: number | null | undefined;
  onCommit: (v: number | null) => void;
  step?: number;
}) {
  const [local, setLocal] = useState<string>(value == null ? "" : String(value));
  return (
    <input
      type="number"
      step={step ?? "any"}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = local === "" ? null : Number(local);
        onCommit(Number.isFinite(n as number) ? (n as number) : null);
      }}
      className={inputCls}
    />
  );
}
