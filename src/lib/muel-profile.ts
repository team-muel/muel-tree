import type { SupabaseClient } from "@supabase/supabase-js";

export type DiscordProfileIdentity = {
  id: string;
  username?: string | null;
  avatar?: string | null;
};

function avatarUrl(user: DiscordProfileIdentity): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}

export async function upsertDiscordMuelProfile(
  supabase: SupabaseClient,
  user: DiscordProfileIdentity
): Promise<string | null> {
  const existing = await supabase
    .from("muel_profile_identities")
    .select("profile_id")
    .eq("provider", "discord")
    .eq("provider_user_id", user.id)
    .maybeSingle();

  if (existing.error) {
    console.warn("[muel-profile] identity lookup failed", existing.error.message);
    return null;
  }

  const displayName = user.username ?? "Discord User";
  const userAvatarUrl = avatarUrl(user);

  if (existing.data?.profile_id) {
    const profileId = existing.data.profile_id as string;
    await Promise.all([
      supabase
        .from("muel_profiles")
        .update({ display_name: displayName, avatar_url: userAvatarUrl })
        .eq("id", profileId),
      supabase
        .from("muel_profile_identities")
        .update({
          username: user.username ?? null,
          avatar_url: userAvatarUrl,
          metadata: { avatar: user.avatar ?? null },
        })
        .eq("provider", "discord")
        .eq("provider_user_id", user.id),
    ]);
    return profileId;
  }

  const insertedProfile = await supabase
    .from("muel_profiles")
    .insert({ display_name: displayName, avatar_url: userAvatarUrl })
    .select("id")
    .single();

  if (insertedProfile.error || !insertedProfile.data?.id) {
    console.warn(
      "[muel-profile] profile insert failed",
      insertedProfile.error?.message
    );
    return null;
  }

  const profileId = insertedProfile.data.id as string;
  const insertedIdentity = await supabase.from("muel_profile_identities").insert({
    profile_id: profileId,
    provider: "discord",
    provider_user_id: user.id,
    username: user.username ?? null,
    avatar_url: userAvatarUrl,
    metadata: { avatar: user.avatar ?? null },
  });

  if (insertedIdentity.error) {
    console.warn("[muel-profile] identity insert failed", insertedIdentity.error.message);
    return null;
  }

  return profileId;
}
