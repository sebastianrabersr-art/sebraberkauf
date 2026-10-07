import { useMemo, useState } from "react";
import { Plus, Trash as Trash2 } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { fmtEUR, summarizePayments } from "@/lib/calc";
import {
  AUSGABE_KATEGORIEN, EINNAHME_KATEGORIEN,
  type Payment, type PaymentDirection, type PaymentKategorie, type PaymentStatus, type Property,
} from "@/lib/types";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function PaymentsPanel({ p }: { p: Property }) {
  const { payments, addPayment, updatePayment, deletePayment } = useStore();
  const list = useMemo(
    () => payments.filter((x) => x.propertyId === p.id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [payments, p.id],
  );
  const sum = useMemo(() => summarizePayments(list), [list]);
  const [draft, setDraft] = useState<{ direction: PaymentDirection; category: PaymentKategorie; amount: string; date: string; description: string; status: PaymentStatus; recurring: boolean }>({
    direction: "Einnahme", category: "Miete", amount: "", date: todayStr(), description: "", status: "bezahlt", recurring: false,
  });

  const add = () => {
    const amt = Number(draft.amount.replace(",", "."));
    if (!isFinite(amt) || amt <= 0) { toast.error("Betrag fehlt."); return; }
    const pay: Payment = {
      id: crypto.randomUUID(), propertyId: p.id, date: draft.date,
      direction: draft.direction, category: draft.category, amount: amt,
      description: draft.description.trim() || undefined,
      recurring: draft.recurring, status: draft.status, createdAt: new Date().toISOString(),
    };
    addPayment(pay);
    setDraft({ ...draft, amount: "", description: "" });
    toast.success("Zahlung erfasst");
  };

  const categories = draft.direction === "Einnahme" ? EINNAHME_KATEGORIEN : AUSGABE_KATEGORIEN;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <Kpi label="Einnahmen ges." value={fmtEUR(sum.einnahmenGesamt)} tone="good" />
        <Kpi label="Ausgaben ges." value={fmtEUR(sum.ausgabenGesamt)} tone="bad" />
        <Kpi label="Netto-Cashflow" value={fmtEUR(sum.nettoCashflow)} tone={sum.nettoCashflow >= 0 ? "good" : "bad"} />
        <Kpi label="Cashflow Monat" value={fmtEUR(sum.cashflowMonat)} tone={sum.cashflowMonat >= 0 ? "good" : "bad"} />
        <Kpi label="Cashflow Jahr" value={fmtEUR(sum.cashflowJahr)} tone={sum.cashflowJahr >= 0 ? "good" : "bad"} />
        <Kpi label="Offene Zahlungen" value={`${sum.offenAnzahl} · ${fmtEUR(sum.offenSumme)}`} />
        <Kpi label="Miete erhalten" value={fmtEUR(sum.mieteEingegangen)} />
        <Kpi label="Kreditraten" value={fmtEUR(sum.kreditratenGezahlt)} />
        <Kpi label="Zinsen" value={fmtEUR(sum.zinsenGezahlt)} />
        <Kpi label="Tilgung" value={fmtEUR(sum.tilgungGezahlt)} />
        <Kpi label="Reparatur / Instandh." value={fmtEUR(sum.reparaturGezahlt)} />
      </div>

      <div className="rounded-md border p-3 bg-card/50 grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
        <Field label="Art">
          <select value={draft.direction} onChange={(e) => {
            const dir = e.target.value as PaymentDirection;
            setDraft({ ...draft, direction: dir, category: (dir === "Einnahme" ? EINNAHME_KATEGORIEN[0] : AUSGABE_KATEGORIEN[0]) });
          }} className="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
            <option>Einnahme</option><option>Ausgabe</option>
          </select>
        </Field>
        <Field label="Kategorie">
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as PaymentKategorie })} className="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Datum">
          <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Betrag €">
          <input value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0,00" className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Beschreibung">
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Status">
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as PaymentStatus })} className="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
            <option value="bezahlt">bezahlt</option><option value="offen">offen</option>
          </select>
        </Field>
        <button onClick={add} className="inline-flex items-center justify-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">
          <Plus className="size-3.5" /> Erfassen
        </button>
        <label className="col-span-2 md:col-span-7 text-[11px] inline-flex items-center gap-1.5">
          <input type="checkbox" checked={draft.recurring} onChange={(e) => setDraft({ ...draft, recurring: e.target.checked })} /> wiederkehrend
        </label>
      </div>

      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">Noch keine Zahlungen erfasst.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-1.5 pr-2">Datum</th><th className="py-1.5 pr-2">Art</th>
                <th className="py-1.5 pr-2">Kategorie</th><th className="py-1.5 pr-2">Beschreibung</th>
                <th className="py-1.5 pr-2 text-right">Betrag</th><th className="py-1.5 pr-2">Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 tabular-nums">{x.date}</td>
                  <td className="py-1.5 pr-2">
                    <span className={`text-[11px] rounded-full border px-1.5 py-0.5 ${x.direction === "Einnahme" ? "bg-success/10 text-success border-success/40" : "bg-destructive/10 text-destructive border-destructive/40"}`}>{x.direction}</span>
                  </td>
                  <td className="py-1.5 pr-2">{x.category}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{x.description || "—"}{x.recurring ? " · wiederkehrend" : ""}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums font-medium">{fmtEUR(x.amount)}</td>
                  <td className="py-1.5 pr-2">
                    <select value={x.status} onChange={(e) => updatePayment(x.id, { status: e.target.value as PaymentStatus })} className="text-[11px] rounded border bg-background px-1.5 py-0.5">
                      <option value="bezahlt">bezahlt</option><option value="offen">offen</option>
                    </select>
                  </td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => { if (confirm("Zahlung löschen?")) deletePayment(x.id); }} className="text-destructive p-1"><Trash2 className="size-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "";
  return (
    <div className="rounded-md border p-2.5 bg-card">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs text-muted-foreground">{label}<div className="mt-0.5">{children}</div></label>;
}
