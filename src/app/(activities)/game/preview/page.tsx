"use client";

/**
 * `/game/preview` — 디자인 작업대 (상호작용형, 2026-06-12 개편).
 *
 * Discord Activity 외부에서도 페이즈 컴포넌트의 시각·흐름을 한 화면에서 확인.
 * 이전엔 모든 카드가 `pointer-events: none` + 고정 시점(시민)이라 독 펼침·악마챗·
 * 관전·능력 UI 등 "보이지 않는 것들"이 많았다 — 이제 상단 컨트롤로 **내 직업/생존**을
 * 바꾸고, **상호작용을 켜서** 직접 눌러보며 전체 흐름을 파악한다.
 *
 * 동작 원칙:
 * - 페이즈 컴포넌트는 side effect(supabase 구독·REST)를 시도하나 mock jwt 로 fail-fast.
 *   서버가 필요한 버튼(투표 확정 등)은 동작하지 않고 에러만 — 시각·상호작용 검토용.
 * - 로컬 상호작용(독 펼침·시트·토큰 탭=정체추측·드래그 이동·타이머 차기)은 그대로 동작.
 */

import { useState } from "react";
import { LobbyPhase } from "@/components/game/LobbyPhase";
import { RoleAssignPhase } from "@/components/game/RoleAssignPhase";
import { NightPhase } from "@/components/game/NightPhase";
import { SuspicionPhase } from "@/components/game/SuspicionPhase";
import { DayPhase } from "@/components/game/DayPhase";
import { VotePhase } from "@/components/game/VotePhase";
import { VerdictPhase } from "@/components/game/VerdictPhase";
import { ResultPhase } from "@/components/game/ResultPhase";
import { LandingScreen } from "@/components/game/LandingScreen";
import { GameStage } from "@/components/game/ui/GameStage";
import { GameBackdrop } from "@/components/game/ui/GameBackdrop";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { PHASE_TONES } from "@/config/design-tokens";
import { roleMeta } from "@/config/gomdori-roles";
import { StatusDock } from "@/components/game/ui/StatusDock";
import { DisplayProvider } from "@/lib/game/display";
import type { PlayerSummary } from "@/lib/game/api";
import {
  MOCK_SESSION,
  MOCK_MATCH,
  MOCK_PLAYERS,
  MOCK_PARTICIPANTS,
  MOCK_EVENTS,
} from "@/config/preview-fixtures";

/** 배포 갱신 식별용 빌드 스탬프 — Vercel 커밋 SHA (로컬은 "local"). */
const BUILD_STAMP = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

/** 시점 전환용 — 각기 다른 밤 UI 를 가진 대표 직업들. */
const ROLE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "citizen", label: "시민 (밤 취침)" },
  { id: "demon", label: "대악마 (처치·낙인·채팅)" },
  { id: "gain", label: "가인 (악마 채팅만)" },
  { id: "habreterus", label: "하브레터스 (치료)" },
  { id: "dordan", label: "도르단 (조사)" },
  { id: "romaz", label: "로마즈 (용의자 색출)" },
  { id: "mizlet", label: "미즐렛 (부활)" },
  { id: "seika", label: "세이카 (봉인)" },
  { id: "pasua", label: "파스아 (포교·중립)" },
];

function renderPhasePreview(
  key: string,
  me: PlayerSummary,
  players: PlayerSummary[],
): React.ReactNode {
  switch (key) {
    case "lobby":
      return (
        <LobbyPhase
          session={MOCK_SESSION}
          match={{ ...MOCK_MATCH, status: "lobby" }}
          players={players}
          myPlayer={me}
          gameJwt="preview"
          onLeave={() => {}}
        />
      );
    case "role_assign":
      return (
        <RoleAssignPhase
          players={players}
          myPlayer={me}
          events={[{ id: "e-role", event_type: "role_assigned", payload: { role: me.role, faction: me.faction } }]}
          matchId="preview"
          gameJwt={null}
        />
      );
    case "role_select_demon":
      // 변종 선택(라이브: match-start 가 pendingSelection private 이벤트로 전달,
      // role_assign 30초 창 안에서 4지선다 → 미선택 시 랜덤 폴백). preview 목
      // 이벤트에 pendingSelection 이 없어 이 흐름이 안 보이던 것을 보강 (2026-06-12).
      return (
        <RoleAssignPhase
          players={players}
          myPlayer={me}
          events={[{
            id: "e-role-select",
            event_type: "role_assigned",
            payload: {
              role: "demon",
              faction: "demon",
              pendingSelection: { kind: "demon", pool: ["demon", "phantom", "malen", "besto"] },
            },
          }]}
          matchId="preview"
          gameJwt={null}
        />
      );
    case "role_select_helper":
      return (
        <RoleAssignPhase
          players={players}
          myPlayer={me}
          events={[{
            id: "e-helper-select",
            event_type: "role_assigned",
            payload: {
              role: "gain",
              faction: "demon",
              pendingSelection: { kind: "helper", pool: ["gain", "luna", "logen", "ellen"] },
            },
          }]}
          matchId="preview"
          gameJwt={null}
        />
      );
    case "night":
      return (
        <NightPhase
          match={{ ...MOCK_MATCH, status: "night" }}
          players={players}
          myPlayer={me}
          gameJwt="preview"
          dayNumber={2}
          statusDockInline
        />
      );
    case "night_suspect":
      return (
        <SuspicionPhase
          match={{ ...MOCK_MATCH, status: "night_suspect" }}
          players={players}
          myPlayer={me}
          gameJwt="preview"
        />
      );
    case "day":
      return (
        <DayPhase
          match={{ ...MOCK_MATCH, status: "day" }}
          players={players}
          events={MOCK_EVENTS.dayAfterDeath}
          myPlayer={me}
          gameJwt="preview"
          phaseEndsAt={new Date(Date.now() + 90_000).toISOString()}
        />
      );
    case "vote":
      return (
        <VotePhase
          match={{ ...MOCK_MATCH, status: "vote" }}
          players={players}
          myPlayer={me}
          gameJwt="preview"
        />
      );
    case "verdict":
      return (
        <VerdictPhase
          match={{ ...MOCK_MATCH, status: "verdict" }}
          players={players}
          myPlayer={me}
          gameJwt="preview"
          events={MOCK_EVENTS.verdictExecuted}
        />
      );
    case "ended":
      return (
        <ResultPhase
          match={{ ...MOCK_MATCH, status: "ended", winner: "angels" }}
          players={players}
          events={MOCK_EVENTS.gameEnded}
        />
      );
    default:
      return null;
  }
}

