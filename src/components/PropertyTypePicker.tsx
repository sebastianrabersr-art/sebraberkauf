import { Building, Buildings, Desk, Garage, House, MapTrifold, Warehouse, type Icon } from "@phosphor-icons/react";
import { CATEGORY_GROUPS, propertyCategory, type PropertyCategory } from "@/lib/propertyKinds";
import type { PropertyType } from "@/lib/types";

const ICONS: Record<PropertyCategory, Icon> = {
  wohnung: Building,
  haus: House,
  zinshaus: Buildings,
  buero: Desk,
  lager: Warehouse,
  garage: Garage,
  grundstueck: MapTrifold,
};

/**
 * Objektart wählen: zwei Gruppen (Wohnen / Gewerbe & Sonstiges), Karten im Stil der Strategie-Auswahl.
 * "Haus" deckt beide Haus-Varianten ab; die Aufteilung Haus + Grundstück wählst du später im Objekt.
 */
export function PropertyTypePicker({ value, onChange }: { value: PropertyType; onChange: (t: PropertyType) => void }) {
  const activeCategory = propertyCategory(value);
  return (
    <div className="space-y-4">
      {CATEGORY_GROUPS.map((g) => (
        <fieldset key={g.title}>
          <legend className="mb-2 text-[13px] font-medium text-[#1C1917]">{g.title}</legend>
          <div role="radiogroup" aria-label={g.title} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {g.options.map((o) => {
              const active = activeCategory === o.category;
              const Ico = ICONS[o.category];
              return (
                <button
                  key={o.category}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(o.type)}
                  className="flex items-center gap-3 rounded-[12px] border-[1.5px] px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  style={{ borderColor: active ? "#2D6A4F" : "#EAE6DF", background: active ? "#E8F5EE" : "white" }}
                >
                  <span className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: active ? "#2D6A4F" : "#F5F3EE" }}>
                    <Ico className="size-4" style={{ color: active ? "white" : "var(--ink-2)" }} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold" style={{ color: active ? "#2D6A4F" : "#1C1917" }}>{o.label}</span>
                    <span className="block text-[12px] text-ink-3">{o.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
