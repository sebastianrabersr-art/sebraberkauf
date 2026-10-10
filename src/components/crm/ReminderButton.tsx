import { useCallback, useEffect, useState } from "react";
import { Bell, BellRinging, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createReminder, deleteReminder, fmtReminderDate, listOpenReminders, type Reminder } from "@/lib/reminders";

/** Offene Erinnerungen einer Immobilie (für Glocken-Status in der CRM-Ansicht). */
export function usePropertyReminders(propertyId: string) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const reload = useCallback(async () => {
    try {
      setReminders(await listOpenReminders(propertyId));
    } catch {
      // Tabelle noch nicht angelegt / offline – Glocken bleiben neutral.
      setReminders([]);
    }
  }, [propertyId]);
  useEffect(() => { void reload(); }, [reload]);
  return { reminders, reload };
}

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const isMissingTable = (e: unknown) => {
  const err = e as { code?: string; message?: string };
  const msg = err?.message ?? "";
  return err?.code === "42P01" || err?.code === "PGRST205" || (/reminders/.test(msg) && /not find|does not exist/i.test(msg));
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** action_id ist eine UUID-Spalte – Alt-/Demo-IDs werden nicht verknüpft. */
export const reminderActionId = (id: string | undefined | null) => (id && UUID_RE.test(id) ? id : null);

/**
 * 🔔 neben einer CRM-Aktion: Popover "Erinnerung setzen" (Datum, Uhrzeit, Notiz).
 * Mit gesetzter Erinnerung: grüne Glocke, im Popover Termin + Löschen.
 */
export function ReminderButton({ propertyId, actionId, suggestedDate, suggestedNote, existing, onChanged, open: openProp, onOpenChange, anchorOnly }: {
  propertyId: string;
  actionId?: string | null;
  /** YYYY-MM-DD; liegt es nicht in der Zukunft, wird morgen vorgeschlagen. */
  suggestedDate?: string;
  suggestedNote?: string;
  existing?: Reminder;
  onChanged?: () => void;
  /** Von außen gesteuert öffnen (z. B. aus einem Menü heraus). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Keine eigene Glocke – das Popover hängt an der Position des Elternelements. */
  anchorOnly?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setOpenState(v);
  };
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().slice(0, 10);
    // Heute 09:00 ist meist schon vorbei – dann morgen vorschlagen.
    setDate(suggestedDate && suggestedDate.slice(0, 10) > today ? suggestedDate.slice(0, 10) : tomorrow());
    setTime("09:00");
    setNote(suggestedNote ?? "");
  }, [open, suggestedDate, suggestedNote]);

  const save = async () => {
    if (!date) { toast.error("Bitte ein Datum wählen."); return; }
    const remindAt = new Date(`${date}T${time || "09:00"}`);
    if (Number.isNaN(remindAt.getTime())) { toast.error("Ungültiges Datum."); return; }
    if (remindAt.getTime() < Date.now()) { toast.error("Der Zeitpunkt liegt in der Vergangenheit."); return; }
    setBusy(true);
    try {
      await createReminder({ propertyId, actionId: reminderActionId(actionId), remindAt, note });
      toast.success(`Erinnerung für ${fmtReminderDate(remindAt.toISOString())} gesetzt – du bekommst eine E-Mail.`);
      setOpen(false);
      onChanged?.();
    } catch (e) {
      toast.error(isMissingTable(e) ? "Erinnerungen sind noch nicht eingerichtet (Datenbank-Migration fehlt)." : "Erinnerung konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await deleteReminder(existing.id);
      toast.success("Erinnerung gelöscht.");
      setOpen(false);
      onChanged?.();
    } catch {
      toast.error("Erinnerung konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-2.5 py-[7px] text-[13px] text-[#1C1917] focus:border-primary outline-none";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {anchorOnly ? (
        <PopoverAnchor asChild>
          <span className="absolute right-0 top-0 size-0" aria-hidden />
        </PopoverAnchor>
      ) : (
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={existing ? `Erinnerung am ${fmtReminderDate(existing.remind_at)}` : "Erinnerung setzen"}
          title={existing ? `Erinnerung: ${fmtReminderDate(existing.remind_at)}` : "Erinnerung setzen"}
          className="inline-grid place-items-center size-7 rounded-full shrink-0 transition-colors hover:bg-[#F5F3EE]"
          style={{ color: existing ? "#2D6A4F" : "#A8A29E" }}
        >
          {existing ? <BellRinging weight="fill" size={15} aria-hidden /> : <Bell size={15} aria-hidden />}
        </button>
      </PopoverTrigger>
      )}
      <PopoverContent align="end" className="w-72 p-4 bg-white border-[#EAE6DF] rounded-[12px]" onClick={(e) => e.stopPropagation()}>
        <div className="text-[13px] font-semibold text-[#1C1917] mb-3">Erinnerung setzen</div>
        {existing && (
          <div className="mb-3 flex items-start justify-between gap-2 rounded-[8px] px-3 py-2 text-[12px]" style={{ background: "#E8F5EE", color: "#2D6A4F" }}>
            <span>
              Gesetzt für {fmtReminderDate(existing.remind_at)}
              {existing.note ? <span className="block text-[12px] text-ink-2 mt-0.5">{existing.note}</span> : null}
            </span>
            <button type="button" onClick={remove} disabled={busy} aria-label="Erinnerung löschen" className="text-destructive hover:opacity-80 shrink-0 mt-0.5">
              <Trash size={14} aria-hidden />
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[12px] text-ink-2 mb-1">Datum</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-[12px] text-ink-2 mb-1">Uhrzeit</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </label>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Notiz zur Erinnerung"
          className={inputCls + " mt-2 resize-none"}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="text-[12px] px-3 py-1.5 text-ink-2 hover:underline">Abbrechen</button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="text-[13px] rounded-[8px] px-4 py-1.5 font-medium text-white disabled:opacity-60"
            style={{ background: "#2D6A4F" }}
          >
            Speichern
          </button>
        </div>
        <p className="mt-2 text-[12px] text-ink-3">Du bekommst zur gewählten Zeit eine E-Mail (± 5 Minuten).</p>
      </PopoverContent>
    </Popover>
  );
}
