import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthLayout, authInputCls, authLabelCls, authPrimaryCls } from "@/components/AuthLayout";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Passwort zurücksetzen – kaufma" }] }),
  component: Reset,
});

function Reset() {
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) return toast.error(authErrorMessage(error, "Die E-Mail konnte nicht verschickt werden. Bitte versuch es noch einmal."));
    toast.success("Wir haben dir eine E-Mail mit einem Link geschickt.");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(authErrorMessage(error, "Das Passwort konnte nicht geändert werden. Bitte versuch es noch einmal."));
    toast.success("Passwort aktualisiert.");
    window.location.href = "/dashboard";
  };

  const back = <a href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Zurück zum Login</a>;

  return isRecovery ? (
    <AuthLayout title="Neues Passwort" subtitle="Wähl ein neues Passwort für dein Konto." footer={back}>
      <form onSubmit={updatePassword} className="space-y-4">
        <div>
          <label htmlFor="pw" className={authLabelCls}>Neues Passwort</label>
          <input id="pw" type="password" required minLength={8} autoComplete="new-password" aria-describedby="pw-hint" value={password} onChange={(e) => setPassword(e.target.value)} className={authInputCls} />
          <p id="pw-hint" className="text-[12px] text-ink-3 mt-1.5">Mindestens 8 Zeichen.</p>
        </div>
        <button type="submit" className={authPrimaryCls} disabled={busy}>{busy ? "Speichern…" : "Passwort speichern"}</button>
      </form>
    </AuthLayout>
  ) : (
    <AuthLayout title="Passwort vergessen?" subtitle="Gib deine E-Mail-Adresse ein – wir schicken dir einen Link zum Zurücksetzen." footer={back}>
      <form onSubmit={requestReset} className="space-y-4">
        <div>
          <label htmlFor="email" className={authLabelCls}>E-Mail</label>
          <input id="email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authInputCls} />
        </div>
        <button type="submit" className={authPrimaryCls} disabled={busy}>{busy ? "Wird gesendet…" : "Link senden"}</button>
      </form>
    </AuthLayout>
  );
}
