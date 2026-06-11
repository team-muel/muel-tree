"use client";

/**
 * RoleAssignPhase — 정체의 순간. 벨벳 어둠 위에 진영 광휘 + 직업 심볼(RoleEmblem)이
 * 처음 켜진다. 변종 선택(악마/조력자 풀)도 심볼 토큰으로 고른다.
 * 로직(변종 선택·selectRole·공개·같은 편) 동일, 시각 오버홀 (2026-06-11).
 */

import { useState } from "react";
import { Badge } from "@/components/game/ui/Badge";
import { Button } from "@/components/game/ui/Button";
import { Card } from "@/components/game/ui/Card";
import { FACTION_COLORS } from "@/config/design-tokens";
import { roleMeta } from "@/config/gomdori-roles";
import { RoleEmblem } from "@/components/game/ui/RoleEmblem";
import { selectRole, type PlayerSummary } from "@/lib/game/api";

type RoleAssignPhaseProps = {
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
  matchId: string;
  gameJwt: string | null;
};

type PendingSelection = { kind?: string; pool?: string[] };

const ROLE_COPY: Record<string, { label: string; detail: string }> = {
  citizen: { label: "시민", detail: "토론과 투표로 마을에 숨은 악마를 찾아내세요." },
  doctor: { label: "의사", detail: "밤마다 한 명을 치료해 악마의 공격을 막을 수 있습니다." },
  police: { label: "경찰", detail: "밤마다 한 명을 조사해 악마인지 확인할 수 있습니다." },
  demon: { label: "악마", detail: "밤마다 한 명을 습격하고, 낮에는 정체를 숨기세요." },
  helper: { label: "조력자", detail: "악마팀을 돕되, 당신의 정체는 끝까지 감추세요." },
  rainer: { label: "라이너", detail: "수호신 백호로 천사팀 카운트를 늘려 마을을 지킵니다. (밤 능동 능력 없음)" },
  romaz: { label: "로마즈", detail: "밤마다 용의자를 지목해 다음 투표에서 그 대상의 투표·의심 무게를 키웁니다." },
  gain: { label: "가인", detail: "악마를 살해·처형 1회로부터 보호하는 조력자. 정체를 감추세요." },
};

const FACTION_COPY = {
  angel: { label: "천사팀", mark: "A" },
  demon: { label: "악마팀", mark: "D" },
  helper: { label: "악마팀", mark: "D" },
  neutral: { label: "중립", mark: "N" },
} as const;

