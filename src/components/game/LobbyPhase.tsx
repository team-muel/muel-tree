"use client";

/**
 * LobbyPhase — 로비도 무대다 (Feign 구조). 참가자가 토큰으로 무대에 모이고,
 * "친구 부르기"는 데스크톱=우측 패널 / 모바일=하단에서 올라오는 시트 (BottomSheet).
 * 로직(준비/시작/강퇴/나가기/초대 복사) 동일 — 배치만 오버홀 (2026-06-11).
 */

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { kickPlayer, leaveMatch, setReady, startMatch } from "@/lib/game/api";
import { Button } from "@/components/game/ui/Button";
import { useMemo, useState } from "react";
import type { ActivitySession } from "@/components/ActivityLayout";
import { GOMDORI_ROLES } from "@/config/gomdori-roles";
import { GameStage } from "@/components/game/ui/GameStage";
import { BottomSheet } from "@/components/game/ui/BottomSheet";

type LobbyPhaseProps = {
  session: ActivitySession;
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2.5">
      <div className="text-xs text-white/35">{label}</div>
      <div className="mt-0.5 truncate text-sm text-white/80">{value}</div>
    </div>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
          met ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5 text-white/30"
        }`}
      >
        {met ? "✓" : ""}
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [kickPending, setKickPending] = useState<string | null>(null);
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
  const [leavePending, setLeavePending] = useState(false);
  const [copied, setCopied] = useState(false);

  const userName = session.discordUser?.username ?? "-";
  const hostLabel = useMemo(() => hostName(players, match.hostUserId), [match.hostUserId, players]);

  const isHost = myPlayer?.isHost;
  const total = players.length;
  const enoughPlayers = total >= 5;
  const notTooMany = total <= 12;
  const nonHost = players.filter((p) => !p.isHost);
  const readyCount = nonHost.filter((p) => p.ready).length;
  const everyoneReady = nonHost.every((p) => p.ready);
  const canStart = enoughPlayers && notTooMany && everyoneReady;

  // 인원별 진영 구성 미리보기 (match-start generateRoles 와 동기화: 악마팀 항상 2).
  const composition = enoughPlayers && notTooMany ? { demons: 2, angels: total - 2 } : null;

  const inviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;

  // 로비 무대용: ready 상태를 토큰 sub 로. (alive 는 로비에선 전원 true 취급)
  const stagePlayers = players.map((p) => ({ ...p, alive: true }));

  async function copyInvite() {
    const url = inviteUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setActionError("클립보드 복사에 실패했어요. 직접 링크를 공유해주세요.");
    }
  }

  async function leave() {
    if (!gameJwt || !match.id) return;
    setActionError(null);
    setLeavePending(true);
    try {
      await leaveMatch(match.id, gameJwt);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "나가기 실패");
      setLeavePending(false);
    }
  }

  async function doKick(userId: string) {
    if (!gameJwt || !match.id) return;
    if (confirmKick !== userId) {
      setConfirmKick(userId);
      return;
    }
    setActionError(null);
    setKickPending(userId);
    try {
      await kickPlayer(match.id, userId, gameJwt);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "강퇴 실패");
    } finally {
      setKickPending(null);
      setConfirmKick(null);
    }
  }

  const sheetContent = (
    <>
      <div>
        <p className="text-sm text-white/45">5명부터 시작할 수 있어요. 같은 채널 친구를 초대하세요.</p>
        <button
          type="button"
          onClick={copyInvite}
          className="mt-3 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/[0.08]"
        >
          {copied ? "복사됨 ✓" : "초대 링크 복사"}
        </button>
      </div>

      {composition ? (
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <div className="text-xs uppercase tracking-widest text-white/35">이번 판 구성</div>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="text-rose-300">악마팀 {composition.demons}</span>
            <span className="text-white/20">·</span>
            <span className="text-amber-200">천사팀 {composition.angels}</span>
          </div>
          <p className="mt-1 text-xs text-white/35">악마·가인 / 의사·경찰·로마즈·라이너·시민</p>
        </div>
      ) : null}

      <div className="rounded-md border border-white/10 bg-black/20 p-3">
        <div className="text-xs uppercase tracking-widest text-white/35">규칙 요약</div>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-white/55">
          <li>· 밤: 악마는 처치, 의사·경찰·로마즈는 능력 사용</li>
          <li>· 아침: 토론 후 투표로 한 명을 지목·처형</li>
          <li>· 천사 승리: 악마를 모두 찾아 제거</li>
          <li>· 악마 승리: 악마 수가 천사 수 이상</li>
        </ul>
      </div>

      <details className="rounded-md border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-xs uppercase tracking-widest text-white/35">직업 안내</summary>
        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-white/55">
          {Object.entries(GOMDORI_ROLES)
            // 레거시(시민/의사/경찰/조력자 일반)·변환 산물(전향자/타락자)은 배정 풀 아님 — 안내에서 제외.
            .filter(([id]) => !["citizen", "doctor", "police", "helper", "converted", "corrupted"].includes(id))
            .map(([id, r]) => (
              <li key={id}>
                <span className="text-white/80">{r.label}</span> — {r.reveal}
              </li>
            ))}
        </ul>
      </details>

      {isHost && nonHost.length > 0 ? (
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <div className="text-xs uppercase tracking-widest text-white/35">참가자 관리</div>
          <div className="mt-2 space-y-1.5">
            {nonHost.map((player) => (
              <div key={player.userId} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-white/75">{player.displayName}</span>
                <button
                  type="button"
                  disabled={!gameJwt || kickPending === player.userId}
                  onClick={() => doKick(player.userId)}
                  className="rounded border border-rose-400/30 px-2 py-0.5 text-xs text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-40"
                >
                  {kickPending === player.userId ? "..." : confirmKick === player.userId ? "확인?" : "강퇴"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-5 p-5 pb-24 lg:grid-cols-[1.5fr_0.8fr]">
      <section className="rounded-2xl border border-white/10 border-t-white/20 bg-[#15131e]/90 p-5 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">Gomdori Mafia</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">로비</h1>
          </div>
          <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
            대기 중
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 text-sm sm:grid-cols-4">
          <Info label="참가자" value={`${total} / ${match.maxPlayers}`} />
          <Info label="방장" value={hostLabel} />
          <Info label="내 이름" value={userName} />
          <Info label="구성" value={composition ? `악마 ${composition.demons} · 천사 ${composition.angels}` : "5명 모이면 공개"} />
          <Info label="준비" value={`${readyCount} / ${nonHost.length}`} />
        </div>

        {/* 무대 — 모인 사람들 */}
        <div className="mt-4">
          {total === 0 ? (
            <div className="rounded-md border border-white/10 px-3 py-6 text-center text-sm text-white/40">
              참가자를 불러오는 중입니다.
            </div>
          ) : (
            <GameStage
              players={stagePlayers.map((p) => ({
                ...p,
                displayName: p.displayName,
              }))}
              myUserId={myPlayer?.userId}
              mood="dark"
            />
          )}
          <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-white/35">
            {players.map((p) => (
              <span key={p.userId}>
                {p.displayName} — {p.isHost ? "방장" : p.ready ? "준비 완료" : "대기 중"}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {isHost ? (
            <ul className="mb-4 space-y-1.5 text-sm" aria-label="시작 조건">
              <Requirement met={enoughPlayers} label={`5명 이상 (${total}/5)`} />
              <Requirement met={notTooMany} label="12명 이하" />
              <Requirement met={everyoneReady} label={`참가자 전원 준비 (${readyCount}/${nonHost.length})`} />
            </ul>
          ) : null}

          {!isHost ? (
            <Button
              type="button"
              variant="primary"
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
              className="mb-3 w-full"
            >
              {myPlayer?.ready ? "준비 해제" : "준비 완료"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="amber"
              disabled={!gameJwt || !myPlayer || startPending || !canStart}
              onClick={async () => {
                if (!gameJwt || !myPlayer || !match.id) return;
                setActionError(null);
                setStartPending(true);
                try {
                  await startMatch(match.id, gameJwt);
                } catch (err) {
                  setActionError(err instanceof Error ? err.message : "시작 실패");
                  setStartPending(false);
                }
              }}
              className="mb-3 w-full"
            >
              {startPending ? "시작하는 중..." : canStart ? "게임 시작" : "시작 조건 미충족"}
            </Button>
          )}

          <button
            type="button"
            onClick={leave}
            disabled={leavePending}
            className="w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.08] disabled:opacity-40"
          >
            {leavePending ? "..." : "나가기"}
          </button>

          {actionError ? (
            <p role="alert" className="mt-3 text-sm text-rose-300">{actionError}</p>
          ) : null}
        </div>
      </section>

      <BottomSheet title="친구 부르기 · 게임 안내">{sheetContent}</BottomSheet>
    </div>
  );
}
