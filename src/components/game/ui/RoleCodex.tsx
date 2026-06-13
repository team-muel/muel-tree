"use client";

/**
 * RoleCodex — 직업 도감 (진영 탭 + 직업 목록).
 *
 * 단일 출처: gomdori-roles manifest. 로비 설정 안에만 묻혀 있던 도감을
 * 재사용 컴포넌트로 추출 (2026-06-12 직업 도입 경험 1차) — 로비 설정과
 * 인게임 프로필(StatusDock) 양쪽에서 같은 도감을 연다.
 */

import { useState } from "react";
import { ASSIGNABLE_ROLE_IDS, GOMDORI_ROLES, roleArchetype } from "@/config/gomdori-roles";
import { RoleEmblem } from "@/components/game/ui/RoleEmblem";
import { cleanRoleReveal, RoleAbilityDetails } from "@/components/game/ui/RoleAbilityDetails";

const FACTION_TABS = [
  { id: "angel", label: "천사", active: "border-amber-200 text-amber-200", text: "text-amber-200" },
  { id: "demon", label: "악마", active: "border-rose-200 text-rose-200", text: "text-rose-200" },
  { id: "helper", label: "조력자", active: "border-fuchsia-200 text-fuchsia-200", text: "text-fuchsia-200" },
  { id: "neutral", label: "중립", active: "border-violet-200 text-violet-200", text: "text-violet-200" },
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
    <div className="bg-black/15 p-3">
      <div className="mb-2 text-xs uppercase tracking-widest text-white/35">도감 (직업 안내)</div>

      <div className="mb-3 flex gap-3 border-b border-white/10" role="tablist" aria-label="진영 선택">
        {FACTION_TABS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={faction === f.id}
            onClick={() => setFaction(f.id)}
            className={`flex-1 border-b px-1 pb-2 text-xs font-bold transition-colors ${
              faction === f.id ? f.active : "border-transparent text-white/45 hover:text-white/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="max-h-[60vh] divide-y divide-white/10 overflow-y-auto pr-1 text-xs leading-5 text-white/65">
        {roles.map(([id, r]) => {
          const mine = highlightRole === id;
          const open = openRole === id;
          const reveal = cleanRoleReveal(id);
          const archetype = roleArchetype(id);
          return (
            <li
              key={id}
              className={`transition-colors ${open || mine ? "bg-white/[0.035]" : "hover:bg-white/[0.03]"}`}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenRole(open ? null : id)}
                className="flex w-full items-start gap-2 px-1.5 py-2.5 text-left"
              >
                <RoleEmblem role={id} size="sm" mood="dark" glow={open || mine} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className={`font-semibold ${tab.text}`}>{r.label}</span>
                    {mine ? <span className="text-[0.625rem] text-white/45">나</span> : null}
                    {r.title ? <span className="text-[0.6875rem] text-white/35">{r.title}</span> : null}
                  </span>
                  {reveal ? <span className="mt-0.5 block text-white/50">{reveal}</span> : null}
                  <span className={`mt-1 block text-[0.6875rem] font-semibold ${tab.text}`}>{archetype}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 shrink-0 text-[0.625rem] text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
                >
                  ▲
                </span>
              </button>
              {open ? (
                <div className="border-t border-white/10 px-1.5 pb-2.5 pt-2">
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
