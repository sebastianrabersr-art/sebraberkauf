import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  CheckCircle,
  CaretRight,
  CaretLeft,
  House,
  TrendUp,
  Hammer,
  Question,
  MapPin,
  Wallet,
  LinkSimple,
  CircleNotch,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { flushCloudSync } from "@/lib/cloud-sync";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Willkommen bei kaufma" }] }),
  component: Onboarding,
});

/** Eigenkapital und Zins in die Annahmen aller eigenen Projekte schreiben (Demo-Projekte bleiben unberührt). */
function applyOnboardingAssumptions(ek: number | null, zinsPct: number | null) {
  const { projects, activeProjectId, updateProjectAssumptions } = useStore.getState();
  const own = projects.filter((p) => !p.isDemo);
  const targets = own.length > 0 ? own : projects.filter((p) => p.id === activeProjectId);
  for (const p of targets) {
    updateProjectAssumptions(p.id, {
      ...(ek != null ? { eigenkapital: ek } : {}),
      ...(zinsPct != null ? { zinssatz: zinsPct / 100 } : {}),
    });
  }
}

const GOALS = [
  { id: "vermieten", label: "Vermieten", sub: "Immobilie als Investment kaufen und vermieten", icon: TrendUp },
  { id: "fixflip", label: "Fix & Flip", sub: "Kaufen, renovieren und mit Gewinn verkaufen", icon: Hammer },
  { id: "eigen", label: "Selbst bewohnen", sub: "Eigenheim oder Zweitwohnsitz", icon: House },
  { id: "mix", label: "Noch offen", sub: "Ich schaue mich erst um", icon: Question },
];

/** Nach dem Willkommensbildschirm: Name & Ziel → Finanzdaten → Start. */
const TOTAL_STEPS = 3;

type Destination = "/analyze" | "/dashboard";

