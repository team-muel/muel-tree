"use client";

/**
 * DayPhase — 아침. 무대(GameStage)가 화면의 주인공 (Feign 구조).
 * 공표 배너만 위에 얹고, "자유 토론 시간" 상태는 하단 StatusDock(GameFrame)이 표시.
 * 사망자는 하단 시트로 관전 피드를 본다.
 */

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { MOOD } from "@/config/design-tokens";
import { eventLines } from "@/config/gomdori-events";
import { resolveMyStatusEffects } from "@/config/status-effects";
import { GameStage } from "@/components/game/ui/GameStage";
import { BottomSheet } from "@/components/game/ui/BottomSheet";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";
import { MatchChat } from "@/components/game/ui/MatchChat";
import { useState, useEffect } from "react";

type DayPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  events: Array<{ id: string; event_type: string; phase_id?: string; payload?: Record<string, unknown> }>;
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  /** 토론 페이즈 종료 시각 — 무대 위 차고 노는 타이머 오브에 쓰인다. */
  phaseEndsAt?: string | null;
};

// 아침 무대는 light mood — 라이트 잉크 기준 톤.
const PERSONAL_TONE_CLS: Record<string, string> = {
  danger: "border-rose-900/20 bg-rose-100/75 text-rose-900",
  warn: "border-amber-900/20 bg-amber-100/75 text-amber-900",
  good: "border-emerald-900/20 bg-emerald-100/75 text-emerald-900",
  info: "border-[#2b2118]/15 bg-white/70 text-[#5c4d3c]",
};

export function DayPhase({ match, players, events, myPlayer, gameJwt, phaseEndsAt }: DayPhaseProps) {
  const [renderAliveDeaths, setRenderAliveDeaths] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setRenderAliveDeaths(false), 600);
    return () => clearTimeout(timer);
  }, []);

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

  // 어젯밤 나에게 일어난 일 — 백엔드가 당사자 private 으로 보낸 이벤트(RLS 로
  // 내 것만 도착). 같은 밤(=morning_report 와 같은 phase_id)의 것만. 카피·노출
  // 여부는 gomdori-events 레지스트리 단일 출처.
  const personalLines =
    report && report.phase_id
      ? eventLines(
          events.filter((e) => e.phase_id === report.phase_id),
          "personal",
          (id) => nameOf(typeof id === "string" ? id : "") ?? "누군가",
        )
      : [];

  const myEffects = resolveMyStatusEffects(
    myPlayer?.userId,
    events,
    report?.phase_id
  );

  const isDead = myPlayer && !myPlayer.alive;
  const ink = MOOD.light;

  const stagePlayers = players.map((p) => {
    const isJustDied = deadNames.includes(p.displayName);
    if (isJustDied && renderAliveDeaths) {
      return { ...p, alive: true };
    }
    return p;
  });

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

      {/* 어젯밤, 당신에게 — 당사자 전용 밤 피드백 (나에게만 보임) */}
      {personalLines.length > 0 ? (
        <div className="mx-auto mt-3 w-full max-w-md space-y-1.5">
          <div className={`px-1 text-[0.625rem] font-semibold uppercase tracking-widest ${ink.faint}`}>
            어젯밤, 당신에게
          </div>
          {personalLines.map((l) => (
            <div
              key={l.id}
              className={`rounded-xl border px-3 py-2 text-sm backdrop-blur-md ${
                PERSONAL_TONE_CLS[l.tone] ?? PERSONAL_TONE_CLS.info
              }`}
            >
              <span aria-hidden="true" className="mr-1.5">{l.icon}</span>
              {l.text}
            </div>
          ))}
        </div>
      ) : null}

      {/* 무대 — 마을 전원이 보이는 테이블 */}
      <div className="flex flex-1 flex-col justify-center">
        <div className={`mb-2 mt-6 flex items-center justify-between px-1 text-xs ${ink.faint}`}>
          <span>마을 주민</span>
          <span className={`rounded-full px-2.5 py-0.5 ${ink.chip}`}>
            생존 {players.filter((p) => p.alive).length}명
          </span>
        </div>
        <GameStage
          players={stagePlayers}
          myUserId={myPlayer?.userId}
          mood="light"
          inspectable
          matchId={match.id}
          movable
          timerOrbEndsAt={phaseEndsAt}
          myEffects={myEffects}
        />
      </div>

      {isDead ? (
        <BottomSheet title="관전 · 영혼 채팅" defaultOpen={false}>
          <MatchChat
            matchId={match.id}
            gameJwt={gameJwt}
            myPlayer={myPlayer}
            players={players}
            channels={["town", "dead"]}
            placeholder="영혼끼리 대화..."
            emptyHint="영혼들과 대화하세요 (산 자에겐 보이지 않습니다)"
          />
          <div className="border-t border-white/5 pt-3 text-sm text-white/55">
            당신은 사망했습니다. 산 자들의 토론은 읽을 수만 있습니다.
          </div>
          <SpectatorFeed events={events} players={players} />
        </BottomSheet>
      ) : (
        <BottomSheet title="마을 채팅">
          <MatchChat
            matchId={match.id}
            gameJwt={gameJwt}
            myPlayer={myPlayer}
            players={players}
            channels={["town", "dead"]}
            placeholder="마을 사람들과 대화..."
            emptyHint="낮 동안 자유롭게 대화하세요"
          />
        </BottomSheet>
      )}
    </div>
  );
}
