import { supabase } from "@/integrations/supabase/client";

/* Erinnerungen (Tabelle public.reminders, RLS: nur eigene). Versand: siehe reminder-email.functions.ts. */

export type Reminder = {
  id: string;
  property_id: string;
  action_id: string | null;
  remind_at: string;
  note: string | null;
  sent: boolean;
  created_at: string;
};

const COLS = "id, property_id, action_id, remind_at, note, sent, created_at";

/** Offene (noch nicht verschickte) Erinnerungen, optional nur für eine Immobilie. */
export async function listOpenReminders(propertyId?: string): Promise<Reminder[]> {
  let q = supabase.from("reminders").select(COLS).eq("sent", false).order("remind_at", { ascending: true });
  if (propertyId) q = q.eq("property_id", propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Reminder[];
}

export async function createReminder(input: { propertyId: string; actionId?: string | null; remindAt: Date; note?: string }): Promise<Reminder> {
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      property_id: input.propertyId,
      action_id: input.actionId ?? null,
      remind_at: input.remindAt.toISOString(),
      note: input.note?.trim() || null,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as Reminder;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
}

/** "07.10.2026, 09:00" */
export const fmtReminderDate = (iso: string) =>
  new Date(iso).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
