import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { CircleNotch } from "@phosphor-icons/react";

/**
 * Zweiter Anmeldeschritt: Hat das Konto einen bestätigten TOTP-Faktor, liefert Supabase nach dem
 * Passwort (oder Google) zunächst nur eine AAL1-Sitzung. Dann wird hier der 6-stellige Code
 * abgefragt, bevor die App erscheint. Ohne 2FA rendert die Komponente direkt ihre Kinder.
 */
export function MfaGate({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const [state, setState] = useState<"checking" | "ok" | "challenge">("checking");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (cancelled) return;
      // Bei Fehlern nicht aussperren – die Sitzung selbst ist gültig.
      if (error || !data) return setState("ok");
      setState(data.nextLevel === "aal2" && data.currentLevel !== "aal2" ? "challenge" : "ok");
    });
    return () => { cancelled = true; };
  }, [session?.access_token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) { setError("Bitte gib den 6-stelligen Code aus deiner Authenticator-App ein."); return; }
    setBusy(true);
    setError(null);
    try {
      const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find((f) => f.status === "verified");
      if (fErr || !factor) throw fErr ?? new Error("no factor");
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (cErr || !ch) throw cErr ?? new Error("no challenge");
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: clean });
      if (vErr) { setError("Der Code stimmt nicht oder ist abgelaufen. Nimm den aktuellen Code aus der App."); return; }
      setState("ok");
    } catch (err) {
      console.error("2FA-Prüfung:", err);
      setError("Die Prüfung hat gerade nicht geklappt. Bitte versuch es noch einmal.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "ok") return <>{children}</>;
  if (state === "checking") {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Lade…</div>;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#F5F3EE] px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex justify-center"><Logo size={32} textSize={18} /></div>
        <form onSubmit={submit} className="rounded-[16px] border border-[#EAE6DF] bg-white p-6 sm:p-8">
          <h1 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#1C1917]">Bestätigungscode</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#78716C]">
            Dein Konto ist mit Zwei-Faktor-Authentifizierung geschützt. Gib den Code aus deiner Authenticator-App ein.
          </p>
          <label htmlFor="mfa-code" className="mt-6 block text-[13px] font-medium text-[#1C1917]">6-stelliger Code</label>
          <input
            id="mfa-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={7}
            placeholder="123456"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "mfa-error" : undefined}
            className="mt-2 w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-3 text-center font-sans text-[20px] tracking-[0.3em] tabular-nums text-[#1C1917] focus:border-primary focus:outline-none"
          />
          {error && <p id="mfa-error" className="mt-2 text-[13px] text-[#B91C1C]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-primary px-4 py-3 text-[14px] font-semibold text-white hover:bg-[#235740] disabled:opacity-60"
          >
            {busy && <CircleNotch className="size-4 animate-spin" aria-hidden />}Bestätigen
          </button>
          <button
            type="button"
            onClick={async () => { await signOut(); window.location.href = "/login"; }}
            className="mt-3 w-full py-2 text-[13px] text-[#78716C] hover:text-[#1C1917]"
          >
            Mit einem anderen Konto anmelden
          </button>
        </form>
      </div>
    </div>
  );
}
