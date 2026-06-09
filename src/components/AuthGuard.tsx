import { useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!session) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
      return;
    }
    if (profile && !profile.onboarding_completed && pathname !== "/onboarding") {
      window.location.href = "/onboarding";
    }
  }, [loading, session, profile, pathname]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Lade…</div>;
  }
  if (!session) return null;
  return <>{children}</>;
}
