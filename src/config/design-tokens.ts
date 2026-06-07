/**
 * BoW 디자인 토큰 — 게임 UI 의 색·톤 single source.
 *
 * 페이즈 컴포넌트가 hard-coded Tailwind 색 대신 이 토큰을 참조.
 * 토큰 변경 시 *모든 페이즈*에 일관 반영.
 *
 * 2026-06-07 절제된 비주얼 리프레시: 타이포·레이아웃은 그대로 두고
 *  - 베이스를 순흑 → 심야 인디고-슬레이트로 (납작함↓ 깊이↑)
 *  - 진영색을 기본 Tailwind(red/amber/purple) → 톤다운(rose/amber-200/violet) 으로 (의미만)
 *  - 카드 표면을 반투명 흰 → 불투명 elevation + 상단 하이라이트 헤어라인 으로
 *
 * vault: [[Universes/BoW/Lore/모티프-추적]] (시각 어휘 1차 셋업)
 */

/**
 * 진영 색상 — angel / demon / helper / neutral.
 * Tailwind class 문자열로 정착. 각 진영의 primary·accent·bgSoft·border·ring.
 * 톤다운: 화면을 물들이지 않고 '의미'만 전달.
 */
export const FACTION_COLORS = {
  angel: {
    primary: "text-amber-50",
    accent: "text-amber-200",
    bgSoft: "bg-amber-950/30",
    border: "border-amber-400/20",
    ring: "ring-amber-300/40",
  },
  demon: {
    primary: "text-rose-50",
    accent: "text-rose-300",
    bgSoft: "bg-rose-950/30",
    border: "border-rose-400/20",
    ring: "ring-rose-300/40",
  },
  helper: {
    primary: "text-violet-50",
    accent: "text-violet-300",
    bgSoft: "bg-violet-950/30",
    border: "border-violet-400/20",
    ring: "ring-violet-300/40",
  },
  neutral: {
    primary: "text-white/80",
    accent: "text-white/45",
    bgSoft: "bg-white/[0.04]",
    border: "border-white/10",
    ring: "ring-white/25",
  },
} as const;

/**
 * 페이즈별 톤 — 화면 배경·강조색.
 * 페이즈 진입 시 톤이 바뀌어 *지금 어디인지* 의 시각 단서 제공.
 * 베이스는 순흑이 아니라 미묘하게 채도가 있는 심야색 — 빛(명도)으로 페이즈를 구분.
 */
export const PHASE_TONES = {
  lobby: { bg: "bg-[#0f0f17]", accent: "text-white/40" },
  role_assign: { bg: "bg-[#0e0c16]", accent: "text-amber-200/80" },
  night: { bg: "bg-[#070713]", accent: "text-indigo-300/80" },
  night_resolve: { bg: "bg-[#0a0a14]", accent: "text-white/40" },
  day: { bg: "bg-[#101019]", accent: "text-emerald-200/70" },
  vote: { bg: "bg-[#171320]", accent: "text-amber-200/70" },
  verdict: { bg: "bg-[#190e13]", accent: "text-rose-300/80" },
  ended: { bg: "bg-[#0f0f17]", accent: "text-white/50" },
} as const;

/**
 * 공통 surface 토큰 — 카드·강조 카드·상태 블록.
 * 반투명 흰 카드 대신 불투명 elevation + 상단 하이라이트(border-t 더 밝게)로 입체감.
 */
export const SURFACE = {
  card: "rounded-xl border border-white/10 border-t-white/20 bg-[#15131e] p-6",
  cardEmphasis: "rounded-xl border border-white/15 border-t-white/25 bg-[#1a1826] p-6 shadow-lg",
  statusBlock: "w-full max-w-md rounded-xl border border-white/10 border-t-white/20 bg-[#15131e] p-6 text-center",
} as const;

/**
 * 타이포 토큰. (폰트는 시스템 그대로 — 리프레시에서 타입은 변경하지 않음.)
 */
export const TEXT = {
  eyebrow: "text-xs font-semibold uppercase tracking-widest text-white/35",
  title: "text-xl font-semibold text-white",
  body: "text-sm leading-6 text-white/55",
  caption: "text-xs text-white/40",
} as const;
