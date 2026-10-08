import { useState } from "react";
import { X } from "@phosphor-icons/react";
import type { Assumptions, Property } from "@/lib/types";
import { useStore } from "@/lib/store";
import { pdfFileName } from "@/lib/pdfExport";
import { usePdfExport } from "@/components/pdf/PdfKit";
import { PropertyPdfDocument, type PropertyPdfSections } from "@/components/pdf/PropertyPdf";

const ITEMS: { key: keyof PropertyPdfSections; label: string; description: string }[] = [
  { key: "uebersicht", label: "Übersicht", description: "Kaufpreis, Rendite, Cashflow, Nebenkosten" },
  { key: "finanzierung", label: "Finanzierung", description: "Kreditrate, Tilgungsplan, Zinsentwicklung" },
  { key: "analysen", label: "Analysen", description: "Szenarien, Wertsteigerung, Cashflow-Prognose" },
  { key: "steuer", label: "Steuer & AfA", description: "AfA-Berechnung, Steuerersparnis" },
  { key: "besichtigung", label: "Besichtigung & Notizen", description: "Checkliste, eigene Notizen" },
];

export function ExportPdfDialog({
  open,
  onClose,
  property,
  assumptions,
}: {
  open: boolean;
  onClose: () => void;
  property: Property;
  assumptions: Assumptions;
}) {
  const [sections, setSections] = useState<PropertyPdfSections>({
    uebersicht: true,
    finanzierung: true,
    analysen: true,
    steuer: true,
    besichtigung: true,
  });
  const { viewings } = useStore();
  const pdf = usePdfExport();

  if (!open && !pdf.exporting) return null;

  const toggle = (k: keyof PropertyPdfSections) => setSections((s) => ({ ...s, [k]: !s[k] }));
  const anySelected = Object.values(sections).some(Boolean);

  const onCreate = () => {
    if (!anySelected) return;
    pdf.run(
      <PropertyPdfDocument
        p={property}
        a={assumptions}
        sections={sections}
        viewingChecks={viewings[property.id]?.checks}
      />,
      pdfFileName(property.title || property.bezirk || property.city || "objekt"),
      onClose,
    );
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 no-print" onClick={pdf.exporting ? undefined : onClose}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-export-title"
            className="w-full max-w-[460px] bg-white p-6"
            style={{ border: "1px solid #EAE6DF", borderRadius: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 id="pdf-export-title" className="text-[16px] font-semibold text-[#1C1917]">PDF exportieren</h2>
              <button onClick={onClose} disabled={pdf.exporting} aria-label="Schließen" className="text-ink-3 hover:text-[#1C1917]">
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-6">
              {ITEMS.map((it) => (
                <label
                  key={it.key}
                  className="flex items-center gap-3 cursor-pointer border-b border-[#F5F3EE] last:border-0"
                  style={{ minHeight: 44, fontFamily: "Inter, sans-serif", paddingBlock: 6 }}
                >
                  <input
                    type="checkbox"
                    checked={sections[it.key]}
                    onChange={() => toggle(it.key)}
                    className="size-4 cursor-pointer shrink-0"
                    style={{ accentColor: "#2D6A4F" }}
                  />
                  <span className="min-w-0">
                    <span className="block text-[14px] leading-tight text-[#1C1917]">{it.label}</span>
                    <span className="block text-[12px] leading-tight mt-0.5 text-ink-3">{it.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={pdf.exporting}
                className="h-9 rounded-lg border border-[#EAE6DF] bg-white px-4 text-[13px] text-[#1C1917] hover:bg-[#FAFAF8] disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={onCreate}
                disabled={!anySelected || pdf.exporting}
                className="h-9 rounded-lg px-4 text-[13px] font-medium text-white hover:bg-[#235740] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#2D6A4F" }}
              >
                {pdf.exporting ? "Wird erstellt …" : "PDF erstellen"}
              </button>
            </div>
            <p className="text-[12px] mt-3 text-ink-2">
              Im Druckdialog „Als PDF speichern“ wählen.
            </p>
          </div>
        </div>
      )}
      {pdf.portal}
    </>
  );
}
