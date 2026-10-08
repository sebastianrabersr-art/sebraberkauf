import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CircleNotch, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { deleteReminder, fmtReminderDate, listOpenReminders, type Reminder } from "@/lib/reminders";

/** Einstellungen → Erinnerungen: alle anstehenden Erinnerungen mit Löschen. */
export function RemindersPanel() {
  const { properties } = useStore();
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    listOpenReminders()
      .then(setItems)
      .catch(() => { setItems([]); setFailed(true); });
  }, []);

  const label = (propertyId: string) => {
    const p = properties.find((x) => x.id === propertyId);
    if (!p) return { title: "Immobilie nicht mehr vorhanden", address: "" };
    const address = [p.adresse, p.bezirk, p.city].filter(Boolean).join(", ");
    return { title: p.title || "Ohne Titel", address };
  };

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await deleteReminder(id);
      setItems((list) => (list ?? []).filter((r) => r.id !== id));
      toast.success("Erinnerung gelöscht.");
    } catch {
      toast.error("Erinnerung konnte nicht gelöscht werden.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="bg-white" style={{ border: "1px solid #EAE6DF", borderRadius: 12, padding: "20px 24px", maxWidth: 680 }}>
      <h2 className="text-[14px] font-semibold text-[#1C1917]">Anstehende Erinnerungen</h2>
      <p className="text-[12px] text-ink-3 mt-1">
        Du bekommst zur gewählten Zeit eine E-Mail. Neue Erinnerungen setzt du im CRM-Tab einer Immobilie über die Glocke.
      </p>

      {items === null ? (
        <div className="flex items-center gap-2 py-6 text-[13px] text-ink-3"><CircleNotch className="size-4 animate-spin" aria-hidden /> Lade Erinnerungen …</div>
      ) : failed ? (
        <div className="mt-4 rounded-[8px] px-3 py-2.5 text-[12px]" style={{ background: "#FFF7ED", border: "1px solid #FED7AA", color: "#9A3412" }}>
          Erinnerungen konnten nicht geladen werden. Falls die Funktion gerade erst eingerichtet wurde, fehlt evtl. noch die Datenbank-Migration.
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-1.5 rounded-[12px] py-8 text-center" style={{ background: "#FAFAF8", border: "1.5px dashed #D4CFC8" }}>
          <Bell className="size-6 text-ink-3" aria-hidden />
          <span className="text-[13px] text-ink-2">Keine anstehenden Erinnerungen.</span>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[#EAE6DF] border-y border-[#EAE6DF]">
          {items.map((r) => {
            const l = label(r.property_id);
            return (
              <li key={r.id} className="flex items-start gap-3 py-3">
                <Bell className="size-4 mt-0.5 shrink-0" style={{ color: "#2D6A4F" }} aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1C1917]">{fmtReminderDate(r.remind_at)}</div>
                  <Link to="/properties/$id" params={{ id: r.property_id }} className="block text-[12px] text-ink-2 truncate hover:text-primary">
                    {l.address || l.title}
                  </Link>
                  {r.note && <div className="text-[12px] text-[#1C1917] mt-0.5 whitespace-pre-wrap">{r.note}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={deleting === r.id}
                  aria-label="Erinnerung löschen"
                  className="shrink-0 rounded-full p-1.5 text-ink-3 hover:text-destructive hover:bg-[#FEF2F2] disabled:opacity-50"
                >
                  <Trash className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
