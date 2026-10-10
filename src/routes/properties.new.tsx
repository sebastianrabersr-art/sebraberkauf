import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { makeEmptyProperty, useActiveProject, useStore } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { detectPlatform } from "@/lib/extract.functions";
import { isValidUrl } from "@/lib/calc";
import { usePropertyLimit } from "@/hooks/usePropertyLimit";
import { track } from "@/lib/analytics";
import type { PropertyType } from "@/lib/types";
import { PropertyTypePicker } from "@/components/PropertyTypePicker";
import { CATEGORY_LABEL, propertyCategory } from "@/lib/propertyKinds";

export const Route = createFileRoute("/properties/new")({
  head: () => ({ meta: [{ title: "Neue Immobilie – kaufma" }] }),
  component: NewPropertyPage,
});

function NewPropertyPage() {
  const navigate = useNavigate();
  const { addProperty, properties } = useStore();
  const project = useActiveProject();
  const propertyLimit = usePropertyLimit();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [bezirk, setBezirk] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment");
  const [kaufpreis, setKaufpreis] = useState<number | null>(null);
  const [housePurchasePrice, setHousePurchasePrice] = useState<number | null>(null);
  const [landPurchasePrice, setLandPurchasePrice] = useState<number | null>(null);
  const [landAreaSqm, setLandAreaSqm] = useState<number | null>(null);
  const [m2, setM2] = useState<number | null>(null);
  const [zimmer, setZimmer] = useState<number | null>(null);
  const [miete, setMiete] = useState<number | null>(null);
  const [stellplaetze, setStellplaetze] = useState<number | null>(1);

  const isHouseSeparate = propertyType === "house_with_separate_land";
  const isHouse = propertyType === "house_with_land" || propertyType === "house_with_separate_land";
  const isLand = propertyType === "land_only";
  // Zinshaus: Fläche und Miete kommen aus den Einheiten (Tab "Einheiten" im Objekt).
  const isZinshaus = propertyType === "zinshaus";
  const cat = propertyCategory(propertyType);
  const isGarage = cat === "garage";
  const isGewerbe = cat === "buero" || cat === "lager";
  const computedTotal = isHouseSeparate ? (housePurchasePrice ?? 0) + (landPurchasePrice ?? 0) : null;

  const checkLimit = () => propertyLimit.guard();

  const submit = () => {
    if (!title.trim()) { toast.error("Bitte Titel angeben."); return; }
    if (!checkLimit()) return;
    const p = makeEmptyProperty({
      projectId: project.id,
      title: title.trim(),
      link: link.trim(),
      platform: detectPlatform(link),
      extractionStatus: "manuell",
      bezirk: bezirk.trim(),
      propertyType,
      kaufpreis: isHouseSeparate ? (computedTotal && computedTotal > 0 ? computedTotal : kaufpreis) : kaufpreis,
      housePurchasePrice: isHouseSeparate ? housePurchasePrice : null,
      landPurchasePrice: isHouseSeparate ? landPurchasePrice : null,
      totalPurchasePrice: isHouseSeparate && computedTotal ? computedTotal : null,
      landAreaSqm: (isHouse || isLand) ? landAreaSqm : null,
      wohnflaecheM2: isLand || isZinshaus || isGarage ? null : m2,
      livingAreaSqm: isHouse ? m2 : null,
      zimmer: isLand || isZinshaus || isGarage || isGewerbe ? null : zimmer,
      // Garage: Miete pro Stellplatz × Anzahl; Grundstück: keine Miete.
      nettomieteMtl: isZinshaus || isLand ? null : isGarage ? (miete != null ? miete * (stellplaetze ?? 1) : null) : miete,
      nettomieteGeschaetzt: !isZinshaus && !isLand && !!miete,
      objekttyp: CATEGORY_LABEL[cat],
      ...(isZinshaus ? { units: [] } : {}),
      ...(isGarage ? { anzahlStellplaetze: stellplaetze ?? 1, mieteProStellplatz: miete } : {}),
    });
    const wasFirst = properties.filter((x) => !x.isDemo).length === 0;
    addProperty(p);
    if (wasFirst) track("first_property_created", { source: "manual" });
    toast.success("Immobilie angelegt.");
    navigate({ to: "/properties/$id", params: { id: p.id } });
  };

  const createForPdf = () => {
    if (!checkLimit()) return;
    const p = makeEmptyProperty({ projectId: project.id, title: "Neues Objekt (PDF)", extractionStatus: "manuell" });
    addProperty(p);
    toast.success("Leere Immobilie angelegt – PDF im Detail hochladen.");
    navigate({ to: "/properties/$id", params: { id: p.id } });
  };

  return (
    <AppShell>
      <PageHeader
        title="Immobilie manuell hinzufügen"
        description={`Projekt: ${project.name}`}
        actions={
          <button onClick={createForPdf} className="rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-2 text-[13px] text-[#1C1917] hover:border-[#1C1917]">
            Leeres Objekt für PDF-Upload anlegen →
          </button>
        }
      />
      <div className="rounded-[12px] border border-[#EAE6DF] bg-white p-5 max-w-2xl space-y-3">
        <Row label="Titel *"><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Row>
        <Row label="Original-Link (URL)">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          {link && !isValidUrl(link) && <p className="text-xs text-destructive mt-1">Ungültige URL.</p>}
        </Row>
        <div>
          <div className="text-xs text-muted-foreground mb-2">Objektart</div>
          <PropertyTypePicker value={propertyType} onChange={setPropertyType} />
          {isHouse && (
            <label className="mt-3 flex items-center gap-2 text-[13px] text-[#1C1917]">
              <input
                type="checkbox"
                checked={isHouseSeparate}
                onChange={(e) => setPropertyType(e.target.checked ? "house_with_separate_land" : "house_with_land")}
                className="accent-primary"
              />
              Haus und Grundstück zu getrennten Preisen gekauft
            </label>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Bezirk"><input value={bezirk} onChange={(e) => setBezirk(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Row>
          {isHouseSeparate ? (
            <>
              <Row label="Kaufpreis Haus €"><N value={housePurchasePrice} on={setHousePurchasePrice} /></Row>
              <Row label="Kaufpreis Grundstück €"><N value={landPurchasePrice} on={setLandPurchasePrice} /></Row>
              <Row label="Gesamtkaufpreis €">
                <input
                  type="number"
                  value={computedTotal ?? ""}
                  readOnly
                  className="w-full rounded-md border bg-muted px-3 py-2 text-sm"
                />
              </Row>
            </>
          ) : (
            <Row label={isLand ? "Kaufpreis Grundstück €" : "Kaufpreis €"}>
              <N value={kaufpreis} on={setKaufpreis} />
            </Row>
          )}
          {(isHouse || isLand) && (
            <Row label="Grundstücksfläche m²"><N value={landAreaSqm} on={setLandAreaSqm} /></Row>
          )}
          {isZinshaus && (
            <p className="col-span-2 text-xs text-muted-foreground">
              Fläche und Miete ergeben sich aus den Einheiten – die legst du nach dem Erstellen im Tab „Einheiten“ an.
            </p>
          )}
          {isGarage && (
            <>
              <Row label="Anzahl Stellplätze"><N value={stellplaetze} on={setStellplaetze} /></Row>
              <Row label="Miete pro Stellplatz €/Mt"><N value={miete} on={setMiete} /></Row>
            </>
          )}
          {!isLand && !isZinshaus && !isGarage && (
            <>
              <Row label={isGewerbe ? "Bürofläche m²" : "Wohnfläche m²"}><N value={m2} on={setM2} /></Row>
              {!isGewerbe && <Row label="Zimmer"><N value={zimmer} on={setZimmer} /></Row>}
              <Row label={cat === "buero" ? "Gewerbemiete netto €/Mt" : cat === "lager" ? "Nettomiete Lager €/Mt" : "Geschätzte Miete €/Mt"}><N value={miete} on={setMiete} /></Row>
            </>
          )}
          {isLand && (
            <p className="col-span-2 text-xs text-muted-foreground">
              Grundstücke rechnen wir ohne Miete und ohne Finanzierung: Ertrag allein aus der Wertsteigerung. Widmung und Erschließung ergänzt du im Objekt.
            </p>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} className="rounded-[8px] bg-primary text-white px-4 py-2.5 text-[14px] font-medium hover:bg-[#235740]">Erstellen</button>
          <button onClick={() => navigate({ to: "/properties" })} className="rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-2.5 text-[14px] text-[#1C1917] hover:border-[#1C1917]">Abbrechen</button>
        </div>
        <p className="text-xs text-muted-foreground">Weitere Felder (Ausstattung, Energieklasse, Notizen, Mietrecht) kannst du anschließend auf der Detailseite ergänzen. Tipp: „Leeres Objekt für PDF-Upload" rechts oben legt dir direkt eine Hülle an, in die du anschließend das Makler-PDF einlesen kannst.</p>
      </div>
      {propertyLimit.dialog}
    </AppShell>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</label>;
}
function N({ value, on }: { value: number | null; on: (v: number | null) => void }) {
  return <input type="number" value={value ?? ""} onChange={(e) => on(e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
