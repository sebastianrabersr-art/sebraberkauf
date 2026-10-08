import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { makeEmptyProperty, useActiveProject, useStore } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { detectPlatform } from "@/lib/extract.functions";
import { isValidUrl } from "@/lib/calc";
import { planLimits, useAuth } from "@/lib/auth";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { track } from "@/lib/analytics";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/types";

export const Route = createFileRoute("/properties/new")({
  head: () => ({ meta: [{ title: "Neue Immobilie – kaufma" }] }),
  component: NewPropertyPage,
});

function NewPropertyPage() {
  const navigate = useNavigate();
  const { addProperty, properties } = useStore();
  const project = useActiveProject();
  const { subscription } = useAuth();
  const limits = planLimits(subscription?.plan);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
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

  const isHouseSeparate = propertyType === "house_with_separate_land";
  const isHouse = propertyType === "house_with_land" || propertyType === "house_with_separate_land";
  const isLand = propertyType === "land_only";
  // Zinshaus: Fläche und Miete kommen aus den Einheiten (Tab "Einheiten" im Objekt).
  const isZinshaus = propertyType === "zinshaus";
  const computedTotal = isHouseSeparate ? (housePurchasePrice ?? 0) + (landPurchasePrice ?? 0) : null;

  const checkLimit = () => {
    if (limits.properties != null && properties.length >= limits.properties) {
      setUpgradeOpen(true);
      return false;
    }
    return true;
  };

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
      wohnflaecheM2: isLand || isZinshaus ? null : m2,
      livingAreaSqm: isHouse ? m2 : null,
      zimmer: isLand || isZinshaus ? null : zimmer,
      nettomieteMtl: isZinshaus ? null : miete,
      nettomieteGeschaetzt: !isZinshaus && !!miete,
      ...(isZinshaus ? { units: [], objekttyp: "Zinshaus" } : {}),
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
          <button onClick={createForPdf} className="rounded-md border px-3 py-2 text-sm hover:bg-accent">
            Leeres Objekt für PDF-Upload anlegen →
          </button>
        }
      />
      <div className="rounded-xl border bg-card p-5 max-w-2xl space-y-3">
        <Row label="Titel *"><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Row>
        <Row label="Original-Link (URL)">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          {link && !isValidUrl(link) && <p className="text-xs text-destructive mt-1">Ungültige URL.</p>}
        </Row>
        <Row label="Objektart">
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as PropertyType)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {PROPERTY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Row>
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
          {!isLand && !isZinshaus && (
            <>
              <Row label={isHouse ? "Wohnfläche m²" : "Wohnfläche m²"}><N value={m2} on={setM2} /></Row>
              <Row label="Zimmer"><N value={zimmer} on={setZimmer} /></Row>
              <Row label="Geschätzte Miete €/Mt"><N value={miete} on={setMiete} /></Row>
            </>
          )}
          {isLand && (
            <Row label="Erwartete Miete €/Mt (optional)"><N value={miete} on={setMiete} /></Row>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Erstellen</button>
          <button onClick={() => navigate({ to: "/properties" })} className="rounded-md border px-4 py-2 text-sm">Abbrechen</button>
        </div>
        <p className="text-xs text-muted-foreground">Weitere Felder (Ausstattung, Energieklasse, Notizen, Mietrecht) kannst du anschließend auf der Detailseite ergänzen. Tipp: „Leeres Objekt für PDF-Upload" rechts oben legt dir direkt eine Hülle an, in die du anschließend das Makler-PDF einlesen kannst.</p>
      </div>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Limit erreicht"
        description={`Dein Plan erlaubt max. ${limits.properties} Immobilie${limits.properties === 1 ? "" : "n"}. Upgrade, um mehr anzulegen.`}
        recommendPlan={subscription?.plan === "plus" ? "premium" : "plus"}
      />
    </AppShell>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</label>;
}
function N({ value, on }: { value: number | null; on: (v: number | null) => void }) {
  return <input type="number" value={value ?? ""} onChange={(e) => on(e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