export function RoleAssignPhase({ players, myPlayer, events, matchId, gameJwt }: RoleAssignPhaseProps) {
  const roleEvent = events.find((e) => e.event_type === "role_assigned");
  const pending = roleEvent?.payload?.pendingSelection as PendingSelection | null | undefined;
  const pool = Array.isArray(pending?.pool) ? (pending!.pool as string[]) : null;

  const [picked, setPicked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 악마/조력자 슬롯 — 변종 선택 UI. 선택 전까지 직업 카드 대신 선택지를 보여준다.
  if (pool && pool.length > 0 && !done) {
    const kindLabel = pending?.kind === "demon" ? "악마" : "조력자";
    const tone = FACTION_COLORS.demon; // 악마/조력자 모두 악마팀 톤
    const submit = async () => {
      if (!picked || !gameJwt) return;
      setSubmitting(true);
      setError(null);
      try {
        await selectRole(matchId, picked, gameJwt);
        setDone(true);
      } catch {
        setError("선택을 저장하지 못했어. 다시 시도해줘.");
        setSubmitting(false);
      }
    };
    return (
      <div className="flex h-full w-full items-center justify-center overflow-y-auto p-5">
        <Card emphasis className={`w-full max-w-2xl p-8 ring-1 ${tone.border} ${tone.bgSoft} ${tone.ring} sm:p-10`}>
          <Badge className={`${tone.border} ${tone.bgSoft} ${tone.accent}`}>악마팀</Badge>
          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-white/45">당신은 {kindLabel}입니다</p>
          <h1 className={`mt-2 text-3xl font-bold sm:text-4xl ${tone.primary}`}>플레이할 {kindLabel}를 고르세요</h1>
          <p className="mt-3 text-sm text-white/60">시간이 끝나면 선택하지 않은 직업은 무작위로 정해집니다.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {pool.map((roleId) => {
              const meta = roleMeta(roleId);
              const active = picked === roleId;
              return (
                <button
                  key={roleId}
                  type="button"
                  onClick={() => setPicked(roleId)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    active
                      ? `${tone.border} ${tone.bgSoft} ring-1 ${tone.ring} ${tone.glow}`
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <RoleEmblem role={roleId} size="sm" mood="dark" glow={active} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className={`block text-base font-semibold ${active ? tone.primary : "text-white"}`}>
                      {meta?.label ?? roleId}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-white/55">{meta?.reveal ?? ""}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {error ? <p role="alert" className="mt-4 text-center text-sm text-rose-300">{error}</p> : null}
          <Button variant="primary" onClick={submit} disabled={!picked || submitting || !gameJwt} className="mt-6 w-full">
            {submitting ? "확정하는 중..." : picked ? `${roleMeta(picked)?.label ?? picked}로 확정` : "직업을 선택하세요"}
          </Button>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex h-full w-full items-center justify-center p-5">
        <Card emphasis className="w-full max-w-lg p-10 text-center">
          <RoleEmblem role={picked} size="lg" mood="dark" glow className="mx-auto" />
          <h1 className="mt-6 text-2xl font-semibold text-white">{roleMeta(picked)?.label ?? "직업"} 확정</h1>
          <p className="mt-4 text-sm text-white/55">다른 플레이어의 배정을 기다리는 중...</p>
        </Card>
      </div>
    );
  }

  const role = String(roleEvent?.payload?.role ?? myPlayer?.role ?? "");
  const faction = String(roleEvent?.payload?.faction ?? myPlayer?.faction ?? "neutral") as keyof typeof FACTION_COPY;
  const allies = roleEvent?.payload?.allies as Array<{user_id: string, role: string}> | undefined;
  const metaForRole = roleMeta(role);
  const roleCopy = ROLE_COPY[role] ??
    (metaForRole ? { label: metaForRole.label, detail: metaForRole.reveal } : { label: role || "확인 중...", detail: "직업 정보를 불러오고 있습니다." });
  const factionCopy = FACTION_COPY[faction] ?? FACTION_COPY.neutral;
  const factionColor = FACTION_COLORS[faction] ?? FACTION_COLORS.neutral;
  const allyRows = (allies ?? [])
    .map((ally) => ({
      ...ally,
      displayName: players.find((player) => player.userId === ally.user_id)?.displayName ?? "알 수 없음",
      roleLabel: ROLE_COPY[ally.role]?.label ?? roleMeta(ally.role)?.label ?? ally.role,
    }))
    .filter((ally) => ally.user_id !== myPlayer?.userId);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-5">
      <Card
        emphasis
        className={`gomdori-role-card relative w-full max-w-2xl overflow-hidden p-8 text-center ring-1 ${factionColor.border} ${factionColor.bgSoft} ${factionColor.ring} sm:p-10`}
      >
        <div className={`gomdori-role-burst absolute left-1/2 top-10 h-36 w-36 -translate-x-1/2 rounded-full blur-3xl ${factionColor.bgSoft}`} />
        <div className="relative">
          <Badge className={`${factionColor.border} ${factionColor.bgSoft} ${factionColor.accent}`}>
            <span aria-hidden="true" className="mr-2 font-mono text-[0.625rem]">{factionCopy.mark}</span>
            {factionCopy.label}
          </Badge>

          <div className="mt-8 flex justify-center">
            <RoleEmblem role={role} size="lg" mood="dark" glow className="gomdori-emblem-rise" />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-white/45">당신의 직업</p>
          <h1 className={`mt-3 text-5xl font-bold sm:text-6xl ${factionColor.primary}`} aria-live="polite">
            {roleCopy.label}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
            {roleCopy.detail}
          </p>

          {allyRows.length > 0 ? (
            <div className={`mt-8 rounded-xl border p-4 text-left ${factionColor.border} bg-black/20`}>
              <div className={`text-xs font-semibold uppercase tracking-widest ${factionColor.accent}`}>같은 편</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {allyRows.map((ally) => (
                  <div key={ally.user_id} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                    <RoleEmblem role={ally.role} size="sm" mood="dark" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{ally.displayName}</div>
                      <div className="text-xs text-white/45">{ally.roleLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
