"use client";

import { useMemo, useState } from "react";
import { FACTION_COLORS, GLOW, MOOD, PHASE_TONES, SURFACE } from "@/config/design-tokens";
import { GOMDORI_EVENT_COPY, type GomdoriEventCopy } from "@/config/gomdori-events";
import { ILLUSTRATIONS } from "@/config/illustrations";
import { roleVisual } from "@/config/gomdori-role-visuals";
import {
  GOMDORI_ORIGINAL_ABILITIES,
  GOMDORI_ROLES,
  roleArchetype,
  roleOriginalAbilities,
  type GomdoriNightAction,
  type GomdoriOriginalAbility,
} from "@/config/gomdori-roles";
import { formatDuration, GOMDORI_RULES, PACE_BASE_DURATIONS } from "@/config/gomdori-rules";
import { STATUS_EFFECTS } from "@/config/status-effects";
import { RoleEmblem } from "@/components/game/ui/RoleEmblem";

// 패시브는 "사용하는 능력"이 아니다 — 능력(사용)과 위계를 분리한다(로컬 캐논 구조).
const PASSIVE_ABILITY_KINDS: GomdoriOriginalAbility["kind"][] = ["패시브", "특수 패시브"];
const isPassiveAbilityKind = (kind: GomdoriOriginalAbility["kind"]): boolean => PASSIVE_ABILITY_KINDS.includes(kind);

const VIEW_TABS = [
  { id: "roles", label: "직업" },
  { id: "phases", label: "페이즈" },
  { id: "tokens", label: "토큰" },
  { id: "events", label: "이벤트" },
  { id: "status", label: "상태" },
] as const;

type InventoryView = (typeof VIEW_TABS)[number]["id"];

