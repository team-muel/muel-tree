"use client";

/**
 * RoleCodex — 직업 도감 (진영 탭 + 직업 목록).
 *
 * 단일 출처: gomdori-roles manifest. 로비 설정 안에만 묻혀 있던 도감을
 * 재사용 컴포넌트로 추출 (2026-06-12 직업 도입 경험 1차) — 로비 설정과
 * 인게임 프로필(StatusDock) 양쪽에서 같은 도감을 연다.
 */

import { useState } from "react";
import { ASSIGNABLE_ROLE_IDS, GOMDORI_ROLES } from "@/config/gomdori-roles";
import { RoleEmblem } from "@/components/game/ui/RoleEmblem";

const FACTION_TABS = [
  { id: "angel", label: "천사", active: "bg-amber-400/20 text-amber-200 border border-amber-300/30", text: "text-amber-200" },
  { id: "demon", label: "악마", active: "bg-rose-400/20 text-rose-200 border border-rose-300/30", text: "text-rose-200" },
  { id: "helper", label: "조력자", active: "bg-fuchsia-400/20 text-fuchsia-200 border border-fuchsia-300/30", text: "text-fuchsia-200" },
  { id: "neutral", label: "중립", active: "bg-violet-400/20 text-violet-200 border border-violet-300/30", text: "text-violet-200" },
] as const;

type CodexFaction = (typeof FACTION_TABS)[number]["id"];

export function RoleCodex({
  /** 처음 펼칠 진영 탭 — 내 직업의 진영을 넘기면 내 편 도감부터 열린다. */
  initialFaction = "angel",
  /** 강조할 직업 id (내 직업) — 목록에서 시각적으로 표시. */
  highlightRole,
}: {
  initialFaction?: string;
  highlightRole?: string | null;
}) {
  const safeInitial: CodexFaction = FACTION_TABS.some((f) => f.id === initialFaction)
    ? (initialFaction as CodexFaction)
    : "angel";
  const [faction, setFaction] = useState<CodexFaction>(safeInitial);
  const tab = FACTION_TABS.find((f) => f.id === faction) ?? FACTION_TABS[0];

  const roles = ASSIGNABLE_ROLE_IDS
    .map((id) => [id, GOMDORI_ROLES[id]] as const)
    .filter(([, r]) => (r.roster ?? r.faction) === faction);

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="mb-2 text-xs uppercase tracking-widest text-white/35">도감 (직업 안내)</div>

      <div className="mb-3 flex gap-1" role="tablist" aria-label="진영 선택">
        {FACTION_TABS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={faction === f.id}
            onClick={() => setFaction(f.id)}
            className={`flex-1 rounded py-1 text-xs font-bold transition-colors ${
              faction === f.id ? f.active : "border border-white/10 text-white/60 hover:bg-white/[0.04]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 text-xs leading-5 text-white/65">
        {roles.map(([id, r]) => {
          const mine = highlightRole === id;
          return (
            <li
              key={id}
              className={`flex items-start gap-2 border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0 ${
                mine ? "rounded-md bg-white/[0.05] px-1.5 pt-1" : ""
              }`}
            >
              <RoleEmblem role={id} size="sm" mood="dark" className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className={`font-semibold ${tab.text}`}>{r.label}</span>
                {mine ? <span className="ml-1.5 text-[0.625rem] text-white/45">— 나</span> : null}{" "}
                {r.title ? <span className="text-white/35">({r.title}) </span> : null}
                <span className="text-white/55">{r.reveal}</span>
                {r.passive ? (
                  <span className="mt-0.5 block text-[0.6875rem] text-white/45">
                    패시브: {r.passive}
                  </span>
                ) : null}
                {r.abilitySummary ? (
                  <span className="mt-0.5 block text-[0.6875rem] text-white/45">
                    요약: {r.abilitySummary}
                  </span>
                ) : null}
                {r.night ? (
                  <span className="mt-0.5 block text-[0.6875rem] text-white/40">
                    밤 능력: {r.night.label}
                    {(r.extraNights ?? []).length > 0
                      ? ` · ${(r.extraNights ?? []).map((a) => a.label).join(" · ")}`
                      : ""}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
