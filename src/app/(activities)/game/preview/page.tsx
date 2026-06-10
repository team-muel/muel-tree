"use client";

/**
 * `/game/preview` — 디자인 작업대.
 *
 * Discord Activity 외부에서도 7개 페이즈 컴포넌트의 시각 형상을 한 화면에서
 * 미리 확인할 수 있도록 ActivityLayout 을 우회합니다.
 *
 * 동작 원칙:
 * - 페이즈 컴포넌트 자체는 *side effect* (supabase 구독, REST 호출) 를 시도하나,
 *   invalid mock jwt 로 fail-fast → UI 만 그려짐.
 * - 사용자의 *실수 클릭* 방지를 위해 각 페이즈 카드에 `pointer-events: none`.
 *
 * 데이터 흐름:
 * - mock = `@/config/preview-fixtures` (인물명은 vault 정본).
 * - 페이즈 라벨 = `GOMDORI_RULES.publicFlowSteps`.
 *
 * 이 라우트는 *Phase 1 디자인 작업대* — 디자인 폴리시 사이클 (Step 5) 의 베이스.
 */

import { LobbyPhase } from "@/components/game/LobbyPhase";
import { RoleAssignPhase } from "@/components/game/RoleAssignPhase";
import { NightPhase } from "@/components/game/NightPhase";
import { DayPhase } from "@/components/game/DayPhase";
import { VotePhase } from "@/components/game/VotePhase";
import { VerdictPhase } from "@/components/game/VerdictPhase";
import { ResultPhase } from "@/components/game/ResultPhase";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import {
  MOCK_SESSION,
  MOCK_MATCH,
  MOCK_PLAYERS,
  MOCK_EVENTS,
} from "@/config/preview-fixtures";

const ME = MOCK_PLAYERS[0];

function renderPhasePreview(key: string): React.ReactNode {
  switch (key) {
    case "lobby":
      return (
        <LobbyPhase
          session={MOCK_SESSION}
          match={{ ...MOCK_MATCH, status: "lobby" }}
          players={MOCK_PLAYERS}
          myPlayer={ME}
          gameJwt="preview"
        />
      );
    case "role_assign":
      return (
        <RoleAssignPhase
          players={MOCK_PLAYERS}
          myPlayer={ME}
          events={MOCK_EVENTS.roleAssign}
          matchId="preview"
          gameJwt={null}
        />
      );
    case "night":
      return (
        <NightPhase
          match={{ ...MOCK_MATCH, status: "night" }}
          players={MOCK_PLAYERS}
          myPlayer={ME}
          gameJwt="preview"
        />
      );
    case "day":
      return (
        <DayPhase
          match={{ ...MOCK_MATCH, status: "day" }}
          players={MOCK_PLAYERS}
          events={MOCK_EVENTS.dayAfterDeath}
          myPlayer={ME}
        />
      );
    case "vote":
      return (
        <VotePhase
          match={{ ...MOCK_MATCH, status: "vote" }}
          players={MOCK_PLAYERS}
          myPlayer={ME}
          gameJwt="preview"
        />
      );
    case "verdict":
      return (
        <VerdictPhase
          players={MOCK_PLAYERS}
          events={MOCK_EVENTS.verdictExecuted}
        />
      );
    case "ended":
      return (
        <ResultPhase
          match={{ ...MOCK_MATCH, status: "ended", winner: "angels" }}
          players={MOCK_PLAYERS}
          events={MOCK_EVENTS.gameEnded}
        />
      );
    default:
      return null;
  }
}

function PreviewSection({
  index,
  title,
  detail,
  children,
}: {
  index: number;
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/30 overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.02] px-5 py-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-mono text-xs text-white/35">
            {String(index).padStart(2, "0")}
          </span>
          <span className="font-medium text-white">{title}</span>
          <span className="text-xs text-white/40">— {detail}</span>
        </div>
      </div>
      <div className="h-[560px] overflow-auto bg-[#070712] pointer-events-none">
        {children}
      </div>
    </section>
  );
}

export default function GamePreviewPage() {
  return (
    <main className="min-h-screen bg-[#11131a] text-white">
      <header className="border-b border-white/10 px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-widest text-white/35">
            Gomdori Mafia · Preview
          </div>
          <h1 className="mt-1 text-2xl font-semibold">디자인 작업대</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            7개 페이즈 컴포넌트를 mock 데이터로 한 화면에서 미리보기.
            Discord Activity 외부에서도 시각 형상을 확인할 수 있도록 ActivityLayout 을 우회합니다.
            각 카드는 ``pointer-events: none`` 으로 클릭 차단 — 시각 검토 전용.
          </p>
          <div className="mt-3 text-xs text-white/40">
            데이터 출처: <code className="font-mono">src/config/preview-fixtures.ts</code> ·
            룰: <code className="font-mono">src/config/gomdori-rules.ts</code> ·
            토큰: <code className="font-mono">src/config/design-tokens.ts</code>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {GOMDORI_RULES.publicFlowSteps.map((step, index) => (
          <PreviewSection
            key={step.key}
            index={index + 1}
            title={step.label}
            detail={step.detail}
          >
            {renderPhasePreview(step.key)}
          </PreviewSection>
        ))}
      </div>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/35">
        Gomdori Mafia · Phase 1 디자인 작업대 ·
        실 게임은 Discord Activity 안에서 <code className="font-mono">/게임</code>
      </footer>
    </main>
  );
}
