"use client";

/**
 * PhaseSweep — 페이즈 전환막 (Feign 전환 구조).
 *
 * 밤이 내리고 아침이 걷히는 순간을 전면 오버레이 한 번으로 알린다.
 * status 가 바뀔 때만 잠깐 덮였다 스스로 걷힘(CSS 애니메이션 both → opacity 0).
 * 첫 마운트(새로고침/재입장)에는 치지 않는다 — 전환이 아니므로.
 * pointer-events 없음: 무대 조작을 막지 않는다. reduced-motion 은 globals 에서 즉시 소멸.
 */

import { useEffect, useRef, useState } from "react";

const SWEEP_COPY: Record<string, { label: string; sub?: string; tone: "night" | "dawn" | "ember" }> = {
  role_assign: { label: "직업 배정", sub: "운명이 내려옵니다", tone: "night" },
  night: { label: "밤이 되었습니다", sub: "도시가 잠듭니다", tone: "night" },
  night_suspect: { label: "밤이 되었습니다", sub: "서로를 의심하는 시간", tone: "night" },
  night_resolve: { label: "밤이 깊어갑니다", tone: "night" },
  day: { label: "아침이 밝았습니다", sub: "간밤의 일을 확인하세요", tone: "dawn" },
  vote: { label: "투표", sub: "한 명을 지목합니다", tone: "ember" },
  verdict: { label: "판결", tone: "ember" },
  ended: { label: "게임 종료", tone: "dawn" },
};

const TONE_BG: Record<"night" | "dawn" | "ember", string> = {
  night: "bg-[radial-gradient(ellipse_at_top,rgba(30,27,75,0.92),rgba(2,6,23,0.96))]",
  dawn: "bg-[radial-gradient(ellipse_at_top,rgba(120,86,40,0.85),rgba(24,16,8,0.94))]",
  ember: "bg-[radial-gradient(ellipse_at_center,rgba(76,5,25,0.9),rgba(12,3,7,0.95))]",
};

export function PhaseSweep({ status }: { status: string }) {
  const prev = useRef<string | null>(null);
  const [sweep, setSweep] = useState<{ key: number; status: string } | null>(null);

  useEffect(() => {
    if (prev.current === null) {
      prev.current = status; // 첫 마운트 — 전환 아님
      return;
    }
    if (prev.current === status) return;
    prev.current = status;
    if (!SWEEP_COPY[status]) return;
    setSweep({ key: Date.now(), status });
  }, [status]);

  if (!sweep) return null;
  const copy = SWEEP_COPY[sweep.status];
  if (!copy) return null;

  return (
    <div
      key={sweep.key}
      aria-hidden="true"
      onAnimationEnd={() => setSweep(null)}
      className={`gomdori-phase-sweep pointer-events-none fixed inset-0 z-50 flex items-center justify-center ${TONE_BG[copy.tone]}`}
    >
      <div className="gomdori-sweep-label text-center">
        <div className="text-3xl font-bold tracking-[0.18em] text-white/90 sm:text-4xl">{copy.label}</div>
        {copy.sub ? <div className="mt-3 text-sm tracking-widest text-white/45">{copy.sub}</div> : null}
      </div>
    </div>
  );
}
