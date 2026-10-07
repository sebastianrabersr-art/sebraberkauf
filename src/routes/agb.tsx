import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const Route = createFileRoute("/agb")({
  head: () => ({
    meta: [
      { title: "AGB – kauf ma" },
      { name: "description", content: "Allgemeine Geschäftsbedingungen der Plattform kauf ma." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: AgbPage,
});

const linkCls = "text-primary underline";

function AgbPage() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen">
      <h2>1. Geltungsbereich</h2>
      <p>Diese AGB gelten für alle Verträge zwischen der ayoka GmbH (Börsegasse 7, 1010 Wien, FN 514214y, ATU74502834 – nachfolgend „Anbieter") und den Nutzern der Plattform kaufma.eu (nachfolgend „Nutzer").</p>

      <h2>2. Leistungsbeschreibung</h2>
      <p>kaufma.eu ist eine webbasierte Immobilienanalyse-Plattform. Der Anbieter stellt folgende Pakete bereit:</p>
      <ul>
        <li>Free: 1 Immobilie, Grundkalkulation, kostenlos</li>
        <li>Plus (€9,99/Monat oder €99,99/Jahr): 5 Immobilien, Vergleichsfunktion, PDF Export</li>
        <li>Premium (€29,99/Monat oder €299,99/Jahr): Unbegrenzte Immobilien, alle Features</li>
      </ul>
      <p>Die Plattform dient ausschließlich der allgemeinen Information und stellt keine Anlage-, Steuer- oder Rechtsberatung dar.</p>

      <h2>3. Vertragsschluss</h2>
      <p>Der Vertrag kommt durch Registrierung und Bestätigung der E-Mail-Adresse zustande. Für kostenpflichtige Pakete zusätzlich durch Abschluss des Zahlungsvorgangs über Stripe.</p>

      <h2>4. Preise und Zahlung</h2>
      <p>Alle Preise verstehen sich in Euro inkl. gesetzlicher Mehrwertsteuer. Die Zahlung erfolgt im Voraus über Stripe (Kreditkarte oder andere verfügbare Zahlungsmethoden). Bei Jahreszahlung wird der Gesamtbetrag sofort fällig.</p>

      <h2>5. Laufzeit und Kündigung</h2>
      <p>Monatliche Abonnements verlängern sich automatisch um einen Monat, jährliche um ein Jahr. Die Kündigung ist jederzeit zum Ende der laufenden Abrechnungsperiode möglich – ohne Einhaltung einer zusätzlichen Kündigungsfrist. Die Kündigung erfolgt über die Einstellungen im Nutzerkonto oder per E-Mail an <a href="mailto:hallo@kaufma.eu" className={linkCls}>hallo@kaufma.eu</a>.</p>

      <h2>6. Widerrufsrecht</h2>
      <p>Verbrauchern steht ein gesetzliches Widerrufsrecht von 14 Tagen ab Vertragsschluss zu. Der Widerruf ist ohne Angabe von Gründen möglich. Details zur Ausübung des Widerrufs sowie ein Muster-Widerrufsformular finden Sie unter <a href="/widerruf" className={linkCls}>kaufma.eu/widerruf</a>.</p>

      <h2>7. Datenlöschung nach Kündigung</h2>
      <p>Nach Kündigung bleiben Nutzerdaten für 12 Monate gespeichert und werden danach endgültig gelöscht. Der Nutzer kann jederzeit die sofortige Löschung unter <a href="mailto:hallo@kaufma.eu" className={linkCls}>hallo@kaufma.eu</a> beantragen.</p>

      <h2>8. Haftungsbeschränkung</h2>
      <p>Der Anbieter haftet nicht für Entscheidungen, die auf Basis der Berechnungen und Analysen der Plattform getroffen werden. Die Plattform ersetzt keine professionelle Beratung. Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen, soweit gesetzlich zulässig.</p>

      <h2>9. Änderungen der AGB</h2>
      <p>Der Anbieter behält sich vor, diese AGB anzupassen. Nutzer werden per E-Mail informiert. Widerspricht der Nutzer nicht binnen 30 Tagen, gelten die neuen AGB als akzeptiert.</p>

      <h2>10. Anwendbares Recht und Gerichtsstand</h2>
      <p>Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand für Unternehmer ist Wien. Für Verbraucher gilt der gesetzliche Gerichtsstand.</p>

      <p>Stand: Oktober 2026</p>
    </LegalLayout>
  );
}
