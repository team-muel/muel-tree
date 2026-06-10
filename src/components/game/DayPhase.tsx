"use client";

/**
 * DayPhase — 아침. 이중 무드의 "밝은 면".
 * 따뜻한 무대 위에서 간밤의 결과를 공표하고, 테이블(PlayerToken 그리드)이
 * 마을 전원을 보여준다 (Feign 경험 구조 — 캐릭터가 보이는 테이블).
 * 죽음 공표는 밝은 화면 위의 핏빛 카드 — 대비로 무게를 만든다.
 */

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { MOOD } from "@/config/design-tokens";
import { PlayerToken } from "@/components/game/ui/PlayerToken";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";

type DayPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
  myPlayer: PlayerSummary | null;
};

export function DayPhase({ players, events, myPlayer }: DayPhaseProps) {
  const deathEvent = events.find((e) => {
    if (e.event_type === "player_died") return true;
    return e.event_type === "player_eliminated" && e.payload?.cause === "night_kill";
  });
  const diedUserId = (deathEvent?.payload?.user_id ??
    deathEvent?.payload?.eliminated_user_id) as string | undefined;
  const diedPlayer = players.find((p) => p.userId === diedUserId);

  const isDead = myPlayer && !myPlayer.alive;
  const ink = MOOD.light;

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col p-5">
      {/* 공표 배너 — 밝은 무대 위 핏빛/온기 카드 */}
      <div
        className={`w-full rounded-2xl border p-6 text-center backdrop-blur-md ${
          diedPlayer
            ? "border-rose-900/25 bg-rose-950/85 shadow-[0_0_36px_rgba(244,63,94,0.25)]"
            : "border-[#2b2118]/10 bg-white/60 shadow-[0_8px_30px_rgba(80,60,20,0.10)]"
        }`}
      >
        <h2
          className={`text-sm font-medium uppercase tracking-widest ${
            diedPlayer ? "text-rose-300/90" : "text-amber-700"
          }`}
        >
          아침이 밝았습니다
        </h2>
        <h1 className={`mt-2 text-2xl font-bold ${diedPlayer ? "text-rose-50" : ink.heading}`}>
          {diedPlayer
            ? `어젯밤, ${diedPlayer.displayName}님이 사망했습니다.`
            : "어젯밤은 아무 일도 없이 평화로웠습니다."}
        </h1>
      </div>

      <div className="mt-8 grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* 테이블 — 마을 전원 */}
        <div className={ink.panel + " p-6"}>
          <div className="mb-6 flex items-center justify-between">
            <h3 className={`text-lg font-medium ${ink.heading}`}>마을 주민</h3>
            <div className={`rounded-full px-3 py-1 text-xs ${ink.chip}`}>
              생존 {players.filter((p) => p.alive).length}명
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {players.map((p) => (
              <PlayerToken
                key={p.userId}
                name={p.displayName}
                avatarUrl={p.avatarUrl}
                alive={p.alive}
                mood="light"
                sub={!p.alive ? "사망함" : undefined}
              />
            ))}
          </div>
        </div>

        {/* 토론 패널 */}
        <div className={`${ink.panel} flex flex-col items-center p-6 text-center`}>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#2b2118]/10 bg-white/70">
            <span className="text-xl" aria-hidden="true">
              🎙️
            </span>
          </div>
          <h3 className={`text-lg font-medium ${ink.heading}`}>자유 토론 시간</h3>
          <p className={`mt-3 text-sm leading-relaxed ${ink.body}`}>
            {isDead
              ? "당신은 사망했습니다. 산 자들의 토론을 조용히 지켜보세요."
              : "Discord 음성 채널을 통해 마피아가 누구일지 자유롭게 추리하고 토론하세요."}
          </p>
          {isDead ? (
            <div className="mt-4 w-full rounded-xl border border-white/10 bg-[#15131e]/90 p-3 text-left">
              <SpectatorFeed events={events} players={players} />
            </div>
          ) : null}
          <div className={`mt-auto w-full pt-8 text-xs leading-5 ${ink.faint}`}>
            토론 시간이 끝나면 자동으로 투표가 시작됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
