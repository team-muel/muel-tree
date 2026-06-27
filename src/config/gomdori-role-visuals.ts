/**
 * Gomdori 직업 시각 매핑 — 직업 → 심볼·모티프의 single source.
 *
 * 프론트 전용 (backend sync 계약인 gomdori-roles.ts 와 분리).
 * 정본 모티프 출처: vault [[Universes/BoW/Lore/모티프-추적]] + 각 인물 카드.
 *
 * 구조 원칙 (4번째 Task, 2026-06-11 / 색 중앙화 2026-06-27):
 *  - 지금은 기하 심볼. `illustration` 슬롯이 차 있으면 일러스트로 자동 교체
 *    (추후 일러스트 제작 시 이 파일에 경로만 추가 — 컴포넌트 무변경).
 *  - 색·광휘는 여기서 정하지 않는다. 진영 단일 출처(design-tokens FACTION_COLORS)
 *    에서 RoleEmblem 이 직접 끌어온다 — 직업별 hue 를 손으로 박던 방식이 같은 진영
 *    안에서 표류(조력자=악마팀인데 루나만 달빛색)하던 문제를 구조적으로 제거.
 */

import type { RoleSymbolId } from "@/components/game/ui/RoleSymbol";

export interface RoleVisual {
  /** 기하 심볼 id — RoleSymbol 컴포넌트가 렌더. (색은 진영에서 — FACTION_COLORS) */
  symbol: RoleSymbolId;
  /** 모티프 한 줄 (도감·툴팁용). vault 정본 기반, 미확정은 표기하지 않음. */
  motif?: string;
  /** 일러스트 경로 (/public 기준). 채워지면 심볼 대신 렌더. */
  illustration?: string;
}

export const ROLE_VISUALS: Record<string, RoleVisual> = {
  // --- 레거시 ---
  citizen: { symbol: "circle" },
  doctor: { symbol: "cross" },
  police: { symbol: "shield" },
  helper: { symbol: "triangleDown" },

  // --- 악마 풀 ---
  demon: { symbol: "hornedBrand", motif: "코셰이 + 루시퍼 — 낙인을 찍는 옛 신" },
  phantom: { symbol: "eclipse", motif: "침묵의 밤 — 빛을 가리는 고리" },
  malen: { symbol: "twinSouls", motif: "악령 마야 — 나란한 두 혼불" },

  // --- 조력자 풀 (악마팀 → 색은 rose, FACTION_COLORS 에서) ---
  gain: { symbol: "veiledEye", motif: "진실을 가리는 암흑 — 가려진 눈" },
  luna: { symbol: "crescentWell", motif: "달빛이 비치는 우물" },
  logen: { symbol: "brokenPendant", motif: "부서진 펜던트" },
  ellen: { symbol: "tiltedScale", motif: "박해자 — 기울어진 저울" },

  // --- 천사 풀 ---
  romaz: { symbol: "badgeStar", motif: "무죄추정의 원칙 — 경찰 배지" },
  rainer: { symbol: "tigerClaw", motif: "수호신 백호 — 세 줄 발톱" },
  dordan: { symbol: "magnifier", motif: "침착한 탐정" },
  habreterus: { symbol: "lifeCross", motif: "히포크라테스 선서 — 빛을 담은 십자" },
  mizlet: { symbol: "dessertCup", motif: "행복을 파는 가게" },
  helen: { symbol: "sleepStar", motif: "황금빛 수면 — 잠든 별" },
  uno: { symbol: "banner", motif: "군인의 사명 — 깃발" },
  arthur: { symbol: "emberBlade", motif: "여명의 기사 — 잔불 대검 (해 ↔ 루나의 달)" },
  seika: { symbol: "supernova", motif: "초신성 — 세야카에게 닿는 별빛" },
  luru: { symbol: "note", motif: "아름다운 영혼을 위한 소나타" },

  // --- 중립 ---
  pasua: { symbol: "haloSun", motif: "구원자 — 후광" },
  rosanne: { symbol: "splitMask", motif: "백일몽 — 세헤라자드의 끝나지 않는 꿈" },
  converted: { symbol: "spiral", motif: "전향 — 안으로 감기는 길" },
};

export function roleVisual(role?: string | null): RoleVisual | null {
  return role ? ROLE_VISUALS[role] ?? null : null;
}
