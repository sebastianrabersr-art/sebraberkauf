export type RatgeberCategory =
  | "Immobilienkauf"
  | "Kaufnebenkosten"
  | "Finanzierung"
  | "Rendite & Cashflow"
  | "Mietrecht"
  | "Österreich"
  | "Deutschland"
  | "Checklisten";

export const RATGEBER_CATEGORIES: RatgeberCategory[] = [
  "Immobilienkauf",
  "Kaufnebenkosten",
  "Finanzierung",
  "Rendite & Cashflow",
  "Mietrecht",
  "Österreich",
  "Deutschland",
  "Checklisten",
];

export type ArticleSection = {
  id: string;
  heading: string;
  body: string;
};

export type ArticleFaq = {
  q: string;
  a: string;
};

export type RatgeberArticle = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  category: RatgeberCategory;
  tags?: string[];
  publishedAt: string; // ISO date
  updatedAt?: string;
  readingMinutes: number;
  intro: string;
  sections: ArticleSection[];
  faq?: ArticleFaq[];
  legalDisclaimer?: boolean;
  fullContent?: string; // Full article text in markdown-like format
};


export const RATGEBER_ARTICLES: RatgeberArticle[] = [
  {
    slug: "kaufnebenkosten-immobilienkauf",
    title: "Kaufnebenkosten beim Immobilienkauf einfach erklärt",
    seoTitle: "Kaufnebenkosten beim Immobilienkauf: Alle Posten im Überblick",
    description:
      "Grunderwerbsteuer, Notar, Makler, Grundbuch: So setzen sich die Kaufnebenkosten beim Immobilienkauf zusammen und so viel solltest du einplanen.",
    category: "Kaufnebenkosten",
    tags: ["Kaufnebenkosten", "Immobilienkauf", "Grunderwerbsteuer"],
    publishedAt: "2026-06-10",
    readingMinutes: 6,
    intro:
      "Beim Kauf einer Immobilie kommen zum Kaufpreis weitere Kosten hinzu, die schnell 8 bis 12 Prozent ausmachen können. Wer sie nicht einplant, finanziert sich schnell aus dem Tritt. Dieser Ratgeber zeigt die wichtigsten Posten und gibt eine grobe Hausnummer für Österreich und Deutschland.",
    sections: [
      {
        id: "ueberblick",
        heading: "Welche Kaufnebenkosten gibt es?",
        body: "Typisch sind Grunderwerbsteuer, Grundbucheintragung, Notar- bzw. Vertragserrichtungskosten, Maklerprovision und gegebenenfalls Finanzierungsnebenkosten. Je nach Land und Bundesland fallen weitere kleine Posten an.",
      },
      {
        id: "hausnummer",
        heading: "Wie hoch sind die Kaufnebenkosten typischerweise?",
        body: "Als grobe Hausnummer kannst du in Österreich mit rund 9–11 % und in Deutschland mit rund 8–12 % des Kaufpreises rechnen. Die genaue Höhe hängt vom Bundesland, der Maklersituation und deiner Finanzierung ab.",
      },
      {
        id: "finanzierung",
        heading: "Kaufnebenkosten richtig finanzieren",
        body: "Viele Banken finanzieren die Nebenkosten nicht mit. Plane sie als Eigenmittel ein. In unserem Rechner kannst du Kaufpreis und Nebenkosten direkt zusammen kalkulieren.",
      },
    ],
    faq: [
      {
        q: "Sind Kaufnebenkosten verhandelbar?",
        a: "Teilweise ja: Maklerprovisionen sind oft verhandelbar, Steuern und Gebühren in der Regel nicht.",
      },
      {
        q: "Zählen Renovierungskosten zu den Nebenkosten?",
        a: "Nein, Renovierungs- und Sanierungskosten sind separat zu kalkulieren, gehören aber in eine ehrliche Gesamtrechnung.",
      },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "bruttorendite-vs-nettorendite",
    title: "Bruttorendite vs. Nettorendite: der einfache Unterschied",
    seoTitle: "Bruttorendite vs. Nettorendite: Was ist der Unterschied?",
    description:
      "Brutto- und Nettorendite werden oft verwechselt. So berechnest du beide Kennzahlen richtig und erkennst, wann eine Immobilie wirklich rentabel ist.",
    category: "Rendite & Cashflow",
    tags: ["Rendite", "Kennzahlen"],
    publishedAt: "2026-06-10",
    readingMinutes: 5,
    intro:
      "Wenn Inserate mit „6 % Rendite“ werben, ist meist die Bruttorendite gemeint. Für eine ehrliche Bewertung brauchst du aber die Nettorendite. Hier ist der Unterschied – mit einfachen Formeln.",
    sections: [
      {
        id: "brutto",
        heading: "Bruttorendite: schnelle Hausnummer",
        body: "Bruttorendite = Jahres-Kaltmiete ÷ Kaufpreis × 100. Sie ignoriert Nebenkosten, Instandhaltung und Leerstand. Gut für einen ersten Vergleich, nicht für die Investitionsentscheidung.",
      },
      {
        id: "netto",
        heading: "Nettorendite: die ehrlichere Zahl",
        body: "Nettorendite = (Jahres-Kaltmiete − nicht umlagefähige Kosten) ÷ (Kaufpreis + Kaufnebenkosten) × 100. Sie berücksichtigt Verwaltung, Instandhaltung, Mietausfall und die echten Anschaffungskosten.",
      },
      {
        id: "praxis",
        heading: "Welche Zahl ist „gut“?",
        body: "Pauschal lässt sich das nicht sagen. In A-Lagen sind 2–3 % Nettorendite normal, in B/C-Lagen oft 4–6 %. Wichtig ist, dass die Zahl im Verhältnis zum Risiko steht.",
      },
    ],
    faq: [
      {
        q: "Was ist der Kapitalisierungssatz?",
        a: "Synonym für Nettorendite – v. a. im professionellen Investmentkontext.",
      },
    ],
  },
  {
    slug: "cashflow-bei-immobilien",
    title: "Cashflow bei Immobilien: Was Käufer wissen müssen",
    seoTitle: "Cashflow bei Immobilien: einfach erklärt mit Beispiel",
    description:
      "Cashflow entscheidet, ob deine Immobilie monatlich Geld bringt oder kostet. So berechnest du ihn realistisch – inklusive Tilgung und Rücklagen.",
    category: "Rendite & Cashflow",
    tags: ["Cashflow", "Vermietung"],
    publishedAt: "2026-06-10",
    readingMinutes: 6,
    intro:
      "Eine Immobilie kann auf dem Papier rentabel aussehen und trotzdem monatlich Geld kosten. Der Cashflow zeigt dir, was wirklich übrig bleibt.",
    sections: [
      {
        id: "definition",
        heading: "Was ist Cashflow?",
        body: "Cashflow = Mieteinnahmen − alle laufenden Ausgaben (Zinsen, Tilgung, Hausverwaltung, Instandhaltung, Steuern, Versicherungen, Leerstand).",
      },
      {
        id: "berechnung",
        heading: "So rechnest du realistisch",
        body: "Plane Rücklagen für Instandhaltung (ca. 1 €/m²/Monat), Mietausfall (3–5 %) und Verwaltung. Setze keine Wunschmiete an, sondern die realistisch erzielbare Marktmiete.",
      },
      {
        id: "ziele",
        heading: "Positiver vs. negativer Cashflow",
        body: "Positiver Cashflow stärkt deine Bonität und ermöglicht weitere Käufe. Negativer Cashflow ist nicht per se schlecht – aber nur tragbar, wenn dein Einkommen ihn dauerhaft abdeckt.",
      },
    ],
    faq: [
      {
        q: "Zählt Tilgung zum Cashflow?",
        a: "Ja, weil sie monatlich abfließt. Wirtschaftlich ist Tilgung aber Vermögensaufbau – manche Investoren rechnen sie separat aus.",
      },
    ],
  },
  {
    slug: "wohnung-kaufen-zur-vermietung",
    title: "Wohnung kaufen zur Vermietung: Rechnet sich das?",
    seoTitle: "Wohnung kaufen zur Vermietung: Lohnt sich das 2026?",
    description:
      "Welche Faktoren entscheiden, ob sich eine Wohnung als Kapitalanlage rechnet? Lage, Miete, Finanzierung und Steuern im Überblick.",
    category: "Immobilienkauf",
    tags: ["Kapitalanlage", "Vermietung"],
    publishedAt: "2026-06-10",
    readingMinutes: 7,
    intro:
      "Eine Eigentumswohnung zur Vermietung kann ein solides Investment sein – oder ein teures Hobby. Entscheidend sind ein paar wenige Kennzahlen und eine ehrliche Kalkulation.",
    sections: [
      {
        id: "lage",
        heading: "Lage: der wichtigste Hebel",
        body: "Mikro- und Makrolage bestimmen Mietniveau, Leerstand und Wertentwicklung. Eine gute Lage in einer mittelgroßen Stadt schlägt oft eine schlechte Lage in der Top-Stadt.",
      },
      {
        id: "kennzahlen",
        heading: "Welche Kennzahlen zählen?",
        body: "Bruttorendite als schnelle Hausnummer, Nettorendite für die Realität, Cashflow für deine Liquidität. Dazu Vervielfältiger und Eigenkapitalrendite.",
      },
      {
        id: "risiken",
        heading: "Risiken, die oft unterschätzt werden",
        body: "Mietrecht, Leerstand, Sonderumlagen, steigende Zinsen bei Anschlussfinanzierung. Plane Puffer ein.",
      },
    ],
    faq: [
      {
        q: "Wie viel Eigenkapital brauche ich?",
        a: "Faustregel: mindestens die Kaufnebenkosten plus 10–20 % des Kaufpreises.",
      },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "immobilie-oesterreich-kaufen",
    title: "Immobilie in Österreich kaufen: Kosten und Risiken",
    seoTitle: "Immobilie in Österreich kaufen: Nebenkosten & Risiken",
    description:
      "Grunderwerbsteuer, Eintragungsgebühr, Notar, Makler: Diese Kosten und mietrechtlichen Risiken solltest du in Österreich kennen.",
    category: "Österreich",
    tags: ["Österreich", "Kaufnebenkosten", "Mietrecht"],
    publishedAt: "2026-06-10",
    readingMinutes: 7,
    intro:
      "Der Immobilienkauf in Österreich folgt klaren Regeln – aber die mietrechtliche Situation (MRG-Voll- vs. Teilanwendung) wird oft unterschätzt. Hier sind die wichtigsten Punkte.",
    sections: [
      {
        id: "kosten",
        heading: "Typische Kaufnebenkosten in Österreich",
        body: "Grunderwerbsteuer 3,5 %, Eintragungsgebühr 1,1 %, Vertragserrichtung ca. 1–3 %, Maklerprovision (seit 2023 Bestellerprinzip) und Finanzierungsnebenkosten. Summe oft 9–11 %.",
      },
      {
        id: "mietrecht",
        heading: "Mietrecht: das große Thema",
        body: "Altbau vor 1953 fällt oft in die MRG-Vollanwendung mit Richtwertmiete – das kann die erzielbare Miete deutlich begrenzen. Vor dem Kauf unbedingt prüfen.",
      },
      {
        id: "checkliste",
        heading: "Vor dem Kauf prüfen",
        body: "Grundbuchauszug, Energieausweis, Bauzustand, Hausordnung, Rücklagen der WEG, anstehende Sanierungen.",
      },
    ],
    faq: [
      {
        q: "Was ist Richtwertmiete?",
        a: "Eine gesetzlich begrenzte Miethöhe pro m² für bestimmte Altbauten – je Bundesland unterschiedlich.",
      },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "immobilie-deutschland-kaufen",
    title: "Immobilie in Deutschland kaufen: Kosten und Finanzierung",
    seoTitle: "Immobilie in Deutschland kaufen: Nebenkosten & Finanzierung",
    description:
      "Grunderwerbsteuer je Bundesland, Notar, Grundbuch, Makler: So setzen sich die Kaufkosten in Deutschland zusammen – plus Finanzierungstipps.",
    category: "Deutschland",
    tags: ["Deutschland", "Kaufnebenkosten", "Finanzierung"],
    publishedAt: "2026-06-10",
    readingMinutes: 7,
    intro:
      "Beim Immobilienkauf in Deutschland variieren die Nebenkosten stark nach Bundesland. Wer Grunderwerbsteuer und Maklerregeln kennt, kann besser kalkulieren.",
    sections: [
      {
        id: "kosten",
        heading: "Typische Kaufnebenkosten in Deutschland",
        body: "Grunderwerbsteuer 3,5–6,5 % je Bundesland, Notar ca. 1,5 %, Grundbuch ca. 0,5 %, Makler bis zu 3,57 % (geteilt seit 2020). Summe 8–12 %.",
      },
      {
        id: "finanzierung",
        heading: "Finanzierung: Zinsbindung & Tilgung",
        body: "Längere Zinsbindung gibt Planungssicherheit, anfänglich höhere Tilgung verkürzt die Laufzeit deutlich. Sondertilgungen vereinbaren.",
      },
      {
        id: "foerderung",
        heading: "Förderung nicht vergessen",
        body: "KfW-Programme, regionale Förderungen und energetische Sanierungszuschüsse können die Gesamtkosten spürbar senken.",
      },
    ],
    faq: [
      {
        q: "Welches Bundesland hat die niedrigste Grunderwerbsteuer?",
        a: "Bayern und Sachsen mit jeweils 3,5 %.",
      },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "immobilien-rendite-berechnen",
    title: "Immobilien Rendite berechnen: Formel, Beispiele und typische Fehler",
    seoTitle: "Immobilien Rendite berechnen: Formel, Beispiele & Rechner",
    description: "Immobilien Rendite berechnen leicht gemacht. Erfahre, welche Formeln wichtig sind, welche Rendite als gut gilt und wie du mit dem Rendite-Rechner von kaufma Immobilien schneller vergleichen kannst.",
    category: "Rendite & Cashflow",
    tags: ["Rendite", "Bruttorendite", "Nettorendite", "Kennzahlen", "Cashflow"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Wer eine Immobilie als Kapitalanlage kaufen möchte, stellt sich früher oder später eine entscheidende Frage: Lohnt sich dieses Investment überhaupt? Genau hier kommt die Rendite ins Spiel. Sie gehört zu den wichtigsten Kennzahlen bei der Analyse von Immobilien und hilft dabei, verschiedene Objekte objektiv miteinander zu vergleichen.",
    sections: [
      {
        id: "was-ist-rendite",
        heading: "Was bedeutet Rendite bei Immobilien?",
        body: "Die Rendite beschreibt das Verhältnis zwischen den erzielten Einnahmen und dem eingesetzten Kapital. Vereinfacht beantwortet sie die Frage: Wie viel Prozent meines eingesetzten Geldes erhalte ich jedes Jahr zurück? Je höher die Rendite, desto effizienter arbeitet das Kapital. Die Rendite eignet sich besonders für den Vergleich von Eigentumswohnungen, Mehrfamilienhäusern, Anlegerwohnungen und Gewerbeimmobilien.",
      },
      {
        id: "bruttorendite",
        heading: "Bruttorendite berechnen",
        body: "Die Bruttorendite ist die einfachste Form der Renditeberechnung. Formel: Bruttorendite = Jahresnettokaltmiete ÷ Kaufpreis × 100. Beispiel: Kaufpreis 300.000 €, monatliche Kaltmiete 1.250 €, jährliche Mieteinnahmen 15.000 € → Bruttorendite 5 %. Die Immobilie erwirtschaftet somit eine jährliche Bruttorendite von 5 %.",
      },
      {
        id: "fehler-bruttorendite",
        heading: "Warum die Bruttorendite allein nicht ausreicht",
        body: "Viele Einsteiger machen den Fehler, ausschließlich die Bruttorendite zu betrachten. Dabei werden wichtige Kosten ignoriert: Grunderwerbsteuer, Notarkosten, Maklergebühren, Rücklagen, Verwaltungskosten, Leerstand und Reparaturen. Dadurch erscheint eine Immobilie häufig attraktiver, als sie tatsächlich ist.",
      },
      {
        id: "nettorendite",
        heading: "Nettorendite berechnen",
        body: "Die Nettorendite liefert ein deutlich realistischeres Bild. Hier werden sämtliche Kaufnebenkosten und laufenden Ausgaben berücksichtigt: Kaufpreis, Grunderwerbsteuer, Maklerprovision, Notarkosten, Grundbuchkosten, nicht umlagefähige Betriebskosten und Instandhaltungsrücklagen. Die Nettorendite liegt deshalb fast immer unter der Bruttorendite.",
      },
      {
        id: "gute-rendite",
        heading: "Welche Rendite ist gut?",
        body: "Eine pauschale Antwort gibt es nicht. Als grobe Orientierung gelten: unter 3 % niedrig, 3–4 % durchschnittlich, 4–6 % attraktiv, über 6 % sehr attraktiv. Die tatsächliche Qualität einer Immobilie hängt jedoch immer vom Standort, der Finanzierung und dem Risiko ab.",
      },
      {
        id: "fehler",
        heading: "Die häufigsten Fehler bei der Renditeberechnung",
        body: "Kaufnebenkosten vergessen: Viele Anleger rechnen nur mit dem Kaufpreis und ignorieren die Nebenkosten – dadurch wird die Rendite überschätzt. Leerstand nicht berücksichtigen: Nicht jede Wohnung ist dauerhaft vermietet. Rücklagen unterschätzen: Langfristig entstehen Kosten für Heizung, Dach, Fenster, Fassade und Renovierungen.",
      },
      {
        id: "rendite-und-cashflow",
        heading: "Rendite und Cashflow gehören zusammen",
        body: "Eine hohe Rendite bedeutet nicht automatisch, dass eine Immobilie monatlich Geld erwirtschaftet. Durch hohe Finanzierungskosten kann trotz guter Rendite ein negativer Cashflow entstehen. Deshalb sollten Investoren immer beide Kennzahlen betrachten: Rendite und Cashflow.",
      },
    ],
    faq: [
      {
        q: "Was ist eine gute Rendite bei Immobilien?",
        a: "Viele Investoren betrachten Werte zwischen 4 und 6 Prozent als attraktiv. Die tatsächliche Qualität hängt aber immer von Standort, Risiko und Finanzierung ab.",
      },
      {
        q: "Ist die Bruttorendite ausreichend für eine Investitionsentscheidung?",
        a: "Nein. Für eine fundierte Entscheidung sollte immer die Nettorendite betrachtet werden, da sie Nebenkosten und laufende Ausgaben berücksichtigt.",
      },
      {
        q: "Welche Kosten müssen bei der Renditeberechnung berücksichtigt werden?",
        a: "Neben dem Kaufpreis spielen Grunderwerbsteuer, Maklerkosten, Notarkosten, Rücklagen, Leerstand und Verwaltungskosten eine wichtige Rolle.",
      },
      {
        q: "Kann eine Immobilie eine hohe Rendite und trotzdem einen negativen Cashflow haben?",
        a: "Ja. Hohe Finanzierungskosten können dazu führen, dass monatlich Geld zugeschossen werden muss, obwohl die Rendite auf dem Papier attraktiv aussieht.",
      },
      {
        q: "Warum sollte man Immobilien vergleichen?",
        a: "Erst der Vergleich verschiedener Objekte ermöglicht eine objektive Investitionsentscheidung und zeigt, welches Objekt das beste Verhältnis von Rendite zu Risiko bietet.",
      },
    ],
    legalDisclaimer: true,
    fullContent: `## Warum die Rendite bei Immobilien so wichtig ist

Wer eine Immobilie als Kapitalanlage kaufen möchte, stellt sich früher oder später eine entscheidende Frage:

**Lohnt sich dieses Investment überhaupt?**

Genau hier kommt die Rendite ins Spiel. Sie gehört zu den wichtigsten Kennzahlen bei der Analyse von Immobilien und hilft dabei, verschiedene Objekte objektiv miteinander zu vergleichen.

Viele Anleger konzentrieren sich ausschließlich auf Lage, Kaufpreis oder Bauchgefühl. Doch diese Faktoren reichen nicht aus. Erst die Rendite zeigt, wie profitabel eine Immobilie tatsächlich sein kann.

Eine Wohnung mit einem günstigen Kaufpreis muss nicht automatisch ein gutes Investment sein. Umgekehrt kann eine teurere Immobilie aufgrund höherer Mieteinnahmen deutlich attraktiver sein.

## Was bedeutet Rendite bei Immobilien?

Die Rendite beschreibt das Verhältnis zwischen den erzielten Einnahmen und dem eingesetzten Kapital.

Vereinfacht beantwortet sie die Frage: Wie viel Prozent meines eingesetzten Geldes erhalte ich jedes Jahr zurück?

Je höher die Rendite, desto effizienter arbeitet das Kapital.

Die Rendite eignet sich besonders für:

- Eigentumswohnungen
- Mehrfamilienhäuser
- Anlegerwohnungen
- Gewerbeimmobilien
- den Vergleich verschiedener Immobilien

## Bruttorendite berechnen

Die Bruttorendite ist die einfachste Form der Renditeberechnung.

### Formel

Bruttorendite = Jahresnettokaltmiete ÷ Kaufpreis × 100

### Beispiel

Kaufpreis: 300.000 €

Monatliche Kaltmiete: 1.250 €

Jährliche Mieteinnahmen: 15.000 €

Bruttorendite: 5 %

Die Immobilie erwirtschaftet somit eine jährliche Bruttorendite von 5 %.

## Warum die Bruttorendite allein nicht ausreicht

Viele Einsteiger machen den Fehler, ausschließlich die Bruttorendite zu betrachten.

Dabei werden wichtige Kosten ignoriert:

- Grunderwerbsteuer
- Notarkosten
- Maklergebühren
- Rücklagen
- Verwaltungskosten
- Leerstand
- Reparaturen

Dadurch erscheint eine Immobilie häufig attraktiver, als sie tatsächlich ist.

## Nettorendite berechnen

Die Nettorendite liefert ein deutlich realistischeres Bild. Hier werden sämtliche Kaufnebenkosten und laufenden Ausgaben berücksichtigt.

Dazu zählen:

- Kaufpreis
- Grunderwerbsteuer
- Maklerprovision
- Notarkosten
- Grundbuchkosten
- nicht umlagefähige Betriebskosten
- Instandhaltungsrücklagen

Die Nettorendite liegt deshalb fast immer unter der Bruttorendite.

## Welche Rendite ist gut?

Eine pauschale Antwort gibt es nicht. Als grobe Orientierung gelten jedoch folgende Werte:

- unter 3 % → niedrig
- 3–4 % → durchschnittlich
- 4–6 % → attraktiv
- über 6 % → sehr attraktiv

Die tatsächliche Qualität einer Immobilie hängt jedoch immer vom Standort, der Finanzierung und dem Risiko ab.

## Die häufigsten Fehler bei der Renditeberechnung

### Kaufnebenkosten vergessen

Viele Anleger rechnen nur mit dem Kaufpreis und ignorieren die Nebenkosten. Dadurch wird die Rendite überschätzt.

### Leerstand nicht berücksichtigen

Nicht jede Wohnung ist dauerhaft vermietet. Leerstand kann die tatsächliche Rendite deutlich reduzieren.

### Rücklagen unterschätzen

Langfristig entstehen Kosten für:

- Heizung
- Dach
- Fenster
- Fassade
- Renovierungen

Wer diese Ausgaben ignoriert, erhält unrealistisch hohe Ergebnisse.

## Rendite und Cashflow gehören zusammen

Eine hohe Rendite bedeutet nicht automatisch, dass eine Immobilie monatlich Geld erwirtschaftet.

Durch hohe Finanzierungskosten kann trotz guter Rendite ein negativer Cashflow entstehen.

Deshalb sollten Investoren immer beide Kennzahlen betrachten:

- Rendite
- Cashflow

## Rendite automatisch berechnen

Natürlich lassen sich sämtliche Berechnungen auch in Excel durchführen. Doch gerade bei mehreren Immobilien wird das schnell unübersichtlich.

Mit dem Rendite-Rechner von kaufma kannst du verschiedene Immobilien innerhalb weniger Sekunden analysieren und miteinander vergleichen.

Dabei werden unter anderem berücksichtigt:

- Kaufpreis
- Nebenkosten
- Finanzierung
- Mieteinnahmen
- Cashflow
- Rendite

Dadurch erhältst du ein wesentlich realistischeres Bild der Wirtschaftlichkeit.`,
  },
  {
    slug: "cashflow-immobilie-berechnen",
    title: "Cashflow Immobilie berechnen: Warum diese Kennzahl oft wichtiger ist als die Rendite",
    seoTitle: "Cashflow Immobilie berechnen: Formel, Beispiele & Rechner",
    description: "Cashflow bei Immobilien berechnen leicht gemacht. Erfahre anhand von Beispielen und einfachen Formeln, wie du den monatlichen Überschuss einer Immobilie ermittelst.",
    category: "Rendite & Cashflow",
    tags: ["Cashflow", "Rendite", "Kennzahlen"],
    publishedAt: "2026-06-18",
    readingMinutes: 8,
    intro: "Viele Anleger beschäftigen sich zuerst mit der Rendite. Doch erfahrene Investoren achten häufig auf eine andere Kennzahl: Den Cashflow. Er zeigt, ob eine Immobilie Monat für Monat Geld erwirtschaftet oder ob regelmäßig eigenes Geld zugeschossen werden muss.",
    sections: [
      { id: "definition", heading: "Was ist der Cashflow bei einer Immobilie?", body: "Der Cashflow beschreibt den monatlichen Geldüberschuss einer Immobilie. Mieteinnahmen minus sämtliche Ausgaben ergeben den Cashflow. Ist das Ergebnis positiv, erwirtschaftet die Immobilie jeden Monat Geld. Ist es negativ, muss zusätzlich eigenes Kapital eingebracht werden." },
      { id: "formel", heading: "Die Formel zur Berechnung des Cashflows", body: "Cashflow = Mieteinnahmen − Kreditrate − laufende Kosten. Zu den laufenden Kosten gehören: nicht umlagefähige Betriebskosten, Verwaltungskosten, Instandhaltungsrücklagen, Versicherungen, Leerstandspuffer und Reparaturen. Viele Anfänger vergessen einige dieser Positionen und überschätzen dadurch die Attraktivität einer Immobilie." },
      { id: "positiver-cashflow", heading: "Warum ein positiver Cashflow so attraktiv ist", body: "Ein positiver Cashflow bringt mehr finanzielle Sicherheit, ermöglicht schnelleren Vermögensaufbau und mehr Flexibilität. Jeder monatliche Überschuss kann für Rücklagen, weitere Immobilien, Sondertilgungen oder andere Investments verwendet werden." },
      { id: "fehler", heading: "Die häufigsten Fehler bei der Cashflow-Berechnung", body: "Leerstand ignorieren, Rücklagen vergessen und Kaufnebenkosten nicht berücksichtigen sind die häufigsten Fehler. Wer dauerhaft vermietete Wohnungen ohne Puffer annimmt, unterschätzt das tatsächliche Risiko erheblich." },
      { id: "rendite-cashflow", heading: "Rendite und Cashflow gemeinsam betrachten", body: "Was ist wichtiger – Rendite oder Cashflow? Die Antwort lautet: Beides. Die Rendite zeigt, wie effizient das Investment arbeitet. Der Cashflow zeigt, ob am Monatsende tatsächlich Geld übrig bleibt. Erst gemeinsam ergeben beide Kennzahlen ein vollständiges Bild." },
    ],
    faq: [
      { q: "Was ist ein guter Cashflow bei Immobilien?", a: "Viele Anleger streben einen positiven Cashflow zwischen 100 und 300 Euro pro Monat an." },
      { q: "Kann eine Immobilie trotz hoher Rendite einen negativen Cashflow haben?", a: "Ja. Hohe Finanzierungskosten können dazu führen, dass monatlich zusätzliches Geld eingebracht werden muss." },
      { q: "Zählt Tilgung zum Cashflow?", a: "Ja, weil sie monatlich abfließt. Wirtschaftlich ist Tilgung aber Vermögensaufbau – manche Investoren rechnen sie separat aus." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "kaufpreisfaktor-berechnen",
    title: "Kaufpreisfaktor berechnen: Wann ist eine Immobilie wirklich günstig?",
    seoTitle: "Kaufpreisfaktor berechnen: Formel, Beispiele & Orientierungswerte",
    description: "Kaufpreisfaktor berechnen leicht gemacht. Erfahre, welche Werte als gut gelten, welche Fehler viele Anleger machen und warum der Kaufpreis allein wenig über die Qualität einer Immobilie aussagt.",
    category: "Rendite & Cashflow",
    tags: ["Kaufpreisfaktor", "Vervielfältiger", "Kennzahlen"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Der Kaufpreis allein sagt wenig darüber aus, ob eine Immobilie tatsächlich attraktiv ist. Eine teure Wohnung kann ein deutlich besseres Investment sein als eine günstige. Genau deshalb nutzen erfahrene Investoren den Kaufpreisfaktor.",
    sections: [
      { id: "definition", heading: "Was ist der Kaufpreisfaktor?", body: "Der Kaufpreisfaktor gibt an, nach wie vielen Jahren sich der Kaufpreis einer Immobilie theoretisch über die Mieteinnahmen amortisieren würde. Er wird auch als Faktor, Vervielfältiger oder Multiplikator bezeichnet. Je niedriger der Wert, desto attraktiver erscheint die Immobilie zunächst." },
      { id: "formel", heading: "Kaufpreisfaktor berechnen: Die Formel", body: "Kaufpreisfaktor = Kaufpreis ÷ Jahresnettokaltmiete. Beispiel: Kaufpreis 300.000 € ÷ Jahresnettokaltmiete 15.000 € = Kaufpreisfaktor 20. Das bedeutet: Die Immobilie würde theoretisch 20 Jahre benötigen, um den Kaufpreis durch Mieteinnahmen wieder einzuspielen." },
      { id: "orientierung", heading: "Welche Werte gelten als gut?", body: "Als grobe Orientierung gilt: unter 18 sehr attraktiv, 18–22 gut, 22–28 durchschnittlich, 28–35 eher teuer, über 35 sehr teuer. Der Standort spielt dabei eine entscheidende Rolle – in München können Faktoren von 30 noch üblich sein." },
      { id: "grenzen", heading: "Warum der Kaufpreisfaktor allein nicht ausreicht", body: "Der Kaufpreisfaktor berücksichtigt nicht: Kaufnebenkosten, Zinssatz, Tilgung, Leerstand, Rücklagen, Verwaltungskosten und Instandhaltung. Deshalb kann eine Immobilie trotz gutem Kaufpreisfaktor ein schlechtes Investment sein." },
    ],
    faq: [
      { q: "Was ist ein guter Kaufpreisfaktor?", a: "Viele Investoren betrachten Werte zwischen 18 und 22 als attraktiv." },
      { q: "Ist ein niedriger Kaufpreisfaktor immer besser?", a: "Nein. Auch Lage, Finanzierung und zukünftige Entwicklungen spielen eine wichtige Rolle." },
      { q: "Welche Miete wird für die Berechnung verwendet?", a: "Für die Berechnung wird die Jahresnettokaltmiete verwendet." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "immobilie-bewerten-kennzahlen",
    title: "Immobilie bewerten: Die wichtigsten Kennzahlen für Privatinvestoren",
    seoTitle: "Immobilie bewerten: Kennzahlen, Rendite & Cashflow richtig nutzen",
    description: "Eine Immobilie bewerten ist mehr als nur den Kaufpreis zu vergleichen. Erfahre, welche Kennzahlen wirklich wichtig sind und wie du Immobilien objektiv analysieren kannst.",
    category: "Immobilienkauf",
    tags: ["Bewertung", "Kennzahlen", "Rendite", "Cashflow"],
    publishedAt: "2026-06-18",
    readingMinutes: 8,
    intro: "Während Käufer häufig nach Gefühl entscheiden, versuchen Investoren, Immobilien möglichst objektiv zu bewerten. Erst die Analyse mehrerer Kennzahlen ermöglicht eine fundierte Entscheidung.",
    sections: [
      { id: "kaufpreis", heading: "Warum der Kaufpreis allein nicht ausreicht", body: "Eine Immobilie kann günstig sein und trotzdem ein schlechtes Investment darstellen. Oder teuer sein und trotzdem hervorragende Erträge liefern. Entscheidend ist deshalb nicht der Kaufpreis allein, sondern die Wirtschaftlichkeit." },
      { id: "kennzahlen", heading: "Die wichtigsten Kennzahlen im Überblick", body: "Professionelle Investoren betrachten selten nur eine einzige Zahl. Sie kombinieren Kaufpreisfaktor, Rendite, Cashflow, Kaufnebenkosten, Eigenkapitalbedarf, Finanzierungskosten, Rücklagen und Leerstandsrisiko. Erst das Zusammenspiel dieser Faktoren ergibt ein vollständiges Bild." },
      { id: "praxis", heading: "Ein Beispiel aus der Praxis", body: "Eine günstigere Wohnung mit niedrigen Mieteinnahmen kann langfristig weniger attraktiv sein als eine teurere mit deutlich besseren Erträgen. Kaufpreisfaktor, Rendite und Cashflow zusammen zeigen das vollständige Bild einer Immobilie." },
      { id: "fehler", heading: "Die häufigsten Fehler bei der Immobilienbewertung", body: "Nur auf die Bilder achten, die Finanzierung unterschätzen, Kaufnebenkosten vergessen, Rücklagen ignorieren und nur auf die Rendite schauen – diese Fehler führen häufig zu teuren Fehlinvestitionen." },
    ],
    faq: [
      { q: "Welche Kennzahl ist bei Immobilien am wichtigsten?", a: "Es gibt keine einzelne Kennzahl. Professionelle Investoren betrachten immer mehrere Faktoren gleichzeitig." },
      { q: "Was ist wichtiger: Cashflow oder Rendite?", a: "Beide Kennzahlen ergänzen sich und sollten gemeinsam betrachtet werden." },
      { q: "Kann eine teure Immobilie ein besseres Investment sein?", a: "Ja. Entscheidend ist nicht der Kaufpreis, sondern die Wirtschaftlichkeit." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "mietrendite-berechnen",
    title: "Mietrendite berechnen: Formel, Beispiele und typische Fehler",
    seoTitle: "Mietrendite berechnen: Formel & Rechner für Immobilien",
    description: "Mietrendite berechnen leicht gemacht. Erfahre, wie du die Rentabilität einer Immobilie bewertest, welche Werte als gut gelten und warum die Mietrendite allein noch keine Kaufentscheidung rechtfertigt.",
    category: "Rendite & Cashflow",
    tags: ["Mietrendite", "Rendite", "Kennzahlen"],
    publishedAt: "2026-06-18",
    readingMinutes: 6,
    intro: "Nicht der Kaufpreis entscheidet darüber, ob ein Investment attraktiv ist. Entscheidend ist, wie viel Ertrag die Immobilie erwirtschaftet. Und genau deshalb gehört die Mietrendite zu den wichtigsten Kennzahlen bei der Immobilienbewertung.",
    sections: [
      { id: "definition", heading: "Was ist die Mietrendite?", body: "Die Mietrendite zeigt, wie viel Prozent des Kaufpreises durch die jährlichen Mieteinnahmen erwirtschaftet werden. Bruttomietrendite = Jahresnettokaltmiete ÷ Kaufpreis × 100. Sie eignet sich für einen ersten Vergleich verschiedener Objekte." },
      { id: "orientierung", heading: "Welche Mietrendite ist gut?", body: "Als grobe Orientierung: unter 3 % niedrig, 3–4 % durchschnittlich, 4–6 % attraktiv, über 6 % sehr attraktiv. In Großstädten wie München oder Wien liegen die Renditen häufig niedriger als in kleineren Städten." },
      { id: "brutto-netto", heading: "Bruttomietrendite und Nettomietrendite", body: "Die Bruttomietrendite eignet sich für einen ersten Vergleich. Für eine fundierte Analyse sollte jedoch zusätzlich die Nettorendite betrachtet werden, die Grunderwerbsteuer, Maklerprovision, Notarkosten, Rücklagen und nicht umlagefähige Betriebskosten berücksichtigt." },
      { id: "fehler", heading: "Der Fehler vieler Anfänger", body: "Viele Anleger konzentrieren sich ausschließlich auf die Bruttomietrendite und übersehen Kaufnebenkosten, Leerstand, Instandhaltung, Verwaltungskosten und Finanzierungskosten. Dadurch erscheint eine Immobilie häufig attraktiver, als sie tatsächlich ist." },
    ],
    faq: [
      { q: "Was ist eine gute Mietrendite?", a: "Viele Investoren betrachten Werte zwischen 4 und 6 Prozent als attraktiv." },
      { q: "Reicht die Mietrendite für eine Kaufentscheidung aus?", a: "Nein. Zusätzlich sollten Cashflow, Kaufpreisfaktor und Kaufnebenkosten betrachtet werden." },
      { q: "Was ist der Unterschied zwischen Brutto- und Nettomietrendite?", a: "Die Nettomietrendite berücksichtigt zusätzliche Kosten und liefert ein realistischeres Bild." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "eigenkapitalrendite-berechnen",
    title: "Eigenkapitalrendite berechnen: Warum Fremdkapital deine Rendite erhöhen kann",
    seoTitle: "Eigenkapitalrendite berechnen: Hebeleffekt & Formel erklärt",
    description: "Eigenkapitalrendite berechnen leicht gemacht. Erfahre anhand von Beispielen, wie der Hebeleffekt funktioniert und warum Fremdkapital die Rendite einer Immobilie erhöhen kann.",
    category: "Finanzierung",
    tags: ["Eigenkapitalrendite", "Hebeleffekt", "Finanzierung"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Die Eigenkapitalrendite zeigt, wie effizient dein eigenes Geld arbeitet. Je weniger Eigenkapital eingesetzt wird, desto höher kann die Eigenkapitalrendite ausfallen – das ist der Hebeleffekt.",
    sections: [
      { id: "definition", heading: "Was ist die Eigenkapitalrendite?", body: "Die Eigenkapitalrendite zeigt, wie stark sich das eingesetzte Eigenkapital verzinst. Formel: Eigenkapitalrendite = Jahresgewinn ÷ Eigenkapital × 100. Je höher der Wert, desto effizienter arbeitet dein Kapital." },
      { id: "hebel", heading: "Warum Fremdkapital die Rendite erhöhen kann", body: "Durch Finanzierung wird weniger eigenes Kapital benötigt. Dadurch steigt die Eigenkapitalrendite. Wer 60.000 € von 300.000 € selbst einbringt und 7.200 € Jahresüberschuss nach Finanzierung erzielt, erreicht 12 % Eigenkapitalrendite – deutlich mehr als bei Vollfinanzierung aus Eigenkapital." },
      { id: "risiko", heading: "Der Hebel funktioniert in beide Richtungen", body: "Eine hohe Eigenkapitalrendite geht häufig mit höheren Risiken einher. Steigende Zinsen oder Leerstand können die Vorteile schnell reduzieren. Erfahrene Investoren betrachten deshalb immer mehrere Kennzahlen gleichzeitig." },
    ],
    faq: [
      { q: "Was ist eine gute Eigenkapitalrendite?", a: "Viele Investoren streben Werte zwischen 8 und 15 Prozent an." },
      { q: "Ist eine hohe Eigenkapitalrendite immer besser?", a: "Nein. Eine hohe Eigenkapitalrendite geht häufig mit höheren Risiken einher." },
      { q: "Kann der Hebeleffekt auch negativ sein?", a: "Ja. Steigende Zinsen oder Leerstand können die Vorteile schnell reduzieren." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "kaufnebenkosten-oesterreich",
    title: "Kaufnebenkosten in Österreich: Mit diesen Kosten müssen Immobilienkäufer rechnen",
    seoTitle: "Kaufnebenkosten Österreich: Übersicht & Rechner 2026",
    description: "Wie hoch sind die Kaufnebenkosten in Österreich? Erfahre, welche zusätzlichen Kosten beim Immobilienkauf anfallen und wie viel Eigenkapital du wirklich benötigst.",
    category: "Österreich",
    tags: ["Kaufnebenkosten", "Österreich", "Grunderwerbsteuer"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Der Kaufpreis einer Immobilie ist nur ein Teil der Gesamtrechnung. Zusätzliche Gebühren und Abgaben können schnell mehrere Zehntausend Euro ausmachen. Als Faustregel sollten Käufer in Österreich mit etwa 8 bis 12 Prozent des Kaufpreises rechnen.",
    sections: [
      { id: "positionen", heading: "Welche Kaufnebenkosten fallen in Österreich an?", body: "Grunderwerbsteuer 3,5 %, Eintragungsgebühr ins Grundbuch 1,1 %, Kosten für Vertragserrichtung und Treuhandabwicklung 1–3 %, Maklerprovision 3 % plus Umsatzsteuer sowie Finanzierungskosten. Die Summe beträgt in der Regel 8 bis 12 Prozent des Kaufpreises." },
      { id: "eigenkapital", heading: "Warum viele Käufer zu wenig Eigenkapital einplanen", body: "Viele Menschen sparen nur für die Eigenmittel der Bank. Die Nebenkosten werden dabei vergessen. Dadurch entsteht oft eine Finanzierungslücke. Wer die Nebenkosten unterschätzt, riskiert Finanzierungslücken oder muss deutlich mehr Eigenkapital einbringen." },
      { id: "rendite", heading: "Warum Kaufnebenkosten die Rendite beeinflussen", body: "Kaufnebenkosten erhöhen das eingesetzte Kapital. Dadurch sinkt die tatsächliche Rendite. Deshalb berücksichtigen erfahrene Investoren Kaufnebenkosten immer bei ihrer Analyse – sie sind ein wesentlicher Bestandteil der Nettorenditeberechnung." },
    ],
    faq: [
      { q: "Wie hoch sind die Kaufnebenkosten in Österreich?", a: "In der Regel liegen sie zwischen 8 % und 12 % des Kaufpreises." },
      { q: "Muss ich die Nebenkosten aus Eigenkapital bezahlen?", a: "In vielen Fällen ja. Deshalb sollten Käufer genügend Reserven einplanen." },
      { q: "Kann ich Kaufnebenkosten sparen?", a: "Teilweise. Zum Beispiel, wenn keine Maklerprovision anfällt oder günstigere Vertragskosten möglich sind." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "kaufnebenkosten-deutschland",
    title: "Kaufnebenkosten in Deutschland: Mit diesen Kosten müssen Immobilienkäufer rechnen",
    seoTitle: "Kaufnebenkosten Deutschland: Bundesland-Vergleich & Rechner 2026",
    description: "Wie hoch sind die Kaufnebenkosten in Deutschland? Erfahre, welche zusätzlichen Kosten beim Immobilienkauf anfallen und wie viel Eigenkapital du wirklich benötigst.",
    category: "Deutschland",
    tags: ["Kaufnebenkosten", "Deutschland", "Grunderwerbsteuer"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Beim Immobilienkauf in Deutschland variieren die Nebenkosten stark nach Bundesland. Als Faustregel können Käufer in Deutschland mit etwa 10 bis 15 Prozent des Kaufpreises rechnen.",
    sections: [
      { id: "positionen", heading: "Welche Kaufnebenkosten fallen in Deutschland an?", body: "Grunderwerbsteuer je nach Bundesland 3,5–6,5 %, Notarkosten ca. 1,0–1,5 %, Grundbuchkosten ca. 0,5 %, Maklerprovision bis zu 3,57 % für den Käufer (geteilt seit 2020) sowie Finanzierungskosten. Bayern und Sachsen haben mit 3,5 % die niedrigste Grunderwerbsteuer." },
      { id: "bundesland", heading: "Warum das Bundesland so wichtig ist", body: "Die Grunderwerbsteuer variiert stark: Bayern 3,5 %, Sachsen 5,5 %, Nordrhein-Westfalen 6,5 %, Brandenburg 6,5 %. Dieser Unterschied kann bei einem Kaufpreis von 350.000 € mehrere Tausend Euro ausmachen – ein wesentlicher Faktor bei der Standortwahl." },
      { id: "rendite", heading: "Warum Kaufnebenkosten die Rendite beeinflussen", body: "Aus Sicht eines Investors zählen die tatsächlichen Gesamtkosten. Höhere Nebenkosten erhöhen das eingesetzte Kapital und senken die tatsächliche Rendite. Deshalb berücksichtigen professionelle Investoren Kaufnebenkosten immer bei ihrer Analyse." },
    ],
    faq: [
      { q: "Wie hoch sind die Kaufnebenkosten in Deutschland?", a: "Je nach Bundesland und Maklerprovision liegen sie meist zwischen 10 % und 15 % des Kaufpreises." },
      { q: "Welches Bundesland hat die niedrigste Grunderwerbsteuer?", a: "Bayern und Sachsen mit jeweils 3,5 %." },
      { q: "Muss ich die Nebenkosten aus Eigenkapital bezahlen?", a: "In den meisten Fällen ja. Deshalb sollten Käufer ausreichend Reserven einplanen." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "wohnung-als-kapitalanlage",
    title: "Wohnung als Kapitalanlage: Lohnt sich der Kauf noch?",
    seoTitle: "Wohnung als Kapitalanlage: Lohnt es sich 2026?",
    description: "Wohnung als Kapitalanlage kaufen: Erfahre, worauf Investoren achten sollten, welche Kennzahlen wirklich wichtig sind und wie du verschiedene Immobilien objektiv vergleichen kannst.",
    category: "Immobilienkauf",
    tags: ["Kapitalanlage", "Vermietung", "Rendite"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Eine Eigentumswohnung zur Vermietung kann ein solides Investment sein – oder ein teures Hobby. Nicht jede schöne Wohnung ist automatisch eine gute Kapitalanlage. Die Zahlen müssen stimmen.",
    sections: [
      { id: "kennzahlen", heading: "Worauf es bei einer Kapitalanlage wirklich ankommt", body: "Erfahrene Investoren fragen: Wie hoch ist die Rendite? Wie hoch ist der Cashflow? Wie teuer ist die Immobilie? Wie hoch sind die Kaufnebenkosten? Wie viel Eigenkapital wird benötigt? Denn letztlich ist eine Immobilie nichts anderes als ein kleines Unternehmen." },
      { id: "lage", heading: "Lage, Lage, Lage – aber nicht nur", body: "Lage ist wichtig, aber nicht der einzige Faktor. Eine hervorragende Lage kann trotzdem zu einer schlechten Investition führen, wenn der Kaufpreis zu hoch ist, die Finanzierung ungünstig ist oder die Mieteinnahmen zu niedrig sind." },
      { id: "wann-lohnt", heading: "Wann lohnt sich eine Wohnung als Kapitalanlage?", body: "Eine gute Kapitalanlage zeichnet sich häufig durch positive oder stabile Cashflows, attraktive Rendite, gute Lage, überschaubares Risiko, solide Finanzierung und langfristige Nachfrage aus. Je mehr dieser Faktoren erfüllt sind, desto attraktiver wird das Investment." },
    ],
    faq: [
      { q: "Lohnt sich eine Wohnung als Kapitalanlage noch?", a: "Ja. Allerdings sollte jede Immobilie individuell bewertet werden." },
      { q: "Wie viel Rendite sollte eine Wohnung erzielen?", a: "Viele Investoren streben Werte zwischen 4 und 6 Prozent an." },
      { q: "Wie viel Eigenkapital benötigt man?", a: "Das hängt von der Finanzierung und der individuellen Strategie ab. Faustregel: mindestens die Kaufnebenkosten plus 10–20 % des Kaufpreises." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "break-even-miete-berechnen",
    title: "Break-even-Miete berechnen: Ab welcher Miete trägt sich eine Immobilie?",
    seoTitle: "Break-even-Miete berechnen: Formel & Beispiele",
    description: "Wie hoch muss die Miete mindestens sein, damit sich eine Immobilie selbst trägt? Erfahre, wie du die Break-even-Miete berechnen kannst und warum diese Kennzahl für Investoren so wichtig ist.",
    category: "Rendite & Cashflow",
    tags: ["Break-even", "Cashflow", "Mindestmiete"],
    publishedAt: "2026-06-18",
    readingMinutes: 6,
    intro: "Die Break-even-Miete bezeichnet die Mindestmiete, die benötigt wird, damit die Immobilie weder Gewinn noch Verlust erwirtschaftet. Liegt die tatsächliche Miete darüber, entsteht ein positiver Cashflow.",
    sections: [
      { id: "definition", heading: "Was bedeutet Break-even-Miete?", body: "Ab welcher Miete trägt sich die Immobilie selbst? Liegt die tatsächliche Miete über der Break-even-Miete, entsteht ein positiver Cashflow. Liegt sie darunter, muss der Eigentümer jeden Monat eigenes Geld zuschießen." },
      { id: "formel", heading: "Die Formel zur Berechnung", body: "Break-even-Miete = Kreditrate + laufende Kosten. Zu den laufenden Kosten gehören: Rücklagen, Verwaltungskosten, nicht umlagefähige Betriebskosten, Versicherungen und Leerstandspuffer." },
      { id: "sicherheit", heading: "Wie viel Sicherheitsabstand sollte man einplanen?", body: "Viele erfahrene Investoren möchten nicht genau am Break-even liegen. Ein Puffer von 200–300 € zwischen Marktmiete und Break-even-Miete schützt vor Leerstand, unerwarteten Reparaturen, steigenden Kosten und Mietausfällen. Je größer der Abstand, desto robuster ist die Immobilie." },
    ],
    faq: [
      { q: "Was ist die Break-even-Miete?", a: "Sie beschreibt die Mindestmiete, die benötigt wird, damit die Immobilie keinen Verlust erzeugt." },
      { q: "Ist eine hohe Break-even-Miete schlecht?", a: "Nicht unbedingt. Je näher sie jedoch an der tatsächlichen Marktmiete liegt, desto höher ist das Risiko." },
      { q: "Welche Kosten müssen berücksichtigt werden?", a: "Kreditrate, Rücklagen, Verwaltungskosten und nicht umlagefähige Kosten." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "eigenkapital-immobilie",
    title: "Wie viel Eigenkapital braucht man für eine Immobilie?",
    seoTitle: "Wie viel Eigenkapital für eine Immobilie? Richtwerte 2026",
    description: "Wie viel Eigenkapital braucht man für eine Immobilie? Erfahre, welche Möglichkeiten es gibt, welche Risiken eine geringe Eigenkapitalquote mit sich bringt und wie du verschiedene Szenarien vergleichen kannst.",
    category: "Finanzierung",
    tags: ["Eigenkapital", "Finanzierung", "Kredit"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Wie viel Eigenkapital für eine Immobilie benötigt wird, hängt von vielen Faktoren ab. Es gibt keine perfekte Lösung für jeden Investor – weder maximale Sicherheit noch maximaler Hebel ist immer richtig.",
    sections: [
      { id: "varianten", heading: "Die drei häufigsten Varianten", body: "Variante 1: Nur die Kaufnebenkosten selbst bezahlen (10–15 % des Kaufpreises). Variante 2: 20–30 % Eigenkapital – oft empfohlen als guter Kompromiss zwischen Risiko, Finanzierungskosten und Flexibilität. Variante 3: Vollständige Eigenkapitalfinanzierung – keine Zinskosten, aber das Kapital arbeitet weniger effizient." },
      { id: "bank", heading: "Warum Banken Eigenkapital lieben", body: "Mehr Eigenkapital bedeutet für die Bank geringeres Ausfallrisiko, bessere Besicherung und höhere Sicherheit. Deshalb erhalten Käufer mit höherem Eigenkapital häufig bessere Zinssätze, höhere Finanzierungschancen und mehr Flexibilität." },
      { id: "ohne-eigenkapital", heading: "Kann man auch ohne Eigenkapital kaufen?", body: "Ja. Es gibt 100-%- oder sogar 110-%-Finanzierungen. Dabei wird der gesamte Kaufpreis und teilweise sogar die Kaufnebenkosten finanziert. Allerdings entstehen höhere Zinskosten, höhere Monatsraten und höheres Risiko." },
    ],
    faq: [
      { q: "Wie viel Eigenkapital sollte man mindestens haben?", a: "Viele Käufer bringen zumindest die Kaufnebenkosten selbst ein." },
      { q: "Sind 20 Prozent Eigenkapital Pflicht?", a: "Nein. Sie gelten jedoch häufig als sinnvoller Richtwert." },
      { q: "Führt mehr Eigenkapital zu besseren Zinsen?", a: "In vielen Fällen ja. Banken belohnen höhere Eigenkapitalquoten häufig mit besseren Konditionen." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "hebeleffekt-immobilien",
    title: "Hebeleffekt bei Immobilien: Wie Fremdkapital deine Rendite erhöhen kann",
    seoTitle: "Hebeleffekt Immobilien: Leverage-Effekt einfach erklärt",
    description: "Was ist der Hebeleffekt bei Immobilien? Erfahre anhand einfacher Beispiele, wie Fremdkapital die Eigenkapitalrendite erhöhen kann und warum der Hebel in beide Richtungen wirkt.",
    category: "Finanzierung",
    tags: ["Hebeleffekt", "Leverage", "Eigenkapitalrendite"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Der Hebeleffekt beschreibt den Einsatz von Fremdkapital, um die Rendite auf das eigene Kapital zu erhöhen. Mit weniger eigenem Geld wird ein größeres Investment ermöglicht – dadurch kann das eingesetzte Eigenkapital wesentlich effizienter arbeiten.",
    sections: [
      { id: "definition", heading: "Was ist der Hebeleffekt bei Immobilien?", body: "Durch Finanzierung wird weniger eigenes Kapital benötigt. Wer 60.000 € von 300.000 € selbst einbringt, erzielt bei gleichem Jahresüberschuss eine deutlich höhere Eigenkapitalrendite als jemand, der die Immobilie vollständig aus Eigenmitteln bezahlt." },
      { id: "positiv", heading: "Der positive Hebeleffekt", body: "Der Hebel funktioniert dann positiv, wenn die Rendite der Immobilie höher ist als die Finanzierungskosten, die Immobilie stabile Einnahmen erzeugt und der Cashflow positiv bleibt. In diesem Fall arbeitet Fremdkapital für den Investor." },
      { id: "negativ", heading: "Der negative Hebeleffekt", body: "Der Hebel wirkt in beide Richtungen. Steigende Zinsen, sinkende Mieten oder Leerstand können die Situation schnell verschlechtern. Je stärker der Hebel, desto wichtiger wird ein ausreichender Cashflow als Sicherheitspuffer." },
    ],
    faq: [
      { q: "Was ist der Hebeleffekt bei Immobilien?", a: "Er beschreibt den Einsatz von Fremdkapital, um die Rendite auf das eigene Kapital zu erhöhen." },
      { q: "Funktioniert der Hebeleffekt immer?", a: "Nein. Steigende Zinsen oder Leerstand können den Effekt umkehren." },
      { q: "Ist mehr Fremdkapital immer besser?", a: "Nein. Mehr Fremdkapital erhöht gleichzeitig das Risiko." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "leerstand-immobilien-kalkulieren",
    title: "Leerstand bei Immobilien richtig kalkulieren: Warum dieses Risiko viele unterschätzen",
    seoTitle: "Leerstand Immobilien: Wie viel einplanen? Richtwerte & Tipps",
    description: "Wie viel Leerstand sollte man bei Immobilien einplanen? Erfahre, warum Leerstand ganz normal ist, wie er Rendite und Cashflow beeinflusst und wie du realistisch kalkulierst.",
    category: "Rendite & Cashflow",
    tags: ["Leerstand", "Risiko", "Cashflow"],
    publishedAt: "2026-06-18",
    readingMinutes: 6,
    intro: "Auch in guten Lagen und bei attraktiven Wohnungen lassen sich Phasen ohne Mieteinnahmen langfristig kaum vermeiden. Erfahrene Investoren kalkulieren Leerstand grundsätzlich mit ein – nicht weil sie pessimistisch sind, sondern weil sie realistisch denken.",
    sections: [
      { id: "normal", heading: "Warum Leerstand völlig normal ist", body: "Kein Mieter bleibt für immer. Menschen ziehen um, wechseln den Arbeitsplatz oder gründen Familien. Hinzu kommen Renovierungen, wirtschaftliche Veränderungen oder sinkende Nachfrage. Viele Investoren kalkulieren mit 2 bis 5 % Leerstand pro Jahr, was ungefähr einer bis drei Wochen Leerstand jährlich entspricht." },
      { id: "auswirkungen", heading: "Wie beeinflusst Leerstand die Rendite?", body: "Zwei Monate Leerstand bei einer Jahresmiete von 14.400 € reduzieren die Mieteinnahmen auf 12.000 €. Die Rendite fällt dadurch von 5 % auf 4,2 %. Leerstand wirkt sich direkt auf die Wirtschaftlichkeit aus – bei hoher Finanzierung besonders stark." },
      { id: "cashflow", heading: "Je höher die Finanzierung, desto wichtiger der Cashflow", body: "Eine Immobilie mit 300 € monatlichem Cashflow kann einen zweimonatigen Leerstand wesentlich besser verkraften als eine mit nur 50 € Puffer. Deshalb achten erfahrene Investoren häufig stärker auf den Cashflow als auf die Rendite." },
    ],
    faq: [
      { q: "Ist Leerstand bei Immobilien normal?", a: "Ja. Leerstand gehört langfristig zu jeder Immobilie." },
      { q: "Wie viel Leerstand sollte man kalkulieren?", a: "Viele Investoren rechnen mit 2 bis 5 % pro Jahr." },
      { q: "Sollte man Leerstand immer einkalkulieren?", a: "Ja. Eine konservative Kalkulation schützt vor unangenehmen Überraschungen." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "instandhaltungsruecklage-berechnen",
    title: "Instandhaltungsrücklage berechnen: Wie viel Geld solltest du wirklich zurücklegen?",
    seoTitle: "Instandhaltungsrücklage Immobilien: Richtwerte & Berechnung",
    description: "Wie hoch sollte die Instandhaltungsrücklage bei Immobilien sein? Erfahre, warum Rücklagen so wichtig sind und welche Fehler viele Anleger machen.",
    category: "Rendite & Cashflow",
    tags: ["Instandhaltung", "Rücklagen", "Kosten"],
    publishedAt: "2026-06-18",
    readingMinutes: 6,
    intro: "Immobilien altern. Früher oder später müssen Heizungen, Fenster, Dächer, Fassaden und Badezimmer erneuert werden. Die entscheidende Frage lautet nicht ob Kosten entstehen, sondern wann.",
    sections: [
      { id: "hoehe", heading: "Wie hoch sollte die Instandhaltungsrücklage sein?", body: "Viele Investoren kalkulieren grob mit 1 bis 2 Euro pro Quadratmeter und Monat. Je älter das Gebäude, desto höher fällt die Rücklage häufig aus. Bei 80 m² und 1,50 €/m² entstehen 120 € monatlich, also 14.400 € in zehn Jahren." },
      { id: "weg-eigen", heading: "WEG-Rücklage und eigene Rücklage", body: "Die Eigentümergemeinschaft bildet eine gemeinsame Rücklage für Dachsanierungen, Fassaden und Heizung. Zusätzlich sollten Investoren eigene Reserven für Küche, Bodenbeläge, Badezimmer und Schäden innerhalb der Wohnung bilden. Erfahrene Anleger berücksichtigen beide Positionen." },
      { id: "rendite", heading: "Warum Rücklagen die Rendite beeinflussen", body: "Viele Immobilienportale werben mit attraktiven Renditen ohne Rücklagen zu berücksichtigen. Wer Rücklagen einkalkuliert, erzielt eine realistischere Rendite. Kurzfristig scheint das Investment schlechter – langfristig ist die Kalkulation ehrlicher." },
    ],
    faq: [
      { q: "Wie hoch sollte die Instandhaltungsrücklage sein?", a: "Viele Investoren kalkulieren zwischen 1 und 2 Euro pro Quadratmeter und Monat." },
      { q: "Sind Rücklagen bei Neubauten notwendig?", a: "Ja. Auch Neubauten verursachen langfristig Instandhaltungskosten." },
      { q: "Was ist die Peterssche Formel?", a: "Eine Faustregel zur Abschätzung langfristiger Instandhaltungskosten – innerhalb von 80 Jahren rund das 1,5-Fache der Herstellungskosten." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "annuitaetendarlehen-erklaert",
    title: "Annuitätendarlehen einfach erklärt: So funktioniert die häufigste Immobilienfinanzierung",
    seoTitle: "Annuitätendarlehen einfach erklärt: Zins, Tilgung & Beispiele",
    description: "Was ist ein Annuitätendarlehen? Erfahre, wie diese Form der Immobilienfinanzierung funktioniert, wie sich Zins und Tilgung verändern und worauf Immobilieninvestoren achten sollten.",
    category: "Finanzierung",
    tags: ["Annuitätendarlehen", "Finanzierung", "Tilgung"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Das Annuitätendarlehen ist die mit Abstand häufigste Form der Immobilienfinanzierung. Die gleichbleibende Rate sorgt für Planungssicherheit – aber das Verhältnis zwischen Zinsen und Tilgung verändert sich über die Zeit.",
    sections: [
      { id: "definition", heading: "Was ist ein Annuitätendarlehen?", body: "Ein Annuitätendarlehen ist ein Kredit mit einer gleichbleibenden monatlichen Rate, die sich aus Zinsen und Tilgung zusammensetzt. Die Gesamtrate bleibt zunächst gleich, innerhalb dieser Rate verschiebt sich jedoch das Verhältnis: Am Anfang überwiegen Zinsen, später die Tilgung." },
      { id: "verschiebung", heading: "Warum die Tilgung jedes Jahr steigt", body: "Im ersten Jahr zahlst du viele Zinsen, weil die Restschuld noch hoch ist. Je kleiner die Restschuld wird, desto geringer fallen die Zinskosten aus. Dadurch steigt automatisch der Tilgungsanteil – und die Schulden bauen sich schneller ab." },
      { id: "strategie", heading: "Zwei unterschiedliche Strategien", body: "Niedrigere Tilgung bedeutet mehr monatlichen Cashflow, aber längere Laufzeit. Höhere Tilgung reduziert die Schulden schneller, belastet aber den monatlichen Cashflow stärker. Es gibt keine perfekte Lösung – die Wahl hängt von der persönlichen Strategie ab." },
    ],
    faq: [
      { q: "Was ist ein Annuitätendarlehen?", a: "Ein Kredit mit gleichbleibender Rate, deren Verhältnis aus Zinsen und Tilgung sich im Laufe der Zeit verändert." },
      { q: "Warum sinkt meine Rate nicht?", a: "Die Gesamtrate bleibt gleich. Lediglich der Anteil zwischen Zinsen und Tilgung verschiebt sich." },
      { q: "Welche Tilgung ist sinnvoll?", a: "Viele Käufer starten mit 2 bis 3 Prozent Tilgung." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "wie-viel-kredit-leisten",
    title: "Wie viel Kredit kann ich mir leisten? Die wichtigste Frage vor dem Immobilienkauf",
    seoTitle: "Wie viel Kredit kann ich mir leisten? Richtwerte & Tipps",
    description: "Wie viel Kredit kann ich mir leisten? Erfahre, wie Banken rechnen, welche Fehler viele Käufer machen und warum nicht die maximale Kreditsumme entscheidend ist.",
    category: "Finanzierung",
    tags: ["Kredit", "Finanzierung", "Leistbarkeit"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Die wichtigste Frage beim Immobilienkauf lautet nicht: Wie viel Kredit bekomme ich? Sondern: Wie viel Kredit passt langfristig zu meinem Leben und meiner Strategie?",
    sections: [
      { id: "bank-vs-investor", heading: "Warum die Bank und du unterschiedliche Ziele haben", body: "Die Bank fragt: Wie hoch ist dein Einkommen, wie hoch die Ausgaben, wie hoch das Risiko? Ein Investor fragt: Wie viel Sicherheit möchte ich, wie viel Cashflow brauche ich, wie viel Risiko bin ich bereit einzugehen? Diese beiden Sichtweisen führen häufig zu unterschiedlichen Ergebnissen." },
      { id: "puffer", heading: "Wie viel Puffer sollte man einplanen?", body: "Erfahrene Investoren bevorzugen ausreichende Rücklagen, positiven Cashflow, Reserven für Reparaturen und Spielraum bei steigenden Zinsen. Finanzielle Freiheit entsteht nicht durch maximale Belastung, sondern durch ausreichende Sicherheit." },
      { id: "fehler", heading: "Der größte Fehler vieler Käufer", body: "Viele Menschen kaufen an ihrer finanziellen Obergrenze und kalkulieren keine Rücklagen, keinen Leerstand, keine Reparaturen und keine steigenden Kosten ein. Immobilien sind keine perfekten Maschinen – früher oder später entstehen unerwartete Ausgaben." },
    ],
    faq: [
      { q: "Sollte ich die maximale Kreditsumme ausschöpfen?", a: "Nicht unbedingt. Viele Investoren bevorzugen zusätzliche Reserven." },
      { q: "Warum ist der Cashflow so wichtig?", a: "Er sorgt für finanzielle Sicherheit und reduziert das Risiko." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "100-prozent-finanzierung",
    title: "100-%-Finanzierung bei Immobilien: Chancen, Risiken und für wen sie sinnvoll sein kann",
    seoTitle: "100 Prozent Finanzierung Immobilien: Vor- und Nachteile",
    description: "100-%-Finanzierung bei Immobilien einfach erklärt. Erfahre, wie eine Vollfinanzierung funktioniert, welche Chancen und Risiken sie bietet und worauf Immobilieninvestoren achten sollten.",
    category: "Finanzierung",
    tags: ["Vollfinanzierung", "Finanzierung", "Eigenkapital"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Bei einer 100-%-Finanzierung finanziert die Bank den gesamten Kaufpreis. Der Käufer bringt kein Eigenkapital für den Kaufpreis ein. Die Kaufnebenkosten werden dagegen häufig weiterhin aus eigener Tasche bezahlt.",
    sections: [
      { id: "vorteile", heading: "Warum Investoren überhaupt Vollfinanzierungen nutzen", body: "Eigenkapital bleibt verfügbar für weitere Immobilien, Notreserven, Aktieninvestments oder zusätzliche Liquidität. Dadurch arbeitet das Kapital flexibler. Genau deshalb nutzen viele professionelle Investoren bewusst Fremdkapital." },
      { id: "risiken", heading: "Der Nachteil der 100-%-Finanzierung", body: "Die Kreditrate fällt höher aus. Dadurch sinkt der Cashflow, steigt die monatliche Belastung und wächst die Abhängigkeit von stabilen Mieteinnahmen. Je höher die Finanzierung, desto wichtiger wird der monatliche Überschuss als Sicherheitspuffer." },
      { id: "fuer-wen", heading: "Wann kann eine 100-%-Finanzierung sinnvoll sein?", body: "Sie kann interessant sein für Käufer mit stabilem Einkommen, guter Bonität, ausreichenden Reserven und langfristigem Anlagehorizont. Sie eignet sich dagegen weniger für Menschen, die bereits an ihrer finanziellen Grenze leben." },
    ],
    faq: [
      { q: "Was ist eine 100-%-Finanzierung?", a: "Dabei finanziert die Bank den gesamten Kaufpreis der Immobilie." },
      { q: "Muss ich trotzdem Eigenkapital besitzen?", a: "Für Kaufnebenkosten und Reserven ist Eigenkapital weiterhin sinnvoll." },
      { q: "Ist eine Vollfinanzierung riskant?", a: "Sie erhöht sowohl Chancen als auch Risiken." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "110-prozent-finanzierung",
    title: "110-%-Finanzierung bei Immobilien: Ohne Eigenkapital zur ersten Immobilie?",
    seoTitle: "110 Prozent Finanzierung: Chancen, Risiken & Voraussetzungen",
    description: "Was ist eine 110-%-Finanzierung? Erfahre, wie Immobilienkäufer sogar Kaufnebenkosten finanzieren können, welche Chancen und Risiken bestehen und für wen sich das eignet.",
    category: "Finanzierung",
    tags: ["110 Prozent Finanzierung", "Eigenkapital", "Finanzierung"],
    publishedAt: "2026-06-18",
    readingMinutes: 6,
    intro: "Bei einer 110-%-Finanzierung werden sowohl der Kaufpreis als auch die Kaufnebenkosten finanziert. Dadurch wird ein Immobilienkauf auch mit wenig Eigenkapital möglich – allerdings steigen die Risiken erheblich.",
    sections: [
      { id: "definition", heading: "Was bedeutet eine 110-%-Finanzierung?", body: "Bei einer 100-%-Finanzierung wird lediglich der Kaufpreis finanziert. Bei einer 110-%-Finanzierung geht die Bank noch einen Schritt weiter und finanziert zusätzlich die Kaufnebenkosten wie Grunderwerbsteuer, Notarkosten, Grundbuchkosten und Maklerprovision." },
      { id: "chancen", heading: "Die Chancen einer 110-%-Finanzierung", body: "Du musst nicht erst jahrelang Eigenkapital ansparen. Dadurch können Investoren früher starten, ihr Kapital anderweitig einsetzen und vom Hebeleffekt profitieren. Je weniger eigenes Kapital eingesetzt wird, desto stärker kann die Eigenkapitalrendite steigen." },
      { id: "risiken", heading: "Der größte Fehler vieler Anfänger", body: "Einsteiger hören 'ohne Eigenkapital kaufen' und denken 'dann brauche ich überhaupt kein Geld'. Doch auch bei einer 110-%-Finanzierung solltest du über Rücklagen, Liquidität und Sicherheitsreserven verfügen. Immobilien verursachen langfristig immer Kosten." },
    ],
    faq: [
      { q: "Was ist eine 110-%-Finanzierung?", a: "Dabei werden sowohl der Kaufpreis als auch die Kaufnebenkosten finanziert." },
      { q: "Ist eine 110-%-Finanzierung ohne Eigenkapital möglich?", a: "Ja, grundsätzlich ist das möglich." },
      { q: "Für wen eignet sich eine 110-%-Finanzierung?", a: "Vor allem für Käufer mit sehr guter Bonität und ausreichenden Reserven." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "zinsbindung-immobilien",
    title: "Zinsbindung bei Immobilien: Wie lange sollte sie wirklich sein?",
    seoTitle: "Zinsbindung Immobilien: 10, 15 oder 20 Jahre – was ist besser?",
    description: "Wie lange sollte die Zinsbindung bei einer Immobilienfinanzierung sein? Erfahre, welche Vor- und Nachteile kurze und lange Zinsbindungen haben.",
    category: "Finanzierung",
    tags: ["Zinsbindung", "Finanzierung", "Zinssatz"],
    publishedAt: "2026-06-18",
    readingMinutes: 6,
    intro: "Die richtige Zinsbindung hängt weniger von Prognosen und mehr von der eigenen Strategie ab. Niemand kennt die Zinsen der Zukunft – entscheidend ist das persönliche Sicherheitsbedürfnis.",
    sections: [
      { id: "kurz-vs-lang", heading: "Kurze vs. lange Zinsbindung", body: "Kurze Zinsbindung (5–10 Jahre): häufig niedrigere Zinsen, mehr Flexibilität, aber höheres Risiko steigender Zinsen. Lange Zinsbindung (15–20 Jahre): hohe Planungssicherheit, Schutz vor steigenden Zinsen, konstante Kalkulation – dafür häufig etwas höhere Zinssätze." },
      { id: "anschluss", heading: "Die Anschlussfinanzierung nicht vergessen", body: "Läuft die Zinsbindung aus, ist das Darlehen meist noch nicht vollständig zurückgezahlt. Dann wird eine Anschlussfinanzierung notwendig. Niemand weiß heute, welche Zinssätze in zehn oder fünfzehn Jahren gelten werden. Dieses Risiko sollte niemals ignoriert werden." },
      { id: "strategie", heading: "Die richtige Entscheidung hängt von deiner Strategie ab", body: "Ein Investor, der möglichst sicher kalkulieren möchte, wählt häufig eine längere Zinsbindung. Wer mehr Flexibilität bevorzugt und das Risiko tragen kann, entscheidet sich möglicherweise für kürzere Laufzeiten. Beide Strategien können sinnvoll sein." },
    ],
    faq: [
      { q: "Wie lange sollte die Zinsbindung sein?", a: "Das hängt von der persönlichen Strategie und dem Sicherheitsbedürfnis ab." },
      { q: "Sind lange Zinsbindungen besser?", a: "Nicht unbedingt. Sie bieten mehr Sicherheit, sind jedoch häufig etwas teurer." },
      { q: "Was passiert nach Ablauf der Zinsbindung?", a: "In den meisten Fällen wird eine Anschlussfinanzierung notwendig." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "wohnung-kaufen-oder-mieten",
    title: "Wohnung kaufen oder mieten? Warum die Antwort komplizierter ist, als viele denken",
    seoTitle: "Wohnung kaufen oder mieten? Vor- und Nachteile im Vergleich",
    description: "Wohnung kaufen oder mieten? Erfahre, welche Vor- und Nachteile beide Optionen haben und warum es keine allgemeingültige Antwort gibt.",
    category: "Immobilienkauf",
    tags: ["Kaufen oder Mieten", "Eigenheim", "Entscheidung"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Miete ist rausgeworfenes Geld – dieser Satz ist falsch. Die Antwort auf Kaufen oder Mieten hängt von Einkommen, Eigenkapital, Lebenssituation, Wohnort, Zinsen und persönlichen Zielen ab.",
    sections: [
      { id: "vorteile-kauf", heading: "Die Vorteile einer Eigentumswohnung", body: "Vermögensaufbau durch Tilgung, Schutz vor steigenden Mieten, Gestaltungsfreiheit und langfristige Sicherheit im Alter sprechen für den Kauf. Doch Eigentum bringt auch Verpflichtungen: Kaufnebenkosten, Instandhaltung, Reparaturen und geringere Flexibilität." },
      { id: "vorteile-miete", heading: "Die Vorteile des Mietens", body: "Flexibilität bei Umzügen, weniger Verantwortung für größere Reparaturen, mehr Liquidität durch verfügbares Eigenkapital und weniger Risiko durch Zinsänderungen oder Sonderumlagen sind Vorteile des Mietens." },
      { id: "kapitalanlage", heading: "Kaufen als Kapitalanlage", body: "Viele Investoren wohnen gar nicht in ihrer eigenen Immobilie. Sie kaufen eine Wohnung als Kapitalanlage und leben selbst zur Miete, weil sie flexibel bleiben, Kapital effizienter einsetzen und Investitionen nach wirtschaftlichen Kriterien auswählen möchten." },
    ],
    faq: [
      { q: "Ist Miete wirklich rausgeworfenes Geld?", a: "Nicht unbedingt. Auch Eigentümer tragen laufende Kosten." },
      { q: "Ist Kaufen immer besser als Mieten?", a: "Nein. Die richtige Entscheidung hängt von vielen Faktoren ab." },
      { q: "Wann lohnt sich Kaufen besonders?", a: "Vor allem bei langfristiger Planung und stabilen finanziellen Verhältnissen." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "immobilien-inflationsschutz",
    title: "Immobilien als Inflationsschutz: Wie gut schützen Wohnungen wirklich vor steigenden Preisen?",
    seoTitle: "Immobilien als Inflationsschutz: Betongold & seine Grenzen",
    description: "Sind Immobilien ein guter Inflationsschutz? Erfahre, warum viele Anleger auf Betongold setzen und weshalb Immobilien nicht automatisch vor Inflation schützen.",
    category: "Immobilienkauf",
    tags: ["Inflation", "Betongold", "Inflationsschutz"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Immobilien können ein guter Inflationsschutz sein. Aber eben nicht automatisch. Lage, Finanzierung und Wirtschaftlichkeit spielen weiterhin eine entscheidende Rolle.",
    sections: [
      { id: "warum-betongold", heading: "Warum Immobilien häufig als Betongold bezeichnet werden", body: "Immobilien besitzen Eigenschaften, die viele Anleger schätzen: Sachwert, laufende Einnahmen, begrenztes Angebot und langfristige Nutzung. Anders als Geld auf dem Girokonto verschwindet eine Wohnung nicht einfach." },
      { id: "mieten-steigen", heading: "Warum Mieten langfristig steigen können", body: "Steigen Löhne, Baukosten und Lebenshaltungskosten, steigen langfristig häufig auch die Mieten. Dadurch können Immobilienbesitzer ihre Einnahmen teilweise an die Inflation anpassen. Zusätzlich sinkt die reale Belastung von Schulden durch Inflation." },
      { id: "grenzen", heading: "Aber Immobilien sind kein perfekter Inflationsschutz", body: "Immobilienpreise können stagnieren, fallen oder sich regional unterschiedlich entwickeln. Auch Zinsen, Demografie, Wirtschaft und politische Rahmenbedingungen spielen eine Rolle. Deshalb sollte eine Immobilie niemals ausschließlich wegen der Inflation gekauft werden." },
    ],
    faq: [
      { q: "Sind Immobilien ein guter Inflationsschutz?", a: "Ja, sie können einen gewissen Schutz bieten. Ein Automatismus besteht jedoch nicht." },
      { q: "Steigen Immobilienpreise immer?", a: "Nein. Immobilien können auch an Wert verlieren." },
      { q: "Was ist wichtiger als die Inflation?", a: "Eine solide Finanzierung und ein positiver Cashflow." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "wohnung-kapitalanlage-oesterreich",
    title: "Wohnung als Kapitalanlage in Österreich: Worauf Investoren wirklich achten sollten",
    seoTitle: "Wohnung als Kapitalanlage Österreich: Tipps & Kennzahlen 2026",
    description: "Lohnt sich eine Wohnung als Kapitalanlage in Österreich? Erfahre, welche Kennzahlen wichtig sind und wie du Immobilien in Österreich systematisch bewerten kannst.",
    category: "Österreich",
    tags: ["Österreich", "Kapitalanlage", "Rendite"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Nicht jede Immobilie ist automatisch ein gutes Investment. Schöne Wohnungen sind nicht automatisch gute Investments. Erfahrene Investoren fragen zuerst: Was sagen die Zahlen?",
    sections: [
      { id: "warum-oesterreich", heading: "Warum Österreich für viele Investoren interessant ist", body: "Immobilien gelten in Österreich seit Jahrzehnten als beliebte Form des Vermögensaufbaus – wegen hoher Lebensqualität, politischer Stabilität, kontinuierlicher Nachfrage und begrenztem Angebot in vielen Regionen. Doch der Standort allein genügt nicht." },
      { id: "kennzahlen", heading: "Welche Kennzahlen sind besonders wichtig?", body: "Rendite, Cashflow, Kaufpreisfaktor, Eigenkapitalrendite und Kaufnebenkosten müssen gemeinsam betrachtet werden. Erst das Zusammenspiel dieser Kennzahlen ermöglicht eine fundierte Entscheidung." },
      { id: "fehler", heading: "Der größte Fehler vieler Anfänger", body: "Viele Menschen verlieben sich in eine Immobilie und kaufen nach Emotionen. Erfahrene Investoren verlieben sich dagegen in gute Zahlen. Denn eine unscheinbare Wohnung kann ein hervorragendes Investment sein, während eine wunderschöne Wohnung ein finanzieller Albtraum sein kann." },
    ],
    faq: [
      { q: "Lohnt sich eine Wohnung als Kapitalanlage in Österreich?", a: "Ja, grundsätzlich kann eine Eigentumswohnung ein attraktives Investment sein." },
      { q: "Welche Kennzahlen sind besonders wichtig?", a: "Vor allem Rendite, Cashflow, Kaufpreisfaktor und Eigenkapitalrendite." },
      { q: "Ist die Lage das Wichtigste?", a: "Sie ist wichtig, aber nicht der einzige Faktor." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "wohnung-kapitalanlage-deutschland",
    title: "Wohnung als Kapitalanlage in Deutschland: Worauf Investoren wirklich achten sollten",
    seoTitle: "Wohnung als Kapitalanlage Deutschland: Tipps & Kennzahlen 2026",
    description: "Lohnt sich eine Wohnung als Kapitalanlage in Deutschland? Erfahre, welche Kennzahlen wichtig sind und wie du Immobilien in Deutschland systematisch bewerten kannst.",
    category: "Deutschland",
    tags: ["Deutschland", "Kapitalanlage", "Rendite"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Nicht jede Wohnung ist automatisch eine gute Kapitalanlage. Erfolgreiche Investoren betrachten immer das Gesamtbild aus Rendite, Cashflow, Kaufnebenkosten und Rücklagen.",
    sections: [
      { id: "warum-deutschland", heading: "Warum Deutschland für Immobilieninvestoren interessant ist", body: "Deutschland gehört zu den größten Immobilienmärkten Europas mit stabiler Wirtschaft, hoher Nachfrage, großer Zahl an Mietern und langfristigen Vermögensperspektiven. Nicht jede Stadt entwickelt sich jedoch gleich." },
      { id: "cashflow", heading: "Der Cashflow entscheidet häufig über Erfolg oder Misserfolg", body: "Viele Menschen sprechen über Rendite. Professionelle Investoren sprechen dagegen über Cashflow. Denn eine Immobilie mit hoher Rendite kann trotzdem jeden Monat Geld kosten. Die entscheidende Frage lautet: Bleibt am Monatsende tatsächlich Geld übrig?" },
      { id: "fehler", heading: "Typische Fehler", body: "Nur auf den Kaufpreis achten, nach Emotionen kaufen, Rücklagen vergessen, den Cashflow ignorieren und ausschließlich auf Wertsteigerungen hoffen sind die häufigsten Fehler. Am Ende zählt nicht wie schön die Wohnung aussieht, sondern wie gut sie wirtschaftlich funktioniert." },
    ],
    faq: [
      { q: "Lohnt sich eine Wohnung als Kapitalanlage in Deutschland?", a: "Ja. Allerdings sollte jede Immobilie individuell bewertet werden." },
      { q: "Warum ist der Cashflow so entscheidend?", a: "Weil er zeigt, ob die Immobilie langfristig wirtschaftlich funktioniert." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "mikro-makrolage",
    title: "Mikro- vs. Makrolage: Warum die Lage einer Immobilie mehr ist als nur die Stadt",
    seoTitle: "Mikrolage vs. Makrolage: Was ist der Unterschied?",
    description: "Was ist der Unterschied zwischen Mikro- und Makrolage? Erfahre, warum die Lage einer Immobilie entscheidend ist und worauf Investoren bei der Standortanalyse wirklich achten sollten.",
    category: "Immobilienkauf",
    tags: ["Lage", "Mikrolage", "Makrolage", "Standort"],
    publishedAt: "2026-06-18",
    readingMinutes: 6,
    intro: "Die Stadt allein sagt noch nicht viel aus. Innerhalb derselben Stadt können zwei Straßen komplett unterschiedlich attraktiv sein. Genau deshalb analysieren erfahrene Investoren sowohl Makrolage als auch Mikrolage.",
    sections: [
      { id: "makrolage", heading: "Was ist die Makrolage?", body: "Die Makrolage beschreibt das größere Umfeld: die Stadt, Region oder das Bundesland. Typische Fragen: Wächst die Bevölkerung? Gibt es Arbeitsplätze? Wie entwickelt sich die Wirtschaft? Wie hoch ist die Nachfrage nach Wohnraum? Die Makrolage bestimmt die langfristigen Rahmenbedingungen." },
      { id: "mikrolage", heading: "Was ist die Mikrolage?", body: "Die Mikrolage beschreibt das unmittelbare Umfeld: die Straße, das Viertel, die Nachbarschaft. Hier spielen Einkaufsmöglichkeiten, öffentliche Verkehrsmittel, Schulen, Ärzte, Lärm, Parkmöglichkeiten und Grünflächen eine Rolle. Genau hier liegen häufig die entscheidenden Unterschiede." },
      { id: "beide", heading: "Warum Investoren beide Ebenen betrachten", body: "Eine hervorragende Makrolage nützt wenig, wenn die Mikrolage problematisch ist. Und umgekehrt kann eine gute Mikrolage in einer schrumpfenden Region langfristig schwierig werden. Professionelle Investoren analysieren deshalb immer beide Ebenen." },
    ],
    faq: [
      { q: "Was ist die Makrolage?", a: "Sie beschreibt das größere Umfeld einer Immobilie, beispielsweise die Stadt oder Region." },
      { q: "Was ist die Mikrolage?", a: "Sie beschreibt das direkte Umfeld wie Straße, Viertel oder Nachbarschaft." },
      { q: "Was ist wichtiger?", a: "Beide Faktoren sollten gemeinsam betrachtet werden." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "b-lage-vs-a-lage",
    title: "B-Lage vs. A-Lage: Wo liegen die besseren Renditen bei Immobilien?",
    seoTitle: "B-Lage vs. A-Lage: Wo lohnt sich das Investment mehr?",
    description: "B-Lage oder A-Lage – wo lohnt sich ein Immobilieninvestment mehr? Erfahre, welche Unterschiede es gibt und worauf private Investoren wirklich achten sollten.",
    category: "Immobilienkauf",
    tags: ["A-Lage", "B-Lage", "Rendite", "Standort"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Hohe Preise bedeuten nicht automatisch bessere Investments. Dieselbe Miete kann in einer B-Lage mit deutlich geringerem Kapitaleinsatz erzielt werden – das macht die Rendite oft attraktiver.",
    sections: [
      { id: "a-lage", heading: "Was bedeutet A-Lage überhaupt?", body: "A-Lagen gelten als besonders begehrte Standorte mit starker Wirtschaft, hoher Nachfrage, geringen Leerstandsquoten und langfristig stabiler Entwicklung. Beispiele sind München, Wien, Hamburg, Frankfurt und Zürich. Sicherheit hat dort jedoch ihren Preis." },
      { id: "b-lage", heading: "Was ist eine B-Lage?", body: "B-Lagen sind keineswegs schlechte Standorte. Sie verfügen häufig über stabile Bevölkerungszahlen, gute Infrastruktur, solide Wirtschaft und bezahlbarere Immobilienpreise. B-Lagen sind oft weniger im Fokus der Öffentlichkeit – und genau das macht sie für viele Investoren interessant." },
      { id: "vergleich", heading: "Die Rendite erzählt eine andere Geschichte", body: "Eine Wohnung in A-Lage für 500.000 € mit 18.000 € Jahresmiete ergibt 3,6 % Bruttorendite. Dieselbe Jahresmiet in B-Lage für 300.000 € ergibt 6 % Bruttorendite. Hohe Preise bedeuten nicht automatisch bessere Investments." },
    ],
    faq: [
      { q: "Sind A-Lagen immer besser?", a: "Nein. Sie bieten häufig mehr Sicherheit, aber nicht automatisch höhere Renditen." },
      { q: "Haben B-Lagen höhere Renditen?", a: "Oft ja. Allerdings hängt dies stark vom konkreten Standort ab." },
      { q: "Sind B-Lagen riskanter?", a: "Nicht unbedingt. Viele B-Lagen besitzen stabile Fundamentaldaten." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "wie-wichtig-ist-die-lage",
    title: "Wie wichtig ist die Lage wirklich? Warum „Lage, Lage, Lage“ nur die halbe Wahrheit ist",
    seoTitle: "Wie wichtig ist die Lage bei Immobilien? Die ganze Wahrheit",
    description: "Wie wichtig ist die Lage bei Immobilien wirklich? Erfahre, warum die Lage entscheidend ist, weshalb sie allein jedoch nicht ausreicht und worauf erfolgreiche Investoren tatsächlich achten.",
    category: "Immobilienkauf",
    tags: ["Lage", "Standort", "Rendite", "Cashflow"],
    publishedAt: "2026-06-18",
    readingMinutes: 6,
    intro: "Lage, Lage, Lage – dieser Satz ist nur die halbe Wahrheit. Selbst die beste Lage kann ein schlechtes Investment sein, wenn der Preis nicht stimmt.",
    sections: [
      { id: "warum-wichtig", heading: "Warum die Lage trotzdem so wichtig ist", body: "Viele Dinge an einer Immobilie lassen sich verändern: Badezimmer, Küche, Boden, Fenster. Eine Sache lässt sich jedoch niemals verändern: Der Standort. Und genau deshalb gehört die Lage zu den wichtigsten Faktoren überhaupt." },
      { id: "allein-reicht-nicht", heading: "Die Lage allein reicht nicht", body: "Viele Menschen glauben: Gute Lage = gutes Investment. Doch so einfach funktioniert es nicht. Zusätzlich spielen Kaufpreis, Finanzierung, Rücklagen, Leerstand und Cashflow eine Rolle. Professionelle Investoren betrachten immer das Gesamtbild." },
      { id: "richtige-frage", heading: "Die richtige Frage stellen", body: "Einsteiger fragen: Ist die Lage gut? Erfahrene Investoren fragen: Ist die Lage gut genug für diesen Preis? Dieser kleine Unterschied macht einen gewaltigen Unterschied. Denn eine hervorragende Lage kann zu teuer sein." },
    ],
    faq: [
      { q: "Ist die Lage der wichtigste Faktor?", a: "Sie gehört zu den wichtigsten Faktoren, reicht allein jedoch nicht aus." },
      { q: "Kann eine gute Lage ein schlechtes Investment sein?", a: "Ja. Wenn der Preis zu hoch ist oder die Rendite nicht stimmt." },
      { q: "Was ist wichtiger – Lage oder Cashflow?", a: "Beides sollte gemeinsam betrachtet werden." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "immobilien-standort-analyse",
    title: "Was macht einen guten Immobilienstandort aus? Worauf erfolgreiche Investoren wirklich achten",
    seoTitle: "Immobilien Standort analysieren: Die wichtigsten Faktoren",
    description: "Was macht einen guten Immobilienstandort aus? Erfahre, welche Faktoren entscheidend sind und warum erfolgreiche Investoren weit mehr analysieren als nur die Stadt.",
    category: "Immobilienkauf",
    tags: ["Standort", "Lage", "Standortanalyse"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Ein guter Immobilienstandort besteht aus weit mehr als einem bekannten Stadtnamen. Erfolgreiche Investoren analysieren Bevölkerung, Wirtschaft, Infrastruktur, Mikrolage und die langfristigen Perspektiven.",
    sections: [
      { id: "bevoelkerung", heading: "Bevölkerungsentwicklung", body: "Eine der wichtigsten Fragen: Wächst die Region? Wo mehr Menschen leben möchten, steigt langfristig die Nachfrage nach Wohnraum. Positive Signale: steigende Einwohnerzahlen, Zuwanderung, junge Bevölkerung, Universitäten. Sinkende Einwohnerzahlen können ein Warnsignal sein." },
      { id: "wirtschaft", heading: "Arbeitsmarkt und Wirtschaft", body: "Menschen ziehen dorthin, wo sie Arbeit finden. Regionen mit großen Unternehmen, Industrie und Technologieunternehmen profitieren oft von stabiler Nachfrage. Ein starker Arbeitsmarkt sorgt für steigende Einkommen, höhere Kaufkraft und stabile Mietnachfrage." },
      { id: "standort-zahlen", heading: "Der Standort allein reicht nicht", body: "Ein hervorragender Standort garantiert noch kein gutes Investment. Zusätzlich spielen Rendite, Cashflow, Finanzierung, Kaufnebenkosten und Rücklagen eine Rolle. Denn eine hervorragende Lage kann schlicht zu teuer sein." },
    ],
    faq: [
      { q: "Was macht einen guten Immobilienstandort aus?", a: "Vor allem: Bevölkerungsentwicklung, Wirtschaft, Infrastruktur, Nachfrage und Zukunftsperspektiven." },
      { q: "Sind große Städte automatisch besser?", a: "Nein. Auch kleinere Städte können hervorragende Investments ermöglichen." },
      { q: "Wie wichtig ist die Mikrolage?", a: "Sie hat großen Einfluss auf Vermietbarkeit und Attraktivität." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "beste-staedte-immobilien-oesterreich",
    title: "Die besten Städte für Immobilieninvestments in Österreich",
    seoTitle: "Beste Städte für Immobilieninvestments Österreich 2026",
    description: "Welche Städte eignen sich in Österreich besonders für Immobilieninvestments? Erfahre, welche Standorte für Kapitalanleger interessant sind und warum nicht immer Wien die beste Wahl sein muss.",
    category: "Österreich",
    tags: ["Österreich", "Wien", "Graz", "Linz", "Standort"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "Wien ist für viele Anleger die erste Adresse – aber nicht immer die wirtschaftlichste. Beliebtheit und Wirtschaftlichkeit sind nicht immer dasselbe.",
    sections: [
      { id: "wien", heading: "Wien – der Klassiker", body: "Wien bietet stetiges Bevölkerungswachstum, hohe Lebensqualität, starke Wirtschaft, viele Universitäten und stabile Nachfrage. Nachteile: hohe Kaufpreise, geringere Renditen, hoher Wettbewerb. Für sicherheitsorientierte Investoren bleibt Wien attraktiv, wer auf maximale Rendite aus ist, findet häufig andere Möglichkeiten." },
      { id: "andere-staedte", heading: "Graz, Linz, Salzburg und mehr", body: "Graz bietet stabile Nachfrage durch Universitäten und junge Bevölkerung. Linz wird häufig übersehen, bietet aber starke Industrie, bedeutende Arbeitgeber und interessante Renditen. Salzburg ist sehr begehrt, aber teuer. Klagenfurt und Villach bieten teilweise attraktive Kaufpreise und interessante Renditen." },
      { id: "strategie", heading: "Die Zahlen sind wichtiger als der Stadtname", body: "Einsteiger fragen: Welche Stadt ist die beste? Profis fragen: Wo stimmen die Zahlen? Letztlich entscheiden Rendite, Cashflow, Kaufpreisfaktor und Eigenkapitalrendite über den Erfolg." },
    ],
    faq: [
      { q: "Welche Stadt ist die beste für Immobilieninvestments in Österreich?", a: "Eine allgemeingültige Antwort gibt es nicht. Die beste Stadt hängt von der jeweiligen Strategie ab." },
      { q: "Ist Wien immer die beste Wahl?", a: "Nicht unbedingt. Wien bietet Sicherheit, jedoch häufig geringere Renditen." },
      { q: "Welche Städte bieten höhere Renditen?", a: "Teilweise bieten Städte wie Linz, Graz oder Klagenfurt interessante Möglichkeiten." },
    ],
    legalDisclaimer: true,
  },
  {
    slug: "beste-staedte-immobilien-deutschland",
    title: "Die besten Städte für Immobilieninvestments in Deutschland",
    seoTitle: "Beste Städte für Immobilieninvestments Deutschland 2026",
    description: "Welche Städte eignen sich in Deutschland besonders für Immobilieninvestments? Erfahre, warum nicht immer München oder Berlin die beste Wahl sein müssen.",
    category: "Deutschland",
    tags: ["Deutschland", "München", "Berlin", "Leipzig", "Standort"],
    publishedAt: "2026-06-18",
    readingMinutes: 7,
    intro: "München, Berlin und Hamburg sind dabei längst nicht die einzigen Optionen. Erfolgreiche Anleger betrachten nicht nur den Namen einer Stadt, sondern analysieren Nachfrage, Wirtschaft, Kaufpreise und langfristige Perspektiven.",
    sections: [
      { id: "muenchen", heading: "München – Sicherheit hat ihren Preis", body: "München gilt als einer der begehrtesten Immobilienmärkte – starke Wirtschaft, hohe Kaufkraft, stabile Nachfrage. Nachteile: extrem hohe Kaufpreise, niedrige Renditen, hoher Wettbewerb. Viele Anleger kaufen dort vor allem wegen der Stabilität." },
      { id: "andere-staedte", heading: "Berlin, Hamburg, Leipzig und mehr", body: "Berlin bietet hohe Bevölkerungsdynamik und internationale Anziehungskraft. Hamburg kombiniert Stabilität, Nachfrage und langfristige Perspektiven. Leipzig hat vergleichsweise moderate Kaufpreise mit steigender Nachfrage. Nürnberg und Dresden werden häufig unterschätzt und bieten oft attraktivere Renditen als Metropolen." },
      { id: "zahlen", heading: "Die Zahlen sind wichtiger als der Stadtname", body: "Eine Wohnung in München für 700.000 € mit 50 € Cashflow steht einer Wohnung in Leipzig für 350.000 € mit 240 € Cashflow gegenüber. Wer maximale Sicherheit möchte, entscheidet anders als wer maximalen Cashflow anstrebt. Beide Strategien können sinnvoll sein." },
    ],
    faq: [
      { q: "Welche Stadt ist die beste für Immobilieninvestments in Deutschland?", a: "Eine allgemeingültige Antwort gibt es nicht. Die beste Stadt hängt von der jeweiligen Strategie ab." },
      { q: "Ist München immer die beste Wahl?", a: "Nicht unbedingt. München bietet Stabilität, allerdings häufig niedrigere Renditen." },
      { q: "Welche Städte bieten höhere Renditen?", a: "Unter anderem Leipzig, Nürnberg oder Dresden können interessante Möglichkeiten bieten." },
    ],
    legalDisclaimer: true,
  },
];

export function getArticleBySlug(slug: string): RatgeberArticle | undefined {
  return RATGEBER_ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(category: RatgeberCategory) {
  return RATGEBER_ARTICLES.filter((a) => a.category === category);
}
