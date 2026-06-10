import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "kauf ma – Immobilien-Rechner & CRM" },
      { name: "description", content: "Bewerte Immobilien blitzschnell: Rendite, Cashflow, Mietrecht-Risiko. Importiere Inserate oder PDFs." },
      { property: "og:title", content: "kauf ma – Immobilien-Rechner & CRM" },
      { name: "twitter:title", content: "kauf ma – Immobilien-Rechner & CRM" },
      { property: "og:description", content: "Bewerte Immobilien blitzschnell: Rendite, Cashflow, Mietrecht-Risiko. Importiere Inserate oder PDFs." },
      { name: "twitter:description", content: "Bewerte Immobilien blitzschnell: Rendite, Cashflow, Mietrecht-Risiko. Importiere Inserate oder PDFs." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/51532ee0-3a7b-4d03-a1c6-62ca00f544f5/id-preview-cfcaa651--0b41fa67-2b89-4ed5-b794-1a44c3f28cfd.lovable.app-1781106350122.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/51532ee0-3a7b-4d03-a1c6-62ca00f544f5/id-preview-cfcaa651--0b41fa67-2b89-4ed5-b794-1a44c3f28cfd.lovable.app-1781106350122.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="text-3xl font-semibold">Nicht gefunden</h1>
        <p className="text-muted-foreground mt-2">Diese Seite existiert nicht.</p>
        <a href="/" className="inline-block mt-4 text-primary underline">Zur Startseite</a>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Ein Fehler ist aufgetreten</h1>
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GatedOutlet />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function GatedOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, profile, loading } = useAuth();
  const isPublic = PUBLIC_EXACT_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => matchesPath(pathname, p));
  const needsAuth = APP_PREFIXES.some((p) => matchesPath(pathname, p));

  if (isPublic) return <Outlet />;
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
  if (profile && !profile.onboarding_completed && pathname !== "/onboarding") {
    if (typeof window !== "undefined") window.location.href = "/onboarding";
    return null;
  }
  return <Outlet />;
}
