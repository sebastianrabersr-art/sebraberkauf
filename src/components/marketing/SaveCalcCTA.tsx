import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { submitCalcLead } from "@/lib/leads.functions";
import { savePendingCalc, type PendingCalc } from "@/lib/pendingCalc";
import { useAuth } from "@/lib/auth";

export function SaveCalcCTA({ snapshot }: { snapshot: PendingCalc }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mailOpen, setMailOpen] = useState(false);

  const handleSave = () => {
    savePendingCalc(snapshot);
    if (session) {
      navigate({ to: "/from-calc" });
    } else {
      navigate({ to: "/signup", search: { plan: "free" } });
    }
  };

  return (
    <div className="mt-8 rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <div className="font-semibold">Berechnung speichern und Immobilie vollständig analysieren</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Erstelle kostenlos einen Account und übernimm deine Eingaben direkt in eine vollständige Immobilienanalyse.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 shrink-0"
        >
          Berechnung speichern <ArrowRight className="size-4" />
        </button>
      </div>
      {!session && (
        <div className="mt-4 pt-4 border-t border-primary/10 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <p className="text-xs text-muted-foreground">Noch keinen Account? Lass dir das Ergebnis per E-Mail schicken.</p>
          <button
            type="button"
            onClick={() => setMailOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Mail className="size-4" /> Berechnung per E-Mail senden
          </button>
        </div>
      )}
      <EmailLeadDialog open={mailOpen} onOpenChange={setMailOpen} snapshot={snapshot} />
    </div>
  );
}

function EmailLeadDialog({
  open, onOpenChange, snapshot,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; snapshot: PendingCalc;
}) {
  const submit = useServerFn(submitCalcLead);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!consent) { toast.error("Bitte Zustimmung erteilen."); return; }
    setBusy(true);
    try {
      await submit({ data: { email: email.trim(), consent, calc_type: snapshot.type, calc_payload: snapshot } });
      setDone(true);
      toast.success("Wir haben deine Berechnung notiert.");
    } catch (err: any) {
      toast.error(err?.message || "Konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setDone(false); setEmail(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Berechnung per E-Mail senden</DialogTitle>
          <DialogDescription>
            Wir schicken dir die Eckwerte und Hinweise zu deiner Berechnung.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="size-10 text-success mx-auto" />
            <div className="font-medium">Erledigt!</div>
            <p className="text-sm text-muted-foreground">Du bekommst gleich eine Bestätigung per E-Mail.</p>
            <Link
              to="/signup"
              search={{ plan: "free" }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 mt-2"
            >
              Account erstellen <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="lead-email">E-Mail</Label>
              <Input id="lead-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@beispiel.com" />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              <span>Ich bin einverstanden, dass mir kauf ma die Berechnung sowie passende Tipps per E-Mail zusendet. Ich kann jederzeit widerrufen.</span>
            </label>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <><Loader2 className="size-4 animate-spin mr-1.5" /> Senden…</> : "Berechnung senden"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
