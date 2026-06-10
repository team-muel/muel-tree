/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * PlayerToken — "캐릭터가 보이는 테이블"의 기본 단위 (Feign 경험 구조 차용).
 *
 * 아바타(있으면) 또는 이니셜 토큰 + 이름 + 상태(생존/사망/선택)를 하나의
 * 시각 단위로. 아침 명단·투표·의심·밤 능력 등 모든 대상 그리드가 이걸 쓴다.
 *
 * 모션 (2026-06-11): 입장 = fade+zoom, 죽음 = 쓰러짐(기울며 가라앉음 — transition,
 * alive 플래그가 뒤집히는 순간 자동 재생), 선택 = 광휘 전환. reduced-motion 존중.
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
  idleDelayMs,
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
  /** Feign식 idle 부유의 위상차(ms). 생존 토큰만 숨쉰다. undefined = 부유 없음. */
  idleDelayMs?: number;
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
  // 쓰러짐: 기울고(rotate) 살짝 가라앉으며(translate) 빛이 빠진다(grayscale).
  const deadFx = "motion-safe:rotate-12 motion-safe:translate-y-0.5 opacity-45 grayscale";

  const idleFloat = alive && idleDelayMs !== undefined;

  const body = (
    <>
      <span
        style={idleFloat ? { animationDelay: `${idleDelayMs}ms` } : undefined}
        className={`relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border text-base font-semibold backdrop-blur-sm transition-all duration-500 ${tokenBase} ${ink} ${
          selected ? selectedGlow : ""
        } ${!alive ? deadFx : ""} ${idleFloat ? "gomdori-stage-idle" : ""}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initialOf(name)
        )}
        {!alive ? (
          <span
            aria-hidden="true"
            className={`absolute inset-0 flex items-center justify-center text-lg motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 ${
              light ? "text-[#2b2118]/70" : "text-white/70"
            }`}
          >
            ✕
          </span>
        ) : null}
      </span>
      <span
        className={`block w-full truncate text-sm font-medium transition-colors duration-500 ${alive ? ink : inkFaint}`}
      >
        {name}
      </span>
      {sub ? <span className={`block text-[10px] uppercase tracking-wider ${inkFaint}`}>{sub}</span> : null}
    </>
  );

  const enter =
    "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300";

  if (!onClick) {
    return (
      <div
        className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-500 ${cardBase} ${enter}`}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-300 ${cardBase} ${enter} ${
        selected ? selectedGlow : ""
      } ${disabled && !selected ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {body}
    </button>
  );
}
