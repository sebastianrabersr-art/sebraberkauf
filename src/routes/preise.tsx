import { createFileRoute, redirect } from "@tanstack/react-router";

/** Alte bzw. deutsche URL – die Preisseite lebt unter /pricing (eine URL, keine doppelten Inhalte). */
export const Route = createFileRoute("/preise")({
  beforeLoad: () => {
    throw redirect({ to: "/pricing", statusCode: 301 });
  },
});
