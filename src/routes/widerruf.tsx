import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const Route = createFileRoute("/widerruf")({
  head: () => ({
    meta: [
      { title: "Widerruf – kauf ma" },
      { name: "description", content: "Widerrufsbelehrung für kauf ma." },
    ],
  }),
  component: Widerruf,
});

function Widerruf() {
  return (
    <LegalLayout title="Widerruf">
      <p>Verbraucher haben nach Maßgabe der gesetzlichen Bestimmungen ein Widerrufsrecht.</p>
      <h2>Widerrufsfrist</h2>
      <p>Die Widerrufsfrist beträgt vierzehn Tage ab Vertragsschluss.</p>
      <h2>Ausübung des Widerrufs</h2>
      <p>Um das Widerrufsrecht auszuüben, genügt eine eindeutige Erklärung per E-Mail oder über die im Impressum genannten Kontaktdaten.</p>
      <h2>Folgen des Widerrufs</h2>
      <p>Im Falle eines wirksamen Widerrufs werden bereits erhaltene Zahlungen nach den gesetzlichen Vorgaben erstattet.</p>
    </LegalLayout>
  );
}