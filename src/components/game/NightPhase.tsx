"use client";

/**
 * NightPhase — 밤도 무대다 (무대화).
 *
 * 2026-06-12 개편:
 * - 하단 직업 독(StatusDock)의 내 프로필 펼침 안에서 능력을 선택한다.
 * - 능력을 선택한 상태에서 주민을 지정하면 즉시 능력 대상 낙인(Stamp)을 찍고 백엔드로 제출.
 * - 먼저 주민을 지목하면, 하단 내 프로필을 열어 능력을 선택하게 하고 선택 완료 시 즉시 낙인을 찍고 전송.
 * - 교체 가능.
 */

import { useState, useEffect, useRef } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction, sendChat } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { GLOW } from "@/config/design-tokens";
import { roleMeta, isDemonTeamRole } from "@/config/gomdori-roles";
import { resolveMyStatusEffects } from "@/config/status-effects";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";
import { GameStage } from "@/components/game/ui/GameStage";
import { BottomSheet } from "@/components/game/ui/BottomSheet";
import { MyRolePanel } from "@/components/game/ui/MyRolePanel";
import { StatusDock } from "@/components/game/ui/StatusDock";

type NightPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events?: Array<{ id: string; event_type: string; created_at: string; payload?: Record<string, unknown> }>;
  phaseEndsAt?: string | null;
  dayNumber?: number;
  statusDockInline?: boolean;
};

type ChatRow = { id: string; sender_user_id: string; message: string; created_at?: string };

type NightAbility = {
  actionType: string;
  label: string;
  prompt: string;
  /** 자기 대상(변신/일식) — 대상 지목 없이 버튼만, target=null 제출. */
  self?: boolean;
  /** 두 단계 확정(메인 능력 — 제출 비가역 경고). */
  confirm?: boolean;
  /** 무대에서 지목 가능한 대상 조건. */
  eligible: (p: PlayerSummary) => boolean;
  emptyNote?: string;
};

/** 직업 → 밤 능력 목록 */
function buildAbilities(role: string | null | undefined, myUserId: string | null | undefined): NightAbility[] {
  if (!role) return [];
  const meta = roleMeta(role);
  const aliveNotMe = (p: PlayerSummary) => p.alive && p.userId !== myUserId;

  // 문자열(label/prompt/actionType)은 manifest 단일 출처 — 여기엔 대상 조건만 더한다.
  if (!meta?.night) return [];

  // 치료 계열 — 자기 자신 포함 보호.
  if (role === "doctor" || role === "habreterus") {
    return [{
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      confirm: true,
      eligible: (p) => p.alive,
    }];
  }

  // 부활 계열 — 탈락자만 지목.
  if (role === "mizlet" || role === "helen") {
    return [{
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      confirm: true,
      eligible: (p) => !p.alive,
      emptyNote: "아직 되살릴 탈락자가 없습니다.",
    }];
  }

  // 악마 처치자 — 메인 처치 + 보조 능력(봉인/일식/빙의/변신).
  if (isDemonTeamRole(role) && meta?.night?.kind === "kill") {
    const main: NightAbility = {
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      confirm: true,
      eligible: (p) => p.alive && p.faction !== "demon",
    };
    const extras: NightAbility[] = (meta.extraNights ?? []).map((extra) => ({
      actionType: extra.actionType,
      label: extra.label,
      prompt: extra.prompt,
      self: extra.self,
      eligible: aliveNotMe,
    }));
    return [main, ...extras];
  }

  // 능동 조력자(루나/로건/엘런) — 처치 없음, 직접 제출(기존 SecondaryAbility 의미).
  if (isDemonTeamRole(role) && meta?.night) {
    return [{
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      eligible: aliveNotMe,
    }];
  }

  // 일반 밤 능동(조사/용의자/잔불/투쟁/초신성/매료/포교 등) — manifest 단일 능력.
  // self 능동(라이너 백호 소환)도 지원 — 대상 그리드 없이 버튼만.
  if (meta?.night) {
    return [{
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      self: meta.night.self,
      confirm: true,
      eligible: aliveNotMe,
    }];
  }

  return [];
}

