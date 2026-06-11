"use client";

/**
 * BottomSheet — 모바일에선 하단에서 올라오는 패널 / 데스크톱에선 정적 사이드 블록.
 *
 * 사용자 요구 (2026-06-11): "친구 부르기" 같은 보조 패널이 모바일에서
 * 우측이 아니라 하단 시트로. 핸들 탭 또는 **드래그 제스처**(위로 끌면 펼침,
 * 아래로 끌면 접힘 — 드래그 중 손맛 추종)로 조작. StatusDock 위(z-40)에 뜬다.
 *
 * 분기 (2026-06-11 반응형 개편): CSS 브레이크포인트(lg:)가 아니라
 * useDisplay().layout 으로 *구조 자체*를 분기 — 모바일은 시트 DOM 만,
 * 데스크톱은 사이드 블록 DOM 만 렌더된다 (Discord platform=mobile 신호 반영).
 */

import { useRef, useState } from "react";
import { useDisplay } from "@/lib/game/display";

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function BottomSheet({
  title,
  children,
  defaultOpen = false,
  peek = "dock",
  className,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /**
   * 접힌 peek 의 하단 앵커. "dock" = StatusDock 위(bottom-16 — 인게임 관전 등
   * 독과 공존하는 화면). "edge" = 화면 바닥(bottom-0 — 독이 없는 로비).
   */
  peek?: "dock" | "edge";
  className?: string;
}) {
  const { layout } = useDisplay();
  const [open, setOpen] = useState(defaultOpen);
  const [pull, setPull] = useState(0);
  const startYRef = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    startYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (startYRef.current == null) return;
    // 드래그 추종 — 살짝만 따라와서 손맛을 준다 (실제 전환은 release 시 판정).
    setPull(clamp(e.clientY - startYRef.current, -28, 28));
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (startYRef.current == null) return;
    const delta = e.clientY - startYRef.current;
    startYRef.current = null;
    setPull(0);
    if (Math.abs(delta) > 50) {
      // 충분히 끌었다 — 방향대로 스냅.
      setOpen(delta < 0);
    } else if (Math.abs(delta) < 8) {
      // 사실상 탭 — 토글.
      setOpen((v) => !v);
    }
    // 중간 거리(8~50px)는 제자리 스냅백.
  };

  if (layout === "desktop") {
    return (
      <aside
        className={`space-y-4 rounded-2xl border border-white/10 border-t-white/20 bg-[#15131e]/90 p-5 backdrop-blur-md ${className ?? ""}`}
      >
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {children}
      </aside>
    );
  }

  return (
    <>
      {/* 모바일: 하단 시트 */}
      <div>
        {open ? (
          <button
            type="button"
            aria-label="시트 닫기"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
        ) : null}
        <div
          className={`fixed inset-x-0 z-40 ${open ? "bottom-0" : peek === "dock" ? "bottom-16" : "bottom-0"} ${
            pull === 0 ? "transition-all duration-300" : ""
          }`}
          style={pull !== 0 ? { transform: `translateY(${pull}px)` } : undefined}
        >
          <div className="mx-auto w-full max-w-2xl px-3">
            <div className="rounded-t-2xl border border-b-0 border-white/12 border-t-white/20 bg-[#100e18]/95 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <button
                type="button"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                aria-expanded={open}
                aria-label={`${title} — ${open ? "내리려면 아래로 끌거나 탭" : "올리려면 위로 끌거나 탭"}`}
                className="flex w-full touch-none select-none flex-col items-center gap-1.5 px-4 pb-2 pt-2.5"
              >
                <span aria-hidden="true" className="h-1 w-10 rounded-full bg-white/25" />
                <span className="flex w-full items-center justify-between text-sm">
                  <span className="font-semibold text-white">{title}</span>
                  <span className="text-xs text-white/40">{open ? "내리기" : "올리기"}</span>
                </span>
              </button>
              {open ? (
                <div className="max-h-[62vh] space-y-4 overflow-y-auto px-4 pb-6 pt-1">
                  {children}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
