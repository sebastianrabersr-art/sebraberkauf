import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Passwort zurücksetzen – kauf ma" }] }),
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
    if (error) return toast.error(error.message);
    toast.success("Wir haben dir eine E-Mail mit einem Link geschickt.");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Passwort aktualisiert.");
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-muted/30">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <a href="/" className="flex items-center gap-2 font-semibold mb-6">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center"><Building2 className="size-4" /></div>
          kauf ma
        </a>
        {isRecovery ? (
          <>
            <h1 className="text-2xl font-semibold">Neues Passwort</h1>
            <form onSubmit={updatePassword} className="space-y-3 mt-5">
              <div>
                <Label htmlFor="pw">Neues Passwort</Label>
                <Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Speichern…" : "Passwort speichern"}</Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Passwort vergessen?</h1>
            <p className="text-muted-foreground text-sm mt-1">Wir senden dir einen Link.</p>
            <form onSubmit={requestReset} className="space-y-3 mt-5">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Senden…" : "Link senden"}</Button>
            </form>
          </>
        )}
        <div className="text-sm text-center mt-5">
          <a href="/login" className="text-primary underline">Zurück zum Login</a>
        </div>
      </div>
    </div>
  );
}
