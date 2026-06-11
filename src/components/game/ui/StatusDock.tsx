"use client";

/**
 * StatusDock — 하단 상태 독. "지금 무슨 시간인지"가 항상 아래에 떠 있다.
 *
 * 사용자 요구 (2026-06-11): '자유 토론 시간' 같은 상태를 하단에 직관 표시.
 * 페이즈 라벨 + 상태 한 줄 + 일차 + 타이머 + 내 직업 칩을 한 곳에.
 * 어두운 유리 — 밝은 무드 위에서도 닻처럼 안정적으로.
 */

import { PhaseTimer } from "@/components/game/PhaseTimer";
import { FACTION_COLORS } from "@/config/design-tokens";
import { roleLabel } from "@/config/gomdori-roles";

const STATE_LINE: Record<string, { label: string; line: string }> = {
  lobby: { label: "로비", line: "참가자를 모으는 중" },
  role_assign: { label: "직업 배정", line: "정체를 확인하세요" },
  night: { label: "밤", line: "능력의 시간 — 조용히 움직이세요" },
  night_suspect: { label: "의심", line: "의심 투표 — 최다 의심자는 능력 봉인" },
  night_resolve: { label: "밤 정리", line: "밤의 결과를 정리하는 중" },
  day: { label: "아침", line: "자유 토론 시간 — 음성으로 추리하세요" },
  vote: { label: "투표", line: "무대 위 인물을 지목하세요" },
  verdict: { label: "판결", line: "투표 결과 발표" },
  ended: { label: "결과", line: "게임 종료 — 정체 공개" },
};

export function StatusDock({
  status,
  dayNumber,
  phaseEndsAt,
  myRole,
  myFaction,
  inline = false,
}: {
  status?: string;
  dayNumber?: number;
  phaseEndsAt?: string | null;
  myRole?: string;
  myFaction?: string;
  /** true 면 fixed 대신 흐름 내 렌더 (preview 작업대용). */
  inline?: boolean;
}) {
  const state = status ? STATE_LINE[status] : undefined;
  if (!state) return null;
  const factionAccent =
    FACTION_COLORS[(myFaction ?? "neutral") as keyof typeof FACTION_COLORS]?.accent ??
    "text-white/70";

  return (
    <div
      className={
        inline
          ? "pointer-events-none flex justify-center px-3 pb-3"
          : "pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3"
      }
    >
      <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-white/12 border-t-white/20 bg-[#100e18]/85 px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {dayNumber ? (
              <span className="shrink-0 font-mono text-[0.625rem] text-white/40">{dayNumber}일차</span>
            ) : null}
            <span className="shrink-0 text-sm font-semibold text-white">{state.label}</span>
            <span className="truncate text-xs text-white/50">{state.line}</span>
          </div>
        </div>
        {myRole && status !== "lobby" && status !== "role_assign" && status !== "ended" ? (
          <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs sm:flex">
            <span className="text-white/40">나</span>
            <span className={factionAccent}>{roleLabel(myRole)}</span>
          </div>
        ) : null}
        {phaseEndsAt ? (
          <div className="shrink-0">
            <PhaseTimer expectedEndedAt={phaseEndsAt} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
