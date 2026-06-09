
import { Check } from "lucide-react";

const TIERS = [
  {
    id: "free", name: "Kostenlos", price: "0 €", period: "für immer",
    cta: "Kostenlos starten", to: "/signup",
    features: ["1 Immobilie", "1 Projekt", "Manuelle Eingabe", "Basis-Rechner", "Einfache Kennzahlen"],
    highlight: false,
  },
  {
    id: "plus", name: "Plus", price: "4,99 €", period: "pro Monat",
    cta: "Plus starten", to: "/signup?plan=plus",
    features: ["Bis zu 10 Immobilien", "Mehrere Projekte", "Link-Import", "PDF-Upload", "Finanzierungs­szenarien", "Cashflow-Rechner", "Besichtigungs-Checkliste", "Verkäufer-/Maklerdaten", "Follow-ups"],
    highlight: true,
  },
  {
    id: "premium", name: "Premium", price: "19,99 €", period: "pro Monat",
    cta: "Premium starten", to: "/signup?plan=premium",
    features: ["Unbegrenzt Immobilien", "Unbegrenzt Projekte", "Alle Plus-Funktionen", "Erweiterte Dashboards", "CRM-Pipeline", "Dokumenten­verwaltung", "Bank-Szenarien-Vergleich", "Export nach Excel/CSV", "Prioritäts-Support"],
    highlight: false,
  },
];

export function PricingTable() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {TIERS.map((t) => (
        <div key={t.id} className={`rounded-2xl border p-6 bg-card flex flex-col ${t.highlight ? "ring-2 ring-primary shadow-lg" : ""}`}>
          {t.highlight && <div className="text-xs font-medium uppercase text-primary mb-2">Beliebt</div>}
          <h3 className="text-xl font-semibold">{t.name}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold">{t.price}</span>
            <span className="text-sm text-muted-foreground">{t.period}</span>
          </div>
          <ul className="mt-5 space-y-2 text-sm flex-1">
            {t.features.map((f) => (
              <li key={f} className="flex gap-2"><Check className="size-4 text-primary mt-0.5 shrink-0" />{f}</li>
            ))}
          </ul>
          <a
            href={t.to}
            className={`mt-6 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium ${t.highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            {t.cta}
          </a>
        </div>
      ))}
    </div>
  );
}
