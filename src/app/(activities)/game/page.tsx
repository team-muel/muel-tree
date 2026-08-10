"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ActivityLayout, type ActivitySession } from "@/components/ActivityLayout";
import { getActivity } from "@/config/activities";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import {
  authExchange,
  createMatch,
  joinMatch,
  leaveMatch,
  resolveMatch,
  listMatches,
  sendHeartbeat,
  type MatchSummary,
} from "@/lib/game/api";
import { useMatchRealtime } from "@/lib/game/use-match-realtime";
import { GameFrameBase } from "@/components/game/ui/GameFrameBase";
import { StatusBlock } from "@/components/game/ui/StatusBlock";
import { LandingScreen } from "@/components/game/LandingScreen";
import { DisplayProvider } from "@/lib/game/display";

const GAME_ACTIVITY = getActivity("gomdori-mafia")!;

const LobbyPhase = dynamic(
  () => import("@/components/game/LobbyPhase").then((module) => module.LobbyPhase),
  { ssr: false },
);
const RoleAssignPhase = dynamic(
  () => import("@/components/game/RoleAssignPhase").then((module) => module.RoleAssignPhase),
  { ssr: false },
);
const NightPhase = dynamic(
  () => import("@/components/game/NightPhase").then((module) => module.NightPhase),
  { ssr: false },
);
const SuspicionPhase = dynamic(
  () => import("@/components/game/SuspicionPhase").then((module) => module.SuspicionPhase),
  { ssr: false },
);
const DeducePhase = dynamic(
  () => import("@/components/game/DeducePhase").then((module) => module.DeducePhase),
  { ssr: false },
);
const DayPhase = dynamic(
  () => import("@/components/game/DayPhase").then((module) => module.DayPhase),
  { ssr: false },
);
const VotePhase = dynamic(
  () => import("@/components/game/VotePhase").then((module) => module.VotePhase),
  { ssr: false },
);
const VerdictPhase = dynamic(
  () => import("@/components/game/VerdictPhase").then((module) => module.VerdictPhase),
  { ssr: false },
);
const ResultPhase = dynamic(
  () => import("@/components/game/ResultPhase").then((module) => module.ResultPhase),
  { ssr: false },
);

type BootState =
  | { status: "waiting" }
  | { status: "authenticating" }
  | { status: "joining" }
  | { status: "landing" }
  | { status: "ready" }
  | { status: "error"; message: string };

export default function GamePage() {
  return (
    <ActivityLayout activity={GAME_ACTIVITY}>
      {(session) => (
        <DisplayProvider>
          <GameShell session={session} />
        </DisplayProvider>
      )}
    </ActivityLayout>
  );
}