const ABILITY_STATUS = {
  live: { label: "게임 반영", cls: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" },
  partial: { label: "부분 반영", cls: "border-amber-300/25 bg-amber-400/10 text-amber-200" },
  planned: { label: "예정", cls: "border-white/15 bg-white/[0.04] text-white/45" },
} as const;

const PHASE_ROWS = [
  { key: "landing", label: "진입", detail: "Activity 진입 화면", duration: null },
  { key: "lobby", label: "로비", detail: "참가자가 모여 매치를 시작", duration: null },
  { key: "role_assign", label: "직업 배정", detail: GOMDORI_RULES.phases.roleAssign.detail, duration: PACE_BASE_DURATIONS.roleAssign },
  { key: "night_suspect", label: "의심", detail: GOMDORI_RULES.phases.nightSuspect.detail, duration: PACE_BASE_DURATIONS.nightSuspect },
  { key: "night", label: "밤", detail: GOMDORI_RULES.phases.night.detail, duration: PACE_BASE_DURATIONS.night },
  { key: "night_resolve", label: "밤 정리", detail: GOMDORI_RULES.phases.nightResolve.detail, duration: PACE_BASE_DURATIONS.nightResolve },
  { key: "day", label: "아침", detail: GOMDORI_RULES.phases.day.detail, duration: PACE_BASE_DURATIONS.day },
  { key: "vote", label: "투표", detail: GOMDORI_RULES.phases.vote.detail, duration: PACE_BASE_DURATIONS.vote },
  { key: "verdict", label: "판결", detail: GOMDORI_RULES.phases.verdict.detail, duration: PACE_BASE_DURATIONS.verdict },
  { key: "ended", label: "결과", detail: "승리 진영과 직업 공개", duration: null },
] as const;

const EVENT_SAMPLE_PAYLOAD: Record<string, Record<string, unknown>> = {
  player_died: { user_id: "p-simia" },
  player_revived: { user_id: "p-pin" },
  nightmare_death: { user_id: "p-simia" },
  eclipse_annihilation: { user_id: "p-simia" },
  player_eliminated: { user_id: "p-simia" },
  suspicion_revealed: { user_id: "p-pin" },
  vote_resolved: { candidateUserId: "p-simia" },
  verdict_resolved: { executed: true },
  role_revealed: { user_id: "p-pin", faction: "demon" },
  demons_revealed: { demons: ["p-simia", "p-eff"] },
  faction_changed: { new_faction: "demon" },
  disguise_toggled: { disguised: true },
  circle_contact: { user_id: "p-eff", expires_after_night: 2 },
  circle_notify: { user_id: "p-eff" },
  deduce_hit: { target: "p-simia" },
  deduce_miss: { target: "p-pin" },
};

const SAMPLE_NAMES: Record<string, string> = {
  "p-simia": "시미아",
  "p-pin": "핀",
  "p-eff": "에프",
};

function sampleName(id: unknown): string {
  if (typeof id !== "string") return "누군가";
  return SAMPLE_NAMES[id] ?? id;
}

function sampleEventLine(key: string, copy: GomdoriEventCopy): string {
  try {
    return copy.line(EVENT_SAMPLE_PAYLOAD[key] ?? {}, sampleName) ?? "표시 안 함";
  } catch {
    return "샘플 생성 실패";
  }
}

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

function abilityStatusCounts(abilities: GomdoriOriginalAbility[]) {
  return abilities.reduce(
    (acc, ability) => {
      if (ability.status === "live") acc.live += 1;
      else if (ability.status === "partial") acc.partial += 1;
      else if (ability.status === "planned") acc.planned += 1;
      else acc.unmarked += 1;
      return acc;
    },
    { live: 0, partial: 0, planned: 0, unmarked: 0 },
  );
}

function abilityStatusSummary(abilities: GomdoriOriginalAbility[]) {
  const counts = abilityStatusCounts(abilities);
  const parts = [
    counts.live ? `반영 ${counts.live}` : "",
    counts.partial ? `부분 ${counts.partial}` : "",
    counts.planned ? `예정 ${counts.planned}` : "",
    counts.unmarked ? `미표기 ${counts.unmarked}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "능력 없음";
}

function actionSummary(actions: GomdoriNightAction[]) {
  if (actions.length === 0) return "밤 능동 없음";
  return actions.map((action) => action.label).join(" · ");
}

function searchableRoleText(roleId: string): string {
  const meta = GOMDORI_ROLES[roleId];
  const visual = roleVisual(roleId);
  const abilities = roleOriginalAbilities(roleId);
  const actions = [meta?.night, ...(meta?.extraNights ?? [])].filter(Boolean) as GomdoriNightAction[];

  return normalize([
    roleId,
    meta?.label,
    meta?.title,
    meta?.faction,
    meta?.roster,
    meta?.reveal,
    meta?.passive,
    meta?.abilitySummary,
    roleArchetype(roleId),
    visual?.symbol,
    visual?.motif,
    actions.map((a) => `${a.actionType} ${a.label} ${a.prompt}`).join(" "),
    abilities.map((a) => `${a.kind} ${a.name} ${a.status ?? ""} ${a.actionType ?? ""} ${a.text}`).join(" "),
  ].join(" "));
}

function SourceList({ files }: { files: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5 text-[0.625rem] text-white/35">
      {files.map((file) => (
        <code key={file} className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono">
          {file}
        </code>
      ))}
    </div>
  );
}

function AbilityBadge({ status }: { status?: GomdoriOriginalAbility["status"] }) {
  if (!status || !ABILITY_STATUS[status]) return null;
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[0.625rem] font-semibold ${ABILITY_STATUS[status].cls}`}>
      {ABILITY_STATUS[status].label}
    </span>
  );
}

