import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Willkommen – kauf ma" }] }),
  component: Onboarding,
});

const GOALS = [
  { id: "vermieten", label: "Vermieten (Investment)" },
  { id: "fixflip", label: "Fix & Flip (Kaufen, Renovieren, Verkaufen)" },
  { id: "eigen", label: "Selbst bewohnen" },
  { id: "mix", label: "Beides – noch offen" },
];

function Onboarding() {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("vermieten");
  const [location, setLocation] = useState("Wien");
  const [equity, setEquity] = useState("50000");
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    await supabase.from("user_settings").upsert({
      user_id: user.id,
      goal,
      location_focus: location,
      default_equity: Number(equity) || null,
    });
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    await refresh();
    setBusy(false);
    toast.success("Los geht's!");
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-muted/30">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 font-semibold mb-6">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center"><Building2 className="size-4" /></div>
          kauf ma
        </div>
        <div className="text-xs text-muted-foreground mb-2">Schritt {step} von 3</div>
        <div className="h-1 bg-muted rounded overflow-hidden mb-6">
          <div className="h-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {step === 1 && (
          <>
            <h1 className="text-2xl font-semibold">Was ist dein Ziel?</h1>
            <div className="space-y-2 mt-5">
              {GOALS.map((g) => (
                <label key={g.id} className={`block rounded-md border p-3 cursor-pointer ${goal === g.id ? "border-primary bg-primary/5" : ""}`}>
                  <input type="radio" name="goal" className="mr-2" checked={goal === g.id} onChange={() => setGoal(g.id)} />
                  {g.label}
                </label>
              ))}
            </div>
            <Button className="w-full mt-6" onClick={() => setStep(2)}>Weiter</Button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-semibold">Wo suchst du?</h1>
            <Label className="mt-5 block">Stadt / Region</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z. B. Wien, Graz, Linz" />
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Zurück</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>Weiter</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-semibold">Eigenkapital (optional)</h1>
            <p className="text-sm text-muted-foreground mt-1">Wird als Standard für neue Immobilien verwendet.</p>
            <Label className="mt-5 block">Eigenkapital in €</Label>
            <Input type="number" value={equity} onChange={(e) => setEquity(e.target.value)} placeholder="50000" />
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Zurück</Button>
              <Button className="flex-1" disabled={busy} onClick={finish}>{busy ? "Speichern…" : "Loslegen"}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
