import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { planLabel, planLimits, PLAN_PRICING, useAuth } from "@/lib/auth";
import { redeemPromoCode } from "@/lib/api/redeem-promo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Einstellungen – kauf ma" }] }),
  component: SettingsPage,
});

type PriceKey = "plus_monthly" | "plus_yearly" | "premium_monthly" | "premium_yearly";

function SettingsPage() {
  const { user, profile, subscription, refresh } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [marketing, setMarketing] = useState(profile?.marketing_opt_in ?? false);
  const [settings, setSettings] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [portalBusy, setPortalBusy] = useState(false);
  const { openCheckout, checkoutDialog } = useStripeCheckout();

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

  const upgrade = (plan: "plus" | "premium") => {
    if (!isStripeConfigured()) return toast.error("Zahlungen sind noch nicht konfiguriert.");
    const priceId: PriceKey = `${plan}_${cycle === "monthly" ? "monthly" : "yearly"}` as PriceKey;
    openCheckout({
      priceId,
      title: `Upgrade auf ${plan === "plus" ? "Plus" : "Premium"}`,
    });
  };

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const res = await createPortalSession({
        data: { returnUrl: `${window.location.origin}/settings`, environment: getStripeEnvironment() },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Portal konnte nicht geöffnet werden.");
    } finally {
      setPortalBusy(false);
    }
  };

  const currentPlan = subscription?.plan ?? "free";
  const hasActiveSub = currentPlan !== "free" && subscription?.subscription_status && ["active", "trialing", "past_due"].includes(subscription.subscription_status);

  return (
    <AppShell>
      <PageHeader title="Einstellungen" description="Profil, Standardwerte und Abo" />

      <div className="space-y-6 max-w-3xl">
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Abo & Plan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Aktueller Plan: <strong>{planLabel(currentPlan)}</strong>
                {subscription?.subscription_status && subscription.subscription_status !== "active" && currentPlan !== "free" && (
                  <span className="ml-2 text-xs">({subscription.subscription_status})</span>
                )}
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                <li>Immobilien: {planLimits(currentPlan).properties ?? "unbegrenzt"}</li>
                <li>Projekte: {planLimits(currentPlan).projects ?? "unbegrenzt"}</li>
                <li>Vergleich: {planLimits(currentPlan).compareLimit > 0 ? "enthalten" : "nicht enthalten"}</li>
                <li>Portfolio: {planLimits(currentPlan).portfolio ? "enthalten" : "nicht enthalten"}</li>
              </ul>
            </div>
            {hasActiveSub && (
              <Button variant="outline" onClick={openPortal} disabled={portalBusy}>
                {portalBusy && <Loader2 className="size-4 mr-2 animate-spin" />}Abo verwalten
              </Button>
            )}
          </div>

          {currentPlan !== "premium" && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setCycle("monthly")}
                  className={`px-3 py-1 rounded-full text-xs border ${cycle === "monthly" ? "bg-foreground text-background" : "bg-card"}`}
                >Monatlich</button>
                <button
                  onClick={() => setCycle("yearly")}
                  className={`px-3 py-1 rounded-full text-xs border ${cycle === "yearly" ? "bg-foreground text-background" : "bg-card"}`}
                >Jährlich · spare</button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {(["plus", "premium"] as const).filter((id) => id !== currentPlan).map((id) => {
                  const p = PLAN_PRICING[id];
                  const price = cycle === "monthly" ? p.monthly : p.yearly;
                  const period = cycle === "monthly" ? "Monat" : "Jahr";
                  return (
                    <div key={id} className="rounded-lg border p-4 text-sm">
                      <div className="font-medium">{id === "plus" ? "Plus" : "Premium"}</div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {price.toString().replace(".", ",")} € / {period}
                      </div>
                      <Button size="sm" className="mt-3 w-full" onClick={() => upgrade(id)}>
                        Upgrade auf {id === "plus" ? "Plus" : "Premium"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <PromoCodeCard />



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
      {checkoutDialog}
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
