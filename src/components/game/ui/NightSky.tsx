// 경량 밤 배경 — 달 글로우 + 결정론적 별점. WebGL/에셋 없이 CSS 만.
// pointer-events-none, 콘텐츠 뒤(z-0). reduced-motion 시 깜빡임 없음(motion-safe).
const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37 + 3) % 100}%`,
  top: `${(i * 53 + 11) % 100}%`,
  size: 1 + (i % 3),
  delay: `${(i % 5) * 0.5}s`,
}));

export function NightSky() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="absolute right-12 top-12 h-16 w-16 rounded-full bg-slate-100/15 blur-lg" />
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/40 motion-safe:animate-pulse"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }}
        />
      ))}
    </div>
  );
}
