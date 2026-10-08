import { useState } from "react";
import { planLimits, useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import type { Property } from "@/lib/types";

/** Demo-Objekte sind Beispiele und zählen nicht gegen das Plan-Limit. */
export const countsTowardLimit = (p: Pick<Property, "isDemo">) => !p.isDemo;

/**
 * Eine Stelle für das Immobilien-Limit – von allen Anlage-Wegen genutzt
 * (manuell, Link, Text, Excel, Duplizieren, aus dem Rechner, Portfolio).
 * `guard(n)` gibt false zurück und öffnet den Upgrade-Dialog, wenn n weitere Objekte nicht passen.
 * Den `dialog` muss die aufrufende Komponente rendern.
 */
export function usePropertyLimit() {
  const { subscription } = useAuth();
  const properties = useStore((s) => s.properties);
  const [open, setOpen] = useState(false);
  const plan = subscription?.plan;
  const limit = planLimits(plan).properties;
  const used = properties.filter(countsTowardLimit).length;
  const remaining = limit == null ? Infinity : Math.max(0, limit - used);

  const guard = (adding = 1) => {
    if (remaining >= adding) return true;
    setOpen(true);
    return false;
  };

  const dialog = (
    <UpgradeDialog
      open={open}
      onOpenChange={setOpen}
      title="Limit erreicht"
      description={`Dein Plan erlaubt ${limit} Immobilie${limit === 1 ? "" : "n"}. Lösch ein Objekt oder upgrade, um weitere anzulegen.`}
      recommendPlan={plan === "plus" ? "premium" : "plus"}
    />
  );

  return { limit, used, remaining, guard, dialog };
}
