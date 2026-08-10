import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin, forbiddenOrigin, requireDiscordUser } from "@/lib/request-security";
import { getServerSupabase } from "@/lib/server-supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return forbiddenOrigin();
  }

  const discordAuth = await requireDiscordUser(req);
  if (!discordAuth.ok) {
    return discordAuth.response;
  }

  const supabase = getServerSupabase();

  const { data: identity } = await supabase
    .from("muel_profile_identities")
    .select("profile_id")
    .eq("provider", "discord")
    .eq("provider_user_id", discordAuth.user.id)
    .maybeSingle();

  if (!identity?.profile_id) {
    return NextResponse.json({ dreams: [] });
  }

  const { data: dreams, error } = await supabase
    .from("dreams")
    .select("id, content, emotions, keywords, main_tag, visibility, created_at")
    .eq("muel_profile_id", identity.profile_id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ dreams: dreams ?? [] });
}
