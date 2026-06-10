"use client";

import { useEffect, useState } from "react";
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
import { IllustrationScene } from "@/components/game/ui/IllustrationScene";
import { SuspicionPhase } from "@/components/game/SuspicionPhase";
import { StatusBlock } from "@/components/game/ui/StatusBlock";

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
      {(session) => <GameShell session={session} />}
    </ActivityLayout>
  );
}

function GameShell({ session }: { session: ActivitySession }) {
  const [boot, setBoot] = useState<BootState>({ status: "waiting" });
  const [gameJwt, setGameJwt] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [landingMatch, setLandingMatch] = useState<MatchSummary | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; created_at: string; payload?: Record<string, unknown> }>>([]);
  const [currentPhase, setCurrentPhase] = useState<{ phaseType: string; phaseNumber: number; expectedEndedAt: string | null; endedAt: string | null } | null>(null);

  const channelId = session.activityContext.channelId;
  const instanceId = session.activityContext.instanceId;
  const guildId = session.activityContext.guildId;
  const matchId = match?.id ?? null;
  const myPlayer = players.find((player) => player.userId === userId) ?? null;
  const phaseEndsAt = currentPhase && !currentPhase.endedAt ? currentPhase.expectedEndedAt : null;

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
        setLandingMatch(existing);
        setBoot({ status: "landing" });
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
  }, [channelId, guildId, session.accessToken, session.hasDiscordAuth]);

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
          const row = payload.new as { id: string; event_type: string; created_at: string; payload: Record<string, unknown> };
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
      setBoot({ status: "error", message: error instanceof Error ? error.message : "게임 생성에 실패했습니다." });
    }
  }

  async function joinGame() {
    if (!gameJwt || !landingMatch) return;
    setBoot({ status: "joining" });
    try {
      if (landingMatch.status === "lobby") {
        const joined = await joinMatch(landingMatch.id, gameJwt);
        setMatch(joined.match);
      } else {
        setMatch(landingMatch);
      }
      setBoot({ status: "ready" });
    } catch (error) {
      setBoot({ status: "error", message: error instanceof Error ? error.message : "참가에 실패했습니다." });
    }
  }

  if (!session.hasDiscordAuth) {
    return (
      <GameFrame>
        <OutsideActivityBlock />
      </GameFrame>
    );
  }

  if (boot.status === "error") {
    return (
      <GameFrame>
        <StatusBlock title="입장 실패" detail={boot.message} />
      </GameFrame>
    );
  }

  if (boot.status === "landing") {
    return (
      <GameFrame>
        <LandingScreen existing={landingMatch} participants={session.instanceParticipants} onCreate={createGame} onJoin={joinGame} />
      </GameFrame>
    );
  }

  if (boot.status !== "ready" || !match) {
    return (
      <GameFrame>
        <StatusBlock
          title={boot.status === "joining" ? "매치 참가 중" : "게임 인증 중"}
          detail="Gomdori 게임 서버와 Discord 채널을 연결하고 있습니다."
        />
      </GameFrame>
    );
  }

  if (!gameJwt) {
    return (
      <GameFrame>
        <StatusBlock
          title="게임 인증 실패"
          detail="게임 서버 인증 토큰이 없습니다. Activity를 다시 열어주세요."
        />
      </GameFrame>
    );
  }

  if (match.status === "night_resolve") {
    return (
      <GameFrame status="night_resolve" myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} dayNumber={currentPhase?.phaseNumber}>
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
      <GameFrame status="night_suspect" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} dayNumber={currentPhase?.phaseNumber}>
        <SuspicionPhase match={match} players={players} myPlayer={myPlayer} gameJwt={gameJwt} events={events} />
      </GameFrame>
    );
  }

  if (match.status === "night") {
    return (
      <GameFrame status="night" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} dayNumber={currentPhase?.phaseNumber}>
        <NightPhase match={match} players={players} myPlayer={myPlayer} gameJwt={gameJwt} events={events} />
      </GameFrame>
    );
  }

  if (match.status === "lobby") {
    return (
      <GameFrame status="lobby">
        <LobbyPhase session={session} match={match} players={players} myPlayer={myPlayer} gameJwt={gameJwt} />
      </GameFrame>
    );
  }

  if (match.status === "day") {
    return (
      <GameFrame status="day" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} dayNumber={currentPhase?.phaseNumber}>
        <DayPhase match={match} players={players} events={events} myPlayer={myPlayer} />
      </GameFrame>
    );
  }

  if (match.status === "vote") {
    return (
      <GameFrame status="vote" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} dayNumber={currentPhase?.phaseNumber}>
        <VotePhase match={match} players={players} myPlayer={myPlayer} gameJwt={gameJwt} events={events} />
      </GameFrame>
    );
  }

  if (match.status === "verdict") {
    return (
      <GameFrame status="verdict" phaseEndsAt={phaseEndsAt} myRole={myPlayer?.role ?? undefined} myFaction={myPlayer?.faction ?? undefined} dayNumber={currentPhase?.phaseNumber}>
        <VerdictPhase players={players} events={events} />
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
  dayNumber,
}: {
  children: React.ReactNode;
  status?: string;
  phaseEndsAt?: string | null;
  myRole?: string;
  myFaction?: string;
  dayNumber?: number;
}) {
  const tone = status ? PHASE_TONES[status as keyof typeof PHASE_TONES] : undefined;
  const bg = tone?.bg ?? "bg-[#11131a]";

  return (
    <main
      className={`relative flex min-h-full w-full items-center justify-center px-4 pb-20 pt-5 text-white transition-colors duration-700 sm:px-6 ${bg}`}
    >
      <StatusDock
        status={status}
        dayNumber={dayNumber}
        phaseEndsAt={phaseEndsAt ?? null}
        myRole={myRole}
        myFaction={myFaction}
      />
      {status === "night" || status === "night_suspect" ? <NightSky /> : null}
      {status === "role_assign" || status === "ended" || status === "lobby" ? <NightSky subtle /> : null}
      <div
        key={status ?? "static"}
        className="relative z-10 flex w-full items-center justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
      >
        {children}
      </div>
      {/* 페이즈 전환막 — 밤이 내리고 아침이 걷히는 스윕 (Feign 전환 구조) */}
      {status ? <PhaseSweep status={status} /> : null}
    </main>
  );
}

