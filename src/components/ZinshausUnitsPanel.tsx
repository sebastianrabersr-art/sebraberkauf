import { useState } from "react";
import { Check, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calcZinshaus, fmtEUR, fmtNum, fmtPct } from "@/lib/calc";
import type { Property, ZinshausUnit } from "@/lib/types";

/* Zinshaus → Tab "Einheiten": Liste aller Einheiten mit Inline-Bearbeitung und Dialog. */

const ZUSTAND_LABEL: Record<ZinshausUnit["zustand"], string> = {
  vermietet: "Vermietet",
  leer: "Leer",
  eigennutzung: "Eigennutzung",
};
const ZUSTAND_STYLE: Record<ZinshausUnit["zustand"], { bg: string; fg: string }> = {
  vermietet: { bg: "#E8F5EE", fg: "#2D6A4F" },
  leer: { bg: "#FEF3C7", fg: "#92400E" },
  eigennutzung: { bg: "#F5F3EE", fg: "#78716C" },
};

/**
 * Einheiten speichern und Miete/Fläche des Objekts mitführen: Score, Datenqualität, Steuer
 * und Projektion lesen nettomieteMtl/wohnflaecheM2 – die Rendite-Rechnung selbst aggregiert
 * direkt aus den Einheiten (calcZinshaus).
 */
export function unitsPatch(units: ZinshausUnit[]): Partial<Property> {
  const agg = calcZinshaus(units);
  return {
    units,
    nettomieteMtl: units.length ? Math.round(agg.totalMiete * 100) / 100 : null,
    wohnflaecheM2: units.length ? Math.round(agg.totalFlaeche * 100) / 100 : null,
  };
}

const emptyUnit = (n: number): ZinshausUnit => ({
  id: crypto.randomUUID(),
  name: `Top ${n}`,
  flaeche: 0,
  miete: 0,
  leerstand: 0,
  zustand: "vermietet",
});

const inputCls = "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-2.5 py-[7px] text-[13px] text-[#1C1917] focus:border-[#2D6A4F] outline-none";
const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")));

