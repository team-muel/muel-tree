"use client";

/**
 * MyRolePanel — 하단 프로필 독을 펼쳤을 때 뜨는 "내 정체" 카드.
 *
 * 사용자 요구 (2026-06-11): Discord 하단 자기 프로필 차용 — 언제든 내 직업과
 * 그 능력·설명을 다시 읽는다. 데이터는 manifest(gomdori-roles) 한 곳에서.
 * 능동 능력은 night/extraNights, 패시브와 원본 능력 흐름은 표시 전용
 * manifest 필드(passive/abilitySummary)로 분리한다.
 */

import { FACTION_COLORS } from "@/config/design-tokens";
import { factionLabel, roleMeta, roleLabel } from "@/config/gomdori-roles";
import { RoleEmblem } from "@/components/game/ui/RoleEmblem";

export function MyRolePanel({
  role,
  faction,
  showAbilities = true,
}: {
  role: string;
  faction?: string;
  /**
   * false 면 능력 목록을 생략하고 정체 헤더만 — NightPhase 처럼 같은 패널 안에
   * *상호작용형* 능력 목록(같은 label·prompt)이 따로 있는 화면에서 같은 문자열이
   * 2회 반복되던 문제(2026-06-12)의 차단 스위치.
   */
  showAbilities?: boolean;
}) {
  const meta = roleMeta(role);
  const fac = (faction ?? meta?.faction ?? "neutral") as keyof typeof FACTION_COLORS;
  const color = FACTION_COLORS[fac] ?? FACTION_COLORS.neutral;
  const abilities = [meta?.night, ...(meta?.extraNights ?? [])].filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <RoleEmblem role={role} size="md" mood="dark" glow />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${color.primary}`}>{roleLabel(role)}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[0.625rem] ${color.border} ${color.bgSoft} ${color.accent}`}>
              {factionLabel(fac)}
            </span>
          </div>
          {meta?.title ? (
            <div className="mt-0.5 text-[0.6875rem] font-medium text-white/40">{meta.title}</div>
          ) : null}
          {meta?.reveal ? (
            <p className="mt-1 text-xs leading-5 text-white/55">{meta.reveal}</p>
          ) : null}
        </div>
      </div>

      {showAbilities ? (
      <div className="space-y-3">
        {meta?.passive ? (
          <section className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-[0.625rem] font-semibold uppercase tracking-widest text-white/35">
              패시브
            </div>
            <p className="mt-1 text-xs leading-5 text-white/55">{meta.passive}</p>
          </section>
        ) : null}

        {meta?.abilitySummary ? (
          <section className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-[0.625rem] font-semibold uppercase tracking-widest text-white/35">
              능력 요약
            </div>
            <p className="mt-1 text-xs leading-5 text-white/55">{meta.abilitySummary}</p>
          </section>
        ) : null}

        <div>
        <div className="text-[0.625rem] font-semibold uppercase tracking-widest text-white/35">
          밤에 누를 수 있는 능력
        </div>
        {abilities.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {abilities.map((a) => (
              <li
                key={a.actionType}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${color.accent}`}>{a.label}</span>
                  {a.self ? (
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[0.5rem] uppercase tracking-wider text-white/35">
                      자신
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-white/55">{a.prompt}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-white/45">
            밤 능동 능력이 없습니다. 토론·투표와 패시브로 마을에 기여하세요.
          </p>
        )}
        </div>
      </div>
      ) : null}
    </div>
  );
}
