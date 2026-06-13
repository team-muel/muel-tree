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
import {
  cleanRoleReveal,
  roleNightAbilityLabels,
  RoleAbilityDetails,
} from "@/components/game/ui/RoleAbilityDetails";

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
  const [openRole, setOpenRole] = useState<string | null>(null);
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

      <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1 text-xs leading-5 text-white/65">
        {roles.map(([id, r]) => {
          const mine = highlightRole === id;
          const open = openRole === id;
          const nightLabels = roleNightAbilityLabels(id);
          const reveal = cleanRoleReveal(id);
          return (
            <li
              key={id}
              className={`rounded-lg border transition-colors ${
                open
                  ? "border-white/15 bg-white/[0.055]"
                  : mine
                    ? "border-white/10 bg-white/[0.035]"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenRole(open ? null : id)}
                className="flex w-full items-start gap-2 px-2.5 py-2 text-left"
              >
                <RoleEmblem role={id} size="sm" mood="dark" glow={open || mine} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className={`font-semibold ${tab.text}`}>{r.label}</span>
                    {mine ? <span className="text-[0.625rem] text-white/45">나</span> : null}
                    {r.title ? <span className="text-[0.6875rem] text-white/35">{r.title}</span> : null}
                  </span>
                  {reveal ? <span className="mt-0.5 block text-white/50">{reveal}</span> : null}
                  {nightLabels.length > 0 ? (
                    <span className="mt-1 block truncate text-[0.6875rem] text-white/35">
                      {nightLabels.join(" · ")}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 shrink-0 text-[0.625rem] text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
                >
                  ▲
                </span>
              </button>
              {open ? (
                <div className="border-t border-white/10 px-2.5 pb-2.5 pt-2">
                  <RoleAbilityDetails role={id} faction={r.faction} compact />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
