import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutzerklärung – kauf ma" },
      { name: "description", content: "Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO bei der Nutzung von kauf ma." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: DatenschutzPage,
});

function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <p>Stand: <strong>[DATUM EINTRAGEN]</strong></p>
      <p>Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. In dieser Datenschutzerklärung informieren wir Sie darüber, welche personenbezogenen Daten wir im Rahmen unserer Website und Plattform verarbeiten, zu welchen Zwecken dies geschieht und welche Rechte Ihnen zustehen.</p>

      <h2>1. Verantwortlicher</h2>
      <p>Verantwortlich für die Datenverarbeitung ist:</p>
      <p>
        <strong>[VOLLSTÄNDIGER NAME / FIRMA EINTRAGEN]</strong><br />
        <strong>[ADRESSE EINTRAGEN]</strong><br />
        <strong>[PLZ ORT EINTRAGEN]</strong><br />
        Österreich
      </p>
      <p>E-Mail: hallo@kaufma.eu<br />Support: hallo@kaufma.eu</p>

      <h2>2. Allgemeines zur Datenverarbeitung</h2>
      <p>Wir verarbeiten personenbezogene Daten ausschließlich im Rahmen der gesetzlichen Bestimmungen, insbesondere der Datenschutz-Grundverordnung (DSGVO), des österreichischen Datenschutzgesetzes und des Telekommunikationsgesetzes.</p>
      <p>Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.</p>

      <h2>3. Daten, die beim Besuch der Website verarbeitet werden</h2>
      <p>Beim Aufruf unserer Website können technisch notwendige Daten verarbeitet werden, insbesondere:</p>
      <ul>
        <li>IP-Adresse</li><li>Datum und Uhrzeit des Zugriffs</li><li>aufgerufene Seiten</li>
        <li>Browsertyp und Browserversion</li><li>Betriebssystem</li><li>Referrer-URL</li>
        <li>technische Server-Logdaten</li>
      </ul>
      <p>Diese Daten werden verarbeitet, um die Website technisch bereitzustellen, Sicherheit zu gewährleisten und Fehler zu analysieren.</p>
      <p>Rechtsgrundlage ist unser berechtigtes Interesse gemäß Art. 6 Abs. 1 lit. f DSGVO.</p>

      <h2>4. Registrierung und Nutzerkonto</h2>
      <p>Wenn Sie ein Nutzerkonto erstellen, verarbeiten wir insbesondere:</p>
      <ul>
        <li>E-Mail-Adresse</li><li>Name, sofern angegeben</li><li>Passwort bzw. Authentifizierungsdaten</li>
        <li>Login-Daten</li><li>Plan bzw. Abo-Status</li><li>Zeitpunkt der Registrierung</li>
        <li>Nutzereinstellungen</li>
      </ul>
      <p>Diese Daten sind erforderlich, um Ihr Konto anzulegen, die Plattform bereitzustellen und Ihnen die Nutzung der gebuchten Funktionen zu ermöglichen.</p>
      <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>

      <h2>5. Nutzung der Immobilienanalyse</h2>
      <p>Im Rahmen der Nutzung der Plattform können Nutzerinnen und Nutzer Daten zu Immobilien eingeben oder importieren. Dazu können gehören:</p>
      <ul>
        <li>Immobilienlinks</li><li>Kaufpreis</li><li>Adresse oder Lage</li><li>Wohnfläche</li>
        <li>Nebenkosten</li><li>Finanzierungsdaten</li><li>Mietannahmen</li>
        <li>Verkäufer- oder Maklerdaten</li><li>Dokumente und Exposés</li><li>Notizen</li>
        <li>Status und Follow-ups</li>
      </ul>
      <p>Diese Daten werden verarbeitet, um die Immobilienanalyse, Berechnungen, Vergleichsfunktionen, Projektverwaltung und weitere Plattformfunktionen bereitzustellen.</p>
      <p>Die Verantwortung für die Rechtmäßigkeit der Eingabe oder des Imports von Daten liegt beim Nutzer. Nutzer dürfen nur Daten eingeben oder hochladen, zu deren Verwendung sie berechtigt sind.</p>
      <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Soweit berechtigte Interessen betroffen sind, kann zusätzlich Art. 6 Abs. 1 lit. f DSGVO einschlägig sein.</p>

      <h2>6. Linkanalyse und Datenimport</h2>
      <p>Wenn Sie einen Immobilienlink einfügen, kann die Plattform versuchen, öffentlich zugängliche oder vom Nutzer bereitgestellte Informationen aus dem Inserat technisch auszulesen und für Ihre private Analyse aufzubereiten.</p>
      <p>Dabei können insbesondere folgende Daten verarbeitet werden:</p>
      <ul>
        <li>Original-URL</li><li>Plattform oder Quelle</li><li>Immobiliendaten aus dem Inserat</li>
        <li>technische Importdaten</li><li>Importstatus</li><li>fehlende oder unvollständige Daten</li>
      </ul>
      <p>Die Linkanalyse erfolgt auf Veranlassung des Nutzers und dient ausschließlich der Erstellung einer privaten Immobilienanalyse im Nutzerkonto.</p>

      <h2>7. PDF-Upload und Dokumente</h2>
      <p>Wenn Sie Dokumente hochladen, etwa Exposés, Grundrisse, Energieausweise oder Bankunterlagen, verarbeiten wir diese Dokumente zur Bereitstellung der Plattformfunktionen.</p>
      <p>Hochgeladene Dokumente können personenbezogene Daten enthalten. Bitte laden Sie nur Dokumente hoch, die Sie verwenden dürfen.</p>

      <h2>8. Zahlungsabwicklung</h2>
      <p>Für die Zahlungsabwicklung nutzen wir Stripe.</p>
      <p>Wenn Sie ein kostenpflichtiges Abo abschließen, werden Zahlungsdaten und abrechnungsrelevante Informationen durch Stripe verarbeitet. Wir erhalten von Stripe keine vollständigen Kreditkartendaten, sondern nur Informationen zum Zahlungsstatus, Abo-Status, Plan, Zahlungsintervall und gegebenenfalls Rechnungsinformationen.</p>
      <p>Anbieter: Stripe Payments Europe, Ltd. bzw. verbundene Stripe-Unternehmen<br />Weitere Informationen: https://stripe.com/privacy</p>
      <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>

      <h2>9. Authentifizierung</h2>
      <p>Für Registrierung und Login können Authentifizierungsdienste verwendet werden, etwa E-Mail-Login oder Google Login.</p>
      <p>Bei Nutzung von Google Login gelten zusätzlich die Datenschutzbestimmungen von Google. Dabei können Authentifizierungsdaten, E-Mail-Adresse und Profilinformationen verarbeitet werden.</p>
      <p><strong>[HIER KONKRET EINTRAGEN, WELCHER AUTH-ANBIETER VERWENDET WIRD: Supabase Auth / Google OAuth / anderer Anbieter]</strong></p>

      <h2>10. Hosting und technische Dienstleister</h2>
      <p>Unsere Website und Plattform werden mit technischen Dienstleistern betrieben. Dabei können personenbezogene Daten verarbeitet werden.</p>
      <p>Eingesetzte Dienstleister können insbesondere sein:</p>
      <ul>
        <li>Hosting-Anbieter</li><li>Datenbankanbieter</li><li>Authentifizierungsanbieter</li>
        <li>Zahlungsdienstleister</li><li>Analyse- und Trackingdienste</li><li>E-Mail-Dienstleister</li>
      </ul>
      <p><strong>[HIER KONKRETE DIENSTLEISTER EINTRAGEN: z. B. Lovable, Supabase, Stripe, Google, Analytics-Anbieter, E-Mail-Anbieter]</strong></p>
      <p>Mit Dienstleistern, die personenbezogene Daten in unserem Auftrag verarbeiten, schließen wir erforderlichenfalls Auftragsverarbeitungsverträge ab.</p>

      <h2>11. Analyse und Tracking</h2>
      <p>Wir können datenschutzfreundliches Tracking verwenden, um die Nutzung der Website und Plattform zu verstehen und zu verbessern.</p>
      <p>Dabei werden keine sensiblen Immobiliendaten, keine vollständigen Immobilienlinks und keine Zahlungsdaten an Analyseanbieter übermittelt.</p>
      <p>Mögliche Ereignisse sind etwa:</p>
      <ul>
        <li>Seitenaufruf</li><li>Start einer Linkanalyse</li><li>Anzeige einer Vorschau</li>
        <li>Registrierung</li><li>Nutzung eines Rechners</li><li>Start eines Checkouts</li>
      </ul>
      <p><strong>[HIER EINTRAGEN, WELCHE ANALYSETOOLS TATSÄCHLICH AKTIV SIND: Google Analytics 4 / Meta Pixel / PostHog / Plausible / keines]</strong></p>
      <p>Soweit erforderlich, erfolgt Tracking nur nach Einwilligung über ein Cookie-Banner.</p>

      <h2>12. Cookies und ähnliche Technologien</h2>
      <p>Unsere Website kann Cookies oder ähnliche Technologien verwenden.</p>
      <p>Wir unterscheiden:</p>
      <ul>
        <li>technisch notwendige Cookies</li><li>funktionale Cookies</li>
        <li>Analyse-Cookies</li><li>Marketing-Cookies</li>
      </ul>
      <p>Technisch notwendige Cookies sind erforderlich, damit die Website und Plattform funktionieren. Analyse- oder Marketing-Cookies werden nur verwendet, soweit dies rechtlich zulässig ist und eine erforderliche Einwilligung vorliegt.</p>
      <p><strong>[COOKIE-BANNER / CONSENT-TOOL EINTRAGEN, falls vorhanden]</strong></p>

      <h2>13. E-Mail-Kommunikation</h2>
      <p>Wir können Ihnen E-Mails senden, soweit dies für die Nutzung der Plattform erforderlich ist, etwa für:</p>
      <ul>
        <li>Registrierung</li><li>Login</li><li>Passwort zurücksetzen</li>
        <li>Zahlungs- und Abo-Informationen</li><li>wichtige Systeminformationen</li>
        <li>Support-Kommunikation</li>
      </ul>
      <p>Marketing-E-Mails senden wir nur, wenn Sie darin eingewilligt haben.</p>
      <p><strong>[E-MAIL-DIENSTLEISTER EINTRAGEN, sobald festgelegt]</strong></p>

      <h2>14. Speicherdauer</h2>
      <p>Wir speichern personenbezogene Daten nur so lange, wie dies für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.</p>
      <p>Kontodaten und Projektdaten werden grundsätzlich gespeichert, solange das Nutzerkonto besteht. Nach Löschung des Kontos werden personenbezogene Daten gelöscht oder anonymisiert, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>

      <h2>15. Weitergabe von Daten</h2>
      <p>Eine Weitergabe personenbezogener Daten erfolgt nur, wenn dies erforderlich ist, etwa:</p>
      <ul>
        <li>zur Bereitstellung der Plattform</li>
        <li>zur Zahlungsabwicklung</li>
        <li>zur Erfüllung gesetzlicher Pflichten</li>
        <li>an technische Dienstleister</li>
        <li>mit Ihrer Einwilligung</li>
      </ul>
      <p>Ein Verkauf personenbezogener Daten findet nicht statt.</p>

      <h2>16. Datenübermittlung in Drittländer</h2>
      <p>Einige Dienstleister können Daten außerhalb der EU bzw. des EWR verarbeiten. In solchen Fällen achten wir auf geeignete Garantien, etwa Angemessenheitsbeschlüsse oder Standardvertragsklauseln.</p>
      <p><strong>[HIER KONKRET PRÜFEN UND ERGÄNZEN, WENN DIENSTLEISTER AUSSERHALB DER EU EINGESETZT WERDEN]</strong></p>

      <h2>17. Ihre Rechte</h2>
      <p>Sie haben nach der DSGVO insbesondere folgende Rechte:</p>
      <ul>
        <li>Recht auf Auskunft</li>
        <li>Recht auf Berichtigung</li>
        <li>Recht auf Löschung</li>
        <li>Recht auf Einschränkung der Verarbeitung</li>
        <li>Recht auf Datenübertragbarkeit</li>
        <li>Recht auf Widerspruch</li>
        <li>Recht auf Widerruf erteilter Einwilligungen</li>
        <li>Recht auf Beschwerde bei einer Aufsichtsbehörde</li>
      </ul>
      <p>In Österreich ist die Datenschutzbehörde zuständig.</p>

      <h2>18. Kontakt für Datenschutzanfragen</h2>
      <p>Für Datenschutzanfragen kontaktieren Sie uns bitte unter:</p>
      <p>hallo@kaufma.eu</p>

      <h2>19. Änderung dieser Datenschutzerklärung</h2>
      <p>Wir können diese Datenschutzerklärung anpassen, wenn sich die Website, die Plattform, eingesetzte Dienstleister oder rechtliche Anforderungen ändern. Die jeweils aktuelle Version ist auf unserer Website abrufbar.</p>
    </LegalLayout>
  );
}
