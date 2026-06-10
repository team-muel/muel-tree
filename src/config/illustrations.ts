/**
 * 인게임 일러스트 매니페스트 — "그림이 무대가 되는" 렌더링 기반 (2026-06-11).
 *
 * ## 왜 이 구조인가
 * Discord Activity iframe 은 CSP 가 엄격하다: 외부 CDN 이미지는 url-mapping
 * (`patchUrlMappings`) 없이는 차단된다. 따라서 일러스트는 **레포 self-host** 가 기본:
 *   - 파일: `public/illust/<id>.png|webp` (same-origin → Activity 프록시 안전)
 *   - 최적화: next/image 가 `/_next/image`(same-origin) 로 webp/avif 변환·리사이즈
 *
 * ## 에셋 드롭 절차 (그림 1장 = 2줄 작업)
 *   1. `public/illust/<id>.png` 로 파일 추가 (원본 가로 1920px 이하 권장, ≤1.5MB)
 *   2. 아래 ILLUSTRATIONS 에 항목 등록 (focal/tone 은 그림 보고 결정)
 *
 * ## 메타 필드
 * - focal: 구도의 시선점 (0~1). object-position 으로 들어가 어떤 비율로 잘려도
 *   인물 얼굴이 살아남게 한다. 예: 좌상단 인물 = { x: 0.42, y: 0.25 }.
 * - tone: 무대 위 그레이딩. 게임 무드 토큰과 일치 —
 *   "night"(남보라 침잠) | "ember"(핏빛 잔불) | "dawn"(호박빛) | "veil"(무채 안개).
 * - edge: 무대 배경으로 깔 때 그림이 UI 와 만나는 가장자리 처리.
 *   "fade-b"(아래로 침잠, 기본) | "vignette"(사방 어둠) | "none"(컷인용 원본).
 *
 * ## 배치는 아직 하지 않는다
 * 이 파일과 IllustrationScene 은 **렌더링 능력의 준비**다. 실제 어느 화면(직업 reveal
 * 컷인, 페이즈 배경, 승리 일러스트)에 어떤 그림을 깔지는 후속 결정.
 *
 * 첫 후보 에셋(핑크 헤어 다크 페인터리, 마젠타/바이올렛 액센트 — 밤 무드와 동족)은
 * 파일 드롭 후 아래 주석을 해제해 등록한다:
 * 첫 에셋 "night-muse" 등록됨 (2026-06-11, 1672x941 webp 219KB, 원본 보관 =
 * Creations Vault/muel-illust). 추가 에셋도 같은 절차.
 */

export type IllustrationTone = "night" | "ember" | "dawn" | "veil";
export type IllustrationEdge = "fade-b" | "vignette" | "none";

export interface IllustrationMeta {
  /** public/ 기준 절대 경로 (self-host 만 — 외부 URL 금지, Activity CSP). */
  src: string;
  alt: string;
  /** 시선점 (0~1). object-position 으로 변환된다. */
  focal: { x: number; y: number };
  tone: IllustrationTone;
  edge?: IllustrationEdge;
  credit?: string;
}

export const ILLUSTRATIONS: Record<string, IllustrationMeta> = {
  // 다크 페인터리 — 어둠 속에 누운 분홍 머리 인물, 마젠타/바이올렛 파편.
  // 얼굴이 좌상단(0.38, 0.24)이라 와이드 크롭에서도 시선이 산다. 밤 무드 동족.
  "night-muse": {
    src: "/illust/night-muse.webp",
    alt: "어둠 속에 누운 분홍 머리 인물 — 마젠타 파편이 흩어지는 페인터리 일러스트",
    focal: { x: 0.38, y: 0.24 },
    tone: "night",
    edge: "fade-b",
  },
};

export function illustrationById(id: string): IllustrationMeta | null {
  return ILLUSTRATIONS[id] ?? null;
}
