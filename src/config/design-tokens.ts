/**
 * BoW 디자인 토큰 — 게임 UI 의 색·톤 single source.
 *
 * 페이즈 컴포넌트가 hard-coded Tailwind 색 대신 이 토큰을 참조.
 * 토큰 변경 시 *모든 페이즈*에 일관 반영.
 *
 * vault: [[Universes/BoW/Lore/모티프-추적]] (시각 어휘 1차 셋업)
 *
 * Phase 2 이후 확장 후보:
 * - 잔불 대검 푸른 불꽃 (특정 직업)
 * - 케오베 굿거리 (조선 무속)
 * - 시미아 인터스텔라 (블랙홀·중력·블루 라이트)
 * - 세이카·세야카 별빛 (디오스쿠로이)
 */

/**
 * 진영 색상 — angel / demon / helper / neutral.
 * Tailwind class 문자열로 정착. 각 진영의 primary·accent·bgSoft·border 4단.
 */
export const FACTION_COLORS = {
  angel: {
    primary: "text-amber-100",
    accent: "text-amber-300",
    bgSoft: "bg-amber-950/40",
    border: "border-amber-500/30",
    ring: "ring-amber-400/50",
  },
  demon: {
    primary: "text-red-100",
    accent: "text-red-300",
    bgSoft: "bg-red-950/40",
    border: "border-red-500/30",
    ring: "ring-red-400/50",
  },
  helper: {
    primary: "text-purple-100",
    accent: "text-purple-300",
    bgSoft: "bg-purple-950/40",
    border: "border-purple-500/30",
    ring: "ring-purple-400/50",
  },
  neutral: {
    primary: "text-white/80",
    accent: "text-white/50",
    bgSoft: "bg-white/[0.04]",
    border: "border-white/10",
    ring: "ring-white/30",
  },
} as const;

/**
 * 페이즈별 톤 — 화면 배경·강조색.
 * 페이즈 진입 시 화면 톤이 바뀌어 *지금 어디인지* 의 시각 단서 제공.
 */
export const PHASE_TONES = {
  lobby: { bg: "bg-[#11131a]", accent: "text-white/35" },
  role_assign: { bg: "bg-[#0a0a0a]", accent: "text-amber-300" },
  night: { bg: "bg-[#050514]", accent: "text-indigo-300" },
  night_resolve: { bg: "bg-[#080812]", accent: "text-white/35" },
  day: { bg: "bg-[#11131a]", accent: "text-emerald-300" },
  vote: { bg: "bg-[#1a1318]", accent: "text-orange-300" },
  verdict: { bg: "bg-[#1a0a0a]", accent: "text-red-300" },
  ended: { bg: "bg-[#11131a]", accent: "text-white/50" },
} as const;

/**
 * 공통 surface 토큰 — 카드·강조 카드·상태 블록.
 */
export const SURFACE = {
  card: "rounded-lg border border-white/10 bg-white/[0.04] p-6",
  cardEmphasis: "rounded-lg border border-white/20 bg-white/[0.06] p-6 shadow-lg",
  statusBlock: "w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center",
} as const;

/**
 * 타이포 토큰.
 */
export const TEXT = {
  eyebrow: "text-xs font-semibold uppercase tracking-widest text-white/35",
  title: "text-xl font-semibold text-white",
  body: "text-sm leading-6 text-white/55",
  caption: "text-xs text-white/40",
} as const;
