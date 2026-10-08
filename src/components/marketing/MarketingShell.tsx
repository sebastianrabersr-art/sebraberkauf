import { type ReactNode, useEffect, useId, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { List, X } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { openCookieSettings } from "@/components/CookieBanner";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/demo", label: "Demo" },
  { href: "/rechner", label: "Rechner" },
  { href: "/ratgeber", label: "Ratgeber" },
  { href: "/pricing", label: "Preise" },
  { href: "/faq", label: "FAQ" },
];

function isActive(pathname: string, href: string) {
  if (href.startsWith("/#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Feste "Kostenlos starten"-Leiste auf dem Handy: Startseite, Rechner-Übersicht, Ratgeber.
 * Nicht auf den Einzelrechnern (/rechner/…) – dort steht schon die feste Ergebnisleiste.
 */
function showsStickyCta(pathname: string) {
  return pathname === "/" || pathname === "/rechner" || pathname === "/ratgeber" || pathname.startsWith("/ratgeber/");
}

export function MarketingShell({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const stickyCta = !loading && !session && showsStickyCta(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  // Menü schließen bei Seitenwechsel und mit Escape
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const primaryCta = session
    ? { href: "/dashboard", label: "Zum Dashboard" }
    : { href: "/signup", label: "Kostenlos starten" };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-[#EAE6DF] bg-[#F5F3EE]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center shrink-0" aria-label="kaufma – Startseite">
            <Logo size={32} textSize={16} />
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm" aria-label="Hauptnavigation">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                aria-current={isActive(pathname, n.href) ? "page" : undefined}
                className="text-ink-2 hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:font-medium"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!session && (
              <a href="/login" className={`${stickyCta ? "inline-flex" : "hidden sm:inline-flex"} text-sm px-3 py-2 text-ink-2 hover:text-foreground`}>Login</a>
            )}
            {/* Mit fester CTA-Leiste unten keinen zweiten grünen Button im mobilen Header */}
            <a
              href={primaryCta.href}
              className={`${stickyCta ? "hidden md:inline-flex" : "inline-flex"} rounded-[8px] bg-[#2D6A4F] text-white px-3.5 sm:px-4 py-2 text-sm font-medium hover:bg-[#235740] transition-colors whitespace-nowrap`}
            >
              {primaryCta.label}
            </a>
            <button
              type="button"
              className="md:hidden -mr-2 inline-flex size-11 items-center justify-center rounded-[8px] text-[#1C1917] hover:bg-[#EAE6DF]"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
            </button>
          </div>
        </div>

        {/* Mobiles Menü: klappt unter dem Header auf, ohne Overlay über die Seite */}
        <nav
          id={menuId}
          aria-label="Hauptnavigation"
          hidden={!menuOpen}
          className="md:hidden border-t border-[#EAE6DF] bg-[#F5F3EE]"
        >
          <ul className="max-w-6xl mx-auto px-4 py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(pathname, n.href) ? "page" : undefined}
                  className="flex min-h-[48px] items-center border-b border-[#EAE6DF] text-[16px] text-[#1C1917] aria-[current=page]:font-semibold aria-[current=page]:text-[#2D6A4F]"
                >
                  {n.label}
                </a>
              </li>
            ))}
            {!session && (
              <li>
                <a href="/login" onClick={() => setMenuOpen(false)} className="flex min-h-[48px] items-center text-[16px] text-ink-2">
                  Login
                </a>
              </li>
            )}
          </ul>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 text-sm text-muted-foreground flex flex-wrap gap-6 justify-between">
          <span>© {new Date().getFullYear()} kaufma</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Fußzeile">
            <a href="/rechner" className="hover:text-foreground">Rechner</a>
            <a href="/ratgeber" className="hover:text-foreground">Ratgeber</a>
            <a href="/pricing" className="hover:text-foreground">Preise</a>
            <a href="/glossar" className="hover:text-foreground">Glossar</a>
            <a href="/impressum" className="hover:text-foreground">Impressum</a>
            <a href="/datenschutz" className="hover:text-foreground">Datenschutz</a>
            <a href="/agb" className="hover:text-foreground">AGB</a>
            <a href="/widerruf" className="hover:text-foreground">Widerruf</a>
            <a href="/kontakt" className="hover:text-foreground">Kontakt</a>
            <button type="button" onClick={openCookieSettings} className="hover:text-foreground">Cookie-Einstellungen</button>
          </nav>
          <a href="mailto:hallo@kaufma.eu" className="w-full md:w-auto md:text-right hover:text-foreground">hallo@kaufma.eu</a>
          <span className="w-full md:w-auto md:text-right">Hinweis: kaufma ersetzt keine Rechts-, Steuer- oder Finanzberatung.</span>
        </div>
        {/* Platz für die feste CTA-Leiste, damit die Fußzeile nicht verdeckt wird */}
        {stickyCta && <div aria-hidden className="md:hidden h-[calc(72px+env(safe-area-inset-bottom))]" />}
      </footer>

      {stickyCta && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[#EAE6DF] bg-white px-4 pt-3"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
        >
          <a
            href="/signup"
            className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#2D6A4F] text-[15px] font-semibold text-white transition-colors hover:bg-[#235740] active:bg-[#235740]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Kostenlos starten
          </a>
        </div>
      )}
    </div>
  );
}
