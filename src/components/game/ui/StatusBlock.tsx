import { SURFACE } from "@/config/design-tokens";

/**
 * 게임 상태/안내 블록 — SURFACE.statusBlock 토큰 소비.
 * 기존 game/page.tsx 의 로컬 StatusBlock 과 동일한 시각 출력(회귀 0).
 */
export function StatusBlock({
  eyebrow = "Gomdori Mafia",
  title,
  detail,
  actions,
}: {
  eyebrow?: string;
  title: string;
  detail: string;
  /** 복구 동작 버튼들 — 오류 화면이 막다른 길이 되지 않게 (2026-06-12). */
  actions?: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <div className={SURFACE.statusBlock}>
      <div className="text-sm text-white/35">{eyebrow}</div>
      <h1 className="mt-3 text-xl font-semibold text-white">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-white/50">{detail}</p>
      {actions && actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className="rounded-md border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
