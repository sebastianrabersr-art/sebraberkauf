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

const linkCls = "text-primary underline";

function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <h2>1. Verantwortlicher</h2>
      <p>
        ayoka GmbH<br />
        Börsegasse 7, 1010 Wien, Österreich<br />
        E-Mail: <a href="mailto:hallo@kaufma.eu" className={linkCls}>hallo@kaufma.eu</a>
      </p>

      <h2>2. Erhobene Daten und Zwecke</h2>

      <h3>2.1 Registrierung und Nutzerkonto</h3>
      <p>Bei der Registrierung erheben wir E-Mail-Adresse, Name (optional) und Passwort (verschlüsselt). Zweck: Bereitstellung des Nutzerkontos. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Speicherdauer: Bis zur Kontolöschung, danach endgültige Löschung nach 12 Monaten.</p>

      <h3>2.2 Immobilien- und Analysedaten</h3>
      <p>Daten die Sie auf der Plattform eingeben (Kaufpreise, Mieteinnahmen, Finanzierungsdetails) werden ausschließlich zur Erbringung des Dienstes gespeichert und nicht an Dritte weitergegeben. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>

      <h3>2.3 Zahlungsdaten</h3>
      <p>Zahlungen werden über Stripe, Inc. abgewickelt. Wir speichern keine Kreditkartendaten. Stripe verarbeitet Zahlungsdaten gemäß eigener Datenschutzrichtlinie (<a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className={linkCls}>stripe.com/privacy</a>). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>

      <h3>2.4 E-Mail-Kommunikation</h3>
      <p>Transaktionale E-Mails werden über Resend (Resend Inc.) versendet. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>

      <h2>3. Hosting und Infrastruktur</h2>
      <p>Die Plattformdaten werden in einer Datenbank mit Serverstandort Europe (Ireland) gespeichert. Die Datenverarbeitung erfolgt auf Basis von Standardvertragsklauseln gemäß Art. 46 DSGVO.</p>

      <h2>4. Google Analytics</h2>
      <p>Wir verwenden Google Analytics 4 (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) zur Analyse des Nutzerverhaltens. Google Analytics setzt Cookies und erfasst anonymisierte Nutzungsdaten. IP-Adressen werden anonymisiert. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung über Cookie-Banner). Sie können der Datenerfassung widersprechen unter: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className={linkCls}>tools.google.com/dlpage/gaoptout</a></p>

      <h2>5. Cookies</h2>
      <p>Wir verwenden technisch notwendige Cookies für die Funktionalität der Plattform sowie Analyse-Cookies (Google Analytics) nur mit Ihrer ausdrücklichen Einwilligung. Sie können Ihre Einwilligung jederzeit über den Cookie-Banner auf unserer Website widerrufen.</p>

      <h2>6. Ihre Rechte</h2>
      <p>Sie haben folgende Rechte gemäß DSGVO:</p>
      <ul>
        <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3 DSGVO)</li>
      </ul>
      <p>Zur Ausübung Ihrer Rechte wenden Sie sich an: <a href="mailto:hallo@kaufma.eu" className={linkCls}>hallo@kaufma.eu</a></p>

      <h2>7. Beschwerderecht</h2>
      <p>
        Sie haben das Recht, sich bei der österreichischen Datenschutzbehörde zu beschweren:<br />
        Österreichische Datenschutzbehörde, Barichgasse 40–42, 1030 Wien<br />
        <a href="https://dsb.gv.at" target="_blank" rel="noopener noreferrer" className={linkCls}>dsb.gv.at</a>
      </p>

      <h2>8. Änderungen</h2>
      <p>Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Stand: Oktober 2026.</p>
    </LegalLayout>
  );
}
