import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Property } from "@/lib/types";
import { fmtEUR, fmtPct } from "@/lib/calc";
import type { Calc } from "@/lib/calc";
import { resolvePurchaseCostRules } from "@/lib/purchaseCostRules";
import { countryOf, regionsOf } from "@/lib/regions";

/**
 * Collapsible breakdown of Kaufnebenkosten (purchase ancillary costs).
 *
 * - Closed by default → simple mode shows only totals.
 * - Open → per-item rows with default rate per country/region, manual override,
 *   "manuell angepasst" indicator, per-row reset and a global reset.
 * - Override fields on Property: grunderwerbsteuer, grundbuchkosten,
 *   vertragskosten, finanzierungskosten, sonstigeNK, provisionPct.
 *   Setting an override field to null falls back to the rule default.
 */
export function PurchaseCostsDetails({
  p,
  c,
  u,
}: {
  p: Property;
  c: Calc;
  u: (patch: Partial<Property>) => void;
}) {
  const [open, setOpen] = useState(false);

  const country = countryOf(p.land) ?? "AT";
  const regions = regionsOf(country);
  const rules = resolvePurchaseCostRules(p);

  const kp = p.kaufpreisBrutto ?? p.kaufpreis ?? 0;
  const kredit = c.kreditBetrag ?? 0;

  // Default amounts derived from rules (used when override is null).
  const defGrESt = kp * rules.realEstateTransferTaxRate;
  const defGrundbuch = kp * rules.landRegisterRate;
  const defVertrag = kp * rules.notaryContractRate;
  const defFinanzierung = kredit > 0 ? kredit * rules.mortgageRegisterRate : 0;

  const resetAll = () => {
    u({
      grunderwerbsteuer: null,
      grundbuchkosten: null,
      vertragskosten: null,
      finanzierungskosten: null,
      sonstigeNK: null,
      provisionPct: null,
      provisionEUR: null,
      provisionBruttoEUR: null,
      maklerprovisionUstPct: null,
      provisionLastEdit: "pct",
    });
  };

  const kapitalbedarf = c.gesamtkosten ?? 0;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Header: always-visible summary (simple mode) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className={`size-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm tracking-tight">Kaufnebenkosten Details</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {rules.country === "AT" ? "Österreich" : "Deutschland"}
              {rules.regionLabel ? ` · ${rules.regionLabel}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Kaufnebenkosten</div>
            <div className="text-sm font-semibold tabular-nums">{fmtEUR(c.kaufNebenkosten)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Kapitalbedarf</div>
            <div className="text-sm font-semibold tabular-nums">{fmtEUR(kapitalbedarf)}</div>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t bg-card px-5 py-5 space-y-4">
          {/* Country / Bundesland selectors */}
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Land">
              <select
                value={p.land ?? ""}
                onChange={(e) => u({ land: e.target.value, bundesland: "" })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="Österreich">Österreich</option>
                <option value="Deutschland">Deutschland</option>
              </select>
            </Field>
            <Field
              label={
                country === "DE"
                  ? "Bundesland (bestimmt Grunderwerbsteuer)"
                  : "Bundesland / Region (optional)"
              }
            >
              <select
                value={p.bundesland ?? ""}
                onChange={(e) => u({ bundesland: e.target.value })}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                  country === "DE" && !p.bundesland ? "border-warning" : ""
                }`}
              >
                <option value="">—</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
              {country === "DE" && !p.bundesland && (
                <p className="text-[11px] text-warning mt-1">
                  Bundesland wählen — sonst wird mit Default „Bayern" gerechnet.
                </p>
              )}
            </Field>
          </div>

          {/* Itemized rows */}
          <div className="space-y-2">
            <CostRow
              label="Grunderwerbsteuer"
              pctLabel={fmtPct(rules.realEstateTransferTaxRate, 2)}
              basisHint={`vom Kaufpreis ${fmtEUR(kp)}`}
              defaultValue={defGrESt}
              override={p.grunderwerbsteuer}
              onChange={(v) => u({ grunderwerbsteuer: v })}
            />
            <CostRow
              label={country === "DE" ? "Notar & Grundbuch" : "Grundbucheintragung"}
              pctLabel={fmtPct(rules.landRegisterRate, 2)}
              basisHint={`vom Kaufpreis ${fmtEUR(kp)}`}
              defaultValue={defGrundbuch}
              override={p.grundbuchkosten}
              onChange={(v) => u({ grundbuchkosten: v })}
            />
            <CostRow
              label="Vertrag / Notar"
              pctLabel={fmtPct(rules.notaryContractRate, 2)}
              basisHint={`vom Kaufpreis ${fmtEUR(kp)}`}
              defaultValue={defVertrag}
              override={p.vertragskosten}
              onChange={(v) => u({ vertragskosten: v })}
            />
            <CostRow
              label="Maklerprovision (brutto)"
              pctLabel={`${fmtPct(rules.brokerCommissionRate, 2)} + ${fmtPct(
                rules.brokerVatRate,
                0,
              )} USt`}
              basisHint={`vom Kaufpreis ${fmtEUR(kp)}`}
              defaultValue={c.maklerProvisionBrutto}
              override={
                p.provisionLastEdit === "brutto" ? p.provisionBruttoEUR ?? null : null
              }
              onChange={(v) =>
                u({
                  provisionBruttoEUR: v,
                  provisionLastEdit: v == null ? "pct" : "brutto",
                  provisionEUR: null,
                  provisionPct: v == null ? null : p.provisionPct,
                })
              }
              extraNote={
                c.maklerKostenZahlbar
                  ? undefined
                  : "Provision wird laut Konfiguration nicht gezahlt."
              }
            />
            <CostRow
              label="Finanzierungseintragung / Pfandrecht"
              pctLabel={fmtPct(rules.mortgageRegisterRate, 2)}
              basisHint={
                kredit > 0
                  ? `vom Kreditbetrag ${fmtEUR(kredit)}`
                  : "keine Finanzierung erfasst"
              }
              defaultValue={defFinanzierung}
              override={p.finanzierungskosten}
              onChange={(v) => u({ finanzierungskosten: v })}
            />
            <CostRow
              label="Sonstige Nebenkosten"
              pctLabel="—"
              basisHint="frei wählbar"
              defaultValue={0}
              override={p.sonstigeNK}
              onChange={(v) => u({ sonstigeNK: v })}
            />
          </div>

          {/* Totals */}
          <div className="rounded-lg border bg-muted/30 p-3 grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Gesamte Kaufnebenkosten
              </div>
              <div className="text-base font-semibold tabular-nums">
                {fmtEUR(c.kaufNebenkosten)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {fmtPct(c.nebenkostenPct, 2)} vom Kaufpreis
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Gesamter Kapitalbedarf
              </div>
              <div className="text-base font-semibold tabular-nums">{fmtEUR(kapitalbedarf)}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Kaufpreis + Nebenkosten + Sanierung + Einrichtung + Reserve
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <p className="text-[11px] text-muted-foreground max-w-xl">
              Die Werte sind Richtwerte und ersetzen keine steuerliche oder rechtliche Beratung.
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 text-xs border rounded-md px-3 py-1.5 hover:bg-accent"
            >
              <RotateCcw className="size-3.5" /> Standardwerte wiederherstellen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function CostRow({
  label,
  pctLabel,
  basisHint,
  defaultValue,
  override,
  onChange,
  extraNote,
}: {
  label: string;
  pctLabel: string;
  basisHint: string;
  defaultValue: number;
  override: number | null | undefined;
  onChange: (v: number | null) => void;
  extraNote?: string;
}) {
  const isOverridden = override != null;
  const effective = isOverridden ? (override as number) : defaultValue;
  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_140px_auto] items-center gap-2 py-2 border-b last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-[11px] text-muted-foreground">Default {pctLabel}</span>
          {isOverridden && (
            <span className="text-[10px] uppercase tracking-wide bg-warning/15 text-warning rounded px-1.5 py-0.5">
              manuell angepasst
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {basisHint} · effektiv {fmtEUR(effective)}
          {extraNote ? ` · ${extraNote}` : ""}
        </div>
      </div>
      <input
        type="number"
        value={override ?? ""}
        placeholder={Math.round(defaultValue).toString()}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums text-right"
      />
      <button
        type="button"
        onClick={() => onChange(null)}
        disabled={!isOverridden}
        title="Auf Standardwert zurücksetzen"
        className="inline-flex items-center justify-center size-8 rounded-md border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <RotateCcw className="size-3.5" />
      </button>
    </div>
  );
}
