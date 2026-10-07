import { useState } from "react";
import { X } from "@phosphor-icons/react";
import type { Property } from "@/lib/types";
import { exportPropertyPdf, type PropertyExportOptions } from "@/lib/pdfExport";

export function ExportPdfDialog({
  open,
  onClose,
  property,
  assumptions,
}: {
  open: boolean;
  onClose: () => void;
  property: Property;
  assumptions: any;
}) {
  const [opts, setOpts] = useState<PropertyExportOptions>({
    eckdaten: true,
    rendite: true,
    finanzierung: true,
    mietrecht: true,
    bewertung: false,
  });

  if (!open) return null;

  const toggle = (k: keyof PropertyExportOptions) => setOpts((o) => ({ ...o, [k]: !o[k] }));

  const items: { key: keyof PropertyExportOptions; label: string }[] = [
    { key: "eckdaten", label: "Eckdaten (Kaufpreis, Nebenkosten, Gesamtkapital, Monatliche Rate)" },
    { key: "rendite", label: "Rendite & Cashflow (Brutto-/Nettorendite, Cashflow, Break-even)" },
    { key: "finanzierung", label: "Finanzierung (aktives Szenario: Bank, Betrag, Zins, Rate, Laufzeit)" },
    { key: "mietrecht", label: "Mietrecht-Einschätzung (Risiko-Level + Kurztext)" },
    { key: "bewertung", label: "Meine Bewertung (Ø + einzelne Kategorien)" },
  ];

  const onDownload = () => {
    exportPropertyPdf(property, opts, assumptions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[520px] rounded-[12px] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#1C1917]">PDF exportieren</h2>
          <button onClick={onClose} className="text-ink-3 hover:text-[#1C1917]">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {items.map((it) => (
            <label key={it.key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={opts[it.key]}
                onChange={() => toggle(it.key)}
                className="mt-0.5 size-4 accent-[#2D6A4F] cursor-pointer"
              />
              <span className="text-[13px] text-[#1C1917] leading-snug">{it.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-[#EAE6DF] bg-white px-4 text-[13px] text-[#1C1917] hover:bg-[#FAFAF8]"
          >
            Abbrechen
          </button>
          <button
            onClick={onDownload}
            className="h-9 rounded-lg bg-[#2D6A4F] text-white px-4 text-[13px] font-medium hover:bg-[#235740]"
          >
            PDF herunterladen
          </button>
        </div>
      </div>
    </div>
  );
}
