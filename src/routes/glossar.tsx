import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { AppShell } from "@/components/layout/AppShell";
import { GlossarList } from "@/components/GlossarList";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/glossar")({
  head: () => ({
    meta: [
      { title: "Glossar – Immobilien-Fachbegriffe einfach erklärt | kaufma" },
      { name: "description", content: "Alle Fachbegriffe rund um Rendite, Cashflow, Finanzierung, Mietrecht und Immobilien-Analyse einfach erklärt." },
      { property: "og:title", content: "Glossar – Immobilien-Fachbegriffe einfach erklärt" },
      { property: "og:description", content: "Rendite, DSCR, AfA, HWB und Co. – verständlich erklärt." },
    ],
  }),
  component: GlossarPage,
});

// Öffentlich (für Besucher und Suchmaschinen) im Website-Layout; wer eingeloggt ist,
// bleibt im App-Layout mit Sidebar – das Glossar steht dort in der Navigation.
function GlossarPage() {
  const { session } = useAuth();

  if (session) {
    return (
      <AppShell>
        <div className="bg-[#F5F3EE] min-h-full">
          <div className="max-w-3xl">
            <header className="mb-6">
              <h1 className="heading-page-sm">Glossar</h1>
              <p className="text-[13px] text-ink-2 mt-1">Alle Fachbegriffe einfach erklärt</p>
            </header>
            <GlossarList />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <MarketingShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-8">
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 32, color: "#1C1917", margin: 0 }}>
            Glossar
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--ink-2)", marginTop: 6 }}>
            Alle Fachbegriffe einfach erklärt
          </p>
        </header>
        <GlossarList />
      </div>
    </MarketingShell>
  );
}
