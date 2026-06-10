import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/kontakt")({
  head: () => ({
    meta: [
      { title: "Kontakt – kauf ma" },
      { name: "description", content: "Kontakt zu kauf ma." },
      { property: "og:title", content: "Kontakt – kauf ma" },
      { property: "og:description", content: "Kontakt zu kauf ma." },
    ],
  }),
  component: Kontakt,
});

function Kontakt() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold">Kontakt</h1>
        <p className="text-muted-foreground mt-3">Fragen zu kauf ma? Schreib uns über die im Impressum angegebenen Kontaktdaten.</p>
        <div className="mt-8 rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">Kontakt & Anbieterinformationen</h2>
          <p className="text-sm text-muted-foreground mt-2">Alle rechtlichen Kontaktinformationen findest du im Impressum.</p>
          <a href="/impressum" className="inline-flex mt-4 text-primary underline underline-offset-2">Zum Impressum</a>
        </div>
      </section>
    </MarketingShell>
  );
}