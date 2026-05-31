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
    roleAssign: { key: "role_assign", label: "직업 배정", detail: "비밀리에 역할 전달", durationSec: 8 },
    night: { key: "night", label: "밤", detail: "악마·조력자·의사·경찰 능력 행사", durationSec: 60 },
    nightResolve: { key: "night_resolve", label: "밤 정리", detail: "능력 결과 처리", durationSec: 3 },
    day: { key: "day", label: "아침", detail: "사건 공개와 토론", durationSec: 180 },
    vote: { key: "vote", label: "투표", detail: "처형 후보 지목", durationSec: 60 },
    verdict: { key: "verdict", label: "판결", detail: "찬반으로 처형 확정", durationSec: 60 },
  },

  /**
   * 외부 안내 / 페이즈 흐름 표시용. internal phase 와는 살짝 다름
   * (lobby, ended 포함 / night_resolve 제외).
   */
  publicFlowSteps: [
    { key: "lobby", label: "로비", detail: "참가자가 모여 매치를 시작" },
    { key: "role_assign", label: "직업 배정", detail: "비밀리에 역할 전달" },
    { key: "night", label: "밤", detail: "악마·조력자·의사·경찰 능력 행사" },
    { key: "day", label: "아침", detail: "사건 공개와 토론" },
    { key: "vote", label: "투표", detail: "처형 후보 지목" },
    { key: "verdict", label: "판결", detail: "찬반으로 처형 확정" },
    { key: "ended", label: "결과", detail: "승리 진영과 직업 공개" },
  ],

  /**
   * 첫째 밤 (phase_number === 1) 룰.
   *
   * BoW Gomdori 마피아 규칙 (2026-05-31 결정):
   * - 직업 배정 → 첫 밤 → 아침. 첫 밤은 모든 능력 비활성.
   * - 이유: 시민 정보 누적 전에 첫 능력으로 게임 결판나는 것 방지.
   * - 첫 밤 duration 은 짧음 (안내성).
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
} as const;

export type GomdoriRules = typeof GOMDORI_RULES;
