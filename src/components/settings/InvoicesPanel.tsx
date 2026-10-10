import { useEffect, useState } from "react";
import { CircleNotch, DownloadSimple, Receipt } from "@phosphor-icons/react";
import { listInvoices, type InvoiceRow } from "@/lib/api/invoices.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { SettingsCard, SettingsHeading } from "./settingsUi";

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  paid: { label: "Bezahlt", bg: "#E8F5EE", fg: "#2D6A4F" },
  open: { label: "Offen", bg: "#FEF3C7", fg: "#92400E" },
  void: { label: "Storniert", bg: "#F5F3EE", fg: "#78716C" },
  uncollectible: { label: "Nicht bezahlt", bg: "#FEE2E2", fg: "#991B1B" },
};

const fmtDate = (unix: number) => new Date(unix * 1000).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtAmount = (cents: number, currency: string) =>
  (cents / 100).toLocaleString("de-AT", { style: "currency", currency: currency.toUpperCase() });

/** Einstellungen → Rechnungen: alle Stripe-Rechnungen mit PDF-Link. */
export function InvoicesPanel() {
  const [rows, setRows] = useState<InvoiceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listInvoices({ data: { environment: getStripeEnvironment() } })
      .then((res) => {
        if (res.ok) setRows(res.invoices);
        else { setRows([]); setError(res.error); }
      })
      .catch(() => { setRows([]); setError("Die Rechnungen konnten gerade nicht geladen werden."); });
  }, []);

  return (
    <div className="space-y-4" style={{ maxWidth: 760 }}>
      <SettingsCard>
        <SettingsHeading title="Rechnungen" description="Rechnungen werden von Stripe ausgestellt. Für Änderungen an Rechnungsadresse oder Zahlungsart nutze „Abo verwalten“ unter Profil & Konto." />

        {rows === null ? (
          <div className="mt-6 flex items-center gap-2 text-[13px] text-[#78716C]">
            <CircleNotch className="size-4 animate-spin" aria-hidden /> Lade Rechnungen …
          </div>
        ) : error ? (
          <p className="mt-5 rounded-[8px] px-3 py-2.5 text-[13px]" style={{ background: "#FFF7ED", border: "1px solid #FED7AA", color: "#9A3412" }}>
            {error} Bitte versuch es später noch einmal oder schreib an hallo@kaufma.eu.
          </p>
        ) : rows.length === 0 ? (
          <div className="mt-5 flex flex-col items-center gap-2 rounded-[12px] py-10 text-center" style={{ background: "#FAFAF8", border: "1.5px dashed #D4CFC8" }}>
            <Receipt className="size-6 text-[#78716C]" aria-hidden />
            <p className="text-[13px] text-[#78716C]">Noch keine Rechnungen vorhanden.</p>
          </div>
        ) : (
          <div className="mt-5 -mx-2 sm:mx-0">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-[#78716C]">
                  <th scope="col" className="px-2 pb-2 font-normal">Datum</th>
                  <th scope="col" className="px-2 pb-2 font-normal text-right">Betrag</th>
                  <th scope="col" className="px-2 pb-2 font-normal hidden sm:table-cell">Plan</th>
                  <th scope="col" className="px-2 pb-2 font-normal">Status</th>
                  <th scope="col" className="px-2 pb-2 font-normal text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF] border-t border-[#EAE6DF]">
                {rows.map((r) => {
                  const st = STATUS[r.status] ?? { label: r.status, bg: "#F5F3EE", fg: "#78716C" };
                  const pdf = r.pdfUrl ?? r.hostedUrl;
                  return (
                    <tr key={r.id}>
                      <td className="px-2 py-3 tabular-nums text-[#1C1917]">
                        {fmtDate(r.created)}
                        <span className="block sm:hidden text-[12px] text-[#78716C]">{r.plan}</span>
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums font-medium text-[#1C1917]">{fmtAmount(r.amountPaid, r.currency)}</td>
                      <td className="px-2 py-3 text-[#1C1917] hidden sm:table-cell">{r.plan}</td>
                      <td className="px-2 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        {pdf ? (
                          <a
                            href={pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Rechnung ${r.number ?? ""} vom ${fmtDate(r.created)} als PDF`}
                            className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[13px] font-medium text-primary hover:bg-[#E8F5EE]"
                          >
                            <DownloadSimple className="size-4" aria-hidden /> <span className="hidden sm:inline">PDF</span>
                          </a>
                        ) : (
                          <span className="text-[#78716C]">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
