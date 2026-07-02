/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * StatusDock — 하단 상태 독 + "나" 프로필 (Discord 하단 프로필 차용, 2026-06-11).
 *
 * 접힘(기본) = Discord식 프로필 바: 좌측에 내 아바타·이름·직업(진영색),
 *   우측에 페이즈 라벨·상태 한 줄·타이머. "지금 무슨 시간인지"는 그대로 우측에.
 *   2026-07-02 Discord 하단 프로필 정합 — 아바타 48px(테두리 링 제거)·굵은 링 온라인 점·
 *   이름 15px+쉐브론(이름 곁, Discord 위치)·구분선 제거·패널 불투명도 /90.
 * 펼침 = 프로필을 탭하면 위로 올라오는 내 정체 카드(MyRolePanel) — 직업·능력·설명을
 *   언제든 다시 읽는다. 로비·직업배정·종료에선 직업 비노출(프로필 클러스터 숨김).
 */

import { useState } from "react";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import { FACTION_COLORS } from "@/config/design-tokens";
import { roleLabel, roleMeta } from "@/config/gomdori-roles";
import { MyRolePanel } from "@/components/game/ui/MyRolePanel";
import { SettingsSheet } from "@/components/game/ui/SettingsSheet";
import { RoleCodex } from "@/components/game/ui/RoleCodex";
import { adjustDiscussionTime } from "@/lib/game/api";

// 토론 시간 조절 — 카운트다운 바로 곁에서(독 우측, 타이머 옆) 본인이 직접 −20초/+10초.
// 살아있는 참가자가 이번 토론에 1회(총량). 상단 별도 버튼 → 하단 프로필 독으로 이동(2026-06-16):
// 시간이 시각적으로 흐르는 그 자리에서 조절한다.
function DiscussionTimeAdjust({ matchId, gameJwt }: { matchId: string; gameJwt: string }) {
  const [pending, setPending] = useState(false);
  const [used, setUsed] = useState(false);

  const adjust = async (direction: "cut" | "extend") => {
    if (pending || used) return;
    setPending(true);
    try {
      await adjustDiscussionTime(matchId, direction, gameJwt);
      setUsed(true);
    } catch {
      // 이미 조절했거나 단계가 아니면 소진 처리(서버가 권위).
      setUsed(true);
    } finally {
      setPending(false);
    }
  };

  if (used) {
    return <span className="shrink-0 text-[0.625rem] text-white/35">조절함</span>;
  }

  const btn =
    "flex h-7 items-center rounded-md border px-1.5 font-mono text-[0.6875rem] font-semibold tabular-nums transition-colors disabled:opacity-40";
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label="토론 시간 조절(이번 토론 1회)">
      <button
        type="button"
        onClick={() => adjust("cut")}
        disabled={pending}
        aria-label="토론 시간 20초 단축"
        className={`${btn} border-rose-300/25 text-rose-200/90 hover:bg-rose-400/15`}
      >
        −20
      </button>
      <button
        type="button"
        onClick={() => adjust("extend")}
        disabled={pending}
        aria-label="토론 시간 10초 연장"
        className={`${btn} border-emerald-300/25 text-emerald-200/90 hover:bg-emerald-400/15`}
      >
        +10
      </button>
    </div>
  );
}

