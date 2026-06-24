/**
 * Gomdori 직업 시각 매핑 — 직업 → 심볼·색·모티프의 single source.
 *
 * 프론트 전용 (backend sync 계약인 gomdori-roles.ts 와 분리).
 * 정본 모티프 출처: vault [[Universes/BoW/Lore/모티프-추적]] + 각 인물 카드.
 *
 * 구조 원칙 (4번째 Task, 2026-06-11):
 *  - 지금은 기하 심볼 + 색. `illustration` 슬롯이 차 있으면 일러스트로 자동 교체
 *    (추후 일러스트 제작 시 이 파일에 경로만 추가 — 컴포넌트 무변경).
 *  - hue 는 무드별 가독을 위해 dark/light 분리.
 */

import type { RoleSymbolId } from "@/components/game/ui/RoleSymbol";

export interface RoleVisual {
  /** 기하 심볼 id — RoleSymbol 컴포넌트가 렌더. */
  symbol: RoleSymbolId;
  /** 심볼·라벨 색 (dark 무드 / light 무드). */
  hueDark: string;
  hueLight: string;
  /** 광휘 그림자 — 정체 공개 등 의미 순간에만. */
  glow: string;
  /** 모티프 한 줄 (도감·툴팁용). vault 정본 기반, 미확정은 표기하지 않음. */
  motif?: string;
  /** 일러스트 경로 (/public 기준). 채워지면 심볼 대신 렌더. */
  illustration?: string;
}

const amber = {
  hueDark: "text-amber-200",
  hueLight: "text-amber-700",
  glow: "shadow-[0_0_28px_rgba(252,211,77,0.30)]",
};
const rose = {
  hueDark: "text-rose-300",
  hueLight: "text-rose-700",
  glow: "shadow-[0_0_28px_rgba(251,113,133,0.32)]",
};
const violet = {
  hueDark: "text-violet-300",
  hueLight: "text-violet-700",
  glow: "shadow-[0_0_28px_rgba(196,181,253,0.30)]",
};
const moon = {
  hueDark: "text-indigo-200",
  hueLight: "text-indigo-700",
  glow: "shadow-[0_0_28px_rgba(165,180,252,0.30)]",
};

export const ROLE_VISUALS: Record<string, RoleVisual> = {
  // --- 레거시 ---
  citizen: { symbol: "circle", ...amber },
  doctor: { symbol: "cross", ...amber },
  police: { symbol: "shield", ...amber },
  helper: { symbol: "triangleDown", ...violet },

  // --- 악마 풀 ---
  demon: { symbol: "hornedBrand", ...rose, motif: "코셰이 + 루시퍼 — 낙인을 찍는 옛 신" },
  phantom: { symbol: "eclipse", ...rose, motif: "침묵의 밤 — 빛을 가리는 고리" },
  malen: { symbol: "twinSouls", ...rose, motif: "악령 마야 — 나란한 두 혼불" },

  // --- 조력자 풀 ---
  gain: { symbol: "veiledEye", ...violet, motif: "진실을 가리는 암흑 — 가려진 눈" },
  luna: { symbol: "crescentWell", ...moon, motif: "달빛이 비치는 우물" },
  logen: { symbol: "brokenPendant", ...violet, motif: "부서진 펜던트" },
  ellen: { symbol: "tiltedScale", ...violet, motif: "박해자 — 기울어진 저울" },

  // --- 천사 풀 ---
  romaz: { symbol: "badgeStar", ...amber, motif: "무죄추정의 원칙 — 경찰 배지" },
  rainer: { symbol: "tigerClaw", ...amber, motif: "수호신 백호 — 세 줄 발톱" },
  dordan: { symbol: "magnifier", ...amber, motif: "침착한 탐정" },
  habreterus: { symbol: "lifeCross", ...amber, motif: "히포크라테스 선서 — 빛을 담은 십자" },
  mizlet: { symbol: "dessertCup", ...amber, motif: "행복을 파는 가게" },
  helen: { symbol: "sleepStar", ...amber, motif: "황금빛 수면 — 잠든 별" },
  uno: { symbol: "banner", ...amber, motif: "군인의 사명 — 깃발" },
  arthur: { symbol: "emberBlade", ...amber, motif: "여명의 기사 — 잔불 대검 (해 ↔ 루나의 달)" },
  seika: { symbol: "supernova", ...amber, motif: "초신성 — 세야카에게 닿는 별빛" },
  luru: { symbol: "note", ...amber, motif: "아름다운 영혼을 위한 소나타" },

  // --- 중립 ---
  pasua: { symbol: "haloSun", hueDark: "text-white/80", hueLight: "text-[#5c4d3c]", glow: "shadow-[0_0_28px_rgba(255,255,255,0.22)]", motif: "구원자 — 후광" },
  rosanne: { symbol: "splitMask", hueDark: "text-white/70", hueLight: "text-[#5c4d3c]", glow: "shadow-[0_0_26px_rgba(255,255,255,0.18)]", motif: "백일몽 — 세헤라자드의 끝나지 않는 꿈" },
  converted: { symbol: "spiral", hueDark: "text-white/60", hueLight: "text-[#8a7a64]", glow: "shadow-[0_0_24px_rgba(255,255,255,0.14)]", motif: "전향 — 안으로 감기는 길" },
};

export function roleVisual(role?: string | null): RoleVisual | null {
  return role ? ROLE_VISUALS[role] ?? null : null;
}
