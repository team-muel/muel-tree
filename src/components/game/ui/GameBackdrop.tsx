/**
 * GameBackdrop — 페이즈별 앰비언트 배경의 *단일 출처*.
 *
 * 실게임 프레임(app/(activities)/game/page.tsx 의 GameFrame)과 디자인 작업대
 * (/game/preview)가 같은 규칙을 공유하도록 추출 — 둘이 따로 구현하다 preview 에
 * NightSky·키아트가 빠져 인게임과 어긋났던 드리프트를 차단한다.
 *
 * - status 별 NightSky: 밤 계열은 달+별, 그 외 어둠 무드(역할공개·종료·로비·랜딩)는 옅은 별.
 * - status 별 DayGlow: 낮 무드(아침·투표)는 위쪽 햇빛 블룸 — NightSky 달빛의 낮 짝.
 *   밤은 달이 위에서 빛을 주는데 낮이 평면 그라디언트면 "밤만 질감 풍부"한 정합 간극이
 *   생긴다 → 낮에도 상단 광원을 줘 양쪽이 "위에서 빛을 받는 한 무대"로 읽히게.
 * - keyArt: 진입·로딩·로비의 풀블리드 night-muse (dim = 로비용 저채도).
 * - embedded: 작업대처럼 박스 안에 끼울 때 키아트를 fixed 대신 absolute 로 (박스 기준).
 *
 * PhaseSweep(페이즈 전환막)은 전환 1회용이라 여기 포함하지 않는다 — GameFrame 전용.
 */

import { NightSky } from "@/components/game/ui/NightSky";
import { IllustrationScene } from "@/components/game/ui/IllustrationScene";

// 실게임 GameFrame 의 status 분기와 1:1 — 변경 시 양쪽이 자동 정합.
const STARRY_FULL = new Set(["night", "night_suspect", "night_deduce"]);
const STARRY_SUBTLE = new Set(["role_assign", "ended", "lobby", "landing"]);
// 낮 무드 — 상단 햇빛 블룸(달빛의 낮 짝). 투표는 더 따뜻한 황금빛.
const SUN_GLOW: Record<string, string> = {
  day: "radial-gradient(115% 75% at 50% -12%, rgba(255,251,238,0.55), rgba(255,251,238,0) 56%)",
  vote: "radial-gradient(115% 75% at 50% -12%, rgba(255,244,214,0.5), rgba(255,244,214,0) 56%)",
};

export function GameBackdrop({
  status,
  keyArt = false,
  embedded = false,
}: {
  status?: string;
  /** 풀블리드 night-muse. "dim" = 로비용 저채도(가독 우선). */
  keyArt?: boolean | "dim";
  /** 박스 안 임베드(작업대) — 키아트를 fixed 대신 absolute 로. */
  embedded?: boolean;
}) {
  const dim = keyArt === "dim";
  return (
    <>
      {keyArt ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none ${embedded ? "absolute" : "fixed"} inset-0`}
        >
          <IllustrationScene
            id="night-muse"
            priority
            drift
            quality={90}
            sizes="100vw"
            className={`h-full w-full ${dim ? "opacity-30" : "opacity-85"}`}
          />
        </div>
      ) : null}
      {status && STARRY_FULL.has(status) ? <NightSky /> : null}
      {status && STARRY_SUBTLE.has(status) ? <NightSky subtle /> : null}
      {status && SUN_GLOW[status] ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none ${embedded ? "absolute" : "fixed"} inset-0`}
          style={{ background: SUN_GLOW[status] }}
        />
      ) : null}
    </>
  );
}
