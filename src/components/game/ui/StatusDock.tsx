/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * StatusDock — 하단 상태 독 + "나" 프로필 (Discord 하단 프로필 차용, 2026-06-11).
 *
 * 접힘(기본) = Discord식 프로필 바: 좌측에 내 아바타·이름·직업(진영색),
 *   우측에 페이즈 라벨·상태 한 줄·타이머. "지금 무슨 시간인지"는 그대로 우측에.
 * 펼침 = 프로필을 탭하면 위로 올라오는 내 정체 카드(MyRolePanel) — 직업·능력·설명을
 *   언제든 다시 읽는다. 로비·직업배정·종료에선 직업 비노출(프로필 클러스터 숨김).
 */

import { useState } from "react";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import { FACTION_COLORS } from "@/config/design-tokens";
import { roleLabel } from "@/config/gomdori-roles";
import { MyRolePanel } from "@/components/game/ui/MyRolePanel";

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

function initialOf(name?: string): string {
  const t = (name ?? "").trim();
  return t ? Array.from(t)[0].toUpperCase() : "나";
}

export function StatusDock({
  status,
  dayNumber,
  phaseEndsAt,
  myRole,
  myFaction,
  myName,
  myAvatarUrl,
  inline = false,
}: {
  status?: string;
  dayNumber?: number;
  phaseEndsAt?: string | null;
  myRole?: string;
  myFaction?: string;
  /** Discord 표시명 — 프로필 바 좌측. */
  myName?: string;
  /** Discord 아바타 — 없으면 이니셜 토큰. */
  myAvatarUrl?: string | null;
  /** true 면 fixed 대신 흐름 내 렌더 (preview 작업대용). */
  inline?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const state = status ? STATE_LINE[status] : undefined;

  // 직업 노출 페이즈에서만 프로필 클러스터를 켠다 (로비·배정·종료 제외).
  const showProfile =
    Boolean(myRole) && status !== "lobby" && status !== "role_assign" && status !== "ended";

  if (!state) return null;

  const factionAccent =
    FACTION_COLORS[(myFaction ?? "neutral") as keyof typeof FACTION_COLORS]?.accent ??
    "text-white/70";

  const open = expanded && showProfile;

  return (
    <div
      className={
        inline
          ? "pointer-events-none flex justify-center px-3 pb-3"
          : "pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3"
      }
    >
      <div className="pointer-events-auto w-full max-w-2xl">
        {open ? (
          <div className="mb-2 rounded-2xl border border-white/12 border-t-white/20 bg-[#100e18]/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
            <MyRolePanel role={myRole as string} faction={myFaction} />
          </div>
        ) : null}

        <div className="flex items-center gap-3 rounded-2xl border border-white/12 border-t-white/20 bg-[#100e18]/85 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-4 sm:py-2.5">
          {showProfile ? (
            <>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={open}
                aria-label="내 직업 보기"
                className="flex shrink-0 items-center gap-2 rounded-xl px-1 py-0.5 transition-colors hover:bg-white/[0.06]"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06] text-xs font-semibold text-white">
                  {myAvatarUrl ? (
                    <img src={myAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialOf(myName)
                  )}
                </span>
                <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
                  <span className="max-w-[7rem] truncate text-xs font-medium text-white/80">
                    {myName ?? "나"}
                  </span>
                  <span className={`text-xs font-semibold ${factionAccent}`}>
                    {roleLabel(myRole)}
                  </span>
                </span>
                <span className={`${factionAccent} text-xs font-semibold sm:hidden`}>
                  {roleLabel(myRole)}
                </span>
                <span
                  aria-hidden="true"
                  className={`text-[0.625rem] text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
                >
                  ▲
                </span>
              </button>
              <span aria-hidden="true" className="h-7 w-px shrink-0 bg-white/10" />
            </>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              {dayNumber ? (
                <span className="shrink-0 font-mono text-[0.625rem] text-white/40">{dayNumber}일차</span>
              ) : null}
              <span className="shrink-0 text-sm font-semibold text-white">{state.label}</span>
              <span className="truncate text-xs text-white/50">{state.line}</span>
            </div>
          </div>

          {phaseEndsAt ? (
            <div className="shrink-0">
              <PhaseTimer expectedEndedAt={phaseEndsAt} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
