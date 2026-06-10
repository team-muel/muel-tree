/**
 * BoW 디자인 토큰 — 게임 UI 의 색·톤·재질 single source.
 *
 * 페이즈 컴포넌트가 hard-coded Tailwind 색 대신 이 토큰을 참조.
 * 토큰 변경 시 *모든 페이즈*에 일관 반영.
 *
 * 2026-06-11 비주얼 오버홀 — "낮↔밤 이중 무드 + 광휘 텍스처" (4번째 Task):
 *  - 페이즈가 무드(light/dark)를 가진다. 낮·투표 = 밝고 따뜻한 무대,
 *    밤·판결 = 심야. 페이즈 전환이 공간 자체를 뒤집는 연출.
 *  - 재질 = 빛·광휘(유리/글로우). 광휘 = 마력이라는 정본(vault [[광휘와-대천사]])과
 *    직결 — 어둠 위에 빛이 서는 화면.
 *  - 진영색에 glow(광휘 그림자)와 무드별 gem(가독 강조색) 추가.
 *  - 게임 경험 레퍼런스: Feign (캐릭터가 보이는 테이블 / 페이즈 전환의 무대 감각).
 *    아트 스타일 차용 없음 — 경험 구조만.
 *
 * 문서: muel-tree/docs/gomdori-activity-design-language.md
 * vault: [[Universes/BoW/Lore/모티프-추적]] (시각 어휘)
 */

export type Mood = "light" | "dark";

/**
 * 무드별 잉크/표면 — 컴포넌트가 무드에 맞는 텍스트·패널을 고르는 단일 출처.
 * light 무드에서 흰 글자를 쓰는 사고를 토큰 차원에서 차단.
 */
export const MOOD = {
  light: {
    heading: "text-[#2b2118]",
    body: "text-[#5c4d3c]",
    faint: "text-[#8a7a64]",
    hairline: "border-[#2b2118]/10",
    panel:
      "rounded-2xl border border-[#2b2118]/10 bg-white/55 backdrop-blur-md shadow-[0_8px_30px_rgba(80,60,20,0.10)]",
    panelStrong:
      "rounded-2xl border border-[#2b2118]/15 bg-white/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(80,60,20,0.14)]",
    chip: "border border-[#2b2118]/15 bg-white/60 text-[#5c4d3c]",
  },
  dark: {
    heading: "text-white",
    body: "text-white/60",
    faint: "text-white/40",
    hairline: "border-white/10",
    panel:
      "rounded-2xl border border-white/10 border-t-white/20 bg-white/[0.05] backdrop-blur-md",
    panelStrong:
      "rounded-2xl border border-white/15 border-t-white/25 bg-[#171425]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(99,102,241,0.10)]",
    chip: "border border-white/15 bg-white/[0.06] text-white/70",
  },
} as const;

/**
 * 진영 색상 — angel / demon / helper / neutral.
 * 기존 키(primary·accent·bgSoft·border·ring) 유지 + 오버홀 추가:
 *  - glow: 광휘 그림자(어둠 위에 빛). 선택/강조 순간에만.
 *  - gemDark / gemLight: 무드별 가독 강조색(라벨·심볼용).
 */
export const FACTION_COLORS = {
  angel: {
    primary: "text-amber-50",
    accent: "text-amber-200",
    bgSoft: "bg-amber-950/30",
    border: "border-amber-400/20",
    ring: "ring-amber-300/40",
    glow: "shadow-[0_0_32px_rgba(252,211,77,0.28)]",
    gemDark: "text-amber-200",
    gemLight: "text-amber-700",
  },
  demon: {
    primary: "text-rose-50",
    accent: "text-rose-300",
    bgSoft: "bg-rose-950/30",
    border: "border-rose-400/20",
    ring: "ring-rose-300/40",
    glow: "shadow-[0_0_32px_rgba(251,113,133,0.30)]",
    gemDark: "text-rose-300",
    gemLight: "text-rose-700",
  },
  helper: {
    primary: "text-violet-50",
    accent: "text-violet-300",
    bgSoft: "bg-violet-950/30",
    border: "border-violet-400/20",
    ring: "ring-violet-300/40",
    glow: "shadow-[0_0_32px_rgba(196,181,253,0.28)]",
    gemDark: "text-violet-300",
    gemLight: "text-violet-700",
  },
  neutral: {
    primary: "text-white/80",
    accent: "text-white/45",
    bgSoft: "bg-white/[0.04]",
    border: "border-white/10",
    ring: "ring-white/25",
    glow: "shadow-[0_0_32px_rgba(255,255,255,0.18)]",
    gemDark: "text-white/70",
    gemLight: "text-[#5c4d3c]",
  },
} as const;

