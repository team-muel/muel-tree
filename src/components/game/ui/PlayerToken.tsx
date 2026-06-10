/* eslint-disable @next/next/no-img-element */
/**
 * PlayerToken — "캐릭터가 보이는 테이블"의 기본 단위 (Feign 경험 구조 차용).
 *
 * 아바타(있으면) 또는 이니셜 토큰 + 이름 + 상태(생존/사망/선택)를 하나의
 * 시각 단위로. 아침 명단·투표·의심 등 모든 대상 그리드가 이걸 쓴다.
 *
 * 무드 인지: light(아침/투표 무대)에서는 어두운 잉크, dark(밤)에서는 흰 잉크.
 * 선택 광휘는 GLOW 토큰 — 의미 순간에만 빛.
 */

import type { Mood } from "@/config/design-tokens";

function initialOf(name: string): string {
  const t = name.trim();
  return t ? Array.from(t)[0].toUpperCase() : "?";
}

export function PlayerToken({
  name,
  avatarUrl,
  alive = true,
  selected = false,
  selectedGlow = "ring-2 ring-amber-300/70 shadow-[0_0_24px_rgba(252,211,77,0.35)]",
  disabled = false,
  mood = "dark",
  sub,
  onClick,
}: {
  name: string;
  avatarUrl?: string | null;
  alive?: boolean;
  selected?: boolean;
  /** 선택 시 광휘 클래스 (GLOW.select* 토큰 주입). */
  selectedGlow?: string;
  disabled?: boolean;
  mood?: Mood;
  /** 토큰 아래 보조 라벨 (직업·상태 등). */
  sub?: React.ReactNode;
  onClick?: () => void;
}) {
  const light = mood === "light";
  const ink = light ? "text-[#2b2118]" : "text-white";
  const inkFaint = light ? "text-[#8a7a64]" : "text-white/40";
  const tokenBase = light
    ? "border-[#2b2118]/15 bg-white/65"
    : "border-white/15 bg-white/[0.06]";
  const cardBase = light
    ? "border-[#2b2118]/10 bg-white/45 hover:bg-white/65"
    : "border-white/10 bg-black/20 hover:bg-white/[0.06]";
  const deadFx = "opacity-45 grayscale";

  const body = (
    <>
      <span
        className={`relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border text-base font-semibold backdrop-blur-sm transition-shadow ${tokenBase} ${ink} ${
          selected ? selectedGlow : ""
        } ${!alive ? deadFx : ""}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initialOf(name)
        )}
        {!alive ? (
          <span
            aria-hidden="true"
            className={`absolute inset-0 flex items-center justify-center text-lg ${light ? "text-[#2b2118]/70" : "text-white/70"}`}
          >
            ✕
          </span>
        ) : null}
      </span>
      <span className={`block w-full truncate text-sm font-medium ${alive ? ink : inkFaint}`}>
        {name}
      </span>
      {sub ? <span className={`block text-[10px] uppercase tracking-wider ${inkFaint}`}>{sub}</span> : null}
    </>
  );

  if (!onClick) {
    return (
      <div className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${cardBase}`}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition ${cardBase} ${
        selected ? selectedGlow : ""
      } ${disabled && !selected ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {body}
    </button>
  );
}
