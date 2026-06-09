import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  { q: "Ersetzt die App einen Steuerberater oder Anwalt?", a: "Nein. kauf ma liefert Berechnungen und Orientierung, aber keine Rechts-, Steuer- oder Finanzberatung." },
  { q: "Ist die Mietrecht-Einschätzung rechtsverbindlich?", a: "Nein. Die Hinweise sind eine erste Orientierung. Für eine verbindliche Einschätzung wende dich an einen Anwalt für Mietrecht." },
  { q: "Kann ich Immobilien aus willhaben oder ImmoScout importieren?", a: "Ja, du kannst Inserate per Link erfassen und Felder automatisch übernehmen lassen." },
  { q: "Kann ich PDFs hochladen?", a: "Ja, Exposés und Makler-PDFs lassen sich pro Immobilie hochladen und auswerten (Plus & Premium)." },
  { q: "Kann ich mehrere Projekte anlegen?", a: "Im kostenlosen Plan ein Projekt, Plus und Premium erlauben mehrere Projekte." },
  { q: "Werden meine Daten gespeichert?", a: "Ja, sicher in deinem privaten Account. Nur du hast Zugriff." },
  { q: "Kann ich meine Daten exportieren?", a: "Premium-Nutzer können Immobilien als Excel/CSV exportieren." },
  { q: "Für wen ist die App geeignet?", a: "Private Käufer, Anleger, Familien und Personen, die Wohnungen kaufen, vermieten oder vergleichen wollen." },
  { q: "Was passiert, wenn mein Immobilienlimit erreicht ist?", a: "Du kannst bestehende Immobilien weiter bearbeiten. Neue Immobilien sind nach Upgrade möglich." },
  { q: "Kann ich später auf Plus oder Premium upgraden?", a: "Ja, jederzeit in den Einstellungen → Abo & Plan." },
];

export function FaqList() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {FAQS.map((f, i) => (
        <AccordionItem value={`item-${i}`} key={i}>
          <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
