"use client";

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { kickPlayer, setReady, startMatch } from "@/lib/game/api";
import { useMemo, useState } from "react";
import type { ActivitySession } from "@/components/ActivityLayout";

type LobbyPhaseProps = {
  session: ActivitySession;
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 px-3 py-3">
      <div className="text-xs text-white/35">{label}</div>
      <div className="mt-1 truncate text-sm text-white/80">{value}</div>
    </div>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={met ? "text-emerald-300" : "text-white/30"}>
        {met ? "✓" : "○"}
      </span>
      <span className={met ? "text-white/80" : "text-white/45"}>{label}</span>
      <span className="sr-only">{met ? "충족됨" : "미충족"}</span>
    </li>
  );
}

function hostName(players: PlayerSummary[], hostUserId: string | null): string {
  return players.find((player) => player.userId === hostUserId)?.displayName ?? "-";
}

export function LobbyPhase({ session, match, players, myPlayer, gameJwt }: LobbyPhaseProps) {
  const [readyPending, setReadyPending] = useState(false);
  const [startPending, setStartPending] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [kickPending, setKickPending] = useState<string | null>(null);

  const channelId = session.activityContext.channelId;
  const userName = session.discordUser?.username ?? "-";
  const hostLabel = useMemo(() => hostName(players, match.hostUserId), [match.hostUserId, players]);

  const isHost = myPlayer?.isHost;
  const enoughPlayers = players.length >= 5;
  const notTooMany = players.length <= 12;
  const everyoneReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart = enoughPlayers && notTooMany && everyoneReady;

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-5">
      <section className="min-h-[420px] rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">Gomdori Mafia</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">로비</h1>
          </div>
          <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
            {match.status}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <Info label="채널" value={channelId ?? "-"} />
          <Info label="참가자" value={`${players.length} / ${match.maxPlayers}`} />
          <Info label="내 이름" value={userName} />
          <Info label="방장" value={hostLabel} />
        </div>

        <div className="mt-6">
          {isHost ? (
            <ul className="mb-4 space-y-1.5 text-sm" aria-label="시작 조건">
              <Requirement met={enoughPlayers} label={`5명 이상 (${players.length}/5)`} />
              <Requirement met={notTooMany} label="12명 이하" />
              <Requirement met={everyoneReady} label="참가자 전원 준비" />
            </ul>
          ) : null}
          {!isHost ? (
            <button
              type="button"
              disabled={!gameJwt || !myPlayer || readyPending}
              onClick={async () => {
                if (!gameJwt || !myPlayer || !match.id) return;
                setReadyPending(true);
                try {
                  await setReady(match.id, !myPlayer.ready, gameJwt);
                } finally {
                  setReadyPending(false);
                }
              }}
              className="mb-5 h-11 w-full rounded-md bg-emerald-300 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            >
              {myPlayer?.ready ? "준비 해제" : "준비 완료"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!gameJwt || !myPlayer || startPending || !canStart}
              onClick={async () => {
                if (!gameJwt || !myPlayer || !match.id) return;
                setStartError(null);
                setStartPending(true);
                try {
                  await startMatch(match.id, gameJwt);
                } catch (err) {
                  setStartError(err instanceof Error ? err.message : "시작 실패");
                  setStartPending(false);
                }
              }}
              className="mb-5 h-11 w-full rounded-md bg-amber-400 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            >
              {startPending ? "시작하는 중..." : "게임 시작"}
            </button>
          )}
          {startError ? (
            <p role="alert" className="mb-3 text-sm text-red-300">{startError}</p>
          ) : null}

          <div className="mb-3 text-sm font-medium text-white/75">참가자</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {players.length === 0 ? (
              <div className="rounded-md border border-white/10 px-3 py-3 text-sm text-white/40">
                참가자를 불러오는 중입니다.
              </div>
            ) : (
              players.map((player) => (
                <div
                  key={player.userId}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">{player.displayName}</div>
                    <div className="text-xs text-white/35">
                      {player.isHost ? "방장" : "참가자"} · {player.ready ? "준비 완료" : "대기"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div aria-hidden="true" className={`h-2 w-2 rounded-full ${player.ready ? "bg-emerald-300" : "bg-white/20"}`} />
                    {isHost && !player.isHost ? (
                      <button
                        type="button"
                        disabled={!gameJwt || kickPending === player.userId}
                        onClick={async () => {
                          if (!gameJwt || !match.id) return;
                          setStartError(null);
                          setKickPending(player.userId);
                          try {
                            await kickPlayer(match.id, player.userId, gameJwt);
                          } catch (err) {
                            setStartError(err instanceof Error ? err.message : "강퇴 실패");
                          } finally {
                            setKickPending(null);
                          }
                        }}
                        className="rounded border border-red-500/30 px-2 py-0.5 text-xs text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                      >
                        {kickPending === player.userId ? "..." : "강퇴"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Log Section - In a real refactor, this could be shared. We'll leave it in Lobby for now, or move to GameShell. */}
      {/* Since we want modularity, we'll extract it to a standalone layout later if needed. For now, Lobby doesn't strictly need logs, but we'll render a placeholder or empty log. */}
      <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold text-white">대기실 안내</h2>
        <p className="mt-4 text-sm text-white/40">게임이 시작되기를 기다리고 있습니다.</p>
      </aside>
    </div>
  );
}
