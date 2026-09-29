# Kaufma

Baue mir eine professionelle Web-App für die Bewertung von Immobilien-Investments.

Ich lade eine Excel-Datei hoch, die bereits mein bestehendes Immobilien-Investment-Dashboard enthält. Bitte nutze diese Datei als Grundlage für die Struktur, Berechnungslogik, Kennzahlen, Scoring-System und Dashboard-Ansicht.

Die App soll folgendes können:

Ziel der App

Ich möchte online Immobilien finden, den Link zu einem Inserat einfügen und die App soll automatisch die wichtigsten Daten aus dem Inserat auslesen, strukturieren und in eine Investment-Kalkulation übernehmen.

Die App soll mir helfen, gemeinsam mit meinem Vater passende Immobilien für Kauf, Vermietung und langfristige Geldanlage zu bewerten.

Fokus: Wohnungen in Wien, besonders innerhalb des Gürtels oder in guten Lagen mit stabiler Vermietbarkeit.

Hauptfunktion: Immobilien-Link analysieren

Auf der Startseite soll es ein großes Eingabefeld geben:

„Immobilien-Link einfügen“

Der User fügt dort einen Link von Plattformen wie z. B.:

 willhaben

 ImmoScout24

 derStandard Immobilien

 immowelt

 Maklerseiten

 Bauträgerseiten

ein.

Nach Klick auf „Immobilie analysieren“ soll die App versuchen, aus dem Inserat folgende Daten automatisch zu extrahieren:

 Titel des Inserats

 Link

 Plattform

 Kaufpreis

 Wohnfläche in m²

 Preis pro m²

 Zimmeranzahl

 Adresse oder Lage

 Bezirk

 Bundesland/Stadt

 Baujahr

 Neubau / Altbau / saniert

 Zustand

 Stockwerk

 Lift ja/nein

 Balkon / Terrasse / Loggia ja/nein

 Garten ja/nein

 Keller ja/nein

 Stellplatz ja/nein

 Betriebskosten monatlich

 Heizkosten monatlich

 Rücklage / Reparaturfonds, falls angegeben

 Energieklasse

 HWB-Wert

 Verfügbarkeit

 Makler oder privat

 Beschreibung

 wichtige Hinweise aus dem Text

 fehlende Daten

Wenn Daten nicht eindeutig gefunden werden, soll die App nicht raten, sondern den Wert leer lassen und im Bereich „Fehlende Daten“ anzeigen.

Wichtig: Datenextraktion

Die App soll eine robuste Datenextraktion haben.

Falls direktes Scraping nicht möglich ist, soll die App eine alternative Eingabe anbieten:

 Link einfügen

 Optional: Inseratstext manuell einfügen

 Optional: Screenshot oder PDF/Expose hochladen

 KI extrahiert daraus die Daten

Die App soll immer strukturiertes JSON erzeugen und dieses in die Kalkulation übernehmen.

Beispiel JSON-Struktur:

{
  "title": "",
  "url": "",
  "platform": "",
  "purchase_price": null,
  "living_area_m2": null,
  "rooms": null,
  "district": "",
  "location": "",
  "year_built": null,
  "condition": "",
  "floor": "",
  "has_elevator": null,
  "has_balcony": null,
  "has_terrace": null,
  "has_loggia": null,
  "has_garden": null,
  "has_basement": null,
  "has_parking": null,
  "monthly_operating_costs": null,
  "monthly_heating_costs": null,
  "energy_class": "",
  "hwb": null,
  "availability": "",
  "seller_type": "",
  "description": "",
  "missing_data": []
}

Investment-Kalkulation

Nach der Extraktion sollen automatisch folgende Kennzahlen berechnet werden:

Kauf- und Kostenkennzahlen

 Kaufpreis

 Wohnfläche

 Preis pro m²

 Kaufnebenkosten

 Gesamtkapitalbedarf

 Eigenkapitalbedarf

 Kreditbetrag

 Loan-to-Value

 monatliche Kreditrate

 Annuität

Vermietungskennzahlen

 geschätzte Monatsmiete netto

 Jahresnettomiete

 Betriebskosten

 nicht umlagefähige Kosten

 Leerstandspuffer

 Reparaturrücklage

 monatlicher Netto-Cashflow

 jährlicher Netto-Cashflow

 Bruttorendite

 Nettorendite

 Eigenkapitalrendite

 DSCR / Schuldendienstdeckungsgrad

