"use client";

/**
 * DayPhase — 아침. 무대(GameStage)가 화면의 주인공 (Feign 구조).
 * 공표 배너만 위에 얹고, "자유 토론 시간" 상태는 하단 StatusDock(GameFrame)이 표시.
 * 사망자는 하단 시트로 관전 피드를 본다.
 */

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { MOOD } from "@/config/design-tokens";
import { GameStage } from "@/components/game/ui/GameStage";
import { BottomSheet } from "@/components/game/ui/BottomSheet";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";

type DayPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
  myPlayer: PlayerSummary | null;
  /** 토론 페이즈 종료 시각 — 무대 위 차고 노는 타이머 오브에 쓰인다. */
  phaseEndsAt?: string | null;
};

export function DayPhase({ match, players, events, myPlayer, phaseEndsAt }: DayPhaseProps) {
  // 아침 공표 — morning_report(밤 해소 집계, 다중 사망·부활 포함)가 1차 출처.
  // events 는 최신순: report 보다 앞(=이후 발생)의 nightmare_death(night_resolve
  // 단계의 악몽 탈락)도 같은 아침의 사망으로 합친다.
  const reportIdx = events.findIndex((e) => e.event_type === "morning_report");
  const report = reportIdx >= 0 ? events[reportIdx] : undefined;
  const reportDeaths = Array.isArray(report?.payload?.deaths)
    ? (report!.payload!.deaths as string[])
    : [];
  const reportRevivals = Array.isArray(report?.payload?.revivals)
    ? (report!.payload!.revivals as string[])
    : [];
  const nightmareDeaths = events
    .filter((e, i) => e.event_type === "nightmare_death" && (reportIdx === -1 || i < reportIdx))
    .map((e) => e.payload?.user_id as string | undefined)
    .filter((id): id is string => typeof id === "string");
  // 구버전 백엔드(report 미발행) 폴백: 단건 player_died.
  const legacyDeath = !report
    ? (events.find((e) => e.event_type === "player_died")?.payload?.user_id as string | undefined)
    : undefined;

  const nameOf = (id: string) => players.find((p) => p.userId === id)?.displayName;
  const deadNames = Array.from(
    new Set([...reportDeaths, ...nightmareDeaths, ...(legacyDeath ? [legacyDeath] : [])]),
  )
    .map(nameOf)
    .filter((n): n is string => Boolean(n));
  const revivedNames = reportRevivals.map(nameOf).filter((n): n is string => Boolean(n));
  const hasDeaths = deadNames.length > 0;

  const isDead = myPlayer && !myPlayer.alive;
  const ink = MOOD.light;

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col py-5 pb-24">
      {/* 공표 배너 — 밝은 무대 위 핏빛/온기 카드 */}
      <div
        className={`w-full rounded-2xl border p-5 text-center backdrop-blur-md ${
          hasDeaths
            ? "border-rose-900/25 bg-rose-950/85 shadow-[0_0_36px_rgba(244,63,94,0.25)]"
            : "border-[#2b2118]/10 bg-white/60 shadow-[0_8px_30px_rgba(80,60,20,0.10)]"
        }`}
      >
        <h2
          className={`text-xs font-medium uppercase tracking-widest ${
            hasDeaths ? "text-rose-300/90" : "text-amber-700"
          }`}
        >
          아침이 밝았습니다
        </h2>
        <h1 className={`mt-1 text-xl font-bold sm:text-2xl ${hasDeaths ? "text-rose-50" : ink.heading}`}>
          {hasDeaths
            ? `어젯밤, ${deadNames.map((n) => `${n}님`).join("과 ")}이 사망했습니다.`
            : "어젯밤은 아무 일도 없이 평화로웠습니다."}
        </h1>
        {revivedNames.length > 0 ? (
          <p className={`mt-2 text-sm font-medium ${hasDeaths ? "text-emerald-300" : "text-emerald-700"}`}>
            {revivedNames.map((n) => `${n}님`).join(", ")}이 되살아났습니다.
          </p>
        ) : null}
      </div>

      {/* 무대 — 마을 전원이 보이는 테이블 */}
      <div className="flex flex-1 flex-col justify-center">
        <div className={`mb-2 mt-6 flex items-center justify-between px-1 text-xs ${ink.faint}`}>
          <span>마을 주민</span>
          <span className={`rounded-full px-2.5 py-0.5 ${ink.chip}`}>
            생존 {players.filter((p) => p.alive).length}명
          </span>
        </div>
        <GameStage
          players={players}
          myUserId={myPlayer?.userId}
          mood="light"
          inspectable
          matchId={match.id}
          movable
          timerOrbEndsAt={phaseEndsAt}
        />
      </div>

      {isDead ? (
        <BottomSheet title="관전 피드" defaultOpen={false}>
          <p className="text-sm text-white/55">
            당신은 사망했습니다. 산 자들의 토론을 조용히 지켜보세요.
          </p>
          <SpectatorFeed events={events} players={players} />
        </BottomSheet>
      ) : null}
    </div>
  );
}
