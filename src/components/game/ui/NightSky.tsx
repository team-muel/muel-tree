// 경량 밤 배경 — 달 글로우 + 결정론적 별점. WebGL/에셋 없이 CSS 만.
// pointer-events-none, 콘텐츠 뒤(z-0). reduced-motion 시 깜빡임 없음(motion-safe).
// subtle: 달 글로우 없이 옅은 별만 — 밤 외 페이즈(역할공개·종료·로비)의 은은한 앰비언스.
const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37 + 3) % 100}%`,
  top: `${(i * 53 + 11) % 100}%`,
  size: 1 + (i % 3),
  delay: `${(i % 5) * 0.5}s`,
}));

export function NightSky({ subtle = false }: { subtle?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {!subtle && (
        <>
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="absolute right-12 top-12 h-16 w-16 rounded-full bg-slate-100/15 blur-lg" />
        </>
      )}
      {STARS.map((s, i) => (
        <span
          key={i}
          className={`absolute rounded-full motion-safe:animate-pulse ${subtle ? "bg-white/20" : "bg-white/40"}`}
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }}
        />
      ))}
    </div>
  );
}
