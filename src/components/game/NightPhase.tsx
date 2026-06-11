"use client";

/**
 * NightPhase — 밤도 무대다 (무대화).
 *
 * 2026-06-12 개편:
 * - ActionModal 대신 자신의 프로필/능력 선택 패널을 In-flow 카드로 통합.
 * - 자신의 프로필을 클릭하면 능력 목록이 토글됨.
 * - 능력을 선택한 상태에서 주민을 지정하면 즉시 능력 대상 낙인(Stamp)을 찍고 백엔드로 제출.
 * - 먼저 주민을 지목하면, 자신의 프로필/능력 리스트가 열려 능력을 선택하게 하고 선택 완료 시 즉시 낙인을 찍고 전송.
 * - 교체 가능.
 */

import { useState, useEffect, useRef } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction, sendChat } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { GLOW } from "@/config/design-tokens";
import { roleLabel, roleMeta, isDemonTeamRole } from "@/config/gomdori-roles";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";
import { GameStage } from "@/components/game/ui/GameStage";
import { BottomSheet } from "@/components/game/ui/BottomSheet";

type NightPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events?: Array<{ id: string; event_type: string; created_at: string; payload?: Record<string, unknown> }>;
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

  // 치료 계열 — 자기 자신 포함 보호.
  if (role === "doctor" || role === "habreterus") {
    return [{
      actionType: "doctor_heal",
      label: meta?.night?.label ?? "치료하기",
      prompt: meta?.night?.prompt ?? "오늘 밤 공격으로부터 보호할 사람을 고르세요. (자기 자신 포함)",
      confirm: true,
      eligible: (p) => p.alive,
    }];
  }

  // 부활 계열 — 탈락자만 지목.
  if (role === "mizlet" || role === "helen") {
    return [{
      actionType: meta?.night?.actionType ?? `${role}_revive`,
      label: meta?.night?.label ?? "되살리기",
      prompt: meta?.night?.prompt ?? "되살릴 탈락자를 고르세요.",
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
  if (meta?.night) {
    return [{
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      confirm: true,
      eligible: aliveNotMe,
    }];
  }

  return [];
}

export function NightPhase({ match, players, myPlayer, gameJwt, events }: NightPhaseProps) {
  // 의심 투표 결과(W1)
  const suspicionEvent = (events ?? []).find((e) => e.event_type === "suspicion_revealed");
  const suspectedUserId = (suspicionEvent?.payload?.user_id as string | null | undefined) ?? null;
  const iAmSuspected = !!suspectedUserId && suspectedUserId === myPlayer?.userId;

  const role = myPlayer?.role;
  const abilities = buildAbilities(role, myPlayer?.userId);
  const mainType = abilities[0]?.actionType ?? null;

  const [activeType, setActiveType] = useState<string | null>(null);
  const currentType = activeType ?? mainType;
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

  useEffect(() => {
    if (!role || !isDemonTeamRole(role) || !match.id || !gameJwt) return;

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
  }, [match.id, role, gameJwt]);

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

      const { data: actionData, error: actionError } = await supabase
        .schema("mafia")
        .from("match_actions")
        .select("*")
        .eq("phase_id", phaseId)
        .eq("actor_user_id", myPlayer?.userId)
        .maybeSingle();

      if (cancelled || actionError || !actionData) return;

      const restoredType =
        typeof actionData.action_type === "string" ? actionData.action_type : null;
      const key = restoredType ?? buildAbilities(role, myPlayer?.userId)[0]?.actionType;
      if (key) {
        setSelectedMap((m) => ({ ...m, [key]: actionData.target_user_id }));
        setDoneMap((m) => ({ ...m, [key]: true }));
      }

      if ((role === "police" || role === "dordan") && actionData.result) {
        const resultObj = actionData.result as { investigationResult?: string } | null;
        if (resultObj?.investigationResult) {
          setInvestigationResult(resultObj.investigationResult);
        }
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

  const demonChat = role && isDemonTeamRole(role) && myPlayer?.alive;

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

  if (!myPlayer || !myPlayer.alive) {
    return (
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center p-5 pb-24">
        <GameStage players={players} myUserId={myPlayer?.userId} mood="dark" inspectable matchId={match.id} movable />
        <BottomSheet title="관전 피드">
          <p className="text-sm text-white/55">당신은 사망했습니다. 다른 플레이어들의 행동을 지켜보세요.</p>
          <SpectatorFeed events={events} players={players} />
        </BottomSheet>
      </div>
    );
  }

  // --- 메인 렌더링 쉘 (무대 및 컨트롤 패널 통합) ---
  const activeTargetId = currentType ? selectedMap[currentType] ?? null : null;

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center p-5 pb-24">
      <GameStage
        players={players}
        myUserId={myPlayer.userId}
        mood="dark"
        inspectable
        matchId={match.id}
        selectable={!isFirstNight && !iAmSuspected}
        canSelect={current ? current.eligible : undefined}
        selectedId={activeTargetId}
        abilityTargetId={activeTargetId}
        selectedGlow={GLOW.selectNight}
        disabled={busy}
        onSelect={(id) => {
          if (id === myPlayer.userId) {
            if (current && current.eligible(myPlayer)) {
              // 자신에게 능력 사용이 가능하면 즉시 제출
              handleSubmit(current, id);
            } else {
              setShowMyProfile(!showMyProfile);
            }
          } else {
            // 다른 주민을 지목했을 때
            if (current) {
              // 이미 능력이 선택된 상태라면 즉시 제출 및 낙인
              handleSubmit(current, id);
            } else {
              // 능력이 선택되지 않은 상태라면 임시 타겟으로 저장하고 프로필 패널 띄우기
              setPendingTarget(id);
              setShowMyProfile(true);
            }
          }
        }}
      />

      {/* 내 프로필 및 능력 선택 패널 (In-flow) */}
      <div className="mt-6 w-full max-w-md mx-auto rounded-2xl border p-5 shadow-sm bg-[#15131e]/90 backdrop-blur-md border-white/10 text-white">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/45">
            내 프로필 & 밤의 능력
          </div>
          <button
            type="button"
            onClick={() => setShowMyProfile(!showMyProfile)}
            className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded transition"
          >
            {showMyProfile ? "접기" : "자세히 보기"}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3 text-left">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06] text-sm font-semibold text-white">
            {myPlayer.avatarUrl ? (
              <img src={myPlayer.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (myPlayer.displayName.trim()[0] ?? "?").toUpperCase()
            )}
          </span>
          <div>
            <div className="text-sm font-semibold">{myPlayer.displayName}</div>
            <div className="text-xs text-white/50">{roleLabel(role)} ({myPlayer.alive ? "생존" : "사망"})</div>
          </div>
        </div>

        {isFirstNight ? (
          <div className="mt-4 border-t border-white/10 pt-4 text-center text-sm text-white/40">
            {GOMDORI_RULES.firstNight.silentMessage}
          </div>
        ) : iAmSuspected ? (
          <div className="mt-4 border-t border-white/10 pt-4 text-center text-sm text-rose-300">
            의심자로 지목받아 이번 밤 능력을 사용할 수 없습니다.
          </div>
        ) : (
          <>
            {/* 능력 선택 영역 */}
            {(showMyProfile || !currentType) && (
              <div className="mt-4 border-t border-white/10 pt-4 text-left">
                <div className="text-xs font-semibold text-white/45 mb-2">능력 선택 및 작동</div>
                {abilities.length === 0 ? (
                  <p className="text-xs text-white/40">오늘 밤 사용할 수 있는 능력이 없습니다.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {abilities.map((a) => {
                      const isSelected = a.actionType === currentType;
                      const isDone = doneMap[a.actionType];
                      return (
                        <div
                          key={a.actionType}
                          className={`w-full rounded-xl border p-3 text-left transition flex items-center justify-between ${
                            isSelected
                              ? "border-rose-500/50 bg-rose-500/10 text-rose-100"
                              : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/[0.06]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveType(a.actionType);
                              setActionError(null);
                              if (a.self) {
                                handleSelfSubmit(a);
                              } else if (pendingTarget) {
                                handleSubmit(a, pendingTarget);
                                setPendingTarget(null);
                              }
                            }}
                            className="flex-1 text-left focus:outline-none"
                          >
                            <div className="text-xs font-semibold">{a.label}</div>
                            <div className="text-[10px] text-white/40 mt-0.5">{a.prompt}</div>
                          </button>

                          {a.self ? (
                            <button
                              type="button"
                              disabled={busy || isDone}
                              onClick={() => handleSelfSubmit(a)}
                              className="ml-2 shrink-0 rounded bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/35 transition"
                            >
                              {isDone ? "완료 ✓" : "사용"}
                            </button>
                          ) : (
                            isDone && <span className="text-xs text-emerald-400 shrink-0 ml-2">완료 ✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 현재 상태 정보 영역 */}
            <div className="mt-4 border-t border-white/10 pt-3 text-center text-xs text-white/55">
              {investigationResult ? (
                <div className={`rounded-xl border p-3 text-center ${
                  investigationResult === "demon" ? "border-rose-400/20 bg-rose-950/20 text-rose-300" : "border-emerald-400/20 bg-emerald-950/20 text-emerald-300"
                }`}>
                  조사 결과: <span className="font-bold">{investigationResult === "demon" ? "악마입니다!" : "악마가 아닙니다."}</span>
                </div>
              ) : currentType && selectedMap[currentType] ? (
                <p>
                  지목 대상: <span className="font-bold text-rose-300">{players.find(p => p.userId === selectedMap[currentType])?.displayName}님</span> (낙인 완료, 교체 가능)
                </p>
              ) : pendingTarget ? (
                <p>
                  선택한 주민: <span className="font-bold text-amber-300">{players.find(p => p.userId === pendingTarget)?.displayName}님</span> — 능력을 골라 낙인을 찍으세요.
                </p>
              ) : (
                <p>무대 위의 캐릭터를 지목하거나, 나를 눌러 능력을 먼저 선택해 낙인을 찍으세요.</p>
              )}
            </div>

            {actionError ? (
              <p role="alert" className="mt-2 text-xs text-rose-400 text-center">
                {actionError}
              </p>
            ) : null}
          </>
        )}
      </div>

      {demonChat ? (
        <BottomSheet title="악마의 속삭임" badge={unreadChats} onOpenChange={setChatOpen}>
          {chatPanel}
        </BottomSheet>
      ) : null}
    </div>
  );
}
