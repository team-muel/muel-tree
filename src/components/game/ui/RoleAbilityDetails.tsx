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

/**
 * 직업 능력 단일 표시(2026-06-15) — "원본 능력표"와 "현재 게임 액션"으로 갈라져 서로
 * 엇갈리던 두 목록을 하나로 합쳤다. 원본(캐논) 능력표가 단일 출처. 플레이어 표면은 캐논
 * 텍스트만 — 구현상태 배지는 제거(2026-06-27): 구현상태·드리프트 메타는 디자이너 도구
 * (preview DesignInventory)에만. 실제 밤 상호작용은 NightPhase 카드가 담당.
 */
export function RoleAbilityDetails({
  role,
  faction,
  compact = false,
}: {
  role: string;
  faction?: string | null;
  compact?: boolean;
}) {
  const meta = roleMeta(role);
  if (!meta) return null;

  const fac = (faction ?? meta.faction ?? "neutral") as keyof typeof FACTION_COLORS;
  const color = FACTION_COLORS[fac] ?? FACTION_COLORS.neutral;
  const originalAbilities = roleOriginalAbilities(role);
  const sectionClass = compact
    ? "rounded-md border border-white/10 bg-black/15 px-2.5 py-2"
    : "rounded-lg border border-white/10 bg-black/20 px-3 py-2";
  const bodyClass = compact ? "mt-1 text-[0.8125rem] leading-5 text-white/55" : "mt-1 text-sm leading-6 text-white/60";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {originalAbilities.length > 0 ? (
        <RoleOriginalAbilities
          abilities={originalAbilities}
          compact={compact}
          accentClass={color.accent}
          itemClassName={sectionClass}
        />
      ) : meta.abilitySummary ? (
        <p className={`${sectionClass} ${bodyClass}`}>{meta.abilitySummary}</p>
      ) : (
        <p className={`${sectionClass} ${bodyClass}`}>밤 능동 능력이 없습니다. 토론과 투표가 핵심입니다.</p>
      )}
    </div>
  );
}
