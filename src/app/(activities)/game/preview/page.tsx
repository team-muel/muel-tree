"use client";

/**
 * `/game/preview` — 디자인 작업대.
 *
 * Discord Activity 외부에서도 페이즈 컴포넌트의 시각 형상을 한 화면에서
 * 미리 확인할 수 있도록 ActivityLayout 을 우회합니다.
 *
 * 2026-06-11 오버홀: 각 섹션 배경에 *실제 페이즈 톤*(PHASE_TONES)을 적용 —
 * 이중 무드(밝은 아침/투표 ↔ 심야 밤/판결)가 작업대에서 그대로 보인다.
 * 의심 투표(night_suspect, internal phase)도 섹션으로 추가.
 *
 * 동작 원칙:
 * - 페이즈 컴포넌트 자체는 *side effect* (supabase 구독, REST 호출) 를 시도하나,
 *   invalid mock jwt 로 fail-fast → UI 만 그려짐.
 * - 사용자의 *실수 클릭* 방지를 위해 각 페이즈 카드에 `pointer-events: none`.
 *
 * 데이터 흐름:
 * - mock = `@/config/preview-fixtures` (인물명은 vault 정본).
 * - 페이즈 라벨 = `GOMDORI_RULES.publicFlowSteps`.
 */

import { LobbyPhase } from "@/components/game/LobbyPhase";
import { RoleAssignPhase } from "@/components/game/RoleAssignPhase";
import { NightPhase } from "@/components/game/NightPhase";
import { SuspicionPhase } from "@/components/game/SuspicionPhase";
import { DayPhase } from "@/components/game/DayPhase";
import { VotePhase } from "@/components/game/VotePhase";
import { VerdictPhase } from "@/components/game/VerdictPhase";
import { ResultPhase } from "@/components/game/ResultPhase";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { PHASE_TONES } from "@/config/design-tokens";
import { StatusDock } from "@/components/game/ui/StatusDock";
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
          onLeave={() => {}}
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
    case "night_suspect":
      return (
        <SuspicionPhase
          match={{ ...MOCK_MATCH, status: "night_suspect" }}
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

/** publicFlowSteps + internal 의심 페이즈(밤 뒤에 끼움) — 작업대 전용 시퀀스. */
const PREVIEW_STEPS: Array<{ key: string; label: string; detail: string }> = (() => {
  const steps: Array<{ key: string; label: string; detail: string }> = [];
  for (const step of GOMDORI_RULES.publicFlowSteps) {
    steps.push(step);
    if (step.key === "night") {
      steps.push({
        key: "night_suspect",
        label: "의심",
        detail: "의심 투표 — 최다 의심자는 그 밤 능력 불가 (internal)",
      });
    }
  }
  return steps;
})();

function PreviewSection({
  index,
  toneKey,
  title,
  detail,
  children,
}: {
  index: number;
  toneKey: string;
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  const tone = PHASE_TONES[toneKey as keyof typeof PHASE_TONES];
  const moodLabel = tone?.mood === "light" ? "낮 무드" : "밤 무드";
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
      <div className="border-b border-white/10 bg-white/[0.02] px-5 py-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-xs text-white/35">
            {String(index).padStart(2, "0")}
          </span>
          <span className="font-medium text-white">{title}</span>
          <span className="text-xs text-white/40">— {detail}</span>
          <span className="ml-auto rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">
            {moodLabel}
          </span>
        </div>
      </div>
      <div
        className={`pointer-events-none relative flex h-[560px] flex-col overflow-auto ${tone?.bg ?? "bg-[#070712]"} ${
          tone?.mood === "light" ? "text-[#2b2118]" : "text-white"
        }`}
      >
        <div className="flex-1">{children}</div>
        <StatusDock
          status={toneKey}
          dayNumber={toneKey === "lobby" || toneKey === "role_assign" ? undefined : 2}
          phaseEndsAt={null}
          myRole={toneKey === "lobby" || toneKey === "role_assign" ? undefined : "romaz"}
          myFaction="angel"
          inline
        />
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
          <h1 className="mt-1 text-2xl font-semibold">디자인 작업대 — 이중 무드</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            페이즈 컴포넌트를 mock 데이터 + *실제 페이즈 톤*으로 미리보기.
            아침·투표는 밝은 무대, 밤·판결은 심야 — 페이즈 전환이 공간을 뒤집는 이중 무드를
            작업대에서 그대로 확인합니다. 각 카드는 ``pointer-events: none`` — 시각 검토 전용.
          </p>
          <div className="mt-3 text-xs text-white/40">
            데이터: <code className="font-mono">src/config/preview-fixtures.ts</code> ·
            토큰: <code className="font-mono">src/config/design-tokens.ts</code> ·
            시각 매핑: <code className="font-mono">src/config/gomdori-role-visuals.ts</code> ·
            문서: <code className="font-mono">docs/gomdori-activity-design-language.md</code>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {PREVIEW_STEPS.map((step, index) => (
          <PreviewSection
            key={step.key}
            index={index + 1}
            toneKey={step.key}
            title={step.label}
            detail={step.detail}
          >
            {renderPhasePreview(step.key)}
          </PreviewSection>
        ))}
      </div>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/35">
        Gomdori Mafia · 디자인 작업대 ·
        실 게임은 Discord Activity 안에서 <code className="font-mono">/게임</code>
      </footer>
    </main>
  );
}