/** publicFlowSteps + internal 페이즈(변종 선택·의심)를 끼운 작업대 전용 시퀀스. */
const PREVIEW_STEPS: Array<{ key: string; label: string; detail: string }> = (() => {
  const steps: Array<{ key: string; label: string; detail: string }> = [];
  for (const step of GOMDORI_RULES.publicFlowSteps) {
    steps.push(step);
    if (step.key === "role_assign") {
      // 악마/조력자 슬롯만 보는 변종 선택 — 같은 role_assign 창의 다른 얼굴.
      steps.push({
        key: "role_select_demon",
        label: "변종 선택 (악마)",
        detail: "악마 슬롯은 4직업 중 변종 선택 — 미선택 시 랜덤",
      });
      steps.push({
        key: "role_select_helper",
        label: "변종 선택 (조력자)",
        detail: "조력자 슬롯은 4직업 중 선택 — role_assign 30초 창",
      });
    }
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
  me,
  interactive,
  children,
}: {
  index: number;
  toneKey: string;
  title: string;
  detail: string;
  me: PlayerSummary;
  interactive: boolean;
  children: React.ReactNode;
}) {
  const tone = PHASE_TONES[toneKey as keyof typeof PHASE_TONES];
  const moodLabel = tone?.mood === "light" ? "낮 무드" : "밤 무드";
  const showDock = toneKey !== "lobby" && toneKey !== "night";
  const hideRole = toneKey === "role_assign";
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
      <div className="border-b border-white/10 bg-white/[0.02] px-5 py-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-xs text-white/35">{String(index).padStart(2, "0")}</span>
          <span className="font-medium text-white">{title}</span>
          <span className="text-xs text-white/40">— {detail}</span>
          <span className="ml-auto rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">
            {moodLabel}
          </span>
        </div>
      </div>
      <div
        className={`relative flex h-[560px] flex-col overflow-auto ${interactive ? "" : "pointer-events-none"} ${
          tone?.bg ?? "bg-[#070712]"
        } ${tone?.mood === "light" ? "text-[#2b2118]" : "text-white"}`}
      >
        {/* 실게임 GameFrame 과 같은 앰비언트 배경(별·키아트) — 단일 출처 GameBackdrop. */}
        <GameBackdrop status={toneKey} keyArt={toneKey === "lobby" ? "dim" : false} embedded />
        {/* 콘텐츠·독은 absolute 배경 위로(z-10). */}
        <div className="relative z-10 flex flex-1 flex-col">
          <div className="flex-1">{children}</div>
          {showDock ? (
            <StatusDock
              status={toneKey}
              dayNumber={hideRole ? undefined : 2}
              phaseEndsAt={toneKey === "day" ? new Date(Date.now() + 90_000).toISOString() : null}
              myRole={hideRole ? undefined : me.role ?? undefined}
              myFaction={me.faction ?? undefined}
              myName={me.displayName}
              myAvatarUrl={me.avatarUrl}
              dayAdjust={toneKey === "day" && me.alive ? { matchId: "preview", gameJwt: "preview" } : null}
              inline
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function GamePreviewPage() {
  const [role, setRole] = useState<string>("demon");
  const [alive, setAlive] = useState(true);
  const [interactive, setInteractive] = useState(true);

  const faction = roleMeta(role)?.faction ?? "angel";
  const me: PlayerSummary = { ...MOCK_PLAYERS[0], role, faction, alive };
  const players: PlayerSummary[] = [me, ...MOCK_PLAYERS.slice(1)];

  return (
    <DisplayProvider scaleRoot={false}>
      <main className="min-h-screen bg-[#11131a] text-white">
        <header className="border-b border-white/10 px-6 py-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-xs uppercase tracking-widest text-white/35">Gomdori Mafia · Preview</div>
            <h1 className="mt-1 text-2xl font-semibold">디자인 작업대 — 상호작용형</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              내 직업·생존을 바꾸고 직접 눌러보며 전체 흐름을 확인하세요. 무대 토큰을{" "}
              <strong className="text-white/80">짧게 탭</strong>하면 정체 추측 시트,{" "}
              <strong className="text-white/80">끌면</strong> 위치 이동, 하단 독을 탭하면 내 직업·능력,
              밤의 악마 채팅 시트엔 미열람 배지가 뜹니다. 서버가 필요한 버튼(투표 확정 등)은 동작하지 않습니다.
            </p>

            {/* 시점·상호작용 컨트롤 */}
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              <label className="flex items-center gap-2 text-xs text-white/55">
                내 직업
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-md border border-white/12 bg-black/40 px-2 py-1 text-sm text-white focus:border-white/30 focus:outline-none"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="inline-flex overflow-hidden rounded-md border border-white/12 text-xs">
                <button
                  type="button"
                  onClick={() => setAlive(true)}
                  className={`px-3 py-1 ${alive ? "bg-emerald-400/20 text-emerald-200" : "text-white/55 hover:bg-white/[0.06]"}`}
                >
                  생존
                </button>
                <button
                  type="button"
                  onClick={() => setAlive(false)}
                  className={`px-3 py-1 ${!alive ? "bg-rose-400/20 text-rose-200" : "text-white/55 hover:bg-white/[0.06]"}`}
                >
                  사망(관전)
                </button>
              </div>

              <label className="ml-auto flex items-center gap-2 text-xs text-white/55">
                <input
                  type="checkbox"
                  checked={interactive}
                  onChange={(e) => setInteractive(e.target.checked)}
                  className="h-4 w-4 accent-emerald-400"
                />
                상호작용
              </label>
            </div>

            <div className="mt-3 text-xs text-white/40">
              데이터: <code className="font-mono">src/config/preview-fixtures.ts</code> · 빌드:{" "}
              <code className="font-mono">{BUILD_STAMP}</code>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
          {/* 00 — Feign 최소구조: 토큰이 무대를 배회. 탭=정체추측 시트 시연. */}
          <PreviewSection
            index={0}
            toneKey="lobby"
            title="무대 최소구조 (Feign)"
            detail="아바타 토큰이 배회 — 탭하면 정체 추측 시트가 올라온다"
            me={me}
            interactive={interactive}
          >
            <div className="m-auto w-full max-w-3xl px-6 py-10">
              <GameStage
                players={players}
                myUserId={me.userId}
                mood="dark"
                roam
                chrome={false}
                inspectable
                matchId="preview"
              />
              <p className="mt-4 text-center text-xs text-white/35">
                토큰을 탭하면 진영·직업을 추측·저장하는 시트가 열립니다 (로컬 저장).
              </p>
            </div>
          </PreviewSection>

          {/* 01 — 진입(랜딩) */}
          <PreviewSection
            index={1}
            toneKey="landing"
            title="랜딩 (진입)"
            detail="게임 만들기 / 참가하기 — 모인 사람들이 입장 전부터 무대에 선다"
            me={me}
            interactive={interactive}
          >
            <div className="m-auto flex w-full justify-center p-6">
              <LandingScreen
                openMatches={[{ ...MOCK_MATCH, status: "lobby" }]}
                playerCounts={{ [MOCK_MATCH.id]: 3 }}
                participants={MOCK_PARTICIPANTS}
                myUserId={me.userId}
                onCreate={() => {}}
                onJoin={() => {}}
              />
            </div>
          </PreviewSection>

          {PREVIEW_STEPS.map((step, index) => (
            <PreviewSection
              key={step.key}
              index={index + 2}
              // 변종 선택은 role_assign 창의 다른 얼굴 — 같은 톤·독 규칙을 쓴다.
              toneKey={step.key.startsWith("role_select") ? "role_assign" : step.key}
              title={step.label}
              detail={step.detail}
              me={me}
              interactive={interactive}
            >
              {renderPhasePreview(step.key, me, players)}
            </PreviewSection>
          ))}
        </div>

        <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/35">
          Gomdori Mafia · 디자인 작업대 · 빌드 <code className="font-mono">{BUILD_STAMP}</code> · 실 게임은
          Discord Activity 안에서 <code className="font-mono">/게임</code>
        </footer>
      </main>
    </DisplayProvider>
  );
}
