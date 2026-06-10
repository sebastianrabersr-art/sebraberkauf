import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { planLabel, planLimits, PLAN_PRICING, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Einstellungen – kauf ma" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, subscription, refresh } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [marketing, setMarketing] = useState(profile?.marketing_opt_in ?? false);
  const [settings, setSettings] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setName(profile?.name ?? ""); setMarketing(profile?.marketing_opt_in ?? false); }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => setSettings(data));
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ name, marketing_opt_in: marketing }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Profil gespeichert");
  };

  const saveSettings = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("user_settings").upsert({ user_id: user.id, ...settings });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Einstellungen gespeichert");
  };

  const setS = (k: string, v: any) => setSettings((p: any) => ({ ...(p ?? { user_id: user!.id }), [k]: v }));

  return (
    <AppShell>
      <PageHeader title="Einstellungen" description="Profil, Standardwerte und Abo" />

      <div className="space-y-6 max-w-3xl">
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Abo & Plan</h2>
              <p className="text-sm text-muted-foreground mt-1">Aktueller Plan: <strong>{planLabel(subscription?.plan)}</strong> · Limit: {subscription?.property_limit ?? "∞"} Immobilien</p>
            </div>
            {subscription?.plan !== "premium" && (
              <Button onClick={() => toast.info("Stripe-Checkout wird in Kürze freigeschaltet.")}>Upgrade</Button>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Profil</h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div>
              <div className="text-sm font-medium">Marketing-E-Mails</div>
              <div className="text-xs text-muted-foreground">Tipps, Updates und neue Features</div>
            </div>
            <Switch checked={marketing} onCheckedChange={setMarketing} />
          </div>
          <Button className="mt-4" disabled={busy} onClick={saveProfile}>Speichern</Button>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Standardwerte für neue Immobilien</h2>
          <p className="text-sm text-muted-foreground mt-1">Werden bei neuen Objekten vorausgefüllt.</p>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <NumField label="Eigenkapital (€)" v={settings?.default_equity} onChange={(v) => setS("default_equity", v)} />
            <NumField label="Zinssatz (%)" v={settings?.default_interest_rate} onChange={(v) => setS("default_interest_rate", v)} />
            <NumField label="Laufzeit (Jahre)" v={settings?.default_loan_term} onChange={(v) => setS("default_loan_term", v)} />
            <NumField label="Maklerprovision (%)" v={settings?.default_commission_percent} onChange={(v) => setS("default_commission_percent", v)} />
            <NumField label="USt (%)" v={settings?.default_vat_rate} onChange={(v) => setS("default_vat_rate", v)} />
            <NumField label="Grunderwerbsteuer (%)" v={settings?.default_grunderwerbsteuer} onChange={(v) => setS("default_grunderwerbsteuer", v)} />
            <NumField label="Grundbuch (%)" v={settings?.default_grundbuchkosten} onChange={(v) => setS("default_grundbuchkosten", v)} />
            <NumField label="Vertragskosten (%)" v={settings?.default_vertragskosten} onChange={(v) => setS("default_vertragskosten", v)} />
            <NumField label="Leerstandspuffer (%)" v={settings?.default_vacancy_buffer} onChange={(v) => setS("default_vacancy_buffer", v)} />
            <NumField label="Instandhaltungsreserve (€/m²/Jahr)" v={settings?.default_repair_reserve} onChange={(v) => setS("default_repair_reserve", v)} />
          </div>
          <Button className="mt-4" disabled={busy} onClick={saveSettings}>Standardwerte speichern</Button>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Benachrichtigungen</h2>
          <div className="space-y-3 mt-4">
            {[
              ["tasks_due", "Aufgaben fällig"],
              ["followup_reminders", "Follow-up Erinnerungen"],
              ["viewing_reminders", "Besichtigungs-Erinnerungen"],
              ["weekly_summary", "Wöchentliche Zusammenfassung"],
              ["product_updates", "Produkt-Updates"],
            ].map(([k, label]) => {
              const np = settings?.notification_preferences ?? {};
              const v = np[k] ?? true;
              return (
                <div key={k} className="flex items-center justify-between">
                  <div className="text-sm">{label}</div>
                  <Switch checked={v} onCheckedChange={(checked) => setS("notification_preferences", { ...np, [k]: checked })} />
                </div>
              );
            })}
          </div>
          <Button className="mt-4" disabled={busy} onClick={saveSettings}>Benachrichtigungen speichern</Button>
        </section>
      </div>
    </AppShell>
  );
}

function NumField({ label, v, onChange }: { label: string; v: any; onChange: (n: number | null) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" value={v ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
    </div>
  );
}
