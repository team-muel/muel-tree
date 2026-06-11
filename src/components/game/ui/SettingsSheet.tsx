"use client";

/**
 * SettingsSheet — 톱니(⚙)로 여는 설정·규칙 창.
 *
 * 사용자 요구 (2026-06-11): 로비 우측에 난잡하게 펼쳐져 있던 설정/규칙/직업안내/
 * 참가자관리를 본문에서 빼 별도 창으로. 우측 상단 톱니가 연다 — 익숙한 패턴.
 * 모바일=하단에서 올라오는 시트 / 데스크톱=중앙 모달. 배경 탭·ESC 로 닫힘.
 */

import { useEffect } from "react";

export function SettingsSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="설정 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-white/12 border-t-white/20 bg-[#15131e]/97 shadow-[0_-12px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300 sm:rounded-2xl sm:shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