/**
 * 페이즈별 톤 — 배경·강조·무드.
 * 이중 무드: 아침(day)·투표(vote)는 밝고 따뜻한 무대로 *공간이 뒤집힌다*.
 * 밤 계열은 심야 — 깊을수록 빛(광휘)이 잘 선다.
 * bg 는 GameFrame(main)에 적용되는 클래스 문자열 (그라디언트 포함).
 */
export const PHASE_TONES = {
  lobby: {
    bg: "bg-gradient-to-b from-[#121019] via-[#0f0d16] to-[#0b0a11]",
    accent: "text-white/40",
    mood: "dark",
  },
  role_assign: {
    bg: "bg-gradient-to-b from-[#0e0c16] via-[#0b0915] to-[#070610]",
    accent: "text-amber-200/80",
    mood: "dark",
  },
  night: {
    bg: "bg-gradient-to-b from-[#070713] via-[#0a0a18] to-[#05050d]",
    accent: "text-indigo-300/80",
    mood: "dark",
  },
  night_suspect: {
    bg: "bg-gradient-to-b from-[#080816] via-[#0b0a1c] to-[#06060f]",
    accent: "text-indigo-300/80",
    mood: "dark",
  },
  night_resolve: {
    bg: "bg-gradient-to-b from-[#0a0a14] to-[#07070f]",
    accent: "text-white/40",
    mood: "dark",
  },
  day: {
    bg: "bg-gradient-to-b from-[#f7f1e3] via-[#f3ead7] to-[#e7d9bf]",
    accent: "text-amber-700",
    mood: "light",
  },
  vote: {
    bg: "bg-gradient-to-b from-[#f3e3c2] via-[#eccfa4] to-[#d8af80]",
    accent: "text-amber-800",
    mood: "light",
  },
  verdict: {
    bg: "bg-gradient-to-b from-[#1a0d12] via-[#150a0e] to-[#0c0608]",
    accent: "text-rose-300/80",
    mood: "dark",
  },
  ended: {
    bg: "bg-gradient-to-b from-[#0d0b14] via-[#120f1c] to-[#080711]",
    accent: "text-white/50",
    mood: "dark",
  },
} as const;

export function phaseMood(status?: string | null): Mood {
  if (!status) return "dark";
  const tone = PHASE_TONES[status as keyof typeof PHASE_TONES];
  return (tone?.mood ?? "dark") as Mood;
}

/**
 * 공통 surface 토큰 — 카드·강조 카드·상태 블록. (기존 키 유지 — dark 무드 기준.)
 * 유리 재질: 반투명 + blur + 상단 하이라이트 헤어라인. 광휘는 GLOW 로 얹는다.
 */
export const SURFACE = {
  card: "rounded-2xl border border-white/10 border-t-white/20 bg-[#15131e]/90 backdrop-blur-md p-6",
  cardEmphasis:
    "rounded-2xl border border-white/15 border-t-white/25 bg-[#1a1826]/90 backdrop-blur-xl p-6 shadow-[0_0_44px_rgba(99,102,241,0.10)]",
  statusBlock:
    "w-full max-w-md rounded-2xl border border-white/10 border-t-white/20 bg-[#15131e]/90 backdrop-blur-md p-6 text-center",
} as const;

/**
 * 광휘(글로우) 토큰 — "어둠 위에 빛이 선다".
 * 모든 상시 요소에 쓰지 말 것: 선택·정체·죽음 같은 *의미 순간*에만.
 */
export const GLOW = {
  selectAngel: "ring-2 ring-amber-300/70 shadow-[0_0_24px_rgba(252,211,77,0.35)]",
  selectDusk: "ring-2 ring-amber-500/70 shadow-[0_0_24px_rgba(180,120,40,0.45)]",
  selectNight: "ring-2 ring-indigo-300/70 shadow-[0_0_24px_rgba(165,180,252,0.35)]",
  ember: "shadow-[0_0_36px_rgba(244,63,94,0.30)]",
  halo: "shadow-[0_0_48px_rgba(255,255,255,0.16)]",
} as const;

/**
 * 타이포 토큰. (폰트는 시스템 그대로 — 타입 변경은 후속 라운드.)
 */
export const TEXT = {
  eyebrow: "text-xs font-semibold uppercase tracking-widest text-white/35",
  title: "text-xl font-semibold text-white",
  body: "text-sm leading-6 text-white/55",
  caption: "text-xs text-white/40",
} as const;
