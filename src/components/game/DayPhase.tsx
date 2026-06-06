"use client";

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";

type DayPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
  myPlayer: PlayerSummary | null;
};

export function DayPhase({ players, events, myPlayer }: DayPhaseProps) {
  const deathEvent = [...events].reverse().find((e) => {
    if (e.event_type === "player_died") return true;
    return e.event_type === "player_eliminated" && e.payload?.cause === "night_kill";
  });
  const diedUserId = (deathEvent?.payload?.user_id ??
    deathEvent?.payload?.eliminated_user_id) as string | undefined;
  const diedPlayer = players.find(p => p.userId === diedUserId);

  const isDead = myPlayer && !myPlayer.alive;

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto p-5">
      {/* Announcement Banner */}
      <div className={`w-full rounded-lg border p-6 text-center shadow-lg ${
        diedPlayer 
          ? "border-red-500/30 bg-red-950/40" 
          : "border-emerald-500/30 bg-emerald-950/40"
      }`}>
        <h2 className={`text-sm font-medium tracking-widest uppercase ${diedPlayer ? "text-red-400/80" : "text-emerald-400/80"}`}>
          아침이 밝았습니다
        </h2>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {diedPlayer ? `어젯밤, ${diedPlayer.displayName}님이 사망했습니다.` : "어젯밤은 아무 일도 없이 평화로웠습니다."}
        </h1>
      </div>

      <div className="mt-8 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white">마을 주민 목록</h3>
            <div className="px-3 py-1 rounded bg-white/5 text-xs text-white/50">
              생존: {players.filter(p => p.alive).length}명
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {players.map((p) => (
              <div 
                key={p.userId} 
                className={`rounded-md p-4 text-center flex flex-col items-center justify-center gap-2 border transition-all ${
                  p.alive 
                    ? "border-white/10 bg-black/20 text-white" 
                    : "border-red-900/20 bg-red-950/10 text-white/30 grayscale"
                }`}
              >
                <div className="truncate text-sm font-medium w-full">{p.displayName}</div>
                {!p.alive && <div className="text-[10px] uppercase tracking-wider text-red-500/50">사망함</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-900/10 p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
            <span className="text-xl">🎙️</span>
          </div>
          <h3 className="text-lg font-medium text-blue-100">자유 토론 시간</h3>
          <p className="mt-3 text-sm text-blue-200/60 leading-relaxed">
            {isDead 
              ? "당신은 사망했습니다. 산 자들의 토론을 조용히 지켜보세요." 
              : "Discord 음성 채널을 통해 마피아가 누구일지 자유롭게 추리하고 토론하세요."}
          </p>
          <div className="mt-auto pt-8 w-full text-xs leading-5 text-blue-100/45">
            토론 시간이 끝나면 자동으로 투표가 시작됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
