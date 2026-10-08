import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CookieBanner } from "@/components/CookieBanner";
import { NotFoundPage } from "@/components/marketing/NotFoundPage";
import { IconContext, type IconProps } from "@phosphor-icons/react";

const ICON_DEFAULTS: IconProps = { weight: "duotone", size: 24 };

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "kaufma – Immobilien-Rechner & CRM" },
      { name: "description", content: "Rechne Wohnungen als Kapitalanlage durch: Rendite, Cashflow, Kaufnebenkosten und Mietrecht-Risiko – für Käufer in Österreich und Deutschland." },
      { property: "og:title", content: "kaufma – Immobilien-Rechner & CRM" },
      { name: "twitter:title", content: "kaufma – Immobilien-Rechner & CRM" },
      { property: "og:description", content: "Rechne Wohnungen als Kapitalanlage durch: Rendite, Cashflow, Kaufnebenkosten und Mietrecht-Risiko – für Käufer in Österreich und Deutschland." },
      { name: "twitter:description", content: "Rechne Wohnungen als Kapitalanlage durch: Rendite, Cashflow, Kaufnebenkosten und Mietrecht-Risiko – für Käufer in Österreich und Deutschland." },
      // Erzeugt aus public/og-image.html (1200 × 630)
      { property: "og:image", content: "https://kaufma.eu/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "kaufma – Immobilien durchrechnen" },
      { name: "twitter:image:alt", content: "kaufma – Immobilien durchrechnen" },
      { name: "twitter:image", content: "https://kaufma.eu/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/favicon.png" },
      // Kurzbeschreibung für Sprachmodelle / KI-Suchen (public/llms.txt)
      { rel: "alternate", type: "text/plain", href: "https://kaufma.eu/llms.txt", title: "LLM Info" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600&display=swap" },
    ],
    // Google Analytics wird erst nach Einwilligung von <CookieBanner /> geladen.
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="heading-page-sm">Ein Fehler ist aufgetreten</h1>
        <p className="text-muted-foreground mt-2 text-sm">{error.message}</p>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/demo",
  "/pricing",
  "/preise",
  "/faq",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerruf",
  "/kontakt",
  "/login",
  "/signup",
  "/auth-callback",
  "/reset-password",
]);

const PUBLIC_PREFIXES = ["/rechner", "/ratgeber"];
const APP_PREFIXES = [
  "/app",
  "/dashboard",
  "/kaufkandidaten",
  "/vergleich",
  "/pipeline",
  "/portfolio",
  "/projects",
  "/projekte",
  "/properties",
  "/kaufkandidaten",
  "/settings",
  "/einstellungen",
  "/account",
  "/analyze",
  "/assumptions",
  "/checkout/return",
  "/followups",
  "/from-calc",
  "/onboarding",
  "/viewing",
];

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Signal für E2E-Tests: React hat die server-gerenderte Seite übernommen.
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLInputElement | null;
      if (!t || t.tagName !== "INPUT") return;
      if (t.type !== "number") return;
      // Select all on focus; if user types, the existing value (incl. "0") is replaced.
      setTimeout(() => {
        try {
          if (t.value === "0") {
            // Clear "0" so it isn't kept as a prefix when user starts typing digits.
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            setter?.call(t, "");
            t.dispatchEvent(new Event("input", { bubbles: true }));
          } else {
            t.select();
          }
        } catch {}
      }, 0);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      {/* Ein Icon-System: Phosphor Duotone. 24px entspricht der früheren lucide-Standardgröße;
          Tailwind-Größenklassen (size-4 …) überschreiben das wie gehabt. */}
      <IconContext.Provider value={ICON_DEFAULTS}>
        <AuthProvider>
          <GatedOutlet />
          <Toaster position="top-right" richColors />
          <CookieBanner />
        </AuthProvider>
      </IconContext.Provider>
    </QueryClientProvider>
  );
}

function GatedOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, profile, loading } = useAuth();
  const isPublic = PUBLIC_EXACT_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => matchesPath(pathname, p));
  const needsAuth = APP_PREFIXES.some((p) => matchesPath(pathname, p));  if (isPublic) return <Outlet />;
  if (!needsAuth) return <Outlet />;
  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Lade…</div>;
  }
  if (!session) {
    if (typeof window !== "undefined") {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
    }
    return null;
  }
  // Check onboarding — use localStorage as fallback in case DB update is slow
  const onboardingDone = profile?.onboarding_completed || (typeof window !== "undefined" && localStorage.getItem("onboarding_done") === "true");
  if (!loading && profile && !onboardingDone && pathname !== "/onboarding") {
    if (typeof window !== "undefined") window.location.href = "/onboarding";
    return null;
  }
  return <Outlet />;
}
