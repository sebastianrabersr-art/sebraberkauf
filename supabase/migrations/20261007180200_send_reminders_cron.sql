-- Erinnerungs-E-Mails: alle 5 Minuten fällige Erinnerungen versenden.
--
-- Gleiches Muster wie die E-Mail-Warteschlange (20260610155203_email_infra.sql):
-- pg_cron ruft per pg_net eine Server-Route der App auf und authentifiziert sich mit dem
-- Service-Role-Key aus dem Vault (Secret "email_queue_service_role_key", angelegt von der
-- E-Mail-Infrastruktur). Die Route prüft den Key, verschickt per Resend und setzt sent = true.
-- Aufgerufen wird nur, wenn tatsächlich etwas fällig ist.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-reminders') THEN
    PERFORM cron.unschedule('send-reminders');
  END IF;
END $$;

SELECT cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://kaufma.eu/api/public/reminders/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key' LIMIT 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  WHERE EXISTS (
    SELECT 1 FROM public.reminders WHERE sent = false AND remind_at <= now()
  );
  $cron$
);
