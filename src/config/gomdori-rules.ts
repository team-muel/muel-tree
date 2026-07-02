/**
 * Gomdori 마피아 룰 매니페스트 — frontend 측.
 *
 * backend (muel-bot/supabase/functions/_shared/gomdori-rules.ts) 와
 * 동일 형상으로 유지. 모노레포가 아니므로 한쪽 변경 시 다른 쪽 PR 동시 갱신.
 *
 * 관련:
 * - vault: [[Universes/BoW/Lore/Gomdori-마피아-규칙]]
 * - ADR-001 § 2 게임 진행 모델
 */

export const GOMDORI_RULES = {
  /**
   * 각 internal phase 의 기본 duration (초) + UI label/detail.
   * backend phase-advance 가 default 로 사용. 사용자 결정 시 매니페스트만 갱신.
   */
  phases: {
    // 30초 (2026-06-12, 8→30 — backend manifest 동기): 악마/조력자 변종 선택 창.
    roleAssign: { key: "role_assign", label: "준비 시간", detail: "비밀리에 역할 전달 · 악마/조력자는 변종 선택", durationSec: 12 },
    nightSuspect: { key: "night_suspect", label: "의심", detail: "의심 투표 — 최다 의심자는 그 밤 능력 불가", durationSec: 10 },
    // 상호추리(하브레터스↔악마) 전용 — 하브 생존 시에만 끼어드는 시스템 구간(페이스 고정).
    nightDeduce: { key: "night_deduce", label: "추리", detail: "하브레터스와 악마가 서로의 정체를 가늠", durationSec: 15 },
    night: { key: "night", label: "밤", detail: "악마와 능력자들이 밤 능력 행사", durationSec: 20 },
    nightResolve: { key: "night_resolve", label: "밤 정리", detail: "능력 결과 처리", durationSec: 3 },
    day: { key: "day", label: "아침", detail: "사건 공개와 토론", durationSec: 180 },
    vote: { key: "vote", label: "투표", detail: "처형 후보 지목", durationSec: 10 },
    verdict: { key: "verdict", label: "판결", detail: "찬반으로 처형 확정", durationSec: 60 },
  },

  /**
   * 페이스(게임 시간) — 사전 게임 설정에서 호스트가 정한다(하드코딩 아님).
   * backend(muel-bot _shared/gomdori-rules.ts) 와 동일 형상. settings.pace =
   * { preset?, overrides? } 를 resolvePhaseDurations 로 해소(단일 출처). 로비 미리보기와
   * backend phase-advance 가 같은 함수를 쓴다.
   * - tunablePhases: 사람이 체감하는 시간. roleAssign·nightResolve 는 시스템 구간(고정).
   * - presets[*].scale: tunable 기본 duration 에 곱하는 배수(5초 반올림). standard=1.0=기존.
   * - clamp[phase]: 스케일/오버라이드 결과를 강제하는 안전 구간 [min,max] 초.
   */
  pace: {
    // firstNight 은 능력 비활성 안내 구간 — 페이스 영향 받지 않는 시스템 페이즈.
    tunablePhases: ["nightSuspect", "night", "day", "vote", "verdict"],
    defaultPreset: "standard",
    presets: {
      blitz: { label: "빠르게", detail: "짧고 빠른 한 판", scale: 0.6 },
      standard: { label: "표준", detail: "기본 호흡", scale: 1.0 },
      relaxed: { label: "느긋", detail: "충분한 토론", scale: 1.6 },
    },
    clamp: {
      nightSuspect: { min: 5, max: 30 },
      night: { min: 15, max: 90 },
      day: { min: 60, max: 600 },
      vote: { min: 5, max: 30 },
      verdict: { min: 15, max: 120 },
    },
  },

  /**
   * 외부 안내 / 페이즈 흐름 표시용. internal phase 와는 살짝 다름
   * (lobby, ended 포함 / night_resolve 제외).
   */
  publicFlowSteps: [
    { key: "lobby", label: "로비", detail: "참가자가 모여 매치를 시작" },
    { key: "role_assign", label: "직업 배정", detail: "비밀리에 역할 전달" },
    { key: "night", label: "밤", detail: "악마와 능력자들이 밤 능력 행사" },
    { key: "day", label: "아침", detail: "사건 공개와 토론" },
    { key: "vote", label: "투표", detail: "처형 후보 지목" },
    { key: "verdict", label: "판결", detail: "찬반으로 처형 확정" },
    { key: "ended", label: "결과", detail: "승리 진영과 직업 공개" },
  ],

  /**
   * 첫째 밤 (phase_number === 1) 룰 — vault canon §34.
   *
   * 직업 배정 → silent first night (8초 안내) → 아침 → 밤 → ...
   * skipsAbilities=true: 정보 누적 전 첫 능력으로 결판나는 것 방지.
   * 페이스 설정과 무관(고정 8초). backend 매니페스트와 동기.
   */
  firstNight: {
    skipsAbilities: true,
    durationSec: 8,
    silentMessage: "첫 밤은 모두가 잠듭니다. 아침을 기다리세요.",
  },

  /**
   * 승리 조건.
   * - angels: 살아있는 악마 0명
   * - demons: 살아있는 악마 수 ≥ 살아있는 천사 수
   */
  winConditions: {
    angels: "aliveDemons === 0",
    demons: "aliveDemons >= aliveAngels",
  },

  /**
   * 인원 범위 — 원본 기준 8~12 (사용자 확정 2026-06-11: "5인 게임은 의도한 결과
   * 아님"). backend(match-start 검증) 동기. 로비 시작 조건·구성 미리보기·중립
   * 등장 자격(최소 인원과 동일)의 단일 출처. 중립 auto 등장 확률은 서버 전용
   * (muel-bot _shared/game.ts NEUTRAL_SPAWN_CHANCE) — 참여자는 존재를 알 수 없다.
   */
  playerCount: {
    min: 8,
    max: 12,
  },

  /**
   * 게임 길이 안전망 (M2-5 교착 방지). backend 동기.
   * maxDays 일차의 판결까지 승부가 나지 않으면 우세 판정(카운트 비교, 동률은
   * 악마 — canon §30)으로 종착. game_ended payload 에 timeout: true 가 실린다.
   */
  gameLength: {
    maxDays: 15,
  },
} as const;

