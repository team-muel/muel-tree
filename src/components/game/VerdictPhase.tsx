"use client";

/**
 * VerdictPhase — 판결 투표 (최후의 반론).
 * - 기소된 후보자를 무대 중앙 스포트라이트에 세웁니다.
 * - 타 주민들이 찬성(verdict_approve) 또는 반대(verdict_reject)를 투표하는 패널을 인플로우 카드로 제공합니다.
 * - 찬반 상태 표기 및 변경 가능.
 */

import { useState, useEffect } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { PlayerToken } from "@/components/game/ui/PlayerToken";
import { GameStage } from "@/components/game/ui/GameStage";

type VerdictPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
};

export function VerdictPhase({ match, players, myPlayer, gameJwt }: VerdictPhaseProps) {
  const verdict = match.engineState?.verdict as Record<string, unknown> | undefined;
  const candidateUserId = (verdict?.candidateUserId as string | undefined) || null;
  const candidate = candidateUserId ? players.find((p) => p.userId === candidateUserId) : null;
  const watchers = candidate ? players.filter((p) => p.userId !== candidate.userId) : players;

  const [selectedVote, setSelectedVote] = useState<"approve" | "reject" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    const myUserId = myPlayer?.userId;
    if (!match.id || !gameJwt || !myUserId) return;

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
        .select("action_type")
        .eq("phase_id", phaseId)
        .eq("actor_user_id", myUserId)
        .in("action_type", ["verdict_approve", "verdict_reject"])
        .maybeSingle();

      if (cancelled || actionError || !actionData) return;

      setSelectedVote(actionData.action_type === "verdict_approve" ? "approve" : "reject");
    }

    restoreVote();

    return () => {
      cancelled = true;
    };
  }, [match.id, gameJwt, myPlayer?.userId]);

  const handleVote = async (voteType: "approve" | "reject") => {
    setIsSubmitting(true);
    setVoteError(null);
    try {
      const action = voteType === "approve" ? "verdict_approve" : "verdict_reject";
      await submitAction(match.id, action, null, gameJwt);
      setSelectedVote(voteType);
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : "판결 투표 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-5 pb-24 max-w-5xl mx-auto">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-500">
        최후의 반론
      </h2>

      {/* 중앙 스포트라이트 — 처형대 위 처형 후보자 */}
      <div className="relative mt-2 flex min-h-[11.25rem] w-full max-w-md flex-col items-center justify-end pb-4">
        <div
          aria-hidden="true"
          className="gomdori-spotlight pointer-events-none absolute inset-x-[18%] top-0 bottom-2 [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)] bg-gradient-to-b from-amber-200/20 via-amber-300/5 to-transparent"
        />
        {candidate ? (
          <div className="relative w-[7rem] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700">
            <PlayerToken
              name={candidate.displayName}
              avatarUrl={candidate.avatarUrl}
              alive={candidate.alive}
              mood="dark"
              sub="최후의 반론 진행 중"
              selected
              selectedGlow="ring-2 ring-amber-300/60 shadow-[0_0_36px_rgba(252,211,77,0.35)]"
            />
          </div>
        ) : (
          <p className="relative pb-6 text-sm text-white/45">처형 후보자가 없습니다.</p>
        )}
      </div>

      {/* 찬성/반대 투표 진행 카드 패널 (In-flow) */}
      <div className="w-full max-w-md rounded-2xl border p-5 shadow-md bg-white/70 backdrop-blur-md border-[#2b2118]/15 text-[#2b2118] text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-amber-800">
          주민 투표 진행
        </div>

        {myPlayer?.userId === candidateUserId ? (
          <div className="mt-3 text-sm font-semibold text-rose-700">
            당신은 현재 최후의 반론 후보자입니다. 다른 주민들에게 결백을 증명하십시오!
          </div>
        ) : myPlayer && !myPlayer.alive ? (
          <div className="mt-3 text-sm text-[#5c4d3c]">
            당신은 사망하여 판결 투표권이 없습니다. 다른 플레이어들의 선택을 지켜보세요.
          </div>
        ) : (
          <>
            <h2 className="mt-1 text-lg font-semibold">
              {candidate ? `${candidate.displayName}님을 처형하시겠습니까?` : "기소 후보 찬반 결정"}
            </h2>
            <p className="mt-1 text-xs text-[#5c4d3c]">
              찬성이 과반수를 넘어가면 후보자가 처형됩니다.
            </p>
            <div className="mt-4 flex gap-3 justify-center">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleVote("approve")}
                className={`flex-1 h-12 rounded-lg text-sm font-bold transition ${
                  selectedVote === "approve"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                    : "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                }`}
              >
                {selectedVote === "approve" ? "찬성 완료 ✓" : "찬성 (Approve)"}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleVote("reject")}
                className={`flex-1 h-12 rounded-lg text-sm font-bold transition ${
                  selectedVote === "reject"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {selectedVote === "reject" ? "반대 완료 ✓" : "반대 (Reject)"}
              </button>
            </div>
          </>
        )}

        {voteError && <p className="mt-2 text-xs text-rose-600">{voteError}</p>}
      </div>

      {/* 무대 아래쪽에서 지켜보는 주민들 */}
      <div className="w-full mt-6">
        <div className="text-xs text-white/35 mb-2 text-center">관전 중인 마을 주민</div>
        <GameStage
          players={watchers}
          myUserId={myPlayer?.userId}
          mood="dark"
          matchId={match.id}
          className="opacity-80"
        />
      </div>
    </div>
  );
}
