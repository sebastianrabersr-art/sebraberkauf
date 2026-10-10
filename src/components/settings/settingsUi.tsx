import type { ReactNode } from "react";

/* Gemeinsame Bausteine der Einstellungs-Tabs – gleiche Optik wie die bestehenden Abschnitte. */

export const btnPrimaryCls =
  "inline-flex items-center justify-center gap-2 rounded-[8px] bg-primary px-[18px] py-[9px] text-[13px] font-medium text-white hover:bg-[#235740] disabled:opacity-60";
export const btnSecondaryCls =
  "inline-flex items-center justify-center gap-2 rounded-[8px] bg-white border-[1.5px] border-[#EAE6DF] px-[18px] py-[9px] text-[13px] text-[#1C1917] hover:border-[#1C1917] disabled:opacity-60";
export const btnDangerCls =
  "inline-flex items-center justify-center gap-2 rounded-[8px] bg-white border-[1.5px] border-destructive px-[18px] py-[9px] text-[13px] text-destructive hover:bg-[#FEF2F2] disabled:opacity-60";

/** Weiße Karte, 1px #EAE6DF, Radius 12. */
export function SettingsCard({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <section id={id} className="bg-white scroll-mt-6" style={{ border: "1px solid #EAE6DF", borderRadius: 12, padding: "20px 24px" }}>
      {children}
    </section>
  );
}

/** Titel (Inter 14/600) und Beschreibung (Inter 13, #78716C). */
export function SettingsHeading({ title, description, aside }: { title: string; description?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-sans text-[14px] font-semibold text-[#1C1917]">{title}</h2>
        {description && <p className="mt-1 font-sans text-[13px] leading-relaxed text-[#78716C]">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Schalter wie im Profil-Tab (Aus-Zustand mit 3:1-Kontrast gegen Weiß). */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
      style={{ background: checked ? "#2D6A4F" : "#8A837D" }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}
