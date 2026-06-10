/**
 * RoleSymbol — 직업 기하 심볼 라이브러리 (SVG, stroke=currentColor).
 *
 * 시각적 매핑의 1차 구현: 일러스트가 없는 지금, 각 직업은 "한 획으로 알아보는
 * 기하 심볼 + 진영 색 + 광휘"로 존재감을 가진다. 도감·정체 공개·밤 액션 헤더 공용.
 *
 * 규칙: 24×24 그리드 · stroke 1.6 · round cap — 빛(광휘) 위에 서는 가는 선.
 * 일러스트 교체는 RoleEmblem(상위 컴포넌트)이 담당 — 이 파일은 심볼만.
 */

export type RoleSymbolId =
  | "circle"
  | "cross"
  | "shield"
  | "triangleDown"
  | "hornedBrand"
  | "eclipse"
  | "twinSouls"
  | "splitMask"
  | "veiledEye"
  | "crescentWell"
  | "brokenPendant"
  | "tiltedScale"
  | "badgeStar"
  | "tigerClaw"
  | "magnifier"
  | "lifeCross"
  | "dessertCup"
  | "sleepStar"
  | "banner"
  | "emberBlade"
  | "supernova"
  | "note"
  | "haloSun"
  | "spiral";

const SYMBOLS: Record<RoleSymbolId, React.ReactNode> = {
  circle: <circle cx="12" cy="12" r="7" />,
  cross: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  shield: <path d="M12 4l6 2.5v5c0 4-2.7 6.7-6 8-3.3-1.3-6-4-6-8v-5L12 4z" />,
  triangleDown: <path d="M5 7h14l-7 11L5 7z" />,
  hornedBrand: (
    <>
      <path d="M7.5 9.5C6.3 7.2 6.2 5.4 5 4" />
      <path d="M16.5 9.5c1.2-2.3 1.3-4.1 2.5-5.5" />
      <circle cx="12" cy="13.5" r="5" />
      <path d="M12 11v5" />
    </>
  ),
  eclipse: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M9.2 5.6a7 7 0 0 1 0 12.8A7 7 0 0 0 9.2 5.6z" />
    </>
  ),
  twinSouls: (
    <>
      <path d="M9 16.5c-1.9 0-3-1.3-3-2.9 0-1.9 1.7-3.2 3-4.9 1.3 1.7 3 3 3 4.9 0 1.6-1.1 2.9-3 2.9z" />
      <path d="M15.8 17.5c-1.5 0-2.4-1-2.4-2.3 0-1.5 1.3-2.5 2.4-3.8 1 1.3 2.4 2.3 2.4 3.8 0 1.3-.9 2.3-2.4 2.3z" />
    </>
  ),
  splitMask: (
    <>
      <path d="M6 5h12v6.5c0 4-3 7.5-6 7.5s-6-3.5-6-7.5V5z" />
      <path d="M12 5v14" />
      <circle cx="9" cy="10" r="0.9" />
      <circle cx="15" cy="10" r="0.9" />
    </>
  ),
  veiledEye: (
    <>
      <path d="M3.5 12S7 7 12 7s8.5 5 8.5 5-3.5 5-8.5 5-8.5-5-8.5-5z" />
      <circle cx="12" cy="12" r="2" />
      <path d="M5.5 5.5l13 13" />
    </>
  ),
  crescentWell: (
    <>
      <path d="M15 4.5a8 8 0 1 0 4.6 13A7 7 0 0 1 15 4.5z" />
      <circle cx="16.5" cy="16.5" r="1.2" />
    </>
  ),
  brokenPendant: (
    <>
      <path d="M12 4l6 8-6 8-6-8 6-8z" />
      <path d="M12 7l-1.5 3 2.5 2-1.5 3" />
    </>
  ),
  tiltedScale: (
    <>
      <path d="M5 9.5l14-3.5" />
      <path d="M12 8v11" />
      <path d="M9 19h6" />
      <path d="M5 9.5L3.2 13.5h3.6L5 9.5z" />
      <path d="M19 6l-1.8 4h3.6L19 6z" />
    </>
  ),
  badgeStar: (
    <>
      <path d="M12 3l6.5 3.75v7.5L12 18l-6.5-3.75v-7.5L12 3z" />
      <circle cx="12" cy="10.5" r="1.6" />
      <path d="M12 18v3" />
    </>
  ),
  tigerClaw: (
    <>
      <path d="M7 5c2 3 2.8 8 1.8 14" />
      <path d="M12 4c2.4 3.5 3.3 9 2.3 16" />
      <path d="M17 5c1.9 3 2.6 8 1.6 13" />
    </>
  ),
  magnifier: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="M14.7 14.7L20 20" />
    </>
  ),
  lifeCross: (
    <>
      <path d="M12 6v12" />
      <path d="M6 12h12" />
      <path d="M12 2.5V4" />
      <path d="M12 20v1.5" />
      <path d="M2.5 12H4" />
      <path d="M20 12h1.5" />
    </>
  ),
  dessertCup: (
    <>
      <path d="M6.5 10.5h11l-1.4 7a2 2 0 0 1-2 1.6h-4.2a2 2 0 0 1-2-1.6l-1.4-7z" />
      <path d="M12 3l.7 1.9 1.9.7-1.9.7L12 8.2l-.7-1.9-1.9-.7 1.9-.7L12 3z" />
    </>
  ),
  sleepStar: (
    <>
      <path d="M12 3.5l1.2 4.3L17.5 9l-4.3 1.2L12 14.5l-1.2-4.3L6.5 9l4.3-1.2L12 3.5z" />
      <path d="M8 19c2.6 1.4 5.4 1.4 8 0" />
    </>
  ),
  banner: (
    <>
      <path d="M7 4v16" />
      <path d="M7 5h10l-2.5 3L17 11H7" />
    </>
  ),
  emberBlade: (
    <>
      <path d="M12 3v13" />
      <path d="M8.5 16h7" />
      <path d="M12 16v4.5" />
      <circle cx="12" cy="7.5" r="1.4" />
    </>
  ),
  supernova: (
    <>
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.9 4.9l2.8 2.8" />
      <path d="M16.3 16.3l2.8 2.8" />
      <path d="M19.1 4.9l-2.8 2.8" />
      <path d="M7.7 16.3l-2.8 2.8" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  note: (
    <>
      <circle cx="12.2" cy="16.8" r="2.6" />
      <path d="M14.8 16.8V4.5" />
      <path d="M14.8 4.5c2.6 1 4.2 2.6 4.2 5.2-1.4-1.5-2.7-2-4.2-2" />
    </>
  ),
  haloSun: (
    <>
      <circle cx="12" cy="13.5" r="4.5" />
      <ellipse cx="12" cy="5" rx="5" ry="1.7" />
    </>
  ),
  spiral: (
    <path d="M12 12c0-1.7 1.6-2.8 3.1-2.2 1.9.7 2.4 3 1.2 4.7-1.5 2.2-4.6 2.5-6.7.9-2.6-2-2.8-5.8-.7-8.2 2.5-2.9 7-3 9.8-.6" />
  ),
};

export function RoleSymbol({
  id,
  className,
  strokeWidth = 1.6,
}: {
  id: RoleSymbolId;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-6 w-6"}
    >
      {SYMBOLS[id]}
    </svg>
  );
}
