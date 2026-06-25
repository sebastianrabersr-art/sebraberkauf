import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HTML = `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:0;background:#F7F5F0;font-family:Inter,Arial,sans-serif;color:#1A1A1A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #EAE6DF;border-radius:12px;padding:32px;">
            <tr><td>
              <h1 style="margin:0 0 16px;font-family:'Bricolage Grotesque',Inter,Arial,sans-serif;font-size:22px;font-weight:800;color:#1A1A1A;">Willkommen bei kaufma.</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3A3A3A;">Du kannst jetzt Immobilien analysieren, vergleichen und smarte Investitionsentscheidungen treffen.</p>
              <p style="margin:0 0 28px;">
                <a href="https://kaufma.eu/dashboard" style="display:inline-block;background:#2D6A4F;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">Zur App →</a>
              </p>
              <hr style="border:none;border-top:1px solid #EAE6DF;margin:24px 0;" />
              <p style="margin:0;font-size:12px;color:#8A8780;">kaufma.eu · Keine Anlage- oder Rechtsberatung</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, reason: "no_api_key" as const };

    const email = (context.claims as { email?: string })?.email;
    if (!email) return { ok: false, reason: "no_email" as const };

    // Dedupe via user_metadata.welcome_sent_at
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const meta = (userRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.welcome_sent_at) return { ok: true, skipped: true as const };

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "kaufma <noreply@kaufma.eu>",
        to: [email],
        subject: "Willkommen bei kaufma 👋",
        html: HTML,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[welcome-email] resend failed", resp.status, text);
      return { ok: false, reason: "resend_failed" as const, status: resp.status };
    }

    await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      user_metadata: { ...meta, welcome_sent_at: new Date().toISOString() },
    });

    return { ok: true, skipped: false as const };
  });
