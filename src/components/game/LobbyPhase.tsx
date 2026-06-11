"use client";

/**
 * LobbyPhase — 로비도 무대다 (Feign 구조). 참가자가 아바타 토큰으로 무대를
 * 배회하고(roam), 정보는 인게임 공표 배너와 같은 문법의 헤더 + 칩으로.
 * "친구 부르기"는 데스크톱=우측 패널 / 모바일=하단 시트 (BottomSheet 가
 * useDisplay().layout 으로 구조 분기). 모바일은 세로 단일 흐름의 별도 구조.
 * 로직(준비/시작/강퇴/나가기/초대 복사) 동일 — 배치만 오버홀 (2026-06-11 2차).
 */

import type { MatchSummary, NeutralMode, PlayerSummary } from "@/lib/game/api";
import {
  kickPlayer,
  leaveMatch,
  resolveNeutralMode,
  setReady,
  startMatch,
  updateMatchSettings,
} from "@/lib/game/api";
import { Button } from "@/components/game/ui/Button";
import { useMemo, useState } from "react";
import type { ActivitySession } from "@/components/ActivityLayout";
import { GOMDORI_ROLES } from "@/config/gomdori-roles";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { GameStage } from "@/components/game/ui/GameStage";
import { BottomSheet } from "@/components/game/ui/BottomSheet";
import { useDisplay } from "@/lib/game/display";