function Onboarding() {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("vermieten");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [location, setLocation] = useState("");
  const [equity, setEquity] = useState("80000");
  const [zinssatz, setZinssatz] = useState("3.8");
  const [busy, setBusy] = useState<null | "skip" | Destination>(null);
  const ids = { vorname: useId(), nachname: useId(), location: useId(), equity: useId(), zins: useId(), goal: useId() };

  /**
   * Schließt das Onboarding ab. Beim Überspringen wird nur "erledigt" gespeichert –
   * keine Standardwerte, die die Person nie gesehen oder bestätigt hat.
   */
  const finish = async (to: Destination, mode: "skip" | "complete") => {
    if (busy) return;
    try { localStorage.setItem("onboarding_done", "true"); } catch { /* privater Modus */ }
    if (!user) {
      window.location.href = to;
      return;
    }
    setBusy(mode === "skip" ? "skip" : to);
    try {
      if (mode === "complete") {
        const ek = Number(equity) || null;
        const zinsPct = Number(String(zinssatz).replace(",", ".")) || null;
        // Eine Quelle für Rechnungen: die Projekt-Annahmen. Neue Objekte übernehmen sie als Finanzierung.
        applyOnboardingAssumptions(ek, zinsPct);
        // Ziel als Vorauswahl für den Import merken (Strategie Vermieten / Fix & Flip).
        try { localStorage.setItem("kaufma_goal", goal); } catch { /* privater Modus */ }
        // Zusätzlich im Profil sichern – falls die Projekte beim ersten Login noch nicht geladen sind,
        // legt cloud-sync das erste Projekt mit diesen Werten an.
        await supabase.from("user_settings").upsert({
          user_id: user.id,
          goal,
          location_focus: location.trim() || null,
          default_equity: ek,
          default_interest_rate: zinsPct,
        } as any);
      }
      await supabase.from("profiles").update({
        onboarding_completed: true,
        ...(mode === "complete" ? { first_name: vorname.trim() || null, last_name: nachname.trim() || null } : {}),
      } as any).eq("id", user.id);
      await refresh();
      // Vor dem harten Seitenwechsel speichern, sonst gehen die neuen Annahmen verloren.
      await flushCloudSync();
      if (mode === "complete") toast.success("Alles eingerichtet.");
    } catch (e) {
      console.error("Onboarding save error:", e);
      toast.error("Deine Angaben konnten nicht gespeichert werden. Du kannst sie später in den Einstellungen ergänzen.");
    }
    window.location.href = to;
  };

  const next = (e: FormEvent) => {
    e.preventDefault();
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const inputCls =
    "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-[11px] text-[15px] text-[#1C1917] outline-none focus:border-primary transition-colors placeholder:text-ink-3";
  const primaryBtn =
    "w-full mt-6 rounded-[12px] py-3 text-[14px] font-semibold text-white bg-primary hover:bg-[#235740] transition-colors flex items-center justify-center gap-2 disabled:opacity-60";
  const labelCls = "flex items-center gap-1.5 mb-1.5 text-[12px] text-ink-2";
  const h2Cls = "font-display text-[22px] font-extrabold text-[#1C1917]";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F5F3EE]">
      <div className="mb-10">
        <Logo size={32} textSize={18} />
      </div>

      <div className="w-full max-w-md">
        {step > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-ink-3" aria-live="polite">Schritt {step} von {TOTAL_STEPS}</span>
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={!!busy}
                className="inline-flex items-center gap-1 text-[12px] text-ink-2 hover:text-[#1C1917] disabled:opacity-50"
              >
                <CaretLeft size={12} weight="bold" aria-hidden /> Zurück
              </button>
            </div>
            <div
              className="h-[3px] bg-[#EAE6DF] rounded-full overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={step}
              aria-label="Fortschritt"
            >
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="rounded-[16px] bg-white border border-[#EAE6DF] p-7 sm:p-8">
          {/* WILLKOMMEN */}
          {step === 0 && (
            <div>
              <h1 className="heading-page-sm">Willkommen bei kaufma.</h1>
              <p className="text-[14px] text-ink-2 mt-3 leading-relaxed">
                Zwei kurze Schritte, dann analysierst du deine erste Immobilie. Dauert etwa eine Minute.
              </p>
              <ul className="mt-6 space-y-2.5">
                {["Inserate direkt importieren", "Rendite, Cashflow & Mietrecht prüfen", "Immobilien vergleichen & entscheiden"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <CheckCircle className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-[14px] text-[#1C1917]">{item}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setStep(1)} className={primaryBtn + " mt-7"}>
                Jetzt einrichten <CaretRight className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => finish("/dashboard", "skip")}
                disabled={!!busy}
                className="mt-3 w-full min-h-[44px] text-[13px] text-ink-2 hover:text-[#1C1917] disabled:opacity-60"
              >
                {busy === "skip" ? "Einen Moment…" : "Überspringen – direkt zur App"}
              </button>
            </div>
          )}

          {/* SCHRITT 1 — Name + Ziel */}
          {step === 1 && (
            <form onSubmit={next}>
              <h2 className={h2Cls}>Wie heißt du?</h2>
              <p className="text-[13px] text-ink-2 mt-1 mb-5">Optional – damit wir dich in der App mit Namen ansprechen.</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label htmlFor={ids.vorname} className={labelCls}>Vorname</label>
                  <input id={ids.vorname} value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Max" autoComplete="given-name" className={inputCls} autoFocus />
                </div>
                <div>
                  <label htmlFor={ids.nachname} className={labelCls}>Nachname</label>
                  <input id={ids.nachname} value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="Mustermann" autoComplete="family-name" className={inputCls} />
                </div>
              </div>

              <div id={ids.goal} className="text-[12px] text-ink-2 mb-3 font-medium">Was hast du vor?</div>
              <div role="radiogroup" aria-labelledby={ids.goal} className="space-y-2">
                {GOALS.map((g) => {
                  const active = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setGoal(g.id)}
                      className={`w-full flex items-center gap-3 rounded-[12px] border-[1.5px] px-4 py-3 text-left transition-colors ${
                        active ? "border-primary bg-[#E8F5EE]" : "border-[#EAE6DF] bg-white hover:border-[#1C1917]"
                      }`}
                    >
                      <span className={`size-8 rounded-[8px] grid place-items-center shrink-0 ${active ? "bg-primary text-white" : "bg-[#F5F3EE] text-ink-2"}`}>
                        <g.icon className="size-4" aria-hidden />
                      </span>
                      <span>
                        <span className={`block text-[14px] font-semibold ${active ? "text-primary" : "text-[#1C1917]"}`}>{g.label}</span>
                        <span className="block text-[12px] text-ink-2">{g.sub}</span>
                      </span>
                      {active && <CheckCircle className="size-4 ml-auto shrink-0 text-primary" aria-hidden />}
                    </button>
                  );
                })}
              </div>

              <button type="submit" className={primaryBtn}>Weiter</button>
            </form>
          )}

          {/* SCHRITT 2 — Region + Finanzierung */}
          {step === 2 && (
            <form onSubmit={next}>
              <h2 className={h2Cls}>Deine Finanzdaten</h2>
              <p className="text-[13px] text-ink-2 mt-1 mb-5">Startwerte für die Finanzierung deiner Objekte – jederzeit unter Einstellungen → Annahmen änderbar.</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor={ids.location} className={labelCls}>
                    <MapPin className="size-3.5 text-ink-3" aria-hidden /> Stadt / Region
                  </label>
                  <input id={ids.location} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z. B. Wien, Graz, München" className={inputCls} autoFocus />
                </div>
                <div>
                  <label htmlFor={ids.equity} className={labelCls}>
                    <Wallet className="size-3.5 text-ink-3" aria-hidden /> Verfügbares Eigenkapital (€)
                  </label>
                  <input id={ids.equity} type="number" inputMode="numeric" min={0} value={equity} onChange={(e) => setEquity(e.target.value)} placeholder="80000" className={inputCls + " tabular-nums"} />
                </div>
                <div>
                  <label htmlFor={ids.zins} className={labelCls}>
                    <TrendUp className="size-3.5 text-ink-3" aria-hidden /> Kreditzins p. a. (%)
                  </label>
                  <input id={ids.zins} type="number" inputMode="decimal" step="0.1" min={0} value={zinssatz} onChange={(e) => setZinssatz(e.target.value)} placeholder="3.8" className={inputCls + " tabular-nums"} />
                </div>
              </div>

              <button type="submit" className={primaryBtn}>Weiter</button>
            </form>
          )}

          {/* SCHRITT 3 — Start */}
          {step === 3 && (
            <div>
              <h2 className={h2Cls}>Alles bereit.</h2>
              <p className="text-[13px] text-ink-2 mt-1 mb-6">Womit möchtest du anfangen?</p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => finish("/analyze", "complete")}
                  disabled={!!busy}
                  className="w-full flex items-center gap-4 rounded-[12px] border-[1.5px] border-primary bg-[#E8F5EE] px-5 py-4 text-left hover:bg-[#d8f0e4] transition-colors disabled:opacity-60"
                >
                  <span className="size-10 rounded-[12px] bg-primary text-white grid place-items-center shrink-0">
                    {busy === "/analyze" ? <CircleNotch className="size-5 animate-spin" aria-hidden /> : <LinkSimple className="size-5" aria-hidden />}
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-[#1C1917]">Erste Immobilie analysieren</span>
                    <span className="block text-[12px] text-ink-2">Link zum Inserat einfügen oder Daten selbst eingeben</span>
                  </span>
                  <CaretRight className="size-4 ml-auto shrink-0 text-primary" aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() => finish("/dashboard", "complete")}
                  disabled={!!busy}
                  className="w-full flex items-center gap-4 rounded-[12px] border-[1.5px] border-[#EAE6DF] bg-white px-5 py-4 text-left hover:border-[#1C1917] transition-colors disabled:opacity-60"
                >
                  <span className="size-10 rounded-[12px] bg-[#F5F3EE] text-ink-2 grid place-items-center shrink-0">
                    {busy === "/dashboard" ? <CircleNotch className="size-5 animate-spin" aria-hidden /> : <House className="size-5" aria-hidden />}
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-[#1C1917]">Erst umsehen</span>
                    <span className="block text-[12px] text-ink-2">Zum Dashboard – analysieren kannst du jederzeit</span>
                  </span>
                  <CaretRight className="size-4 ml-auto shrink-0 text-ink-3" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-[12px] text-ink-3">kaufma.eu · Keine Anlage- oder Rechtsberatung</div>
      </div>
    </div>
  );
}
