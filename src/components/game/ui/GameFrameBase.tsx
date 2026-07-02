"use client";

/**
 * GameFrameBase — 실게임·작업대가 공유하는 게임 프레임의 *단일 출처*.
 *
 * 실게임 GameFrame(app/(activities)/game/page.tsx)과 /game/preview 의 PreviewSection 이
 * 프레임(톤 배경·GameBackdrop·StatusDock·전환막 PhaseSweep·콘텐츠 래퍼)을 각자 구현하며
 * 드리프트가 생겼다 — preview 에 PhaseSweep·입장 애니메이션이 빠지고, 독 노출 규칙과
 * 텍스트 색이 어긋났다. 이 컴포넌트가 규칙을 한 곳으로 고정한다(GameBackdrop 과 같은
 * "단일 출처" 패턴). 의도된 차이만 prop 으로 받는다:
 *
 * - embedded: 작업대 박스 모드 — fixed 대신 박스 기준(absolute·inline 독), 고정 높이.
 * - interactive: embedded 전용 — 끄면 pointer-events 차단(시각 검토용).
 * - sweepNonce: embedded 전용 — 전환막은 status *변경*에만 발화하므로 정적인 작업대에선
 *   재생 트리거로 데모한다(실게임 동작 불변).
 *
 * 독 노출 규칙(양쪽 공통): 로비(화면 자체가 상태를 말함)·밤(NightPhase 가 자기 독을
 * 렌더)은 숨긴다. 그 외는 status 가 있으면 노출 — StatusDock 이 모르는 status 는
 * 스스로 null 을 반환한다.
 */

import { PHASE_TONES } from "@/config/design-tokens";
import { GameBackdrop } from "@/components/game/ui/GameBackdrop";
import { PhaseSweep } from "@/components/game/ui/PhaseSweep";
import { StatusDock } from "@/components/game/ui/StatusDock";

export interface GameFrameDock {
  dayNumber?: number;
  phaseEndsAt?: string | null;
  myRole?: string;
  myFaction?: string;
  myName?: string;
  myAvatarUrl?: string | null;
  dayAdjust?: { matchId: string; gameJwt: string } | null;
}

export function GameFrameBase({
  children,
  status,
  keyArt = false,
  hideDock = false,
  dock,
  embedded = false,
  interactive = true,
  sweepNonce,
}: {
  children: React.ReactNode;
  status?: string;
  /**
   * 진입·로딩 계열 화면의 풀블리드 키 아트(night-muse) 배경 (2026-06-12).
   * "dim" = 콘텐츠가 주인공인 화면(로비)용 저채도 배경 — 가독성 우선.
   */
  keyArt?: boolean | "dim";
  /** 독 강제 숨김 — 로비·밤은 규칙으로 이미 숨는다(위 주석). */
  hideDock?: boolean;
  /** StatusDock 에 넘길 본인·타이머 명세. */
  dock?: GameFrameDock;
  /** 작업대 박스 모드. */
  embedded?: boolean;
  /** embedded 전용 — 상호작용 차단 토글. */
  interactive?: boolean;
  /** embedded 전용 — 전환막 재생 트리거. */
  sweepNonce?: number;
}) {
  const tone = status ? PHASE_TONES[status as keyof typeof PHASE_TONES] : undefined;
  const bg = tone?.bg ?? "bg-[#11131a]";
  const showDock = Boolean(status) && status !== "lobby" && status !== "night" && !hideDock;

  const dockNode = showDock ? (
    <StatusDock
      status={status}
      dayNumber={dock?.dayNumber}
      phaseEndsAt={dock?.phaseEndsAt ?? null}
      myRole={dock?.myRole}
      myFaction={dock?.myFaction}
      myName={dock?.myName}
      myAvatarUrl={dock?.myAvatarUrl}
      dayAdjust={dock?.dayAdjust}
      inline={embedded}
    />
  ) : null;

  if (embedded) {
    return (
      <div
        className={`relative flex h-[560px] transform-gpu flex-col overflow-auto ${
          interactive ? "" : "pointer-events-none"
        } text-white transition-colors duration-700 ${bg}`}
      >
        {/* 앰비언트 배경(키아트 + 별)은 GameBackdrop 단일 출처 — 실게임과 공유. */}
        <GameBackdrop status={status} keyArt={keyArt} embedded />
        {/* 콘텐츠·독은 absolute 배경 위로(z-10). */}
        <div className="relative z-10 flex flex-1 flex-col">
          <div
            key={status ?? "static"}
            className="relative flex-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
          >
            {children}
          </div>
          {dockNode}
        </div>
        {/* 페이즈 전환막 — 정적 작업대에선 sweepNonce 로 재생 데모. */}
        {status ? <PhaseSweep status={status} embedded demoTrigger={sweepNonce} /> : null}
      </div>
    );
  }

  // h-full + overflow-y-auto: ActivityLayout 루트가 overflow-hidden 이라
  // 내용이 뷰포트보다 길면 그대로 잘렸다(스크롤 불가 — 작은 디스플레이에서 치명).
  // 내부 래퍼 m-auto = 짧으면 중앙 정렬, 길면 위에서부터 스크롤 (flex 중앙정렬의
  // overflow 클리핑을 피하는 표준 패턴).
  return (
    <main
      className={`relative flex h-full w-full overflow-y-auto px-4 pb-20 pt-5 text-white transition-colors duration-700 sm:px-6 ${bg}`}
    >
      {/* 앰비언트 배경(키아트 + 별)은 GameBackdrop 단일 출처 — /game/preview 작업대와 공유. */}
      <GameBackdrop status={status} keyArt={keyArt} />
      {dockNode}
      {/* 래퍼에 z 금지: z 를 주면 스태킹 컨텍스트가 생겨 내부 fixed 레이어
          (시트/창 z-40)가 독(z-30) 아래로 깔린다 — 독이 시트 peek 을 덮던 버그.
          NightSky 위 페인트는 DOM 순서(래퍼가 뒤)로 보장된다. */}
      <div
        key={status ?? "static"}
        className="relative m-auto flex w-full justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
      >
        {children}
      </div>
      {/* 페이즈 전환막 — 밤이 내리고 아침이 걷히는 스윕 (Feign 전환 구조) */}
      {status ? <PhaseSweep status={status} /> : null}
    </main>
  );
}
