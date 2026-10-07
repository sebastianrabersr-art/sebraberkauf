// Eigene Navigations-Icons (Sidebar + mobile Navigation).
// 18×18-Raster, 1.5er Strich, Farbe über `color` (Standard: currentColor).

type IconProps = { size?: number; color?: string };

export const IconDashboard = ({ size = 18, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="10" y="2" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="2" y="10" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="10" y="10" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity="0.2" />
  </svg>
);

export const IconKaufkandidaten = ({ size = 18, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 2L16 8V16H2V8Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 12L8 14L12 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconVergleichen = ({ size = 18, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="5" height="10" rx="1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="10" y="7" width="5" height="8" rx="1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="1" y1="15" x2="17" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconRechner = ({ size = 18, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="14" height="14" rx="2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="2" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="9" y1="2" x2="9" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconPipeline = ({ size = 18, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="3" cy="6" r="2" stroke={color} strokeWidth="1.5" />
    <circle cx="9" cy="6" r="2" stroke={color} strokeWidth="1.5" />
    <circle cx="15" cy="6" r="2" stroke={color} strokeWidth="1.5" />
    <line x1="5" y1="6" x2="7" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="11" y1="6" x2="13" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="3" y1="8" x2="3" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="9" y1="8" x2="9" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="15" y1="8" x2="15" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconPortfolio = ({ size = 18, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <rect x="2" y="7" width="4" height="9" rx="1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="7" y="4" width="4" height="12" rx="1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="12" y="9" width="4" height="7" rx="1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconProjekte = ({ size = 18, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M2 7H16V15C16 15.55 15.55 16 15 16H3C2.45 16 2 15.55 2 15V7Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 7V6C2 5.45 2.45 5 3 5H7L9 3H15C15.55 3 16 3.45 16 4V7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconGlossar = ({ size = 18, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 3C9 3 5 4 3 6V15C5 13 9 13 9 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 3C9 3 13 4 15 6V15C13 13 9 13 9 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="9" y1="3" x2="9" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Schieberegler: Die Linien setzen an den Kreisen aus, statt sie mit weißer Füllung zu
// verdecken – so stimmt das Icon auf jedem Hintergrund (Sidebar-Creme, aktiver Grünton).
export const IconEinstellungen = ({ size = 18, color = "currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <line x1="2" y1="6" x2="3.5" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8.5" y1="6" x2="16" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="6" cy="6" r="2.5" stroke={color} strokeWidth="1.5" />
    <line x1="2" y1="12" x2="9.5" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14.5" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth="1.5" />
  </svg>
);
