import { GLOSSARY } from "@/lib/glossary";
import { Info } from "@phosphor-icons/react";

export function GlossaryTooltip({ termId }: { termId: string }) {
  const term = GLOSSARY.find((t) => t.id === termId);
  if (!term) return null;
  return (
    <span className="relative group inline-flex items-center ml-1 align-middle">
      <Info weight="duotone" size={14} className="text-[#A8A29E] cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white border border-[#EAE6DF] rounded-[8px] p-3 text-[12px] text-[#78716C] leading-relaxed shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
        <span className="font-semibold text-[#1C1917] block mb-1">{term.term}</span>
        {term.short}
        <a href="/glossar" className="text-[#2D6A4F] block mt-1 text-[11px]">Im Glossar lesen →</a>
      </span>
    </span>
  );
}
