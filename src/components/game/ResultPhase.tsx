"use client";

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { roleLabel } from "@/config/gomdori-roles";

type ResultPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
};

export function ResultPhase({ match, players, events }: ResultPhaseProps) {
  // Primary source: match.winner from Realtime (set by phase-advance on DB).
  // Fallback: game_ended event payload (if phase-advance emits it in the future).
  const endEvent = events.find((e) => e.event_type === "game_ended");
  const winner = match.winner ?? (endEvent?.payload?.winner as string | undefined);

  const isAngelWin = winner === "angels";

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto p-5 overflow-y-auto">
      <div className={`w-full rounded-lg border p-10 text-center shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-top-4 motion-safe:duration-700 ${
        isAngelWin 
          ? "border-emerald-500/30 bg-emerald-950/40" 
          : "border-red-500/30 bg-red-950/40"
      }`}>
        <h2 className={`text-sm font-medium tracking-widest uppercase ${isAngelWin ? "text-emerald-400/80" : "text-red-400/80"}`}>
          게임 종료
        </h2>
        <h1 className={`mt-6 text-5xl sm:text-6xl font-bold ${isAngelWin ? "text-emerald-100" : "text-red-100"}`}>
          {isAngelWin ? "천사 진영 승리!" : "악마 진영 승리!"}
        </h1>
        <p className="mt-6 text-lg text-white/60">
          모든 플레이어의 정체가 공개됩니다.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {players.map((p, i) => {
          // If the player's role is still masked (because Realtime didn't update yet), we fallback to events or just rely on backend to unmask
          const role = p.role;
          const faction = p.faction;
          const isDemonFaction = faction === "demon";
          
          return (
            <div 
              key={p.userId}
              style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }} 
              className={`rounded-lg border p-5 flex flex-col items-center justify-center text-center ${
                isDemonFaction
                  ? "border-red-900/30 bg-red-950/20"
                  : "border-emerald-900/30 bg-emerald-950/20"
              } ${!p.alive ? "opacity-60" : ""} motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:fill-mode-backwards`}
            >
              <div className="text-lg font-bold text-white mb-1 truncate w-full">{p.displayName}</div>
              {!p.alive && <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3">사망함</div>}
              {p.alive && <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3">생존함</div>}
              
              <div className={`mt-auto px-4 py-1.5 rounded-full text-sm font-semibold ${
                isDemonFaction 
                  ? "bg-red-500/20 text-red-300" 
                  : "bg-emerald-500/20 text-emerald-300"
              }`}>
                {roleLabel(role) || "알 수 없음"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
