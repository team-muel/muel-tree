"use client";

import type { GomdoriOriginalAbility } from "@/config/gomdori-roles";

// 구현상태 배지 — 원본 대비 인게임 반영도. 미지정이면 배지 없음(원본 텍스트만).
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  live: { label: "게임 반영", cls: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" },
  partial: { label: "부분 반영", cls: "border-amber-300/30 bg-amber-400/10 text-amber-200" },
  planned: { label: "예정", cls: "border-white/15 bg-white/[0.04] text-white/40" },
};

export function RoleOriginalAbilities({
  abilities,
  compact = false,
  accentClass = "text-white/75",
  itemClassName,
}: {
  abilities: GomdoriOriginalAbility[];
  compact?: boolean;
  accentClass?: string;
  itemClassName?: string;
}) {
  if (abilities.length === 0) return null;
  const itemClass =
    itemClassName ??
    (compact ? "rounded-md border border-white/10 bg-black/15 px-2.5 py-2" : "rounded-lg border border-white/10 bg-black/20 px-3 py-2");

  return (
    <div className={compact ? "mt-2 space-y-2" : "mt-2 space-y-2"}>
      {abilities.map((ability) => (
        <div
          key={`${ability.kind}-${ability.name}`}
          className={itemClass}
        >
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className={`text-[0.625rem] font-semibold uppercase tracking-widest ${accentClass}`}>
              {ability.kind}
            </span>
            <span className={compact ? "text-xs font-semibold text-white/75" : "text-sm font-semibold text-white/80"}>
              {ability.name}
            </span>
            {ability.status && STATUS_BADGE[ability.status] ? (
              <span
                className={`ml-auto shrink-0 self-center rounded-full border px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-wider ${STATUS_BADGE[ability.status].cls}`}
              >
                {STATUS_BADGE[ability.status].label}
              </span>
            ) : null}
          </div>
          <p className={compact ? "mt-1 text-[0.6875rem] leading-4 text-white/50" : "mt-1 text-xs leading-5 text-white/55"}>
            {ability.text}
          </p>
        </div>
      ))}
    </div>
  );
}
