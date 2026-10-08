import { useState } from "react";

export function Logo({ size = 32, textSize = 16 }: { size?: number; textSize?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex items-center gap-2">
      {failed ? (
        <span className="flex items-center gap-1">
          <span
            className="font-bold tracking-tight text-[#1C1917] leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: textSize + 8 }}
          >
            kaufma
          </span>
          <span className="inline-block size-[7px] rounded-full bg-[#2D6A4F]" />
        </span>
      ) : (
        <>
          <img
            src="/favicon.png"
            alt="kaufma Logo"
            width={size}
            height={size}
            className="rounded-full"
            style={{ width: size, height: size }}
            onError={() => setFailed(true)}
          />
          <span
            className="text-[#1C1917] leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: textSize }}
          >
            kaufma
          </span>
        </>
      )}
    </span>
  );
}
