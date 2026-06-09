import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Registrieren – kauf ma" }] }),
  component: Signup,
  validateSearch: (s: Record<string, unknown>) => ({ plan: (s.plan as string) || "free" }),
});

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
    if (error) return toast.error(error.message);
    toast.success("Account erstellt! Du kannst jetzt loslegen.");
    window.location.href = "/onboarding";
  };

  const handleGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth-callback" });
    if (res.error) toast.error(res.error.message || "Registrierung fehlgeschlagen");
    if (res.redirected) return;
    if (!res.error) window.location.href = "/onboarding";
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-muted/30">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <a href="/" className="flex items-center gap-2 font-semibold mb-6">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center"><Building2 className="size-4" /></div>
          kauf ma
        </a>
        <h1 className="text-2xl font-semibold">Kostenlos starten</h1>
        <p className="text-muted-foreground text-sm mt-1">1 Immobilie gratis. Keine Kreditkarte nötig.</p>

        <Button type="button" variant="outline" className="w-full mt-6" onClick={handleGoogle}>
          Mit Google registrieren
        </Button>
        <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" /> oder <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pw">Passwort</Label>
            <Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Erstellen…" : "Account erstellen"}</Button>
        </form>

        <div className="text-sm text-center mt-5 text-muted-foreground">
          Schon ein Account? <a href="/login" className="text-primary underline">Login</a>
        </div>
      </div>
    </div>
  );
}
