import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { planLabel, planLimits, PLAN_PRICING, PRICE_IDS, useAuth } from "@/lib/auth";
import { redeemPromoCode } from "@/lib/api/redeem-promo.functions";
import { deleteOwnAccount } from "@/lib/api/delete-account.functions";
import { toast } from "sonner";
import { CircleNotch as Loader2 } from "@phosphor-icons/react";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { AssumptionsPanel } from "@/components/settings/AssumptionsPanel";
import { RemindersPanel } from "@/components/settings/RemindersPanel";
import { NotificationsPanel } from "@/components/settings/NotificationsPanel";
import { SecurityPanel } from "@/components/settings/SecurityPanel";
import { InvoicesPanel } from "@/components/settings/InvoicesPanel";
import { PrivacyPanel } from "@/components/settings/PrivacyPanel";
import { Toggle } from "@/components/settings/settingsUi";
import { useConfirmDialog } from "@/components/ConfirmDialog";

type SettingsTab = "profil" | "annahmen" | "erinnerungen" | "benachrichtigungen" | "sicherheit" | "rechnungen" | "datenschutz";
const TAB_IDS: SettingsTab[] = ["profil", "annahmen", "erinnerungen", "benachrichtigungen", "sicherheit", "rechnungen", "datenschutz"];

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Einstellungen – kaufma" }] }),
  // "profil" ist der Default und taucht deshalb nicht in der URL auf.
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } =>
    typeof search.tab === "string" && search.tab !== "profil" && (TAB_IDS as string[]).includes(search.tab)
      ? { tab: search.tab as SettingsTab }
      : {},
  component: SettingsPage,
});

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "profil", label: "Profil & Konto" },
  { id: "annahmen", label: "Annahmen" },
  { id: "erinnerungen", label: "Erinnerungen" },
  { id: "benachrichtigungen", label: "Benachrichtigungen" },
  { id: "sicherheit", label: "Sicherheit" },
  { id: "rechnungen", label: "Rechnungen" },
  { id: "datenschutz", label: "Datenschutz" },
];

type PriceKey = "plus_monthly" | "plus_yearly" | "premium_monthly" | "premium_yearly";

// ---------- Design tokens ----------
const cardCls =
  "bg-white";
const cardStyle: React.CSSProperties = {
  border: "1px solid #EAE6DF",
  borderRadius: 12,
  padding: "20px 24px",
};
const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  fontWeight: 600,
  color: "#1C1917",
};
const labelStyle: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontSize: 11,
  color: "var(--ink-2)",
  display: "block",
  marginBottom: 6,
};
const descStyle: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontSize: 11,
  color: "var(--ink-3)",
  marginTop: 4,
};
const inpCls =
  "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] text-[13px] text-[#1C1917] focus:border-primary focus:outline-none hover:border-[#1C1917]";
const btnPrimaryCls =
  "inline-flex items-center justify-center gap-2 rounded-[8px] bg-primary px-[18px] py-[9px] text-[13px] font-medium text-white hover:bg-[#235740] disabled:opacity-60";
const btnSecondaryCls =
  "inline-flex items-center justify-center gap-2 rounded-[8px] bg-white border-[1.5px] border-[#EAE6DF] px-[18px] py-[9px] text-[13px] text-[#1C1917] hover:border-[#1C1917] disabled:opacity-60";
