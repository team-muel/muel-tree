"use client";

import type { GomdoriOriginalAbility } from "@/config/gomdori-roles";

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
          </div>
          <p className={compact ? "mt-1 text-[0.6875rem] leading-4 text-white/50" : "mt-1 text-xs leading-5 text-white/55"}>
            {ability.text}
          </p>
        </div>
      ))}
    </div>
  );
}
