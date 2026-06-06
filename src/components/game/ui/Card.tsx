import { SURFACE } from "@/config/design-tokens";

/**
 * 게임 UI 카드 프리미티브 — SURFACE 토큰을 단일 출처로 소비.
 * design-tokens.ts 의 SURFACE.card / cardEmphasis 와 1:1.
 */
export function Card({
  emphasis,
  className,
  children,
}: {
  emphasis?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const base = emphasis ? SURFACE.cardEmphasis : SURFACE.card;
  return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
