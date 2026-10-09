import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export type FaqItem = { q: string; a: string };

const FAQS: FaqItem[] = [
  { q: "Ersetzt die App einen Steuerberater oder Anwalt?", a: "Nein. kaufma liefert Berechnungen und Orientierung, aber keine Rechts-, Steuer- oder Finanzberatung." },
  { q: "Ist die Mietrecht-Einschätzung rechtsverbindlich?", a: "Nein. Die Hinweise sind eine erste Orientierung. Für eine verbindliche Einschätzung wende dich an einen Anwalt für Mietrecht." },
  { q: "Kann ich Immobilien aus willhaben oder ImmoScout importieren?", a: "Ja, du kannst Inserate per Link erfassen und Felder automatisch übernehmen lassen." },
  { q: "Kann ich PDFs hochladen?", a: "Ja, in allen Plänen: Exposés und Makler-PDFs lassen sich pro Immobilie hochladen und auswerten." },
  { q: "Kann ich mehrere Projekte anlegen?", a: "Free und Plus haben ein Projekt, Premium beliebig viele, zum Beispiel eines pro Stadt." },
  { q: "Werden meine Daten gespeichert?", a: "Ja, sicher in deinem privaten Account. Nur du hast Zugriff." },
  { q: "Kann ich meine Daten exportieren?", a: "Ja. Die Kandidatenliste exportierst du in allen Plänen als CSV. Ab Plus gibt es zusätzlich die Analyse jeder Immobilie als PDF." },
  { q: "Für wen ist die App geeignet?", a: "Private Käufer, Anleger, Familien und Personen, die Wohnungen kaufen, vermieten oder vergleichen wollen." },
  { q: "Was passiert, wenn mein Immobilienlimit erreicht ist?", a: "Du kannst bestehende Immobilien weiter bearbeiten. Neue Immobilien sind nach Upgrade möglich." },
  { q: "Kann ich später auf Plus oder Premium upgraden?", a: "Ja, jederzeit in den Einstellungen → Abo & Plan." },
];

export function FaqList({ items = FAQS }: { items?: FaqItem[] } = {}) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((f, i) => (
        <AccordionItem value={`item-${i}`} key={i}>
          <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
