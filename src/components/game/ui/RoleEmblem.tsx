/* eslint-disable @next/next/no-img-element */
/**
 * RoleEmblem — 직업 정체의 시각 단위 (심볼 토큰 + 일러스트 슬롯).
 *
 * 지금: 진영 색 광휘 링 안의 기하 심볼(RoleSymbol).
 * 나중: gomdori-role-visuals 의 `illustration` 경로가 채워지면 자동으로
 *        일러스트 렌더 — 호출부 무변경 (4번째 Task 슬롯 구조).
 */

import { RoleSymbol } from "@/components/game/ui/RoleSymbol";
import { roleVisual } from "@/config/gomdori-role-visuals";
import { FACTION_COLORS, type Mood } from "@/config/design-tokens";
import { roleMeta } from "@/config/gomdori-roles";

const SIZES = {
  sm: { ring: "h-9 w-9", icon: "h-5 w-5", img: 36 },
  md: { ring: "h-14 w-14", icon: "h-8 w-8", img: 56 },
  lg: { ring: "h-24 w-24", icon: "h-14 w-14", img: 96 },
} as const;

export function RoleEmblem({
  role,
  size = "md",
  mood = "dark",
  glow = false,
  className,
}: {
  role?: string | null;
  size?: keyof typeof SIZES;
  mood?: Mood;
  /** 광휘 — 정체 공개 같은 의미 순간에만 켠다. */
  glow?: boolean;
  className?: string;
}) {
  const visual = roleVisual(role);
  const s = SIZES[size];
  // 색은 진영 단일 출처(FACTION_COLORS)에서. 직업별 hue 를 손으로 박던 방식은
  // 같은 진영 안에서 표류했다(조력자=악마팀인데 루나만 달빛색, 나머지는 violet).
  // 심볼(모양)만 직업별로 유지하고, 색/광휘는 faction 으로 통일.
  const faction = (roleMeta(role ?? undefined)?.faction ?? "neutral") as keyof typeof FACTION_COLORS;
  const fc = FACTION_COLORS[faction] ?? FACTION_COLORS.neutral;
  const hue = mood === "light" ? fc.gemLight : fc.gemDark;
  const ringBase =
    mood === "light"
      ? "border-[#2b2118]/15 bg-white/60"
      : "border-white/15 bg-white/[0.05]";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border backdrop-blur-sm ${s.ring} ${ringBase} ${
        glow ? fc.glow : ""
      } ${hue} ${className ?? ""}`}
    >
      {visual?.illustration ? (
        <img
          src={visual.illustration}
          alt=""
          width={s.img}
          height={s.img}
          className="h-full w-full rounded-full object-cover"
        />
      ) : visual ? (
        <RoleSymbol id={visual.symbol} className={s.icon} />
      ) : (
        <span className="text-xs opacity-60">?</span>
      )}
    </span>
  );
}
