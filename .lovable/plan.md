# CRM-Erweiterung der Immobilien-App

Großer Umbau. Ich gliedere in 6 Implementierungs-Phasen, alle bestehenden Funktionen (Projekte, Scoring, Datenbank, Viewing, Annahmen, Detailseite) bleiben erhalten — Erweiterung, kein Rewrite.

## Phase 1 — Datenmodell erweitern (`src/lib/types.ts`, `src/lib/store.ts`)

Property bekommt neue optionale Felder:
- **Kaufdaten**: `kaufpreisNetto`, `kaufpreisBrutto`, `provisionPct`, `provisionEUR`, `grunderwerbsteuer`, `grundbuchkosten`, `vertragskosten`, `finanzierungskosten`, `sonstigeNK`
- **Flächen**: `aussenflaecheM2`, `balkonM2`, `terrasseM2`, `gartenM2`, `kellerM2`, `nutzflaecheGesamtM2`
- **Objekt**: `bundesland`, `land`, `stockwerk`, `badezimmer`, `wc`, `parkplatz`, `terrasse`, `loggia`, `garten`, `keller`, `moebliert`, `energieklasse`, `hwb`, `fgee`, `heizungstyp`, `verfuegbarkeit`, `neubauAltbau`
- **Vermietung**: `bkUmlagefaehig`, `bkNichtUmlagefaehig`, `heizkostenMtl`, `ruecklageMtl`, `leerstandPuffer`, `vermietbarkeit`, `zielmietergruppe`
- **Mietrecht**: `mietrechtKategorie`, `mietrechtErklaerung`, `mietrechtRisiko` ("niedrig"|"mittel"|"hoch"), `mietrechtOffeneFragen`
- **CRM/Verkäufer**: `sellerName`, `sellerType`, `sellerCompany`, `sellerContact`, `sellerPhone`, `sellerEmail`, `sellerWebsite`, `sellerAddress`, `sellerNotes`
- **CRM-Tracking**: `priority` ("hoch"|"mittel"|"niedrig"), `nextAction`, `nextActionDate`, `firstContactDate`, `lastContactDate`, `contactChannel`, `viewingDate`, `offerAmount`, `negotiationStatus`, `decisionReason`, `requestedDocs[]`, `receivedDocs[]`
- **Status-Enum** erweitert um alle 17 neuen Werte
- **Berechnete Caches**: `requiredBreakEvenRent`, `requiredBreakEvenRentPerM2`

Neue Entitäten:
- `Document { id, propertyId, fileName, fileType, fileUrl(dataURL), uploadDate, extractionStatus, extractedFields, missingFields, notes, category }`
- `Activity { id, propertyId, type, title, description, date, dueDate, completed, contactPerson }`

Store-Erweiterungen: `documents[]`, `activities[]` + CRUD-Actions. Migration: alte Properties bekommen Defaults via Spread (kein Bruch, persist Version 3).

## Phase 2 — PDF-Upload & Extraktion

- **`src/lib/extract.functions.ts`**: neue Server-Function `extractFromPdf({ pdfBase64, fileName })`. Sendet PDF via Lovable AI Gateway (`google/gemini-2.5-flash`) als `type: "file"` Block, fordert strukturiertes JSON für alle Exposé-Felder. Liefert `{ extracted, missing, rawText }`.
- **`src/components/PdfUploader.tsx`**: Drag-&-Drop/File-Input, base64-Konvertierung, Loading-State, Ergebnis-Diff-Dialog mit Checkbox-Auswahl pro Feld vor Übernahme, "PDF öffnen" (blob URL), "Löschen".
- Eingebunden in: Detailseite (neuer "Dokumente"-Tab), `properties.new.tsx`, Bearbeiten-Modus, sowie als Aktion auf der Listenseite.

## Phase 3 — Cashflow-Rechner & Mietrecht

- **`src/lib/calc.ts`**: 
  - `calcBreakEvenRent(p, a)` → benötigte Mindestmiete netto (Rate + nicht-umlagefähige BK + Rücklage + Leerstand + min Cashflow); + €/m².
  - `inferMietrecht(p)` → liefert Kategorie + Erklärung + Risiko basierend auf Baujahr/Objekttyp/Beschreibung.
  - `googleMapsUrl(p)` → encodet Adresse oder Fallback Bezirk+Stadt+Land.
