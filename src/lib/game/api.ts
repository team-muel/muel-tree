// Typed wrappers around the game server (Supabase Edge Functions) endpoints.

const BASE = process.env.NEXT_PUBLIC_MAFIA_GAME_API_BASE_URL ?? "";

function endpoint(name: string): string {
  if (!BASE) {
    throw new Error("NEXT_PUBLIC_MAFIA_GAME_API_BASE_URL is not configured.");
  }
  return `${BASE.replace(/\/$/, "")}/${name}`;
}

async function postJson<TReq, TRes>(
  name: string,
  body: TReq,
  options: { gameJwt?: string } = {},
): Promise<TRes> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (options.gameJwt) {
    headers.authorization = `Bearer ${options.gameJwt}`;
  }

  const res = await fetch(endpoint(name), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`game api ${name} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TRes;
}

export type AuthExchangeResult = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  gameJwt: string;
  expiresAt: string;
};

export async function authExchange(input: {
  discordAccessToken: string;
}): Promise<AuthExchangeResult> {
  return postJson<typeof input, AuthExchangeResult>("auth-exchange", input);
}

export type MatchSummary = {
  id: string;
  status: string;
  hostUserId: string | null;
  contextType: string;
  contextId: string | null;
  maxPlayers: number;
  winner: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
};

export type PlayerSummary = {
  matchId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  alive: boolean;
  ready: boolean;
  isHost: boolean;
  joinedAt: string;
  lastSeenAt: string | null;
  role: string | null;
  faction: string | null;
};

export async function resolveMatch(
  input: { discordChannelId?: string | null; instanceId?: string | null },
  gameJwt: string,
): Promise<MatchSummary | null> {
  return postJson<typeof input, MatchSummary | null>("match-resolve", input, { gameJwt });
}

export async function createMatch(
  input: { discordChannelId: string; discordGuildId?: string | null; instanceId?: string | null },
  gameJwt: string,
): Promise<{ match: MatchSummary; created: boolean }> {
  return postJson<typeof input, { match: MatchSummary; created: boolean }>(
    "match-create",
    input,
    { gameJwt },
  );
}

export async function joinMatch(
  matchId: string,
  gameJwt: string,
): Promise<{ match: MatchSummary; player: PlayerSummary }> {
  return postJson<{ matchId: string }, { match: MatchSummary; player: PlayerSummary }>(
    "match-join",
    { matchId },
    { gameJwt },
  );
}

export async function setReady(
  matchId: string,
  ready: boolean,
  gameJwt: string,
): Promise<{ match: MatchSummary; player: PlayerSummary }> {
  return postJson<{ matchId: string; ready: boolean }, { match: MatchSummary; player: PlayerSummary }>(
    "match-ready",
    { matchId, ready },
    { gameJwt },
  );
}

export async function startMatch(
  matchId: string,
  gameJwt: string,
): Promise<{ success: boolean; phase: Record<string, unknown> }> {
  return postJson<{ matchId: string }, { success: boolean; phase: Record<string, unknown> }>(
    "match-start",
    { matchId },
    { gameJwt },
  );
}

export async function submitAction(
  matchId: string,
  actionType: string,
  targetUserId: string | null,
  gameJwt: string,
): Promise<{ success: boolean; investigationResult?: string | null }> {
  return postJson<{ matchId: string; actionType: string; targetUserId: string | null }, { success: boolean; investigationResult?: string | null }>(
    "match-action",
    { matchId, actionType, targetUserId },
    { gameJwt },
  );
}

export async function sendChat(
  matchId: string,
  message: string,
  gameJwt: string,
): Promise<{ success: boolean }> {
  return postJson<{ matchId: string; message: string }, { success: boolean }>(
    "match-chat",
    { matchId, message },
    { gameJwt },
  );
}
