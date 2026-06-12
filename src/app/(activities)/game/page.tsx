"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityLayout, type ActivitySession } from "@/components/ActivityLayout";
import { getActivity } from "@/config/activities";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { PHASE_TONES } from "@/config/design-tokens";
import {
  authExchange,
  createMatch,
  joinMatch,
  leaveMatch,
  resolveMatch,
  listMatches,
  sendHeartbeat,
  type MatchSummary,
  type PlayerSummary,
} from "@/lib/game/api";
import { clearGameSupabase, getGameSupabase } from "@/lib/game/client";
import { LobbyPhase } from "@/components/game/LobbyPhase";
import { RoleAssignPhase } from "@/components/game/RoleAssignPhase";
import { NightPhase } from "@/components/game/NightPhase";
import { DayPhase } from "@/components/game/DayPhase";
import { VotePhase } from "@/components/game/VotePhase";
import { VerdictPhase } from "@/components/game/VerdictPhase";
import { ResultPhase } from "@/components/game/ResultPhase";
import { StatusDock } from "@/components/game/ui/StatusDock";
import { NightSky } from "@/components/game/ui/NightSky";
import { PhaseSweep } from "@/components/game/ui/PhaseSweep";
import { SuspicionPhase } from "@/components/game/SuspicionPhase";
import { StatusBlock } from "@/components/game/ui/StatusBlock";
import { LandingScreen } from "@/components/game/LandingScreen";
import { IllustrationScene } from "@/components/game/ui/IllustrationScene";
import { DisplayProvider } from "@/lib/game/display";

