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
import { roleLabel, roleMeta } from "@/config/gomdori-roles";
import { MyRolePanel } from "@/components/game/ui/MyRolePanel";
import { SettingsSheet } from "@/components/game/ui/SettingsSheet";
import { RoleCodex } from "@/components/game/ui/RoleCodex";

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
  profilePanel,
  expanded,
  onExpandedChange,
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

        <div className="flex items-center gap-3 rounded-2xl border border-white/12 border-t-white/20 bg-[#100e18]/85 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-4 sm:py-2.5">
          {showProfile ? (
            <>
              {/* 본인 명세 — Discord 모바일 하단 프로필 차용(2026-06-15): 큰 아바타 +
                  온라인 점, 이름/역할 2줄. 탭 = 펼침(기능 불변). */}
              <button
                type="button"
                onClick={() => setExpandedValue(!expandedValue)}
                aria-expanded={open}
                aria-label="내 직업 보기"
                className="flex min-w-0 shrink items-center gap-2.5 rounded-xl px-1 py-0.5 transition-colors hover:bg-white/[0.06]"
              >
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06] text-sm font-semibold text-white">
                  {myAvatarUrl ? (
                    <img src={myAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialOf(myName)
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#100e18] bg-emerald-400"
                  />
                </span>
                <span className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="max-w-[8rem] truncate text-sm font-semibold text-white">
                    {myName ?? "나"}
                  </span>
                  <span className={`max-w-[8rem] truncate text-xs font-medium ${factionAccent}`}>
                    {roleLabel(myRole)}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`ml-0.5 text-[0.625rem] text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
                >
                  ▲
                </span>
              </button>
              <span aria-hidden="true" className="h-8 w-px shrink-0 bg-white/10" />
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
