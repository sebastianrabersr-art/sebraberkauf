import { createFileRoute } from "@tanstack/react-router";

/*
 * Verschickt fällige Erinnerungen (remind_at <= now, sent = false).
 * Aufruf alle 5 Minuten durch pg_cron (supabase/migrations/20261007180200_send_reminders_cron.sql),
 * authentifiziert wie die E-Mail-Warteschlange: Service-Role-Key als Bearer-Token.
 */

const BATCH = 50;

type PropertyData = { title?: string; adresse?: string; bezirk?: string; city?: string };

function propertyLabel(d: PropertyData | null | undefined): string {
  if (!d) return "";
  const address = [d.adresse, d.bezirk, d.city].map((s) => (s ?? "").trim()).filter(Boolean).join(", ");
  return address || (d.title ?? "").trim();
}

export const Route = createFileRoute("/api/public/reminders/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) return Response.json({ error: "Server configuration error" }, { status: 500 });

        const auth = request.headers.get("Authorization");
        if (!auth?.startsWith("Bearer ")) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (auth.slice("Bearer ".length).trim() !== serviceKey) return Response.json({ error: "Forbidden" }, { status: 403 });

        const [{ supabaseAdmin }, { sendReminderEmail }] = await Promise.all([
          import("@/integrations/supabase/client.server"),
          import("@/lib/reminder-email.functions"),
        ]);

        const { data: due, error } = await supabaseAdmin
          .from("reminders")
          .select("id, user_id, property_id, note, remind_at")
          .eq("sent", false)
          .lte("remind_at", new Date().toISOString())
          .order("remind_at", { ascending: true })
          .limit(BATCH);
        if (error) {
          console.error("[reminders] query failed", error);
          return Response.json({ error: "query_failed" }, { status: 500 });
        }

        let sent = 0;
        let failed = 0;
        const emailCache = new Map<string, string | null>();

        for (const r of due ?? []) {
          // Beanspruchen: nur wer sent von false auf true setzt, verschickt (schützt vor Doppelversand).
          const { data: claimed } = await supabaseAdmin
            .from("reminders")
            .update({ sent: true })
            .eq("id", r.id)
            .eq("sent", false)
            .select("id");
          if (!claimed?.length) continue;

          try {
            if (!emailCache.has(r.user_id)) {
              const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
              emailCache.set(r.user_id, u?.user?.email ?? null);
            }
            const to = emailCache.get(r.user_id);
            if (!to) {
              // Dauerhaft nicht zustellbar – nicht endlos erneut versuchen.
              console.error("[reminders] no email for user", r.user_id);
              failed++;
              continue;
            }

            const { data: prop } = await supabaseAdmin
              .from("properties")
              .select("data")
              .eq("id", r.property_id)
              .maybeSingle();

            await sendReminderEmail({
              to,
              propertyId: r.property_id,
              propertyLabel: propertyLabel(prop?.data as PropertyData | undefined),
              note: r.note,
              remindAt: r.remind_at,
            });
            sent++;
          } catch (e) {
            failed++;
            console.error("[reminders] send failed", r.id, e);
            // Freigeben, damit der nächste Lauf es erneut versucht.
            await supabaseAdmin.from("reminders").update({ sent: false }).eq("id", r.id);
          }
        }

        return Response.json({ due: due?.length ?? 0, sent, failed });
      },
    },
  },
});
