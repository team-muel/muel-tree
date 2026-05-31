import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import { getActivity } from "@/config/activities";
import { appFetch } from "@/lib/app-fetch";

export type DiscordUser = {
  id: string;
  username: string;
  avatar: string | null;
};

export type DiscordSession = {
  sdk: DiscordSDK;
  user: DiscordUser | null;
  accessToken: string | null;
  context: {
    guildId: string | null;
    channelId: string | null;
    instanceId: string | null;
  };
};

const sessions = new Map<string, DiscordSession>();

export function isInsideDiscord(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.search;
  return p.includes("frame_id") || p.includes("instance_id");
}

function getDiscordClientId(activitySlug: string): string | undefined {
  return getActivity(activitySlug)?.discordClientId;
}

export async function initDiscord(
  activitySlug: string,
): Promise<DiscordSession | null> {
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
    const { access_token } = await res.json();
    accessToken = typeof access_token === "string" ? access_token : null;

    const auth = await sdk.commands.authenticate({ access_token });
    user = {
      id: auth.user.id,
      username: auth.user.username,
      avatar: auth.user.avatar ?? null,
    };
  } catch {
    // auth failed — run in anonymous mode
  }

  const session = { sdk, user, accessToken, context };
  sessions.set(activitySlug, session);
  return session;
}
