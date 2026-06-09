import type { Priority, Property, SellerType } from "@/lib/types";

const SELLER_TYPES: SellerType[] = ["Privat", "Makler", "Bauträger", "Bank", "Sonstige", "unklar"];
const PRIORITIES: Priority[] = ["Hoch", "Mittel", "Niedrig"];

export function CrmPanel({ p, edit, u }: { p: Property; edit: boolean; u: (patch: Partial<Property>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Priorität">
          {edit ? (
            <select value={p.priority ?? "Mittel"} onChange={(e) => u({ priority: e.target.value as Priority })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              {PRIORITIES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          ) : <Ro>{p.priority ?? "—"}</Ro>}
        </Field>
        <Field label="Nächste Aktion">
          {edit ? <input value={p.nextAction ?? ""} onChange={(e) => u({ nextAction: e.target.value })} placeholder="z.B. Makler anrufen" className="w-full rounded-md border bg-background px-3 py-2 text-sm" /> : <Ro>{p.nextAction || "—"}</Ro>}
        </Field>
        <Field label="Fällig am">
          {edit ? <input type="date" value={p.nextActionDate ?? ""} onChange={(e) => u({ nextActionDate: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /> : <Ro>{p.nextActionDate || "—"}</Ro>}
        </Field>
        <Field label="Erstkontakt">
          {edit ? <input type="date" value={p.firstContactDate ?? ""} onChange={(e) => u({ firstContactDate: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /> : <Ro>{p.firstContactDate || "—"}</Ro>}
        </Field>
        <Field label="Letzter Kontakt">
          {edit ? <input type="date" value={p.lastContactDate ?? ""} onChange={(e) => u({ lastContactDate: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /> : <Ro>{p.lastContactDate || "—"}</Ro>}
        </Field>
        <Field label="Besichtigungstermin">
          {edit ? <input type="datetime-local" value={p.viewingDate ?? ""} onChange={(e) => u({ viewingDate: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /> : <Ro>{p.viewingDate || "—"}</Ro>}
        </Field>
      </div>

      <div className="border-t pt-4 grid md:grid-cols-3 gap-3">
        <Field label="Verkäufer / Makler-Typ">
          {edit ? (
            <select value={p.sellerType ?? "unklar"} onChange={(e) => u({ sellerType: e.target.value as SellerType })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              {SELLER_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          ) : <Ro>{p.sellerType ?? "—"}</Ro>}
        </Field>
        <Field label="Name">{edit ? <Inp v={p.sellerName} on={(v) => u({ sellerName: v })} /> : <Ro>{p.sellerName || "—"}</Ro>}</Field>
        <Field label="Firma">{edit ? <Inp v={p.sellerCompany} on={(v) => u({ sellerCompany: v })} /> : <Ro>{p.sellerCompany || "—"}</Ro>}</Field>
        <Field label="Telefon">{edit ? <Inp v={p.sellerPhone} on={(v) => u({ sellerPhone: v })} /> : (p.sellerPhone ? <a className="px-3 py-2 rounded-md border bg-muted/40 text-sm block hover:underline" href={`tel:${p.sellerPhone}`}>{p.sellerPhone}</a> : <Ro>—</Ro>)}</Field>
        <Field label="E-Mail">{edit ? <Inp v={p.sellerEmail} on={(v) => u({ sellerEmail: v })} /> : (p.sellerEmail ? <a className="px-3 py-2 rounded-md border bg-muted/40 text-sm block hover:underline truncate" href={`mailto:${p.sellerEmail}`}>{p.sellerEmail}</a> : <Ro>—</Ro>)}</Field>
        <Field label="Website">{edit ? <Inp v={p.sellerWebsite} on={(v) => u({ sellerWebsite: v })} /> : (p.sellerWebsite ? <a className="px-3 py-2 rounded-md border bg-muted/40 text-sm block hover:underline truncate" href={p.sellerWebsite} target="_blank" rel="noopener noreferrer">{p.sellerWebsite}</a> : <Ro>—</Ro>)}</Field>
        <Field label="Adresse">{edit ? <Inp v={p.sellerAddress} on={(v) => u({ sellerAddress: v })} /> : <Ro>{p.sellerAddress || "—"}</Ro>}</Field>
      </div>
      <Field label="Notizen zum Verkäufer">
        <textarea value={p.sellerNotes ?? ""} disabled={!edit} onChange={(e) => u({ sellerNotes: e.target.value })} rows={2} className="w-full rounded-md border bg-background p-2 text-sm disabled:opacity-80" />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</label>;
}
function Ro({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm min-h-[36px]">{children}</div>;
}
function Inp({ v, on }: { v: string | undefined; on: (v: string) => void }) {
  return <input value={v ?? ""} onChange={(e) => on(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />;
}
