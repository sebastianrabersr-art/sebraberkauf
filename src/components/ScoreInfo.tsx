import { Info } from "lucide-react";

export const SCORE_TOOLTIP =
  "Der Score bewertet eine Immobilie als Kaufkandidat. Er setzt sich aus Lage, Zahlen/Rendite, Vermietbarkeit, Zustand, Mietrecht/Risiko und Wiederverkaufbarkeit zusammen. Er ist nur eine Orientierung und ersetzt keine professionelle Prüfung.";

export function ScoreInfo({ className = "" }: { className?: string }) {
  return (
    <span
      title={SCORE_TOOLTIP}
      aria-label="Was bedeutet der Score?"
      className={`inline-flex items-center text-muted-foreground hover:text-foreground cursor-help ${className}`}
    >
      <Info className="size-3.5" />
    </span>
  );
}
