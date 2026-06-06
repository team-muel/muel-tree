"use client";

import { useEffect, useState } from "react";

/**
 * 페이즈 잔여 시간 카운트다운.
 *
 * 권위는 서버다. 서버 `mafia.match_phases.expected_ended_at` (pg_cron +
 * phase-advance 가 만료를 감지하는 바로 그 값) 까지 남은 초를 *표시만* 한다.
 * 종료/전환은 서버가 수행하므로 여기서 페이즈를 넘기지 않는다.
 */
export function PhaseTimer({
  expectedEndedAt,
  label,
}: {
  expectedEndedAt: string | null;
  label?: string;
}) {
  const target = expectedEndedAt ? Date.parse(expectedEndedAt) : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (Number.isNaN(target)) return null;

  const left = Math.max(0, Math.ceil((target - now) / 1000));
  const mm = Math.floor(left / 60);
  const ss = left % 60;
  const display = left <= 0 ? "곧 전환" : mm > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : `${ss}초`;
  const urgent = left > 0 && left <= 10;

  return (
    <div
      role="timer"
      aria-label={`${label ? label + " " : ""}남은 시간 ${left}초`}
      className={`pointer-events-none inline-flex select-none items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm tabular-nums shadow-lg backdrop-blur ${
        urgent
          ? "border-red-500/40 bg-red-950/50 text-red-200"
          : "border-white/15 bg-black/40 text-white/75"
      }`}
    >
      {label ? (
        <span className="text-[10px] uppercase tracking-widest opacity-60">{label}</span>
      ) : null}
      <span aria-hidden="true">{display}</span>
    </div>
  );
}
