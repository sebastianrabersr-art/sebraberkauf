import { useState } from "react";
import { Info } from "@phosphor-icons/react";
import { GLOSSARY } from "@/lib/glossary";

export function GlossaryTooltip({ termId }: { termId: string }) {
  const term = GLOSSARY.find((t) => t.id === termId);
  const [show, setShow] = useState(false);
  if (!term) return null;
  return (
    <span className="relative inline-flex items-center ml-1" style={{ verticalAlign: "middle" }}>
      <Info
        weight="duotone"
        size={14}
        className="text-ink-3 cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "240px",
          background: "white",
          border: "1px solid #EAE6DF",
          borderRadius: "8px",
          padding: "10px 12px",
          fontSize: "12px",
          color: "var(--ink-2)",
          lineHeight: "1.5",
          zIndex: 9999,
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontWeight: 600, color: "#1C1917", display: "block", marginBottom: "4px" }}>{term.term}</span>
          {term.short}
          <a href="/glossar" style={{ color: "#2D6A4F", display: "block", marginTop: "6px", fontSize: "11px", pointerEvents: "auto" }}>Im Glossar lesen →</a>
        </span>
      )}
    </span>
  );
}
