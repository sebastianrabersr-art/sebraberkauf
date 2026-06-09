import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  recommendPlan?: "plus" | "premium";
}

export function UpgradeDialog({ open, onOpenChange, title, description, recommendPlan = "plus" }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> {title ?? "Limit erreicht"}
          </DialogTitle>
          <DialogDescription>
            {description ?? "Du hast dein kostenloses Limit erreicht. Upgrade, um mehr Immobilien und Projekte zu verwalten."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-1">
          {recommendPlan === "plus" ? (
            <>
              <div className="font-medium">Plus · 4,99 € / Monat</div>
              <div className="text-muted-foreground">Bis zu 10 Immobilien, mehrere Projekte, Link- & PDF-Import, Finanzierungsszenarien.</div>
            </>
          ) : (
            <>
              <div className="font-medium">Premium · 19,99 € / Monat</div>
              <div className="text-muted-foreground">Unbegrenzt Immobilien & Projekte, CRM-Pipeline, Export, Prioritäts-Support.</div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Später</Button>
          <Button asChild>
            <Link to="/settings" search={{ tab: "plan" } as any}>Jetzt upgraden</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
