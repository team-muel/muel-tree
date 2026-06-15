"use client";

/**
 * DockableChatPanel — 유저별로 채팅창을 화면 상/하/좌/우로 옮길 수 있는 떠 있는 패널.
 * 위치는 matchId 범위 localStorage 에 저장(유저 개별, 새로고침에도 유지). 접기/펼치기 지원.
 * 하단 StatusDock 과 겹치지 않도록 bottom 도크는 약간 띄운다.
 */

import { useEffect, useState } from "react";

type Dock = "bottom" | "top" | "left" | "right";

const POS_CLS: Record<Dock, string> = {
  bottom: "bottom-20 left-1/2 -translate-x-1/2 w-[min(92vw,28rem)]",
  top: "top-3 left-1/2 -translate-x-1/2 w-[min(92vw,28rem)]",
  left: "left-3 top-1/2 -translate-y-1/2 w-[min(82vw,22rem)]",
  right: "right-3 top-1/2 -translate-y-1/2 w-[min(82vw,22rem)]",
};
const DOCKS: Array<{ id: Dock; glyph: string; label: string }> = [
  { id: "top", glyph: "↑", label: "위" },
  { id: "bottom", glyph: "↓", label: "아래" },
  { id: "left", glyph: "←", label: "왼쪽" },
  { id: "right", glyph: "→", label: "오른쪽" },
];

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
  const key = `gomdori:chatdock:${matchId ?? "preview"}`;
  const [dock, setDock] = useState<Dock>("bottom");
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key);
      if (v === "bottom" || v === "top" || v === "left" || v === "right") setDock(v);
    } catch {
      /* 무시 */
    }
  }, [key]);

  const move = (d: Dock) => {
    setDock(d);
    try {
      window.localStorage.setItem(key, d);
    } catch {
      /* 무시 */
    }
  };

  return (
    <div className={`fixed z-40 ${POS_CLS[dock]}`}>
      <div className="rounded-xl border border-white/10 bg-slate-950/92 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-xs font-semibold text-white/75"
            aria-expanded={open}
          >
            <span aria-hidden="true" className="text-white/40">{open ? "▾" : "▸"}</span>
            {title}
          </button>
          <div className="flex items-center gap-0.5">
            {DOCKS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => move(d.id)}
                aria-label={`채팅 ${d.label}으로`}
                title={`채팅 ${d.label}으로`}
                className={`flex h-6 w-6 items-center justify-center rounded text-xs transition ${
                  dock === d.id ? "bg-white/20 text-white" : "text-white/40 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                {d.glyph}
              </button>
            ))}
          </div>
        </div>
        {open ? <div className="p-3">{children}</div> : null}
      </div>
    </div>
  );
}
