"use client";

import { Badge } from "@/components/game/ui/Badge";
import { Card } from "@/components/game/ui/Card";
import { FACTION_COLORS } from "@/config/design-tokens";
import type { PlayerSummary } from "@/lib/game/api";

type RoleAssignPhaseProps = {
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>;
};

const ROLE_COPY: Record<string, { label: string; detail: string }> = {
  citizen: { label: "시민", detail: "토론과 투표로 마을에 숨은 악마를 찾아내세요." },
  doctor: { label: "의사", detail: "밤마다 한 명을 치료해 악마의 공격을 막을 수 있습니다." },
  police: { label: "경찰", detail: "밤마다 한 명을 조사해 악마인지 확인할 수 있습니다." },
  demon: { label: "악마", detail: "밤마다 한 명을 습격하고, 낮에는 정체를 숨기세요." },
  helper: { label: "조력자", detail: "악마팀을 돕되, 당신의 정체는 끝까지 감추세요." },
};

const FACTION_COPY = {
  angel: { label: "천사팀", mark: "A" },
  demon: { label: "악마팀", mark: "D" },
  helper: { label: "악마팀", mark: "D" },
  neutral: { label: "중립", mark: "N" },
} as const;

export function RoleAssignPhase({ players, myPlayer, events }: RoleAssignPhaseProps) {
  const roleEvent = events.find((e) => e.event_type === "role_assigned");
  const role = String(roleEvent?.payload?.role ?? myPlayer?.role ?? "");
  const faction = String(roleEvent?.payload?.faction ?? myPlayer?.faction ?? "neutral") as keyof typeof FACTION_COPY;
  const allies = roleEvent?.payload?.allies as Array<{user_id: string, role: string}> | undefined;
  const roleCopy = ROLE_COPY[role] ?? { label: role || "확인 중...", detail: "직업 정보를 불러오고 있습니다." };
  const factionCopy = FACTION_COPY[faction] ?? FACTION_COPY.neutral;
  const factionColor = FACTION_COLORS[faction] ?? FACTION_COLORS.neutral;
  const allyRows = (allies ?? [])
    .map((ally) => ({
      ...ally,
      displayName: players.find((player) => player.userId === ally.user_id)?.displayName ?? "알 수 없음",
      roleLabel: ROLE_COPY[ally.role]?.label ?? ally.role,
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
            <span aria-hidden="true" className="mr-2 font-mono text-[10px]">{factionCopy.mark}</span>
            {factionCopy.label}
          </Badge>

          <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-white/45">당신의 직업</p>
          <h1 className={`mt-3 text-5xl font-bold sm:text-6xl ${factionColor.primary}`} aria-live="polite">
            {roleCopy.label}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
            {roleCopy.detail}
          </p>

          {allyRows.length > 0 ? (
            <div className={`mt-8 rounded-lg border p-4 text-left ${factionColor.border} bg-black/20`}>
              <div className={`text-xs font-semibold uppercase tracking-widest ${factionColor.accent}`}>같은 편</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {allyRows.map((ally) => (
                  <div key={ally.user_id} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                    <div className="truncate text-sm font-medium text-white">{ally.displayName}</div>
                    <div className="mt-1 text-xs text-white/45">{ally.roleLabel}</div>
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
