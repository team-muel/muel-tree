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
import type { InstanceParticipant } from "@/lib/discord";

const NOW = new Date().toISOString();

export const MOCK_USER_ID = "preview-self";

/**
 * Discord 아바타 *형태*의 목 이미지 — data-URI SVG 실루엣.
 * 실제 CDN 해시는 목 유저로는 못 만들므로, PlayerToken 의 <img> 렌더 경로
 * (아바타가 있을 때의 무대 형상)를 작업대에서 그대로 검증하기 위한 대체물.
 */
function mockAvatar(bg: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'>` +
    `<rect width='96' height='96' fill='${bg}'/>` +
    `<circle cx='48' cy='37' r='17' fill='rgba(255,255,255,0.92)'/>` +
    `<ellipse cx='48' cy='84' rx='28' ry='22' fill='rgba(255,255,255,0.92)'/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

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

/**
 * 목 플레이어 8인 — 전원 아바타 *형태* 보유 (Discord 아바타가 있는 실전과 동일한
 * 무대 형상). 시미아만 사망 상태 — "죽음은 빈자리가 아니라 쓰러진 토큰" 확인용.
 */
export const MOCK_PLAYERS: PlayerSummary[] = [
  {
    matchId: "preview-match",
    userId: MOCK_USER_ID,
    displayName: "당신",
    avatarUrl: mockAvatar("#4f46e5"),
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
    avatarUrl: mockAvatar("#b45309"),
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
    avatarUrl: mockAvatar("#047857"),
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
    avatarUrl: mockAvatar("#be123c"),
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
    avatarUrl: mockAvatar("#7c3aed"),
    alive: true,
    ready: true,
    isHost: false,
    joinedAt: NOW,
    lastSeenAt: null,
    role: "helper",
    faction: "demon",
  },
  {
    matchId: "preview-match",
    userId: "p-maya",
    displayName: "마야",
    avatarUrl: mockAvatar("#0e7490"),
    alive: true,
    ready: false,
    isHost: false,
    joinedAt: NOW,
    lastSeenAt: null,
    role: "citizen",
    faction: "angel",
  },
  {
    matchId: "preview-match",
    userId: "p-sol",
    displayName: "솔",
    avatarUrl: mockAvatar("#c2410c"),
    alive: true,
    ready: true,
    isHost: false,
    joinedAt: NOW,
    lastSeenAt: null,
    role: "citizen",
    faction: "angel",
  },
  {
    matchId: "preview-match",
    userId: "p-seyaka",
    displayName: "세야카",
    avatarUrl: mockAvatar("#475569"),
    alive: true,
    ready: false,
    isHost: false,
    joinedAt: NOW,
    lastSeenAt: null,
    role: "citizen",
    faction: "angel",
  },
];

/** 랜딩 무대용 — Activity 인스턴스 참가자 목 (avatar 에 data-URI 직접). */
export const MOCK_PARTICIPANTS: InstanceParticipant[] = MOCK_PLAYERS.slice(0, 6).map((p) => ({
  id: p.userId,
  username: p.displayName,
  global_name: p.displayName,
  avatar: p.avatarUrl,
}));

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
