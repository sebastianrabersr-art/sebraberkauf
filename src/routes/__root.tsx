import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { setAnalyticsContext, trackPageView } from "@/lib/analytics";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "kauf ma – Immobilien-Rechner & CRM" },
      { name: "description", content: "Bewerte Immobilien blitzschnell: Rendite, Cashflow, Mietrecht-Risiko. Importiere Inserate oder PDFs." },
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

const PUBLIC_PATHS = ["/", "/login", "/signup", "/pricing", "/faq", "/auth-callback", "/reset-password", "/legal"];

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
  const { session, profile, subscription, loading } = useAuth();

  // Keep analytics context fresh + emit page_view per route change.
  useEffect(() => {
    setAnalyticsContext({ loggedIn: !!session, plan: subscription?.plan ?? null });
  }, [session, subscription?.plan]);
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  const isPublic =
    PUBLIC_PATHS.some((p) => p === pathname) ||
    pathname.startsWith("/legal") ||
    pathname === "/ratgeber" ||
    pathname.startsWith("/ratgeber/") ||
    pathname === "/rechner" ||
    pathname.startsWith("/rechner/");

  if (isPublic) return <Outlet />;
  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Lade…</div>;
  }
  if (!session) {
    if (typeof window !== "undefined") {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
    }
    return null;
  }
  if (profile && !profile.onboarding_completed && pathname !== "/onboarding" && pathname !== "/from-calc") {
    if (typeof window !== "undefined") window.location.href = "/onboarding";
    return null;
  }
  return <Outlet />;
}
