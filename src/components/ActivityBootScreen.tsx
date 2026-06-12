"use client";

/**
 * ActivityBootScreen — Activity 진입(여는 중/불러오는 중) 화면 (2026-06-12).
 *
 * 공용 실타래(🧵) 로더를 대체하는 Activity 전용 부트 화면. 어떤 화면을 쓸지는
 * activities 설정의 `boot` 필드가 결정한다 (Gomdori = night-muse 키 아트) —
 * boot 미지정 Activity 는 기존 실타래 로더 폴백.
 *
 * 키 아트는 object-cover + focal 로 어떤 종횡비에서도 시선점이 살고,
 * quality 90 으로 화질을 보존한다 (IllustrationScene 동일 규칙).
 */

import { IllustrationScene } from "@/components/game/ui/IllustrationScene";
import type { MuelActivity } from "@/config/activities";

export function ActivityBootScreen({
  boot,
  label,
  className,
}: {
  /** activities 설정의 boot — 없으면 실타래 폴백. */
  boot?: MuelActivity["boot"];
  /** 진행 상태 한 줄 ("여는 중...", "불러오는 중..."). */
  label: string;
  /** 배치 컨텍스트별 포지셔닝 (기본 absolute inset-0). */
  className?: string;
}) {
  if (!boot) {
    return (
      <div className={`${className ?? "absolute inset-0"} z-10 flex flex-col items-center justify-center bg-[#070712]`}>
        <div className="animate-pulse text-4xl">🧵</div>
        <p className="mt-3 text-sm text-white/30">{label}</p>
      </div>
    );
  }

  return (
    <div className={`${className ?? "absolute inset-0"} z-10 overflow-hidden bg-[#070712]`}>
      <IllustrationScene
        id={boot.illustrationId}
        priority
        drift
        quality={90}
        sizes="100vw"
        className="absolute inset-0 h-full w-full"
      />
      {/* 하단 침잠 위 타이틀·상태 — 그림을 가리지 않게 아래쪽에 정렬 */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 pb-14">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.35em] text-white/55">
          {boot.title}
        </p>
        <p className="text-sm text-white/40">
          <span aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white/45 align-middle" />
          {label}
        </p>
      </div>
    </div>
  );
}
