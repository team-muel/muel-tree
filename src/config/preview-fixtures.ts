/**
 * Gomdori 마피아 페이즈 컴포넌트 *디자인 미리보기* 용 mock 데이터.
 *
 * `/game/preview` 라우트에서 ActivityLayout 우회 + supabase realtime 우회
 * 한 채 7개 페이즈 컴포넌트의 시각 형상을 한 화면에 펼쳐 보기 위한 데이터.
 *
 * 컴포넌트 자체는 *side effect* (supabase 구독, REST 호출) 를 시도하지만
 * preview 페이지에서 pointer-events 차단 + invalid jwt 로 fail-fast 패턴 의존.
 *
 * 인물명은 BoW vault 의 정본 인물 사용 (시미아 / 핀 / 세이카 / 에프).
 */

import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import type { ActivitySession } from "@/components/ActivityLayout";

const NOW = new Date().toISOString();

export const MOCK_USER_ID = "preview-self";

export const MOCK_SESSION: ActivitySession = {
  discordUser: {
    id: MOCK_USER_ID,
    username: "preview-self",
    avatar: null,
  },
  hasDiscordAuth: true,
  accessToken: "preview-token",
  instanceParticipants: [],
  activityContext: {
    guildId: "preview-guild",
    channelId: "preview-channel",
    instanceId: "preview-instance",
  },
};

export const MOCK_MATCH: MatchSummary = {
  id: "preview-match",
  status: "lobby",
  hostUserId: MOCK_USER_ID,
  contextType: "discord_channel",
  contextId: "preview-channel",
  maxPlayers: 8,
  winner: null,
  createdAt: NOW,
  startedAt: null,
  endedAt: null,
  settings: {},
};

export const MOCK_PLAYERS: PlayerSummary[] = [
  {
    matchId: "preview-match",
    userId: MOCK_USER_ID,
    displayName: "당신",
    avatarUrl: null,
    alive: true,
    ready: true,
    isHost: true,
    joinedAt: NOW,
    lastSeenAt: null,
    role: "citizen",
    faction: "angel",
  },
  {
    matchId: "preview-match",
    userId: "p-seika",
    displayName: "세이카",
    avatarUrl: null,
    alive: true,
    ready: true,
    isHost: false,
    joinedAt: NOW,
    lastSeenAt: null,
    role: "doctor",
    faction: "angel",
  },
  {
    matchId: "preview-match",
    userId: "p-pin",
    displayName: "핀",
    avatarUrl: null,
    alive: true,
    ready: true,
    isHost: false,
    joinedAt: NOW,
    lastSeenAt: null,
    role: "police",
    faction: "angel",
  },
  {
    matchId: "preview-match",
    userId: "p-simia",
    displayName: "시미아",
    avatarUrl: null,
    alive: false,
    ready: true,
    isHost: false,
    joinedAt: NOW,
    lastSeenAt: null,
    role: "demon",
    faction: "demon",
  },
  {
    matchId: "preview-match",
    userId: "p-eff",
    displayName: "에프",
    avatarUrl: null,
    alive: true,
    ready: true,
    isHost: false,
    joinedAt: NOW,
    lastSeenAt: null,
    role: "helper",
    faction: "demon",
  },
];

export type MockEvent = {
  id: string;
  event_type: string;
  created_at: string;
  payload?: Record<string, unknown>;
};

export const MOCK_EVENTS: Record<string, MockEvent[]> = {
  roleAssign: [
    {
      id: "e-role",
      event_type: "role_assigned",
      created_at: NOW,
      payload: { role: "citizen", faction: "angel" },
    },
  ],
  dayAfterFirstNight: [
    {
      id: "e-first-night",
      event_type: "first_night_silent",
      created_at: NOW,
      payload: { day_number: 1 },
    },
  ],
  dayAfterDeath: [
    {
      id: "e-death",
      event_type: "player_died",
      created_at: NOW,
      payload: { user_id: "p-simia" },
    },
  ],
  verdictExecuted: [
    {
      id: "e-exec",
      event_type: "player_eliminated",
      created_at: NOW,
      payload: { user_id: "p-simia", cause: "vote", executed_user_id: "p-simia" },
    },
  ],
  gameEnded: [
    {
      id: "e-end",
      event_type: "game_ended",
      created_at: NOW,
      payload: { winner: "angels", winning_faction: "angel" },
    },
  ],
};
