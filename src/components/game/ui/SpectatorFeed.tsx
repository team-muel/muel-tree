"use client";

import type { PlayerSummary } from "@/lib/game/api";
import { eventLines } from "@/config/gomdori-events";

type FeedEvent = {
  id: string;
  event_type: string;
  created_at?: string;
  payload?: Record<string, unknown>;
};

// 사망자(관전) 화면용 실시간 진행 기록. events 는 최신순(page.tsx).
// 카피·노출 여부는 gomdori-events 레지스트리가 단일 출처 — 여기엔 switch 없음.
export function SpectatorFeed({ events, players }: { events?: FeedEvent[]; players: PlayerSummary[] }) {
  const nameOf = (id: unknown): string =>
    typeof id === "string"
      ? players.find((p) => p.userId === id)?.displayName ?? "누군가"
      : "누군가";

  const lines = eventLines(events ?? [], "public", nameOf).slice(0, 10);

  if (lines.length === 0) return null;

  return (
    <div className="mx-auto mt-8 w-full max-w-md rounded-lg border border-white/10 bg-black/20 p-4 text-left">
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">진행 기록</div>
      <ul className="flex flex-col gap-1.5">
        {lines.map((l) => (
          <li key={l.id} className="text-sm text-white/60">
            {l.icon} {l.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