export type GomdoriRules = typeof GOMDORI_RULES;

// --- 페이스(게임 시간) 해소 — backend/frontend 공용 순수 함수(동일 형상 유지) ---

export type PhaseDurationKey =
  | "roleAssign"
  | "nightSuspect"
  | "nightDeduce"
  | "night"
  | "nightResolve"
  | "day"
  | "vote"
  | "verdict"
  | "firstNight";

export type PhaseDurations = Record<PhaseDurationKey, number>;

export type PacePreset = keyof typeof GOMDORI_RULES.pace.presets;

export const PACE_PRESETS = GOMDORI_RULES.pace.presets;

// tunable 페이즈 + 표시 라벨(오버라이드 UI 용). roleAssign/nightResolve 는 제외(고정).
export const PACE_TUNABLE: readonly PhaseDurationKey[] =
  GOMDORI_RULES.pace.tunablePhases as readonly PhaseDurationKey[];

// 각 페이즈 기본 duration(초) — manifest 단일 출처에서 평탄화.
export const PACE_BASE_DURATIONS: PhaseDurations = {
  roleAssign: GOMDORI_RULES.phases.roleAssign.durationSec,
  nightSuspect: GOMDORI_RULES.phases.nightSuspect.durationSec,
  nightDeduce: GOMDORI_RULES.phases.nightDeduce.durationSec,
  night: GOMDORI_RULES.phases.night.durationSec,
  nightResolve: GOMDORI_RULES.phases.nightResolve.durationSec,
  day: GOMDORI_RULES.phases.day.durationSec,
  vote: GOMDORI_RULES.phases.vote.durationSec,
  verdict: GOMDORI_RULES.phases.verdict.durationSec,
  firstNight: GOMDORI_RULES.firstNight.durationSec,
};

// 오버라이드 슬라이더/표시용 페이즈 라벨(체감 시간 순). firstNight 은 silent 시스템
// 구간이라 페이스 슬라이더에 노출하지 않는다(vault canon §34).
export const PACE_PHASE_LABEL: Record<string, string> = {
  nightSuspect: "의심",
  night: "밤",
  day: "아침(토론)",
  vote: "투표",
  verdict: "판결",
};

export function paceClamp(key: string): { min: number; max: number } | null {
  return (GOMDORI_RULES.pace.clamp as Record<string, { min: number; max: number }>)[key] ?? null;
}

function round5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}

function clampPhaseDuration(key: string, value: number): number {
  const clamp = paceClamp(key);
  if (!clamp) return value;
  return Math.min(clamp.max, Math.max(clamp.min, value));
}

export function resolvePacePreset(settings: Record<string, unknown>): PacePreset {
  const pace = settings?.pace;
  const raw = pace && typeof pace === "object" ? (pace as { preset?: unknown }).preset : undefined;
  if (typeof raw === "string" && raw in GOMDORI_RULES.pace.presets) {
    return raw as PacePreset;
  }
  return GOMDORI_RULES.pace.defaultPreset;
}

/** settings 로부터 모든 페이즈의 실제 duration(초)을 해소(backend 와 동일 규칙). */
export function resolvePhaseDurations(settings: Record<string, unknown>): PhaseDurations {
  const preset = resolvePacePreset(settings);
  const scale = GOMDORI_RULES.pace.presets[preset].scale;
  const pace = settings?.pace && typeof settings.pace === "object"
    ? (settings.pace as { overrides?: unknown })
    : {};
  const overrides = pace.overrides && typeof pace.overrides === "object"
    ? (pace.overrides as Record<string, unknown>)
    : {};
  const tunable = GOMDORI_RULES.pace.tunablePhases as readonly string[];

  const out: PhaseDurations = { ...PACE_BASE_DURATIONS };
  for (const key of tunable) {
    const k = key as PhaseDurationKey;
    let value = round5(PACE_BASE_DURATIONS[k] * scale);
    const override = overrides[key];
    if (typeof override === "number" && Number.isFinite(override)) {
      value = Math.round(override);
    }
    out[k] = clampPhaseDuration(key, value);
  }
  return out;
}

export type PaceSettings = {
  preset?: PacePreset;
  overrides?: Partial<Record<string, number>>;
};

/** 로비 현재 settings 에서 pace 형상을 안전하게 읽어온다(UI 초기값). */
export function readPaceSettings(settings: Record<string, unknown>): PaceSettings {
  const out: PaceSettings = { preset: resolvePacePreset(settings) };
  const pace = settings?.pace && typeof settings.pace === "object"
    ? (settings.pace as { overrides?: unknown })
    : {};
  if (pace.overrides && typeof pace.overrides === "object") {
    const tunable = GOMDORI_RULES.pace.tunablePhases as readonly string[];
    const src = pace.overrides as Record<string, unknown>;
    const cleaned: Record<string, number> = {};
    for (const key of tunable) {
      const v = src[key];
      if (typeof v === "number" && Number.isFinite(v)) cleaned[key] = Math.round(v);
    }
    if (Object.keys(cleaned).length > 0) out.overrides = cleaned;
  }
  return out;
}

/** 사람이 읽는 시간 표기(예: 90 → "1분 30초", 45 → "45초"). */
export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}
