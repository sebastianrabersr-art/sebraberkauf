import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login – kauf ma" }] }),
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
    // Full reload so AuthProvider re-bootstraps cleanly with persisted session
    window.location.replace(to);
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
        toast.error(error.message || "Anmeldung fehlgeschlagen.");
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
      toast.error(err?.message || "Unerwarteter Fehler beim Login.");
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
        toast.error(res.error.message || "Google-Login fehlgeschlagen.");
        setGoogleBusy(false);
        return;
      }
      if (res.redirected) return; // browser is leaving
      // Tokens already set
      go(redirect || "/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Google-Login fehlgeschlagen.");
      setGoogleBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-muted/30">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <a href="/" className="flex items-center gap-2 font-semibold mb-6">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center"><Building2 className="size-4" /></div>
          kauf ma
        </a>
        <h1 className="text-2xl font-semibold">Willkommen zurück</h1>
        <p className="text-muted-foreground text-sm mt-1">Melde dich an, um fortzufahren.</p>

        <Button type="button" variant="outline" className="w-full mt-6" onClick={handleGoogle} disabled={googleBusy || busy}>
          {googleBusy ? "Weiterleiten…" : "Mit Google fortfahren"}
        </Button>
        <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" /> oder <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
          </div>
          <div>
            <Label htmlFor="pw">Passwort</Label>
            <Input id="pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || googleBusy}>{busy ? "Anmelden…" : "Anmelden"}</Button>
        </form>

        <div className="text-sm text-center mt-5 text-muted-foreground">
          Noch kein Account? <button type="button" onClick={() => navigate({ to: "/signup" })} className="text-primary underline">Registrieren</button>
        </div>
        <div className="text-xs text-center mt-2">
          <button type="button" onClick={() => navigate({ to: "/reset-password" })} className="text-muted-foreground hover:text-foreground underline">Passwort vergessen?</button>
        </div>
      </div>
    </div>
  );
}
