import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum – kauf ma" },
      { name: "description", content: "Impressum und Anbieterkennzeichnung gemäß E-Commerce-Gesetz, Unternehmensgesetzbuch und Mediengesetz." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: ImpressumPage,
});

function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <p>Angaben gemäß E-Commerce-Gesetz, Unternehmensgesetzbuch und Mediengesetz.</p>

      <h2>Medieninhaber und Betreiber der Website</h2>
      <p>
        [VOLLSTÄNDIGER NAME / FIRMA EINTRAGEN]<br />
        [RECHTSFORM EINTRAGEN, z. B. Einzelunternehmen / GmbH]<br />
        [ADRESSE EINTRAGEN]<br />
        [PLZ ORT EINTRAGEN]<br />
        Österreich
      </p>
      <p>
        E-Mail: office@kaufma.eu<br />
        Support: support@kaufma.eu<br />
        Website: https://www.kaufma.eu
      </p>

      <h2>Unternehmensdaten</h2>
      <p>
        Firmenbuchnummer: [FIRMENBUCHNUMMER EINTRAGEN, falls vorhanden]<br />
        Firmenbuchgericht: [FIRMENBUCHGERICHT EINTRAGEN, falls vorhanden]<br />
        UID-Nummer: [UID-NUMMER EINTRAGEN, falls vorhanden]<br />
        Gewerbe: [GEWERBE / TÄTIGKEIT EINTRAGEN]<br />
        Mitglied der Wirtschaftskammer: [BUNDESLAND / FACHGRUPPE EINTRAGEN]
      </p>
      <p>
        Falls kein Firmenbucheintrag besteht:<br />
        GISA-Zahl: [GISA-ZAHL EINTRAGEN, falls vorhanden]
      </p>

      <h2>Unternehmensgegenstand</h2>
      <p>
        Betrieb einer Softwareplattform zur Analyse, Berechnung und Verwaltung von Immobilien-Kaufkandidaten.
        Die Plattform unterstützt Nutzerinnen und Nutzer bei der strukturierten Berechnung von Kaufkosten,
        Finanzierung, Miete, Rendite, Cashflow und weiteren immobilienbezogenen Kennzahlen.
      </p>

      <h2>Aufsichtsbehörde</h2>
      <p>[ZUSTÄNDIGE BEHÖRDE EINTRAGEN, z. B. Magistratisches Bezirksamt / Bezirkshauptmannschaft]</p>

      <h2>Anwendbare gewerbe- oder berufsrechtliche Vorschriften</h2>
      <p>
        Gewerbeordnung: www.ris.bka.gv.at<br />
        Weitere anwendbare Vorschriften: [FALLS RELEVANT EINTRAGEN]
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>
        <strong>[NAME EINTRAGEN]</strong><br />
        [ADRESSE EINTRAGEN, falls abweichend]<br />
        E-Mail: office@kaufma.eu
      </p>

      <h2>Haftungsausschluss für Inhalte</h2>
      <p>
        Die Inhalte dieser Website und der Plattform wurden mit größtmöglicher Sorgfalt erstellt. Dennoch
        übernehmen wir keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten
        Informationen, Berechnungen und Einschätzungen.
      </p>
      <p>
        Die Plattform bietet strukturierte Berechnungen, Datenaufbereitung und KI-basierte Orientierung. Sie
        ersetzt keine Rechts-, Steuer-, Finanzierungs-, Immobilien- oder Anlageberatung. Vor einer
        Kaufentscheidung sollten Nutzerinnen und Nutzer professionelle Beratung einholen.
      </p>

      <h2>Haftung für externe Links</h2>
      <p>
        Diese Website kann Links zu externen Websites enthalten. Auf deren Inhalte haben wir keinen Einfluss.
        Für die Inhalte externer Seiten sind ausschließlich deren Betreiber verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die auf dieser Website veröffentlichten Inhalte, Texte, Designs, Berechnungslogiken, Grafiken und
        sonstigen Elemente sind urheberrechtlich geschützt, soweit sie nicht ausdrücklich als fremde Inhalte
        gekennzeichnet sind. Eine Verwendung, Vervielfältigung oder Weitergabe ist nur mit vorheriger
        Zustimmung erlaubt.
      </p>

      <h2>Hinweis zur Nutzung der Plattform</h2>
      <p>
        Die Plattform dient der privaten und geschäftlichen Unterstützung bei der strukturierten Analyse von
        Immobilien. Die Ergebnisse beruhen auf den vom Nutzer eingegebenen oder importierten Daten. Die
        Verantwortung für die Prüfung der Richtigkeit, Vollständigkeit und rechtlichen Zulässigkeit der
        verwendeten Daten liegt beim Nutzer.
      </p>
    </LegalLayout>
  );
}
