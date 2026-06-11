"use client";

/**
 * ActionModal — 무대 위에 뜨는 창. 페이지 전환 없이 행동(투표·의심·밤 능력)을 처리.
 *
 * 사용자 요구 (2026-06-11): 투표는 별도 페이지가 아니라 창으로.
 * 배경은 옅게만 가린다 — 무대(테이블)가 계속 보여야 Feign 구조가 산다.
 * 모바일: 하단 고정(독 위), 데스크톱: 중앙. raised = 하단 시트와 공존 시 더 띄움.
 */

import type { Mood } from "@/config/design-tokens";

export function ActionModal({
  eyebrow,
  title,
  mood = "dark",
  raised = false,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  mood?: Mood;
  /** 모바일에서 하단 시트(BottomSheet peek)와 겹치지 않게 추가로 띄움. */
  raised?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const light = mood === "light";
  const card = light
    ? "border-[#2b2118]/15 bg-[#fbf6ea]/95 text-[#2b2118]"
    : "border-white/15 border-t-white/25 bg-[#15131e]/95 text-white";
  const eyebrowInk = light ? "text-amber-800" : "text-white/45";

  return (
    // 하단 고정 — 데스크톱도 중앙이 아니라 독 위에 안착시켜 무대(테이블)를 가리지 않는다.
    // (사용자 요구 2026-06-11: 투표창이 중앙에 박혀 무대를 덮던 문제.)
    <div
      className={`pointer-events-none fixed inset-0 z-40 flex items-end justify-center px-4 ${
        raised ? "pb-32 sm:pb-32" : "pb-20 sm:pb-24"
      }`}
    >
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
