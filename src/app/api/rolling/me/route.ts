import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin, forbiddenOrigin, requireDiscordUser } from "@/lib/request-security";
import { createServiceSupabaseClient } from "@/lib/muel-profile";

export const dynamic = "force-dynamic";

// 내가 *받은* 롤링페이퍼 (target_id = 나). 공개 레이어 — 멤버끼리 남긴 한 줄.
// PDF 내보내기/웹 조회용. 작성/차단은 디스코드 /롤링페이퍼 쪽에 둔다.
export async function GET(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return forbiddenOrigin();
  }
  const discordAuth = await requireDiscordUser(req);
  if (!discordAuth.ok) {
    return discordAuth.response;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("muel_rolling_papers")
    .select("id, author_id, content, created_at")
    .eq("target_id", discordAuth.user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ papers: data ?? [] });
}
