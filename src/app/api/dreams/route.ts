import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/server-supabase";
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

function randomInSphere(r: number) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const rad = r * Math.cbrt(Math.random());
  return {
    x: rad * Math.sin(phi) * Math.cos(theta),
    y: rad * Math.sin(phi) * Math.sin(theta),
    z: rad * Math.cos(phi),
  };
}

// ADR-002: source_kind 별 시각 어휘 (색 + 아이콘). dream 은 기존 tag 색 유지.
const SOURCE_KIND_STYLE: Record<string, { color: string; icon: string }> = {
  research_report: { color: "#60a5fa", icon: "📘" },   // 리서치 리포트 (푸른 톤)
  subscription_signal: { color: "#22d3ee", icon: "📡" }, // 일반 구독 신호
  community_video: { color: "#fb7185", icon: "▶️" },    // 커뮤니티 영상
  community_post: { color: "#f59e0b", icon: "📝" },     // 커뮤니티 게시글
  user_memo: { color: "#34d399", icon: "✏️" },          // 직접 메모
  auto_memo: { color: "#9ca3af", icon: "🤖" },          // 자동 추출 메모
};

const FALLBACK_STYLE = { color: "#818cf8", icon: "🧵" };

type WeaveNodeRow = {
  id: string;
  source_kind: string;
  title: string | null;
  body: string | null;
  tags: string[] | null;
  created_at: string;
};

/**
 * ADR-002: community visibility weave_nodes 를 그래프 노드로 읽는다.
 * service role(서버 전용)로 읽으므로 weave_nodes 의 service_role RLS 를 유지한 채
 * 동작한다. 임베딩 유사도 엣지는 Phase 4 — 현재는 엣지 없는 노드로 표시.
 * 테이블 미존재(마이그레이션 미적용)/에러 시 빈 배열 (꿈 그래프는 영향 X).
 */
async function loadCommunityWeaveNodes(): Promise<DreamNode[]> {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("weave_nodes")
      .select("id, source_kind, title, body, tags, created_at")
      .eq("visibility", "community")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) return [];

    return (data as WeaveNodeRow[]).map((n) => {
      const style = SOURCE_KIND_STYLE[n.source_kind] ?? FALLBACK_STYLE;
      const tags = Array.isArray(n.tags) ? n.tags.filter(Boolean) : [];
      const text = (n.title ?? n.body ?? "").trim();
      const shortText = text.length > 60 ? `${text.slice(0, 59)}…` : text || "노드";
      return {
        id: n.id,
        label: `${style.icon} ${shortText}`,
        ...randomInSphere(18),
        vx: 0,
        vy: 0,
        vz: 0,
        color: style.color,
        radius: 1.1,
        keywords: tags.slice(0, 4),
        sourceKind: n.source_kind,
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: dreams, error: dreamsErr }, { data: connections }, weaveNodes] =
    await Promise.all([
      supabase
        .from("dreams")
        .select("id, emotions, keywords, main_tag, created_at")
        .neq("visibility", "private")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("dream_connections")
        .select("dream_a, dream_b, similarity"),
      loadCommunityWeaveNodes(),
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
      ...randomInSphere(15),
      vx: 0,
      vy: 0,
      vz: 0,
      color: tagColor(d.main_tag),
      radius: emotionRadius(d.emotions),
      emotion: Array.isArray(d.emotions) ? d.emotions[0] : undefined,
      keywords,
      sourceKind: "dream",
    };
  });

  const edges: DreamEdge[] = (connections ?? []).map((c) => ({
    source: c.dream_a,
    target: c.dream_b,
    weight: c.similarity ?? 1,
    similarity: c.similarity ?? 0,
  }));

  // 꿈 노드만 유사도 엣지로 force layout. weave 노드는 (엣지 없는) 바깥 셸로 합류.
  const laidDreams = dreamNodes.length > 0 ? applyForceLayout3D(dreamNodes, edges, 150) : [];
  const nodes = [...laidDreams, ...weaveNodes];

  return NextResponse.json({ nodes, edges }, { headers: noStoreHeaders });
}
