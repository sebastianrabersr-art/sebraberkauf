import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle, CircleNotch, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { SettingsCard, SettingsHeading, btnDangerCls, btnPrimaryCls, btnSecondaryCls } from "./settingsUi";

type Enrollment = { factorId: string; qr: string; secret: string };

/** Einstellungen → Sicherheit: TOTP-2FA über Supabase MFA und Passwort-Reset per E-Mail. */
export function SecurityPanel() {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined); // undefined = lädt
  const [starting, setStarting] = useState(false);
  const [enroll, setEnroll] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  const loadFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setFactorId(null); return; }
    setFactorId(data.totp.find((f) => f.status === "verified")?.id ?? null);
  }, []);

  useEffect(() => { void loadFactors(); }, [loadFactors]);

  const startEnroll = async () => {
    setStarting(true);
    try {
      // Abgebrochene, unbestätigte Versuche zuerst entfernen – sonst lehnt Supabase einen neuen ab.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "kaufma" });
      if (error || !data) throw error ?? new Error("enroll failed");
      setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
      setCodeError(null);
    } catch (e) {
      console.error("2FA einrichten:", e);
      toast.error("Die Einrichtung konnte nicht gestartet werden. Bitte versuch es gleich noch einmal.");
    } finally {
      setStarting(false);
    }
  };

  const cancelEnroll = async () => {
    const pending = enroll;
    setEnroll(null);
    if (pending) await supabase.auth.mfa.unenroll({ factorId: pending.factorId });
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) { setCodeError("Bitte gib den 6-stelligen Code aus der App ein."); return; }
    setVerifying(true);
    setCodeError(null);
    try {
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (cErr || !ch) throw cErr ?? new Error("challenge failed");
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: ch.id, code: clean });
      if (vErr) { setCodeError("Der Code stimmt nicht oder ist abgelaufen. Nimm den aktuellen Code aus der App."); return; }
      setEnroll(null);
      setFactorId(enroll.factorId);
      toast.success("Zwei-Faktor-Authentifizierung ist aktiv.");
    } catch (err) {
      console.error("2FA bestätigen:", err);
      setCodeError("Die Bestätigung hat gerade nicht geklappt. Bitte versuch es noch einmal.");
    } finally {
      setVerifying(false);
    }
  };

  const disable = async () => {
    if (!factorId) return;
    const ok = await confirm({
      title: "2FA deaktivieren",
      message: "Beim Anmelden wird dann nur noch dein Passwort abgefragt. Du kannst 2FA jederzeit wieder einrichten.",
      confirmLabel: "2FA deaktivieren",
      danger: true,
    });
    if (!ok) return;
    setDisabling(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setDisabling(false);
    if (error) {
      console.error("2FA deaktivieren:", error);
      toast.error("2FA konnte nicht deaktiviert werden. Melde dich ab und mit Code wieder an, dann klappt es.");
      return;
    }
    setFactorId(null);
    toast.success("Zwei-Faktor-Authentifizierung ist deaktiviert.");
  };

  const sendReset = async () => {
    const email = user?.email;
    if (!email) return;
    setResetBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setResetBusy(false);
    if (error) {
      console.error("Passwort-Reset:", error);
      toast.error("Die E-Mail konnte gerade nicht verschickt werden. Bitte versuch es in ein paar Minuten noch einmal.");
      return;
    }
    setResetSentTo(email);
  };

  return (
    <div className="space-y-4" style={{ maxWidth: 680 }}>
      <SettingsCard>
        <SettingsHeading
          title="Zwei-Faktor-Authentifizierung"
          description="Schütze dein Konto mit einem zusätzlichen Sicherheitsschritt beim Anmelden: Nach dem Passwort fragt kaufma einen Code aus deiner Authenticator-App ab."
        />
        <div className="mt-4">
          {factorId === undefined ? (
            <div className="flex items-center gap-2 text-[13px] text-[#78716C]"><CircleNotch className="size-4 animate-spin" aria-hidden /> Lade …</div>
          ) : factorId ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
                <CheckCircle weight="fill" className="size-4" aria-hidden /> 2FA aktiv
              </span>
              <button type="button" className={btnDangerCls} onClick={disable} disabled={disabling}>
                {disabling && <CircleNotch className="size-3.5 animate-spin" aria-hidden />}2FA deaktivieren
              </button>
            </div>
          ) : (
            <button type="button" className={btnPrimaryCls} onClick={startEnroll} disabled={starting}>
              {starting ? <CircleNotch className="size-3.5 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
              2FA einrichten
            </button>
          )}
        </div>
      </SettingsCard>

      <SettingsCard>
        <SettingsHeading title="Passwort ändern" description="Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst." />
        <div className="mt-4">
          {resetSentTo ? (
            <p className="text-[13px] text-primary" role="status">E-Mail wurde an {resetSentTo} gesendet.</p>
          ) : (
            <button type="button" className={btnSecondaryCls} onClick={sendReset} disabled={resetBusy || !user?.email}>
              {resetBusy && <CircleNotch className="size-3.5 animate-spin" aria-hidden />}Passwort-Reset per E-Mail
            </button>
          )}
        </div>
      </SettingsCard>

      <Dialog open={!!enroll} onOpenChange={(open) => { if (!open) void cancelEnroll(); }}>
        <DialogContent className="bg-white sm:max-w-[400px] rounded-[14px] border border-[#EAE6DF]">
          <DialogHeader>
            <DialogTitle className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-[#1C1917]">2FA einrichten</DialogTitle>
            <DialogDescription className="text-[14px] leading-[1.6] text-[#78716C]">
              Scanne den QR-Code mit einer Authenticator-App (z. B. Google Authenticator, 1Password oder Authy) und gib den angezeigten Code ein.
            </DialogDescription>
          </DialogHeader>
          {enroll && (
            <form onSubmit={verify}>
              <div className="flex justify-center rounded-[12px] border border-[#EAE6DF] bg-white p-3">
                <img src={enroll.qr} alt="QR-Code für die Authenticator-App" width={180} height={180} className="size-[180px]" />
              </div>
              <p className="mt-3 text-[12px] text-[#78716C]">
                Kein Scan möglich? Schlüssel manuell eingeben:{" "}
                <code className="break-all rounded bg-[#F5F3EE] px-1.5 py-0.5 text-[12px] text-[#1C1917] select-all">{enroll.secret}</code>
              </p>
              <label htmlFor="totp-code" className="mt-4 block text-[13px] font-medium text-[#1C1917]">Code aus der App</label>
              <input
                id="totp-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                placeholder="123456"
                aria-invalid={!!codeError || undefined}
                aria-describedby={codeError ? "totp-error" : undefined}
                className="mt-2 w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-2.5 text-center text-[18px] tracking-[0.3em] tabular-nums text-[#1C1917] focus:border-primary focus:outline-none"
              />
              {codeError && <p id="totp-error" className="mt-2 text-[13px] text-[#B91C1C]">{codeError}</p>}
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => void cancelEnroll()} className={btnSecondaryCls + " flex-1"}>Abbrechen</button>
                <button type="submit" disabled={verifying} className={btnPrimaryCls + " flex-1"}>
                  {verifying && <CircleNotch className="size-3.5 animate-spin" aria-hidden />}Aktivieren
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
