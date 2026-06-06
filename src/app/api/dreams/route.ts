import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/server-supabase";
import { createServiceSupabaseClient } from "@/lib/muel-profile";
import { requireDiscordUser } from "@/lib/request-security";
import { applyForceLayout3D } from "@/lib/force3d";
import type { WeaveNode as DreamNode, WeaveEdge as DreamEdge } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

// main_tag 문자열을 결정론적으로 팔레트 색상으로 매핑
const TAG_PALETTE = [
  "#f472b6", "#a78bfa", "#60a5fa", "#34d399",
  "#fbbf24", "#fb923c", "#f87171", "#38bdf8",
  "#818cf8", "#6ee7b7", "#c4b5fd", "#e879f9",
];

function tagColor(tag?: string): string {
  if (!tag) return "#818cf8";
  let hash = 0;
  for (const c of tag) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

// emotions.length(1–4)를 반지름 0.7–1.4로 선형 매핑
function emotionRadius(emotions?: string[]): number {
  const count = Math.min(Math.max(emotions?.length ?? 1, 1), 4);
  return 0.7 + (count - 1) * 0.233; // 1→0.7, 2→0.933, 3→1.17, 4→1.4
}

function hashString(value: string): number {
  let hash = 0;
  for (const c of value) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return hash || 1;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seededInSphere(key: string, r: number) {
  const seed = hashString(key);
  const u = seededRandom(seed);
  const v = seededRandom(seed + 1);
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const rad = r * Math.cbrt(seededRandom(seed + 2));
  return {
    x: rad * Math.sin(phi) * Math.cos(theta),
    y: rad * Math.sin(phi) * Math.sin(theta),
    z: rad * Math.cos(phi),
  };
}

// ADR-002: source_kind 별 시각 어휘 (색 + 아이콘). dream 은 기존 tag 색 유지.
const SOURCE_KIND_STYLE: Record<string, { color: string; icon: string; label: string; radius: number }> = {
  research_report: { color: "#60a5fa", icon: "📘", label: "리서치", radius: 1.25 },
  subscription_signal: { color: "#22d3ee", icon: "📡", label: "구독 신호", radius: 1.1 },
  community_video: { color: "#fb7185", icon: "▶️", label: "영상", radius: 1.15 },
  community_post: { color: "#f59e0b", icon: "📝", label: "게시글", radius: 1.15 },
  user_memo: { color: "#34d399", icon: "✏️", label: "내 메모", radius: 1 },
  auto_memo: { color: "#9ca3af", icon: "🤖", label: "자동 메모", radius: 0.95 },
};

const FALLBACK_STYLE = { color: "#818cf8", icon: "🧵", label: "Weave", radius: 1.05 };

type WeaveNodeRow = {
  id: string;
  source_kind: string;
  title: string | null;
  body: string | null;
  tags: string[] | null;
  visibility: "private" | "community";
  source_ref: Record<string, unknown> | null;
  created_at: string;
};

type WeaveEmbeddingRow = {
  node_id: string;
  embedding: unknown;
};

function sourceHref(sourceRef: Record<string, unknown> | null): string | undefined {
  const url = typeof sourceRef?.url === "string" ? sourceRef.url : "";
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function compact(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1).trimEnd()}…`;
}

function formatNodeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
}

function parseEmbedding(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    const nums = raw.map((v) => Number(v));
    return nums.every(Number.isFinite) ? nums : null;
  }
  if (typeof raw !== "string") return null;
  const nums = raw
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((v) => Number(v.trim()));
  return nums.length > 0 && nums.every(Number.isFinite) ? nums : null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aNorm += a[i] * a[i];
    bNorm += b[i] * b[i];
  }
  if (aNorm === 0 || bNorm === 0) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

async function buildWeaveSimilarityEdges(nodeIds: string[]): Promise<DreamEdge[]> {
  if (nodeIds.length < 2) return [];
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("weave_node_embeddings")
      .select("node_id, embedding")
      .in("node_id", nodeIds)
      .limit(250);
    if (error || !data) return [];

    const embeddings = (data as WeaveEmbeddingRow[])
      .map((row) => ({ id: row.node_id, embedding: parseEmbedding(row.embedding) }))
      .filter((row): row is { id: string; embedding: number[] } => Boolean(row.embedding));

    const candidates: DreamEdge[] = [];
    for (let i = 0; i < embeddings.length; i += 1) {
      for (let j = i + 1; j < embeddings.length; j += 1) {
        const similarity = cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);
        if (similarity < 0.78) continue;
        candidates.push({
          source: embeddings[i].id,
          target: embeddings[j].id,
          weight: Math.max(0.5, similarity),
          similarity,
        });
      }
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    const degree = new Map<string, number>();
    const selected: DreamEdge[] = [];
    for (const edge of candidates) {
      const sourceDegree = degree.get(edge.source) ?? 0;
      const targetDegree = degree.get(edge.target) ?? 0;
      if (sourceDegree >= 3 || targetDegree >= 3) continue;
      selected.push(edge);
      degree.set(edge.source, sourceDegree + 1);
      degree.set(edge.target, targetDegree + 1);
      if (selected.length >= 100) break;
    }
    return selected;
  } catch {
    return [];
  }
}

async function viewerDiscordUserId(req: NextRequest): Promise<string | null> {
  if (!req.headers.get("authorization")) return null;
  const auth = await requireDiscordUser(req);
  return auth.ok ? auth.user.id : null;
}

// 뷰어의 muel profile id (꿈 소유 판별용; /api/dreams/me 와 동일 경로).
async function viewerProfileId(discordUserId: string | null): Promise<string | null> {
  if (!discordUserId) return null;
  try {
    const svc = createServiceSupabaseClient();
    const { data } = await svc
      .from("muel_profile_identities")
      .select("profile_id")
      .eq("provider", "discord")
      .eq("provider_user_id", discordUserId)
      .maybeSingle();
    return (data?.profile_id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * ADR-002: visible weave_nodes 를 그래프 노드로 읽는다.
 * service role(서버 전용)로 읽으므로 weave_nodes 의 service_role RLS 를 유지한 채
 * 동작한다. 인증된 Discord 사용자는 owner_user_id 가 본인인 private 노드도 본다.
 * 테이블 미존재(마이그레이션 미적용)/에러 시 빈 배열 (꿈 그래프는 영향 X).
 */
async function loadVisibleWeaveGraph(viewerUserId: string | null): Promise<{ nodes: DreamNode[]; edges: DreamEdge[] }> {
  try {
    const supabase = getServerSupabase();
    const [community, mine] = await Promise.all([
      supabase
        .from("weave_nodes")
        .select("id, source_kind, title, body, tags, visibility, source_ref, created_at")
        .eq("visibility", "community")
        .order("created_at", { ascending: false })
        .limit(180),
      viewerUserId
        ? supabase
            .from("weave_nodes")
            .select("id, source_kind, title, body, tags, visibility, source_ref, created_at")
            .eq("visibility", "private")
            .eq("owner_user_id", viewerUserId)
            .order("created_at", { ascending: false })
            .limit(120)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (community.error || mine.error) return { nodes: [], edges: [] };

    const rows = ([...(community.data ?? []), ...(mine.data ?? [])] as WeaveNodeRow[]);
    const nodes = rows.map((n) => {
      const style = SOURCE_KIND_STYLE[n.source_kind] ?? FALLBACK_STYLE;
      const tags = Array.isArray(n.tags) ? n.tags.filter(Boolean) : [];
      const text = (n.title ?? n.body ?? "").trim();
      const shortText = compact(text || "노드", 60);
      const isPrivate = n.visibility === "private";
      const visibility: "private" | "community" = isPrivate ? "private" : "community";
      const meta = [
        style.label,
        isPrivate ? "나만" : "공개",
        formatNodeDate(n.created_at),
      ].filter(Boolean).join(" · ");
      return {
        id: n.id,
        label: `${style.icon} ${shortText}`,
        ...seededInSphere(`${n.source_kind}:${n.id}`, isPrivate ? 13 : 18),
        vx: 0,
        vy: 0,
        vz: 0,
        color: style.color,
        radius: isPrivate ? Math.max(0.85, style.radius - 0.1) : style.radius,
        keywords: tags.slice(0, 4),
        sourceKind: n.source_kind,
        sourceLabel: style.label,
        metaLabel: meta,
        visibility,
        mine: isPrivate,
        href: sourceHref(n.source_ref),
      };
    });
    const edges = await buildWeaveSimilarityEdges(nodes.map((node) => node.id));
    return { nodes, edges };
  } catch {
    return { nodes: [], edges: [] };
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const viewerUserId = await viewerDiscordUserId(req);
  const profileId = await viewerProfileId(viewerUserId);

  const [{ data: dreams, error: dreamsErr }, { data: connections }, weaveGraph] =
    await Promise.all([
      supabase
        .from("dreams")
        .select("id, emotions, keywords, main_tag, created_at, muel_profile_id")
        .neq("visibility", "private")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("dream_connections")
        .select("dream_a, dream_b, similarity"),
      loadVisibleWeaveGraph(viewerUserId),
    ]);

  if (dreamsErr) {
    return NextResponse.json({ error: dreamsErr.message }, { status: 500, headers: noStoreHeaders });
  }

  const dreamRows = dreams ?? [];

  const dreamNodes: DreamNode[] = dreamRows.map((d) => {
    const keywords = Array.isArray(d.keywords) ? d.keywords : [];
    const tag = d.main_tag ?? "";
    const label = tag
      ? [tag, ...keywords.slice(0, 2)].join(" · ")
      : keywords.slice(0, 3).join(" · ") || "꿈";
    return {
      id: d.id,
      label,
      ...seededInSphere(`dream:${d.id}`, 15),
      vx: 0,
      vy: 0,
      vz: 0,
      color: tagColor(d.main_tag),
      radius: emotionRadius(d.emotions),
      emotion: Array.isArray(d.emotions) ? d.emotions[0] : undefined,
      keywords,
      sourceKind: "dream",
      sourceLabel: "꿈",
      metaLabel: ["꿈", formatNodeDate(d.created_at)].filter(Boolean).join(" · "),
      visibility: "public",
      mine: profileId != null && (d as { muel_profile_id?: string }).muel_profile_id === profileId,
    };
  });

  const edges: DreamEdge[] = (connections ?? []).map((c) => ({
    source: c.dream_a,
    target: c.dream_b,
    weight: c.similarity ?? 1,
    similarity: c.similarity ?? 0,
  }));

  const allEdges = [...edges, ...weaveGraph.edges];
  const allNodes = [...dreamNodes, ...weaveGraph.nodes];
  const nodes = allNodes.length > 0 ? applyForceLayout3D(allNodes, allEdges, 170) : [];

  return NextResponse.json({ nodes, edges: allEdges }, { headers: noStoreHeaders });
}
