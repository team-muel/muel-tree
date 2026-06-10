"use client";

/**
 * SuspicionPhase — 밤 의심 투표. 심야 무대 위에서 지목 + 창으로 확정
 * (투표와 동일한 Feign 구조, 인디고 광휘). 로직 동일.
 */

import { useState } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { GLOW } from "@/config/design-tokens";
import { Button } from "@/components/game/ui/Button";
import { GameStage } from "@/components/game/ui/GameStage";
import { ActionModal } from "@/components/game/ui/ActionModal";
import { BottomSheet } from "@/components/game/ui/BottomSheet";
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

  const selectedName = selectedTarget
    ? players.find((p) => p.userId === selectedTarget)?.displayName
    : null;

  if (isDead) {
    return (
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center p-5 pb-24">
        <GameStage players={players} myUserId={myPlayer?.userId} mood="dark" />
        <BottomSheet title="관전 피드">
          <p className="text-sm text-white/55">사망하여 의심 투표에 참여할 수 없습니다.</p>
          <SpectatorFeed events={events} players={players} />
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center p-5 pb-24">
      <GameStage
        players={players}
        myUserId={myPlayer?.userId}
        mood="dark"
        selectable
        excludeSelf
        selectedId={selectedTarget}
        selectedGlow={GLOW.selectNight}
        disabled={submitted}
        onSelect={(id) => !submitted && setSelectedTarget(id)}
      />

      <ActionModal
        eyebrow="의심 투표"
        title={
          submitted
            ? selectedTarget
              ? "의심 완료"
              : "기권 완료"
            : selectedName
              ? `${selectedName}님이 수상한가요?`
              : "이 밤, 누가 가장 수상한가요"
        }
        mood="dark"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="indigo"
              onClick={() => submit(selectedTarget)}
              disabled={!selectedTarget || isSubmitting || submitted}
              className="w-full"
            >
              {submitted && selectedTarget ? "의심 완료" : isSubmitting ? "전송 중..." : "의심 확정"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => submit(null)}
              disabled={isSubmitting || submitted}
              className="w-full"
            >
              {submitted && !selectedTarget ? "기권 완료" : "기권하기"}
            </Button>
          </div>
        }
      >
        <p className="mt-1 text-sm text-indigo-200/50">
          최다 의심자는 전원에게 공개되고 이번 밤 능력을 쓸 수 없습니다. 확신이 없으면 기권하세요.
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
      </ActionModal>
    </div>
  );
}
