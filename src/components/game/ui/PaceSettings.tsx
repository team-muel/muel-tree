"use client";

/**
 * PaceSettings — 로비 사전 게임 설정의 "게임 시간" 묶음.
 * 하드코딩 대신 매니페스트 단일 출처(pace 프리셋 + clamp)에서 해소한다.
 *
 * 구조(사용자 결정 2026-06-16): 프리셋 + 고급 오버라이드.
 * - 프리셋: 빠르게/표준/느긋 한 번 탭(전 페이즈 일괄 스케일).
 * - 고급: 페이즈별 ± 미세조절(clamp 안전 구간 내). 오버라이드는 프리셋을 덮어쓴다.
 * - 미리보기: 호스트/참가자 모두 결과 시간을 본다(resolvePhaseDurations 동일 함수).
 * 비호스트는 읽기 전용. 변경은 match-settings(서버 정제) → matches realtime 으로 반영.
 */

import { useState } from "react";
import {
  GOMDORI_RULES,
  PACE_PRESETS,
  PACE_TUNABLE,
  PACE_PHASE_LABEL,
  formatDuration,
  paceClamp,
  readPaceSettings,
  resolvePhaseDurations,
  type PaceSettings as PaceModel,
  type PacePreset,
} from "@/config/gomdori-rules";
import { updateMatchSettings } from "@/lib/game/api";

type Props = {
  matchId: string | null;
  settings: Record<string, unknown>;
  isHost: boolean;
  gameJwt: string;
  onError: (msg: string) => void;
};

const PRESET_ORDER: PacePreset[] = ["blitz", "standard", "relaxed"];
const STEP = 5;

export function PaceSettings({ matchId, settings, isHost, gameJwt, onError }: Props) {
  const serverPace = readPaceSettings(settings);
  const [draft, setDraft] = useState<PaceModel>(serverPace);
  const [pending, setPending] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // 호스트는 로컬 편집(draft)을, 참가자는 서버값을 그대로 표시.
  const model = isHost ? draft : serverPace;
  const preset = model.preset ?? GOMDORI_RULES.pace.defaultPreset;
  const overrides = model.overrides ?? {};
  const hasOverrides = Object.keys(overrides).length > 0;

  // 미리보기는 backend 와 동일한 resolvePhaseDurations 로 해소(순수·저비용이라 매 렌더 계산).
  const durations = resolvePhaseDurations({ pace: { preset, overrides } });

  // 한 낮밤 사이클 체감 시간(밤+의심+아침+투표+판결) — 길이감 가늠용.
  const cycleSec =
    durations.night + durations.nightSuspect + durations.day + durations.vote + durations.verdict;

  async function push(next: PaceModel) {
    setDraft(next);
    if (!isHost || !matchId || !gameJwt || pending) return;
    setPending(true);
    try {
      const cleanOverrides: Record<string, number> = {};
      for (const [k, v] of Object.entries(next.overrides ?? {})) {
        if (typeof v === "number") cleanOverrides[k] = v;
      }
      await updateMatchSettings(
        matchId,
        { pace: { preset: next.preset, overrides: cleanOverrides } },
        gameJwt,
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "시간 설정 변경 실패");
    } finally {
      setPending(false);
    }
  }

  function choosePreset(p: PacePreset) {
    if (p === preset || pending) return;
    push({ preset: p, overrides });
  }

  function bump(key: string, dir: 1 | -1) {
    const clamp = paceClamp(key);
    const current = durations[key as keyof typeof durations];
    let next = current + dir * STEP;
    if (clamp) next = Math.min(clamp.max, Math.max(clamp.min, next));
    if (next === current) return;
    push({ preset, overrides: { ...overrides, [key]: next } });
  }

  function resetOverrides() {
    if (!hasOverrides || pending) return;
    push({ preset, overrides: {} });
  }

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-white/35">게임 시간</span>
        <span className="text-xs text-white/40">한 바퀴 ≈ {formatDuration(cycleSec)}</span>
      </div>

      {/* 프리셋 — 한 번 탭으로 전체 템포 */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm text-white/75">템포</span>
        {isHost ? (
          <div role="group" aria-label="게임 시간 템포" className="flex gap-1">
            {PRESET_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                disabled={!gameJwt || pending}
                aria-pressed={preset === p}
                onClick={() => choosePreset(p)}
                className={`rounded border px-2 py-0.5 text-xs transition-colors disabled:opacity-40 ${
                  preset === p
                    ? "border-sky-300/40 bg-sky-400/15 text-sky-200"
                    : "border-white/15 text-white/55 hover:bg-white/[0.08]"
                }`}
              >
                {PACE_PRESETS[p].label}
              </button>
            ))}
          </div>
        ) : (
          <span className="rounded border border-white/15 px-2 py-0.5 text-xs text-white/55">
            {PACE_PRESETS[preset].label}
            {hasOverrides ? " · 맞춤" : ""}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-white/35">
        {PACE_PRESETS[preset].detail}
        {isHost ? " · 토론이 길거나 짧아 불편하면 여기서 미리 정해요." : ""}
      </p>

      {/* 미리보기 — 결과 시간(호스트/참가자 공통) */}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {PACE_TUNABLE.map((key) => {
          const overridden = key in overrides;
          return (
            <div
              key={key}
              className={`rounded border px-2 py-1 ${
                overridden ? "border-sky-300/30 bg-sky-400/[0.06]" : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex items-center gap-1 text-[0.625rem] uppercase tracking-wide text-white/35">
                {PACE_PHASE_LABEL[key] ?? key}
                {overridden ? <span className="text-sky-300/80" aria-label="맞춤값">●</span> : null}
              </div>
              <div className="text-sm tabular-nums text-white/80">{formatDuration(durations[key])}</div>
            </div>
          );
        })}
      </div>

      {/* 고급 — 페이즈별 미세조절(호스트 전용) */}
      {isHost ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
            className="flex w-full items-center justify-between rounded border border-white/10 px-2 py-1.5 text-xs text-white/55 transition-colors hover:bg-white/[0.06]"
          >
            <span>세부 조절{hasOverrides ? ` · 맞춤 ${Object.keys(overrides).length}` : ""}</span>
            <span aria-hidden="true">{advancedOpen ? "▴" : "▾"}</span>
          </button>

          {advancedOpen ? (
            <div className="mt-2 space-y-1">
              {PACE_TUNABLE.map((key) => {
                const clamp = paceClamp(key);
                const value = durations[key];
                const overridden = key in overrides;
                return (
                  <div key={key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 text-white/70">
                      {PACE_PHASE_LABEL[key] ?? key}
                      {overridden ? <span className="text-[0.625rem] text-sky-300/80">맞춤</span> : null}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${PACE_PHASE_LABEL[key]} 줄이기`}
                        disabled={!gameJwt || pending || (clamp ? value <= clamp.min : false)}
                        onClick={() => bump(key, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-white/15 text-white/60 transition-colors hover:bg-white/[0.08] disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-16 text-center text-xs tabular-nums text-white/80">
                        {formatDuration(value)}
                      </span>
                      <button
                        type="button"
                        aria-label={`${PACE_PHASE_LABEL[key]} 늘리기`}
                        disabled={!gameJwt || pending || (clamp ? value >= clamp.max : false)}
                        onClick={() => bump(key, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-white/15 text-white/60 transition-colors hover:bg-white/[0.08] disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              {hasOverrides ? (
                <button
                  type="button"
                  onClick={resetOverrides}
                  disabled={pending}
                  className="mt-1 w-full rounded border border-white/10 px-2 py-1 text-xs text-white/45 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                >
                  프리셋 기준으로 초기화
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
