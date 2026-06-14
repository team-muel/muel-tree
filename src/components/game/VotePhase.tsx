"use client";

/**
 * VotePhase — 투표. 페이지 전환 없이 무대 위에서 즉시 투표 + 낙인 표시 (교체 가능).
 * - ActionModal 대신 인플로우(In-flow) 패널로 자연스럽게 배치.
 */

import { useState, useEffect } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { GLOW } from "@/config/design-tokens";
import { resolveMyStatusEffects } from "@/config/status-effects";
import { Button } from "@/components/game/ui/Button";
import { GameStage } from "@/components/game/ui/GameStage";
import { BottomSheet } from "@/components/game/ui/BottomSheet";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";

type VotePhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events?: Array<{ id: string; event_type: string; phase_id?: string; payload?: Record<string, unknown> }>;
};

export function VotePhase({ match, players, myPlayer, gameJwt, events = [] }: VotePhaseProps) {
  const myEffects = resolveMyStatusEffects(myPlayer?.userId, events);
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
      setSelectedTarget(targetId);
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
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center py-5 pb-24">
        <GameStage players={players} myUserId={myPlayer?.userId} mood="light" inspectable matchId={match.id} movable />
        <BottomSheet title="관전 피드">
          <p className="text-sm text-white/55">당신은 사망하여 투표권이 없습니다. 투표를 지켜보세요.</p>
          <SpectatorFeed events={events} players={players} />
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center py-5 pb-24">
      {/* 무대 — 즉시 지목 투표 및 낙인 연동 */}
      <GameStage
        players={players}
        myUserId={myPlayer?.userId}
        mood="light"
        selectable
        inspectable
        matchId={match.id}
        selectedId={selectedTarget}
        votedTargetId={selectedTarget}
        selectedGlow={GLOW.selectDusk}
        disabled={isSubmitting}
        onSelect={(id) => {
          if (!isSubmitting) {
            handleVote(id);
          }
        }}
        myEffects={myEffects}
      />

      {/* 투표 안내 패널 (In-flow) */}
      <div className="mt-6 w-full max-w-md mx-auto rounded-2xl border p-5 shadow-sm bg-white/70 backdrop-blur-md border-[#2b2118]/15 text-[#2b2118] text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-amber-800">
          투표 시간
        </div>
        {myEffects.includes("enchanted") && (
          <div className="mt-3 rounded-lg border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 leading-relaxed text-left">
            💖 현재 매료 상태입니다! 투표 권한이 연주자에게 위임되어 최종 투표 결과가 달라질 수 있습니다.
          </div>
        )}
        <h2 className="mt-1 text-lg font-semibold">
          {selectedTarget !== null && submitted
            ? `${selectedName}님에게 투표했습니다.`
            : selectedTarget === null && submitted
              ? "기권했습니다."
              : "무대 위 인물을 선택해 투표하세요."}
        </h2>
        <p className="mt-1 text-xs text-[#5c4d3c] leading-relaxed">
          가장 많은 표를 받은 사람이 처형대에 오릅니다. 언제든지 다른 대상을 선택해 바꿀 수 있으며, 기권하려면 아래 단추를 누르세요.
        </p>

        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            onClick={() => handleVote(null)}
            disabled={isSubmitting}
            className="w-full max-w-[200px] border-[#2b2118]/25 text-[#5c4d3c] hover:bg-[#2b2118]/5"
          >
            {selectedTarget === null && submitted ? "기권 완료 ✓" : "기권하기"}
          </Button>
        </div>

        {voteError ? (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            {voteError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
