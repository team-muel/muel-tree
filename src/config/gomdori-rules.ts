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
    nightSuspect: { key: "night_suspect", label: "의심", detail: "의심 투표 — 최다 의심자는 그 밤 능력 불가", durationSec: 30 },
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
