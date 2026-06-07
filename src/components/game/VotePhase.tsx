"use client";

import { useState, useEffect } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { Button } from "@/components/game/ui/Button";
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

  if (isDead) {
    return (
      <div className="flex h-full w-full items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-lg border border-white/10 bg-white/[0.04] p-10 text-center">
          <h2 className="text-sm font-medium text-white/50 tracking-widest uppercase">투표 시간</h2>
          <h1 className="mt-6 text-2xl font-semibold text-white">관전 모드</h1>
          <p className="mt-4 text-sm text-white/40">당신은 사망하여 투표권이 없습니다. 다른 사람들의 투표를 지켜보세요.</p>
          <SpectatorFeed events={events} players={players} />
        </div>
      </div>
    );
  }

  const alivePlayers = players.filter(p => p.alive);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
      <div className="rounded-lg border border-amber-400/15 bg-amber-950/25 p-6 sm:p-10 text-center">
        <h2 className="text-sm font-medium text-amber-300/70 tracking-widest uppercase">투표 시간</h2>
        <h1 className="mt-2 text-2xl font-semibold text-amber-100">마피아로 의심되는 사람을 투표하세요</h1>
        <p className="mt-2 text-sm text-amber-200/50">가장 많은 표를 받은 사람이 처형됩니다. 아무도 고르지 않으려면 기권하세요.</p>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {alivePlayers.map((p) => (
            <button
              key={p.userId}
              onClick={() => !submitted && setSelectedTarget(p.userId)}
              disabled={submitted}
              className={`rounded-md border p-4 text-center transition-colors ${
                selectedTarget === p.userId
                  ? "border-amber-400 bg-amber-400/20 text-amber-100"
                  : "border-white/10 bg-black/20 text-white/70 hover:bg-white/5 hover:text-white"
              } ${submitted && selectedTarget !== p.userId ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              <div className="truncate text-sm font-medium">{p.displayName}</div>
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="amber"
            onClick={() => handleVote(selectedTarget)}
            disabled={!selectedTarget || isSubmitting || submitted}
            className="w-full max-w-[200px]"
          >
            {submitted && selectedTarget ? "투표 완료" : isSubmitting ? "전송 중..." : "선택한 사람 투표"}
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => handleVote(null)}
            disabled={isSubmitting || submitted}
            className="w-full max-w-[200px]"
          >
            {submitted && !selectedTarget ? "기권 완료" : "기권하기"}
          </Button>
        </div>
        {voteError ? (
          <p role="alert" className="mt-4 text-sm text-rose-300">{voteError}</p>
        ) : null}
      </div>
    </div>
  );
}