type LobbyPhaseProps = {
  session: ActivitySession;
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  onLeave: () => void | Promise<void>;
};

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-baseline gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs">
      <span className="shrink-0 text-white/35">{label}</span>
      <span className="truncate text-white/80">{value}</span>
    </span>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[0.625rem] ${
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

// session 은 시그니처 호환을 위해 props 에 남아 있다 (내 정보는 myPlayer/무대 토큰이 표시).
export function LobbyPhase({ match, players, myPlayer, gameJwt, onLeave }: LobbyPhaseProps) {
  const [readyPending, setReadyPending] = useState(false);
  const [startPending, setStartPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [kickPending, setKickPending] = useState<string | null>(null);
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
  const [leavePending, setLeavePending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [neutralPending, setNeutralPending] = useState(false);

  const { layout } = useDisplay();
  const hostLabel = useMemo(() => hostName(players, match.hostUserId), [match.hostUserId, players]);

  const isHost = myPlayer?.isHost;
  const total = players.length;
  const enoughPlayers = total >= 5;
  const notTooMany = total <= 12;
  const nonHost = players.filter((p) => !p.isHost);
  const readyCount = nonHost.filter((p) => p.ready).length;
  const everyoneReady = nonHost.every((p) => p.ready);
  const canStart = enoughPlayers && notTooMany && everyoneReady;

  // 중립(파스아) 등장 모드 (M3-1, 결정 잠금 #2). auto = 존재를 알 수 없는 확률 등장.
  // 자격 인원 미만은 모드와 무관하게 등장하지 않는다 — 기준은 룰 매니페스트 단일 출처.
  const neutralMode = resolveNeutralMode(match.settings);
  const neutralEligible = total >= GOMDORI_RULES.neutral.minPlayers;

  // 인원별 진영 구성 미리보기 (match-start generateRoles 와 동기화: 악마팀 항상 2 =
  // 악마 변종 1 + 조력자 1, 나머지는 천사 풀 추첨. 중립은 등장 시 천사 슬롯 1 대체).
  const composition =
    enoughPlayers && notTooMany
      ? {
          demons: 2,
          angels: total - 2 - (neutralEligible && neutralMode === "on" ? 1 : 0),
          neutral: !neutralEligible || neutralMode === "off"
            ? ("none" as const)
            : neutralMode === "on"
              ? ("one" as const)
              : ("unknown" as const),
        }
      : null;

  async function setNeutral(mode: NeutralMode) {
    if (!gameJwt || !match.id || neutralPending || mode === neutralMode) return;
    setActionError(null);
    setNeutralPending(true);
    try {
      await updateMatchSettings(match.id, { neutral: mode }, gameJwt);
      // 반영은 matches realtime 구독이 해준다.
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "설정 변경 실패");
    } finally {
      setNeutralPending(false);
    }
  }

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
      // Discord Activity의 프록시 iframe에서 location.reload()는 SDK 컨텍스트를
      // 잃어 로비로 못 돌아간다. 풀 리로드 대신 앱 상태만 랜딩으로 되돌린다.
      await onLeave();
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
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-rose-300">악마팀 {composition.demons}</span>
            <span className="text-white/20">·</span>
            <span className="text-amber-200">
              천사팀 {composition.angels}
              {composition.neutral === "unknown" ? "~" + (composition.angels - 1) : ""}
            </span>
            {composition.neutral !== "none" ? (
              <>
                <span className="text-white/20">·</span>
                <span className="text-violet-300">
                  {composition.neutral === "one" ? "중립 1" : "중립 ?"}
                </span>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-white/35">
            악마 변종 1 + 조력자 1 / 천사는 풀에서 추첨
            {composition.neutral === "unknown" ? " / 중립은 나올 수도, 안 나올 수도" : ""}
          </p>
        </div>
      ) : null}

      <div className="rounded-md border border-white/10 bg-black/20 p-3">
        <div className="text-xs uppercase tracking-widest text-white/35">게임 설정</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm text-white/75">중립 등장</span>
          {isHost ? (
            <div role="group" aria-label="중립 등장 설정" className="flex gap-1">
              {(
                [
                  { mode: "auto", label: "자동" },
                  { mode: "on", label: "등장" },
                  { mode: "off", label: "제외" },
                ] as const
              ).map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  disabled={!gameJwt || neutralPending || (mode !== "auto" && !neutralEligible)}
                  aria-pressed={neutralMode === mode}
                  onClick={() => setNeutral(mode)}
                  className={`rounded border px-2 py-0.5 text-xs transition-colors disabled:opacity-40 ${
                    neutralMode === mode
                      ? "border-violet-300/40 bg-violet-400/15 text-violet-200"
                      : "border-white/15 text-white/55 hover:bg-white/[0.08]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <span className="rounded border border-white/15 px-2 py-0.5 text-xs text-white/55">
              {neutralMode === "auto" ? "자동" : neutralMode === "on" ? "등장" : "제외"}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-white/35">
          {neutralEligible
            ? "자동: 중립(파스아)이 나올지 아무도 모릅니다. 방장은 강제로 켜거나 끌 수 있어요."
            : `중립은 ${GOMDORI_RULES.neutral.minPlayers}인부터 등장할 수 있어요. 그 전까지는 자동(미등장)입니다.`}
        </p>
      </div>

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

  // 무대 토큰 보조 라벨 — 캡션 목록을 대체한다 (정보가 캐릭터 발밑에 선다).
  const stageSub = (p: PlayerSummary, isMe: boolean): React.ReactNode => {
    const role = p.isHost ? "방장" : p.ready ? "준비" : "대기";
    return isMe ? `나 · ${role}` : role;
  };

  const compositionLabel = composition
    ? `악마 ${composition.demons} · 천사 ${composition.angels}${
        composition.neutral === "one" ? " · 중립 1" : composition.neutral === "unknown" ? " · 중립 ?" : ""
      }`
    : "5명 모이면 공개";

  const mainPanel = (
    <section className="flex min-w-0 flex-col">
      {/* 헤더 배너 — 인게임 공표 배너와 같은 문법 */}
      <div className="rounded-2xl border border-white/10 border-t-white/20 bg-[#15131e]/90 p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">Gomdori Mafia</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">로비</h1>
          </div>
          <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
            대기 중
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip label="참가" value={`${total} / ${match.maxPlayers}`} />
          <Chip label="준비" value={`${readyCount} / ${nonHost.length}`} />
          <Chip label="방장" value={hostLabel} />
          <Chip label="구성" value={compositionLabel} />
        </div>
      </div>

      {/* 무대 — 모인 사람들이 아바타로 배회한다 (Feign 최소구조) */}
      <div className="py-4">
        {total === 0 ? (
          <div className="rounded-md border border-white/10 px-3 py-6 text-center text-sm text-white/40">
            참가자를 불러오는 중입니다.
          </div>
        ) : (
          <GameStage
            players={stagePlayers}
            myUserId={myPlayer?.userId}
            mood="dark"
            roam
            chrome={false}
            subFor={stageSub}
          />
        )}
      </div>

      {/* 액션 — 무대 아래 중앙 */}
      <div className="mx-auto w-full max-w-sm">
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
  );

  // 모바일: 세로 단일 흐름 + 하단 시트 / 데스크톱: 무대 + 우측 패널 — 별도 구조.
  if (layout === "mobile") {
    return (
      <div className="flex w-full max-w-xl flex-col p-4 pb-24">
        {mainPanel}
        <BottomSheet title="친구 부르기 · 게임 안내">{sheetContent}</BottomSheet>
      </div>
    );
  }

  return (
    <div className="grid w-full max-w-6xl grid-cols-[1.6fr_0.9fr] items-start gap-5 p-5 pb-24">
      {mainPanel}
      <BottomSheet title="친구 부르기 · 게임 안내">{sheetContent}</BottomSheet>
    </div>
  );
}
