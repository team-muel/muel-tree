"use client";

// Activity(weave/game) 전용 에러 폴백 — 어두운 톤.
export default function ActivityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-screen w-full flex-col items-center justify-center bg-[#070712] px-6 text-center text-white"
    >
      <div className="text-3xl" aria-hidden="true">🧵</div>
      <h1 className="mt-3 text-lg font-semibold">문제가 발생했어요</h1>
      <p className="mt-2 text-sm text-white/40">Activity를 다시 불러와 주세요.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        다시 시도
      </button>
    </div>
  );
}
