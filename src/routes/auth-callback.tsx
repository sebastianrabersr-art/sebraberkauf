import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth-callback")({
  component: Callback,
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "" }),
});

function Callback() {
  const { redirect } = Route.useSearch();
  useEffect(() => {
    (async () => {
      // Session may be set already by OAuth broker / detectSessionInUrl
      const { data } = await supabase.auth.getSession();
      const target = redirect || (data.session ? "/dashboard" : "/login");
      window.location.replace(target);
    })();
  }, [redirect]);
  return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Anmeldung wird abgeschlossen…</div>;
}
