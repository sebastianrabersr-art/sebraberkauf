import { Lock } from "@phosphor-icons/react";
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
    <div className="rounded-[16px] border border-[#EAE6DF] bg-white p-8 sm:p-10 text-center max-w-xl mx-auto">
      <div className="size-12 rounded-full bg-[#E8F5EE] text-primary grid place-items-center mx-auto">
        <Lock className="size-5" aria-hidden />
      </div>
      <h2 className="heading-section mt-4">{title}</h2>
      <p className="text-[14px] text-ink-2 mt-2">{description}</p>
      <div className="mt-5 rounded-[12px] border border-[#EAE6DF] bg-[#FAFAF8] p-4 text-[14px]">
        <div className="font-medium text-[#1C1917]">{name}</div>
        <div className="text-ink-2 text-[13px] mt-1">
          {p.monthly.toString().replace(".", ",")} € / Monat oder {p.yearly.toString().replace(".", ",")} € / Jahr
        </div>
        <div className="text-[12px] text-ink-2">Mit jährlicher Zahlung sparst du zwei Monate.</div>
      </div>
      <a
        href="/settings"
        className="mt-5 inline-flex items-center justify-center rounded-[8px] bg-primary px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#235740] transition-colors"
      >
        Auf {name} upgraden
      </a>
    </div>
  );
}
