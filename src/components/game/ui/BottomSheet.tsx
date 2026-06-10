"use client";

/**
 * BottomSheet — 모바일에서 하단에서 올라오는 패널 / 데스크톱(lg+)에선 정적 사이드 블록.
 *
 * 사용자 요구 (2026-06-11): "친구 부르기" 같은 보조 패널이 모바일에서
 * 우측이 아니라 하단 시트로. 핸들 탭으로 펼침/접힘. StatusDock 위(z-40)에 뜬다.
 */

import { useState } from "react";

export function BottomSheet({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      {/* 데스크톱: 정적 사이드 블록 */}
      <aside
        className={`hidden lg:block space-y-4 rounded-2xl border border-white/10 border-t-white/20 bg-[#15131e]/90 p-5 backdrop-blur-md ${className ?? ""}`}
      >
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {children}
      </aside>

      {/* 모바일: 하단 시트 */}
      <div className="lg:hidden">
        {open ? (
          <button
            type="button"
            aria-label="시트 닫기"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
        ) : null}
        <div
          className={`fixed inset-x-0 z-40 transition-transform duration-300 ${
            open ? "bottom-0" : "bottom-16"
          }`}
        >
          <div className="mx-auto w-full max-w-2xl px-3">
            <div
              className={`rounded-t-2xl border border-b-0 border-white/12 border-t-white/20 bg-[#100e18]/95 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl ${
                open ? "" : "cursor-pointer"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full flex-col items-center gap-1.5 px-4 pb-2 pt-2.5"
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