const btnDangerCls =
  "inline-flex items-center justify-center gap-2 rounded-[8px] bg-white border-[1.5px] border-destructive px-[18px] py-[9px] text-[13px] text-destructive hover:bg-[#FEF2F2] disabled:opacity-60";

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    free: { bg: "#F5F3EE", fg: "#78716C", label: "Kostenlos" },
    plus: { bg: "#FEF3C7", fg: "#92400E", label: "Plus" },
    premium: { bg: "#E8F5EE", fg: "#2D6A4F", label: "Premium" },
  };
  const s = styles[plan] ?? styles.free;
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 999,
        display: "inline-block",
      }}
    >
      {s.label}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "#F5F3EE",
        color: "#1C1917",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        padding: "3px 9px",
        borderRadius: 999,
        border: "1px solid #EAE6DF",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const tab: SettingsTab = Route.useSearch().tab ?? "profil";
  const setTab = (t: SettingsTab) =>
    navigate({ to: "/settings", search: t === "profil" ? {} : { tab: t }, replace: true });
  const { user, profile, subscription, refresh, signOut } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [firstName, setFirstName] = useState<string>((profile as any)?.first_name ?? "");
  const [lastName, setLastName] = useState<string>((profile as any)?.last_name ?? "");
  const [address, setAddress] = useState<string>((profile as any)?.address ?? "");
  const [marketing, setMarketing] = useState(profile?.marketing_opt_in ?? false);
  const [busy, setBusy] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [portalBusy, setPortalBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { openCheckout, checkoutDialog } = useStripeCheckout();
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    setName(profile?.name ?? "");
    setFirstName((profile as any)?.first_name ?? "");
    setLastName((profile as any)?.last_name ?? "");
    setAddress((profile as any)?.address ?? "");
    setMarketing(profile?.marketing_opt_in ?? false);
  }, [profile]);

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        marketing_opt_in: marketing,
        first_name: firstName,
        last_name: lastName,
        address,
      } as any)
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      console.error("Profil speichern:", error);
      return toast.error("Dein Profil konnte nicht gespeichert werden. Bitte versuch es gleich noch einmal.");
    }
    await refresh();
    toast.success("Profil gespeichert");
  };

  const upgrade = (plan: "plus" | "premium") => {
    if (!isStripeConfigured()) return toast.error("Zahlungen sind noch nicht konfiguriert.");
    const key = `${plan}_${cycle}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[key];
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
      console.error("Kundenportal:", e);
      toast.error("Die Abo-Verwaltung konnte gerade nicht geöffnet werden. Bitte versuch es gleich noch einmal oder schreib an hallo@kaufma.eu.");
    } finally {
      setPortalBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const ok = await confirm({
      title: "Konto löschen",
      message: "Dein Konto und alle gespeicherten Immobilien werden sofort und dauerhaft gelöscht. Wenn du deine Daten behalten willst, exportiere sie vorher unter Einstellungen → Datenschutz.",
      confirmLabel: "Konto endgültig löschen",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      // Löscht den Auth-User serverseitig; alle Nutzerdaten hängen per CASCADE daran.
      const res = await deleteOwnAccount();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await supabase.auth.signOut();
      toast.success("Dein Konto und alle gespeicherten Daten sind gelöscht.");
      window.location.href = "/";
    } catch {
      toast.error("Dein Konto konnte gerade nicht gelöscht werden. Bitte versuch es später noch einmal.");
    } finally {
      setDeleting(false);
    }
  };

  // Auf schmalen Bildschirmen den aktiven Tab in die sichtbare Leiste holen.
  useEffect(() => {
    document.querySelector<HTMLElement>('[role="tablist"] [data-active]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [tab]);

  const goToAccountDeletion = () => {
    setTab("profil");
    setTimeout(() => document.getElementById("konto-loeschen")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  const currentPlan = subscription?.plan ?? "free";
  const hasActiveSub =
    currentPlan !== "free" &&
    subscription?.subscription_status &&
    ["active", "trialing", "past_due"].includes(subscription.subscription_status);
  const limits = planLimits(currentPlan);

  return (
    <AppShell>
      <PageHeader title="Einstellungen" description="Profil, Abo, Sicherheit und Datenschutz" />

      <div role="tablist" aria-label="Einstellungen" className="mb-6 flex gap-1 border-b border-[#EAE6DF] overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              data-active={active || undefined}
              onClick={() => setTab(t.id)}
              className="-mb-px shrink-0 whitespace-nowrap px-4 py-2.5 text-[13px] transition-colors border-b-2"
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: active ? 600 : 500,
                color: active ? "#2D6A4F" : "var(--ink-2)",
                borderColor: active ? "#2D6A4F" : "transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profil" && (
      <div className="space-y-4" style={{ maxWidth: 680 }}>
        {/* Profil */}
        <section className={cardCls} style={cardStyle}>
          <h2 style={sectionTitleStyle}>Profil</h2>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <div>
              <label style={labelStyle}>Vorname</label>
              <input className={inpCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Nachname</label>
              <input className={inpCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Anzeigename</label>
              <input className={inpCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>E-Mail</label>
              <input className={inpCls} value={profile?.email ?? ""} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="sm:col-span-2">
              <label style={labelStyle}>Adresse</label>
              <input className={inpCls} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div>
              <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 500, color: "#1C1917" }}>Marketing-E-Mails</div>
              <div style={descStyle}>Tipps, Updates und neue Features</div>
            </div>
            <Toggle checked={marketing} onChange={setMarketing} label="Marketing-E-Mails" />
          </div>
          <button className={btnPrimaryCls + " mt-4"} disabled={busy} onClick={saveProfile}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}Speichern
          </button>
        </section>

        {/* Abo */}
        <section className={cardCls} style={cardStyle}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 style={sectionTitleStyle}>Abo & Plan</h2>
              <div className="mt-2 flex items-center gap-2">
                <PlanBadge plan={currentPlan} />
                {subscription?.subscription_status && subscription.subscription_status !== "active" && currentPlan !== "free" && (
                  <span style={{ fontFamily: "Inter", fontSize: 11, color: "var(--ink-2)" }}>
                    ({subscription.subscription_status})
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip>Immobilien: {limits.properties ?? "∞"}</Chip>
                <Chip>Projekte: {limits.projects ?? "∞"}</Chip>
                <Chip>Vergleich: {limits.compareLimit > 0 ? `bis ${limits.compareLimit} Objekte` : "nicht enthalten"}</Chip>
                <Chip>Portfolio: {limits.portfolio ? "enthalten" : "nicht enthalten"}</Chip>
              </div>
            </div>
            {hasActiveSub && (
              <button className={btnSecondaryCls} onClick={openPortal} disabled={portalBusy}>
                {portalBusy && <Loader2 className="size-3.5 animate-spin" />}
                Abo verwalten
              </button>
            )}
          </div>

          {currentPlan !== "premium" && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setCycle("monthly")}
                  className="px-3 py-1 rounded-full text-[11px] font-medium transition-colors"
                  style={{
                    background: cycle === "monthly" ? "#1C1917" : "#F5F3EE",
                    color: cycle === "monthly" ? "#FFFFFF" : "#1C1917",
                    border: "1px solid #EAE6DF",
                  }}
                >
                  Monatlich
                </button>
                <button
                  onClick={() => setCycle("yearly")}
                  className="px-3 py-1 rounded-full text-[11px] font-medium transition-colors"
                  style={{
                    background: cycle === "yearly" ? "#1C1917" : "#F5F3EE",
                    color: cycle === "yearly" ? "#FFFFFF" : "#1C1917",
                    border: "1px solid #EAE6DF",
                  }}
                >
                  Jährlich · spare
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {(["plus", "premium"] as const)
                  .filter((id) => id !== currentPlan)
                  .map((id) => {
                    const p = PLAN_PRICING[id];
                    const price = cycle === "monthly" ? p.monthly : p.yearly;
                    const period = cycle === "monthly" ? "Monat" : "Jahr";
                    return (
                      <div key={id} style={{ border: "1px solid #EAE6DF", borderRadius: 10, padding: 14 }}>
                        <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: "#1C1917" }}>
                          {id === "plus" ? "Plus" : "Premium"}
                        </div>
                        <div style={{ fontFamily: "Inter", fontSize: 11, color: "var(--ink-2)", marginTop: 2 }}>
                          {price.toString().replace(".", ",")} € / {period}
                        </div>
                        <button className={btnPrimaryCls + " mt-3 w-full"} onClick={() => upgrade(id)}>
                          Upgrade auf {id === "plus" ? "Plus" : "Premium"}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>

        <PromoCodeCard />

        {/* Konto / Danger zone */}
        <section id="konto-loeschen" className={cardCls + " scroll-mt-6"} style={cardStyle}>
          <h2 style={sectionTitleStyle}>Konto</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={btnSecondaryCls} onClick={handleSignOut}>Abmelden</button>
            <button className={btnDangerCls} onClick={handleDeleteAccount} disabled={deleting}>
              {deleting && <Loader2 className="size-3.5 animate-spin" />}Konto löschen
            </button>
          </div>
        </section>
      </div>
      )}

      {tab === "annahmen" && (
      <div className="space-y-8">
        <AssumptionsPanel />
      </div>
      )}

      {tab === "erinnerungen" && <RemindersPanel />}
      {tab === "benachrichtigungen" && <NotificationsPanel />}
      {tab === "sicherheit" && <SecurityPanel />}
      {tab === "rechnungen" && <InvoicesPanel />}
      {tab === "datenschutz" && <PrivacyPanel onDeleteAccount={goToAccountDeletion} />}
      {checkoutDialog}
    </AppShell>
  );
}

function PromoCodeCard() {
  const { refresh } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await redeemPromoCode({ data: { code: trimmed } });
      if (!res.ok) {
        setError(res.error);
      } else {
        const planLabelDe = res.plan === "premium" ? "Premium" : "Plus";
        toast.success(`Code eingelöst! Du hast jetzt ${planLabelDe} für ${res.durationMonths} Monate.`);
        setCode("");
        await refresh();
      }
    } catch {
      setError("Ungültiger oder bereits verwendeter Code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="bg-white"
      style={{ border: "1px solid #EAE6DF", borderRadius: 12, padding: "16px 20px" }}
    >
      <h2
        style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#1C1917" }}
      >
        Promo-Code einlösen
      </h2>
      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          placeholder="Code eingeben"
          spellCheck={false}
          autoCapitalize="characters"
          className="flex-1 rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-3 py-[9px] text-[13px] text-[#1C1917] uppercase tracking-wider focus:border-primary focus:outline-none hover:border-[#1C1917]"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="inline-flex items-center gap-2 rounded-[8px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:bg-[#235740] disabled:opacity-60"
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          Einlösen
        </button>
      </form>
      {error && (
        <div
          className="mt-2"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#D97706" }}
        >
          {error}
        </div>
      )}
    </section>
  );
}