Risikokennzahlen

 Zins-Stress-Test

 Leerstand-Stress-Test

 Reparatur-Stress-Test

 Cashflow bei schlechterem Szenario

 Break-even-Miete

 maximal sinnvoller Kaufpreis bei Zielrendite

Annahmen-Seite

Es soll eine eigene Seite „Annahmen“ geben, auf der ich zentrale Werte einstellen kann:

 Eigenkapital

 Zinssatz

 Kreditlaufzeit

 Tilgungsmodell

 Kaufnebenkosten mit Makler

 Kaufnebenkosten ohne Makler

 Maklerprovision

 Grunderwerbsteuer

 Grundbucheintragung

 Vertragserrichtung

 Pfandrechtskosten

 Sanierungsbudget

 Einrichtungskosten

 Reserve

 Leerstandspuffer in %

 Reparaturrücklage pro m²

 nicht umlagefähige Kosten pro Monat

 Ziel-Bruttorendite

 Ziel-Nettorendite

 maximal akzeptierter negativer Cashflow

 Ziel-Score

Alle bestehenden und neuen Immobilien sollen sich automatisch aktualisieren, wenn ich die Annahmen ändere.

Scoring-System

Die App soll jeder Immobilie einen Investment-Score von 0 bis 100 geben.

Gewichtung:

 Lage: 25 Punkte

 Zahlen / Rendite: 25 Punkte

 Vermietbarkeit: 20 Punkte

 Zustand / Sanierungsrisiko: 15 Punkte

 Rechtliches / Mietrecht: 10 Punkte

 Wiederverkaufbarkeit: 5 Punkte

Die App soll daraus eine Entscheidung ableiten:

 85–100: Sehr interessant

 70–84: Interessant

 55–69: Nur bei Preisverhandlung

 unter 55: Aussortieren

Zusätzlich soll es Ampelfarben geben:

 Grün = attraktiv

 Gelb = prüfen

 Rot = kritisch

Mietschätzung

Wenn keine Miete angegeben ist, soll die App eine realistische Mietschätzung ermöglichen.

Bitte erstelle dafür ein Feld:

„geschätzte Monatsmiete netto“

Dieses Feld kann entweder manuell eingetragen werden oder von der KI grob vorgeschlagen werden basierend auf:

 Bezirk

 Lage

 Wohnfläche

 Zustand

 Neubau/Altbau

 Balkon/Terrasse

 Zimmeranzahl

Die KI darf die Miete nur als Schätzung markieren. Es soll klar sichtbar sein:

„Miete geschätzt – bitte prüfen“

Mietrecht / Risiko

Die App soll ein Feld enthalten:

„Mietrechtliche Einschätzung“

Optionen:

 Neubau / freie Vermietung wahrscheinlich

 Teilanwendung MRG möglich

 Altbau / Richtwertmietzins möglich

 unklar – rechtlich prüfen

 nicht geeignet

Die App soll hier keine endgültige Rechtsberatung geben, sondern nur eine Risiko-Einschätzung aus den vorhandenen Daten ableiten.

Wenn Baujahr, Zustand oder Mietrecht unklar sind, soll die App automatisch eine Warnung anzeigen:

„Mietrecht vor Kauf prüfen.“

Immobilien-Datenbank

Es soll eine Datenbank-Ansicht geben, in der alle analysierten Immobilien gespeichert werden.

Spalten:

 Status

 Score

 Entscheidung

 Link

 Titel

 Bezirk

 Kaufpreis

 Fläche

 Preis/m²

 Zimmer

 Baujahr

 Betriebskosten

 geschätzte Miete

 Bruttorendite

 Nettorendite

 Cashflow

 LTV

 Mietrecht

 Zustand

 Fehlende Daten

 Notizen

 Datum hinzugefügt

Status-Optionen:

 Neu

 Prüfen

 Interessant

 Besichtigung

 Angebot

 Abgelehnt

 Gekauft

Dashboard

Erstelle ein modernes Dashboard mit:

Obere KPI-Karten

 Anzahl analysierter Immobilien

 Durchschnittlicher Score

 Beste Immobilie

 Durchschnittliche Bruttorendite

 Durchschnittlicher Cashflow

 Anzahl interessanter Objekte

 Anzahl Objekte mit fehlenden Daten

Tabellen

 Top 10 Immobilien nach Score

 Top 10 nach Cashflow

 Top 10 nach Bruttorendite

 Objekte mit Warnungen / fehlenden Daten

Visualisierungen

 Score-Verteilung

 Kaufpreis vs. Rendite

 Cashflow je Objekt

 Preis pro m² nach Bezirk

 Status-Pipeline

