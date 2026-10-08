import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { AuthLayout, GoogleButton, OrDivider, authInputCls, authLabelCls, authPrimaryCls } from "@/components/AuthLayout";
import { track } from "@/lib/analytics";
import { authErrorMessage } from "@/lib/auth-errors";
import { sendWelcomeEmail } from "@/lib/welcome-email.functions";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Registrieren – kaufma" }] }),
  component: Signup,
  validateSearch: (s: Record<string, unknown>): { plan?: string } =>
    typeof s.plan === "string" && s.plan ? { plan: s.plan } : {},
});

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { track("signup_started"); }, []);

  const nextAfterAuth = () => {
    try {
      if (localStorage.getItem("pending_calc_v1")) return "/from-calc";
      if (localStorage.getItem("pending_analyze_url")) return "/analyze";
    } catch {}
    return "/onboarding";
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin + "/auth-callback",
      },
    });
    setBusy(false);
    if (error) return toast.error(authErrorMessage(error, "Das Konto konnte nicht angelegt werden. Bitte versuch es noch einmal."));
    track("signup_completed", { source: "email" });
    try { await sendWelcomeEmail(); } catch (e) { console.warn("welcome email failed", e); }
    toast.success("Account erstellt! Du kannst jetzt loslegen.");
    window.location.href = nextAfterAuth();
  };

  const handleGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth-callback" });
    if (res.error) toast.error(authErrorMessage(res.error, "Die Registrierung mit Google hat nicht geklappt."));
    if (res.redirected) return;
    if (!res.error) {
      track("signup_completed", { source: "google" });
      window.location.href = nextAfterAuth();
    }
  };

  return (
    <AuthLayout
      title="Kostenlos starten"
      subtitle="Eine Immobilie komplett gratis analysieren. Keine Kreditkarte nötig."
      footer={
        <>
          Schon ein Konto?{" "}
          <a href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Anmelden</a>
        </>
      }
    >
      <GoogleButton onClick={handleGoogle} disabled={busy}>Mit Google registrieren</GoogleButton>
      <OrDivider />

      <form onSubmit={handleEmail} className="space-y-4">
        <div>
          <label htmlFor="name" className={authLabelCls}>Name</label>
          <input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={authInputCls} />
        </div>
        <div>
          <label htmlFor="email" className={authLabelCls}>E-Mail</label>
          <input id="email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} />
        </div>
        <div>
          <label htmlFor="pw" className={authLabelCls}>Passwort</label>
          <input id="pw" type="password" required minLength={8} autoComplete="new-password" aria-describedby="pw-hint" value={password} onChange={(e) => setPassword(e.target.value)} className={authInputCls} />
          <p id="pw-hint" className="text-[12px] text-ink-3 mt-1.5">Mindestens 8 Zeichen.</p>
        </div>
        <button type="submit" className={authPrimaryCls} disabled={busy}>{busy ? "Konto wird erstellt…" : "Account erstellen"}</button>
        <p className="text-[12px] text-ink-3 leading-relaxed">
          Mit der Registrierung akzeptierst du die{" "}
          <a href="/agb" className="underline underline-offset-2 hover:text-[#1C1917]">AGB</a> und hast die{" "}
          <a href="/datenschutz" className="underline underline-offset-2 hover:text-[#1C1917]">Datenschutzerklärung</a> gelesen.
        </p>
      </form>
    </AuthLayout>
  );
}
