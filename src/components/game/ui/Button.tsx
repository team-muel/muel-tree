import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "amber" | "ghost" | "indigo";

// 변형별 활성 색. 비활성은 공통(대비 확보 + 커서). focus-visible 링으로 키보드 접근성.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-emerald-300 text-slate-950 hover:bg-emerald-200",
  amber: "bg-amber-400 text-slate-950 hover:bg-amber-300",
  indigo: "bg-indigo-400 text-slate-950 hover:bg-indigo-300",
  danger: "bg-red-400 text-slate-950 hover:bg-red-300",
  ghost: "border border-white/20 bg-transparent text-white/80 hover:bg-white/5",
};

/**
 * 게임 UI 버튼 프리미티브 — 변형 + 공통 disabled/focus 상태를 단일 출처로.
 * 페이즈 컴포넌트의 복붙 버튼 스타일을 대체하기 위한 토대.
 */
export function Button({
  variant = "primary",
  className,
  ...props
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 ${VARIANTS[variant]} ${className ?? ""}`}
    />
  );
}