function LandingScreen({
  existing,
  participants,
  onCreate,
  onJoin,
}: {
  existing: MatchSummary | null;
  participants: { id: string; username: string; global_name?: string | null; nickname?: string }[];
  onCreate: () => void;
  onJoin: () => void;
}) {
  const joinable = existing != null && existing.status === "lobby";
  const names = participants
    .map((p) => p.nickname || p.global_name || p.username)
    .filter((n): n is string => Boolean(n));
  return (
    <div className="w-full max-w-lg overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-center">
      {/* 키 아트 — 진입의 타이틀 모멘트. 일러스트가 어둠으로 침잠하며 카드와 만난다. */}
      <div className="relative h-44 sm:h-52">
        <IllustrationScene
          id="night-muse"
          priority
          drift
          className="absolute inset-0"
          sizes="(max-width: 640px) 100vw, 512px"
        />
        <div className="absolute inset-x-0 bottom-0 pb-3">
          <div className="text-sm text-white/45">Gomdori Mafia</div>
          <h1 className="mt-1 text-2xl font-semibold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            천사와 악마의 추리
          </h1>
        </div>
      </div>
      <div className="p-8 pt-4">
      <p className="mt-0 text-sm leading-6 text-white/50">
        이 음성 채널에서 함께 플레이합니다. 방을 만들거나 이미 열린 방에 참가하세요.
      </p>
      {names.length > 0 ? (
        <div className="mt-4 rounded-md border border-white/10 bg-black/20 px-4 py-3 text-left">
          <div className="text-xs text-white/35">이 Activity에 모인 사람 ({names.length})</div>
          <div className="mt-1 text-sm text-white/70">{names.join(", ")}</div>
        </div>
      ) : null}
      <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCreate}
          className="h-24 rounded-lg bg-emerald-300 text-base font-semibold text-slate-950 hover:bg-emerald-200"
        >
          게임 만들기
        </button>
        <button
          type="button"
          onClick={onJoin}
          disabled={existing == null}
          className="h-24 rounded-lg border border-white/15 bg-white/[0.06] text-base font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/30 disabled:hover:bg-white/[0.06]"
        >
          {joinable ? "참가하기" : existing != null ? "진행 중인 게임 참가" : "열린 게임 없음"}
        </button>
      </div>
      </div>
    </div>
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
  };
}
