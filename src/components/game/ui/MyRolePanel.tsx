"use client";

/**
 * MyRolePanel — 하단 프로필 독을 펼쳤을 때 뜨는 "내 정체" 카드.
 *
 * 사용자 요구 (2026-06-11): Discord 하단 자기 프로필 차용 — 언제든 내 직업과
 * 그 능력·설명을 다시 읽는다. 데이터는 manifest(gomdori-roles) 한 곳에서.
 * 능동 능력은 night/extraNights, 패시브와 원본 능력 흐름은 표시 전용 manifest 필드로 분리한다.
 */

import { FACTION_COLORS } from "@/config/design-tokens";
import { factionLabel, roleArchetype, roleMeta, roleLabel } from "@/config/gomdori-roles";
import { RoleEmblem } from "@/components/game/ui/RoleEmblem";
import { cleanRoleReveal, RoleAbilityDetails } from "@/components/game/ui/RoleAbilityDetails";

export function MyRolePanel({
  role,
  faction,
  showAbilities = true,
  showNightActions = false,
}: {
  role: string;
  faction?: string;
  /**
   * false 면 능력 목록을 생략하고 정체 헤더만 — NightPhase 처럼 같은 패널 안에
   * *상호작용형* 능력 목록(같은 label·prompt)이 따로 있는 화면에서 같은 문자열이
   * 2회 반복되던 문제(2026-06-12)의 차단 스위치.
   */
  showAbilities?: boolean;
  /**
   * 인게임 프로필에선 "현재 게임 액션"을 숨기고 "원본 능력표"만 둔다(기본 false) —
   * 실제 액션은 NightPhase 의 상호작용 카드가 담당하므로 정적 액션 목록은 중복.
   * 도감(RoleCodex)은 RoleAbilityDetails 를 직접 써서 액션을 계속 보여준다.
   */
  showNightActions?: boolean;
}) {
  const meta = roleMeta(role);
  const fac = (faction ?? meta?.faction ?? "neutral") as keyof typeof FACTION_COLORS;
  const color = FACTION_COLORS[fac] ?? FACTION_COLORS.neutral;
  const reveal = cleanRoleReveal(role);
  const archetype = roleArchetype(role);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <RoleEmblem role={role} size="md" mood="dark" glow />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${color.primary}`}>{roleLabel(role)}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[0.625rem] ${color.border} ${color.bgSoft} ${color.accent}`}>
              {factionLabel(fac)}
            </span>
          </div>
          {meta?.title ? (
            <div className="mt-0.5 text-[0.6875rem] font-medium text-white/40">{meta.title}</div>
          ) : null}
          <div className={`mt-1 text-[0.6875rem] font-semibold ${color.accent}`}>{archetype}</div>
          {reveal ? (
            <p className="mt-1 text-xs leading-5 text-white/55">{reveal}</p>
          ) : null}
        </div>
      </div>

      {showAbilities ? (
        <RoleAbilityDetails role={role} faction={fac} showNightActions={showNightActions} />
      ) : null}
    </div>
  );
}
