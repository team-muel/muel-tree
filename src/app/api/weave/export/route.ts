import { NextRequest, NextResponse } from "next/server";
import { forbiddenOrigin, isAllowedOrigin, requireDiscordUser } from "@/lib/request-security";
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

  const uid = discordAuth.user.id;
  const supabase = getServerSupabase();
  const [memoryResult, memoResult, paperResult] = await Promise.all([
    supabase.rpc("weave_user_memories", { uid }),
    supabase
      .from("muel_user_memos")
      .select("id, content, created_at")
      .eq("discord_user_id", uid)
      .order("created_at", { ascending: false }),
    supabase
      .from("muel_rolling_papers")
      .select("id, author_id, content, created_at")
      .eq("target_id", uid)
      .order("created_at", { ascending: false }),
  ]);

  const error = memoryResult.error ?? memoResult.error ?? paperResult.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    memories: memoryResult.data ?? [],
    memos: memoResult.data ?? [],
    papers: paperResult.data ?? [],
  });
}
