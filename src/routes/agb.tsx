import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const Route = createFileRoute("/agb")({
  head: () => ({
    meta: [
      { title: "AGB & Nutzungsbedingungen – kauf ma" },
      { name: "description", content: "Allgemeine Geschäftsbedingungen und Nutzungsbedingungen der Plattform kauf ma." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: AgbPage,
});

function AgbPage() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen und Nutzungsbedingungen">
      <p>Stand: <strong>[DATUM EINTRAGEN]</strong></p>

      <h2>1. Anbieter</h2>
      <p>Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Plattform „Kaufma“ unter www.kaufma.eu.</p>
      <p>Anbieter ist:</p>
      <p>
        <strong>[VOLLSTÄNDIGER NAME / FIRMA EINTRAGEN]</strong><br />
        <strong>[ADRESSE EINTRAGEN]</strong><br />
        <strong>[PLZ ORT EINTRAGEN]</strong><br />
        Österreich
      </p>
      <p>E-Mail: office@kaufma.eu<br />Support: support@kaufma.eu</p>

      <h2>2. Gegenstand der Plattform</h2>
      <p>Kaufma ist eine Softwareplattform zur strukturierten Analyse, Berechnung und Verwaltung von Immobilien-Kaufkandidaten.</p>
      <p>Die Plattform ermöglicht insbesondere:</p>
      <ul>
        <li>Eingabe oder Import von Immobilieninformationen</li>
        <li>Analyse von Kaufpreis, Kaufnebenkosten und Finanzierung</li>
        <li>Berechnung von Miete, Rendite und Cashflow</li>
        <li>Vergleich von Immobilien</li>
        <li>Verwaltung von Projekten, Dokumenten, Notizen und Follow-ups</li>
        <li>optionale Verwaltung bereits gekaufter Immobilien im Portfolio-Bereich</li>
      </ul>
      <p>Die Plattform dient als digitales Hilfsmittel zur Vorbereitung von Kaufentscheidungen. Sie ersetzt keine individuelle Beratung durch Rechtsanwälte, Steuerberater, Finanzberater, Immobilienmakler, Sachverständige oder Banken.</p>

      <h2>3. Keine Rechts-, Steuer-, Finanz- oder Anlageberatung</h2>
      <p>Alle Berechnungen, Einschätzungen, Scores, Hinweise zu Mietrecht, Kaufnebenkosten, Finanzierung oder Rendite sind unverbindliche Orientierungshilfen.</p>
      <p>Die Plattform gibt keine Rechtsberatung, Steuerberatung, Finanzberatung, Anlageberatung oder Immobilienbewertung im rechtlichen Sinn.</p>
      <p>Nutzerinnen und Nutzer sind selbst dafür verantwortlich, sämtliche Angaben, Berechnungen und Ergebnisse vor einer Kaufentscheidung professionell prüfen zu lassen.</p>

      <h2>4. Registrierung und Nutzerkonto</h2>
      <p>Für die Nutzung bestimmter Funktionen ist eine Registrierung erforderlich.</p>
      <p>Nutzer verpflichten sich, bei der Registrierung korrekte Angaben zu machen und Zugangsdaten geheim zu halten. Eine Weitergabe des Accounts an Dritte ist ohne Zustimmung des Anbieters nicht gestattet.</p>
      <p>Der Anbieter kann den Zugang sperren, wenn ein begründeter Verdacht auf missbräuchliche Nutzung, Sicherheitsverletzungen oder Verstöße gegen diese Bedingungen besteht.</p>

      <h2>5. Nutzung von Immobilienlinks und importierten Daten</h2>
      <p>Nutzer können Immobilienlinks eingeben oder Daten aus Inseraten, PDFs oder anderen Quellen importieren.</p>
      <p>Der Nutzer bestätigt, dass er berechtigt ist, die jeweiligen Daten, Links, Dokumente oder Informationen für seine Analyse zu verwenden.</p>
      <p>Die Plattform kann versuchen, Daten aus vom Nutzer angegebenen Quellen technisch auszulesen und strukturiert aufzubereiten. Der Anbieter übernimmt keine Gewähr dafür, dass Import, Extraktion oder Analyse vollständig, richtig oder jederzeit verfügbar sind.</p>
      <p>Nicht erlaubt ist die Nutzung der Plattform für:</p>
      <ul>
        <li>massenhaftes automatisiertes Auslesen fremder Plattformen</li>
        <li>Aufbau einer öffentlichen Kopie fremder Immobilienportale</li>
        <li>unzulässige Speicherung oder Verbreitung urheberrechtlich geschützter Inhalte</li>
        <li>rechtswidrige Verarbeitung personenbezogener Daten</li>
        <li>Umgehung technischer Schutzmaßnahmen fremder Websites</li>
      </ul>

      <h2>6. Verantwortung für eingegebene Daten</h2>
      <p>Die Qualität der Ergebnisse hängt wesentlich von den eingegebenen oder importierten Daten ab.</p>
      <p>Der Anbieter übernimmt keine Verantwortung für unrichtige, unvollständige, veraltete oder missverständliche Daten, die von Nutzern eingegeben oder aus externen Quellen übernommen wurden.</p>
      <p>Nutzer sind verpflichtet, alle relevanten Daten eigenständig zu prüfen, insbesondere:</p>
      <ul>
        <li>Kaufpreis</li><li>Kaufnebenkosten</li><li>Maklerkosten</li><li>Betriebskosten</li>
        <li>Mietannahmen</li><li>Finanzierung</li><li>rechtliche Rahmenbedingungen</li>
        <li>Objektzustand</li><li>Eigentums- und Grundbuchdaten</li><li>Mietverträge</li>
        <li>steuerliche Auswirkungen</li>
      </ul>

      <h2>7. Berechnungen und Score</h2>
      <p>Die Plattform kann Immobilien anhand bestimmter Kriterien bewerten und Scores vergeben.</p>
      <p>Der Score ist eine interne Orientierungshilfe und kann unter anderem Faktoren wie Lage, Zahlen/Rendite, Vermietbarkeit, Zustand, Mietrecht/Risiko und Wiederverkaufbarkeit berücksichtigen.</p>
      <p>Der Score ist keine Kaufempfehlung, keine Verkehrswertermittlung und keine Garantie für wirtschaftlichen Erfolg.</p>

      <h2>8. Verfügbarkeit der Plattform</h2>
      <p>Der Anbieter bemüht sich um eine möglichst unterbrechungsfreie Verfügbarkeit der Plattform. Eine bestimmte Verfügbarkeit wird jedoch nicht garantiert.</p>
      <p>Wartungen, technische Störungen, Sicherheitsupdates oder externe Dienstleister können zu zeitweisen Einschränkungen führen.</p>

      <h2>9. Preise und Abonnements</h2>
      <p>Die Plattform bietet kostenlose und kostenpflichtige Pläne an.</p>
      <p>Aktuelle Pläne:</p>
      <h3>Gratis</h3>
      <ul>
        <li>1 Immobilie</li><li>1 Projekt</li><li>volle Analyse für diese eine Immobilie</li>
        <li>keine Vergleichsfunktion</li><li>kein Portfolio</li>
      </ul>
      <h3>Plus</h3>
      <ul>
        <li>bis zu 5 Immobilien</li><li>1 Projekt</li><li>Vergleichsfunktion</li>
        <li>weitere Analysefunktionen gemäß Leistungsbeschreibung</li><li>kein Portfolio</li>
      </ul>
      <h3>Premium</h3>
      <ul>
        <li>unbegrenzt Immobilien</li><li>unbegrenzt Projekte</li><li>Portfolio</li>
        <li>erweiterte Funktionen gemäß Leistungsbeschreibung</li>
      </ul>
      <p>Die jeweils aktuellen Preise und Leistungsumfänge sind auf der Website ersichtlich.</p>

      <h2>10. Zahlung und Abrechnung</h2>
      <p>Zahlungen für kostenpflichtige Pläne werden über Stripe abgewickelt.</p>
      <p>Die Nutzung kostenpflichtiger Funktionen setzt eine erfolgreiche Zahlung und ein aktives Abonnement voraus.</p>
      <p>Bei fehlgeschlagener Zahlung, Kündigung oder Ablauf des Abonnements kann der Zugriff auf kostenpflichtige Funktionen eingeschränkt werden.</p>

      <h2>11. Laufzeit und Kündigung</h2>
      <p>Kostenpflichtige Abonnements können monatlich oder jährlich abgeschlossen werden.</p>
      <p>Abonnements verlängern sich automatisch um die jeweilige Laufzeit, sofern sie nicht rechtzeitig gekündigt werden.</p>
      <p>Die Kündigung kann über den Abo-Verwaltungsbereich oder über den Support erfolgen.</p>
      <p><strong>[HIER KONKRET ERGÄNZEN: Kündigungsfrist, Zeitpunkt der Wirksamkeit, ob Kündigung zum Periodenende erfolgt]</strong></p>

      <h2>12. Widerrufsrecht für Verbraucher</h2>
      <p>Verbraucher können bei online abgeschlossenen Verträgen grundsätzlich ein gesetzliches Widerrufsrecht haben.</p>
      <p><strong>[HIER MUSS EINE KONKRETE WIDERRUFSBELEHRUNG EINGEFÜGT WERDEN, ABHÄNGIG DAVON, OB ES SICH UM DIGITALE DIENSTLEISTUNGEN, DIGITALE INHALTE, SOFORTIGE LEISTUNGSERBRINGUNG ODER ABOS HANDELT.]</strong></p>
      <p>Wenn der Nutzer verlangt, dass die Leistung bereits während der Widerrufsfrist beginnt, kann dies Auswirkungen auf das Widerrufsrecht haben.</p>
      <p><strong>[DIESEN ABSCHNITT UNBEDINGT MIT WKO-MUSTER ODER JURIST PRÜFEN.]</strong></p>

      <h2>13. Änderungen von Preisen und Leistungsumfang</h2>
      <p>Der Anbieter kann Preise, Funktionen und Leistungsumfänge ändern.</p>
      <p>Für bestehende kostenpflichtige Abonnements gelten Preisänderungen erst nach entsprechender Information und unter Einhaltung gesetzlicher Vorgaben.</p>

      <h2>14. Nutzungsbeschränkungen und Fair Use</h2>
      <p>Nutzer dürfen die Plattform nur im Rahmen des vorgesehenen Zwecks verwenden.</p>
      <p>Unzulässig sind insbesondere:</p>
      <ul>
        <li>missbräuchliche Nutzung</li>
        <li>automatisierte Massennutzung ohne Zustimmung</li>
        <li>Weiterverkauf des Zugangs</li>
        <li>Umgehung von Planlimits</li>
        <li>Angriffe auf technische Systeme</li>
        <li>Nutzung zur rechtswidrigen Datenverarbeitung</li>
        <li>Verletzung von Rechten Dritter</li>
      </ul>

      <h2>15. Geistiges Eigentum</h2>
      <p>Alle Rechte an der Plattform, Software, Designs, Texten, Berechnungslogiken und Marken verbleiben beim Anbieter oder den jeweiligen Rechteinhabern.</p>
      <p>Nutzer erhalten lediglich ein nicht ausschließliches, nicht übertragbares Recht zur Nutzung der Plattform im Rahmen des gewählten Plans.</p>

      <h2>16. Inhalte und Dokumente der Nutzer</h2>
      <p>Nutzer behalten die Rechte an ihren eingegebenen Daten und hochgeladenen Dokumenten.</p>
      <p>Der Anbieter darf diese Daten verarbeiten, soweit dies zur Bereitstellung der Plattformfunktionen erforderlich ist.</p>
      <p>Nutzer sind selbst dafür verantwortlich, dass hochgeladene Dokumente keine Rechte Dritter verletzen und rechtmäßig verwendet werden dürfen.</p>

      <h2>17. Haftung</h2>
      <p>Der Anbieter haftet nur nach den gesetzlichen Vorschriften.</p>
      <p>Eine Haftung für wirtschaftliche Entscheidungen, Immobilienkäufe, Finanzierungsentscheidungen, entgangene Gewinne, Wertverluste oder sonstige Schäden, die auf Grundlage der Plattformnutzung entstehen, ist ausgeschlossen, soweit gesetzlich zulässig.</p>
      <p>Die Plattform stellt lediglich Berechnungs- und Strukturierungshilfen bereit. Nutzer treffen Kauf- und Investmententscheidungen eigenverantwortlich.</p>

      <h2>18. Externe Links und Drittanbieter</h2>
      <p>Die Plattform kann Links zu externen Websites oder Datenquellen enthalten. Für deren Inhalte, Verfügbarkeit und Richtigkeit ist der jeweilige Betreiber verantwortlich.</p>
      <p>Für Dienste von Drittanbietern, insbesondere Zahlungsanbieter, Hostinganbieter, Authentifizierungsdienste oder Analyseanbieter, können ergänzende Bedingungen dieser Anbieter gelten.</p>

      <h2>19. Datenschutz</h2>
      <p>Informationen zur Verarbeitung personenbezogener Daten finden sich in der <a href="/datenschutz" className="text-primary underline">Datenschutzerklärung</a>.</p>

      <h2>20. Schlussbestimmungen</h2>
      <p>Es gilt österreichisches Recht unter Ausschluss der Kollisionsnormen und des UN-Kaufrechts, soweit dem keine zwingenden Verbraucherschutzvorschriften entgegenstehen.</p>
      <p>Gerichtsstand ist, soweit gesetzlich zulässig, <strong>[GERICHTSSTAND EINTRAGEN]</strong>.</p>
      <p>Sollten einzelne Bestimmungen dieser Bedingungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>

      <h2>21. Kontakt</h2>
      <p>Bei Fragen zu diesen Nutzungsbedingungen wenden Sie sich bitte an:</p>
      <p>office@kaufma.eu<br />support@kaufma.eu</p>
    </LegalLayout>
  );
}
