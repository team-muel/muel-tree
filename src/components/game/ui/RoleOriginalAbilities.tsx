"use client";

import type { GomdoriOriginalAbility, GomdoriOriginalAbilityKind } from "@/config/gomdori-roles";

// 패시브는 "사용하는 능력"이 아니다 — 능력(사용)과 시각 위계를 분리한다(로컬 캐논 구조).
// ※ 구현상태 배지(게임반영/부분반영/예정)는 플레이어 표면에서 제거(2026-06-27, 사용자 결정 반복
//   확정): 플레이어는 캐논 텍스트만 본다. 구현상태·드리프트 메타는 디자이너 도구(preview
//   DesignInventory) 전용. 여기에 status 배지를 다시 붙이지 말 것 — 재발 방지 테스트 가드 있음.
const PASSIVE_KINDS: GomdoriOriginalAbilityKind[] = ["패시브", "특수 패시브"];
const isPassiveKind = (kind: GomdoriOriginalAbilityKind): boolean => PASSIVE_KINDS.includes(kind);

/**
 * 직업 능력 표시 — 로컬 캐논 구조(패시브 / 능력 / 능력2)를 그대로 위계화한다.
 *
 * 두 층으로 분리(2026-06-24): 「사용 능력」(능력·능력2, 밤에 직접 발동)과 「패시브」
 * (상시·조건 효과, *직접 사용하는 능력이 아님*). 이전엔 한 목록에 평면 나열돼 패시브가
 * 사용 능력처럼 보였다 — 위계로 구분한다. 실제 밤 상호작용 버튼은 NightPhase 가 담당.
 */
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

  const usable = abilities.filter((a) => !isPassiveKind(a.kind));
  const passives = abilities.filter((a) => isPassiveKind(a.kind));

  const usableItem =
    itemClassName ??
    (compact
      ? "rounded-md border border-white/10 bg-black/15 px-2.5 py-2"
      : "rounded-lg border border-white/10 bg-black/20 px-3 py-2");
  const passiveItem = compact
    ? "rounded-md border border-dashed border-white/10 bg-white/[0.02] px-2.5 py-2"
    : "rounded-md border border-dashed border-white/12 bg-white/[0.02] px-3 py-2";
  const headClass = "text-[0.6875rem] font-semibold uppercase tracking-widest";
  const subHeadClass = "text-[0.5625rem] tracking-wide text-white/30";
  const kindClass = "text-[0.625rem] font-semibold uppercase tracking-widest";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {usable.length > 0 ? (
        <section>
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className={`${headClass} text-white/45`}>사용 능력</span>
            <span className={subHeadClass}>밤에 직접 발동</span>
          </div>
          <div className="mt-2 space-y-2">
            {usable.map((ability) => (
              <div key={`${ability.kind}-${ability.name}`} className={usableItem}>
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className={`${kindClass} ${accentClass}`}>{ability.kind}</span>
                  <span className={compact ? "text-xs font-semibold text-white/80" : "text-sm font-semibold text-white/85"}>
                    {ability.name}
                  </span>
                </div>
                <p className={compact ? "mt-1 text-[0.6875rem] leading-4 text-white/55" : "mt-1 text-xs leading-5 text-white/60"}>
                  {ability.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {passives.length > 0 ? (
        <section>
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className={`${headClass} text-white/35`}>패시브</span>
            <span className={subHeadClass}>상시 · 직접 사용하는 능력이 아님</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {passives.map((ability) => (
              <div key={`${ability.kind}-${ability.name}`} className={passiveItem}>
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className={`${kindClass} text-white/35`}>{ability.kind}</span>
                  <span className={compact ? "text-xs font-medium text-white/65" : "text-sm font-medium text-white/70"}>
                    {ability.name}
                  </span>
                  {ability.actionType ? <span className={subHeadClass}>· 밤에 발동</span> : null}
                </div>
                <p className={compact ? "mt-1 text-[0.6875rem] leading-4 text-white/45" : "mt-1 text-xs leading-5 text-white/50"}>
                  {ability.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
