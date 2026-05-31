import { getActivity } from "@/config/activities";

export type ActivityDiscordCredentials = {
  clientId: string;
  clientSecret: string;
};

const activitySecrets: Record<string, string | undefined> = {
  weave: process.env.WEAVE_DISCORD_CLIENT_SECRET,
  "gomdori-mafia": process.env.GOMDORI_DISCORD_CLIENT_SECRET,
};

export function getActivityDiscordCredentials(
  activitySlug: string,
): ActivityDiscordCredentials | null {
  const activity = getActivity(activitySlug);
  if (!activity) return null;

  return {
    clientId: activity.discordClientId ?? "",
    clientSecret: activitySecrets[activity.slug] ?? "",
  };
}