const STATE_LINE: Record<string, { label: string; line: string }> = {
  lobby: { label: "로비", line: "참가자를 모으는 중" },
  role_assign: { label: "준비 시간", line: "정체를 확인하고 변종을 선택하세요" },
  night: { label: "밤", line: "능력의 시간 — 조용히 움직이세요" },
  night_suspect: { label: "의심", line: "의심 투표 — 최다 의심자는 능력 봉인" },
  night_deduce: { label: "추리", line: "서로의 정체를 가늠하는 시간" },
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
  profilePanel,
  expanded,
  onExpandedChange,
  dayAdjust,
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
  /** 펼친 프로필 영역을 페이즈별 상호작용 패널로 대체한다. */
  profilePanel?: React.ReactNode;
  /** 제공되면 펼침 상태를 외부에서 제어한다. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** 아침(토론) 페이즈에서 살아있는 본인이 시간을 조절할 수 있을 때만 전달. 타이머 곁에 노출. */
  dayAdjust?: { matchId: string; gameJwt: string } | null;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  // 도감(전 직업 안내) — 인게임 진입점. 로비 설정 안에만 있던 도감을 내 프로필에서도 연다.
  const [codexOpen, setCodexOpen] = useState(false);
  const state = status ? STATE_LINE[status] : undefined;
  const isControlled = expanded !== undefined;
  const expandedValue = expanded ?? internalExpanded;
  const setExpandedValue = (next: boolean) => {
    if (!isControlled) {
      setInternalExpanded(next);
    }
    onExpandedChange?.(next);
  };

  // 직업 노출 페이즈에서만 프로필 클러스터를 켠다 (로비·배정·종료 제외).
  const showProfile =
    Boolean(myRole) && status !== "lobby" && status !== "role_assign" && status !== "ended";

  if (!state) return null;

  const factionAccent =
    FACTION_COLORS[(myFaction ?? "neutral") as keyof typeof FACTION_COLORS]?.accent ??
    "text-white/70";

  const open = expandedValue && showProfile;

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
            {profilePanel ?? <MyRolePanel role={myRole as string} faction={myFaction} />}
            <button
              type="button"
              onClick={() => setCodexOpen(true)}
              className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
            >
              <span>직업 도감 — 전체 직업·능력 보기</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}

        <SettingsSheet open={codexOpen} onClose={() => setCodexOpen(false)} title="직업 도감">
          <RoleCodex
            initialFaction={roleMeta(myRole)?.roster ?? roleMeta(myRole)?.faction ?? "angel"}
            highlightRole={myRole}
          />
        </SettingsSheet>

        <div className="flex items-center gap-3 rounded-2xl border border-white/12 border-t-white/20 bg-[#100e18]/90 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-4 sm:py-2.5">
          {showProfile ? (
            /* 본인 명세 — Discord 모바일 하단 프로필 정합(2026-07-02): 48px 아바타(링 없음) +
               굵은 링의 온라인 점, 이름(15px)+쉐브론 한 줄, 아래 역할(진영색) = Discord 의
               이름+상태 2줄 구조. 구분선 제거(Discord 에 없음). 탭 = 펼침(기능 불변). */
            <button
              type="button"
              onClick={() => setExpandedValue(!expandedValue)}
              aria-expanded={open}
              aria-label="내 직업 보기"
              className="flex min-w-0 shrink items-center gap-2.5 rounded-xl px-1 py-0.5 transition-colors hover:bg-white/[0.06]"
            >
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-base font-semibold text-white">
                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                  {myAvatarUrl ? (
                    <img src={myAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialOf(myName)
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#100e18] bg-emerald-400"
                />
              </span>
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="max-w-[9rem] truncate text-[0.9375rem] font-semibold text-white">
                    {myName ?? "나"}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-3 w-3 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
                <span className={`max-w-[9rem] truncate text-xs font-medium ${factionAccent}`}>
                  {roleLabel(myRole)}
                </span>
              </span>
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              {dayNumber && status !== "role_assign" ? (
                <span className="shrink-0 font-mono text-[0.625rem] text-white/40">{dayNumber}일차</span>
              ) : null}
              <span className="shrink-0 text-sm font-semibold text-white">{state.label}</span>
              <span className="truncate text-xs text-white/50">{state.line}</span>
            </div>
          </div>

          {status === "day" && dayAdjust ? (
            <DiscussionTimeAdjust matchId={dayAdjust.matchId} gameJwt={dayAdjust.gameJwt} />
          ) : null}

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
