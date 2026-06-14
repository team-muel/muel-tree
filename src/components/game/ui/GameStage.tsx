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

import { useState } from "react";
import type { PlayerSummary } from "@/lib/game/api";
import type { Mood } from "@/config/design-tokens";
import { PlayerToken } from "@/components/game/ui/PlayerToken";
import { PlayerInspectSheet } from "@/components/game/ui/PlayerInspectSheet";
import { StageTimerOrb } from "@/components/game/ui/StageTimerOrb";
import { useInspectGuesses } from "@/lib/game/inspect";

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
  inspectable = false,
  matchId,
  movable = false,
  roam = false,
  chrome = true,
  timerOrbEndsAt,
  subFor,
  className,
  votedTargetId = null,
  suspicionTargetId = null,
  abilityTargetId = null,
  myEffects = [],
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
  /** 외부 검사 핸들러 override — 없고 inspectable 이면 GameStage 내장 시트가 열린다. */
  onInspect?: (userId: string) => void;
  /**
   * true 면 무대가 직접 "정체 추측" 인터랙션을 소유한다 — 비지목 무대는 탭, 지목
   * 무대는 롱프레스/우클릭으로 그 인물의 진영·직업 추측 시트(로컬 저장)를 연다.
   */
  inspectable?: boolean;
  /** 추측 저장 범위 키 (없으면 "preview"). */
  matchId?: string | null;
  /** true 면 토큰을 끌어 무대 위 위치를 옮길 수 있다 (지목 무대에선 자동 비활성). */
  movable?: boolean;
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
  votedTargetId?: string | null;
  suspicionTargetId?: string | null;
  abilityTargetId?: string | null;
  myEffects?: string[];
}) {
  const light = mood === "light";

  // 정체 추측(R3) — 두 층위.
  //   탭(비지목 무대)      → 토큰 위 빠른 진영 추측(악마/천사 2버튼)
  //   롱프레스/우클릭     → 전체 추측 시트(진영+직업+메모, PlayerInspectSheet)
  // 시트는 그간 컴포넌트만 있고 배선이 안 돼 있었다 (2026-06-12 — 직업 추측 통로 부재).
  const [activeGuessEditUserId, setActiveGuessEditUserId] = useState<string | null>(null);
  const [sheetUserId, setSheetUserId] = useState<string | null>(null);
  const guessEnabled = inspectable && Boolean(matchId);
  const { guesses, save } = useInspectGuesses(matchId, guessEnabled);

  const toggleGuessEdit = (uid: string) => {
    if (!guessEnabled) return;
    setActiveGuessEditUserId(activeGuessEditUserId === uid ? null : uid);
  };
  const inspectPlayer = (uid: string) => {
    if (onInspect) {
      onInspect(uid);
      return;
    }
    if (!guessEnabled) return;
    setActiveGuessEditUserId(null);
    setSheetUserId(uid);
  };
  const sheetPlayer = sheetUserId ? players.find((p) => p.userId === sheetUserId) ?? null : null;

  const canDrag = movable && !selectable;

  return (
    <div
      className={`relative w-full ${className ?? ""}`}
      onClick={() => guessEnabled && setActiveGuessEditUserId(null)}
    >
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
          const canInspectPlayer = inspectable && !isMe && (Boolean(onInspect) || guessEnabled);
          const userGuess = guessEnabled
            ? guesses[p.userId]?.faction === "demon"
              ? "demon"
              : guesses[p.userId]?.faction === "angel"
                ? "angel"
                : null
            : null;

          return (
            <div
              key={p.userId}
              style={drift?.style}
              className={`w-[5.5rem] sm:w-[6.5rem] ${drift?.className ?? ""}`}
              onClick={(e) => e.stopPropagation()} // stage 클릭 시 해제되는 흐름 방지
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
                disabled={selectable ? (!canPick && !isMe) : false}
                movable={canDrag}
                sub={subFor ? subFor(p, isMe) : isMe ? "나" : !p.alive ? "사망" : undefined}
                guess={userGuess}
                onGuessChange={guessEnabled ? (g) => save(p.userId, { faction: g ?? "", role: "", memo: "" }) : undefined}
                isGuessingEdit={activeGuessEditUserId === p.userId}
                onToggleGuessingEdit={() => setActiveGuessEditUserId(null)}
                votedStamp={p.userId === votedTargetId}
                suspicionStamp={p.userId === suspicionTargetId}
                abilityStamp={p.userId === abilityTargetId}
                effects={isMe ? myEffects : undefined}
                ready={p.ready}
                isAi={p.isAi}
                aiProvider={p.aiProvider}
                onClick={
                  selectable
                    ? (canPick || isMe)
                      ? () => onSelect?.(p.userId)
                      : undefined
                    : canInspectPlayer
                      ? () => (onInspect ? onInspect(p.userId) : toggleGuessEdit(p.userId))
                      : undefined
                }
                onInspect={canInspectPlayer ? () => inspectPlayer(p.userId) : undefined}
                idleDelayMs={(index % 7) * 420}
              />
            </div>
          );
        })}
      </div>
      {/* 차고 노는 타이머 — 지목 무대에선 끈다(조준 안정). */}
      {!selectable && timerOrbEndsAt ? <StageTimerOrb endsAt={timerOrbEndsAt} /> : null}

      {/* 전체 추측 시트 — 롱프레스/우클릭으로 진영+직업+메모 추리 (로컬 저장). */}
      {sheetPlayer ? (
        <PlayerInspectSheet
          open
          onClose={() => setSheetUserId(null)}
          name={sheetPlayer.displayName}
          avatarUrl={sheetPlayer.avatarUrl}
          initial={guesses[sheetPlayer.userId]}
          onSave={(guess) => save(sheetPlayer.userId, guess)}
        />
      ) : null}
    </div>
  );
}
