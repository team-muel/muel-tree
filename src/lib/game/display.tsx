"use client";

/**
 * Display 적응 — Activity 뷰포트 스케일 + 모바일/데스크톱 레이아웃 모드.
 *
 * 1) scale: Discord Activity 는 PiP(좁음)부터 전체화면(2560px+)까지 같은 UI 를
 *    보여준다. 게임 UI 는 rem 기반(Tailwind)이므로 루트 폰트 크기를 뷰포트에
 *    비례해 조정하면 무대 전체가 디스플레이 크기에 맞춰 균일하게 스케일된다.
 *    (1px 헤어라인·블러 같은 px 고정값은 의도적으로 스케일되지 않는다.)
 * 2) layout: Discord 런치 파라미터 `platform=mobile` 이 1순위 신호. 없으면
 *    뷰포트 폭 휴리스틱(<768 = compact). 모바일은 같은 컴포넌트의 클래스
 *    분기가 아니라 *별도 구조*로 렌더링한다 — 분기는 useDisplay().layout 로.
 *
 * GamePage 가 Provider 를 마운트하고 언마운트 시 루트 폰트를 복원하므로
 * 다른 라우트(weave 등)에는 영향이 없다. preview 작업대는 scaleRoot=false 로
 * 레이아웃 감지만 쓴다.
 */

import { createContext, useContext, useEffect, useState } from "react";

export type LayoutMode = "mobile" | "desktop";

type DisplayState = {
  layout: LayoutMode;
  /** 루트 폰트 배율 (1 = 16px 기준). */
  scale: number;
};

const DisplayContext = createContext<DisplayState>({ layout: "desktop", scale: 1 });

export function useDisplay(): DisplayState {
  return useContext(DisplayContext);
}

/** 데스크톱 기준 해상도 — 이 크기에서 scale=1. */
const DESKTOP_BASE = { w: 1280, h: 760 };
/** 모바일 기준 폭 — 세로 스크롤 흐름이라 높이로는 줄이지 않는다. */
const MOBILE_BASE_W = 400;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function detectLayout(): LayoutMode {
  if (typeof window === "undefined") return "desktop";
  try {
    const platform = new URLSearchParams(window.location.search).get("platform");
    if (platform === "mobile") return "mobile";
  } catch {
    // URL 파싱 실패 — 휴리스틱으로.
  }
  // platform=desktop 이어도 PiP 처럼 좁으면 모바일 구조가 맞다 — 공간 기준.
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

function computeScale(layout: LayoutMode): number {
  if (typeof window === "undefined") return 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (layout === "mobile") {
    return clamp(w / MOBILE_BASE_W, 0.9, 1.2);
  }
  return clamp(Math.min(w / DESKTOP_BASE.w, h / DESKTOP_BASE.h), 0.8, 1.5);
}

export function DisplayProvider({
  children,
  scaleRoot = true,
}: {
  children: React.ReactNode;
  /** false 면 레이아웃 감지만 — 루트 폰트는 건드리지 않는다 (preview 작업대). */
  scaleRoot?: boolean;
}) {
  const [state, setState] = useState<DisplayState>({ layout: "desktop", scale: 1 });

  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    const apply = () => {
      const layout = detectLayout();
      const scale = computeScale(layout);
      setState((prev) =>
        prev.layout === layout && prev.scale === scale ? prev : { layout, scale },
      );
      if (scaleRoot) {
        root.style.fontSize = `${16 * scale}px`;
      }
    };

    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (scaleRoot) {
        root.style.fontSize = "";
      }
    };
  }, [scaleRoot]);

  return <DisplayContext.Provider value={state}>{children}</DisplayContext.Provider>;
}
