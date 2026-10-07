// Erinnerungs-E-Mail (Resend) – nur serverseitig verwenden.
// Aufgerufen von der Route /api/public/reminders/dispatch, die pg_cron alle 5 Minuten anstößt
// (supabase/migrations/20261007180200_send_reminders_cron.sql).

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type ReminderMailInput = {
  to: string;
  propertyId: string;
  /** Adresse bzw. Titel der Immobilie. */
  propertyLabel: string;
  note: string | null;
  remindAt: string;
};

export function reminderSubject(input: Pick<ReminderMailInput, "note" | "propertyLabel">): string {
  const topic = (input.note ?? "").trim() || input.propertyLabel || "deine Immobilie";
  const short = topic.length > 80 ? `${topic.slice(0, 79)}…` : topic;
  return `Erinnerung: ${short}`;
}

export function reminderHtml(input: ReminderMailInput): string {
  const url = `https://kaufma.eu/properties/${encodeURIComponent(input.propertyId)}`;
  const when = new Date(input.remindAt).toLocaleString("de-AT", {
    timeZone: "Europe/Vienna", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const note = (input.note ?? "").trim();
  return `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:0;background:#F5F3EE;font-family:Inter,Arial,sans-serif;color:#1C1917;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #EAE6DF;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#F5F3EE;border-bottom:2px solid #2D6A4F;padding:14px 24px;">
            <span style="font-family:'Bricolage Grotesque',Inter,Arial,sans-serif;font-size:20px;font-weight:800;color:#2D6A4F;">kaufma</span>
          </td></tr>
          <tr><td style="padding:24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#78716C;text-transform:uppercase;letter-spacing:0.06em;">Erinnerung · ${esc(when)}</p>
            <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1C1917;">${esc(input.propertyLabel || "Deine Immobilie")}</h1>
            ${note ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#1C1917;white-space:pre-wrap;">${esc(note)}</p>` : ""}
            <p style="margin:0 0 4px;">
              <a href="${url}" style="display:inline-block;background:#2D6A4F;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">Immobilie öffnen →</a>
            </p>
            <hr style="border:none;border-top:1px solid #EAE6DF;margin:24px 0 16px;" />
            <p style="margin:0;font-size:12px;color:#A8A29E;">kaufma.eu · Diese Erinnerung wurde von dir gesetzt</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Verschickt eine Erinnerung über Resend. Wirft bei Fehlern (Aufrufer setzt sent zurück). */
export async function sendReminderEmail(input: ReminderMailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY fehlt");
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "kaufma <noreply@kaufma.eu>",
      to: [input.to],
      subject: reminderSubject(input),
      html: reminderHtml(input),
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend ${resp.status}: ${text.slice(0, 200)}`);
  }
}
