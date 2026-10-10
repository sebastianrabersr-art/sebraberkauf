import { CATEGORY_BADGE, CATEGORY_LABEL, propertyCategory } from "@/lib/propertyKinds";
import type { Property } from "@/lib/types";

/** Kleines Typ-Abzeichen (Wohnung, Haus, Zinshaus, Büro …) für Listen und Karten. */
export function PropertyTypeBadge({ p, className = "" }: { p: Pick<Property, "propertyType">; className?: string }) {
  const cat = propertyCategory(p.propertyType);
  const c = CATEGORY_BADGE[cat];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[12px] font-medium leading-none whitespace-nowrap ${className}`}
      style={{ background: c.bg, color: c.fg }}
    >
      {CATEGORY_LABEL[cat]}
    </span>
  );
}
