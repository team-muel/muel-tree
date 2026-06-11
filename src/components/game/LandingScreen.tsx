"use client";

/**
 * LandingScreen — 진입 화면 (게임 만들기 / 참가하기).
 *
 * 2026-06-11 개편: 정적 안내 카드 → 인게임과 같은 무대 문법.
 * - 키 아트(night-muse)가 공간을 열고,
 * - 이 채널에 모인 사람들이 Discord 아바타 토큰으로 무대 위를 배회하며 (Feign 최소구조),
 * - 행동(만들기/참가)이 무대 아래 선다.
 *
 * 레이아웃: useDisplay().layout 으로 모바일/데스크톱 *별도 구조* 렌더.
 * - 데스크톱: 와이드 패널 — 아트 헤더, 무대, 2열 액션.
 * - 모바일: 세로 흐름 — 컴팩트 아트, 무대가 가운데 호흡, 풀폭 액션 스택.
 * 로직(만들기/참가 판정)은 기존과 동일 — 구조만 개편.
 */

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { participantAvatarUrl, type InstanceParticipant } from "@/lib/discord";
import { GameStage } from "@/components/game/ui/GameStage";
import { IllustrationScene } from "@/components/game/ui/IllustrationScene";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { useDisplay } from "@/lib/game/display";

type LandingScreenProps = {
  existing: MatchSummary | null;
  participants: InstanceParticipant[];
  myUserId?: string | null;
  onCreate: () => void;
  onJoin: () => void;
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
        아직 무대가 비어 있어요 — 음성 채널에서 Activity를 연 사람이 여기 모입니다.
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

function Actions({
  existing,
  onCreate,
  onJoin,
  stacked = false,
}: {
  existing: MatchSummary | null;
  onCreate: () => void;
  onJoin: () => void;
  stacked?: boolean;
}) {
  const joinable = existing != null && existing.status === "lobby";
  return (
    <div className={`grid gap-3 ${stacked ? "grid-cols-1" : "grid-cols-2"}`}>
      <button
        type="button"
        onClick={onCreate}
        className="h-14 rounded-lg bg-emerald-300 text-base font-semibold text-slate-950 transition-colors hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        게임 만들기
      </button>
      <button
        type="button"
        onClick={onJoin}
        disabled={existing == null}
        className="h-14 rounded-lg border border-white/15 bg-white/[0.06] text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:text-white/30 disabled:hover:bg-white/[0.06]"
      >
        {joinable ? "참가하기" : existing != null ? "진행 중인 게임 참가" : "열린 게임 없음"}
      </button>
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
  existing,
  participants,
  myUserId,
  onCreate,
  onJoin,
}: LandingScreenProps) {
  const { layout } = useDisplay();

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
        <RosterStage participants={participants} myUserId={myUserId} />
        <Actions existing={existing} onCreate={onCreate} onJoin={onJoin} stacked />
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
        <RosterStage participants={participants} myUserId={myUserId} />
        <Actions existing={existing} onCreate={onCreate} onJoin={onJoin} />
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-white/40">이 음성 채널에서 함께 플레이합니다.</p>
          <FlowStrip />
        </div>
      </div>
    </div>
  );
}
