"use client";

import type { PlayerSummary } from "@/lib/game/api";

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
  
  const executedPlayer = executedUserId ? players.find(p => p.userId === executedUserId) : null;

  return (
    <div className="flex h-full w-full items-center justify-center p-5">
      <div className={`w-full max-w-2xl rounded-lg border p-10 text-center shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in motion-safe:duration-500 ${
        executedPlayer ? "border-rose-400/25 bg-rose-950/40" : "border-white/10 bg-white/[0.04]"
      }`}>
        <h2 className={`text-sm font-medium tracking-widest uppercase ${executedPlayer ? "text-rose-300/80" : "text-white/50"}`}>
          투표 결과
        </h2>
        
        {executedPlayer ? (
          <>
            <h1 className="mt-8 text-4xl sm:text-5xl font-bold text-white">
              {executedPlayer.displayName}님이 처형되었습니다.
            </h1>
            <p className="mt-8 text-lg text-white/60">
              죽은 자의 정체는 게임이 끝날 때까지 공개되지 않습니다.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-8 text-4xl sm:text-5xl font-bold text-white">
              동률이거나 기권이 많습니다.
            </h1>
            <p className="mt-8 text-lg text-white/60">
              오늘은 아무도 처형되지 않았습니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
