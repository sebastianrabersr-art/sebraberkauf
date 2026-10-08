import { createFileRoute, redirect } from "@tanstack/react-router";

// Follow-ups stehen auf dem Dashboard, Besichtigungen im Tab „Besichtigung“ jedes Objekts – alte Links weiterleiten.
export const Route = createFileRoute("/aktivitaeten")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
});