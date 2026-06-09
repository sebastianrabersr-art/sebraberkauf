import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Willkommen zurück!");
    window.location.href = redirect;
  };

  const handleGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth-callback?redirect=" + encodeURIComponent(redirect) });
    if (res.error) toast.error(res.error.message || "Login fehlgeschlagen");
    if (res.redirected) return;
    if (!res.error) window.location.href = redirect;
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

        <Button type="button" variant="outline" className="w-full mt-6" onClick={handleGoogle}>
          Mit Google fortfahren
        </Button>
        <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" /> oder <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pw">Passwort</Label>
            <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Anmelden…" : "Anmelden"}</Button>
        </form>

        <div className="text-sm text-center mt-5 text-muted-foreground">
          Noch kein Account? <a href="/signup" className="text-primary underline">Registrieren</a>
        </div>
        <div className="text-xs text-center mt-2">
          <a href="/reset-password" className="text-muted-foreground hover:text-foreground underline">Passwort vergessen?</a>
        </div>
      </div>
    </div>
  );
}
