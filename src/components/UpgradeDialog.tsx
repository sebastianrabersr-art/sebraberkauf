import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkle as Sparkles, Check } from "@phosphor-icons/react";
import { PLAN_PRICING } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { PLAN_HIGHLIGHTS } from "@/lib/planFeatures";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  recommendPlan?: "plus" | "premium";
}

const FEATURES = PLAN_HIGHLIGHTS;

export function UpgradeDialog({ open, onOpenChange, title, description, recommendPlan = "plus" }: Props) {
  const p = PLAN_PRICING[recommendPlan];
  const name = recommendPlan === "plus" ? "Plus" : "Premium";
  useEffect(() => { if (open) track("upgrade_modal_shown", { plan: recommendPlan }); }, [open, recommendPlan]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> {title ?? "Upgrade nötig"}
          </DialogTitle>
          <DialogDescription>
            {description ?? "Diese Funktion ist in deinem aktuellen Plan nicht enthalten."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="font-medium">{name}</div>
            <div className="text-right">
              <div className="font-semibold">{p.monthly.toString().replace(".", ",")} € <span className="text-xs font-normal text-muted-foreground">/ Monat</span></div>
              <div className="text-xs text-muted-foreground">oder {p.yearly.toString().replace(".", ",")} € / Jahr</div>
            </div>
          </div>
          <ul className="space-y-1 pt-1">
            {FEATURES[recommendPlan].map((f) => (
              <li key={f} className="flex gap-2 text-muted-foreground"><Check className="size-4 text-primary mt-0.5 shrink-0" />{f}</li>
            ))}
          </ul>
          <div className="text-xs text-muted-foreground pt-1">Spare mit jährlicher Zahlung.</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Später</Button>
          <Button asChild>
            <a href="/settings">Jetzt upgraden</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
