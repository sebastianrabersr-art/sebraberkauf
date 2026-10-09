import { useRef, useState } from "react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useServerFn } from "@tanstack/react-start";
import { extractFromPdf, type PdfExtracted } from "@/lib/extract.functions";
import { useStore } from "@/lib/store";
import type { PropertyDocument, Property } from "@/lib/types";
import { toast } from "sonner";
import { ArrowSquareOut as ExternalLink, FileText, CircleNotch as Loader2, Trash as Trash2, UploadSimple as Upload } from "@phosphor-icons/react";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

// Map PDF-extracted keys -> Property keys (with labels for the diff dialog)
const FIELD_MAP: { pdf: keyof PdfExtracted; prop: keyof Property; label: string; transform?: (v: any) => any }[] = [
  { pdf: "title", prop: "title", label: "Titel" },
  { pdf: "purchase_price", prop: "kaufpreis", label: "Kaufpreis" },
  { pdf: "purchase_price_net", prop: "kaufpreisNetto", label: "Kaufpreis netto" },
  { pdf: "purchase_price_gross", prop: "kaufpreisBrutto", label: "Kaufpreis brutto" },
  { pdf: "living_area_m2", prop: "wohnflaecheM2", label: "Wohnfläche m²" },
  { pdf: "outdoor_area_m2", prop: "aussenflaecheM2", label: "Außenfläche m²" },
  { pdf: "balcony_m2", prop: "balkonM2", label: "Balkon m²" },
  { pdf: "terrace_m2", prop: "terrasseM2", label: "Terrasse m²" },
  { pdf: "garden_m2", prop: "gartenM2", label: "Garten m²" },
  { pdf: "basement_m2", prop: "kellerM2", label: "Keller m²" },
  { pdf: "rooms", prop: "zimmer", label: "Zimmer" },
  { pdf: "bathrooms", prop: "badezimmer", label: "Badezimmer" },
  { pdf: "address", prop: "adresse", label: "Adresse" },
  { pdf: "district", prop: "bezirk", label: "Bezirk" },
  { pdf: "city", prop: "city", label: "Stadt" },
  { pdf: "state", prop: "bundesland", label: "Bundesland" },
  { pdf: "country", prop: "land", label: "Land" },
  { pdf: "year_built", prop: "baujahr", label: "Baujahr" },
  { pdf: "condition", prop: "zustand", label: "Zustand" },
  { pdf: "floor", prop: "stockwerk", label: "Stockwerk" },
  { pdf: "operating_costs", prop: "betriebskostenMtl", label: "Betriebskosten mtl." },
  { pdf: "heating_costs", prop: "heizkostenMtl", label: "Heizkosten mtl." },
  { pdf: "reserve_fund", prop: "ruecklageMtl", label: "Rücklage mtl." },
  { pdf: "commission_eur", prop: "provisionEUR", label: "Provision €" },
  { pdf: "commission_pct", prop: "provisionPct", label: "Provision %" },
  { pdf: "seller_name", prop: "sellerName", label: "Verkäufer / Makler Name" },
  { pdf: "seller_company", prop: "sellerCompany", label: "Firma" },
  { pdf: "seller_phone", prop: "sellerPhone", label: "Telefon" },
  { pdf: "seller_email", prop: "sellerEmail", label: "E-Mail" },
  { pdf: "seller_website", prop: "sellerWebsite", label: "Website" },
  { pdf: "energy_class", prop: "energyClass", label: "Energieklasse" },
  { pdf: "hwb", prop: "hwb", label: "HWB" },
  { pdf: "fgee", prop: "fgee", label: "fGEE" },
  { pdf: "heating_type", prop: "heizungstyp", label: "Heizungstyp" },
  { pdf: "description", prop: "beschreibung", label: "Beschreibung" },
  { pdf: "features", prop: "ausstattung", label: "Ausstattung" },
  { pdf: "availability", prop: "verfuegbarkeit", label: "Verfügbarkeit" },
  { pdf: "has_elevator", prop: "hasElevator", label: "Lift" },
  { pdf: "has_balcony", prop: "hasBalkon", label: "Balkon" },
  { pdf: "has_terrace", prop: "hasTerrasse", label: "Terrasse" },
  { pdf: "has_garden", prop: "hasGarten", label: "Garten" },
  { pdf: "has_basement", prop: "hasKeller", label: "Keller" },
  { pdf: "has_parking", prop: "hasStellplatz", label: "Stellplatz" },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

interface Props {
  propertyId: string;
  onAfterApply?: () => void;
  /** override: if provided, apply receives the patch instead of writing to store */
  onApplyPatch?: (patch: Partial<Property>) => void;
}

export function PdfUploader({ propertyId, onAfterApply, onApplyPatch }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const extract = useServerFn(extractFromPdf);
  const { documents, addDocument, deleteDocument, updateDocument, updateProperty, properties } = useStore();
  const { confirm } = useConfirmDialog();
  const property = properties.find((p) => p.id === propertyId);
  const docs = documents.filter((d) => d.propertyId === propertyId);
  const [busy, setBusy] = useState(false);
  const [diffDoc, setDiffDoc] = useState<PropertyDocument | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== "application/pdf") { toast.error("Bitte nur PDF-Dateien hochladen."); return; }
    if (file.size > MAX_PDF_BYTES) { toast.error("PDF zu groß (max 8 MB)."); return; }
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const base64 = dataUrl.split(",")[1] ?? "";
      const doc: PropertyDocument = {
        id: crypto.randomUUID(), propertyId, fileName: file.name, fileType: file.type,
        fileSize: file.size, fileDataUrl: dataUrl, uploadDate: new Date().toISOString(),
        extractionStatus: "pending", category: "Exposé",
      };
      addDocument(doc);
      const res = await extract({ data: { pdfBase64: base64, fileName: file.name } });
      if (!res.ok) {
        updateDocument(doc.id, { extractionStatus: "failed", notes: res.error });
        toast.error(res.error);
        return;
      }
      const d = res.data;
      const extractedFields: Record<string, unknown> = {};
      const missing: string[] = [...(d.missing_data || [])];
      for (const m of FIELD_MAP) {
        const v = d[m.pdf];
        if (v !== null && v !== undefined && v !== "") extractedFields[m.label] = v;
        else missing.push(m.label);
      }
      updateDocument(doc.id, { extractionStatus: "ok", extractedFields, missingFields: missing, notes: d.notes });
      // open diff dialog with pre-selected non-empty fields
      const docWithData = { ...doc, extractionStatus: "ok" as const, extractedFields, missingFields: missing };
      const presel: Record<string, boolean> = {};
      for (const m of FIELD_MAP) {
        const v = d[m.pdf];
        if (v !== null && v !== undefined && v !== "") presel[m.pdf as string] = true;
      }
      setSelected(presel);
      setDiffDoc(docWithData);
      toast.success(`Extraktion abgeschlossen: ${Object.keys(extractedFields).length} Felder gefunden.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Hochladen.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applySelected = () => {
    if (!diffDoc || !property) return;
    const patch: Partial<Property> = {};
    // We need original PDF data again — store extractedFields by label, but transform needs raw value.
    // Re-derive by checking extractedFields (the raw value was stored there with .label as key).
    for (const m of FIELD_MAP) {
      if (!selected[m.pdf as string]) continue;
      const raw = diffDoc.extractedFields?.[m.label];
      if (raw === undefined || raw === null || raw === "") continue;
      (patch as any)[m.prop] = m.transform ? m.transform(raw) : raw;
    }
    if (onApplyPatch) onApplyPatch(patch);
    else updateProperty(propertyId, patch);
    toast.success(`${Object.keys(patch).length} Felder übernommen.`);
    setDiffDoc(null);
    onAfterApply?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => handleFiles(e.target.files)} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          PDF hochladen & extrahieren
        </button>
        <span className="text-xs text-muted-foreground">PDF wird lokal gespeichert (max 8 MB).</span>
      </div>

      {docs.length > 0 && (
        <div className="rounded-md border divide-y">
          {docs.map((d) => (
            <div key={d.id} className="p-3 flex items-center gap-3 text-sm">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{d.fileName}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(d.uploadDate).toLocaleString("de-AT")} ·{" "}
                  {d.extractionStatus === "ok" && <span className="text-success">{Object.keys(d.extractedFields ?? {}).length} Felder erkannt</span>}
                  {d.extractionStatus === "pending" && "extrahiere…"}
                  {d.extractionStatus === "failed" && <span className="text-destructive">Extraktion fehlgeschlagen</span>}
                  {(d.missingFields?.length ?? 0) > 0 && d.extractionStatus === "ok" && ` · ${d.missingFields!.length} fehlend`}
                </div>
              </div>
              {d.extractionStatus === "ok" && (
                <button
                  onClick={() => {
                    const presel: Record<string, boolean> = {};
                    for (const m of FIELD_MAP) if (d.extractedFields?.[m.label] != null && d.extractedFields?.[m.label] !== "") presel[m.pdf as string] = true;
                    setSelected(presel); setDiffDoc(d);
                  }}
                  className="text-xs px-2 py-1 rounded border hover:bg-accent"
                >Daten übernehmen</button>
              )}
              <a href={d.fileDataUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded border hover:bg-accent inline-flex items-center gap-1">
                <ExternalLink className="size-3" /> Öffnen
              </a>
              <button onClick={async () => { if (await confirm({ title: "PDF löschen", message: `„${d.fileName}“ wird aus den Dokumenten dieser Immobilie entfernt.`, confirmLabel: "PDF löschen", danger: true })) deleteDocument(d.id); }} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {diffDoc && property && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDiffDoc(null)}>
          <div className="bg-card border rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <div className="font-semibold">Daten aus PDF übernehmen</div>
              <div className="text-xs text-muted-foreground">{diffDoc.fileName} – wähle die Felder, die übernommen werden sollen.</div>
            </div>
            <div className="overflow-y-auto p-4 space-y-1">
              {FIELD_MAP.filter((m) => diffDoc.extractedFields?.[m.label] != null && diffDoc.extractedFields?.[m.label] !== "").map((m) => {
                const current = (property as any)[m.prop];
                const next = diffDoc.extractedFields?.[m.label];
                const willOverwrite = current !== undefined && current !== null && current !== "" && String(current) !== String(next);
                return (
                  <label key={m.pdf as string} className="flex items-start gap-3 text-sm p-2 hover:bg-accent/40 rounded">
                    <input type="checkbox" className="mt-1" checked={!!selected[m.pdf as string]} onChange={(e) => setSelected((s) => ({ ...s, [m.pdf as string]: e.target.checked }))} />
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div className="font-medium">{m.label}{willOverwrite && <span className="ml-1 text-warning-foreground text-xs">(überschreibt)</span>}</div>
                      <div className="text-muted-foreground text-xs truncate">vorher: {String(current ?? "—")}</div>
                      <div className="text-xs truncate">neu: <strong>{String(next)}</strong></div>
                    </div>
                  </label>
                );
              })}
              {(diffDoc.missingFields?.length ?? 0) > 0 && (
                <div className="mt-4 text-xs text-muted-foreground border-t pt-3">
                  Nicht im PDF gefunden: {diffDoc.missingFields!.slice(0, 20).join(", ")}{diffDoc.missingFields!.length > 20 ? "…" : ""}
                </div>
              )}
            </div>
            <div className="p-3 border-t flex justify-end gap-2">
              <button onClick={() => setDiffDoc(null)} className="rounded-md border px-3 py-1.5 text-sm">Abbrechen</button>
              <button onClick={applySelected} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm">Übernehmen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
