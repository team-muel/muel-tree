"use client";

/**
 * ResultPhase — 결과. 어둠의 무대 위에 진영 광휘가 선다.
 * 정체 공개 = RoleEmblem(심볼 토큰)이 처음으로 전원에게 켜지는 순간.
 * winner 판정 로직 동일, 시각 오버홀 (2026-06-11).
 */

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { roleLabel } from "@/config/gomdori-roles";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { RoleEmblem } from "@/components/game/ui/RoleEmblem";

type ResultPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
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

function revealMap(payload: Record<string, unknown> | undefined): Map<string, RevealedPlayer> {
  const list = Array.isArray(payload?.players) ? (payload.players as RevealedPlayer[]) : [];
  return new Map(list.filter((p) => typeof p?.user_id === "string").map((p) => [p.user_id, p]));
}

export function ResultPhase({ match, players, events }: ResultPhaseProps) {
  // Primary source: match.winner from Realtime (set by phase-advance on DB).
  // Fallback: game_ended event payload (if phase-advance emits it in the future).
  const endEvent = events.find((e) => e.event_type === "game_ended");
  const winner = match.winner ?? (endEvent?.payload?.winner as string | undefined);
  const revealed = revealMap(endEvent?.payload);
  // 최대 일수 도달 → 우세 판정 종착 (M2-5 안전망). 갑작스러운 종료로 읽히지 않게 명시.
  const byTimeout = endEvent?.payload?.timeout === true;

  const isAngelWin = winner === "angels";
  const isNeutralWin = winner === "neutral"; // 파스아 단독 승리(W6)

  const bannerTone = isNeutralWin
    ? {
        frame: "border-violet-400/30 bg-violet-950/40 shadow-[0_0_56px_rgba(196,181,253,0.22)]",
        accent: "text-violet-300/80",
        title: "text-violet-100",
      }
    : isAngelWin
      ? {
          frame: "border-amber-400/30 bg-amber-950/40 shadow-[0_0_56px_rgba(252,211,77,0.22)]",
          accent: "text-amber-300/80",
          title: "text-amber-100",
        }
      : {
          frame: "border-rose-400/25 bg-rose-950/40 shadow-[0_0_56px_rgba(251,113,133,0.24)]",
          accent: "text-rose-300/80",
          title: "text-rose-100",
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
          const role = reveal?.final_role ?? p.role;
          const faction = reveal?.final_faction ?? p.faction;
          const transformed = reveal?.changed === true;
          const isDemonFaction = faction === "demon";
          const isNeutralFaction = faction === "neutral"; // 파스아(W6)

          const cardTone = isNeutralFaction
            ? "border-violet-400/20 bg-violet-950/25"
            : isDemonFaction
              ? "border-rose-400/20 bg-rose-950/25"
              : "border-amber-400/20 bg-amber-950/20";
          const badgeTone = isNeutralFaction
            ? "bg-violet-400/15 text-violet-300"
            : isDemonFaction
              ? "bg-rose-400/15 text-rose-300"
              : "bg-amber-400/15 text-amber-200";

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
                <div className="mt-2 text-[0.6875rem] text-white/45">
                  {(roleLabel(startRole) || startRole) + " → " + (roleLabel(role) || role)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
