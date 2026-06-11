import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_ASSUMPTIONS } from "./calc";
import type { Activity, ActivityType, Assumptions, Payment, Project, Property, PropertyDocument, ViewingNote } from "./types";
import { migrateLegacyStatus } from "./types";

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

const now = () => new Date().toISOString();

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: partial.id ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : "proj-tmp"),
    name: "Neues Projekt", description: "",
    investmentGoal: "", locationFocus: "Wien", budgetMin: null, budgetMax: null,
    maxNegativeCashflow: null, preferredSizeMin: null, preferredSizeMax: null,
    preferredDistricts: "", status: "Aktiv", assumptions: { ...DEFAULT_ASSUMPTIONS },
    createdAt: now(), updatedAt: now(), ...partial,
  };
}

const demoProject: Project = makeProject({
  id: "proj-demo", name: "Demo: Wohnung Wien",
  description: "Beispielprojekt aus deiner Excel-Datei zur Veranschaulichung.",
  investmentGoal: "Langfristige Vermietung", locationFocus: "Wien",
  budgetMin: 200000, budgetMax: 400000, preferredDistricts: "1070, 1150, 1030", isDemo: true,
});

const seedProperties: Property[] = [
  {
    id: "seed-1", projectId: demoProject.id, status: "Prüfen", inseratsdatum: now(),
    link: "https://www.willhaben.at/iad/immobilien", platform: "willhaben", extractionStatus: "ok",
    title: "Neubau Nähe U3, 2 Zimmer", bezirk: "1070", adresse: "Neubau Nähe U3", city: "Wien", land: "Österreich",
    objekttyp: "Wohnung", baujahr: 2018, mietrecht: "Neubau / freie Miete", zustand: "Sehr gut",
    wohnflaecheM2: 48, zimmer: 2, kaufpreis: 320000, makler: "Ja",
    sanierung: 5000, einrichtung: 8000, reserve: 5000,
    nettomieteMtl: 1100, nettomieteGeschaetzt: false, hasElevator: true, hasBalkon: true,
    betriebskostenMtl: 140, beschreibung: "Beispiel Neubau-Wohnung in zentraler Lage.",
    missingData: [], scoreLage: 22, scoreVermietbarkeit: 18, scoreZustand: 14, scoreRecht: 9, scoreWiederverkauf: 5,
    notizen: "Beispielzeile aus Excel", priority: "Mittel", createdAt: now(), isDemo: true,
  },
  {
    id: "seed-2", projectId: demoProject.id, status: "Neu", inseratsdatum: now(),
    link: "https://www.immobilienscout24.at/", platform: "ImmoScout24", extractionStatus: "ok",
    title: "U-Bahn Nähe, 1150", bezirk: "1150", adresse: "U-Bahn Nähe", city: "Wien", land: "Österreich",
    objekttyp: "Wohnung", baujahr: 1998, mietrecht: "Teilanwendung MRG", zustand: "Gut",
    wohnflaecheM2: 42, zimmer: 2, kaufpreis: 250000, makler: "Nein",
    sanierung: 8000, einrichtung: 7000, reserve: 5000, nettomieteMtl: 850, nettomieteGeschaetzt: false,
    betriebskostenMtl: 130, beschreibung: "Beispiel-Bestand mit guter Anbindung.",
    missingData: [], scoreLage: 18, scoreVermietbarkeit: 16, scoreZustand: 12, scoreRecht: 7, scoreWiederverkauf: 4,
    notizen: "", priority: "Niedrig", createdAt: now(), isDemo: true,
  },
  {
    id: "seed-3", projectId: demoProject.id, status: "Interessant", inseratsdatum: now(),
    link: "https://immobilien.derstandard.at/", platform: "derStandard", extractionStatus: "partial",
    title: "Altbau gute Lage, 1030", bezirk: "1030", adresse: "gute Lage, Altbau", city: "Wien", land: "Österreich",
    objekttyp: "Wohnung", baujahr: 1900, mietrecht: "Altbau / Richtwert möglich", zustand: "Okay",
    wohnflaecheM2: 55, zimmer: 2, kaufpreis: 360000, makler: "Ja",
    sanierung: 15000, einrichtung: 9000, reserve: 7000, nettomieteMtl: 1050, nettomieteGeschaetzt: true,
    beschreibung: "Altbau, Mietrecht prüfen.", missingData: ["Energieklasse", "HWB", "Betriebskosten"],
    scoreLage: 20, scoreVermietbarkeit: 12, scoreZustand: 9, scoreRecht: 3, scoreWiederverkauf: 4,
    notizen: "Mietrecht genau prüfen", priority: "Hoch",
    nextAction: "Makler anrufen", nextActionDate: new Date(Date.now() + 86400000).toISOString().slice(0,10),
    sellerType: "Makler", sellerName: "Max Mustermann", sellerCompany: "Beispiel Immobilien GmbH",
    createdAt: now(), isDemo: true,
  },
];

