"use client";

/**
 * GameStage — 상시 유지되는 "캐릭터가 보이는 테이블" (Feign 핵심 구조).
 *
 * 페이즈가 바뀌어도 무대는 그대로: 아침엔 밝은 무대, 투표는 그 위의 창(ActionModal),
 * 죽음은 빈자리가 아니라 쓰러진 토큰. 모바일 우선 — 토큰이 줄로 서는 좁은 무대도 성립.
 *
 * selectable 모드: 무대 위 인물을 직접 지목 (투표/의심/능력 공용).
 */

import type { PlayerSummary } from "@/lib/game/api";
import type { Mood } from "@/config/design-tokens";
import { PlayerToken } from "@/components/game/ui/PlayerToken";

export function GameStage({
  players,
  myUserId,
  mood = "dark",
  selectable = false,
  excludeSelf = false,
  selectedId = null,
  selectedGlow,
  disabled = false,
  onSelect,
  className,
}: {
  players: PlayerSummary[];
  myUserId?: string | null;
  mood?: Mood;
  /** true 면 생존자 토큰이 지목 가능해진다. */
  selectable?: boolean;
  excludeSelf?: boolean;
  selectedId?: string | null;
  selectedGlow?: string;
  disabled?: boolean;
  onSelect?: (userId: string) => void;
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
        {players.map((p) => {
          const isMe = p.userId === myUserId;
          const canPick =
            selectable && !disabled && p.alive && !(excludeSelf && isMe) && Boolean(onSelect);
          return (
            <div key={p.userId} className="w-[88px] sm:w-[104px]">
              <PlayerToken
                name={p.displayName}
                avatarUrl={p.avatarUrl}
                alive={p.alive}
                mood={mood}
                selected={selectedId === p.userId}
                selectedGlow={selectedGlow}
                disabled={selectable ? !canPick : false}
                sub={isMe ? "나" : !p.alive ? "사망" : undefined}
                onClick={canPick ? () => onSelect?.(p.userId) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
