import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

/**
 * Wrap app shell content. Redirects to /login if not signed-in,
 * and to /onboarding if signed-in but onboarding not completed
 * (except when already on /onboarding).
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", search: { redirect: pathname } as any });
      return;
    }
    if (profile && !profile.onboarding_completed && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [loading, session, profile, pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Lade…
      </div>
    );
  }
  if (!session) return null;
  return <>{children}</>;
}
