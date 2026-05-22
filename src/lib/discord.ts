import { DiscordSDK } from "@discord/embedded-app-sdk";
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

/**
 * Per-Activity Discord client_id lookup.
 *
 * Each Muel Activity is hosted by its own Discord application, so OAuth must
 * use the matching client_id. We use a literal switch (not dynamic
 * process.env[key] access) so Next.js can statically inline NEXT_PUBLIC_*
 * values at build time.
 */
function getDiscordClientId(activitySlug: string): string | undefined {
  switch (activitySlug) {
    case "weave":
      return process.env.NEXT_PUBLIC_WEAVE_DISCORD_CLIENT_ID;
    case "gomdori-mafia":
      return process.env.NEXT_PUBLIC_GOMDORI_DISCORD_CLIENT_ID;
    default:
      return undefined;
  }
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