interface State {
  projects: Project[];
  activeProjectId: string;
  properties: Property[];
  viewings: Record<string, ViewingNote>;
  documents: PropertyDocument[];
  activities: Activity[];
  payments: Payment[];
  addProject: (p?: Partial<Project>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  updateProjectAssumptions: (id: string, patch: Partial<Assumptions>) => void;
  resetProjectAssumptions: (id: string) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  addProperty: (p: Property) => void;
  updateProperty: (id: string, patch: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  duplicateProperty: (id: string) => string | null;
  setViewing: (id: string, key: string, patch: Partial<{ done: boolean; note: string }>) => void;
  findByLink: (link: string, projectId?: string) => Property | undefined;
  deleteDemoData: () => void;
  addDocument: (d: PropertyDocument) => void;
  updateDocument: (id: string, patch: Partial<PropertyDocument>) => void;
  deleteDocument: (id: string) => void;
  addActivity: (a: Activity) => void;
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  addPayment: (p: Payment) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      projects: [demoProject],
      activeProjectId: demoProject.id,
      properties: seedProperties,
      viewings: {},
      documents: [],
      activities: [],
      payments: [],
      addProject: (p) => {
        const proj = makeProject(p);
        set((s) => ({ projects: [proj, ...s.projects], activeProjectId: proj.id }));
        return proj;
      },
      updateProject: (id, patch) =>
        set((s) => ({ projects: s.projects.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)) })),
      updateProjectAssumptions: (id, patch) =>
        set((s) => ({ projects: s.projects.map((x) => x.id === id ? { ...x, assumptions: { ...x.assumptions, ...patch }, updatedAt: now() } : x) })),
      resetProjectAssumptions: (id) =>
        set((s) => ({ projects: s.projects.map((x) => x.id === id ? { ...x, assumptions: { ...DEFAULT_ASSUMPTIONS }, updatedAt: now() } : x) })),
      deleteProject: (id) =>
        set((s) => {
          const projects = s.projects.filter((x) => x.id !== id);
          if (projects.length === 0) projects.push(makeProject({ name: "Mein Projekt" }));
          const activeProjectId = s.activeProjectId === id ? projects[0].id : s.activeProjectId;
          const properties = s.properties.filter((p) => p.projectId !== id);
          return { projects, activeProjectId, properties };
        }),
      setActiveProject: (id) => set({ activeProjectId: id }),
      addProperty: (p) => set((s) => ({ properties: [{ ...p, projectId: p.projectId || s.activeProjectId }, ...s.properties] })),
      updateProperty: (id, patch) =>
        set((s) => ({ properties: s.properties.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)) })),
      deleteProperty: (id) =>
        set((s) => ({
          properties: s.properties.filter((x) => x.id !== id),
          viewings: Object.fromEntries(Object.entries(s.viewings).filter(([k]) => k !== id)),
          documents: s.documents.filter((d) => d.propertyId !== id),
          activities: s.activities.filter((a) => a.propertyId !== id),
          payments: s.payments.filter((x) => x.propertyId !== id),
        })),
      duplicateProperty: (id) => {
        const src = get().properties.find((p) => p.id === id);
        if (!src) return null;
        const copy: Property = { ...src, id: crypto.randomUUID(), title: `${src.title} (Kopie)`, createdAt: now(), updatedAt: now(), isDemo: false };
        set((s) => ({ properties: [copy, ...s.properties] }));
        return copy.id;
      },
      setViewing: (id, key, patch) =>
        set((s) => {
          const cur = s.viewings[id] ?? { propertyId: id, checks: {} };
          const existing = cur.checks[key] ?? { done: false, note: "" };
          const checks = { ...cur.checks, [key]: { ...existing, ...patch } };
          return { viewings: { ...s.viewings, [id]: { ...cur, checks } } };
        }),
      findByLink: (link, projectId) => {
        const l = link.trim();
        return get().properties.find((p) => p.link.trim() === l && (!projectId || p.projectId === projectId));
      },
      deleteDemoData: () =>
        set((s) => ({
          properties: s.properties.filter((p) => !p.isDemo),
          projects: s.projects.some((x) => !x.isDemo) ? s.projects.filter((p) => !p.isDemo) : [makeProject({ name: "Mein Projekt" })],
          activeProjectId: (() => { const nonDemo = s.projects.filter((p) => !p.isDemo); return nonDemo[0]?.id ?? s.activeProjectId; })(),
        })),
      addDocument: (d) => set((s) => ({ documents: [d, ...s.documents] })),
      updateDocument: (id, patch) => set((s) => ({ documents: s.documents.map((d) => d.id === id ? { ...d, ...patch } : d) })),
      deleteDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      addActivity: (a) => set((s) => ({ activities: [a, ...s.activities] })),
      updateActivity: (id, patch) => set((s) => ({ activities: s.activities.map((a) => a.id === id ? { ...a, ...patch, updatedAt: now() } : a) })),
      deleteActivity: (id) => set((s) => ({ activities: s.activities.filter((a) => a.id !== id) })),
      addPayment: (p) => set((s) => ({ payments: [p, ...s.payments] })),
      updatePayment: (id, patch) => set((s) => ({ payments: s.payments.map((x) => x.id === id ? { ...x, ...patch, updatedAt: now() } : x) })),
      deletePayment: (id) => set((s) => ({ payments: s.payments.filter((x) => x.id !== id) })),
    }),
    {
      name: "immo-invest-store-v2",
      version: 5,
      migrate: (persisted: any, _version: number) => {
        if (persisted && typeof persisted === "object") {
          persisted.documents = persisted.documents ?? [];
          persisted.activities = persisted.activities ?? [];
          persisted.payments = persisted.payments ?? [];
          if (Array.isArray(persisted.properties)) {
            const _mig = migrateLegacyStatus;
            persisted.properties = persisted.properties.map((p: any) => {
              if (p && (p.bewertung == null || p.prozessStatus == null)) {
                const mig = _mig(p.status);
                return { ...p, bewertung: p.bewertung ?? mig.bewertung, prozessStatus: p.prozessStatus ?? mig.prozessStatus };
              }
              return p;
            });
          }
        }
        return persisted;
      },
    },
  ),
);

