"use client";

/**
 * VerdictPhase — 판결. 처형은 카드 공지가 아니라 무대 위의 사건이다 (Feign 구조).
 *
 * 처형자가 무대 중앙 스포트라이트 아래 서고(쓰러지고), 나머지는 뒤편 줄에서
 * 지켜본다. 무처형이면 빈 스포트라이트만 식는다. 이벤트 파싱 로직 동일 (2026-06-11).
 */

import type { PlayerSummary } from "@/lib/game/api";
import { MOOD } from "@/config/design-tokens";
import { PlayerToken } from "@/components/game/ui/PlayerToken";
import { GameStage } from "@/components/game/ui/GameStage";

type VerdictPhaseProps = {
  players: PlayerSummary[];
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
};

export function VerdictPhase({ players, events }: VerdictPhaseProps) {
  // phase-advance emits "player_eliminated" with cause "vote" when someone is executed.
  // A separate "verdict" event (if added later) takes precedence.
  const verdictEvent =
    events.find((e) => e.event_type === "verdict") ??
    events.find((e) => e.event_type === "player_eliminated" && e.payload?.cause === "vote");
  const executedUserId = (verdictEvent?.payload?.executed_user_id ??
    verdictEvent?.payload?.user_id) as string | null | undefined;

  const executedPlayer = executedUserId ? players.find((p) => p.userId === executedUserId) : null;
  const watchers = executedPlayer ? players.filter((p) => p.userId !== executedPlayer.userId) : players;
  const ink = MOOD.dark;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-5">
      <h2
        className={`text-sm font-medium uppercase tracking-widest motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 ${
          executedPlayer ? "text-rose-300/80" : ink.faint
        }`}
      >
        투표 결과
      </h2>

      {/* 중앙 스포트라이트 — 처형대 */}
      <div className="relative mt-2 flex min-h-[11.25rem] w-full max-w-md flex-col items-center justify-end pb-4">
        <div
          aria-hidden="true"
          className={`gomdori-spotlight pointer-events-none absolute inset-x-[18%] top-0 bottom-2 [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)] ${
            executedPlayer
              ? "bg-gradient-to-b from-rose-200/25 via-rose-300/10 to-transparent"
              : "bg-gradient-to-b from-white/15 via-white/5 to-transparent"
          }`}
        />
        {executedPlayer ? (
          <div className="relative w-[7rem] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700">
            <PlayerToken
              name={executedPlayer.displayName}
              avatarUrl={executedPlayer.avatarUrl}
              alive={false}
              mood="dark"
              sub="처형됨"
              selected
              selectedGlow="ring-2 ring-rose-300/60 shadow-[0_0_36px_rgba(251,113,133,0.35)]"
            />
          </div>
        ) : (
          <p className="relative pb-6 text-sm text-white/45">아무도 처형대에 오르지 않았습니다.</p>
        )}
      </div>

      <h1 className="text-center text-3xl font-bold text-white motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 sm:text-4xl">
        {executedPlayer ? `${executedPlayer.displayName}님이 처형되었습니다.` : "동률이거나 기권이 많습니다."}
      </h1>
      <p className="text-base text-white/55">
        {executedPlayer
          ? "죽은 자의 정체는 게임이 끝날 때까지 공개되지 않습니다."
          : "오늘은 아무도 처형되지 않았습니다."}
      </p>

      {/* 지켜보는 사람들 — 무대는 그대로 이어진다 */}
      <GameStage players={watchers} mood="dark" className="mt-3 opacity-80" />
    </div>
  );
}
