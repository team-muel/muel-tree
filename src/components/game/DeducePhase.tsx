"use client";

/**
 * DeducePhase — 상호추리 전용 페이즈 (night_deduce, 2026-07-02).
 *
 * canon 하브레터스 〈능력2〉 삶이 있는 곳으로: "매 밤마다 서로 정체 추리".
 * 하브레터스와 악마 처치자가 모두 생존한 매치에서만 phase-advance 가
 * night_suspect 뒤에 이 페이즈를 끼운다 — 하브가 없는 게임은 이 화면 자체가 없다.
 *
 * 행동 주체는 두 축뿐: 하브레터스(habreterus_deduce, 악마 지목)와 악마 처치자
 * (demon_deduce, 하브 지목). 나머지는 대기 화면 — 누가 추리 중인지는 드러내지 않는다
 * (하브 존재는 시작 통지로 공개돼 있으나 악마 정체는 비밀).
 */

import { useState } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { GLOW } from "@/config/design-tokens";
import { roleMeta } from "@/config/gomdori-roles";
import { GameStage } from "@/components/game/ui/GameStage";
import { TownChat } from "@/components/game/ui/TownChat";

type DeducePhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events?: Array<{ id: string; event_type: string; phase_id?: string; payload?: Record<string, unknown> }>;
};

/** 이 페이즈에서 내가 제출할 추리 액션 — 하브/악마 처치자 외에는 null(대기). */
function myDeduceAction(myPlayer: PlayerSummary | null): { actionType: string; title: string; detail: string } | null {
  if (!myPlayer?.alive || !myPlayer.role) return null;
  const role = myPlayer.role;
  if (role === "habreterus") {
    return {
      actionType: "habreterus_deduce",
      title: "삶이 있는 곳으로",
      detail: "악마라 의심되는 대상을 지목하세요. 적중하면 이번 밤 받는 부정 효과를 모두 무시합니다.",
    };
  }
  if (roleMeta(role)?.roster === "demon") {
    return {
      actionType: "demon_deduce",
      title: "역추리",
      detail: "하브레터스로 의심되는 대상을 지목하세요. 적중하면 치료를 무시하고 다음 처치로 탈락시킵니다.",
    };
  }
  return null;
}

export function DeducePhase({ match, players, myPlayer, gameJwt, events = [] }: DeducePhaseProps) {
  const action = myDeduceAction(myPlayer);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeduce = async (targetId: string) => {
    if (!action) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitAction(match.id, action.actionType, targetId, gameJwt);
      setSelectedTarget(targetId);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "추리 제출 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!action) {
    // 관전/비관여자 — 무대는 유지하되 조용한 대기. 사망자는 영혼 채팅으로 진행을 본다.
    return (
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center py-5 pb-24">
        <GameStage players={players} myUserId={myPlayer?.userId} mood="dark" inspectable matchId={match.id} movable={Boolean(myPlayer?.alive)} />
        {myPlayer && !myPlayer.alive ? (
          <TownChat
            matchId={match.id}
            gameJwt={gameJwt}
            myPlayer={myPlayer}
            players={players}
            events={events}
            defaultOpen={false}
            alivePlaceholder="정체 추리 중입니다..."
            aliveEmptyHint="아직 추리 이야기가 없습니다."
          />
        ) : (
          <p className="mx-auto mt-6 max-w-md text-center text-sm text-indigo-100/45">
            깊은 밤 — 누군가 서로의 정체를 가늠하고 있습니다. 잠시 후 밤이 이어집니다.
          </p>
        )}
      </div>
    );
  }

  const selectedName = selectedTarget
    ? players.find((p) => p.userId === selectedTarget)?.displayName
    : null;

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
        selectedGlow={GLOW.selectNight}
        disabled={isSubmitting}
        onSelect={(id) => {
          if (!isSubmitting) handleDeduce(id);
        }}
      />

      <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-indigo-200/15 bg-[#15131e]/90 p-5 text-center text-white shadow-sm backdrop-blur-md">
        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-200/55">
          정체 추리
        </div>
        <h2 className="mt-1 text-lg font-semibold">
          {submitted && selectedName ? `${selectedName}님을 지목했습니다.` : action.title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-indigo-100/45">
          {action.detail} 다른 대상을 선택하면 교체됩니다.
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
