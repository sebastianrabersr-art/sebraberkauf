import { createFileRoute, redirect } from "@tanstack/react-router";

// Annahmen leben jetzt als Tab unter /settings – alte Links weiterleiten.
export const Route = createFileRoute("/assumptions")({
  beforeLoad: () => {
    throw redirect({ to: "/settings", search: { tab: "annahmen" }, replace: true });
  },
});
