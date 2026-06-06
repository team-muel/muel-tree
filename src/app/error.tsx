"use client";

// Next.js route-segment 에러 폴백. 렌더 크래시 시 백지 대신 복구 UI.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm opacity-60">문제가 발생했어요</p>
      <h1 className="mt-2 text-2xl font-bold">페이지를 불러오지 못했어요</h1>
      <p className="mt-2 text-sm opacity-60">잠시 후 다시 시도해주세요.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full border px-5 py-2 text-sm font-semibold transition hover:opacity-70"
      >
        다시 시도
      </button>
    </main>
  );
}
