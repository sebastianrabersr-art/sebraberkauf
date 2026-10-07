import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle as CheckCircle2, CaretRight as ChevronRight, House as Home, TrendUp as TrendingUp, Hammer, Question as HelpCircle, MapPin, Wallet, Lightning as Zap } from "@phosphor-icons/react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Willkommen bei kaufma" }] }),
  component: Onboarding,
});

const GOALS = [
  { id: "vermieten", label: "Vermieten", sub: "Immobilie als Investment kaufen und vermieten", icon: TrendingUp },
  { id: "fixflip", label: "Fix & Flip", sub: "Kaufen, renovieren und mit Gewinn verkaufen", icon: Hammer },
  { id: "eigen", label: "Selbst bewohnen", sub: "Eigenheim oder Zweitwohnsitz", icon: Home },
  { id: "mix", label: "Noch offen", sub: "Ich schaue mich erst um", icon: HelpCircle },
];

const bricolage = { fontFamily: "'Bricolage Grotesque', sans-serif" };

function Onboarding() {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("vermieten");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [location, setLocation] = useState("");
  const [equity, setEquity] = useState("80000");
  const [zinssatz, setZinssatz] = useState("3.8");
  const [busy, setBusy] = useState(false);

  const totalSteps = 4;

const finish = async () => {
    // Set localStorage immediately as fallback
    localStorage.setItem("onboarding_done", "true");

    if (!user) {
      window.location.href = "/dashboard";
      return;
    }
    setBusy(true);
    try {
      await supabase.from("user_settings").upsert({
        user_id: user.id,
        goal,
        location_focus: location,
        default_equity: Number(equity) || null,
        default_zinssatz: Number(zinssatz) || null,
      } as any);
      await supabase.from("profiles").update({
        onboarding_completed: true,
        first_name: vorname.trim() || null,
        last_name: nachname.trim() || null,
      } as any).eq("id", user.id);
      await refresh();
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (e) {
      console.error("Onboarding save error:", e);
    } finally {
      setBusy(false);
    }
    toast.success("Alles bereit – viel Erfolg!");
  };

  const inputCls = "w-full rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-[11px] text-[14px] text-[#1C1917] outline-none focus:border-[#2D6A4F] transition-colors";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "#F5F3EE" }}>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <img src="/favicon.png" className="w-8 h-8 rounded-full" alt="kaufma" />
        <span style={{ ...bricolage, fontWeight: 800, fontSize: 18, color: "#1C1917", letterSpacing: "-0.02em" }}>kaufma</span>
      </div>

      <div className="w-full max-w-md">

        {/* Progress bar */}
        {step > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-ink-3">Schritt {step} von {totalSteps}</span>
              <button onClick={() => step > 1 ? setStep(s => s - 1) : setStep(0)} className="text-[12px] text-ink-2 hover:text-[#1C1917]">← Zurück</button>
            </div>
            <div className="h-[3px] bg-[#EAE6DF] rounded-full overflow-hidden">
              <div className="h-full bg-[#2D6A4F] rounded-full transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="rounded-[16px] bg-white border border-[#EAE6DF] p-8">

          {/* STEP 0 — Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-[14px] mx-auto mb-5 flex items-center justify-center" style={{ background: "#E8F5EE" }}>
                <Zap className="size-7" style={{ color: "#2D6A4F" }} />
              </div>
              <h1 style={{ ...bricolage, fontWeight: 800, fontSize: 26, color: "#1C1917", letterSpacing: "-0.03em" }}>
                Willkommen bei kaufma.
              </h1>
              <p className="text-[14px] text-ink-2 mt-3 leading-relaxed">
                In wenigen Schritten richtest du dein Konto ein.<br />Dann analysierst du deine erste Immobilie.
              </p>
              <div className="mt-6 space-y-2.5 text-left">
                {[
                  "Inserate direkt importieren",
                  "Rendite, Cashflow & Mietrecht prüfen",
                  "Immobilien vergleichen & entscheiden",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="size-4 shrink-0" style={{ color: "#2D6A4F" }} />
                    <span className="text-[13px] text-ink-2">{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full mt-7 rounded-[10px] py-3 text-[14px] font-semibold text-white transition-colors flex items-center justify-center gap-2"
                style={{ background: "#2D6A4F" }}
              >
                Jetzt einrichten <ChevronRight className="size-4" />
              </button>
              <button onClick={async () => { await finish(); window.location.href = "/dashboard"; }} className="mt-3 text-[12px] text-ink-3 hover:text-ink-2 w-full">
                Überspringen – direkt zur App →
              </button>
            </div>
          )}

          {/* STEP 1 — Name + Ziel */}
          {step === 1 && (
            <div>
              <h2 style={{ ...bricolage, fontWeight: 800, fontSize: 22, color: "#1C1917", letterSpacing: "-0.02em" }}>
                Wie heißt du?
              </h2>
              <p className="text-[13px] text-ink-2 mt-1 mb-5">Wird für Kaufangebote und Dokumente verwendet.</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <div className="text-[11px] text-ink-2 mb-1.5">Vorname</div>
                  <input value={vorname} onChange={e => setVorname(e.target.value)} placeholder="Max" className={inputCls} autoFocus />
                </div>
                <div>
                  <div className="text-[11px] text-ink-2 mb-1.5">Nachname</div>
                  <input value={nachname} onChange={e => setNachname(e.target.value)} placeholder="Mustermann" className={inputCls} />
                </div>
              </div>

              <div className="text-[11px] text-ink-2 mb-3 mt-2 font-medium uppercase tracking-wider">Was ist dein Ziel?</div>
              <div className="space-y-2">
                {GOALS.map((g) => {
                  const active = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className="w-full flex items-center gap-3 rounded-[10px] border-[1.5px] px-4 py-3 text-left transition-all"
                      style={{
                        borderColor: active ? "#2D6A4F" : "#EAE6DF",
                        background: active ? "#E8F5EE" : "white",
                      }}
                    >
                      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                        style={{ background: active ? "#2D6A4F" : "#F5F3EE" }}>
                        <g.icon className="size-4" style={{ color: active ? "white" : "var(--ink-2)" }} />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: active ? "#2D6A4F" : "#1C1917" }}>{g.label}</div>
                        <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>{g.sub}</div>
                      </div>
                      {active && <CheckCircle2 className="size-4 ml-auto shrink-0" style={{ color: "#2D6A4F" }} />}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full mt-6 rounded-[10px] py-3 text-[14px] font-semibold text-white"
                style={{ background: "#2D6A4F" }}
              >
                Weiter
              </button>
            </div>
          )}

          {/* STEP 2 — Region + Finanzierung */}
          {step === 2 && (
            <div>
              <h2 style={{ ...bricolage, fontWeight: 800, fontSize: 22, color: "#1C1917", letterSpacing: "-0.02em" }}>
                Deine Finanzdaten
              </h2>
              <p className="text-[13px] text-ink-2 mt-1 mb-5">Diese Werte werden als Standard für alle Berechnungen verwendet. Jederzeit änderbar.</p>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MapPin className="size-3.5" style={{ color: "var(--ink-3)" }} />
                    <span className="text-[11px] text-ink-2">Stadt / Region</span>
                  </div>
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="z.B. Wien, Graz, München…" className={inputCls} autoFocus />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Wallet className="size-3.5" style={{ color: "var(--ink-3)" }} />
                    <span className="text-[11px] text-ink-2">Verfügbares Eigenkapital (€)</span>
                  </div>
                  <input type="number" value={equity} onChange={e => setEquity(e.target.value)} placeholder="80000" className={inputCls} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="size-3.5" style={{ color: "var(--ink-3)" }} />
                    <span className="text-[11px] text-ink-2">Aktueller Zinssatz % (Kredit)</span>
                  </div>
                  <input type="number" step="0.1" value={zinssatz} onChange={e => setZinssatz(e.target.value)} placeholder="3.8" className={inputCls} />
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full mt-6 rounded-[10px] py-3 text-[14px] font-semibold text-white"
                style={{ background: "#2D6A4F" }}
              >
                Weiter
              </button>
            </div>
          )}

          {/* STEP 3 — Erste Immobilie oder Dashboard */}
          {step === 3 && (
            <div>
              <h2 style={{ ...bricolage, fontWeight: 800, fontSize: 22, color: "#1C1917", letterSpacing: "-0.02em" }}>
                Alles bereit.
              </h2>
              <p className="text-[13px] text-ink-2 mt-1 mb-6">Wie möchtest du starten?</p>

              <div className="space-y-3">
                <button
                  onClick={async () => {
                    await finish();
                    window.location.href = "/analyze";
                  }}
                  className="w-full flex items-center gap-4 rounded-[12px] border-[1.5px] border-[#2D6A4F] bg-[#E8F5EE] px-5 py-4 text-left hover:bg-[#d8f0e4] transition-colors"
                >
                  <div className="w-10 h-10 rounded-[10px] bg-[#2D6A4F] flex items-center justify-center shrink-0">
                    <Zap className="size-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#1C1917]">Erste Immobilie analysieren</div>
                    <div className="text-[12px] text-ink-2">Link einfügen oder manuell erfassen</div>
                  </div>
                  <ChevronRight className="size-4 ml-auto shrink-0 text-[#2D6A4F]" />
                </button>

                <button
                  onClick={async () => {
                    await finish();
                    window.location.href = "/dashboard";
                  }}
                  className="w-full flex items-center gap-4 rounded-[12px] border-[1.5px] border-[#EAE6DF] bg-white px-5 py-4 text-left hover:bg-[#FAFAF8] transition-colors"
                >
                  <div className="w-10 h-10 rounded-[10px] bg-[#F5F3EE] flex items-center justify-center shrink-0">
                    <Home className="size-5" style={{ color: "var(--ink-2)" }} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#1C1917]">Dashboard erkunden</div>
                    <div className="text-[12px] text-ink-2">Erst einen Überblick verschaffen</div>
                  </div>
                  <ChevronRight className="size-4 ml-auto shrink-0 text-ink-3" />
                </button>
              </div>

              {busy && (
                <div className="mt-4 text-center text-[13px] text-ink-2">Speichern…</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-[11px] text-ink-3">
          kaufma.eu · Keine Anlage- oder Rechtsberatung
        </div>
      </div>
    </div>
  );
}
