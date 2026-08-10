import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin, forbiddenOrigin, requireDiscordUser } from "@/lib/request-security";
import { getServerSupabase } from "@/lib/server-supabase";

export const dynamic = "force-dynamic";

// "Muel이 보는 나" — 요청자 본인에 대한 Muel 의 메모리 + 상호작용 통계.
// 프라이버시: weave_user_memories RPC 가 본인 귀속 메모리만 반환(정밀/단독chat 규칙).
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

  const [memoryResult, messageResult, identityResult] = await Promise.all([
    supabase.rpc("weave_user_memories", { uid }),
    supabase
      .from("muel_messages_v2")
      .select("created_at", { count: "exact" })
      .eq("metadata->>discordUserId", uid)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("muel_profile_identities")
      .select("profile_id")
      .eq("provider", "discord")
      .eq("provider_user_id", uid)
      .maybeSingle(),
  ]);

  if (memoryResult.error) {
    return NextResponse.json({ error: memoryResult.error.message }, { status: 500 });
  }
  if (messageResult.error) {
    return NextResponse.json({ error: messageResult.error.message }, { status: 500 });
  }

  const memories = memoryResult.data;
  const msgs = messageResult.data;
  let dreams: unknown[] = [];
  if (!identityResult.error && identityResult.data?.profile_id) {
    const dreamResult = await supabase
      .from("dreams")
      .select("id, content, main_tag, created_at")
      .eq("muel_profile_id", identityResult.data.profile_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!dreamResult.error) dreams = dreamResult.data ?? [];
  }

  const list = (memories ?? []) as Array<{ confidence: number | null }>;
  const confidences = list
    .map((m) => (typeof m.confidence === "number" ? m.confidence : null))
    .filter((c): c is number => c != null);
  const avgConfidence = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : null;
  const lastSeen = typeof msgs?.[0]?.created_at === "string" ? msgs[0].created_at : null;

  return NextResponse.json({
    user: { id: uid, username: discordAuth.user.username ?? null },
    stats: {
      messageCount: messageResult.count ?? 0,
      memoryCount: list.length,
      lastSeen,
      avgConfidence,
    },
    memories: list,
    dreams,
  });
}
