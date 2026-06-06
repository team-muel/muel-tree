import { SURFACE } from "@/config/design-tokens";

/**
 * 게임 상태/안내 블록 — SURFACE.statusBlock 토큰 소비.
 * 기존 game/page.tsx 의 로컬 StatusBlock 과 동일한 시각 출력(회귀 0).
 */
export function StatusBlock({
  eyebrow = "Gomdori Mafia",
  title,
  detail,
}: {
  eyebrow?: string;
  title: string;
  detail: string;
}) {
  return (
    <div className={SURFACE.statusBlock}>
      <div className="text-sm text-white/35">{eyebrow}</div>
      <h1 className="mt-3 text-xl font-semibold text-white">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-white/50">{detail}</p>
    </div>
  );
}
