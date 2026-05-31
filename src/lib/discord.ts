import { DiscordSDK, patchUrlMappings, Events } from "@discord/embedded-app-sdk";
import { getActivity } from "@/config/activities";
import { appFetch } from "@/lib/app-fetch";
import { isInsideDiscord as launchIsInsideDiscord, restoreLaunchParamsToUrl } from "./discord-launch";

export type DiscordUser = {
  id: string;
  username: string;
  avatar: string | null;
};

export type DiscordSession = {
  sdk: DiscordSDK;
  user: DiscordUser | null;
  accessToken: string | null;
  authError: string | null;
  context: {
    guildId: string | null;
    channelId: string | null;
    instanceId: string | null;
  };
};

const sessions = new Map<string, DiscordSession>();

export type InstanceParticipant = {
  id: string;
  username: string;
  global_name?: string | null;
  nickname?: string;
};

type SdkParticipants = {
  commands: { getInstanceConnectedParticipants: () => Promise<unknown> };
  subscribe: (event: string, handler: (data: unknown) => void) => void;
  unsubscribe: (event: string, handler: (data: unknown) => void) => void;
};

function participantsFrom(res: unknown): InstanceParticipant[] {
  const list = (res as { participants?: unknown } | null)?.participants;
  return Array.isArray(list) ? (list as InstanceParticipant[]) : [];
}

// Discord Activity instance roster (everyone who launched the Activity in this
// voice channel), independent of who has joined the match yet.
export async function getInstanceParticipants(activitySlug: string): Promise<InstanceParticipant[]> {
  const s = sessions.get(activitySlug);
  if (!s) return [];
  const sdk = s.sdk as unknown as SdkParticipants;
  try {
    return participantsFrom(await sdk.commands.getInstanceConnectedParticipants());
  } catch {
    return [];
  }
}

export function subscribeInstanceParticipants(
  activitySlug: string,
  cb: (participants: InstanceParticipant[]) => void,
): () => void {
  const s = sessions.get(activitySlug);
  if (!s) return () => {};
  const sdk = s.sdk as unknown as SdkParticipants;
  const handler = (data: unknown) => cb(participantsFrom(data));
  sdk.subscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, handler);
  return () => {
    try {
      sdk.unsubscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, handler);
    } catch {
      // ignore
    }
  };
}

export function isInsideDiscord(): boolean {
  return launchIsInsideDiscord();
}

function getDiscordClientId(activitySlug: string): string | undefined {
  return getActivity(activitySlug)?.discordClientId;
}

export async function initDiscord(
  activitySlug: string,
): Promise<DiscordSession | null> {
  restoreLaunchParamsToUrl();
  if (!isInsideDiscord()) return null;
  const cached = sessions.get(activitySlug);
  if (cached) return cached;

  const clientId = getDiscordClientId(activitySlug);
  if (!clientId) {
    throw new Error(
      `No Discord client_id configured for activity "${activitySlug}". ` +
        `Set the matching NEXT_PUBLIC_*_DISCORD_CLIENT_ID env in muel-tree.`,
    );
  }

  const sdk = new DiscordSDK(clientId);

  // Gomdori는 클라이언트에서 Supabase(REST·Realtime·Edge Function)를 직접 호출한다.
  // Discord Activity iframe 의 CSP 가 *.supabase.co 직접 호출을 막으므로 Discord
  // 프록시로 우회시킨다. Developer Portal 에 URL Mapping (prefix "/supabase" →
  // target = NEXT_PUBLIC_SUPABASE_URL 의 host) 이 함께 등록돼 있어야 한다.
  // same-origin API 라우트만 쓰는 다른 Activity(weave)는 영향 없음.
  if (activitySlug === "gomdori-mafia") {
    try {
      const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
      if (supabaseHost) {
        patchUrlMappings([{ prefix: "/supabase", target: supabaseHost }]);
      }
    } catch {
      // NEXT_PUBLIC_SUPABASE_URL 미설정 — 프록시 매핑 생략.
    }
  }

  // sdk.ready() resolves when Discord client sends the HANDSHAKE_REPLY.
  // Without a timeout it hangs forever if the Activity URL mapping is
  // misconfigured or the Discord client never responds — keeping the
  // "불러오는 중..." overlay stuck. Fail fast instead.
  await Promise.race([
    sdk.ready(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Discord SDK 연결 시간 초과 (15초). " +
                "Developer Portal → Activity → URL Mappings 설정을 확인하세요.",
            ),
          ),
        15_000,
      ),
    ),
  ]);

  let user: DiscordUser | null = null;
  let accessToken: string | null = null;
  let authError: string | null = null;
  const params = new URLSearchParams(window.location.search);
  const context = {
    guildId: params.get("guild_id"),
    channelId: params.get("channel_id"),
    instanceId: params.get("instance_id"),
  };
  try {
    const { code } = await sdk.commands.authorize({
      client_id: clientId,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify"],
    });

    const res = await appFetch("/api/discord/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, activitySlug }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`token exchange failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const { access_token } = await res.json();
    if (typeof access_token !== "string") {
      throw new Error("token exchange returned no access_token");
    }
    accessToken = access_token;

    const auth = await sdk.commands.authenticate({ access_token });
    user = {
      id: auth.user.id,
      username: auth.user.username,
      avatar: auth.user.avatar ?? null,
    };
  } catch (err) {
    authError = err instanceof Error ? err.message : String(err);
    console.error("[gomdori] Discord auth failed:", authError);
  }

  const session = { sdk, user, accessToken, context, authError };
  sessions.set(activitySlug, session);
  return session;
}
