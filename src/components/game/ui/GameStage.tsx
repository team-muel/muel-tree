"use client";

/**
 * GameStage — 상시 유지되는 "캐릭터가 보이는 테이블" (Feign 핵심 구조).
 *
 * 페이즈가 바뀌어도 무대는 그대로: 아침엔 밝은 무대, 투표는 그 위의 창(ActionModal),
 * 죽음은 빈자리가 아니라 쓰러진 토큰. 모바일 우선 — 토큰이 줄로 서는 좁은 무대도 성립.
 *
 * selectable 모드: 무대 위 인물을 직접 지목 (투표/의심/밤 능력 공용).
 * canSelect 로 대상 조건을 주입 (예: 부활 = 탈락자만, 처치 = 악마팀 제외).
 *
 * roam 모드 (로비·랜딩): 생존 토큰이 제자리 주변을 느리게 배회 — "아바타가
 * 무대를 돌아다니는" Feign 최소구조. 지목 무대에서는 끈다 (조준 안정성).
 * chrome=false 와 함께 쓰면 카드 없이 캐릭터만 서 있는 무대가 된다.
 */

import type { PlayerSummary } from "@/lib/game/api";
import type { Mood } from "@/config/design-tokens";
import { PlayerToken } from "@/components/game/ui/PlayerToken";
import { StageTimerOrb } from "@/components/game/ui/StageTimerOrb";

const ROAM_VARIANTS = ["gomdori-roam-a", "gomdori-roam-b", "gomdori-roam-c"] as const;

/** 토큰별 배회 모션 — 변형·시작 위상을 인덱스로 어긋나게 (결정적, SSR 안전). */
function roamMotion(index: number): { className: string; style: React.CSSProperties } {
  return {
    className: ROAM_VARIANTS[index % ROAM_VARIANTS.length],
    // 음수 delay = 경로 중간에서 시작 — 전원이 동시에 출발하는 부자연스러움 제거.
    style: { animationDelay: `${-(index * 2.9)}s` },
  };
}

export function GameStage({
  players,
  myUserId,
  mood = "dark",
  selectable = false,
  excludeSelf = false,
  canSelect,
  selectedId = null,
  selectedGlow,
  disabled = false,
  onSelect,
  onInspect,
  roam = false,
  chrome = true,
  timerOrbEndsAt,
  subFor,
  className,
}: {
  players: PlayerSummary[];
  myUserId?: string | null;
  mood?: Mood;
  /** true 면 토큰이 지목 가능해진다. */
  selectable?: boolean;
  excludeSelf?: boolean;
  /** 대상 조건 주입 — 없으면 기본(생존자, excludeSelf 반영). */
  canSelect?: (p: PlayerSummary) => boolean;
  selectedId?: string | null;
  selectedGlow?: string;
  disabled?: boolean;
  onSelect?: (userId: string) => void;
  /** 보조 인터랙션(R3 준비) — 롱프레스/우클릭으로 그 인물의 직업 추측 시트를 연다. */
  onInspect?: (userId: string) => void;
  /** 생존 토큰이 무대를 배회한다 (로비·랜딩 전용 — 지목 무대에선 사용 금지). */
  roam?: boolean;
  /** false 면 토큰 카드 없이 캐릭터(아바타+이름)만 무대에 선다. */
  chrome?: boolean;
  /**
   * 주어지면 무대 위에 차고 노는 타이머 오브(StageTimerOrb)를 띄운다.
   * 지목 무대(selectable)에선 조준 방해를 막기 위해 자동으로 끈다.
   */
  timerOrbEndsAt?: string | null;
  /** 토큰 보조 라벨 주입 (예: 로비 = 방장/준비/대기). 없으면 기본(나/사망). */
  subFor?: (p: PlayerSummary, isMe: boolean) => React.ReactNode;
  className?: string;
}) {
  const light = mood === "light";

  return (
    <div className={`relative w-full ${className ?? ""}`}>
      {/* 무대 바닥 — 은은한 타원 광 */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-[8%] bottom-0 h-2/5 rounded-[50%] blur-2xl ${
          light ? "bg-[#caa86b]/25" : "bg-indigo-300/10"
        }`}
      />
      <div className="relative mx-auto flex max-w-3xl flex-wrap items-end justify-center gap-3 px-2 py-4 sm:gap-4">
        {players.map((p, index) => {
          const isMe = p.userId === myUserId;
          const eligible = canSelect ? canSelect(p) : p.alive && !(excludeSelf && isMe);
          const canPick = selectable && !disabled && eligible && Boolean(onSelect);
          const drift = roam && p.alive ? roamMotion(index) : null;
          return (
            <div
              key={p.userId}
              style={drift?.style}
              className={`w-[5.5rem] sm:w-[6.5rem] ${drift?.className ?? ""}`}
            >
              <PlayerToken
                name={p.displayName}
                avatarUrl={p.avatarUrl}
                alive={p.alive}
                mood={mood}
                chrome={chrome}
                selected={selectedId === p.userId}
                selectedGlow={selectedGlow}
                pickable={canPick}
                disabled={selectable ? !canPick : false}
                sub={subFor ? subFor(p, isMe) : isMe ? "나" : !p.alive ? "사망" : undefined}
                onClick={canPick ? () => onSelect?.(p.userId) : undefined}
                onInspect={onInspect && !isMe ? () => onInspect(p.userId) : undefined}
                idleDelayMs={(index % 7) * 420}
              />
            </div>
          );
        })}
      </div>
      {/* 차고 노는 타이머 — 지목 무대에선 끈다(조준 안정). */}
      {!selectable && timerOrbEndsAt ? <StageTimerOrb endsAt={timerOrbEndsAt} /> : null}
    </div>
  );
}
