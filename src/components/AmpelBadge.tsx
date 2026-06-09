import { cn } from "@/lib/utils";

export function AmpelBadge({ ampel, children }: { ampel: "green" | "yellow" | "red" | "gray"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        ampel === "green" && "bg-success/15 text-success",
        ampel === "yellow" && "bg-warning/20 text-warning-foreground border border-warning/40",
        ampel === "red" && "bg-destructive/15 text-destructive",
        ampel === "gray" && "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          ampel === "green" && "bg-success",
          ampel === "yellow" && "bg-warning",
          ampel === "red" && "bg-destructive",
          ampel === "gray" && "bg-muted-foreground",
        )}
      />
      {children}
    </span>
  );
}
