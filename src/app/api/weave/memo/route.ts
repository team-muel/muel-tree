import { NextRequest, NextResponse } from "next/server";
import { isAllowedOrigin, forbiddenOrigin, requireDiscordUser } from "@/lib/request-security";
import { createServiceSupabaseClient } from "@/lib/muel-profile";

export const dynamic = "force-dynamic";

// "Muel이 알아야 할 것 알려주기" — 사용자가 직접 남기는 메모(꿈 입력 대체).
// muel_user_memos 에 저장. 봇 메모리 파이프라인이 이후 ingest (후속).
export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return forbiddenOrigin();
  }
  const discordAuth = await requireDiscordUser(req);
  if (!discordAuth.ok) {
    return discordAuth.response;
  }

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (content.length < 2) {
    return NextResponse.json({ error: "내용을 조금 더 적어주세요." }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: "1000자 이하로 적어주세요." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("muel_user_memos")
    .insert({ discord_user_id: discordAuth.user.id, content })
    .select("id, content, created_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, memo: data }, { status: 201 });
}

// 내가 남긴 메모 목록 — PDF 내보내기/조회용.
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
    .from("muel_user_memos")
    .select("id, content, created_at")
    .eq("discord_user_id", discordAuth.user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ memos: data ?? [] });
}
