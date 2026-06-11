/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * PlayerInspectSheet — 다른 플레이어의 직업을 추리·메모하는 시트 (R3 준비, 스캐폴딩).
 *
 * 사용자 의도 (2026-06-11): 프로필을 롱프레스/우클릭하면 그 사람의 직업을 추측.
 * 1단계는 *로컬 메모*(내 화면 한정, 백엔드 0). 서버 집계(추리 정확도)는 후속.
 * 아직 페이즈에 연결되지 않은 준비물 — GameStage onInspect 가 이걸 열도록 배선만
 * 하면 즉시 동작한다.
 */

import { useState } from "react";
import { GOMDORI_ROLES } from "@/config/gomdori-roles";
import { SettingsSheet } from "@/components/game/ui/SettingsSheet";

// 추측 후보 — 배정 풀만(레거시·변환 산물 제외, 로비 직업 안내와 동일 기준).
const GUESSABLE = Object.entries(GOMDORI_ROLES).filter(
  ([id]) => !["citizen", "doctor", "police", "helper", "converted", "corrupted"].includes(id),
);

export function PlayerInspectSheet({
  open,
  onClose,
  name,
  avatarUrl,
  initialGuess,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  avatarUrl?: string | null;
  /** 이전에 저장한 추측(로컬). */
  initialGuess?: { role?: string; memo?: string };
  /** 저장 콜백 — 호출부가 로컬 맵에 보관(향후 활성). */
  onSave?: (guess: { role: string; memo: string }) => void;
}) {
  const [role, setRole] = useState(initialGuess?.role ?? "");
  const [memo, setMemo] = useState(initialGuess?.memo ?? "");

  return (
    <SettingsSheet open={open} onClose={onClose} title={`${name} — 직업 추측`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06] text-sm font-semibold text-white">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (name.trim()[0] ?? "?").toUpperCase()
          )}
        </span>
        <span className="text-sm text-white/70">이 사람의 정체를 추리해 메모하세요.</span>
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
          onSave?.({ role, memo });
          onClose();
        }}
        className="w-full rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
      >
        메모 저장
      </button>
      <p className="text-center text-[0.625rem] text-white/30">내 화면에만 보입니다 (로컬 메모).</p>
    </SettingsSheet>
  );
}
