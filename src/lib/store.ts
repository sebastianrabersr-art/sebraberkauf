import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_ASSUMPTIONS } from "./calc";
import type { Assumptions, Property, ViewingNote } from "./types";

export const VIEWING_CHECKLIST: { key: string; label: string; group: string }[] = [
  { key: "fenster", label: "Zustand Fenster", group: "Wohnung" },
  { key: "boeden", label: "Zustand Böden", group: "Wohnung" },
  { key: "bad", label: "Bad", group: "Wohnung" },
  { key: "kueche", label: "Küche", group: "Wohnung" },
  { key: "elektrik", label: "Elektrik", group: "Wohnung" },
  { key: "heizung", label: "Heizung", group: "Wohnung" },
  { key: "feuchtigkeit", label: "Feuchtigkeit", group: "Wohnung" },
  { key: "laerm", label: "Lärm", group: "Wohnung" },
  { key: "licht", label: "Licht", group: "Wohnung" },
  { key: "lift", label: "Lift", group: "Haus" },
  { key: "keller", label: "Keller", group: "Haus" },
  { key: "fahrradraum", label: "Fahrradraum", group: "Haus" },
  { key: "stiegenhaus", label: "Stiegenhaus", group: "Haus" },
  { key: "dach", label: "Dach", group: "Haus" },
  { key: "fassade", label: "Fassade", group: "Haus" },
  { key: "ruecklage_eg", label: "Rücklage der Eigentümergemeinschaft", group: "Verwaltung" },
  { key: "protokolle", label: "Protokolle Eigentümerversammlung", group: "Verwaltung" },
  { key: "sanierungen", label: "Geplante Sanierungen", group: "Verwaltung" },
  { key: "vermietbarkeit", label: "Vermietbarkeit", group: "Lage" },
  { key: "umgebung", label: "Umgebung", group: "Lage" },
  { key: "oeffi", label: "Öffi-Anbindung", group: "Lage" },
];

interface State {
  assumptions: Assumptions;
  properties: Property[];
  viewings: Record<string, ViewingNote>;
  setAssumptions: (a: Partial<Assumptions>) => void;
  resetAssumptions: () => void;
  addProperty: (p: Property) => void;
  updateProperty: (id: string, patch: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  setViewing: (id: string, key: string, patch: Partial<{ done: boolean; note: string }>) => void;
  findByLink: (link: string) => Property | undefined;
}

const seedProperties: Property[] = [
  {
    id: "seed-1",
    status: "Prüfen",
    inseratsdatum: new Date().toISOString(),
    link: "https://example.com/inserat-1",
    platform: "willhaben",
    title: "Neubau Nähe U3, 2 Zimmer",
    bezirk: "1070",
    adresse: "Neubau Nähe U3",
    objekttyp: "Wohnung",
    baujahr: 2018,
    mietrecht: "Neubau / freie Miete",
    zustand: "Sehr gut",
    wohnflaecheM2: 48,
    zimmer: 2,
    kaufpreis: 320000,
    makler: "Ja",
    sanierung: 5000,
    einrichtung: 8000,
    reserve: 5000,
    nettomieteMtl: 1100,
    nettomieteGeschaetzt: false,
    hasElevator: true,
    hasBalkon: true,
    missingData: [],
    scoreLage: 22,
    scoreVermietbarkeit: 18,
    scoreZustand: 14,
    scoreRecht: 9,
    scoreWiederverkauf: 5,
    notizen: "Beispielzeile aus Excel",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-2",
    status: "Neu",
    inseratsdatum: new Date().toISOString(),
    link: "https://example.com/inserat-2",
    platform: "ImmoScout24",
    title: "U-Bahn Nähe, 1150",
    bezirk: "1150",
    adresse: "U-Bahn Nähe",
    objekttyp: "Wohnung",
    baujahr: 1998,
    mietrecht: "Teilanwendung MRG",
    zustand: "Gut",
    wohnflaecheM2: 42,
    zimmer: 2,
    kaufpreis: 250000,
    makler: "Nein",
    sanierung: 8000,
    einrichtung: 7000,
    reserve: 5000,
    nettomieteMtl: 850,
    nettomieteGeschaetzt: false,
    missingData: [],
    scoreLage: 18,
    scoreVermietbarkeit: 16,
    scoreZustand: 12,
    scoreRecht: 7,
    scoreWiederverkauf: 4,
    notizen: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-3",
    status: "Neu",
    inseratsdatum: new Date().toISOString(),
    link: "https://example.com/inserat-3",
    platform: "Makler",
    title: "Altbau gute Lage, 1030",
    bezirk: "1030",
    adresse: "gute Lage, Altbau",
    objekttyp: "Wohnung",
    baujahr: 1900,
    mietrecht: "Altbau / Richtwert möglich",
    zustand: "Okay",
    wohnflaecheM2: 55,
    zimmer: 2,
    kaufpreis: 360000,
    makler: "Ja",
    sanierung: 15000,
    einrichtung: 9000,
    reserve: 7000,
    nettomieteMtl: 1050,
    nettomieteGeschaetzt: true,
    missingData: ["Energieklasse", "HWB"],
    scoreLage: 20,
    scoreVermietbarkeit: 12,
    scoreZustand: 9,
    scoreRecht: 3,
    scoreWiederverkauf: 4,
    notizen: "Mietrecht genau prüfen",
    createdAt: new Date().toISOString(),
  },
];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      assumptions: DEFAULT_ASSUMPTIONS,
      properties: seedProperties,
      viewings: {},
      setAssumptions: (a) => set((s) => ({ assumptions: { ...s.assumptions, ...a } })),
      resetAssumptions: () => set({ assumptions: DEFAULT_ASSUMPTIONS }),
      addProperty: (p) => set((s) => ({ properties: [p, ...s.properties] })),
      updateProperty: (id, patch) =>
        set((s) => ({ properties: s.properties.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteProperty: (id) =>
        set((s) => ({
          properties: s.properties.filter((x) => x.id !== id),
          viewings: Object.fromEntries(Object.entries(s.viewings).filter(([k]) => k !== id)),
        })),
      setViewing: (id, key, patch) =>
        set((s) => {
          const cur = s.viewings[id] ?? { propertyId: id, checks: {} };
          const existing = cur.checks[key] ?? { done: false, note: "" };
          const checks = { ...cur.checks, [key]: { ...existing, ...patch } };
          return { viewings: { ...s.viewings, [id]: { ...cur, checks } } };
        }),
      findByLink: (link) => get().properties.find((p) => p.link.trim() === link.trim()),
    }),
    { name: "immo-invest-store-v1" },
  ),
);

export function makeEmptyProperty(partial: Partial<Property> = {}): Property {
  return {
    id: crypto.randomUUID(),
    status: "Neu",
    inseratsdatum: new Date().toISOString(),
    link: "",
    platform: "",
    title: "",
    bezirk: "",
    adresse: "",
    objekttyp: "Wohnung",
    baujahr: null,
    mietrecht: "unklar – rechtlich prüfen",
    zustand: "",
    wohnflaecheM2: null,
    zimmer: null,
    kaufpreis: null,
    makler: "unklar",
    sanierung: 0,
    einrichtung: 0,
    reserve: 0,
    nettomieteMtl: null,
    nettomieteGeschaetzt: false,
    missingData: [],
    scoreLage: 15,
    scoreVermietbarkeit: 12,
    scoreZustand: 10,
    scoreRecht: 6,
    scoreWiederverkauf: 3,
    notizen: "",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}
