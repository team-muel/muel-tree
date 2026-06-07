import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin, forbiddenOrigin, requireDiscordUser } from "@/lib/request-security";
import { createServiceSupabaseClient } from "@/lib/muel-profile";

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
  const supabase = createServiceSupabaseClient();

  const { data: memories, error } = await supabase.rpc("weave_user_memories", { uid });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: msgs, error: msgErr } = await supabase
    .from("muel_messages_v2")
    .select("created_at")
    .eq("metadata->>discordUserId", uid);
  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  const list = (memories ?? []) as Array<{ confidence: number | null }>;
  const confidences = list
    .map((m) => (typeof m.confidence === "number" ? m.confidence : null))
    .filter((c): c is number => c != null);
  const avgConfidence = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : null;
  const lastSeen = (msgs ?? []).reduce<string | null>(
    (acc, m) => (!acc || (m.created_at as string) > acc ? (m.created_at as string) : acc),
    null,
  );

  return NextResponse.json({
    user: { id: uid, username: discordAuth.user.username ?? null },
    stats: {
      messageCount: (msgs ?? []).length,
      memoryCount: list.length,
      lastSeen,
      avgConfidence,
    },
    memories: list,
  });
}
