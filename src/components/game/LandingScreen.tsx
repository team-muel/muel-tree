"use client";

/**
 * LandingScreen — 진입 화면 (게임 만들기 / 참가하기).
 *
 * 2026-06-11 개편: 정적 안내 카드 → 인게임과 같은 무대 문법.
 * - 키 아트(night-muse)가 공간을 열고,
 * - 이 채널에 모인 사람들이 Discord 아바타 토큰으로 무대 위를 배회하며 (Feign 최소구조),
 * - 행동(만들기/참가)이 무대 아래 선다.
 *
 * 2026-06-12 2차 개편: 복수 테이블 리스트형 방 선택 기능 추가.
 */

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { participantAvatarUrl, type InstanceParticipant } from "@/lib/discord";
import { GameStage } from "@/components/game/ui/GameStage";
import { IllustrationScene } from "@/components/game/ui/IllustrationScene";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { useDisplay } from "@/lib/game/display";

type LandingScreenProps = {
  openMatches: MatchSummary[];
  playerCounts: Record<string, number>;
  participants: InstanceParticipant[];
  myUserId?: string | null;
  onCreate: () => void;
  onJoin: (matchId: string) => void;
};

/** Activity 인스턴스 참가자 → 무대 토큰. 매치 전이므로 전원 생존·비호스트 취급. */
function toStagePlayers(participants: InstanceParticipant[]): PlayerSummary[] {
  return participants.map((p) => ({
    matchId: "landing",
    userId: p.id,
    displayName: p.nickname || p.global_name || p.username,
    avatarUrl: participantAvatarUrl(p),
    alive: true,
    ready: false,
    isHost: false,
    joinedAt: "",
    lastSeenAt: null,
    role: null,
    faction: null,
  }));
}

function TitleLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 pb-3 text-center">
      <div className="text-sm text-white/45">Gomdori Mafia</div>
      <h1
        className={`mt-1 font-semibold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        천사와 악마의 추리
      </h1>
    </div>
  );
}

function RosterStage({
  participants,
  myUserId,
}: {
  participants: InstanceParticipant[];
  myUserId?: string | null;
}) {
  const stagePlayers = toStagePlayers(participants);
  if (stagePlayers.length === 0) {
    return (
      <div className="rounded-md border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-white/40">
        아직 무대가 비어 있어요 — 음성 채널에서 Activity를 연 사람이 여기 모립니다.
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline justify-between px-1 text-xs text-white/35">
        <span>이 채널에 모인 사람</span>
        <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-white/70">
          {stagePlayers.length}명
        </span>
      </div>
      <GameStage
        players={stagePlayers}
        myUserId={myUserId}
        mood="dark"
        roam
        chrome={false}
      />
    </div>
  );
}

function MatchListPanel({
  openMatches,
  playerCounts,
  onJoin,
}: {
  openMatches: MatchSummary[];
  playerCounts: Record<string, number>;
  onJoin: (matchId: string) => void;
}) {
  if (openMatches.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-black/10 px-4 py-8 text-center text-sm text-white/30">
        현재 대기 중인 게임방이 없습니다. 첫 번째 방을 만들어보세요!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-widest text-white/35 px-1">
        대기 중인 게임방 ({openMatches.length})
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
        {openMatches.map((m) => {
          const count = playerCounts[m.id] || 0;
          return (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="truncate text-sm font-semibold text-white">
                  {m.tableLabel || "마피아 게임방"}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  참가 인원: {count} / {m.maxPlayers}명
                </div>
              </div>
              <button
                type="button"
                onClick={() => onJoin(m.id)}
                className="shrink-0 rounded-lg bg-emerald-400 hover:bg-emerald-300 px-4 py-2 text-xs font-bold text-slate-950 transition"
              >
                참가
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-white/35">
      {GOMDORI_RULES.publicFlowSteps.map((step, index) => (
        <span key={step.key} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden="true">→</span> : null}
          <span>{step.label}</span>
        </span>
      ))}
    </div>
  );
}

export function LandingScreen({
  openMatches,
  playerCounts,
  participants,
  myUserId,
  onCreate,
  onJoin,
}: LandingScreenProps) {
  const { layout } = useDisplay();

  const mainPanel = (
    <div className="flex flex-col gap-4">
      <RosterStage participants={participants} myUserId={myUserId} />
      <MatchListPanel openMatches={openMatches} playerCounts={playerCounts} onJoin={onJoin} />
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onCreate}
          className="w-full h-12 rounded-lg bg-emerald-300 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          새 게임방 만들기
        </button>
      </div>
    </div>
  );

  if (layout === "mobile") {
    // 모바일: 세로 흐름 — 아트는 컴팩트, 무대가 가운데서 호흡, 액션은 풀폭 스택.
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="relative h-36 overflow-hidden rounded-2xl border border-white/10">
          <IllustrationScene
            id="night-muse"
            priority
            drift
            className="absolute inset-0"
            sizes="100vw"
          />
          <TitleLockup compact />
        </div>
        {mainPanel}
        <p className="text-center text-xs leading-5 text-white/40">
          이 음성 채널에서 함께 플레이합니다.
        </p>
        <FlowStrip />
      </div>
    );
  }

  // 데스크톱: 와이드 글래스 패널 — 아트 헤더가 공간을 열고 무대·액션이 따른다.
  return (
    <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 border-t-white/20 bg-[#15131e]/90 backdrop-blur-md">
      <div className="relative h-52">
        <IllustrationScene
          id="night-muse"
          priority
          drift
          className="absolute inset-0"
          sizes="(max-width: 1024px) 100vw, 896px"
        />
        <TitleLockup />
      </div>
      <div className="space-y-5 p-7 pt-5">
        {mainPanel}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-white/40">이 음성 채널에서 함께 플레이합니다.</p>
          <FlowStrip />
        </div>
      </div>
    </div>
  );
}
