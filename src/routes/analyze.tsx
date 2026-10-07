import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ImportTabsCard } from "@/components/ImportTabsCard";

export const Route = createFileRoute("/analyze")({
  head: () => ({ meta: [{ title: "Immobilie importieren – kaufma" }] }),
  component: AnalyzePage,
});

function AnalyzePage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em", marginBottom: 4 }}>
          Immobilie hinzufügen
        </h1>
        <p className="text-[13px] text-ink-2 mb-6">Link einfügen, Text kopieren, Excel-Vorlage nutzen oder manuell erfassen.</p>
        <ImportTabsCard />
      </div>
    </AppShell>
  );
}
