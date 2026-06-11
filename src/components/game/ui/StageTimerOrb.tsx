"use client";

/**
 * StageTimerOrb — 무대 위를 자율적으로 떠다니는 타이머 오브 (R2, 2026-06-11).
 *
 * 사용자 의도: 아바타가 선 무대 위에 "차고 놀 수 있는" 타이머를 둔다. 평소엔
 * 느리게 부유(벽 반사 + 가끔 방황), 탭하면 임펄스로 튕기고, 끌면 던질 수 있다.
 * 순수 장식 — 게임 상태를 바꾸지 않는다. reduced-motion 이면 물리를 끄고 고정.
 * 지목 무대(selectable)에는 올리지 않는다(조준 방해 방지) — GameStage 가 통제.
 *
 * 좌표계: 자신의 offsetParent(= GameStage 의 relative 루트) 안에서 px 물리.
 * 위치는 rAF 로 transform 에 직접 써서 리렌더 없이 움직인다.
 */

import { useEffect, useRef, useState } from "react";

const SIZE = 56;

function fmt(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function StageTimerOrb({ endsAt }: { endsAt?: string | null }) {
  const orbRef = useRef<HTMLButtonElement>(null);
  const pos = useRef({ x: 48, y: 24 });
  const vel = useRef({ vx: 0.5, vy: 0.3 });
  const bounds = useRef({ w: 0, h: 0 });
  const drag = useRef<{ active: boolean; lastX: number; lastY: number; moved: number } | null>(null);
  const rafId = useRef(0);
  const [label, setLabel] = useState("");

  // 남은 시간 라벨 — 1초마다. 물리와 분리(리렌더는 텍스트만).
  useEffect(() => {
    if (!endsAt) {
      setLabel("");
      return;
    }
    const tick = () => setLabel(fmt(new Date(endsAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  // 물리 루프.
  useEffect(() => {
    const el = orbRef.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const parent = (el.offsetParent as HTMLElement | null) ?? el.parentElement;

    const measure = () => {
      const r = parent?.getBoundingClientRect();
      if (r) bounds.current = { w: r.width, h: r.height };
    };
    measure();

    const clampPos = () => {
      const maxX = Math.max(0, bounds.current.w - SIZE);
      const maxY = Math.max(0, bounds.current.h - SIZE);
      pos.current.x = Math.min(maxX, Math.max(0, pos.current.x));
      pos.current.y = Math.min(maxY, Math.max(0, pos.current.y));
    };
    const apply = () => {
      el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
    };
    clampPos();
    apply();

    const onResize = () => {
      measure();
      clampPos();
      apply();
    };
    window.addEventListener("resize", onResize);

    if (reduced) {
      // 정적 — 물리·방황 없음. 드래그 재배치는 핸들러가 직접 처리.
      return () => window.removeEventListener("resize", onResize);
    }

    let wander = 0;
    const step = () => {
      if (!drag.current?.active) {
        const maxX = Math.max(0, bounds.current.w - SIZE);
        const maxY = Math.max(0, bounds.current.h - SIZE);
        vel.current.vx *= 0.985;
        vel.current.vy *= 0.985;
        const speed = Math.hypot(vel.current.vx, vel.current.vy);
        wander += 1;
        if (speed < 0.22 && wander > 36) {
          wander = 0;
          vel.current.vx += (Math.random() - 0.5) * 0.32;
          vel.current.vy += (Math.random() - 0.5) * 0.32;
        }
        pos.current.x += vel.current.vx;
        pos.current.y += vel.current.vy;
        if (pos.current.x <= 0) {
          pos.current.x = 0;
          vel.current.vx = Math.abs(vel.current.vx) * 0.82;
        } else if (pos.current.x >= maxX) {
          pos.current.x = maxX;
          vel.current.vx = -Math.abs(vel.current.vx) * 0.82;
        }
        if (pos.current.y <= 0) {
          pos.current.y = 0;
          vel.current.vy = Math.abs(vel.current.vy) * 0.82;
        } else if (pos.current.y >= maxY) {
          pos.current.y = maxY;
          vel.current.vy = -Math.abs(vel.current.vy) * 0.82;
        }
        apply();
      }
      rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    orbRef.current?.setPointerCapture(e.pointerId);
    drag.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: 0 };
    vel.current = { vx: 0, vy: 0 };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d?.active) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.moved += Math.abs(dx) + Math.abs(dy);
    const maxX = Math.max(0, bounds.current.w - SIZE);
    const maxY = Math.max(0, bounds.current.h - SIZE);
    pos.current.x = Math.min(maxX, Math.max(0, pos.current.x + dx));
    pos.current.y = Math.min(maxY, Math.max(0, pos.current.y + dy));
    vel.current = { vx: dx, vy: dy };
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    if (orbRef.current) {
      orbRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
    }
  };
  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    d.active = false;
    if (d.moved < 6) {
      // 탭 = 차기: 무작위 방향 임펄스.
      const a = Math.random() * Math.PI * 2;
      const power = 6 + Math.random() * 4;
      vel.current = { vx: Math.cos(a) * power, vy: Math.sin(a) * power };
    } else {
      // 던지기 — 속도 클램프.
      vel.current.vx = Math.max(-18, Math.min(18, vel.current.vx));
      vel.current.vy = Math.max(-18, Math.min(18, vel.current.vy));
    }
    drag.current = null;
  };

  if (!endsAt) return null;

  return (
    <button
      ref={orbRef}
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={`남은 시간 ${label} — 차고 놀 수 있어요`}
      style={{ width: SIZE, height: SIZE }}
      className="absolute left-0 top-0 z-20 flex cursor-grab touch-none select-none items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-[0_4px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md transition-transform active:scale-95 active:cursor-grabbing"
    >
      <span aria-hidden="true" className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent" />
      <span className="relative font-mono text-xs font-semibold tabular-nums drop-shadow">{label}</span>
    </button>
  );
}
