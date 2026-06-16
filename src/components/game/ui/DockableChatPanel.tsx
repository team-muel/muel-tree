"use client";

/**
 * DockableChatPanel — 떠 있는 채팅 패널. 헤더(그립)를 잡고 화면 어디로든 자유롭게
 * 드래그/스와이프해 옮긴다(상/하/좌/우 도크 폐지, 2026-06-16). 위치는 matchId 범위
 * localStorage 에 {x,y} 로 저장(유저 개별, 새로고침 유지). 마우스·터치 모두 Pointer
 * Events 로 처리(touch-action:none 으로 드래그 중 스크롤 방지). 접기/펼치기 지원.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Pos = { x: number; y: number };

const MARGIN = 8;
const FALLBACK_W = 320;
const FALLBACK_H = 220;

export function DockableChatPanel({
  matchId,
  title,
  defaultOpen = false,
  children,
}: {
  matchId?: string | null;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const key = `gomdori:chatpos:${matchId ?? "preview"}`;
  const [open, setOpen] = useState(defaultOpen);
  // null = 아직 옮긴 적 없음(기본 위치: 하단 중앙). 좌표가 있으면 그 자리에 고정.
  const [pos, setPos] = useState<Pos | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  const latestPos = useRef<Pos | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Pos>;
        if (typeof p?.x === "number" && typeof p?.y === "number") {
          const next = { x: p.x, y: p.y };
          setPos(next);
          latestPos.current = next;
        }
      }
    } catch {
      /* 무시 */
    }
  }, [key]);

  const clampToViewport = useCallback((x: number, y: number): Pos => {
    const el = panelRef.current;
    const w = el?.offsetWidth ?? FALLBACK_W;
    const h = el?.offsetHeight ?? FALLBACK_H;
    const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN);
    return {
      x: Math.min(Math.max(MARGIN, x), maxX),
      y: Math.min(Math.max(MARGIN, y), maxY),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* 무시 */
    }
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragOffset.current) return;
    const next = clampToViewport(e.clientX - dragOffset.current.dx, e.clientY - dragOffset.current.dy);
    latestPos.current = next;
    setPos(next);
  };

  const endDrag = () => {
    if (!dragOffset.current) return;
    dragOffset.current = null;
    try {
      if (latestPos.current) window.localStorage.setItem(key, JSON.stringify(latestPos.current));
    } catch {
      /* 무시 */
    }
  };

  // 위치가 지정되면 좌표 고정, 아니면 기본(하단 중앙, StatusDock 위로 띄움).
  const positioned = pos !== null;
  const style: React.CSSProperties = positioned ? { left: pos.x, top: pos.y } : {};
  const defaultPosCls = positioned ? "" : "bottom-20 left-1/2 -translate-x-1/2";

  return (
    <div
      ref={panelRef}
      className={`fixed z-40 w-[min(92vw,28rem)] ${defaultPosCls}`}
      style={style}
    >
      <div className="rounded-xl border border-white/10 bg-slate-950/92 shadow-2xl backdrop-blur">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex touch-none cursor-grab items-center justify-between gap-2 border-b border-white/5 px-3 py-2 active:cursor-grabbing"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
            <span aria-hidden="true" className="text-white/30">⠿</span>
            {title}
          </span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "채팅 접기" : "채팅 펼치기"}
            className="flex h-6 w-6 items-center justify-center rounded text-xs text-white/45 transition hover:bg-white/10 hover:text-white/80"
          >
            <span aria-hidden="true">{open ? "▾" : "▸"}</span>
          </button>
        </div>
        {open ? <div className="p-3">{children}</div> : null}
      </div>
    </div>
  );
}
