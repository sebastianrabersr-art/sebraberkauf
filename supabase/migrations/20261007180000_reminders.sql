-- Erinnerungen zu CRM-Aktionen einer Immobilie.
-- Versand: pg_cron ruft alle 5 Minuten die App-Route /api/public/reminders/dispatch auf
-- (siehe 20261007180200_send_reminders_cron.sql), die fällige Erinnerungen per Resend
-- verschickt und danach sent = true setzt.

CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  -- Optional: ID der CRM-Aktivität (activities.id). Bewusst ohne Fremdschlüssel: Aktivitäten
  -- werden verzögert aus dem lokalen Store synchronisiert und können gelöscht werden,
  -- die Erinnerung soll trotzdem bestehen bleiben.
  action_id uuid,
  remind_at timestamptz NOT NULL,
  note text,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders owner all" ON public.reminders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX reminders_user_idx ON public.reminders(user_id, remind_at);
CREATE INDEX reminders_due_idx ON public.reminders(remind_at) WHERE sent = false;
