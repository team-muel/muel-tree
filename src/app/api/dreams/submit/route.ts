import { NextRequest, NextResponse } from "next/server";
import { forbiddenOrigin, isAllowedOrigin, requireDiscordUser } from "@/lib/request-security";
import { logServiceEvent, normalizeActivityContext } from "@/lib/service-events";
import { createServiceSupabaseClient, upsertDiscordMuelProfile } from "@/lib/muel-profile";
import { extractWeaveDream, embedWeaveDream, type WeaveExtraction } from "@/lib/weave-extraction";

interface SimilarDream {
  id: string;
  similarity: number;
}

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return forbiddenOrigin();
  }

  const discordAuth = await requireDiscordUser(req);
  if (!discordAuth.ok) {
    return discordAuth.response;
  }

  let body: { content?: string; visibility?: string; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const context = normalizeActivityContext(body.context);
  const supabase = createServiceSupabaseClient();
  const profileId = await upsertDiscordMuelProfile(supabase, discordAuth.user);

  if (content.length < 5) {
    await logServiceEvent({
      serviceSlug: "weave",
      eventType: "failed",
      route: "/weave",
      discordUser: discordAuth.user,
      context,
      profileId,
      status: "error",
      metadata: { reason: "content_too_short" },
    });
    return NextResponse.json(
      { error: "content must be at least 5 characters" },
      { status: 400 }
    );
  }
  if (content.length > 1200) {
    await logServiceEvent({
      serviceSlug: "weave",
      eventType: "failed",
      route: "/weave",
      discordUser: discordAuth.user,
      context,
      profileId,
      status: "error",
      metadata: { reason: "content_too_long" },
    });
    return NextResponse.json(
      { error: "content must be 1200 characters or fewer" },
      { status: 400 }
    );
  }

  let extracted: WeaveExtraction;
  try {
    extracted = await extractWeaveDream(content);
  } catch (extractError) {
    await logServiceEvent({
      serviceSlug: "weave",
      eventType: "failed",
      route: "/weave",
      discordUser: discordAuth.user,
      context,
      profileId,
      status: "error",
      metadata: {
        reason: "ai_extraction_failed",
        detail: extractError instanceof Error ? extractError.message.slice(0, 200) : String(extractError).slice(0, 200),
      },
    });
    return NextResponse.json(
      { error: "AI extraction failed" },
      { status: 500 }
    );
  }

  let embedding: number[];
  try {
    embedding = await embedWeaveDream(content);
  } catch (embeddingError) {
    await logServiceEvent({
      serviceSlug: "weave",
      eventType: "failed",
      route: "/weave",
      discordUser: discordAuth.user,
      context,
      profileId,
      status: "error",
      metadata: {
        reason: "embedding_failed",
        detail: embeddingError instanceof Error ? embeddingError.message.slice(0, 200) : String(embeddingError).slice(0, 200),
      },
    });
    return NextResponse.json(
      { error: "embedding generation failed" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("dreams")
    .insert({
      content,
      emotions: extracted.emotions,
      keywords: extracted.keywords,
      main_tag: extracted.main_tag,
      embedding: `[${embedding.join(',')}]`,
      visibility: body.visibility ?? "anonymous",
      service_slug: "weave",
      discord_user_id: discordAuth.user.id,
      discord_username: discordAuth.user.username,
      discord_avatar: discordAuth.user.avatar,
      discord_guild_id: context.guildId ?? null,
      discord_channel_id: context.channelId ?? null,
      discord_instance_id: context.instanceId ?? null,
      muel_profile_id: profileId,
    })
    .select("id, content, emotions, keywords, main_tag, visibility, created_at, discord_user_id, discord_guild_id, muel_profile_id")
    .single();

  if (error) {
    await logServiceEvent({
      serviceSlug: "weave",
      eventType: "failed",
      route: "/weave",
      discordUser: discordAuth.user,
      context,
      profileId,
      status: "error",
      metadata: { reason: "dream_insert_failed" },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: similar } = await supabase.rpc("match_dreams", {
    query_embedding: embedding,
    match_threshold: 0.65,
    match_count: 10,
    exclude_id: data.id,
  });

  const connections = ((similar ?? []) as SimilarDream[]).map((s) => ({
    dream_a: data.id,
    dream_b: s.id,
    similarity: s.similarity,
  }));

  if (connections.length > 0) {
    await supabase.from("dream_connections").insert(connections);
  }

  await logServiceEvent({
    serviceSlug: "weave",
    eventType: "submitted",
    route: "/weave",
    discordUser: discordAuth.user,
    context,
    profileId,
    subjectId: data.id,
    metadata: { connectionsCreated: connections.length },
  });

  return NextResponse.json(
    { dream: data, extracted, connections_created: connections.length },
    { status: 201 }
  );
}
