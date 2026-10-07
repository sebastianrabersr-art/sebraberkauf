import { toast } from "sonner";
import { migrateLegacyStatus, type Property, type PropertyStatus, type ProzessStatus } from "./types";

/*
 * Ein Objekt hat drei Status-Felder: den älteren `status` (Dropdown "Objektdaten",
 * Kaufkandidaten-Liste, DB-Spalte), `bewertung` und `prozessStatus` (Pipeline-Spalten
 * und CRM-Tab). CRM und Pipeline lesen denselben Store und sind damit live synchron –
 * diese Helfer sorgen dafür, dass die Felder untereinander konsistent bleiben, egal wo
 * der Status geändert wird.
 */

const PROZESS_TO_STATUS: Record<Exclude<ProzessStatus, "">, PropertyStatus> = {
  "Kontaktiert": "Verkäufer kontaktiert",
  "Besichtigung": "Besichtigung geplant",
  "Finanzierung": "Finanzierung prüfen",
  "Angebot & Verhandlung": "In Verhandlung",
  "Gekauft": "Gekauft",
  "Abgelehnt": "Abgelehnt",
};

export const isBought = (p: Property) => p.status === "Gekauft" || p.prozessStatus === "Gekauft";

/** Im Portfolio: gekauft und Aufnahme nicht zurückgestellt (Altbestand ohne Flag zählt mit). */
export const isInPortfolio = (p: Property) => isBought(p) && p.inPortfolio !== false;

/** Patch für einen neuen Prozess-Status (CRM-Tab, Pipeline). */
export function prozessStatusPatch(p: Property, ps: ProzessStatus): Partial<Property> {
  if (ps === "Gekauft") {
    // Neu gekauft → Portfolio-Aufnahme erst nach Bestätigung; schon gekauft → Flag behalten.
    return { prozessStatus: "Gekauft", status: "Gekauft", inPortfolio: isBought(p) ? p.inPortfolio : false };
  }
  const patch: Partial<Property> = { prozessStatus: ps };
  if (ps) {
    patch.status = PROZESS_TO_STATUS[ps];
  } else if (migrateLegacyStatus(p.status).prozessStatus) {
    // Aus der Pipeline genommen: Alt-Status darf keine Prozess-Phase (z. B. "Gekauft") mehr zeigen.
    patch.status = "Interessant";
  }
  return patch;
}

/** Patch für den älteren Status (Dropdown "Objektdaten"): Bewertung und Prozess mitziehen. */
export function legacyStatusPatch(p: Property, status: PropertyStatus): Partial<Property> {
  const m = migrateLegacyStatus(status);
  if (m.prozessStatus === "Gekauft") return { ...prozessStatusPatch(p, "Gekauft"), bewertung: m.bewertung };
  return { status, bewertung: m.bewertung, prozessStatus: m.prozessStatus };
}

/** Patch für "Ja, ins Portfolio": Kaufdatum heute, Kaufpreis aus den Objektdaten (vorhandene Werte bleiben). */
export function portfolioAddPatch(p: Property): Partial<Property> {
  const pi = p.purchase ?? {};
  return {
    inPortfolio: true,
    purchase: {
      ...pi,
      kaufdatum: pi.kaufdatum || new Date().toISOString().slice(0, 10),
      tatsKaufpreis: pi.tatsKaufpreis ?? p.kaufpreis ?? null,
    },
  };
}

/**
 * Nach "Gekauft": fragen, ob das Objekt ins Portfolio soll. Nichts tun, wenn es schon drin ist.
 * `wasBought` = Zustand vor der Änderung (sonst würde jede erneute Auswahl erneut fragen).
 */
export function promptAddToPortfolio(
  p: Property,
  wasBought: boolean,
  update: (id: string, patch: Partial<Property>) => void,
  openPortfolio: (id: string) => void,
) {
  if (wasBought && p.inPortfolio !== false) return;
  toast("Zum Portfolio hinzufügen?", {
    description: `${p.title || "Objekt"} – Kaufdatum heute, Kaufpreis ${p.kaufpreis ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(p.kaufpreis) : "aus den Objektdaten"}.`,
    duration: 15000,
    action: {
      label: "Ja, hinzufügen",
      onClick: () => {
        update(p.id, portfolioAddPatch(p));
        toast.success("Im Portfolio", { action: { label: "Öffnen", onClick: () => openPortfolio(p.id) } });
      },
    },
    cancel: { label: "Später", onClick: () => {} },
  });
}
