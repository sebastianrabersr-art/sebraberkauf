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
];

export function getArticleBySlug(slug: string): RatgeberArticle | undefined {
  return RATGEBER_ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(category: RatgeberCategory) {
  return RATGEBER_ARTICLES.filter((a) => a.category === category);
}
