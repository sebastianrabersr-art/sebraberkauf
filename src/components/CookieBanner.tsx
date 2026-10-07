import { useEffect, useState } from "react";

const GA_MEASUREMENT_ID = "G-NNNJS5L2K6";
const CONSENT_KEY = "cookie_consent";
const OPEN_EVENT = "kaufma:open-cookie-settings";

type Consent = "accepted" | "declined";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

function writeConsent(v: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* Privater Modus o. Ä.: Entscheidung gilt dann nur für diese Seite. */
  }
}

let gaLoaded = false;

/** Lädt gtag.js – nur aufrufen, wenn die Einwilligung vorliegt. */
function loadGoogleAnalytics() {
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  if (gaLoaded) return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js erwartet das arguments-Objekt, kein Array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

/** Bei Widerruf: Tracking auf dieser Seite stoppen und GA-Cookies entfernen. */
function disableGoogleAnalytics() {
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

/** Öffnet den Banner erneut, z. B. über einen „Cookie-Einstellungen“-Link. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieBanner() {
  // Erst nach dem Mount entscheiden: localStorage gibt es beim SSR nicht.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    if (consent === "accepted") loadGoogleAnalytics();
    if (consent === null) setVisible(true);
    const open = () => setVisible(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const choose = (v: Consent) => {
    writeConsent(v);
    if (v === "accepted") loadGoogleAnalytics();
    else disableGoogleAnalytics();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie-Hinweis"
      className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-[#EAE6DF] px-6 py-4"
    >
      <div className="mx-auto max-w-6xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
        <p className="max-w-[600px] text-[13px] leading-relaxed text-ink-2" style={{ fontFamily: "Inter, sans-serif" }}>
          Wir verwenden Cookies für Analyse und Verbesserungen unserer Plattform. Mehr dazu in der{" "}
          <a href="/datenschutz" className="underline text-[#1C1917] hover:text-[#2D6A4F]">Datenschutzerklärung</a>.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row shrink-0">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="rounded-[8px] border-[1.5px] border-[#EAE6DF] bg-white px-4 py-2 text-[13px] text-[#1C1917] hover:border-[#1C1917]"
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-[8px] bg-[#2D6A4F] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#235740]"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
