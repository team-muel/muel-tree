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

import { useRef } from "react";
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
  pickable = false,
  disabled = false,
  mood = "dark",
  sub,
  onClick,
  onInspect,
  idleDelayMs,
  chrome = true,
}: {
  name: string;
  avatarUrl?: string | null;
  alive?: boolean;
  selected?: boolean;
  /** 선택 시 광휘 클래스 (GLOW.select* 토큰 주입). */
  selectedGlow?: string;
  /** 지목 가능한 대상 — 클릭 가능함을 드러내는 어포던스(테두리·호버 리프트). */
  pickable?: boolean;
  disabled?: boolean;
  mood?: Mood;
  /** 토큰 아래 보조 라벨 (직업·상태 등). */
  sub?: React.ReactNode;
  onClick?: () => void;
  /**
   * 보조 인터랙션(R3 준비) — 롱프레스/우클릭으로 발화. onClick(지목)과 채널 분리.
   * 직업 추측 시트를 여는 자리. 지금은 호출부가 주입하지 않아 비활성(스캐폴딩).
   */
  onInspect?: () => void;
  /** Feign식 idle 부유의 위상차(ms). 생존 토큰만 숨쉰다. undefined = 부유 없음. */
  idleDelayMs?: number;
  /**
   * false 면 카드 테두리·배경 없이 아바타+이름만 — 무대 바닥에 "서 있는"
   * Feign 식 캐릭터 표현 (로비·랜딩의 배회 무대용). 지목 무대는 true(카드) 유지.
   */
  chrome?: boolean;
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
  // 지목 어포던스: "이건 누를 수 있다" — 상시 링 + 호버 리프트. 흰 글자만 떠
  // 무엇을 클릭할지 모르던 문제(2026-06-11)를 색이 아니라 형태로 해결.
  const pickFx = light
    ? "ring-1 ring-[#2b2118]/20 hover:-translate-y-0.5 hover:bg-white/75 hover:ring-[#2b2118]/45 hover:shadow-[0_10px_24px_rgba(80,60,20,0.18)]"
    : "ring-1 ring-white/15 hover:-translate-y-0.5 hover:bg-white/[0.1] hover:ring-white/40";

  const idleFloat = alive && idleDelayMs !== undefined;
  // chromeless 는 카드가 없는 대신 아바타가 한 단계 크다 — 무대 위 존재감.
  const avatarSize = chrome ? "h-12 w-12" : "h-14 w-14";

  // 보조 인터랙션(R3): 롱프레스(450ms)·우클릭 = onInspect. 짧은 탭은 onClick(지목)로
  // 그대로 흘려, 두 채널이 절대 겹치지 않게 한다. firedRef 로 롱프레스 직후 click 억제.
  const pressTimer = useRef<number | null>(null);
  const fired = useRef(false);
  const startPress = () => {
    if (!onInspect) return;
    fired.current = false;
    pressTimer.current = window.setTimeout(() => {
      fired.current = true;
      onInspect();
    }, 450);
  };
  const endPress = () => {
    if (pressTimer.current != null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onInspect) return;
    e.preventDefault();
    onInspect();
  };
  const inspectHandlers = onInspect
    ? {
        onPointerDown: startPress,
        onPointerUp: endPress,
        onPointerLeave: endPress,
        onPointerCancel: endPress,
        onContextMenu: handleContextMenu,
      }
    : {};
  const handleClick = () => {
    if (fired.current) {
      fired.current = false; // 롱프레스가 소비함 — 지목으로 흘리지 않는다.
      return;
    }
    onClick?.();
  };

  const body = (
    <>
      <span
        style={idleFloat ? { animationDelay: `${idleDelayMs}ms` } : undefined}
        className={`relative inline-flex ${avatarSize} items-center justify-center overflow-hidden rounded-full border text-base font-semibold backdrop-blur-sm transition-all duration-500 ${tokenBase} ${ink} ${
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
      {sub ? <span className={`block text-[0.625rem] uppercase tracking-wider ${inkFaint}`}>{sub}</span> : null}
    </>
  );

  const enter =
    "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300";
  const frame = chrome
    ? `gap-2 rounded-xl border p-3 ${cardBase}`
    : "gap-1.5 p-1";

  if (!onClick) {
    return (
      <div
        {...inspectHandlers}
        className={`flex flex-col items-center text-center transition-all duration-500 ${frame} ${enter}`}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      {...inspectHandlers}
      disabled={disabled}
      className={`flex w-full flex-col items-center text-center transition-all duration-300 ${frame} ${enter} ${
        selected && chrome ? selectedGlow : pickable && chrome && !disabled ? pickFx : ""
      } ${disabled && !selected ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {body}
    </button>
  );
}
