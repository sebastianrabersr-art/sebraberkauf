import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useActiveAssumptions, useActiveProject, useStore } from "@/lib/store";
import { calcDataQuality, calcProperty, calcScore, fmtEUR, fmtPct, googleMapsUrl, inferMietrecht, isValidUrl } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { useMemo, useState } from "react";
import { Download, ExternalLink, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/properties/")({
  head: () => ({ meta: [{ title: "Immobilien-Datenbank – Immo Invest" }] }),
  component: PropertiesList,
});

type SortKey = "score" | "kaufpreis" | "preisM2" | "brutto" | "netto" | "cashflow" | "dq" | "createdAt";

function exportCSV(rows: any[]) {
  const headers = ["ID","Projekt","Status","Score","Entscheidung","Link","Titel","Bezirk","Kaufpreis","Fläche","Preis/m²","Zimmer","Baujahr","Miete","Brutto","Netto","Cashflow","LTV","Datenqualität","Mietrecht","Zustand","Fehlend"];
  const csv = [
    headers.join(";"),
    ...rows.map(({p,c,s,dq,projectName}) => [
      p.id, projectName, p.status, s.total, s.entscheidung, p.link, p.title, p.bezirk,
      p.kaufpreis ?? "", p.wohnflaecheM2 ?? "", Math.round(c.preisProM2), p.zimmer ?? "", p.baujahr ?? "",
      p.nettomieteMtl ?? "", (c.bruttorendite*100).toFixed(2), (c.nettorendite*100).toFixed(2),
      Math.round(c.cashflowMtl), (c.ltv*100).toFixed(1), dq.score, p.mietrecht, p.zustand,
      [...p.missingData, ...dq.missing].join("|"),
    ].map((v)=>`"${String(v).replaceAll('"','""')}"`).join(";")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `immobilien-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function PropertiesList() {
  const navigate = useNavigate();
  const { properties, projects, deleteProperty, deleteDemoData } = useStore();
  const activeProject = useActiveProject();
  const assumptions = useActiveAssumptions();
  const [statusFilter, setStatusFilter] = useState("all");
  const [bezirkFilter, setBezirkFilter] = useState("");
  const [mietrechtFilter, setMietrechtFilter] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [minDQ, setMinDQ] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [scopeAll, setScopeAll] = useState(false);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    return properties
      .filter((p) => (scopeAll ? true : p.projectId === activeProject.id))
      .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
      .filter((p) => (mietrechtFilter === "all" ? true : p.mietrecht === mietrechtFilter))
      .filter((p) => (bezirkFilter ? (p.bezirk || "").toLowerCase().includes(bezirkFilter.toLowerCase()) : true))
      .filter((p) => (search ? (p.title + p.bezirk + p.adresse + p.platform).toLowerCase().includes(search.toLowerCase()) : true))
      .map((p) => {
        const c = calcProperty(p, assumptions);
        const s = calcScore(p, assumptions, c);
        const dq = calcDataQuality(p);
        return { p, c, s, dq, projectName: projectName(p.projectId) };
      })
      .filter((r) => r.s.total >= minScore && r.dq.score >= minDQ)
      .sort((a, b) => {
        switch (sort) {
          case "kaufpreis": return (b.p.kaufpreis ?? 0) - (a.p.kaufpreis ?? 0);
          case "preisM2": return b.c.preisProM2 - a.c.preisProM2;
          case "brutto": return b.c.bruttorendite - a.c.bruttorendite;
          case "netto": return b.c.nettorendite - a.c.nettorendite;
          case "cashflow": return b.c.cashflowMtl - a.c.cashflowMtl;
          case "dq": return b.dq.score - a.dq.score;
          case "createdAt": return b.p.createdAt.localeCompare(a.p.createdAt);
          default: return b.s.total - a.s.total;
        }
      });
  }, [properties, assumptions, activeProject.id, scopeAll, statusFilter, mietrechtFilter, bezirkFilter, search, sort, minScore, minDQ, projects]);

  const hasDemo = properties.some((p) => p.isDemo);

  return (
    <AppShell>
      <PageHeader
        title="Immobilien-Datenbank"
        description={`${rows.length} Objekte${scopeAll ? " (alle Projekte)" : ` im Projekt „${activeProject.name}"`}.`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link to="/properties/new" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <Plus className="size-4" /> Manuell hinzufügen
            </Link>
            <Link to="/analyze" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">
              Link analysieren
            </Link>
            <button onClick={() => exportCSV(rows)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <Download className="size-4" /> CSV
            </button>
            {hasDemo && (
              <button onClick={() => { if (confirm("Alle Demo-Daten (Beispielprojekt + Seed-Immobilien) löschen?")) { deleteDemoData(); toast.success("Demo-Daten entfernt."); }}} className="rounded-md border px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                Demo-Daten löschen
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
        <input placeholder="Suche…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm col-span-2" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border bg-background px-2 py-2 text-sm">
          <option value="all">Status: alle</option>
          {["Neu","Prüfen","Interessant","Besichtigung","Angebot","Abgelehnt","Gekauft"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={mietrechtFilter} onChange={(e) => setMietrechtFilter(e.target.value)} className="rounded-md border bg-background px-2 py-2 text-sm">
          <option value="all">Mietrecht: alle</option>
          {["Neubau / freie Miete","Teilanwendung MRG","Altbau / Richtwert möglich","unklar – rechtlich prüfen","nicht geeignet"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="Bezirk…" value={bezirkFilter} onChange={(e) => setBezirkFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-md border bg-background px-2 py-2 text-sm">
          <option value="score">Sort: Score</option>
          <option value="kaufpreis">Kaufpreis</option>
          <option value="preisM2">Preis/m²</option>
          <option value="brutto">Bruttorendite</option>
          <option value="netto">Nettorendite</option>
          <option value="cashflow">Cashflow</option>
          <option value="dq">Datenqualität</option>
          <option value="createdAt">Datum</option>
        </select>
        <label className="text-xs flex items-center gap-1 px-2 py-2 border rounded-md bg-background">
          Score≥<input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-12 bg-transparent outline-none" />
        </label>
        <label className="text-xs flex items-center gap-1 px-2 py-2 border rounded-md bg-background">
          DQ%≥<input type="number" value={minDQ} onChange={(e) => setMinDQ(Number(e.target.value))} className="w-12 bg-transparent outline-none" />
        </label>
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <input type="checkbox" checked={scopeAll} onChange={(e) => setScopeAll(e.target.checked)} />
        Alle Projekte anzeigen (sonst nur aktives Projekt)
      </label>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr className="border-b">
                {[
                  ["Score","Gesamtbewertung aus Lage, Zahlen, Vermietbarkeit, Zustand, Recht, Wiederverkauf"],
                  ["Status","Aktueller CRM-Status"],
                  ["Prio","Priorität für deine Pipeline"],
                  ["Titel","Inserats-Titel"],
                  ["Bezirk","Wiener Bezirk / Region"],
                  ["Kaufpreis","Kaufpreis brutto"],
                  ["m²","Wohnfläche"],
                  ["€/m²","Preis pro m²"],
                  ["Makler€","Maklerkosten brutto (Provision + USt)"],
                  ["NK gesamt","Kaufnebenkosten gesamt (inkl. Maklerkosten)"],
                  ["Gesamt­kapital","Gesamtkapitalbedarf = Kaufpreis + NK + Sanierung + Einrichtung + Reserve"],
                  ["Miete","Erwartete Nettomiete"],
                  ["Min-Miete","Benötigte Nettomiete für positiven Cashflow"],
                  ["Brutto","Bruttorendite"],
                  ["Cashflow","Monatlicher Cashflow"],
                  ["Mietrecht","Mietrechtliches Risiko (automatisch eingeschätzt)"],
                  ["DQ","Datenqualität – Anteil ausgefüllter Pflichtfelder"],
                  ["Nächste Aktion",""],["Verkäufer",""],["Links",""],["",""],
                ].map(([h,tip]) => (
                  <th key={h} title={tip} className="py-2.5 px-3 font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, c, s, dq, projectName }) => {
                const maps = googleMapsUrl(p);
                return (
                <tr
                  key={p.id}
                  className="border-b last:border-0 hover:bg-accent/30 cursor-pointer"
                  onClick={() => navigate({ to: "/properties/$id", params: { id: p.id } })}
                >
                  <td className="py-2.5 px-3"><div className="font-semibold">{s.total}</div><AmpelBadge ampel={s.ampel}>{s.entscheidung}</AmpelBadge></td>
                  <td className="py-2.5 px-3 text-xs"><span className="px-2 py-0.5 rounded bg-secondary">{p.status}</span></td>
                  <td className="py-2.5 px-3 text-xs">{p.priority ?? "—"}</td>
                  <td className="py-2.5 px-3 max-w-xs">
                    <div className="font-medium hover:underline">{p.title || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{projectName} · {p.platform}</div>
                  </td>
                  <td className="py-2.5 px-3">{p.bezirk || "—"}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{fmtEUR(p.kaufpreis)}</td>
                  <td className="py-2.5 px-3">{p.wohnflaecheM2 ?? "—"}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{fmtEUR(c.preisProM2)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-xs" title="Maklerkosten brutto inkl. USt">{fmtEUR(c.maklerProvisionBrutto)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-xs" title="Kaufnebenkosten gesamt inkl. Makler">{fmtEUR(c.kaufNebenkosten)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-xs" title="Gesamtkapitalbedarf">{fmtEUR(c.gesamtkosten)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {fmtEUR(p.nettomieteMtl)}
                    {p.nettomieteGeschaetzt && <div className="text-[10px] text-warning-foreground">geschätzt</div>}
                  </td>
                  <td className={`py-2.5 px-3 whitespace-nowrap text-xs ${p.nettomieteMtl && p.nettomieteMtl >= c.requiredBreakEvenRent ? "text-success" : "text-warning-foreground"}`} title="Mindestmiete für positiven Cashflow">
                    {fmtEUR(c.requiredBreakEvenRent)}
                    <div className="text-[10px] text-muted-foreground">{fmtEUR(c.requiredBreakEvenRentPerM2)}/m²</div>
                  </td>
                  <td className="py-2.5 px-3">{fmtPct(c.bruttorendite)}</td>
                  <td className={`py-2.5 px-3 whitespace-nowrap ${c.cashflowMtl < 0 ? "text-destructive" : "text-success"}`}>{fmtEUR(c.cashflowMtl)}</td>
                  <td className="py-2.5 px-3 text-xs" title="Mietrechtliches Risiko aus Baujahr/Beschreibung">
                    {(() => { const m = inferMietrecht(p); return <AmpelBadge ampel={m.risiko === "niedrig" ? "green" : m.risiko === "mittel" ? "yellow" : "red"}>{m.risiko}</AmpelBadge>; })()}
                  </td>
                  <td className="py-2.5 px-3"><AmpelBadge ampel={dq.ampel}>{dq.score}%</AmpelBadge></td>
                  <td className="py-2.5 px-3 text-xs">
                    {p.nextAction ? (
                      <>
                        <div className="truncate max-w-[140px]">{p.nextAction}</div>
                        {p.nextActionDate && <div className="text-[10px] text-muted-foreground">{p.nextActionDate}</div>}
                      </>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-xs">
                    <div className="truncate max-w-[140px]">{p.sellerName || p.sellerCompany || "—"}</div>
                    {p.sellerType && p.sellerType !== "unklar" && <div className="text-[10px] text-muted-foreground">{p.sellerType}</div>}
                  </td>
                  <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {isValidUrl(p.link) ? (
                        <a href={p.link} target="_blank" rel="noopener noreferrer" title="Original-Inserat" className="text-primary hover:underline">
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                      {maps && (
                        <a href={maps} target="_blank" rel="noopener noreferrer" title="Google Maps" className="text-primary hover:underline">
                          <MapPin className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { if (confirm("Wirklich löschen?")) { deleteProperty(p.id); toast.success("Gelöscht."); } }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={17} className="py-10 text-center text-muted-foreground">Keine Immobilien. Füge eine neue über „Link analysieren" oder „Manuell hinzufügen" hinzu.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
