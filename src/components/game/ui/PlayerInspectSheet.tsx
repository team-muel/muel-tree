/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * PlayerInspectSheet — 다른 플레이어의 정체를 추리·메모하는 시트 (R3).
 *
 * 사용자 의도 (2026-06-12): 프로필을 누르면 창이 올라오고, **진영과 직업을 둘 다**
 * 추측해 입력·저장. 저장은 로컬(useInspectGuesses, matchId 범위 localStorage).
 */

import { useEffect, useState } from "react";
import { ASSIGNABLE_ROLE_IDS, FACTION_LABELS, GOMDORI_ROLES } from "@/config/gomdori-roles";
import { SettingsSheet } from "@/components/game/ui/SettingsSheet";
import type { InspectGuess } from "@/lib/game/inspect";

// 추측 후보 직업 — 배정 풀만(레거시·변환 산물 제외, manifest 단일 출처).
const GUESSABLE = ASSIGNABLE_ROLE_IDS.map((id) => [id, GOMDORI_ROLES[id]] as const);

const FACTIONS: Array<{ id: string; label: string; cls: string }> = [
  { id: "angel", label: FACTION_LABELS.angel, cls: "border-amber-300/40 bg-amber-400/15 text-amber-200" },
  { id: "demon", label: FACTION_LABELS.demon, cls: "border-rose-300/40 bg-rose-400/15 text-rose-200" },
  { id: "neutral", label: FACTION_LABELS.neutral, cls: "border-violet-300/40 bg-violet-400/15 text-violet-200" },
];

export function PlayerInspectSheet({
  open,
  onClose,
  name,
  avatarUrl,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  avatarUrl?: string | null;
  /** 이전에 저장한 추측. */
  initial?: InspectGuess;
  /** 저장 — 호출부(useInspectGuesses.save)가 localStorage 에 보관. */
  onSave?: (guess: InspectGuess) => void;
}) {
  const [faction, setFaction] = useState(initial?.faction ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");

  // 대상이 바뀌어 열릴 때 그 대상의 기존 추측으로 동기화.
  useEffect(() => {
    if (open) {
      setFaction(initial?.faction ?? "");
      setRole(initial?.role ?? "");
      setMemo(initial?.memo ?? "");
    }
  }, [open, initial?.faction, initial?.role, initial?.memo]);

  return (
    <SettingsSheet open={open} onClose={onClose} title={`${name} — 정체 추측`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06] text-sm font-semibold text-white">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (name.trim()[0] ?? "?").toUpperCase()
          )}
        </span>
        <span className="text-sm text-white/70">이 사람의 진영과 직업을 추리해 메모하세요.</span>
      </div>

      <div>
        <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-white/35">
          추측 진영
        </span>
        <div className="mt-1.5 flex gap-2">
          {FACTIONS.map((f) => {
            const active = faction === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFaction(active ? "" : f.id)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                  active ? f.cls : "border-white/12 text-white/55 hover:bg-white/[0.06]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-white/35">
          추측 직업
        </span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-white/12 bg-black/30 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
        >
          <option value="">미정</option>
          {GUESSABLE.map(([id, r]) => (
            <option key={id} value={id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-white/35">
          메모
        </span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="근거·행동 패턴을 적어두세요"
          className="mt-1.5 w-full resize-none rounded-md border border-white/12 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={() => {
          onSave?.({ faction, role, memo });
          onClose();
        }}
        className="w-full rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
      >
        추측 저장
      </button>
      <p className="text-center text-[0.625rem] text-white/30">내 화면에만 저장됩니다 (로컬).</p>
    </SettingsSheet>
  );
}