const GAME_ACTIVITY = getActivity("gomdori-mafia")!;

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
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  // phase_id: 같은 밤에 속한 이벤트 묶음 판별(개인 밤 피드백 — DayPhase)에 쓴다.
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; created_at: string; phase_id?: string; payload?: Record<string, unknown> }>>([]);
  const [currentPhase, setCurrentPhase] = useState<{ phaseType: string; phaseNumber: number; expectedEndedAt: string | null; endedAt: string | null } | null>(null);

  const channelId = session.activityContext.channelId;
  const instanceId = session.activityContext.instanceId;
  const guildId = session.activityContext.guildId;
  const matchId = match?.id ?? null;
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
    return players.filter((p) => p.userId === userId || p.isHost || presentIds.has(p.userId));
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

  // 매치가 바뀌거나(만들기/참가) 떠날 때 이전 매치의 잔여 상태를 비운다 —
  // 새 방에 옛 플레이어·이벤트·페이즈가 남아 "새 방이 아니라 기존 요소가 잔류"하는
  // 문제를 차단. matchId 가 고정인 페이즈 전환(lobby→night 등)에는 발화하지 않는다.
  useEffect(() => {
    setPlayers([]);
    setEvents([]);
    setCurrentPhase(null);
  }, [matchId]);

  useEffect(() => {
    if (!gameJwt || !matchId) return;

    let cancelled = false;
    const supabase = getGameSupabase(gameJwt);

    async function refreshPlayers() {
      const { data, error } = await supabase
        .schema("mafia")
        .from("match_players_visible")
        .select("*")
        .eq("match_id", matchId)
        .order("joined_at", { ascending: true });
      if (!cancelled && !error) {
        setPlayers((data ?? []).map(mapPlayerRow));
      }
    }

    async function refreshMatch() {
      const { data, error } = await supabase
        .schema("mafia")
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();
      if (!cancelled && !error && data) {
        setMatch(mapMatchRow(data));
      }
    }

    async function refreshEvents() {
      const { data, error } = await supabase
        .schema("mafia")
        .from("match_events")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled && !error) {
        setEvents(data ?? []);
      }
    }

    async function refreshPhase() {
      const { data, error } = await supabase
        .schema("mafia")
        .from("match_phases")
        .select("*")
        .eq("match_id", matchId)
        .order("phase_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && !error && data) {
        setCurrentPhase({
          phaseType: String(data.phase_type),
          phaseNumber: Number(data.phase_number),
          expectedEndedAt: typeof data.expected_ended_at === "string" ? data.expected_ended_at : null,
          endedAt: typeof data.ended_at === "string" ? data.ended_at : null,
        });
      }
    }

    const channel = supabase
      .channel(`mafia-match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "mafia", table: "matches", filter: `id=eq.${matchId}` },
        () => {
          refreshMatch();
          refreshPhase();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "mafia", table: "match_players", filter: `match_id=eq.${matchId}` },
        () => {
          refreshPlayers();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "mafia", table: "match_events", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as { id: string; event_type: string; created_at: string; phase_id?: string; payload: Record<string, unknown> };
          setEvents((current) => [row, ...current].slice(0, 20));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "mafia", table: "match_phases", filter: `match_id=eq.${matchId}` },
        () => {
          refreshPhase();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          refreshMatch();
          refreshPlayers();
          refreshEvents();
          refreshPhase();
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearGameSupabase();
    };
  }, [gameJwt, matchId]);

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
      void leaveMatch(matchId, gameJwt).catch(() => {});
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
      // 막다른 오류 화면 대신 랜딩으로 복귀 + 인라인 알림 — 참가/나가기 반복 중
      // 일시 오류(잔존 행 정리 지연 등)도 한 번 더 누르면 풀린다.
      setLandingNotice(error instanceof Error ? error.message : "참가에 실패했습니다.");
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
          onCreate={createGame}
          onJoin={joinGame}
          notice={landingNotice}
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
      <GameFrame status="day" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} myName={myPlayer?.displayName} myAvatarUrl={myPlayer?.avatarUrl} dayNumber={currentPhase?.phaseNumber}>
        <DayPhase match={match} players={players} events={events} myPlayer={myPlayer} phaseEndsAt={phaseEndsAt} />
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
        <ResultPhase match={match} players={players} events={events} />
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
  /**
   * 진입·로딩 계열 화면의 풀블리드 키 아트(night-muse) 배경 (2026-06-12).
   * object-cover + focal 로 어떤 종횡비에서도 시선점이 살고, quality 90 으로
   * 화질을 보존한다. edge fade-b 가 기본 배경색(#11131a)으로 침잠해 이음새 없음.
   * "dim" = 콘텐츠가 주인공인 화면(로비)용 저채도 배경 — 가독성 우선.
   */
  keyArt?: boolean | "dim";
}) {
  const tone = status ? PHASE_TONES[status as keyof typeof PHASE_TONES] : undefined;
  const bg = tone?.bg ?? "bg-[#11131a]";

  // h-full + overflow-y-auto: ActivityLayout 루트가 overflow-hidden 이라
  // 내용이 뷰포트보다 길면 그대로 잘렸다(스크롤 불가 — 작은 디스플레이에서 치명).
  // 내부 래퍼 m-auto = 짧으면 중앙 정렬, 길면 위에서부터 스크롤 (flex 중앙정렬의
  // overflow 클리핑을 피하는 표준 패턴).
  return (
    <main
      className={`relative flex h-full w-full overflow-y-auto px-4 pb-20 pt-5 text-white transition-colors duration-700 sm:px-6 ${bg}`}
    >
      {/* 진입·로딩 키 아트 — 콘텐츠 뒤(DOM 앞순서) 풀블리드. dim = 로비용 저채도. */}
      {keyArt ? (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0">
          <IllustrationScene
            id="night-muse"
            priority
            drift
            quality={90}
            sizes="100vw"
            className={`h-full w-full ${keyArt === "dim" ? "opacity-30" : "opacity-85"}`}
          />
        </div>
      ) : null}
      {/* 로비는 독을 띄우지 않는다 — 화면 자체가 상태("대기 중")를 말하고 있어
          정보 중복인 데다, 모바일에서 시트 peek 과 하단 자리를 다퉜다. */}
      {status !== "lobby" && !hideStatusDock ? (
        <StatusDock
          status={status}
          dayNumber={dayNumber}
          phaseEndsAt={phaseEndsAt ?? null}
          myRole={myRole}
          myFaction={myFaction}
          myName={myName}
          myAvatarUrl={myAvatarUrl}
        />
      ) : null}
      {status === "night" || status === "night_suspect" ? <NightSky /> : null}
      {status === "role_assign" || status === "ended" || status === "lobby" || status === "landing" ? (
        <NightSky subtle />
      ) : null}
      {/* 래퍼에 z 금지: z 를 주면 스태킹 컨텍스트가 생겨 내부 fixed 레이어
          (시트/창 z-40)가 독(z-30) 아래로 깔린다 — 독이 시트 peek 을 덮던 버그.
          NightSky 위 페인트는 DOM 순서(래퍼가 뒤)로 보장된다. */}
      <div
        key={status ?? "static"}
        className="relative m-auto flex w-full justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
      >
        {children}
      </div>
      {/* 페이즈 전환막 — 밤이 내리고 아침이 걷히는 스윕 (Feign 전환 구조) */}
      {status ? <PhaseSweep status={status} /> : null}
    </main>
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

function mapMatchRow(row: Record<string, unknown>): MatchSummary {
  return {
    id: String(row.id),
    status: String(row.status),
    hostUserId: typeof row.host_user_id === "string" ? row.host_user_id : null,
    contextType: String(row.context_type),
    contextId: typeof row.context_id === "string" ? row.context_id : null,
    maxPlayers: Number(row.max_players),
    winner: typeof row.winner === "string" ? row.winner : null,
    createdAt: String(row.created_at),
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    endedAt: typeof row.ended_at === "string" ? row.ended_at : null,
    settings:
      row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
        ? (row.settings as Record<string, unknown>)
        : {},
    tableLabel: typeof row.table_label === "string" ? row.table_label : "",
    engineState:
      row.engine_state && typeof row.engine_state === "object" && !Array.isArray(row.engine_state)
        ? (row.engine_state as Record<string, unknown>)
        : null,
  };
}

function mapPlayerRow(row: Record<string, unknown>): PlayerSummary {
  return {
    matchId: String(row.match_id),
    userId: String(row.user_id),
    displayName: String(row.display_name),
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    alive: Boolean(row.alive),
    ready: Boolean(row.ready),
    isHost: Boolean(row.is_host),
    joinedAt: String(row.joined_at),
    lastSeenAt: typeof row.last_seen_at === "string" ? row.last_seen_at : null,
    role: typeof row.role === "string" ? row.role : null,
    faction: typeof row.faction === "string" ? row.faction : null,
    circleChat: row.circle_chat === true,
  };
}
