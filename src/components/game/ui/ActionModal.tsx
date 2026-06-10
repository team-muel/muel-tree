"use client";

/**
 * ActionModal — 무대 위에 뜨는 창. 페이지 전환 없이 행동(투표·의심·확인)을 처리.
 *
 * 사용자 요구 (2026-06-11): 투표는 별도 페이지가 아니라 창으로.
 * 배경은 옅게만 가린다 — 무대(테이블)가 계속 보여야 Feign 구조가 산다.
 * 모바일: 하단 고정(독 위), 데스크톱: 중앙.
 */

import type { Mood } from "@/config/design-tokens";

export function ActionModal({
  eyebrow,
  title,
  mood = "dark",
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  mood?: Mood;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const light = mood === "light";
  const card = light
    ? "border-[#2b2118]/15 bg-[#fbf6ea]/95 text-[#2b2118]"
    : "border-white/15 border-t-white/25 bg-[#15131e]/95 text-white";
  const eyebrowInk = light ? "text-amber-800" : "text-white/45";

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center px-4 pb-20 sm:items-center sm:pb-4">
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl border p-5 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300 ${card}`}
        role="dialog"
        aria-label={title}
      >
        {eyebrow ? (
          <div className={`text-xs font-semibold uppercase tracking-widest ${eyebrowInk}`}>
            {eyebrow}
          </div>
        ) : null}
        <h2 className="mt-1 text-lg font-semibold">{title}</h2>
        {children}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
