"use client";

import type { GomdoriOriginalAbility } from "@/config/gomdori-roles";

const KIND_CLASS: Record<GomdoriOriginalAbility["kind"], string> = {
  "패시브": "border-amber-300/20 bg-amber-300/10 text-amber-100",
  "특수 패시브": "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
  "능력": "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  "능력2": "border-sky-300/20 bg-sky-300/10 text-sky-100",
};

export function RoleOriginalAbilities({
  abilities,
  compact = false,
}: {
  abilities: GomdoriOriginalAbility[];
  compact?: boolean;
}) {
  if (abilities.length === 0) return null;

  return (
    <div className={compact ? "mt-1 space-y-1.5" : "space-y-2"}>
      {abilities.map((ability) => (
        <div
          key={`${ability.kind}-${ability.name}`}
          className={compact ? "rounded-md border border-white/10 bg-black/15 px-2 py-1.5" : "rounded-lg border border-white/10 bg-black/20 px-3 py-2"}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-1.5 py-0.5 text-[0.5625rem] font-semibold ${KIND_CLASS[ability.kind]}`}>
              {ability.kind}
            </span>
            <span className={compact ? "text-[0.6875rem] font-semibold text-white/75" : "text-sm font-semibold text-white/80"}>
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
