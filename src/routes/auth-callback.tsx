import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmail } from "@/lib/welcome-email.functions";

export const Route = createFileRoute("/auth-callback")({
  component: Callback,
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "" }),
});

function Callback() {
  const { redirect } = Route.useSearch();
  useEffect(() => {
    let done = false;
    const finish = (hasSession: boolean) => {
      if (done) return;
      done = true;
      let target = redirect || "/dashboard";
      try {
        if (hasSession && localStorage.getItem("pending_calc_v1")) target = "/from-calc";
      } catch {}
      if (hasSession) {
        sendWelcomeEmail().catch((e) => console.warn("welcome email failed", e));
      }
      window.location.replace(hasSession ? target : "/login");
    };

    // 1) Listen for SIGNED_IN in case the broker is still processing the URL
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "SIGNED_IN" && sess) finish(true);
    });

    // 2) Check immediately
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
    });

    // 3) Poll briefly as a fallback (some brokers populate session async)
    let tries = 0;
    const iv = setInterval(async () => {
      tries += 1;
      const { data } = await supabase.auth.getSession();
      if (data.session) finish(true);
      else if (tries >= 10) finish(false); // ~5s
    }, 500);

    return () => {
      sub.subscription.unsubscribe();
      clearInterval(iv);
    };
  }, [redirect]);
  return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Anmeldung wird abgeschlossen…</div>;
}
