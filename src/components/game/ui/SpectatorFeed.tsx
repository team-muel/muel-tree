"use client";

import type { PlayerSummary } from "@/lib/game/api";

type FeedEvent = {
  id: string;
  event_type: string;
  created_at?: string;
  payload?: Record<string, unknown>;
};

function nameOf(players: PlayerSummary[], id: unknown): string {
  if (typeof id !== "string") return "누군가";
  return players.find((p) => p.userId === id)?.displayName ?? "누군가";
}

// match_events → 관전자용 한 줄. 모르는 이벤트는 숨김(null).
function lineFor(ev: FeedEvent, players: PlayerSummary[]): string | null {
  const p = ev.payload ?? {};
  switch (ev.event_type) {
    case "player_died":
      return `🌑 ${nameOf(players, p.user_id)} 님이 밤에 사망`;
    case "player_eliminated":
      return `⚖️ ${nameOf(players, p.user_id)} 님이 처형됨`;
    case "attack_prevented":
      return "🛡️ 누군가의 공격이 무산됐다";
    case "shield_blocked":
    case "execution_blocked_shield":
      return "🛡️ 보호막이 발동했다";
    case "suspicion_revealed":
      return p.user_id ? `🔎 의심 지목: ${nameOf(players, p.user_id)}` : "🔎 의심 부결";
    case "vote_resolved":
      return p.candidateUserId ? `🗳️ 최다 득표: ${nameOf(players, p.candidateUserId)}` : "🗳️ 투표 부결";
    case "verdict_resolved":
      return p.executed ? "⚖️ 처형 가결" : "⚖️ 처형 부결";
    case "first_night_silent":
      return "🌙 조용한 첫 밤이 지났다";
    case "game_ended":
      return "🏁 게임 종료";
    default:
      return null;
  }
}

// 사망자(관전) 화면용 실시간 진행 기록. events 는 최신순(page.tsx).
export function SpectatorFeed({ events, players }: { events?: FeedEvent[]; players: PlayerSummary[] }) {
  const lines = (events ?? [])
    .map((e) => ({ id: e.id, text: lineFor(e, players) }))
    .filter((x): x is { id: string; text: string } => !!x.text)
    .slice(0, 10);

  if (lines.length === 0) return null;

  return (
    <div className="mx-auto mt-8 w-full max-w-md rounded-lg border border-white/10 bg-black/20 p-4 text-left">
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">진행 기록</div>
      <ul className="flex flex-col gap-1.5">
        {lines.map((l) => (
          <li key={l.id} className="text-sm text-white/60">{l.text}</li>
        ))}
      </ul>
    </div>
  );
}