export function NightPhase({ match, players, myPlayer, gameJwt, events, phaseEndsAt, dayNumber, statusDockInline = false }: NightPhaseProps) {
  // 의심 투표 결과(W1)
  const suspicionEvent = (events ?? []).find((e) => e.event_type === "suspicion_revealed");
  const suspectedUserId = (suspicionEvent?.payload?.user_id as string | null | undefined) ?? null;
  const iAmSuspected = !!suspectedUserId && suspectedUserId === myPlayer?.userId;

  const role = myPlayer?.role;
  const abilities = buildAbilities(role, myPlayer?.userId);

  const myEffects = resolveMyStatusEffects(myPlayer?.userId, events ?? []);
  const isNightLocked = iAmSuspected || myEffects.includes("sealed");
  const lockReason = iAmSuspected
    ? "의심자로 지목받아 이번 밤 능력을 사용할 수 없습니다."
    : myEffects.includes("sealed")
      ? "🔇 어둠이 당신을 봉인했습니다! 이번 밤 능력을 사용할 수 없습니다."
      : null;

  const [activeType, setActiveType] = useState<string | null>(null);
  const currentType = activeType;
  const current = abilities.find((a) => a.actionType === currentType) ?? null;

  const [selectedMap, setSelectedMap] = useState<Record<string, string | null>>({});
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [isFirstNight, setIsFirstNight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [investigationResult, setInvestigationResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 자신의 프로필 패널 토글 및 선 지목 저장용 상태
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState("");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [seenChats, setSeenChats] = useState(0);
  const unreadChats = chatOpen ? 0 : Math.max(0, chats.length - seenChats);

  useEffect(() => {
    if (!match.id || !gameJwt) return;

    let cancelled = false;
    const supabase = getGameSupabase(gameJwt);

    supabase
      .schema("mafia")
      .from("match_phases")
      .select("phase_number")
      .eq("match_id", match.id)
      .eq("phase_type", "night")
      .is("ended_at", null)
      .order("phase_number", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) {
          setIsFirstNight(data.phase_number === 1 && GOMDORI_RULES.firstNight.skipsAbilities);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [match.id, gameJwt]);

  // 접선 회로(정본 2026-06-12): 채팅은 진영이 아니라 능력이 연다 — 가인(밤2까지)·
  // 로건(영구)만 circleChat=true. 팬텀 페어·루나·엘런·타락자는 회로 없음.
  const circleChat = myPlayer?.circleChat === true;

  useEffect(() => {
    if (!circleChat || !match.id || !gameJwt) return;

    let cancelled = false;
    const supabase = getGameSupabase(gameJwt);

    supabase.schema("mafia").from("match_chats")
      .select("*")
      .eq("match_id", match.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setChats(data as ChatRow[]);
      });

    const channel = supabase.channel(`night-chat-${match.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "mafia", table: "match_chats", filter: `match_id=eq.${match.id}` }, (payload) => {
        setChats(prev => [...prev, payload.new as ChatRow]);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [match.id, circleChat, gameJwt]);

  useEffect(() => {
    if (!match.id || !gameJwt || !myPlayer?.userId) return;

    let cancelled = false;
    const supabase = getGameSupabase(gameJwt);

    async function restoreAction() {
      const { data: phaseData, error: phaseError } = await supabase
        .schema("mafia")
        .from("match_phases")
        .select("id")
        .eq("match_id", match.id)
        .is("ended_at", null)
        .order("phase_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || phaseError || !phaseData) return;

      const phaseId = phaseData.id;

      const { data: actionRows, error: actionError } = await supabase
        .schema("mafia")
        .from("match_actions")
        .select("*")
        .eq("phase_id", phaseId)
        .eq("actor_user_id", myPlayer?.userId);

      if (cancelled || actionError || !actionRows) return;

      let firstRestoredType: string | null = null;
      for (const actionData of actionRows) {
        const restoredType =
          typeof actionData.action_type === "string" ? actionData.action_type : null;
        if (!restoredType) continue;
        firstRestoredType ??= restoredType;
        const restoredAbility = buildAbilities(role, myPlayer?.userId).find(
          (ability) => ability.actionType === restoredType,
        );
        const restoredTarget =
          actionData.target_user_id ?? (restoredAbility?.self ? myPlayer?.userId ?? null : null);
        setSelectedMap((m) => ({ ...m, [restoredType]: restoredTarget }));
        setDoneMap((m) => ({ ...m, [restoredType]: true }));

        if ((role === "police" || role === "dordan") && actionData.result) {
          const resultObj = actionData.result as { investigationResult?: string } | null;
          if (resultObj?.investigationResult) {
            setInvestigationResult(resultObj.investigationResult);
          }
        }
      }
      if (firstRestoredType) {
        setActiveType(firstRestoredType);
      }
    }

    restoreAction();

    return () => {
      cancelled = true;
    };
  }, [match.id, gameJwt, myPlayer?.userId, role]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  useEffect(() => {
    if (chatOpen) setSeenChats(chats.length);
  }, [chatOpen, chats.length]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const msg = chatMessage;
    setChatMessage("");
    setChatError(null);
    try {
      await sendChat(match.id, msg, gameJwt);
    } catch {
      setChatError("채팅 전송 실패");
      setChatMessage(msg);
    }
  };

  // 능력 즉시 제출 함수
  const handleSubmit = async (ability: NightAbility, target: string | null) => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await submitAction(match.id, ability.actionType, target, gameJwt);
      setDoneMap((m) => ({ ...m, [ability.actionType]: true }));
      setSelectedMap((m) => ({ ...m, [ability.actionType]: target }));
      if (res.investigationResult) {
        setInvestigationResult(res.investigationResult);
      }
      setPendingTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "행동 실패");
    } finally {
      setBusy(false);
    }
  };

  const handleSelfSubmit = async (ability: NightAbility) => {
    if (!myPlayer) return;
    await handleSubmit(ability, null);
    setSelectedMap((m) => ({ ...m, [ability.actionType]: myPlayer.userId }));
  };

  const demonChat = circleChat && myPlayer?.alive;

  const chatPanel = (
    <div className="flex h-72 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {chats.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-white/20">
            대화를 시작하세요
          </div>
        ) : (
          chats.map((chat) => {
            const isMe = chat.sender_user_id === myPlayer?.userId;
            const sender = players.find((p) => p.userId === chat.sender_user_id)?.displayName || "알 수 없음";
            return (
              <div key={chat.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && <div className="mb-1 pl-1 text-[0.625rem] text-white/40">{sender}</div>}
                <div
                  className={`max-w-[85%] break-words rounded-lg px-3 py-2 text-sm ${
                    isMe ? "rounded-tr-sm bg-rose-500/20 text-rose-100" : "rounded-tl-sm bg-white/10 text-white"
                  }`}
                >
                  {chat.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="border-t border-white/5 pt-3">
        {chatError ? (
          <p role="alert" className="mb-2 text-xs text-rose-300">{chatError}</p>
        ) : null}
        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="메시지 입력..."
            aria-label="악마 팀 채팅 메시지"
            className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-rose-500/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!chatMessage.trim()}
            className="whitespace-nowrap rounded bg-rose-500/20 px-3 text-sm font-medium text-rose-300 disabled:opacity-50"
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );

  const selectedTargetId = currentType ? selectedMap[currentType] ?? null : null;
  const stageSelectedId = selectedTargetId ?? pendingTarget;
  const selectedTargetName = selectedTargetId
    ? players.find((p) => p.userId === selectedTargetId)?.displayName
    : null;
  const pendingTargetName = pendingTarget
    ? players.find((p) => p.userId === pendingTarget)?.displayName
    : null;

  function selectAbility(ability: NightAbility) {
    if (isNightLocked) return;
    setActiveType(ability.actionType);
    setActionError(null);

    if (ability.self) {
      void handleSelfSubmit(ability);
      return;
    }

    if (!pendingTarget) return;

    const target = players.find((p) => p.userId === pendingTarget);
    if (!target || !ability.eligible(target)) {
      setActionError(ability.emptyNote ?? "선택한 능력으로는 그 대상을 지정할 수 없습니다.");
      return;
    }

    void handleSubmit(ability, pendingTarget);
  }

  function handleStageSelect(id: string) {
    if (isNightLocked) return;
    const target = players.find((p) => p.userId === id);
    if (!target || busy) return;

    if (id === myPlayer?.userId && !current) {
      setShowMyProfile(!showMyProfile);
      return;
    }

    if (!current) {
      setPendingTarget(id);
      setActionError(null);
      setShowMyProfile(true);
      return;
    }

    if (current.self) {
      setShowMyProfile(true);
      return;
    }

    if (!current.eligible(target)) {
      setPendingTarget(id);
      setActionError(current.emptyNote ?? "선택한 능력으로는 그 대상을 지정할 수 없습니다.");
      setShowMyProfile(true);
      return;
    }

    void handleSubmit(current, id);
  }

  // 접선 동료 — 회로가 열리면(circleKnown) 뷰가 상대 demon-faction 행의 정체를
  // 보여준다. 이벤트가 아니라 뷰 기반이라 재접속해도 유지. 루나·엘런은 안 보임(정본).
  const circleAlly = players.find(
    (p) => p.userId !== myPlayer?.userId && p.faction === "demon" && p.role,
  );

  const nightProfilePanel = role ? (
    <div className="space-y-4">
      {/* 평소엔 아래 "밤 능력" 상호작용 카드가 능력을 담당(같은 문자열 2회 반복 방지).
          첫 밤은 능력 사용 불가라 그 카드가 없으므로 정적 능력 프리뷰를 켠다 —
          새 직업을 받은 직후 자기 능력을 읽어볼 유일한 시간. */}
      <MyRolePanel role={role} faction={myPlayer?.faction ?? undefined} showAbilities={isFirstNight} />

      {circleAlly ? (
        <div className="rounded-xl border border-rose-300/15 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-100/80">
          <span aria-hidden="true" className="mr-1.5">{circleChat ? "🤝" : "👁️"}</span>
          같은 편 — <span className="font-semibold">{circleAlly.displayName}</span>
          {" "}({roleMeta(circleAlly.role)?.label ?? circleAlly.role})
          {circleChat ? "" : " · 접선 불가, 정체 통지만"}
        </div>
      ) : null}

      {isFirstNight ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-8 text-center backdrop-blur-md shadow-[0_0_24px_rgba(99,102,241,0.12)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-xl animate-pulse">
            🌙
          </div>
          <div>
            <h3 className="text-sm font-semibold text-indigo-200">고요한 첫 밤</h3>
            <p className="mt-2 text-xs leading-relaxed text-indigo-100/50">
              {GOMDORI_RULES.firstNight.silentMessage}
            </p>
          </div>
          <div className="h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-indigo-400"
              style={{
                animation: "first-night-fade 8s linear forwards",
                width: "100%",
              }}
            />
          </div>
        </div>
      ) : (
        <>
          {isNightLocked && lockReason ? (
            <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-center text-sm text-rose-200">
              {lockReason}
            </div>
          ) : null}
          <div className="border-t border-white/10 pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
              밤 능력
            </div>
            {abilities.length === 0 ? (
              <p className="text-xs text-white/40">오늘 밤 사용할 수 있는 능력이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {abilities.map((ability) => {
                  const isSelected = ability.actionType === currentType;
                  const isDone = doneMap[ability.actionType];
                  return (
                    <button
                      key={ability.actionType}
                      type="button"
                      disabled={busy || isNightLocked}
                      onClick={() => selectAbility(ability)}
                      className={`relative w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-rose-400/50 bg-rose-400/10 text-rose-100"
                          : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/[0.06]"
                      } ${busy || isNightLocked ? "opacity-45 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold">{ability.label}</span>
                        {isNightLocked ? (
                          <span className="shrink-0 text-[0.625rem] font-semibold text-rose-300">
                            🔒 잠김
                          </span>
                        ) : isDone ? (
                          <span className="shrink-0 text-[0.625rem] font-semibold text-emerald-300">
                            완료 · 교체 가능
                          </span>
                        ) : ability.self ? (
                          <span className="shrink-0 text-[0.625rem] font-semibold text-rose-200">
                            즉시 사용
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[0.625rem] leading-4 text-white/40">
                        {ability.prompt}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center text-xs text-white/55">
            {investigationResult ? (
              <span className={investigationResult === "demon" ? "text-rose-300" : "text-emerald-300"}>
                조사 결과: {investigationResult === "demon" ? "악마입니다." : "악마가 아닙니다."}
              </span>
            ) : selectedTargetName ? (
              <span>
                지목 대상: <span className="font-bold text-rose-300">{selectedTargetName}님</span> · 교체 가능
              </span>
            ) : pendingTargetName ? (
              <span>
                선택한 주민: <span className="font-bold text-amber-200">{pendingTargetName}님</span> · 능력을 고르면 즉시 낙인이 찍힙니다.
              </span>
            ) : current ? (
              <span>무대 위 대상을 선택하면 능력이 발동되고 낙인이 찍힙니다.</span>
            ) : (
              <span>능력을 먼저 고르거나 무대 위 대상을 눌러 이 패널을 여세요.</span>
            )}
          </div>

          {actionError ? (
            <p role="alert" className="text-center text-xs text-rose-300">
              {actionError}
            </p>
          ) : null}
        </>
      )}
    </div>
  ) : undefined;

  const nightDock = (
    <StatusDock
      status="night"
      dayNumber={dayNumber}
      phaseEndsAt={phaseEndsAt ?? null}
      myRole={role ?? undefined}
      myFaction={myPlayer?.faction ?? undefined}
      myName={myPlayer?.displayName}
      myAvatarUrl={myPlayer?.avatarUrl}
      inline={statusDockInline}
      expanded={showMyProfile}
      onExpandedChange={setShowMyProfile}
      profilePanel={nightProfilePanel}
    />
  );

  if (!myPlayer || !myPlayer.alive) {
    return (
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center py-5 pb-24">
        <GameStage
          players={players}
          myUserId={myPlayer?.userId}
          mood="dark"
          inspectable
          matchId={match.id}
          movable
          myEffects={myEffects}
        />
        <BottomSheet title="관전 피드">
          <p className="text-sm text-white/55">당신은 사망했습니다. 다른 플레이어들의 행동을 지켜보세요.</p>
          <SpectatorFeed events={events} players={players} />
        </BottomSheet>
        {nightDock}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center py-5 pb-24">
      <GameStage
        players={players}
        myUserId={myPlayer.userId}
        mood="dark"
        inspectable
        matchId={match.id}
        selectable={!isFirstNight && !isNightLocked && abilities.length > 0}
        canSelect={current ? current.eligible : (p) => p.alive}
        selectedId={stageSelectedId}
        abilityTargetId={selectedTargetId}
        selectedGlow={GLOW.selectNight}
        disabled={busy}
        onSelect={handleStageSelect}
        myEffects={myEffects}
      />

      {demonChat ? (
        <BottomSheet title="악마의 속삭임" badge={unreadChats} onOpenChange={setChatOpen}>
          {chatPanel}
        </BottomSheet>
      ) : null}
      {nightDock}
    </div>
  );
}
