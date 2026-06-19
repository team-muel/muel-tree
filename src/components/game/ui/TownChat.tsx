"use client";

/**
 * TownChat — 마을(공용)·영혼 채팅의 단일 컴포넌트.
 *
 * 이전엔 DayPhase·VerdictPhase 가 각각 `DockableChatPanel + MatchChat` 조합과
 * 생존/사망 분기를 통째로 복붙해 두 벌이 있었다(드리프트 위험). 그 합성을 한 곳으로
 * 모은다 — 사망 모드 카피("영혼끼리…")는 동일하므로 내장하고, 페이즈마다 다른 것
 * (생존 카피·발언 권한·시스템 알림·사망 부가 노드)만 props 로 받는다.
 *
 * 채널은 항상 ["town","dead"] (마을 공용 + 영혼). 도크 위치·접힘은 DockableChatPanel
 * 이 matchId 범위 localStorage 로 유지.
 */

import type { PlayerSummary } from "@/lib/game/api";
import { DockableChatPanel } from "@/components/game/ui/DockableChatPanel";
import { MatchChat } from "@/components/game/ui/MatchChat";

const TOWN_CHANNELS = ["town", "dead"];

type TownChatProps = {
  matchId: string;
  gameJwt: string;
  myPlayer: PlayerSummary | null;
  players: PlayerSummary[];
  defaultOpen?: boolean;
  /** 시간 조절 등 시스템 공지 (DayPhase 가 전달). */
  systemNotices?: Array<{ id: string; text: string }>;
  /** 생존 모드 입력창 placeholder (페이즈별). */
  alivePlaceholder: string;
  /** 생존 모드 빈 채팅 안내 (페이즈별). */
  aliveEmptyHint: string;
  /** 생존 모드 발언 가능 여부 (예: VerdictPhase 는 후보자만). 기본 true. */
  canSend?: boolean;
  /** canSend=false 일 때 안내문. */
  disabledHint?: string;
  /** 사망 모드에서 채팅 아래에 덧붙일 노드 (예: 관전 안내 + SpectatorFeed). */
  deadExtra?: React.ReactNode;
};

export function TownChat({
  matchId,
  gameJwt,
  myPlayer,
  players,
  defaultOpen = true,
  systemNotices,
  alivePlaceholder,
  aliveEmptyHint,
  canSend = true,
  disabledHint,
  deadExtra,
}: TownChatProps) {
  const dead = !!myPlayer && !myPlayer.alive;

  if (dead) {
    return (
      <DockableChatPanel matchId={matchId} title="관전 · 영혼 채팅" defaultOpen={defaultOpen}>
        <MatchChat
          matchId={matchId}
          gameJwt={gameJwt}
          myPlayer={myPlayer}
          players={players}
          channels={TOWN_CHANNELS}
          placeholder="영혼끼리 대화..."
          emptyHint="영혼들과 대화하세요 (산 자에겐 보이지 않습니다)"
          systemNotices={systemNotices}
        />
        {deadExtra}
      </DockableChatPanel>
    );
  }

  return (
    <DockableChatPanel matchId={matchId} title="마을 채팅" defaultOpen={defaultOpen}>
      <MatchChat
        matchId={matchId}
        gameJwt={gameJwt}
        myPlayer={myPlayer}
        players={players}
        channels={TOWN_CHANNELS}
        canSend={canSend}
        placeholder={alivePlaceholder}
        emptyHint={aliveEmptyHint}
        disabledHint={disabledHint}
        systemNotices={systemNotices}
      />
    </DockableChatPanel>
  );
}
