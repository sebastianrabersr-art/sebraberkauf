import { useEffect, useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SettingsCard, SettingsHeading, Toggle } from "./settingsUi";

/**
 * Gespeichert in user_settings.notification_preferences (JSON).
 * - reminder_emails: wird beim Erinnerungs-Versand ausgewertet (api/public/reminders/dispatch).
 * - product_updates: dieselbe Einwilligung wie "Marketing-E-Mails" im Profil (profiles.marketing_opt_in),
 *   wird deshalb an beiden Stellen geschrieben.
 * - new_articles: Einwilligung für künftige Hinweise auf neue Ratgeber-Artikel.
 */
export type NotificationPrefs = { reminder_emails: boolean; new_articles: boolean; product_updates: boolean };

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { reminder_emails: true, new_articles: false, product_updates: false };

const ITEMS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  {
    key: "reminder_emails",
    label: "Erinnerungen per E-Mail",
    description: "Zu jeder Erinnerung, die du im CRM setzt, bekommst du zur gewählten Zeit eine E-Mail. Ausgeschaltet bleiben Erinnerungen nur in der App sichtbar.",
  },
  {
    key: "new_articles",
    label: "Neue Ratgeber-Artikel",
    description: "Hinweis, wenn ein neuer Artikel zu Kauf, Finanzierung oder Rendite erscheint.",
  },
  {
    key: "product_updates",
    label: "Produkt-Updates von kaufma",
    description: "Neue Funktionen und wichtige Änderungen. Gleiche Einstellung wie „Marketing-E-Mails“ im Profil.",
  },
];

export function NotificationsPanel() {
  const { user, profile, refresh } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select("notification_preferences")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const stored = ((data as any)?.notification_preferences ?? {}) as Partial<NotificationPrefs>;
        setPrefs({
          reminder_emails: stored.reminder_emails ?? DEFAULT_NOTIFICATION_PREFS.reminder_emails,
          new_articles: stored.new_articles ?? DEFAULT_NOTIFICATION_PREFS.new_articles,
          product_updates: profile?.marketing_opt_in ?? stored.product_updates ?? DEFAULT_NOTIFICATION_PREFS.product_updates,
        });
      });
  }, [user, profile?.marketing_opt_in]);

  const update = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user || !prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next); // sofort zeigen, bei Fehler zurück
    setSaving(key);
    try {
      const { data: existing } = await supabase.from("user_settings").select("notification_preferences").eq("user_id", user.id).maybeSingle();
      const merged = { ...(((existing as any)?.notification_preferences ?? {}) as object), ...next };
      const { error } = await supabase.from("user_settings").upsert({ user_id: user.id, notification_preferences: merged } as any, { onConflict: "user_id" });
      if (error) throw error;
      if (key === "product_updates") {
        const { error: pErr } = await supabase.from("profiles").update({ marketing_opt_in: value } as any).eq("id", user.id);
        if (pErr) throw pErr;
        await refresh();
      }
      toast.success("Gespeichert", { duration: 1200 });
    } catch (e) {
      console.error("Benachrichtigungen speichern:", e);
      setPrefs(prefs);
      toast.error("Die Einstellung konnte nicht gespeichert werden. Bitte versuch es noch einmal.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4" style={{ maxWidth: 680 }}>
      <SettingsCard>
        <SettingsHeading title="E-Mail-Benachrichtigungen" description="Wähle, welche E-Mails du von kaufma bekommst. Änderungen werden sofort gespeichert." />
        {prefs === null ? (
          <div className="mt-5 flex items-center gap-2 text-[13px] text-[#78716C]"><CircleNotch className="size-4 animate-spin" aria-hidden /> Lade …</div>
        ) : (
          <ul className="mt-5 divide-y divide-[#EAE6DF] border-t border-[#EAE6DF]">
            {ITEMS.map((it) => (
              <li key={it.key} className="flex items-start justify-between gap-6 py-4">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[#1C1917]">{it.label}</div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[#78716C]">{it.description}</p>
                </div>
                <div className="pt-0.5">
                  <Toggle checked={prefs[it.key]} onChange={(v) => update(it.key, v)} label={it.label} disabled={saving === it.key} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </div>
  );
}
