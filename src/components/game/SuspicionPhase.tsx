"use client";

/**
 * SuspicionPhase — 밤 의심 투표. 깊은 심야, 인디고 광휘.
 * 대상은 PlayerToken 테이블 — 선택 광휘는 GLOW.selectNight.
 * 로직 동일, 시각 오버홀 (2026-06-11).
 */

import { useState } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { MOOD, GLOW } from "@/config/design-tokens";
import { Button } from "@/components/game/ui/Button";
import { PlayerToken } from "@/components/game/ui/PlayerToken";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";

type SuspicionPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events?: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
};

/**
 * 밤 의심 투표 (canon §3). 최다 의심자는 다가오는 밤 능력을 쓸 수 없고 전원에게 공개된다.
 * 대상 없이 제출 = 기권(무투, canon §3). 동률/무표는 부결.
 */
export function SuspicionPhase({ match, players, myPlayer, gameJwt, events }: SuspicionPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDead = myPlayer && !myPlayer.alive;
  const ink = MOOD.dark;

  const submit = async (targetId: string | null) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await submitAction(match.id, "suspect", targetId, gameJwt);
      if (targetId) setSelectedTarget(targetId);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "의심 투표 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDead) {
    return (
      <div className="flex h-full w-full items-center justify-center p-5">
        <div className={`${ink.panelStrong} w-full max-w-lg p-10 text-center`}>
          <h2 className="text-sm font-medium uppercase tracking-widest text-indigo-300/70">의심 투표</h2>
          <h1 className={`mt-6 text-2xl font-semibold ${ink.heading}`}>관전 모드</h1>
          <p className={`mt-4 text-sm ${ink.faint}`}>사망하여 의심 투표에 참여할 수 없습니다.</p>
          <SpectatorFeed events={events} players={players} />
        </div>
      </div>
    );
  }

  const targets = players.filter((p) => p.alive && p.userId !== myPlayer?.userId);

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col p-5">
      <div className={`${ink.panelStrong} p-6 text-center sm:p-10 shadow-[0_0_44px_rgba(99,102,241,0.14)]`}>
        <h2 className="text-sm font-medium uppercase tracking-widest text-indigo-300/70">의심 투표</h2>
        <h1 className="mt-2 text-2xl font-semibold text-indigo-100">이 밤, 누가 가장 수상한가요</h1>
        <p className="mt-2 text-sm text-indigo-200/50">
          최다 의심자는 전원에게 공개되고 이번 밤 능력을 쓸 수 없습니다. 확신이 없으면 기권하세요.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {targets.map((p) => (
            <PlayerToken
              key={p.userId}
              name={p.displayName}
              avatarUrl={p.avatarUrl}
              alive
              mood="dark"
              selected={selectedTarget === p.userId}
              selectedGlow={GLOW.selectNight}
              disabled={submitted}
              onClick={() => !submitted && setSelectedTarget(p.userId)}
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            type="button"
            variant="indigo"
            onClick={() => submit(selectedTarget)}
            disabled={!selectedTarget || isSubmitting || submitted}
            className="w-full max-w-[200px]"
          >
            {submitted && selectedTarget ? "의심 완료" : isSubmitting ? "전송 중..." : "선택한 사람 의심"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => submit(null)}
            disabled={isSubmitting || submitted}
            className="w-full max-w-[200px]"
          >
            {submitted && !selectedTarget ? "기권 완료" : "기권하기"}
          </Button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