- **`src/routes/rechner.tsx`**: eigene Seite mit Cashflow-Break-even-Rechner (frei oder Immobilie auswählen, vorausgefüllt).
- Auf Detailseite eingebettet im neuen "Investment-Rechnung"-Tab.

## Phase 4 — Detailseite als CRM-Objekt (Tabs)

`src/routes/properties.$id.tsx` umstrukturieren mit 9 Tabs (shadcn `Tabs`): Übersicht, Investment-Rechnung, Objektinformationen, Mietrecht, Verkäufer/Kontakt, Aktivitäten, Besichtigung, Dokumente, Notizen.

- Übersicht: KPI-Karten + Quick-Status/Priority-Dropdown + Google-Maps-Button + Original-Inserat
- Adresse überall klickbar → öffnet Maps in neuem Tab
- Mietrecht-Tab mit Disclaimer "Keine Rechtsberatung"
- Aktivitäten-Tab: Timeline + Schnell-Hinzufügen-Formular
- Besichtigung-Tab behält bestehende 21-Punkte-Checkliste
- Dokumente-Tab: Liste + PDF-Uploader + Unterlagen-Checkliste (11 Pflichtdokumente mit Status fehlt/angefragt/erhalten/geprüft) — Status in `requestedDocs`/`receivedDocs`

## Phase 5 — Pipeline (Kanban) & Follow-ups

- **`src/routes/pipeline.tsx`**: Kanban mit 9 Spalten (Neu, Prüfen, Interessant, Kontaktiert, Besichtigung, Finanzierung, Angebot, Verhandlung, Entschieden). Karten zeigen Titel, Bezirk, Preis, m², Score, Cashflow, Priorität, nächste Aktion. Drag&Drop via HTML5 native (ohne neue Dependency). Karten-Klick → Detailseite. Statusmapping: jede Spalte enthält 1–2 Status-Werte.
- **`src/routes/followups.tsx`**: Liste aller Properties mit `nextActionDate` ≤ heute+7, sortiert nach Fälligkeit, Quick-Complete-Button (erstellt Activity, setzt next-action zurück).
- Dashboard (`src/routes/index.tsx`): Sektion "Fällige Follow-ups" mit Top 5.

## Phase 6 — Listenseite + Navigation

- **`src/routes/properties.index.tsx`**: 
  - Header-Aktionen: "Link hinzufügen" (öffnet Modal mit URL-Input → ruft bestehende extract-Function), "Manuell hinzufügen", "PDF hochladen" (Modal → extract → neue Immobilie anlegen), "CSV Import" (Stub), "Filter".
  - Neue Spalten: Priorität, nächste Aktion+Fälligkeit, Verkäufer, letzter Kontakt, benötigte Mindestmiete, Google-Maps-Icon.
  - Filter erweitert um Priorität, Verkäuferart, Cashflow±, Follow-up fällig, Mietrecht-Risiko.
  - Status-Dropdown inline editierbar.
- **`src/components/layout/AppShell.tsx`**: Navigation = Dashboard, Immobilien, Pipeline, Projekte, Rechner, Follow-ups, Einstellungen. "Link analysieren" entfernt (Route `analyze.tsx` löschen, RouteTree wird vom Vite-Plugin regeneriert).

## Technische Hinweise

- Alles client-side persistent (Zustand + localStorage v3). PDF-Dateien werden als base64-DataURL im Store gehalten (für kleine Exposés ok; Limit-Warnung wenn >5MB).
- Drag&Drop nativ, keine zusätzliche Lib.
- AI-Extraktion über bestehende Lovable AI Gateway-Integration (`LOVABLE_API_KEY`, gleiches Pattern wie Link-Extraktion).
- Bestehendes Design (Tokens, AmpelBadge, AppShell, Karten) wiederverwendet — keine visuelle Regression.

## Was bewusst NICHT in dieser Runde

- Echte Datenbank/Cloud-Sync (alles bleibt lokal wie bisher; bei Bedarf später Lovable Cloud aktivieren).
- WhatsApp/E-Mail-Integration mit echten Versand-APIs (nur Tracking als Activity-Typen).
- OCR für gescannte PDFs ohne Textebene (Gemini übernimmt das normalerweise selbst, kein Extra-Schritt).

Soll ich so loslegen?