import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import { calcProperty, calcScore, fmtEUR, fmtPct } from "@/lib/calc";
import { AmpelBadge } from "@/components/AmpelBadge";
import { useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/properties/")({
  head: () => ({ meta: [{ title: "Immobilien-Datenbank – Immo Invest" }] }),
  component: PropertiesList,
});

function exportCSV(rows: any[]) {
  const headers = [
    "ID","Status","Score","Entscheidung","Link","Titel","Bezirk","Kaufpreis","Fläche","Preis/m²","Zimmer","Baujahr","Miete","Brutto","Netto","Cashflow","LTV","Mietrecht","Zustand","Fehlend",
  ];
  const csv = [
    headers.join(";"),
    ...rows.map(({p,c,s}) => [
      p.id,p.status,s.total,s.entscheidung,p.link,p.title,p.bezirk,p.kaufpreis??"",p.wohnflaecheM2??"",
      Math.round(c.preisProM2),p.zimmer??"",p.baujahr??"",p.nettomieteMtl??"",
      (c.bruttorendite*100).toFixed(2),(c.nettorendite*100).toFixed(2),Math.round(c.cashflowMtl),
      (c.ltv*100).toFixed(1),p.mietrecht,p.zustand,p.missingData.join("|"),
    ].map((v)=>`"${String(v).replaceAll('"','""')}"`).join(";")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `immobilien-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function PropertiesList() {
  const { properties, assumptions, deleteProperty } = useStore();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return properties
      .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
      .filter((p) => (search ? (p.title + p.bezirk + p.adresse).toLowerCase().includes(search.toLowerCase()) : true))
      .map((p) => {
        const c = calcProperty(p, assumptions);
        const s = calcScore(p, assumptions, c);
        return { p, c, s };
      })
      .sort((a, b) => b.s.total - a.s.total);
  }, [properties, assumptions, statusFilter, search]);

  return (
    <AppShell>
      <PageHeader
        title="Immobilien-Datenbank"
        description={`${properties.length} Objekte gespeichert.`}
        actions={
          <button
            onClick={() => exportCSV(rows)}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            <Download className="size-4" /> CSV Export
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder="Suche…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm flex-1 min-w-48"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Alle Status</option>
          {["Neu","Prüfen","Interessant","Besichtigung","Angebot","Abgelehnt","Gekauft"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr className="border-b">
                {["Score","Status","Titel","Bezirk","Kaufpreis","m²","€/m²","Miete","Brutto","Cashflow","LTV","Mietrecht","Fehlend",""].map((h) => (
                  <th key={h} className="py-2.5 px-3 font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, c, s }) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-accent/30">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold">{s.total}</div>
                    <AmpelBadge ampel={s.ampel}>{s.entscheidung}</AmpelBadge>
                  </td>
                  <td className="py-2.5 px-3 text-xs"><span className="px-2 py-0.5 rounded bg-secondary">{p.status}</span></td>
                  <td className="py-2.5 px-3 max-w-xs">
                    <Link to="/properties/$id" params={{ id: p.id }} className="font-medium hover:underline">
                      {p.title || "—"}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">{p.platform}</div>
                  </td>
                  <td className="py-2.5 px-3">{p.bezirk || "—"}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{fmtEUR(p.kaufpreis)}</td>
                  <td className="py-2.5 px-3">{p.wohnflaecheM2 ?? "—"}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{fmtEUR(c.preisProM2)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {fmtEUR(p.nettomieteMtl)}
                    {p.nettomieteGeschaetzt && <div className="text-[10px] text-warning-foreground">geschätzt</div>}
                  </td>
                  <td className="py-2.5 px-3">{fmtPct(c.bruttorendite)}</td>
                  <td className={`py-2.5 px-3 whitespace-nowrap ${c.cashflowMtl < 0 ? "text-destructive" : "text-success"}`}>
                    {fmtEUR(c.cashflowMtl)}
                  </td>
                  <td className="py-2.5 px-3">{fmtPct(c.ltv, 0)}</td>
                  <td className="py-2.5 px-3 text-xs">{p.mietrecht}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{p.missingData.length || "—"}</td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => {
                        if (confirm("Wirklich löschen?")) {
                          deleteProperty(p.id);
                          toast.success("Gelöscht.");
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-muted-foreground">
                    Keine Immobilien. Füge eine neue über „Link analysieren" hinzu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
