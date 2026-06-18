"use client";

/**
 * ResultPhase — 결과. 어둠의 무대 위에 진영 광휘가 선다.
 * 정체 공개 = RoleEmblem(심볼 토큰)이 처음으로 전원에게 켜지는 순간.
 * winner 판정 로직 동일, 시각 오버홀 (2026-06-11).
 */

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { roleLabel } from "@/config/gomdori-roles";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { FACTION_COLORS } from "@/config/design-tokens";
import { RoleEmblem } from "@/components/game/ui/RoleEmblem";
import { Button } from "@/components/game/ui/Button";
import { useState } from "react";

type ResultPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
  onLeave?: () => void | Promise<void>;
};

// game_ended payload 의 reveal 항목 (M4-1). final_* 는 게임 내 변환(전향·타락·낙인
// 재배정 등)이 반영된 최종 정체 — canon §9: 종료 시 이전→변한 직업 모두 공개.
type RevealedPlayer = {
  user_id: string;
  role?: string;
  faction?: string;
  final_role?: string;
  final_faction?: string;
  changed?: boolean;
};

const FACTION_KO: Record<string, string> = { angel: "천사", demon: "악마", neutral: "중립" };

function revealMap(payload: Record<string, unknown> | undefined): Map<string, RevealedPlayer> {
  const list = Array.isArray(payload?.players) ? (payload.players as RevealedPlayer[]) : [];
  return new Map(list.filter((p) => typeof p?.user_id === "string").map((p) => [p.user_id, p]));
}

export function ResultPhase({ match, players, events, onLeave }: ResultPhaseProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Primary source: match.winner from Realtime (set by phase-advance on DB).
  // Fallback: game_ended event payload (if phase-advance emits it in the future).
  const endEvent = events.find((e) => e.event_type === "game_ended");
  const winner = match.winner ?? (endEvent?.payload?.winner as string | undefined);
  const revealed = revealMap(endEvent?.payload);
  // 최대 일수 도달 → 우세 판정 종착 (M2-5 안전망). 갑작스러운 종료로 읽히지 않게 명시.
  const byTimeout = endEvent?.payload?.timeout === true;

  const isAngelWin = winner === "angels";
  const isNeutralWin = winner === "neutral"; // 파스아 단독 승리(W6)

  // 진영 색은 토큰 단일출처(FACTION_COLORS). 천사=amber / 악마=rose / 중립=violet.
  const winColor = FACTION_COLORS[isNeutralWin ? "neutral" : isAngelWin ? "angel" : "demon"];
  const bannerTone = {
    frame: `${winColor.border} ${winColor.bgSoft} ${winColor.glow}`,
    accent: winColor.accent,
    title: winColor.primary,
  };

  const winTitle = isNeutralWin ? "파스아 단독 승리!" : isAngelWin ? "천사 진영 승리!" : "악마 진영 승리!";

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto py-5">
      <div
        className={`w-full rounded-2xl border p-10 text-center backdrop-blur-xl motion-safe:animate-in motion-safe:slide-in-from-top-4 motion-safe:duration-700 ${bannerTone.frame}`}
      >
        <h2 className={`text-sm font-medium uppercase tracking-widest ${bannerTone.accent}`}>게임 종료</h2>
        <h1 className={`mt-6 text-5xl font-bold sm:text-6xl ${bannerTone.title}`}>{winTitle}</h1>
        <p className="mt-6 text-lg text-white/60">
          {byTimeout
            ? `${GOMDORI_RULES.gameLength.maxDays}일이 지나도 결판나지 않아 우세한 진영이 승리했습니다.`
            : "모든 플레이어의 정체가 공개됩니다."}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {players.map((p, i) => {
          // reveal payload 가 있으면 최종 정체(변환 반영)를 우선한다 (M4-1).
          const reveal = revealed.get(p.userId);
          const startRole = reveal?.role ?? p.role;
          const startFaction = reveal?.faction ?? p.faction;
          const role = reveal?.final_role ?? p.role;
          const faction = reveal?.final_faction ?? p.faction;
          const transformed = reveal?.changed === true;
          const factionChanged = transformed && startFaction !== faction;
          // 진영 색 토큰 단일출처. helper(조력자)는 demon 진영이라 자동으로 rose 로 매핑된다.
          const cardColor = FACTION_COLORS[(faction ?? "angel") as keyof typeof FACTION_COLORS] ?? FACTION_COLORS.angel;
          const cardTone = `${cardColor.border} ${cardColor.bgSoft}`;
          const badgeTone = `${cardColor.bgSoft} ${cardColor.gemDark}`;

          return (
            <div
              key={p.userId}
              style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}
              className={`flex flex-col items-center justify-center rounded-2xl border p-5 text-center backdrop-blur-md ${cardTone} ${
                !p.alive ? "opacity-60" : ""
              } motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:fill-mode-backwards`}
            >
              <RoleEmblem role={role} size="md" mood="dark" glow={p.alive} className="mb-3" />
              <div className="mb-1 w-full truncate text-lg font-bold text-white">{p.displayName}</div>
              <div className="mb-3 text-[0.625rem] uppercase tracking-widest text-white/40">
                {p.alive ? "생존함" : "사망함"}
              </div>

              <div className={`mt-auto rounded-full px-4 py-1.5 text-sm font-semibold ${badgeTone}`}>
                {roleLabel(role) || role || "알 수 없음"}
              </div>
              {transformed ? (
                <div className="mt-2 text-[0.6875rem] text-white/55">
                  <span>{roleLabel(startRole) || startRole}</span>
                  {factionChanged ? (
                    <span className="text-white/35">({FACTION_KO[startFaction ?? ""] ?? startFaction})</span>
                  ) : null}
                  <span className="mx-1 text-white/35">→</span>
                  <span className={factionChanged ? "font-semibold" : ""}>{roleLabel(role) || role}</span>
                  {factionChanged ? (
                    <span className="text-white/35">({FACTION_KO[faction ?? ""] ?? faction})</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {onLeave ? (
        <div className="mx-auto mt-12 w-full max-w-sm text-center">
          <Button
            type="button"
            variant="primary"
            disabled={isLeaving}
            onClick={async () => {
              setIsLeaving(true);
              setLeaveError(null);
              try {
                await onLeave();
              } catch (err) {
                setLeaveError(err instanceof Error ? err.message : "로비 이동 실패");
                setIsLeaving(false);
              }
            }}
            className="w-full shadow-lg"
          >
            {isLeaving ? "돌아가는 중..." : "로비 목록으로 돌아가기"}
          </Button>
          {leaveError ? (
            <p role="alert" className="mt-3 text-sm text-rose-300">
              {leaveError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
