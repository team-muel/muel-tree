"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { clearGameSupabase, getGameSupabase } from "@/lib/game/client";

export type MatchEvent = {
  id: string;
  event_type: string;
  created_at: string;
  phase_id?: string;
  payload?: Record<string, unknown>;
};

export type MatchPhase = {
  phaseType: string;
  phaseNumber: number;
  expectedEndedAt: string | null;
  endedAt: string | null;
};

type Options = {
  gameJwt: string | null;
  matchId: string | null;
  setMatch: Dispatch<SetStateAction<MatchSummary | null>>;
};

export function useMatchRealtime({ gameJwt, matchId, setMatch }: Options) {
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState<MatchPhase | null>(null);

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
        setEvents((data ?? []) as MatchEvent[]);
      }
    }

    async function refreshPhase() {
      const { data, error } = await supabase
        .schema("mafia")
        .from("match_phases")
        .select("*")
        .eq("match_id", matchId)
        .is("ended_at", null)
        .order("phase_number", { ascending: false })
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && !error && data) {
        setCurrentPhase({
          phaseType: String(data.phase_type),
          phaseNumber: Number(data.phase_number),
          expectedEndedAt:
            typeof data.expected_ended_at === "string" ? data.expected_ended_at : null,
          endedAt: typeof data.ended_at === "string" ? data.ended_at : null,
        });
      } else if (!cancelled && !error) {
        setCurrentPhase(null);
      }
    }

    const channel = supabase
      .channel(`mafia-match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "mafia", table: "matches", filter: `id=eq.${matchId}` },
        () => {
          void Promise.all([refreshMatch(), refreshPhase()]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "mafia",
          table: "match_players",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void refreshPlayers();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "mafia",
          table: "match_events",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as MatchEvent;
          setEvents((current) => [row, ...current].slice(0, 20));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "mafia",
          table: "match_phases",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void refreshPhase();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void Promise.all([
            refreshMatch(),
            refreshPlayers(),
            refreshEvents(),
            refreshPhase(),
          ]);
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
      clearGameSupabase();
    };
  }, [gameJwt, matchId, setMatch]);

  return { players, events, currentPhase };
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
    isAi: row.is_ai === true,
    aiProvider: typeof row.ai_provider === "string" ? row.ai_provider : null,
    targetBonus: typeof row.target_bonus === "number" ? row.target_bonus : 0,
    dayTargetBonus: typeof row.day_target_bonus === "number" ? row.day_target_bonus : 0,
  };
}
