"use client";

/**
 * VotePhase — 투표. 페이지 전환 없이 **무대 위에서 지목 + 창(ActionModal)으로 확정**
 * (사용자 요구 2026-06-11 / Feign 구조). 황혼 무대는 그대로 보이고,
 * 무대 위 인물을 탭하면 황혼 광휘 — 창에서 확정/기권.
 * 로직(복원 useEffect·제출) 동일.
 */

import { useState, useEffect } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { GLOW } from "@/config/design-tokens";
import { Button } from "@/components/game/ui/Button";
import { GameStage } from "@/components/game/ui/GameStage";
import { ActionModal } from "@/components/game/ui/ActionModal";
import { BottomSheet } from "@/components/game/ui/BottomSheet";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";

type VotePhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events?: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
};

export function VotePhase({ match, players, myPlayer, gameJwt, events }: VotePhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!match.id || !gameJwt || !myPlayer?.userId) return;

    let cancelled = false;
    const supabase = getGameSupabase(gameJwt);

    async function restoreVote() {
      const { data: phaseData, error: phaseError } = await supabase
        .schema("mafia")
        .from("match_phases")
        .select("id")
        .eq("match_id", match.id)
        .is("ended_at", null)
        .order("phase_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || phaseError || !phaseData) return;

      const phaseId = phaseData.id;

      const { data: actionData, error: actionError } = await supabase
        .schema("mafia")
        .from("match_actions")
        .select("*")
        .eq("phase_id", phaseId)
        .eq("actor_user_id", myPlayer?.userId)
        .eq("action_type", "vote")
        .maybeSingle();

      if (cancelled || actionError || !actionData) return;

      setSelectedTarget(actionData.target_user_id);
      setSubmitted(true);
    }

    restoreVote();

    return () => {
      cancelled = true;
    };
  }, [match.id, gameJwt, myPlayer?.userId]);

  const isDead = myPlayer && !myPlayer.alive;

  const handleVote = async (targetId: string | null) => {
    setIsSubmitting(true);
    setVoteError(null);
    try {
      await submitAction(match.id, "vote", targetId, gameJwt);
      setSubmitted(true);
      if (targetId) {
        setSelectedTarget(targetId);
      }
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : "투표 실패");
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
        <GameStage players={players} myUserId={myPlayer?.userId} mood="light" />
        <BottomSheet title="관전 피드">
          <p className="text-sm text-white/55">당신은 사망하여 투표권이 없습니다. 투표를 지켜보세요.</p>
          <SpectatorFeed events={events} players={players} />
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center p-5 pb-24">
      {/* 무대 — 직접 지목 */}
      <GameStage
        players={players}
        myUserId={myPlayer?.userId}
        mood="light"
        selectable
        selectedId={selectedTarget}
        selectedGlow={GLOW.selectDusk}
        disabled={submitted}
        onSelect={(id) => !submitted && setSelectedTarget(id)}
      />

      {/* 창 — 확정/기권 */}
      <ActionModal
        eyebrow="투표 시간"
        title={
          submitted
            ? selectedTarget
              ? "투표 완료"
              : "기권 완료"
            : selectedName
              ? `${selectedName}님을 처형대에 올릴까요?`
              : "무대 위 인물을 지목하세요"
        }
        mood="light"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="amber"
              onClick={() => handleVote(selectedTarget)}
              disabled={!selectedTarget || isSubmitting || submitted}
              className="w-full"
            >
              {submitted && selectedTarget ? "투표 완료" : isSubmitting ? "전송 중..." : "투표 확정"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleVote(null)}
              disabled={isSubmitting || submitted}
              className="w-full border-[#2b2118]/25 text-[#5c4d3c] hover:bg-[#2b2118]/5"
            >
              {submitted && !selectedTarget ? "기권 완료" : "기권하기"}
            </Button>
          </div>
        }
      >
        <p className="mt-1 text-sm text-[#5c4d3c]">
          가장 많은 표를 받은 사람이 처형됩니다. 확신이 없으면 기권하세요.
        </p>
        {voteError ? (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {voteError}
          </p>
        ) : null}
      </ActionModal>
    </div>
  );
}