function GameShell({ session }: { session: ActivitySession }) {
  const [boot, setBoot] = useState<BootState>({ status: "waiting" });
  // 오류 화면 복구 (2026-06-12): 참가/나가기 반복 중 오류가 나면 막다른 화면에
  // 고정되던 문제 — 부트 재시도 트리거 + 참가 실패는 랜딩 인라인 알림으로.
  const [retryNonce, setRetryNonce] = useState(0);
  const [landingNotice, setLandingNotice] = useState<string | null>(null);
  const [gameJwt, setGameJwt] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [openMatches, setOpenMatches] = useState<MatchSummary[]>([]);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});

  const channelId = session.activityContext.channelId;
  const instanceId = session.activityContext.instanceId;
  const guildId = session.activityContext.guildId;
  const matchId = match?.id ?? null;
  const { players, events, currentPhase } = useMatchRealtime({ gameJwt, matchId, setMatch });
  const myPlayer = players.find((player) => player.userId === userId) ?? null;
  const phaseEndsAt = currentPhase && !currentPhase.endedAt ? currentPhase.expectedEndedAt : null;

  // 로비 유령 정리(시각) — 채널을 떠났는데 무대에 남는 사람. Discord 라이브 참가자
  // (instanceParticipants, subscribe 로 실시간 갱신)에 없는 플레이어는 로비에서 가린다.
  // 가드: 참가자 목록이 비었거나 내가 그 안에 없으면(SDK 신호 불안정) 필터하지 않는다
  // — 실유저 오제거 방지. 자신·방장은 항상 유지. (인게임에선 적용 안 함 — 이탈자도 게임
  // 참가자라 정체·생존이 유효하다. 방치 매치 DB 정리는 백엔드 후속.)
  const presentIds = useMemo(
    () => new Set((session.instanceParticipants ?? []).map((p) => p.id)),
    [session.instanceParticipants],
  );
  const lobbyPlayers = useMemo(() => {
    if (presentIds.size === 0 || !userId || !presentIds.has(userId)) return players;
    // AI 용병은 Discord 참가자 목록에 없으므로 presence 필터에서 제외하지 않는다.
    return players.filter((p) => p.userId === userId || p.isHost || p.isAi || presentIds.has(p.userId));
  }, [players, presentIds, userId]);

  useEffect(() => {
    let cancelled = false;

    async function bootGame() {
      if (!session.hasDiscordAuth || !session.accessToken) {
        setBoot({ status: "waiting" });
        return;
      }
      if (!channelId) {
        setBoot({
          status: "error",
          message: "Discord 음성 채널 정보가 없습니다. Discord Activity 안에서 다시 열어 주세요.",
        });
        return;
      }

      try {
        setBoot({ status: "authenticating" });
        const auth = await authExchange({ discordAccessToken: session.accessToken });
        if (cancelled) return;
        setGameJwt(auth.gameJwt);
        setUserId(auth.userId);

        const existing = await resolveMatch(
          { discordChannelId: channelId, instanceId },
          auth.gameJwt,
        );
        if (cancelled) return;

        if (existing) {
          setMatch(existing);
          setBoot({ status: "ready" });
        } else {
          const listRes = await listMatches(channelId, auth.gameJwt);
          if (cancelled) return;
          setOpenMatches(listRes.matches);
          setPlayerCounts(listRes.playerCounts);
          setLandingNotice(null);
          setBoot({ status: "landing" });
        }
      } catch (error) {
        if (cancelled) return;
        setBoot({
          status: "error",
          message: error instanceof Error ? error.message : "게임 서버 연결에 실패했습니다.",
        });
      }
    }

    bootGame();

    return () => {
      cancelled = true;
    };
    // retryNonce: 오류 화면의 "다시 시도"가 부트 시퀀스를 처음부터 재실행한다.
  }, [channelId, guildId, instanceId, session.accessToken, session.hasDiscordAuth, retryNonce]);

  // 30초 주기 heartbeat 전송
  useEffect(() => {
    if (!gameJwt || !matchId) return;

    void sendHeartbeat(matchId, gameJwt).catch(() => {});

    const interval = setInterval(() => {
      void sendHeartbeat(matchId, gameJwt).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [gameJwt, matchId]);

  // Activity 종료/이탈 시 로비 잔류 방지(best-effort). 백엔드가 로비일 때만 제거.
  useEffect(() => {
    if (!gameJwt || !matchId) return;
    const leave = () => {
      // keepalive 로 보내 unload 중에도 leave 신호가 도달하게 한다. 도달 못 해도
      // 서버 presence GC(reconcileLobbyPresence, TTL 90s)가 유령을 정리한다.
      void leaveMatch(matchId, gameJwt, { keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [gameJwt, matchId]);

  async function createGame() {
    if (!gameJwt || !channelId) return;
    setLandingNotice(null);
    setBoot({ status: "joining" });
    try {
      const created = await createMatch(
        { discordChannelId: channelId, discordGuildId: guildId, instanceId },
        gameJwt,
      );
      const joined = await joinMatch(created.match.id, gameJwt);
      setMatch(joined.match);
      setBoot({ status: "ready" });
    } catch (error) {
      // 막다른 오류 화면 대신 랜딩으로 복귀 + 인라인 알림 — 바로 재시도 가능.
      setLandingNotice(error instanceof Error ? error.message : "게임 생성에 실패했습니다.");
      await returnToLanding();
    }
  }

  // 로비 나가기: 풀 리로드 없이 앱 상태를 랜딩(로비 선택 화면)으로 되돌린다.
  async function returnToLanding() {
    setMatch(null);
    setBoot({ status: "landing" });
    if (gameJwt && channelId) {
      try {
        const listRes = await listMatches(channelId, gameJwt);
        setOpenMatches(listRes.matches);
        setPlayerCounts(listRes.playerCounts);
      } catch {
        // 재조회 실패 시 화면 유지
      }
    }
  }

  async function joinGame(targetMatchId: string) {
    if (!gameJwt) return;
    setLandingNotice(null);
    setBoot({ status: "joining" });
    try {
      const joined = await joinMatch(targetMatchId, gameJwt);
      setMatch(joined.match);
      setBoot({ status: "ready" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "참가에 실패했습니다.";
      if (message.includes("match_not_joinable") || message.includes("match_full")) {
        if (channelId) {
          try {
            const listRes = await listMatches(channelId, gameJwt);
            setOpenMatches(listRes.matches);
            setPlayerCounts(listRes.playerCounts);
          } catch {
            // 목록 새로고침 실패 시에도 랜딩에 남겨 다시 시도할 수 있게 한다.
          }
        }
        setLandingNotice(
          message.includes("match_full")
            ? "정원이 찬 방입니다. 다른 방을 선택하거나 새 방을 만들 수 있어요."
            : "이미 시작된 방입니다. 목록을 새로고침했어요.",
        );
        setBoot({ status: "landing" });
        return;
      }
      // 막다른 오류 화면 대신 랜딩으로 복귀 + 인라인 알림 — 참가/나가기 반복 중
      // 일시 오류(잔존 행 정리 지연 등)도 한 번 더 누르면 풀린다.
      setLandingNotice(message);
      await returnToLanding();
    }
  }

  if (!session.hasDiscordAuth) {
    return (
      <GameFrame keyArt>
        <OutsideActivityBlock />
      </GameFrame>
    );
  }

  if (boot.status === "error") {
    return (
      <GameFrame keyArt>
        <StatusBlock
          title="입장 실패"
          detail={boot.message}
          actions={[
            {
              label: "다시 시도",
              onClick: () => {
                setBoot({ status: "waiting" });
                setRetryNonce((n) => n + 1);
              },
            },
            ...(gameJwt && channelId
              ? [{ label: "로비 목록으로", onClick: () => void returnToLanding() }]
              : []),
          ]}
        />
      </GameFrame>
    );
  }

  if (boot.status === "landing") {
    return (
      <GameFrame status="landing">
        <LandingScreen
          openMatches={openMatches}
          playerCounts={playerCounts}
          participants={session.instanceParticipants}
          myUserId={session.discordUser?.id ?? null}
          notice={landingNotice}
          onCreate={createGame}
          onJoin={joinGame}
          onRefresh={() => {
            setLandingNotice(null);
            void returnToLanding();
          }}
        />
      </GameFrame>
    );
  }

  if (boot.status !== "ready" || !match) {
    return (
      <GameFrame keyArt>
        <StatusBlock
          title={boot.status === "joining" ? "매치 참가 중" : "게임 인증 중"}
          detail="Gomdori 게임 서버와 Discord 채널을 연결하고 있습니다."
        />
      </GameFrame>
    );
  }

  if (!gameJwt) {
    return (
      <GameFrame keyArt>
        <StatusBlock
          title="게임 인증 실패"
          detail="게임 서버 인증 토큰이 없습니다. Activity를 다시 열어주세요."
        />
      </GameFrame>
    );
  }

  if (match.status === "night_resolve") {
    return (
      <GameFrame status="night_resolve" myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} myName={myPlayer?.displayName} myAvatarUrl={myPlayer?.avatarUrl} dayNumber={currentPhase?.phaseNumber}>
        <StatusBlock
          title="밤의 결과를 정리 중..."
          detail="잠시 후 아침이 밝습니다."
        />
      </GameFrame>
    );
  }

  if (match.status === "role_assign") {
    return (
      <GameFrame status="role_assign" phaseEndsAt={phaseEndsAt}>
        <RoleAssignPhase players={players} myPlayer={myPlayer} events={events} matchId={match.id} gameJwt={gameJwt} />
      </GameFrame>
    );
  }

  if (match.status === "night_suspect") {
    return (
      <GameFrame status="night_suspect" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} myName={myPlayer?.displayName} myAvatarUrl={myPlayer?.avatarUrl} dayNumber={currentPhase?.phaseNumber}>
        <SuspicionPhase match={match} players={players} myPlayer={myPlayer} gameJwt={gameJwt} events={events} />
      </GameFrame>
    );
  }

  if (match.status === "night_deduce") {
    return (
      <GameFrame status="night_deduce" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} myName={myPlayer?.displayName} myAvatarUrl={myPlayer?.avatarUrl} dayNumber={currentPhase?.phaseNumber}>
        <DeducePhase match={match} players={players} myPlayer={myPlayer} gameJwt={gameJwt} events={events} />
      </GameFrame>
    );
  }

  if (match.status === "night") {
    return (
      <GameFrame status="night" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} myName={myPlayer?.displayName} myAvatarUrl={myPlayer?.avatarUrl} dayNumber={currentPhase?.phaseNumber} hideStatusDock>
        <NightPhase match={match} players={players} myPlayer={myPlayer} gameJwt={gameJwt} events={events} phaseEndsAt={phaseEndsAt} dayNumber={currentPhase?.phaseNumber} />
      </GameFrame>
    );
  }

  if (match.status === "lobby") {
    return (
      <GameFrame status="lobby" keyArt="dim">
        <LobbyPhase session={session} match={match} players={lobbyPlayers} myPlayer={myPlayer} gameJwt={gameJwt} onLeave={returnToLanding} />
      </GameFrame>
    );
  }

  if (match.status === "day") {
    return (
      <GameFrame status="day" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} myName={myPlayer?.displayName} myAvatarUrl={myPlayer?.avatarUrl} dayNumber={currentPhase?.phaseNumber} dayAdjust={myPlayer?.alive ? { matchId: match.id, gameJwt } : null}>
        <DayPhase match={match} players={players} events={events} myPlayer={myPlayer} gameJwt={gameJwt} phaseEndsAt={phaseEndsAt} />
      </GameFrame>
    );
  }

  if (match.status === "vote") {
    return (
      <GameFrame status="vote" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} myName={myPlayer?.displayName} myAvatarUrl={myPlayer?.avatarUrl} dayNumber={currentPhase?.phaseNumber}>
        <VotePhase match={match} players={players} myPlayer={myPlayer} gameJwt={gameJwt} events={events} />
      </GameFrame>
    );
  }

  if (match.status === "verdict") {
    return (
      <GameFrame status="verdict" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} myName={myPlayer?.displayName} myAvatarUrl={myPlayer?.avatarUrl} dayNumber={currentPhase?.phaseNumber}>
        <VerdictPhase match={match} players={players} myPlayer={myPlayer} gameJwt={gameJwt} events={events} />
      </GameFrame>
    );
  }

  if (match.status === "ended") {
    return (
      <GameFrame status="ended">
        <ResultPhase match={match} players={players} events={events} onLeave={returnToLanding} />
      </GameFrame>
    );
  }

  return (
    <GameFrame>
      <StatusBlock
        title={`알 수 없는 상태`}
        detail={`알 수 없는 페이즈: ${match.status}`}
      />
    </GameFrame>
  );
}


/**
 * GameFrame — GameFrameBase(단일 출처)의 실게임 어댑터.
 * 프레임 규칙(톤 배경·GameBackdrop·독 노출·PhaseSweep·콘텐츠 래퍼)은 전부
 * GameFrameBase 에 있다 — /game/preview 작업대와 같은 코드를 공유해 드리프트 차단.
 */
function GameFrame({
  children,
  status,
  phaseEndsAt,
  myRole,
  myFaction,
  myName,
  myAvatarUrl,
  dayNumber,
  hideStatusDock = false,
  dayAdjust,
  keyArt = false,
}: {
  children: React.ReactNode;
  status?: string;
  phaseEndsAt?: string | null;
  myRole?: string;
  myFaction?: string;
  myName?: string;
  myAvatarUrl?: string | null;
  dayNumber?: number;
  hideStatusDock?: boolean;
  /** 아침(토론) 페이즈에서 살아있는 본인의 시간 조절 — 하단 독 타이머 곁에 노출. */
  dayAdjust?: { matchId: string; gameJwt: string } | null;
  keyArt?: boolean | "dim";
}) {
  return (
    <GameFrameBase
      status={status}
      keyArt={keyArt}
      hideDock={hideStatusDock}
      dock={{ dayNumber, phaseEndsAt, myRole, myFaction, myName, myAvatarUrl, dayAdjust }}
    >
      {children}
    </GameFrameBase>
  );
}

function OutsideActivityBlock() {
  const inviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;

  return (
    <div className="w-full max-w-lg rounded-lg border border-white/10 bg-white/[0.04] p-6 text-left">
      <div className="text-center text-sm text-white/35">Gomdori Mafia</div>
      <h1 className="mt-3 text-center text-xl font-semibold text-white">
        Discord 안에서 시작합니다
      </h1>
      <p className="mt-3 text-center text-sm leading-6 text-white/55">
        Gomdori 마피아는 Discord 음성 채널에 입장한 뒤 <span className="font-mono">/게임</span> 명령으로 열어주세요.
        웹에서 직접 열어두면 채널 컨텍스트가 없어 게임 서버에 연결되지 않습니다.
      </p>

      {inviteUrl ? (
        <div className="mt-5 flex justify-center">
          <a
            href={inviteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink hover:bg-white/85"
          >
            Discord 서버 참여 →
          </a>
        </div>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-white/35">
          페이즈 흐름
        </div>
        <ol className="mt-3 space-y-2">
          {GOMDORI_RULES.publicFlowSteps.map((step, index) => (
            <li key={step.key} className="flex items-baseline gap-3 text-sm">
              <span className="w-6 shrink-0 text-right font-mono text-white/35">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-medium text-white/80">{step.label}</span>
              <span className="text-white/40">— {step.detail}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