export function DesignInventory() {
  const [view, setView] = useState<InventoryView>("roles");
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());

  const roleRows = useMemo(
    () =>
      Object.keys(GOMDORI_ROLES).map((roleId) => {
        const meta = GOMDORI_ROLES[roleId];
        const visual = roleVisual(roleId);
        const abilities = roleOriginalAbilities(roleId);
        const actions = [meta.night, ...(meta.extraNights ?? [])].filter(Boolean) as GomdoriNightAction[];
        return {
          roleId,
          meta,
          visual,
          abilities,
          actions,
          group: meta.roster ?? meta.faction,
          archetype: roleArchetype(roleId),
          searchable: searchableRoleText(roleId),
        };
      }),
    [],
  );

  const filteredRoles = q ? roleRows.filter((row) => row.searchable.includes(q)) : roleRows;

  const phaseRows = PHASE_ROWS.filter((row) =>
    q
      ? normalize(`${row.key} ${row.label} ${row.detail} ${PHASE_TONES[row.key as keyof typeof PHASE_TONES]?.mood}`).includes(q)
      : true,
  );

  const eventRows = Object.entries(GOMDORI_EVENT_COPY)
    .map(([key, copy]) => ({ key, copy, sample: sampleEventLine(key, copy) }))
    .filter((row) => (q ? normalize(`${row.key} ${row.copy.audience} ${row.copy.tone} ${row.sample}`).includes(q) : true));

  const statusRows = Object.entries(STATUS_EFFECTS).filter(([key, effect]) =>
    q ? normalize(`${key} ${effect.label} ${effect.description} ${effect.badgeClass}`).includes(q) : true,
  );

  const tokenRows = [
    ...Object.entries(FACTION_COLORS).map(([key, value]) => ({
      group: "faction",
      key,
      primary: value.primary,
      secondary: value.accent,
      detail: `gemDark=${value.gemDark} gemLight=${value.gemLight}`,
      source: value.glow,
    })),
    ...Object.entries(MOOD).map(([key, value]) => ({
      group: "mood",
      key,
      primary: value.heading,
      secondary: value.body,
      detail: value.panel,
      source: value.chip,
    })),
    ...Object.entries(GLOW).map(([key, value]) => ({
      group: "glow",
      key,
      primary: value,
      secondary: "-",
      detail: "의미 순간 전용",
      source: "src/config/design-tokens.ts",
    })),
    ...Object.entries(SURFACE).map(([key, value]) => ({
      group: "surface",
      key,
      primary: value,
      secondary: "-",
      detail: "공통 표면",
      source: "src/config/design-tokens.ts",
    })),
    ...Object.entries(ILLUSTRATIONS).map(([key, value]) => ({
      group: "illustration",
      key,
      primary: value.src,
      secondary: value.tone,
      detail: `focal=${value.focal.x},${value.focal.y} edge=${value.edge ?? "fade-b"} alt=${value.alt}`,
      source: "src/config/illustrations.ts",
    })),
  ].filter((row) => (q ? normalize(`${row.group} ${row.key} ${row.primary} ${row.secondary} ${row.detail} ${row.source}`).includes(q) : true));

  const allAbilities = Object.values(GOMDORI_ORIGINAL_ABILITIES).flat();
  const allAbilityCounts = abilityStatusCounts(allAbilities);

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-black/25">
      <div className="border-b border-white/10 bg-white/[0.02] px-5 py-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-widest text-white/35">Design Inventory</div>
            <h2 className="mt-1 text-lg font-semibold text-white">프리뷰 디자인 테이블</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-white/55 sm:grid-cols-6">
            <div><span className="block text-white/30">직업</span>{roleRows.length}</div>
            <div><span className="block text-white/30">능력</span>{allAbilities.length}</div>
            <div><span className="block text-white/30">페이즈</span>{PHASE_ROWS.length}</div>
            <div><span className="block text-white/30">토큰</span>{Object.keys(FACTION_COLORS).length + Object.keys(MOOD).length + Object.keys(GLOW).length + Object.keys(SURFACE).length + Object.keys(ILLUSTRATIONS).length}</div>
            <div><span className="block text-white/30">이벤트</span>{Object.keys(GOMDORI_EVENT_COPY).length}</div>
            <div><span className="block text-white/30">상태</span>{Object.keys(STATUS_EFFECTS).length}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex w-fit overflow-hidden rounded-md border border-white/12 text-xs" role="tablist" aria-label="디자인 인벤토리">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={view === tab.id}
                onClick={() => setView(tab.id)}
                className={`px-3 py-1.5 transition-colors ${
                  view === tab.id ? "bg-white/12 text-white" : "text-white/50 hover:bg-white/[0.06] hover:text-white/75"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label className="min-w-0 flex-1 text-xs text-white/45">
            <span className="sr-only">디자인 인벤토리 검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="직업, action_type, 이벤트, 모티프, 상태 검색"
              className="w-full rounded-md border border-white/12 bg-black/35 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[0.625rem] text-white/40">
          <span className={`rounded-full border px-2 py-0.5 ${ABILITY_STATUS.live.cls}`}>반영 {allAbilityCounts.live}</span>
          <span className={`rounded-full border px-2 py-0.5 ${ABILITY_STATUS.partial.cls}`}>부분 {allAbilityCounts.partial}</span>
          <span className={`rounded-full border px-2 py-0.5 ${ABILITY_STATUS.planned.cls}`}>예정 {allAbilityCounts.planned}</span>
        </div>
      </div>

      {view === "roles" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-xs">
            <thead className="border-b border-white/10 text-[0.625rem] uppercase tracking-widest text-white/35">
              <tr>
                <th className="px-4 py-3 font-semibold">직업</th>
                <th className="px-4 py-3 font-semibold">그룹</th>
                <th className="px-4 py-3 font-semibold">역할</th>
                <th className="px-4 py-3 font-semibold">능동</th>
                <th className="px-4 py-3 font-semibold">구현</th>
                <th className="px-4 py-3 font-semibold">모티프</th>
                <th className="px-4 py-3 font-semibold">세부</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredRoles.map((row) => {
                const color = FACTION_COLORS[row.meta.roster ?? row.meta.faction] ?? FACTION_COLORS.neutral;
                return (
                  <tr key={row.roleId} className="align-top text-white/62">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <RoleEmblem role={row.roleId} size="sm" mood="dark" className="shrink-0" />
                        <div>
                          <div className={`font-semibold ${color.gemDark}`}>{row.meta.label}</div>
                          <div className="font-mono text-[0.625rem] text-white/35">{row.roleId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white/70">{row.group}</div>
                      <div className="text-[0.625rem] text-white/35">{row.meta.faction}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white/70">{row.archetype}</div>
                      {row.meta.title ? <div className="text-[0.625rem] text-white/35">{row.meta.title}</div> : null}
                    </td>
                    <td className="max-w-[13rem] px-4 py-3 text-white/55">{actionSummary(row.actions)}</td>
                    <td className="px-4 py-3 text-white/55">{abilityStatusSummary(row.abilities)}</td>
                    <td className="max-w-[13rem] px-4 py-3 text-white/50">{row.visual?.motif ?? row.visual?.symbol ?? "시각 미정"}</td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer select-none text-white/60 hover:text-white">보기</summary>
                        <div className="mt-3 max-w-xl space-y-3 text-white/55">
                          <div>
                            <div className="text-[0.625rem] uppercase tracking-widest text-white/35">Reveal</div>
                            <p className="mt-1 leading-5">{row.meta.reveal}</p>
                          </div>
                          {row.meta.passive ? (
                            <div>
                              <div className="text-[0.625rem] uppercase tracking-widest text-white/35">Passive</div>
                              <p className="mt-1 leading-5">{row.meta.passive}</p>
                            </div>
                          ) : null}
                          {row.meta.abilitySummary ? (
                            <div>
                              <div className="text-[0.625rem] uppercase tracking-widest text-white/35">Summary</div>
                              <p className="mt-1 leading-5">{row.meta.abilitySummary}</p>
                            </div>
                          ) : null}
                          <div>
                            <div className="text-[0.625rem] uppercase tracking-widest text-white/35">Visual</div>
                            <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-white/[0.04] px-2 py-1.5 font-mono text-[0.625rem] text-white/45">
                              <dt>symbol</dt><dd>{row.visual?.symbol ?? "-"}</dd>
                              <dt>색(진영)</dt><dd>{row.meta.faction} → {color.gemDark}</dd>
                              <dt>모티프</dt><dd className="break-all">{row.visual?.motif ?? "-"}</dd>
                              <dt>illustration</dt><dd>{row.visual?.illustration ?? "slot-empty"}</dd>
                            </dl>
                          </div>
                          {row.actions.length > 0 ? (
                            <div>
                              <div className="text-[0.625rem] uppercase tracking-widest text-white/35">Actions</div>
                              <ul className="mt-1 space-y-1.5">
                                {row.actions.map((action) => (
                                  <li key={action.actionType} className="rounded-md bg-white/[0.04] px-2 py-1.5">
                                    <span className="font-semibold text-white/70">{action.label}</span>{" "}
                                    <code className="font-mono text-white/35">{action.actionType}</code>
                                    <div className="mt-1 text-white/45">{action.prompt}</div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {row.abilities.some((a) => !isPassiveAbilityKind(a.kind)) ? (
                            <div>
                              <div className="text-[0.625rem] uppercase tracking-widest text-white/35">사용 능력 · 밤 발동</div>
                              <ul className="mt-1 space-y-1.5">
                                {row.abilities.filter((a) => !isPassiveAbilityKind(a.kind)).map((ability) => (
                                  <li key={`${ability.kind}-${ability.name}`} className="rounded-md bg-white/[0.04] px-2 py-1.5">
                                    <div className="flex flex-wrap items-baseline gap-1.5">
                                      <span className="text-[0.625rem] text-white/35">{ability.kind}</span>
                                      <span className="font-semibold text-white/75">{ability.name}</span>
                                      <AbilityBadge status={ability.status} />
                                      {ability.actionType ? <code className="font-mono text-white/35">{ability.actionType}</code> : null}
                                    </div>
                                    <p className="mt-1 leading-5 text-white/48">{ability.text}</p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {row.abilities.some((a) => isPassiveAbilityKind(a.kind)) ? (
                            <div>
                              <div className="text-[0.625rem] uppercase tracking-widest text-white/35">패시브 · 상시(사용 아님)</div>
                              <ul className="mt-1 space-y-1.5">
                                {row.abilities.filter((a) => isPassiveAbilityKind(a.kind)).map((ability) => (
                                  <li key={`${ability.kind}-${ability.name}`} className="rounded-md border border-dashed border-white/12 bg-white/[0.02] px-2 py-1.5">
                                    <div className="flex flex-wrap items-baseline gap-1.5">
                                      <span className="text-[0.625rem] text-white/35">{ability.kind}</span>
                                      <span className="font-medium text-white/65">{ability.name}</span>
                                      <AbilityBadge status={ability.status} />
                                      {ability.actionType ? <code className="font-mono text-white/35">{ability.actionType}</code> : null}
                                      {ability.actionType ? <span className="rounded-full border border-rose-300/30 bg-rose-400/10 px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-wider text-rose-200">패시브→슬롯</span> : null}
                                    </div>
                                    <p className="mt-1 leading-5 text-white/48">{ability.text}</p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          <SourceList files={["src/config/gomdori-roles.ts", "src/config/gomdori-role-visuals.ts"]} />
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {view === "phases" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="border-b border-white/10 text-[0.625rem] uppercase tracking-widest text-white/35">
              <tr>
                <th className="px-4 py-3 font-semibold">페이즈</th>
                <th className="px-4 py-3 font-semibold">무드</th>
                <th className="px-4 py-3 font-semibold">시간</th>
                <th className="px-4 py-3 font-semibold">강조</th>
                <th className="px-4 py-3 font-semibold">세부</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {phaseRows.map((row) => {
                const tone = PHASE_TONES[row.key as keyof typeof PHASE_TONES];
                return (
                  <tr key={row.key} className="align-top text-white/62">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white/80">{row.label}</div>
                      <code className="font-mono text-[0.625rem] text-white/35">{row.key}</code>
                    </td>
                    <td className="px-4 py-3">{tone?.mood ?? "dark"}</td>
                    <td className="px-4 py-3">{row.duration ? formatDuration(row.duration) : "-"}</td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-[0.625rem] text-white/45">{tone?.accent ?? "-"}</code>
                    </td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer select-none text-white/60 hover:text-white">보기</summary>
                        <div className="mt-3 max-w-xl space-y-2 text-white/55">
                          <p>{row.detail}</p>
                          <code className="block rounded-md bg-white/[0.04] px-2 py-1.5 font-mono text-[0.625rem] text-white/40">
                            {tone?.bg ?? "PHASE_TONES 미정"}
                          </code>
                          <SourceList files={["src/config/design-tokens.ts", "src/config/gomdori-rules.ts"]} />
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {view === "tokens" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead className="border-b border-white/10 text-[0.625rem] uppercase tracking-widest text-white/35">
              <tr>
                <th className="px-4 py-3 font-semibold">그룹</th>
                <th className="px-4 py-3 font-semibold">키</th>
                <th className="px-4 py-3 font-semibold">주 토큰</th>
                <th className="px-4 py-3 font-semibold">보조</th>
                <th className="px-4 py-3 font-semibold">세부</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {tokenRows.map((row) => (
                <tr key={`${row.group}-${row.key}`} className="align-top text-white/62">
                  <td className="px-4 py-3 text-white/70">{row.group}</td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-white/70">{row.key}</code>
                  </td>
                  <td className="max-w-[18rem] px-4 py-3">
                    <code className="font-mono text-[0.625rem] text-white/45">{row.primary}</code>
                  </td>
                  <td className="max-w-[14rem] px-4 py-3">
                    <code className="font-mono text-[0.625rem] text-white/45">{row.secondary}</code>
                  </td>
                  <td className="max-w-[22rem] px-4 py-3">
                    <code className="font-mono text-[0.625rem] text-white/40">{row.detail}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-white/10 px-4 py-3">
            <SourceList files={["src/config/design-tokens.ts", "src/config/illustrations.ts"]} />
          </div>
        </div>
      ) : null}

      {view === "events" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead className="border-b border-white/10 text-[0.625rem] uppercase tracking-widest text-white/35">
              <tr>
                <th className="px-4 py-3 font-semibold">이벤트</th>
                <th className="px-4 py-3 font-semibold">대상</th>
                <th className="px-4 py-3 font-semibold">톤</th>
                <th className="px-4 py-3 font-semibold">샘플</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {eventRows.map((row) => (
                <tr key={row.key} className="align-top text-white/62">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{row.copy.icon}</span>
                      <code className="font-mono text-white/70">{row.key}</code>
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.copy.audience}</td>
                  <td className="px-4 py-3">{row.copy.tone}</td>
                  <td className="px-4 py-3 text-white/55">{row.sample}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-white/10 px-4 py-3">
            <SourceList files={["src/config/gomdori-events.ts"]} />
          </div>
        </div>
      ) : null}

      {view === "status" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="border-b border-white/10 text-[0.625rem] uppercase tracking-widest text-white/35">
              <tr>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">설명</th>
                <th className="px-4 py-3 font-semibold">배지 토큰</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {statusRows.map(([key, effect]) => (
                <tr key={key} className="align-top text-white/62">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{effect.icon}</span>
                      <div>
                        <div className="font-semibold text-white/80">{effect.label}</div>
                        <code className="font-mono text-[0.625rem] text-white/35">{key}</code>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/55">{effect.description}</td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-[0.625rem] text-white/40">{effect.badgeClass}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-white/10 px-4 py-3">
            <SourceList files={["src/config/status-effects.ts"]} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
