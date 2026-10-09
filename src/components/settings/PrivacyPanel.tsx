import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleNotch, DownloadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { openCookieSettings } from "@/components/CookieBanner";
import { SettingsCard, SettingsHeading, btnPrimaryCls, btnSecondaryCls } from "./settingsUi";

const LEGAL = [
  { to: "/datenschutz", label: "Datenschutzerklärung ansehen" },
  { to: "/agb", label: "AGB ansehen" },
  { to: "/widerruf", label: "Widerrufsbelehrung ansehen" },
] as const;

/** Alle eigenen Zeilen einer Tabelle (RLS beschränkt ohnehin auf die eingeloggte Person). */
async function rows(table: string, userColumn = "user_id", userId: string) {
  const { data, error } = await (supabase.from(table as any) as any).select("*").eq(userColumn, userId);
  if (error) return { error: error.message };
  return data ?? [];
}

/** Einstellungen → Datenschutz. onDeleteAccount springt zur Konto-Löschung im Profil-Tab. */
export function PrivacyPanel({ onDeleteAccount }: { onDeleteAccount: () => void }) {
  const { user } = useAuth();
  const payments = useStore((s) => s.payments);
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profile, settings, subscriptions, projects, properties, viewings, documents, activities, reminders, propertyDocuments] =
        await Promise.all([
          rows("profiles", "id", user.id),
          rows("user_settings", "user_id", user.id),
          rows("subscriptions", "user_id", user.id),
          rows("projects", "user_id", user.id),
          rows("properties", "user_id", user.id),
          rows("viewings", "user_id", user.id),
          rows("documents", "user_id", user.id),
          rows("activities", "user_id", user.id),
          rows("reminders", "user_id", user.id),
          rows("property_documents", "user_id", user.id),
        ]);
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        exportiert_am: new Date().toISOString(),
        konto: { id: user.id, email: user.email },
        profil: profile,
        einstellungen: settings,
        abo: subscriptions,
        projekte: projects,
        // Einheiten von Zinshäusern stecken in properties[].data.units.
        immobilien: properties,
        besichtigungen: viewings,
        dokumente: documents,
        dokument_dateien: propertyDocuments,
        crm_aktivitaeten: activities,
        erinnerungen: reminders,
        // Zahlungs-Tracking liegt im Browser-Speicher dieses Geräts.
        zahlungen_dieses_geraets: payments,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kaufma-daten-export-${today}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Export heruntergeladen.");
    } catch (e) {
      console.error("Datenexport:", e);
      toast.error("Der Export hat gerade nicht geklappt. Bitte versuch es noch einmal.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4" style={{ maxWidth: 680 }}>
      <SettingsCard>
        <SettingsHeading title="Rechtliches" description="Wie wir mit deinen Daten umgehen und zu welchen Bedingungen." />
        <ul className="mt-3">
          {LEGAL.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="group flex items-center justify-between gap-3 border-b border-[#EAE6DF] py-3 text-[13px] text-[#1C1917] last:border-0 hover:text-primary">
                {l.label}
                <ArrowRight className="size-4 text-[#78716C] group-hover:text-primary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard>
        <SettingsHeading title="Deine Daten exportieren" description="Lade alle deine gespeicherten Immobilien und Daten als JSON-Datei herunter." />
        <button type="button" className={btnPrimaryCls + " mt-4"} onClick={exportData} disabled={exporting}>
          {exporting ? <CircleNotch className="size-3.5 animate-spin" aria-hidden /> : <DownloadSimple className="size-4" aria-hidden />}
          Daten exportieren
        </button>
      </SettingsCard>

      <SettingsCard>
        <SettingsHeading title="Cookies" description="Ändere jederzeit, ob kaufma Statistik-Cookies (Google Analytics) setzen darf." />
        <button type="button" className={btnSecondaryCls + " mt-4"} onClick={() => openCookieSettings()}>
          Cookie-Einstellungen ändern
        </button>
      </SettingsCard>

      <SettingsCard>
        <SettingsHeading title="Konto löschen" description="Löscht dein Konto mit allen Immobilien, Projekten und Notizen. Exportiere deine Daten vorher, wenn du sie behalten willst." />
        <button type="button" onClick={onDeleteAccount} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-destructive underline-offset-4 hover:underline">
          Zur Konto-Löschung <ArrowRight className="size-3.5" aria-hidden />
        </button>
      </SettingsCard>
    </div>
  );
}
