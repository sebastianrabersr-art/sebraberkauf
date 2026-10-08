import { createFileRoute, redirect } from "@tanstack/react-router";

// Die Besichtigungs-Checkliste lebt im Tab „Besichtigung“ jedes Objekts – alte Links zur Kandidatenliste.
export const Route = createFileRoute("/viewing")({
  beforeLoad: () => {
    throw redirect({ to: "/properties", replace: true });
  },
});