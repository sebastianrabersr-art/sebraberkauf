import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const Route = createFileRoute("/impressum")({
  head: () => ({ meta: [{ title: "Impressum – kaufma" }] }),
  component: Impressum,
});

function Impressum() {
  return (
    <LegalLayout title="Impressum">
      <h2>Angaben gemäß § 5 ECG und § 25 MedienG</h2>

      <h3>Unternehmensbezeichnung</h3>
      <p>ayoka GmbH</p>

      <h3>Anschrift</h3>
      <p>
        Börsegasse 7<br />
        1010 Wien<br />
        Österreich
      </p>

      <h3>Kontakt</h3>
      <p>
        E-Mail: <a href="mailto:hallo@kaufma.eu">hallo@kaufma.eu</a>
      </p>

      <h3>Unternehmensgegenstand</h3>
      <p>Handel mit Waren aller Art; Betrieb einer Immobilienanalyse-Plattform (kaufma.eu)</p>

      <h3>Firmenbuch</h3>
      <p>
        Firmenbuchnummer: FN 514214y<br />
        Firmenbuchgericht: Handelsgericht Wien
      </p>

      <h3>UID-Nummer</h3>
      <p>ATU74502834</p>

      <h3>Kammermitgliedschaft</h3>
      <p>
        Mitglied der Wirtschaftskammer Wien<br />
        Fachgruppe: Handel mit Waren aller Art
      </p>

      <h3>Anwendbare Rechtsvorschriften</h3>
      <p>
        Es gelten die einschlägigen österreichischen Gewerbeordnungsvorschriften.<br />
        Zugang über: <a href="https://www.ris.bka.gv.at" target="_blank" rel="noopener noreferrer">www.ris.bka.gv.at</a>
      </p>

      <h3>Aufsichtsbehörde</h3>
      <p>Magistrat der Stadt Wien – Magistratisches Bezirksamt</p>

      <h3>Gerichtsstand</h3>
      <p>Für alle Streitigkeiten aus oder im Zusammenhang mit dieser Website ist das sachlich zuständige Gericht in Wien örtlich zuständig, sofern gesetzlich zulässig.</p>

      <h2>Haftungsausschluss</h2>

      <h3>Inhalt des Onlineangebotes</h3>
      <p>
        Die Inhalte auf kaufma.eu dienen ausschließlich der allgemeinen Information und stellen keine Rechts-, Steuer- oder Anlageberatung dar. Trotz sorgfältiger inhaltlicher Kontrolle übernimmt die ayoka GmbH keine Haftung für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Informationen.
      </p>

      <h3>Berechnungen und Analysen</h3>
      <p>
        Sämtliche Berechnungen, Renditeangaben und Cashflow-Analysen auf dieser Plattform sind Schätzungen auf Basis der eingegebenen Daten und ersetzen keine professionelle Beratung. Eine Haftung für Entscheidungen, die auf Basis dieser Berechnungen getroffen werden, ist ausgeschlossen.
      </p>

      <h3>Externe Links</h3>
      <p>
        Diese Website enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
      </p>

      <h2>Online-Streitbeilegung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr
        </a>
        .<br />
        Unsere E-Mail-Adresse lautet: <a href="mailto:hallo@kaufma.eu">hallo@kaufma.eu</a>
      </p>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <p style={{ marginTop: "2rem", color: "#78716C", fontSize: "0.875rem" }}>
        Stand: Juni 2026
      </p>
    </LegalLayout>
  );
}
