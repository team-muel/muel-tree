"use client";

/**
 * VotePhase — 투표. 황혼의 무대 (light 무드, 금빛이 짙어진다).
 * 대상은 PlayerToken 테이블 — 선택 순간에만 황혼 광휘(GLOW.selectDusk).
 * 로직(복원 useEffect·제출)은 그대로, 시각만 오버홀 (2026-06-11).
 */

import { useState, useEffect } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { MOOD, GLOW } from "@/config/design-tokens";
import { Button } from "@/components/game/ui/Button";
import { PlayerToken } from "@/components/game/ui/PlayerToken";
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
  const ink = MOOD.light;

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
        <div className={`${ink.panelStrong} w-full max-w-lg p-10 text-center`}>
          <h2 className="text-sm font-medium uppercase tracking-widest text-amber-800">투표 시간</h2>
          <h1 className={`mt-6 text-2xl font-semibold ${ink.heading}`}>관전 모드</h1>
          <p className={`mt-4 text-sm ${ink.body}`}>
            당신은 사망하여 투표권이 없습니다. 다른 사람들의 투표를 지켜보세요.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-[#15131e]/90 p-3 text-left">
            <SpectatorFeed events={events} players={players} />
          </div>
        </div>
      </div>
    );
  }

  const alivePlayers = players.filter((p) => p.alive);

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col p-5">
      <div className={`${ink.panelStrong} p-6 text-center sm:p-10`}>
        <h2 className="text-sm font-medium uppercase tracking-widest text-amber-800">투표 시간</h2>
        <h1 className={`mt-2 text-2xl font-semibold ${ink.heading}`}>
          마피아로 의심되는 사람을 투표하세요
        </h1>
        <p className={`mt-2 text-sm ${ink.body}`}>
          가장 많은 표를 받은 사람이 처형됩니다. 아무도 고르지 않으려면 기권하세요.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {alivePlayers.map((p) => (
            <PlayerToken
              key={p.userId}
              name={p.displayName}
              avatarUrl={p.avatarUrl}
              alive
              mood="light"
              selected={selectedTarget === p.userId}
              selectedGlow={GLOW.selectDusk}
              disabled={submitted}
              onClick={() => !submitted && setSelectedTarget(p.userId)}
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
            className="w-full max-w-[200px] border-[#2b2118]/25 text-[#5c4d3c] hover:bg-[#2b2118]/5"
          >
            {submitted && !selectedTarget ? "기권 완료" : "기권하기"}
          </Button>
        </div>
        {voteError ? (
          <p role="alert" className="mt-4 text-sm text-rose-700">
            {voteError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
