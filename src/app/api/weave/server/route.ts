import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin, forbiddenOrigin, requireDiscordUser } from "@/lib/request-security";
import { createServiceSupabaseClient } from "@/lib/muel-profile";

export const dynamic = "force-dynamic";

// 서버 뷰 — 비개인 커뮤니티 지표(상호작용 수·이름·기여 totals). 메모리 내용은 노출 안 함.
export async function GET(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return forbiddenOrigin();
  }
  const discordAuth = await requireDiscordUser(req);
  if (!discordAuth.ok) {
    return discordAuth.response;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("weave_server_overview");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? { users: [], totals: {} });
}
