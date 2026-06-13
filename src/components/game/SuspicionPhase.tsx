"use client";

/**
 * SuspicionPhase — 밤 의심 투표. 투표와 같은 즉시 지목 + 개인 낙인 흐름.
 */

import { useEffect, useState } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { GLOW } from "@/config/design-tokens";
import { resolveMyStatusEffects } from "@/config/status-effects";
import { Button } from "@/components/game/ui/Button";
import { GameStage } from "@/components/game/ui/GameStage";
import { BottomSheet } from "@/components/game/ui/BottomSheet";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";

type SuspicionPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events?: Array<{ id: string; event_type: string; phase_id?: string; payload?: Record<string, unknown> }>;
};

/**
 * 밤 의심 투표 (canon §3). 최다 의심자는 다가오는 밤 능력을 쓸 수 없고 전원에게 공개된다.
 * 대상 없이 제출 = 기권(무투, canon §3). 동률/무표는 부결.
 */
export function SuspicionPhase({ match, players, myPlayer, gameJwt, events = [] }: SuspicionPhaseProps) {
  const myEffects = resolveMyStatusEffects(myPlayer?.userId, events);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const actorUserId = myPlayer?.userId;
    if (!match.id || !gameJwt || !actorUserId) return;

    let cancelled = false;
    const supabase = getGameSupabase(gameJwt);

    async function restoreSuspicionVote() {
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

      const { data: actionData, error: actionError } = await supabase
        .schema("mafia")
        .from("match_actions")
        .select("target_user_id")
        .eq("phase_id", phaseData.id)
        .eq("actor_user_id", actorUserId)
        .eq("action_type", "suspect")
        .maybeSingle();

      if (cancelled || actionError || !actionData) return;

      setSelectedTarget(actionData.target_user_id);
      setSubmitted(true);
    }

    restoreSuspicionVote();

    return () => {
      cancelled = true;
    };
  }, [match.id, gameJwt, myPlayer?.userId]);

  const isDead = myPlayer && !myPlayer.alive;

  const handleSuspicionVote = async (targetId: string | null) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await submitAction(match.id, "suspect", targetId, gameJwt);
      setSelectedTarget(targetId);
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
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center py-5 pb-24">
        <GameStage players={players} myUserId={myPlayer?.userId} mood="dark" inspectable matchId={match.id} movable />
        <BottomSheet title="관전 피드">
          <p className="text-sm text-white/55">사망하여 의심 투표에 참여할 수 없습니다.</p>
          <SpectatorFeed events={events} players={players} />
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center py-5 pb-24">
      <GameStage
        players={players}
        myUserId={myPlayer?.userId}
        mood="dark"
        selectable
        inspectable
        matchId={match.id}
        excludeSelf
        selectedId={selectedTarget}
        suspicionTargetId={selectedTarget}
        selectedGlow={GLOW.selectNight}
        disabled={isSubmitting}
        onSelect={(id) => {
          if (!isSubmitting) {
            handleSuspicionVote(id);
          }
        }}
        myEffects={myEffects}
      />

      <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-indigo-200/15 bg-[#15131e]/90 p-5 text-center text-white shadow-sm backdrop-blur-md">
        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-200/55">
          의심 투표
        </div>
        {myEffects.includes("enchanted") && (
          <div className="mt-3 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 leading-relaxed text-left">
            💖 현재 매료 상태입니다! 투표 권한이 연주자에게 위임되어 최종 의심 결과가 다르게 변경됩니다.
          </div>
        )}
        <h2 className="mt-1 text-lg font-semibold">
          {selectedTarget !== null && submitted
            ? `${selectedName}님에게 의심 낙인을 찍었습니다.`
            : selectedTarget === null && submitted
              ? "기권했습니다."
              : "무대 위 인물을 선택해 의심 낙인을 찍으세요."}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-indigo-100/45">
          최다 의심자는 전원에게 공개되고 이번 밤 능력을 쓸 수 없습니다. 다른 대상을 선택하면 교체됩니다.
        </p>

        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleSuspicionVote(null)}
            disabled={isSubmitting}
            className="w-full max-w-[200px] border-indigo-200/20 text-indigo-100/70 hover:bg-indigo-200/10"
          >
            {selectedTarget === null && submitted ? "기권 완료 ✓" : "기권하기"}
          </Button>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