export function useActiveProject(): Project {
  const { projects, activeProjectId } = useStore();
  return projects.find((p) => p.id === activeProjectId) ?? projects[0];
}

export function useActiveAssumptions(): Assumptions {
  const proj = useActiveProject();
  return proj?.assumptions ?? DEFAULT_ASSUMPTIONS;
}

export function makeEmptyProperty(partial: Partial<Property> = {}): Property {
  return {
    id: crypto.randomUUID(), projectId: "", status: "Neu", inseratsdatum: now(),
    link: "", platform: "", extractionStatus: "manuell", dataVerified: false, title: "",
    bezirk: "", adresse: "", city: "", land: "Österreich", lat: null, lng: null,
    objekttyp: "Wohnung", baujahr: null, mietrecht: "unklar – rechtlich prüfen",
    propertyType: "apartment",
    zustand: "", wohnflaecheM2: null, zimmer: null, kaufpreis: null,
    makler: "unklar", sanierung: 0, einrichtung: 0, reserve: 0,
    nettomieteMtl: null, nettomieteGeschaetzt: false,
    missingData: [], scoreLage: 15, scoreVermietbarkeit: 12, scoreZustand: 10,
    scoreRecht: 6, scoreWiederverkauf: 3, notizen: "",
    priority: "Mittel", sellerType: "unklar",
    bewertung: "Neu", prozessStatus: "",
    createdAt: now(), ...partial,
  };
}

export function makeActivity(partial: Partial<Activity> & { propertyId: string; type: ActivityType; title: string }): Activity {
  return {
    id: crypto.randomUUID(), date: now(), completed: false,
    createdAt: now(), description: "", ...partial,
  };
}