Detailseite pro Immobilie

Jede Immobilie soll eine eigene Detailseite haben mit:

Objektdaten

 Titel

 Link zum Originalinserat

 Bilder, falls verfügbar

 Standort / Bezirk

 Beschreibung

 Ausstattung

 Zustand

 Energieinformationen

Investment Summary

 Score

 Entscheidung

 Kaufpreis

 Gesamtkosten

 Kreditbetrag

 Monatsrate

 Miete

 Cashflow

 Bruttorendite

 Nettorendite

 Eigenkapitalrendite

Risikoanalyse

 Mietrechtliches Risiko

 Leerstandsrisiko

 Sanierungsrisiko

 Finanzierungsrisiko

 fehlende Daten

 offene Fragen für Makler/Besichtigung

Notizen

Der User soll eigene Notizen ergänzen können.

Besichtigungs-Checkliste

Erstelle eine Seite oder einen Bereich mit Checkliste:

 Zustand Fenster

 Zustand Böden

 Bad

 Küche

 Elektrik

 Heizung

 Feuchtigkeit

 Lärm

 Licht

 Lift

 Keller

 Fahrradraum

 Stiegenhaus

 Dach

 Fassade

 Rücklage der Eigentümergemeinschaft

 Protokolle Eigentümerversammlung

 geplante Sanierungen

 Vermietbarkeit

 Umgebung

 Öffi-Anbindung

Man soll Punkte abhaken und Notizen ergänzen können.

Import aus meiner Excel-Datei

Ich lade eine Excel-Datei hoch. Bitte analysiere die Datei und übernimm:

 Tabs

 Spaltenstruktur

 Formeln

 Annahmen

 Scoring-Logik

 Dashboard-Idee

 Begriffe

 Bewertungslogik

Die Web-App soll die Excel-Datei nicht nur anzeigen, sondern als Grundlage für eine bessere digitale Version nutzen.

Design

Bitte baue die App modern, clean und professionell.

Stil:

 hochwertiges Investment-Dashboard

 klare Tabellen

 moderne Karten

 ruhige Farben

 Ampelsystem für Bewertungen

 gute mobile Ansicht

 Desktop zuerst

 seriös, nicht verspielt

Navigation:

 Dashboard

 Link analysieren

 Immobilien-Datenbank

 Immobilie Detailansicht

 Annahmen

 Besichtigung

 Einstellungen

Technische Anforderungen

Bitte baue die App so, dass sie später leicht erweitert werden kann.

Wichtig:

 Datenbank für Immobilien

 Datenbank für Annahmen

 Datenbank für Besichtigungsnotizen

 eindeutige Objekt-ID pro Link

 Duplikatprüfung: gleicher Link darf nicht doppelt gespeichert werden

 Status je Objekt

 fehlende Daten markieren

 manuelle Bearbeitung aller Werte ermöglichen

 Export nach CSV/Excel ermöglichen

 optional später Google-Sheets-Sync ermöglichen

Edge Cases

Wenn ein Link nicht ausgelesen werden kann:

 Fehlermeldung anzeigen

 User soll Inseratstext manuell einfügen können

 User soll Daten manuell ergänzen können

 Objekt kann trotzdem gespeichert werden

 Status: „Daten unvollständig“

Wenn ein Objekt doppelt eingefügt wird:

 Hinweis anzeigen: „Dieses Objekt existiert bereits“

 Link zur bestehenden Detailseite anzeigen

Wenn wichtige Daten fehlen:

 Warnung anzeigen

 Objekt trotzdem speichern

 Score mit reduzierter Sicherheit berechnen

Zielergebnis

Am Ende möchte ich eine App, in der ich nur einen Immobilien-Link einfüge und danach automatisch sehe:

 Was kostet die Immobilie wirklich?

 Wie hoch ist der Kreditbedarf?

 Wie hoch wäre die monatliche Rate?

 Welche Miete müsste erzielt werden?

 Wie hoch sind Rendite und Cashflow?

 Wie gut ist die Immobilie im Vergleich zu anderen?

 Ist das Objekt interessant oder sollte ich es aussortieren?

 Welche Daten fehlen noch?

 Welche Fragen muss ich vor Kauf klären?

Bitte erstelle daraus eine funktionsfähige erste Version der App mit Seed-Daten und nutze meine hochgeladene Excel-Datei als Grundlage.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kaufma.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0b41fa67-2b89-4ed5-b794-1a44c3f28cfd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
