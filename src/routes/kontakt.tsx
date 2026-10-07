import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/kontakt")({
  head: () => ({
    meta: [
      { title: "Kontakt – kaufma" },
      { name: "description", content: "Kontakt zu kaufma." },
      { property: "og:title", content: "Kontakt – kaufma" },
      { property: "og:description", content: "Kontakt zu kaufma." },
    ],
  }),
  component: Kontakt,
});

function Kontakt() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="heading-page">Kontakt</h1>
        <p className="text-muted-foreground mt-3">Fragen zu kaufma? Schreib uns unter <a href="mailto:hallo@kaufma.eu" className="text-primary underline underline-offset-2">hallo@kaufma.eu</a>.</p>
        <div className="mt-8 rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">Kontakt & Anbieterinformationen</h2>
          <p className="text-sm text-muted-foreground mt-2">Alle rechtlichen Kontaktinformationen findest du im Impressum.</p>
          <a href="/impressum" className="inline-flex mt-4 text-primary underline underline-offset-2">Zum Impressum</a>
        </div>
      </section>
    </MarketingShell>
  );
}