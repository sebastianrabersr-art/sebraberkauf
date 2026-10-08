import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { AuthLayout, GoogleButton, OrDivider, authInputCls, authLabelCls, authPrimaryCls } from "@/components/AuthLayout";
import { authErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login – kaufma" }] }),
  component: Login,
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/dashboard" }),
});

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // If already signed in, bounce immediately
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        window.location.replace(redirect || "/dashboard");
      }
    });
    return () => { cancelled = true; };
  }, [redirect]);

  const go = (to: string) => {
    let target = to;
    try { if (localStorage.getItem("pending_calc_v1")) target = "/from-calc"; } catch {}
    // Full reload so AuthProvider re-bootstraps cleanly with persisted session
    window.location.replace(target);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      toast.error("Bitte E-Mail und Passwort ausfüllen.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(authErrorMessage(error, "Die Anmeldung hat nicht geklappt. Bitte versuch es noch einmal."));
        setBusy(false);
        return;
      }
      if (!data.session) {
        toast.error("Anmeldung fehlgeschlagen — keine Session erhalten.");
        setBusy(false);
        return;
      }
      // Ensure the session is fully persisted before we navigate
      const { data: check } = await supabase.auth.getSession();
      if (!check.session) {
        toast.error("Session konnte nicht gespeichert werden. Bitte erneut versuchen.");
        setBusy(false);
        return;
      }
      toast.success("Willkommen zurück!");
      go(redirect || "/dashboard");
    } catch (err: any) {
      toast.error(authErrorMessage(err, "Die Anmeldung hat nicht geklappt. Bitte versuch es noch einmal."));
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth-callback?redirect=" + encodeURIComponent(redirect || "/dashboard"),
      });
      if (res.error) {
        toast.error(authErrorMessage(res.error, "Die Anmeldung mit Google hat nicht geklappt."));
        setGoogleBusy(false);
        return;
      }
      if (res.redirected) return; // browser is leaving
      // Tokens already set
      go(redirect || "/dashboard");
    } catch (err: any) {
      toast.error(authErrorMessage(err, "Die Anmeldung mit Google hat nicht geklappt."));
      setGoogleBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Willkommen zurück"
      subtitle="Melde dich an, um mit deinen Kaufkandidaten weiterzumachen."
      footer={
        <>
          Noch kein Konto?{" "}
          <button type="button" onClick={() => navigate({ to: "/signup" })} className="font-medium text-primary underline-offset-4 hover:underline">
            Registrieren
          </button>
        </>
      }
    >
      <GoogleButton onClick={handleGoogle} disabled={googleBusy || busy}>
        {googleBusy ? "Weiterleiten…" : "Mit Google fortfahren"}
      </GoogleButton>
      <OrDivider />

      <form onSubmit={handleEmail} className="space-y-4">
        <div>
          <label htmlFor="email" className={authLabelCls}>E-Mail</label>
          <input id="email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} className={authInputCls} />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="pw" className={authLabelCls}>Passwort</label>
            <button type="button" onClick={() => navigate({ to: "/reset-password" })} className="text-[13px] text-ink-2 hover:text-[#1C1917] underline-offset-4 hover:underline">
              Passwort vergessen?
            </button>
          </div>
          <input id="pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} className={authInputCls} />
        </div>
        <button type="submit" className={authPrimaryCls} disabled={busy || googleBusy}>{busy ? "Anmelden…" : "Anmelden"}</button>
      </form>
    </AuthLayout>
  );
}
