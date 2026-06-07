import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin, forbiddenOrigin, requireDiscordUser } from "@/lib/request-security";
import { createServiceSupabaseClient } from "@/lib/muel-profile";

export const dynamic = "force-dynamic";

// 메모리 교정 — 맞음(confirmed, 신뢰도↑) / 틀림(disputed, 신뢰도↓).
// 프라이버시: weave_user_memories(uid) 에 속한(본인 귀속) 메모리만 교정 가능.
export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return forbiddenOrigin();
  }
  const discordAuth = await requireDiscordUser(req);
  if (!discordAuth.ok) {
    return discordAuth.response;
  }

  let body: { memoryId?: string; verdict?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const memoryId = typeof body.memoryId === "string" ? body.memoryId : "";
  const verdict = body.verdict;
  if (!memoryId || (verdict !== "correct" && verdict !== "wrong")) {
    return NextResponse.json({ error: "memoryId and verdict(correct|wrong) required" }, { status: 400 });
  }

  const uid = discordAuth.user.id;
  const supabase = createServiceSupabaseClient();

  // 소유 확인 + 현재 신뢰도 취득 (본인 귀속 메모리 목록에서).
  const { data: mine, error: rpcErr } = await supabase.rpc("weave_user_memories", { uid });
  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }
  const mem = ((mine ?? []) as Array<{ id: string; confidence: number | null }>).find((m) => m.id === memoryId);
  if (!mem) {
    return NextResponse.json({ error: "not_your_memory" }, { status: 403 });
  }

  const cur = typeof mem.confidence === "number" ? mem.confidence : 0.5;
  const status = verdict === "correct" ? "confirmed" : "disputed";
  const confidence =
    verdict === "correct" ? Math.min(1, cur + 0.15) : Math.max(0, cur - 0.3);

  const { error } = await supabase
    .from("muel_memory_entries")
    .update({ status, confidence, updated_at: new Date().toISOString() })
    .eq("id", memoryId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status, confidence });
}
