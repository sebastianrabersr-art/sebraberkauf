import type { Property, PurchaseInfo } from "@/lib/types";
import { useStore } from "@/lib/store";

const KREDITSTATUS: NonNullable<PurchaseInfo["kreditstatus"]>[] = [
  "", "in Auszahlung", "läuft", "Sondertilgung geplant", "abgelöst", "in Verzug",
];

export function PurchaseInfoPanel({ p }: { p: Property }) {
  const { updateProperty } = useStore();
  const pi = p.purchase ?? {};
  const u = (patch: Partial<PurchaseInfo>) => updateProperty(p.id, { purchase: { ...pi, ...patch } });
  const N = (v: number | null | undefined) => (v == null ? "" : v);
  const num = (s: string) => (s === "" ? null : Number(s));
  return (
    <div className="grid md:grid-cols-3 gap-3">
      <Field label="Kaufdatum"><input type="date" value={pi.kaufdatum ?? ""} onChange={(e) => u({ kaufdatum: e.target.value })} className="inp" /></Field>
      <Field label="Tats. Kaufpreis €"><input type="number" value={N(pi.tatsKaufpreis)} onChange={(e) => u({ tatsKaufpreis: num(e.target.value) })} className="inp" /></Field>
      <Field label="Tats. Kaufnebenkosten €"><input type="number" value={N(pi.tatsKaufnebenkosten)} onChange={(e) => u({ tatsKaufnebenkosten: num(e.target.value) })} className="inp" /></Field>
      <Field label="Tats. Maklerkosten €"><input type="number" value={N(pi.tatsMaklerkosten)} onChange={(e) => u({ tatsMaklerkosten: num(e.target.value) })} className="inp" /></Field>
      <Field label="Tats. Eigenkapital €"><input type="number" value={N(pi.tatsEigenkapital)} onChange={(e) => u({ tatsEigenkapital: num(e.target.value) })} className="inp" /></Field>
      <Field label="Tats. Kreditbetrag €"><input type="number" value={N(pi.tatsKreditbetrag)} onChange={(e) => u({ tatsKreditbetrag: num(e.target.value) })} className="inp" /></Field>
      <Field label="Bank"><input value={pi.bank ?? ""} onChange={(e) => u({ bank: e.target.value })} className="inp" /></Field>
      <Field label="Kreditstatus">
        <select value={pi.kreditstatus ?? ""} onChange={(e) => u({ kreditstatus: e.target.value as PurchaseInfo["kreditstatus"] })} className="inp">
          {KREDITSTATUS.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
        </select>
      </Field>
      <Field label="Aktuelle Restschuld €"><input type="number" value={N(pi.aktuelleRestschuld)} onChange={(e) => u({ aktuelleRestschuld: num(e.target.value) })} className="inp" /></Field>
      <Field label="Akt. Monatsrate €"><input type="number" value={N(pi.aktuelleMonatsrate)} onChange={(e) => u({ aktuelleMonatsrate: num(e.target.value) })} className="inp" /></Field>
      <Field label="Akt. Monatsmiete €"><input type="number" value={N(pi.aktuelleMonatsmiete)} onChange={(e) => u({ aktuelleMonatsmiete: num(e.target.value) })} className="inp" /></Field>
      <Field label="Tats. mtl. Kosten €"><input type="number" value={N(pi.tatsMonatlicheKosten)} onChange={(e) => u({ tatsMonatlicheKosten: num(e.target.value) })} className="inp" /></Field>
      <div className="md:col-span-3">
        <Field label="Notizen nach Kauf">
          <textarea value={pi.notizenNachKauf ?? ""} onChange={(e) => u({ notizenNachKauf: e.target.value })} rows={3} className="inp" />
        </Field>
      </div>
      <style>{`.inp { width:100%; border:1px solid var(--border); background:var(--background); border-radius:6px; padding:6px 10px; font-size:14px; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</label>;
}
