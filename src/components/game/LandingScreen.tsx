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
import { useState } from "react";

type LandingScreenProps = {
  openMatches: MatchSummary[];
  playerCounts: Record<string, number>;
  participants: InstanceParticipant[];
  myUserId?: string | null;
  onCreate: () => void;
  onJoin: (matchId: string) => void;
  /** 직전 참가/생성 실패 알림 — 막다른 오류 화면 대신 여기서 재시도 (2026-06-12). */
  notice?: string | null;
  /** 게임방 목록 새로고침 — 참가/나가기 반복 중 잔존 목록을 손으로 갱신. */
  onRefresh?: () => void;
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
    <div className="text-center">
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

function LandingBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <IllustrationScene
        id="night-muse"
        priority
        drift
        quality={90}
        className="h-full w-full opacity-50"
        sizes="(max-width: 640px) 100vw, 896px"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_22%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_62%_45%,rgba(16,185,129,0.10),transparent_28%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e0b16]/55 via-[#15131e]/78 to-[#0b0a11]/96" />
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/45 to-transparent" />
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
      <div className="rounded-md border border-white/10 bg-black/35 px-4 py-6 text-center text-sm text-white/55 backdrop-blur-sm">
        아직 무대가 비어 있어요 — 음성 채널에서 Activity를 연 사람이 여기 모립니다.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/15 px-3 pt-3 backdrop-blur-[2px]">
      <div className="flex items-baseline justify-between px-1 text-xs text-white/35">
        <span>이 채널에 모인 사람</span>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-white/70">
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
  onRefresh,
}: {
  openMatches: MatchSummary[];
  playerCounts: Record<string, number>;
  onJoin: (matchId: string) => void;
  onRefresh?: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-semibold uppercase tracking-widest text-white/35">
          대기 중인 게임방 ({openMatches.length})
        </div>
        {onRefresh ? (
          <button
            type="button"
            disabled={refreshing}
            onClick={async () => {
              if (refreshing) return;
              setRefreshing(true);
              try {
                await onRefresh?.();
              } finally {
                setTimeout(() => setRefreshing(false), 500);
              }
            }}
            title="방 목록 새로고침"
            className="flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-white/60 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          >
            <span aria-hidden="true" className={`text-[10px] inline-block ${refreshing ? "animate-spin" : ""}`}>🔄</span> 새로고침
          </button>
        ) : null}
      </div>

      {openMatches.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-black/30 px-4 py-8 text-center text-sm text-white/55 backdrop-blur-sm">
          현재 대기 중인 게임방이 없습니다. 첫 번째 방을 만들어보세요!
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
          {openMatches.map((m) => {
            const count = playerCounts[m.id] || 0;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-white/[0.12] bg-[#12101a]/75 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.20)] backdrop-blur-md transition hover:border-emerald-300/25 hover:bg-[#171421]/85"
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
                  className="shrink-0 rounded-lg bg-emerald-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  참가
                </button>
              </div>
            );
          })}
        </div>
      )}
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
  notice,
  onRefresh,
}: LandingScreenProps) {
  const { layout } = useDisplay();

  const mainPanel = (
    <div className="flex flex-col gap-4">
      {notice ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          <span>{notice} — 잠시 후 다시 시도해주세요.</span>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="shrink-0 rounded border border-rose-300/30 px-2 py-0.5 text-xs text-rose-100 transition-colors hover:bg-rose-400/15"
            >
              새로고침
            </button>
          ) : null}
        </div>
      ) : null}
      <RosterStage participants={participants} myUserId={myUserId} />
      <MatchListPanel openMatches={openMatches} playerCounts={playerCounts} onJoin={onJoin} onRefresh={onRefresh} />
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onCreate}
          className="h-12 w-full rounded-lg bg-emerald-300 text-sm font-semibold text-slate-950 shadow-[0_10px_28px_rgba(52,211,153,0.16)] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          새 게임방 만들기
        </button>
      </div>
    </div>
  );

  if (layout === "mobile") {
    // 모바일: 한 패널 안에 아트를 낮게 깔고, 조작층은 선명하게 유지한다.
    return (
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 border-t-white/20 bg-[#15131e]/95 p-4 backdrop-blur-md">
        <LandingBackdrop />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="pt-6">
            <TitleLockup compact />
          </div>
          {mainPanel}
          <p className="text-center text-xs leading-5 text-white/45">
            이 음성 채널에서 함께 플레이합니다.
          </p>
          <FlowStrip />
        </div>
      </div>
    );
  }

  // 데스크톱: 아트를 패널 전체 뒤로 낮게 깔고, 방 선택/참가 조작층을 우선한다.
  return (
    <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 border-t-white/20 bg-[#15131e]/95 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <LandingBackdrop />
      <div className="relative z-10 space-y-5 p-7">
        <div className="pb-6 pt-10">
          <TitleLockup />
        </div>
        {mainPanel}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-white/45">이 음성 채널에서 함께 플레이합니다.</p>
          <FlowStrip />
        </div>
      </div>
    </div>
  );
}
