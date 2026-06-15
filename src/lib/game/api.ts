// Typed wrappers around the game server (Supabase Edge Functions) endpoints.

const BASE = process.env.NEXT_PUBLIC_MAFIA_GAME_API_BASE_URL ?? "";

function endpoint(name: string): string {
  if (!BASE) {
    throw new Error("NEXT_PUBLIC_MAFIA_GAME_API_BASE_URL is not configured.");
  }
  return `${BASE.replace(/\/$/, "")}/${name}`;
}

function gameApiErrorMessage(name: string, status: number, text: string): string {
  const fallback = `게임 서버 요청에 실패했습니다. (${name} ${status})`;
  if (!text) return fallback;

  try {
    const body = JSON.parse(text) as unknown;
    if (!body || typeof body !== "object") return fallback;

    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
    if (error && typeof error === "object") {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message.trim();
    }
  } catch {
    // Non-JSON error pages should not leak into compact Activity UI alerts.
  }

  return fallback;
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
    throw new Error(gameApiErrorMessage(name, res.status, text));
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
  // 로비 게임 설정(jsonb 패스스루). 예: { neutral: "auto" | "on" | "off" }.
  settings: Record<string, unknown>;
  tableLabel?: string;
  engineState?: Record<string, unknown> | null;
};

// 중립(파스아) 등장 모드 (M3-1, 결정 잠금 #2). 서버 resolveNeutralMode 와 동일 규칙:
// settings.neutral 우선, 레거시 includeNeutral 불리언은 on/off 로, 미설정은 auto.
export type NeutralMode = "auto" | "on" | "off";

export const NEUTRAL_MODES: readonly NeutralMode[] = ["auto", "on", "off"];

export function resolveNeutralMode(settings: Record<string, unknown>): NeutralMode {
  const raw = settings.neutral;
  if (typeof raw === "string" && (NEUTRAL_MODES as readonly string[]).includes(raw)) {
    return raw as NeutralMode;
  }
  if (settings.includeNeutral === true) return "on";
  if (settings.includeNeutral === false) return "off";
  return "auto";
}

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
  /**
   * 접선 회로(본인 전용, 뷰 circle_chat) — true 면 악마 채팅이 열려 있다.
   * 정본(2026-06-12): 가인(밤2까지)·로건(영구)만. 진영이 아니라 능력이 결정.
   */
  circleChat?: boolean;
  /** AI 용병 플레이어 여부 (ADR-005). */
  isAi?: boolean;
  /** AI 프로바이더 — 'chatgpt' | 'gemini' | 'claude'. AI 토큰 브랜드/라벨에 쓰인다. */
  aiProvider?: string | null;
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

export async function updateMatchSettings(
  matchId: string,
  settings: { neutral: NeutralMode },
  gameJwt: string,
): Promise<{ success: boolean; match: MatchSummary }> {
  return postJson<{ matchId: string; neutral: NeutralMode }, { success: boolean; match: MatchSummary }>(
    "match-settings",
    { matchId, neutral: settings.neutral },
    { gameJwt },
  );
}

export async function kickPlayer(
  matchId: string,
  targetUserId: string,
  gameJwt: string,
): Promise<{ success: boolean }> {
  return postJson<{ matchId: string; targetUserId: string }, { success: boolean }>(
    "match-kick",
    { matchId, targetUserId },
    { gameJwt },
  );
}

export async function inviteAi(
  matchId: string,
  gameJwt: string,
): Promise<{ player: PlayerSummary }> {
  return postJson<{ matchId: string }, { player: PlayerSummary }>(
    "match-invite-ai",
    { matchId },
    { gameJwt },
  );
}

export async function removeAi(
  matchId: string,
  userId: string,
  gameJwt: string,
): Promise<{ success: boolean }> {
  return postJson<{ matchId: string; userId: string }, { success: boolean }>(
    "match-remove-ai",
    { matchId, userId },
    { gameJwt },
  );
}

export async function leaveMatch(
  matchId: string,
  gameJwt: string,
): Promise<{ success: boolean }> {
  return postJson<{ matchId: string }, { success: boolean }>(
    "match-leave",
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

export async function selectRole(
  matchId: string,
  role: string,
  gameJwt: string,
): Promise<{ success: boolean; role: string }> {
  return postJson<{ matchId: string; role: string }, { success: boolean; role: string }>(
    "match-select-role",
    { matchId, role },
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

// 토론(day) 시간 조절 — 유저당 그 토론 1회(총량). cut -20초 / extend +10초.
export async function adjustDiscussionTime(
  matchId: string,
  direction: "cut" | "extend",
  gameJwt: string,
): Promise<{ success: boolean; expectedEndedAt: string }> {
  return postJson<{ matchId: string; direction: "cut" | "extend" }, { success: boolean; expectedEndedAt: string }>(
    "match-adjust-time",
    { matchId, direction },
    { gameJwt },
  );
}

export async function listMatches(
  discordChannelId: string,
  gameJwt: string,
): Promise<{ matches: MatchSummary[]; playerCounts: Record<string, number> }> {
  return postJson<{ discordChannelId: string }, { matches: MatchSummary[]; playerCounts: Record<string, number> }>(
    "match-list",
    { discordChannelId },
    { gameJwt },
  );
}

export async function sendHeartbeat(
  matchId: string,
  gameJwt: string,
): Promise<{ success: boolean }> {
  return postJson<{ matchId: string }, { success: boolean }>(
    "match-heartbeat",
    { matchId },
    { gameJwt },
  );
}
