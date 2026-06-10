import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import {
  calcDataQuality, calcProperty, calcScore, fmtEUR, fmtNum, fmtPct, getActiveFinance,
  isValidUrl,
} from "@/lib/calc";
import { ALL_STATUSES, type Property } from "@/lib/types";
import { ExternalLink, RotateCcw, GitCompareArrows } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/vergleich")({
  head: () => ({ meta: [{ title: "Vergleich – Immobilien gegenüberstellen" }] }),
  component: ComparePage,
});

type Dir = "higher" | "lower";

interface Row {
  key: string;
  label: string;
  fmt: (v: number | null | undefined) => string;
  dir?: Dir;
  values: (number | null | undefined)[];
  raw?: (string | null | undefined)[];
}

function ComparePage() {
  const { projects, properties } = useStore();
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [orteQuery, setOrteQuery] = useState<string>("");
  const [objektartFilter, setObjektartFilter] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  const project = projects.find((x) => x.id === projectFilter);
  const a = (project?.assumptions) ?? projects[0]?.assumptions;

  const objektarten = useMemo(
    () => Array.from(new Set(properties.map((p) => p.objekttyp).filter(Boolean))),
    [properties],
  );

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (projectFilter && p.projectId !== projectFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (objektartFilter && p.objekttyp !== objektartFilter) return false;
      if (orteQuery.trim()) {
        const q = orteQuery.toLowerCase();
        const hay = [p.bezirk, p.city, p.adresse, p.bundesland].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (minScore > 0) {
        const proj = projects.find((x) => x.id === p.projectId);
        const ass = proj?.assumptions ?? a;
        const c = calcProperty(p, ass);
        const s = calcScore(p, ass, c);
        if (s.total < minScore) return false;
      }
      return true;
    });
  }, [properties, projects, projectFilter, statusFilter, objektartFilter, orteQuery, minScore, a]);

  const toggle = (id: string) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 4) return cur;
      return [...cur, id];
    });
  };
  const resetAll = () => { setSelected([]); setStarted(false); };

  const items = useMemo(
    () => selected.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as Property[],
    [selected, properties],
  );

  return (
    <AppShell>
      <PageHeader
        title="Vergleich"
        description="2–4 Immobilien auswählen und nebeneinander vergleichen."
      />

      {/* Filter */}
      <div className="rounded-xl border bg-card p-4 mb-4">
        <div className="grid md:grid-cols-5 gap-3">
          <F label="Projekt">
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="inp">
              <option value="">Alle</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </F>
          <F label="Status">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="inp">
              <option value="">Alle</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </F>
          <F label="Stadt / Bezirk">
            <input value={orteQuery} onChange={(e) => setOrteQuery(e.target.value)} placeholder="z. B. 1070, Wien" className="inp" />
          </F>
          <F label="Objektart">
            <select value={objektartFilter} onChange={(e) => setObjektartFilter(e.target.value)} className="inp">
              <option value="">Alle</option>
              {objektarten.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </F>
          <F label={`Mindest-Score: ${minScore}`}>
            <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full" />
          </F>
        </div>
      </div>

      {/* Selection list */}
      <div className="rounded-xl border bg-card p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm font-medium">
            Auswahl: {selected.length} / 4
            {selected.length > 0 && selected.length < 2 && <span className="text-muted-foreground ml-2">— mind. 2 wählen</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStarted(true)}
              disabled={selected.length < 2}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <GitCompareArrows className="size-4" /> Vergleich starten
            </button>
            <button onClick={resetAll} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm">
              <RotateCcw className="size-4" /> Auswahl zurücksetzen
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Keine Immobilien passen zum Filter.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-auto pr-1">
            {filtered.map((p) => {
              const proj = projects.find((x) => x.id === p.projectId);
              const ass = proj?.assumptions ?? a;
              const c = calcProperty(p, ass);
              const s = calcScore(p, ass, c);
              const on = selected.includes(p.id);
              const disabled = !on && selected.length >= 4;
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  disabled={disabled}
                  className={`text-left rounded-md border px-3 py-2 text-sm transition ${
                    on ? "bg-primary/10 border-primary" : disabled ? "opacity-50" : "hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{p.title || "—"}</div>
                    <span className="text-[10px] rounded-full border px-1.5 py-0.5 tabular-nums">{s.total}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {[p.bezirk, p.city].filter(Boolean).join(", ") || "—"} · {p.objekttyp} · {p.status}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {started && items.length >= 2 && <Comparison items={items} a={a} projects={projects} />}

      <style>{`.inp { width:100%; border:1px solid hsl(var(--border)); background:hsl(var(--background)); border-radius:6px; padding:6px 10px; font-size:14px; }`}</style>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</label>;
}

function Comparison({ items, a, projects }: { items: Property[]; a: any; projects: any[] }) {
  // pre-compute
  const computed = items.map((p) => {
    const proj = projects.find((x) => x.id === p.projectId);
    const ass = proj?.assumptions ?? a;
    const c = calcProperty(p, ass);
    const s = calcScore(p, ass, c);
    const dq = calcDataQuality(p);
    const fin = getActiveFinance(p);
    const openQ = (p.openQuestions ?? []).filter((q) => q.status === "Offen").length;
    const aussen =
      (p.balkonM2 ?? 0) + (p.terrasseM2 ?? 0) + (p.gartenM2 ?? 0) + (p.kellerM2 ?? 0) + (p.aussenflaecheM2 ?? 0);
    return { p, c, s, dq, fin, openQ, aussen };
  });

  const riskRank = (r?: "niedrig" | "mittel" | "hoch"): number =>
    r === "niedrig" ? 1 : r === "mittel" ? 2 : r === "hoch" ? 3 : 0;

  const rows: Row[] = [
    section("Kauf & Kosten"),
    { key: "kp", label: "Kaufpreis", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.p.kaufpreis) },
    { key: "ppm2", label: "Preis pro m²", dir: "lower", fmt: (v) => fmtEUR(v, 0), values: computed.map((x) => x.c.preisProM2) },
    { key: "wfl", label: "Wohnfläche m²", dir: "higher", fmt: (v) => fmtNum(v), values: computed.map((x) => x.p.wohnflaecheM2) },
    { key: "aussen", label: "Außenfläche m²", dir: "higher", fmt: (v) => fmtNum(v), values: computed.map((x) => x.aussen) },
    { key: "makler", label: "Maklerkosten", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.maklerProvisionBrutto) },
    { key: "knk", label: "Kaufnebenkosten", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.kaufNebenkosten) },
    { key: "ges", label: "Gesamtkapitalbedarf", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.gesamtkosten) },

    section("Finanzierung"),
    { key: "kredit", label: "Kreditbetrag", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.kreditBetrag) },
    { key: "zins", label: "Zinssatz (aktiv)", dir: "lower", fmt: (v) => fmtPct(v, 2), values: computed.map((x) => x.fin?.zinssatz ?? null) },
    { key: "rate", label: "Monatliche Rate", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.kreditRateMtl) },
    { key: "lz", label: "Laufzeit (Jahre)", dir: "lower", fmt: (v) => fmtNum(v), values: computed.map((x) => x.fin?.laufzeitJahre ?? null) },
    { key: "dscr", label: "DSCR", dir: "higher", fmt: (v) => fmtNum(v, 2), values: computed.map((x) => x.c.dscr) },

    section("Miete & Cashflow"),
    { key: "miete", label: "Erwartete Miete (mtl.)", dir: "higher", fmt: fmtEUR, values: computed.map((x) => x.p.nettomieteMtl) },
    { key: "be", label: "Break-even-Miete (mtl.)", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.c.requiredBreakEvenRent) },
    { key: "cf", label: "Cashflow (mtl.)", dir: "higher", fmt: fmtEUR, values: computed.map((x) => x.c.cashflowMtl) },
    { key: "brutto", label: "Bruttorendite", dir: "higher", fmt: (v) => fmtPct(v, 2), values: computed.map((x) => x.c.bruttorendite) },
    { key: "netto", label: "Nettorendite", dir: "higher", fmt: (v) => fmtPct(v, 2), values: computed.map((x) => x.c.nettorendite) },
    { key: "ekr", label: "Eigenkapitalrendite", dir: "higher", fmt: (v) => fmtPct(v, 2), values: computed.map((x) => x.c.eigenkapitalrendite) },

    section("Risiko"),
    { key: "mietR", label: "Mietrechtliches Risiko", dir: "lower",
      fmt: (v) => (v === 1 ? "niedrig" : v === 2 ? "mittel" : v === 3 ? "hoch" : "—"),
      values: computed.map((x) => riskRank(x.p.mietrechtRisiko)) },
    { key: "zustand", label: "Zustand (Punkte)", dir: "higher", fmt: (v) => fmtNum(v), values: computed.map((x) => x.p.scoreZustand) },
    { key: "sanR", label: "Sanierungsrisiko (€)", dir: "lower", fmt: fmtEUR, values: computed.map((x) => x.p.sanierung) },
    { key: "dq", label: "Datenqualität", dir: "higher", fmt: (v) => v == null ? "—" : `${v}%`, values: computed.map((x) => x.dq.score) },
    { key: "fehlt", label: "Fehlende Daten", dir: "lower", fmt: (v) => fmtNum(v), values: computed.map((x) => x.dq.missing.length) },
    { key: "openQ", label: "Offene Fragen", dir: "lower", fmt: (v) => fmtNum(v), values: computed.map((x) => x.openQ) },
  ];

  // Charts data
  const chartData = computed.map((x, i) => ({
    name: (x.p.title || `#${i + 1}`).slice(0, 18),
    score: x.s.total,
    cashflow: Math.round(x.c.cashflowMtl),
    kapital: Math.round(x.c.gesamtkosten),
    netto: +(x.c.nettorendite * 100).toFixed(2),
    miete: Math.round(x.p.nettomieteMtl ?? 0),
    breakEven: Math.round(x.c.requiredBreakEvenRent),
  }));

  // Summary
  const summary = makeSummary(computed);

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className={`grid gap-3 ${items.length === 2 ? "md:grid-cols-2" : items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
        {computed.map((x) => (
          <PropertyCompareCard key={x.p.id} p={x.p} score={x.s.total} entscheidung={x.s.entscheidung} dq={x.dq.score} />
        ))}
      </div>

      {/* Comparison table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="py-2 px-3 w-56">Kennzahl</th>
              {computed.map((x) => (
                <th key={x.p.id} className="py-2 px-3 font-medium">{x.p.title || "—"}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              if ("isSection" in r && (r as any).isSection) {
                return (
                  <tr key={r.key} className="bg-muted/20">
                    <td colSpan={computed.length + 1} className="py-1.5 px-3 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{r.label}</td>
                  </tr>
                );
              }
              const tones = toneRow(r.values, r.dir);
              return (
                <tr key={r.key} className="border-t">
                  <td className="py-1.5 px-3 text-muted-foreground">{r.label}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className={`py-1.5 px-3 tabular-nums font-medium ${toneClass(tones[i])}`}>
                      {r.fmt(v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartBox title="Score je Immobilie" info={<ScoreInfo />}>
          <SimpleBar data={chartData} dataKey="score" />
        </ChartBox>
        <ChartBox title="Cashflow (mtl.) je Immobilie">
          <SimpleBar data={chartData} dataKey="cashflow" colorize />
        </ChartBox>
        <ChartBox title="Gesamtkapitalbedarf je Immobilie">
          <SimpleBar data={chartData} dataKey="kapital" lowerBetter />
        </ChartBox>
        <ChartBox title="Nettorendite (%) je Immobilie">
          <SimpleBar data={chartData} dataKey="netto" />
        </ChartBox>
        <ChartBox title="Break-even-Miete vs. erwartete Miete" wide>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="miete" name="Erwartete Miete" fill="hsl(var(--primary))" />
              <Bar dataKey="breakEven" name="Break-even" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      {/* Summary */}
      <div className="rounded-xl border bg-card p-5 space-y-2">
        <div className="font-semibold">Automatische Einschätzung</div>
        <ul className="text-sm space-y-1.5 list-disc pl-5">
          {summary.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
        <div className="text-xs text-muted-foreground pt-2 border-t mt-3">
          Die Bewertung ist eine Orientierung und ersetzt keine professionelle Prüfung.
        </div>
      </div>
    </div>
  );
}

function section(label: string): Row {
  return { key: `sec-${label}`, label, fmt: () => "", values: [], ...({ isSection: true } as any) } as any;
}

function toneRow(values: (number | null | undefined)[], dir?: Dir): ("best" | "worst" | "")[] {
  if (!dir) return values.map(() => "");
  const nums = values.map((v) => (v == null || !isFinite(v as number) ? null : (v as number)));
  const valid = nums.filter((v): v is number => v != null);
  if (valid.length < 2) return values.map(() => "");
  const best = dir === "higher" ? Math.max(...valid) : Math.min(...valid);
  const worst = dir === "higher" ? Math.min(...valid) : Math.max(...valid);
  if (best === worst) return values.map(() => "");
  return nums.map((v) => (v == null ? "" : v === best ? "best" : v === worst ? "worst" : ""));
}
function toneClass(t: "best" | "worst" | "") {
  if (t === "best") return "text-success";
  if (t === "worst") return "text-destructive";
  return "";
}

function PropertyCompareCard({ p, score, entscheidung, dq }: { p: Property; score: number; entscheidung: string; dq: number }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="aspect-video bg-muted/40 grid place-items-center text-xs text-muted-foreground">
        {/* placeholder if no image */}
        kein Bild
      </div>
      <div className="p-4 space-y-2">
        <div className="font-semibold leading-tight">{p.title || "—"}</div>
        <div className="text-xs text-muted-foreground">
          {[p.adresse, p.bezirk, p.city].filter(Boolean).join(", ") || "—"}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Badge>{p.status}</Badge>
          <Badge>Score {score}</Badge>
          <Badge>{entscheidung}</Badge>
          <Badge>Daten {dq}%</Badge>
        </div>
        <div className="flex gap-2 pt-1">
          <Link to="/properties/$id" params={{ id: p.id }} className="text-xs text-primary underline inline-flex items-center gap-1">
            Detail öffnen
          </Link>
          {isValidUrl(p.link) && (
            <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline inline-flex items-center gap-1">
              Inserat <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border bg-muted/40 px-2 py-0.5">{children}</span>;
}

function ChartBox({ title, info, children, wide }: { title: string; info?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${wide ? "md:col-span-2" : ""}`}>
      <div className="text-sm font-medium mb-2 inline-flex items-center gap-1.5">{title}{info}</div>
      {children}
    </div>
  );
}
function SimpleBar({ data, dataKey, lowerBetter, colorize }: { data: any[]; dataKey: string; lowerBetter?: boolean; colorize?: boolean }) {
  const vals = data.map((d) => d[dataKey] as number);
  const best = lowerBetter ? Math.min(...vals) : Math.max(...vals);
  const worst = lowerBetter ? Math.max(...vals) : Math.min(...vals);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey={dataKey}>
          {data.map((d, i) => {
            const v = d[dataKey] as number;
            let fill = "hsl(var(--primary))";
            if (best !== worst) {
              if (v === best) fill = "hsl(var(--success, 142 72% 38%))";
              else if (v === worst) fill = "hsl(var(--destructive))";
            }
            if (colorize && v < 0) fill = "hsl(var(--destructive))";
            return <Cell key={i} fill={fill} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface Computed {
  p: Property;
  c: ReturnType<typeof calcProperty>;
  s: ReturnType<typeof calcScore>;
  dq: ReturnType<typeof calcDataQuality>;
  fin: ReturnType<typeof getActiveFinance>;
  openQ: number;
  aussen: number;
}
function makeSummary(items: Computed[]): string[] {
  const out: string[] = [];
  if (items.length === 0) return out;

  const byScore = [...items].sort((a, b) => b.s.total - a.s.total);
  const best = byScore[0];
  out.push(`Rechnerisch am besten: „${best.p.title || "—"}" mit Score ${best.s.total} und Cashflow ${fmtEUR(best.c.cashflowMtl)}/Monat.`);

  // Risk-adjusted: netto rendite / (riskRank avg)
  const riskRank = (r?: "niedrig" | "mittel" | "hoch") => (r === "niedrig" ? 1 : r === "mittel" ? 2 : r === "hoch" ? 3 : 2);
  const byRR = [...items].sort((a, b) => {
    const ra = a.c.nettorendite / riskRank(a.p.mietrechtRisiko);
    const rb = b.c.nettorendite / riskRank(b.p.mietrechtRisiko);
    return rb - ra;
  });
  out.push(`Bestes Risiko-Rendite-Verhältnis: „${byRR[0].p.title || "—"}" (Nettorendite ${fmtPct(byRR[0].c.nettorendite, 2)}, Mietrechtsrisiko ${byRR[0].p.mietrechtRisiko ?? "unbekannt"}).`);

  const unsicher = [...items].sort((a, b) => b.dq.missing.length - a.dq.missing.length)[0];
  if (unsicher.dq.missing.length > 0) {
    out.push(`Wegen fehlender Daten unsicher: „${unsicher.p.title || "—"}" — ${unsicher.dq.missing.length} fehlende Felder (${unsicher.dq.missing.slice(0, 3).join(", ")}${unsicher.dq.missing.length > 3 ? ", …" : ""}).`);
  }

  const zumPruefen = [...items].sort((a, b) => (b.openQ + b.dq.missing.length) - (a.openQ + a.dq.missing.length))[0];
  out.push(`Am meisten zu prüfen: „${zumPruefen.p.title || "—"}" — ${zumPruefen.openQ} offene Fragen + ${zumPruefen.dq.missing.length} fehlende Datenfelder.`);

  return out;
}
