import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { GlossarList } from "@/components/GlossarList";

export const Route = createFileRoute("/glossar")({
  head: () => ({
    meta: [
      { title: "Glossar – Immobilien-Fachbegriffe einfach erklärt | kauf ma" },
      { name: "description", content: "Alle Fachbegriffe rund um Rendite, Cashflow, Finanzierung, Mietrecht und Immobilien-Analyse einfach erklärt." },
      { property: "og:title", content: "Glossar – Immobilien-Fachbegriffe einfach erklärt" },
      { property: "og:description", content: "Rendite, DSCR, AfA, HWB und Co. – verständlich erklärt." },
    ],
  }),
  component: GlossarPage,
});

function GlossarPage() {
  return (
    <MarketingShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-8">
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 32, color: "#1C1917", margin: 0 }}>
            Glossar
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#78716C", marginTop: 6 }}>
            Alle Fachbegriffe einfach erklärt
          </p>
        </header>
        <GlossarList />
      </div>
    </MarketingShell>
  );
}
