"use client";

/**
 * IllustrationScene — 인게임 일러스트 렌더러 (기반 준비, 아직 어디에도 배치 안 됨).
 *
 * 페인터리 원화(다크 + 마젠타/바이올렛 액센트 류)를 게임 무대 위에 "그림이 무드를
 * 이기지 않게" 올리는 단일 프리미티브. 세 겹으로 렌더한다:
 *   1. next/image fill — focal 기준 크롭 (same-origin 최적화, Activity CSP 안전)
 *   2. tone 그레이드 — 무드 토큰과 같은 색온도로 살짝 물들임 (soft-light)
 *   3. edge 처리 — 무대 배경으로 침잠(fade-b) / 비네트 / 원본(none, 컷인용)
 *
 * 쓰임 (후속 배치 때):
 *   <IllustrationScene id="night-muse" />                  // 매니페스트 참조
 *   <IllustrationScene id="night-muse" drift priority />   // 배경용: 미세 드리프트 + 프리로드
 *
 * drift 는 25s 주기의 아주 느린 scale/pan — reduced-motion 에서 자동 정지(globals).
 */

import Image from "next/image";
import { illustrationById, type IllustrationMeta } from "@/config/illustrations";

const TONE_GRADE: Record<IllustrationMeta["tone"], string> = {
  night: "bg-indigo-950/35 mix-blend-soft-light",
  ember: "bg-rose-950/40 mix-blend-soft-light",
  dawn: "bg-amber-900/30 mix-blend-soft-light",
  veil: "bg-slate-900/40 mix-blend-soft-light",
};

const EDGE_FX: Record<NonNullable<IllustrationMeta["edge"]>, string> = {
  "fade-b": "bg-gradient-to-b from-transparent via-transparent to-[#11131a]",
  vignette: "shadow-[inset_0_0_120px_60px_rgba(8,9,14,0.85)]",
  none: "",
};

export function IllustrationScene({
  id,
  meta,
  priority = false,
  drift = false,
  className,
  sizes = "100vw",
}: {
  /** ILLUSTRATIONS 매니페스트 키. meta 직접 주입과 둘 중 하나. */
  id?: string;
  /** 매니페스트 밖 메타 직접 주입 (프리뷰/실험용). */
  meta?: IllustrationMeta;
  /** 화면 진입 즉시 보여야 하는 배경이면 true (preload). */
  priority?: boolean;
  /** 아주 느린 팬/줌 — 배경용 생동감. */
  drift?: boolean;
  className?: string;
  /** next/image sizes 힌트 — 컷인 등 부분 폭이면 조정. */
  sizes?: string;
}) {
  const art = meta ?? (id ? illustrationById(id) : null);
  if (!art) return null;

  const edge = art.edge ?? "fade-b";

  return (
    <div className={`relative overflow-hidden ${className ?? "h-full w-full"}`} aria-hidden={art.alt === ""}>
      <div className={`absolute inset-0 ${drift ? "gomdori-illust-drift" : ""}`}>
        <Image
          src={art.src}
          alt={art.alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
          style={{ objectPosition: `${art.focal.x * 100}% ${art.focal.y * 100}%` }}
        />
      </div>
      {/* tone 그레이드 — 그림을 게임 무드의 색온도로 */}
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${TONE_GRADE[art.tone]}`} />
      {/* edge — UI 와 만나는 자리 */}
      {edge !== "none" ? (
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${EDGE_FX[edge]}`} />
      ) : null}
    </div>
  );
}
