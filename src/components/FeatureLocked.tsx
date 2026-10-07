import { Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PLAN_PRICING } from "@/lib/auth";

export function FeatureLocked({
  title,
  description,
  recommendPlan = "plus",
}: {
  title: string;
  description: string;
  recommendPlan?: "plus" | "premium";
}) {
  const p = PLAN_PRICING[recommendPlan];
  const name = recommendPlan === "plus" ? "Plus" : "Premium";
  return (
    <div className="rounded-2xl border bg-card p-10 text-center max-w-xl mx-auto">
      <div className="size-12 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto">
        <Lock className="size-5" />
      </div>
      <h2 className="heading-section mt-4">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
      <div className="mt-5 rounded-lg border bg-muted/40 p-4 text-sm">
        <div className="font-medium">{name}</div>
        <div className="text-muted-foreground text-xs mt-1">
          {p.monthly.toString().replace(".", ",")} € / Monat ·{" "}
          {p.yearly.toString().replace(".", ",")} € / Jahr
        </div>
        <div className="text-xs text-muted-foreground">Spare mit jährlicher Zahlung.</div>
      </div>
      <Button asChild className="mt-5">
        <a href="/settings">Auf {name} upgraden</a>
      </Button>
    </div>
  );
}