export function ZinshausUnitsPanel({ p, u }: { p: Property; u: (patch: Partial<Property>) => void }) {
  const units = p.units ?? [];
  const agg = calcZinshaus(units);
  const [dialogUnit, setDialogUnit] = useState<ZinshausUnit | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [inlineId, setInlineId] = useState<string | null>(null);
  const [inline, setInline] = useState<ZinshausUnit | null>(null);

  const save = (next: ZinshausUnit[]) => u(unitsPatch(next));

  const openNew = () => { setIsNew(true); setDialogUnit(emptyUnit(units.length + 1)); };
  const openEdit = (unit: ZinshausUnit) => { setIsNew(false); setDialogUnit({ ...unit }); setInlineId(null); };
  const remove = (unit: ZinshausUnit) => {
    if (!confirm(`Einheit „${unit.name}“ löschen?`)) return;
    save(units.filter((x) => x.id !== unit.id));
    toast.success("Einheit gelöscht.");
  };
  const startInline = (unit: ZinshausUnit) => { setInlineId(unit.id); setInline({ ...unit }); };
  const commitInline = () => {
    if (!inline) return;
    if (!inline.name.trim()) { toast.error("Bitte einen Namen angeben."); return; }
    save(units.map((x) => (x.id === inline.id ? { ...inline, name: inline.name.trim() } : x)));
    setInlineId(null);
    setInline(null);
  };
  const submitDialog = () => {
    if (!dialogUnit) return;
    if (!dialogUnit.name.trim()) { toast.error("Bitte einen Namen angeben."); return; }
    const clean = { ...dialogUnit, name: dialogUnit.name.trim() };
    save(isNew ? [...units, clean] : units.map((x) => (x.id === clean.id ? clean : x)));
    toast.success(isNew ? "Einheit hinzugefügt." : "Einheit gespeichert.");
    setDialogUnit(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-2">
          <span className="font-semibold text-[#1C1917] tabular-nums">{agg.einheiten}</span> {agg.einheiten === 1 ? "Einheit" : "Einheiten"}
          {" · "}Gesamtfläche: <span className="font-semibold text-[#1C1917] tabular-nums">{fmtNum(agg.totalFlaeche, 1)} m²</span>
          {" · "}Gesamtmiete: <span className="font-semibold text-[#1C1917] tabular-nums">{fmtEUR(agg.totalMiete)}/Mo</span>
        </p>
        <button
          id="zinshaus-add-unit"
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#2D6A4F] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#235740]"
        >
          <Plus className="size-3.5" aria-hidden /> Einheit hinzufügen
        </button>
      </div>

      {units.length === 0 ? (
        <div className="rounded-[10px] px-4 py-8 text-center" style={{ border: "1.5px dashed #D4CFC8", background: "#FAFAF8" }}>
          <div className="text-[13px] font-medium text-[#1C1917]">Noch keine Einheiten erfasst</div>
          <p className="mt-1 text-[12px] text-ink-2 max-w-md mx-auto">
            Lege jede Wohnung bzw. jedes Geschäftslokal mit Fläche und Kaltmiete an – Rendite und Cashflow werden dann über alle Einheiten berechnet.
          </p>
        </div>
      ) : (
        <div className="rounded-[10px] border border-[#EAE6DF] bg-white overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="text-left text-[11px] text-ink-3">
              <tr className="border-b border-[#EAE6DF]">
                <th className="px-4 py-2 font-normal">Name</th>
                <th className="px-2 py-2 font-normal text-right">Fläche</th>
                <th className="px-2 py-2 font-normal text-right">Miete</th>
                <th className="px-2 py-2 font-normal text-right">Leerstand</th>
                <th className="px-2 py-2 font-normal">Zustand</th>
                <th className="px-4 py-2"><span className="sr-only">Aktionen</span></th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const editing = inlineId === unit.id && inline;
                const st = ZUSTAND_STYLE[unit.zustand];
                if (editing) {
                  return (
                    <tr key={unit.id} className="border-b border-[#EAE6DF] last:border-0 bg-[#FAFAF8]">
                      <td className="px-4 py-2"><input autoFocus aria-label="Name" value={inline.name} onChange={(e) => setInline({ ...inline, name: e.target.value })} className={inputCls} /></td>
                      <td className="px-2 py-2 w-24"><input aria-label="Fläche in m²" type="number" min={0} value={inline.flaeche || ""} onChange={(e) => setInline({ ...inline, flaeche: num(e.target.value) })} className={inputCls + " text-right"} /></td>
                      <td className="px-2 py-2 w-28"><input aria-label="Kaltmiete pro Monat" type="number" min={0} value={inline.miete || ""} onChange={(e) => setInline({ ...inline, miete: num(e.target.value) })} className={inputCls + " text-right"} /></td>
                      <td className="px-2 py-2 w-24"><input aria-label="Leerstand in Prozent" type="number" min={0} max={100} value={inline.leerstand ? Math.round(inline.leerstand * 1000) / 10 : ""} onChange={(e) => setInline({ ...inline, leerstand: Math.min(100, num(e.target.value)) / 100 })} className={inputCls + " text-right"} /></td>
                      <td className="px-2 py-2 w-36">
                        <select aria-label="Zustand" value={inline.zustand} onChange={(e) => setInline({ ...inline, zustand: e.target.value as ZinshausUnit["zustand"] })} className={inputCls}>
                          {Object.entries(ZUSTAND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <button type="button" onClick={commitInline} aria-label="Übernehmen" className="rounded-full p-1.5 text-[#2D6A4F] hover:bg-[#E8F5EE]"><Check className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => { setInlineId(null); setInline(null); }} aria-label="Abbrechen" className="rounded-full p-1.5 text-ink-3 hover:bg-[#F5F3EE]"><X className="size-4" aria-hidden /></button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr
                    key={unit.id}
                    onClick={() => startInline(unit)}
                    className="border-b border-[#EAE6DF] last:border-0 cursor-pointer hover:bg-[#FAFAF8]"
                    title="Klicken zum Bearbeiten"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[#1C1917]">{unit.name}</div>
                      {unit.mieter && <div className="text-[11px] text-ink-3">{unit.mieter}</div>}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{fmtNum(unit.flaeche, 1)} m²</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{fmtEUR(unit.miete)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{unit.zustand === "vermietet" ? fmtPct(unit.leerstand, 1) : "—"}</td>
                    <td className="px-2 py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: st.bg, color: st.fg }}>{ZUSTAND_LABEL[unit.zustand]}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => openEdit(unit)} aria-label={`${unit.name} bearbeiten`} className="rounded-full p-1.5 text-ink-3 hover:text-[#2D6A4F] hover:bg-[#F5F3EE]"><PencilSimple className="size-4" aria-hidden /></button>
                      <button type="button" onClick={() => remove(unit)} aria-label={`${unit.name} löschen`} className="rounded-full p-1.5 text-ink-3 hover:text-[#DC2626] hover:bg-[#FEF2F2]"><Trash className="size-4" aria-hidden /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!dialogUnit} onOpenChange={(o) => !o && setDialogUnit(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>{isNew ? "Einheit hinzufügen" : "Einheit bearbeiten"}</DialogTitle>
            <DialogDescription>Miete und Fläche fließen in Rendite und Cashflow des Zinshauses ein.</DialogDescription>
          </DialogHeader>
          {dialogUnit && (
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block">
                <span className="block text-[11px] text-ink-2 mb-1">Name</span>
                <input value={dialogUnit.name} onChange={(e) => setDialogUnit({ ...dialogUnit, name: e.target.value })} placeholder="z. B. Top 1, EG links" className={inputCls} />
              </label>
              <label className="block">
                <span className="block text-[11px] text-ink-2 mb-1">Fläche (m²)</span>
                <input type="number" min={0} value={dialogUnit.flaeche || ""} onChange={(e) => setDialogUnit({ ...dialogUnit, flaeche: num(e.target.value) })} className={inputCls} />
              </label>
              <label className="block">
                <span className="block text-[11px] text-ink-2 mb-1">Kaltmiete (€/Mo)</span>
                <input type="number" min={0} value={dialogUnit.miete || ""} onChange={(e) => setDialogUnit({ ...dialogUnit, miete: num(e.target.value) })} className={inputCls} />
              </label>
              <label className="block">
                <span className="block text-[11px] text-ink-2 mb-1">Leerstand (%)</span>
                <input type="number" min={0} max={100} value={dialogUnit.leerstand ? Math.round(dialogUnit.leerstand * 1000) / 10 : ""} onChange={(e) => setDialogUnit({ ...dialogUnit, leerstand: Math.min(100, num(e.target.value)) / 100 })} className={inputCls} />
              </label>
              <label className="block">
                <span className="block text-[11px] text-ink-2 mb-1">Zustand</span>
                <select value={dialogUnit.zustand} onChange={(e) => setDialogUnit({ ...dialogUnit, zustand: e.target.value as ZinshausUnit["zustand"] })} className={inputCls}>
                  {Object.entries(ZUSTAND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] text-ink-2 mb-1">Mieter (optional)</span>
                <input value={dialogUnit.mieter ?? ""} onChange={(e) => setDialogUnit({ ...dialogUnit, mieter: e.target.value || undefined })} className={inputCls} />
              </label>
              <label className="block">
                <span className="block text-[11px] text-ink-2 mb-1">Mietbeginn (optional)</span>
                <input type="date" value={dialogUnit.mietbeginn ?? ""} onChange={(e) => setDialogUnit({ ...dialogUnit, mietbeginn: e.target.value || undefined })} className={inputCls} />
              </label>
            </div>
          )}
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setDialogUnit(null)} className="h-9 rounded-lg border border-[#EAE6DF] bg-white px-4 text-[13px] text-[#1C1917] hover:bg-[#FAFAF8]">Abbrechen</button>
            <button type="button" onClick={submitDialog} className="h-9 rounded-lg px-4 text-[13px] font-medium text-white hover:bg-[#235740]" style={{ background: "#2D6A4F" }}>Speichern</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Übersicht-Tab: Kennzahlen des Zinshauses über den normalen Rendite-/Cashflow-Kennzahlen. */
export function ZinshausSummary({ p, onGoUnits }: { p: Property; onGoUnits: () => void }) {
  const agg = calcZinshaus(p.units);
  const items = [
    { label: "Belegte Einheiten", value: `${agg.belegt} von ${agg.einheiten}` },
    { label: "Gesamtfläche", value: `${fmtNum(agg.totalFlaeche, 1)} m²` },
    { label: "Gesamtmiete (effektiv)", value: `${fmtEUR(agg.totalMiete)}/Mo` },
    { label: "Leerstandsquote", value: fmtPct(agg.leerstandsquote, 1) },
  ];
  return (
    <section className="rounded-[12px] border border-[#EAE6DF] bg-white px-5 py-4" aria-labelledby="zinshaus-summary">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 id="zinshaus-summary" className="text-[14px] font-semibold text-[#1C1917]">Zinshaus</h3>
        <button type="button" onClick={onGoUnits} className="text-[12px] font-medium text-[#2D6A4F] hover:underline">
          {agg.einheiten === 0 ? "Einheiten erfassen →" : "Einheiten bearbeiten →"}
        </button>
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="text-[11px] text-ink-3">{it.label}</dt>
            <dd className="mt-0.5 text-[16px] font-semibold tabular-nums text-[#1C1917]">{it.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
