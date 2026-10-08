import { createFileRoute, redirect } from "@tanstack/react-router";

// Fällige Follow-ups stehen auf dem Dashboard und pro Objekt im CRM-Tab – alte Links weiterleiten.
export const Route = createFileRoute("/followups")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
});