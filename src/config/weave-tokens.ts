// Weave 노드 시각 토큰 — main_tag → 팔레트 색, emotions 수 → 반지름.
// frontend(weave/page.tsx)와 server route(api/dreams)가 공유해 중복 제거.
export const TAG_PALETTE = [
  "#f472b6", "#a78bfa", "#60a5fa", "#34d399",
  "#fbbf24", "#fb923c", "#f87171", "#38bdf8",
  "#818cf8", "#6ee7b7", "#c4b5fd", "#e879f9",
];

// main_tag 문자열을 결정론적으로 팔레트 색상으로 매핑.
export function tagColor(tag?: string): string {
  if (!tag) return "#818cf8";
  let hash = 0;
  for (const c of tag) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

// emotions.length(1–4) → 반지름 0.7–1.4 선형 (1→0.7, 4→1.4).
export function emotionRadius(emotions?: string[]): number {
  const count = Math.min(Math.max(emotions?.length ?? 1, 1), 4);
  return 0.7 + (count - 1) * 0.233;
}
