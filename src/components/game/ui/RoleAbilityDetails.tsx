"use client";

import { FACTION_COLORS } from "@/config/design-tokens";
import { roleMeta, roleOriginalAbilities } from "@/config/gomdori-roles";
import { RoleOriginalAbilities } from "@/components/game/ui/RoleOriginalAbilities";

export function cleanRoleReveal(role: string): string {
  const meta = roleMeta(role);
  if (!meta?.reveal) return "";

  const firstSentenceEnd = meta.reveal.indexOf(".");
  if (firstSentenceEnd === -1) return meta.reveal;

  const firstSentence = meta.reveal.slice(0, firstSentenceEnd + 1);
  const rest = meta.reveal.slice(firstSentenceEnd + 1).trim();
  if (!rest) return meta.reveal;

  const duplicatedIdentity =
    firstSentence.includes(meta.label) || (meta.title ? firstSentence.includes(meta.title) : false);

  return duplicatedIdentity ? rest : meta.reveal;
}

export function RoleAbilityDetails({
  role,
  faction,
  showNightActions = true,
  showEmptyNight = true,
  compact = false,
}: {
  role: string;
  faction?: string | null;
  showNightActions?: boolean;
  showEmptyNight?: boolean;
  compact?: boolean;
}) {
  const meta = roleMeta(role);
  if (!meta) return null;

  const fac = (faction ?? meta.faction ?? "neutral") as keyof typeof FACTION_COLORS;
  const color = FACTION_COLORS[fac] ?? FACTION_COLORS.neutral;
  const abilities = [meta.night, ...(meta.extraNights ?? [])].filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );
  const originalAbilities = roleOriginalAbilities(role);
  const sectionClass = compact
    ? "rounded-md border border-white/10 bg-black/15 px-2.5 py-2"
    : "rounded-lg border border-white/10 bg-black/20 px-3 py-2";
  const titleClass = "text-[0.625rem] font-semibold uppercase tracking-widest text-white/35";
  const bodyClass = compact ? "mt-1 text-[0.6875rem] leading-4 text-white/50" : "mt-1 text-xs leading-5 text-white/55";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {meta.passive ? (
        <section className={sectionClass}>
          <div className={titleClass}>현재 게임 패시브</div>
          <p className={bodyClass}>{meta.passive}</p>
        </section>
      ) : null}

      {originalAbilities.length > 0 ? (
        <section>
          <div className={titleClass}>원본 능력표</div>
          <RoleOriginalAbilities
            abilities={originalAbilities}
            compact={compact}
            accentClass={color.accent}
            itemClassName={sectionClass}
          />
        </section>
      ) : null}

      {showNightActions && (abilities.length > 0 || showEmptyNight) ? (
        <section>
          <div className={titleClass}>현재 게임 액션</div>
          {abilities.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {abilities.map((a) => (
                <li key={a.actionType} className={sectionClass}>
                  <div className="flex items-center gap-2">
                    <span className={`${compact ? "text-xs" : "text-sm"} font-semibold ${color.accent}`}>
                      {a.label}
                    </span>
                    {a.self ? (
                      <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[0.5rem] uppercase tracking-wider text-white/35">
                        자신
                      </span>
                    ) : null}
                  </div>
                  <p className={bodyClass}>{a.prompt}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${sectionClass} mt-2 text-xs leading-5 text-white/45`}>
              밤 능동 능력이 없습니다. 토론과 투표가 핵심입니다.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
