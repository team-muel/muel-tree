/**
 * 작은 상태 pill. tone 별 색은 호출부에서 className 으로 주입(진영색은 FACTION_COLORS).
 */
export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-3 py-1 text-xs ${
        className ?? "border-white/15 bg-white/[0.06] text-white/70"
      }`}
    >
      {children}
    </span>
  );
}
