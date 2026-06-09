import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { FaqList } from "@/components/marketing/FaqList";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ – kauf ma" },
      { name: "description", content: "Häufige Fragen zu kauf ma." },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-center">Häufige Fragen</h1>
        <div className="mt-10"><FaqList /></div>
      </section>
    </MarketingShell>
  );
}
