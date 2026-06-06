"use client";

import { useState, useEffect, useRef } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction, sendChat } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { PHASE_TONES, SURFACE } from "@/config/design-tokens";

type NightPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events?: Array<{ id: string; event_type: string; created_at: string; payload?: Record<string, unknown> }>;
};

type ChatRow = { id: string; sender_user_id: string; message: string; created_at?: string; };

export function NightPhase({ match, players, myPlayer, gameJwt, events }: NightPhaseProps) {
  // 의심 투표 결과(W1): events 는 최신순이라 첫 suspicion_revealed 가 이번 밤 것.
  const suspicionEvent = (events ?? []).find((e) => e.event_type === "suspicion_revealed");
  const suspectedUserId = (suspicionEvent?.payload?.user_id as string | null | undefined) ?? null;
  const suspectedName = suspectedUserId
    ? players.find((p) => p.userId === suspectedUserId)?.displayName ?? null
    : null;
  const iAmSuspected = !!suspectedUserId && suspectedUserId === myPlayer?.userId;
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isFirstNight, setIsFirstNight] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [investigationResult, setInvestigationResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState("");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const role = myPlayer?.role;

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
    if ((role !== "demon" && role !== "helper") || !match.id || !gameJwt) return;

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

      setSelectedTarget(actionData.target_user_id);
      setSubmitted(true);

      if (role === "police" && actionData.result) {
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

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isSubmitting) return;
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

  if (isFirstNight) {
    return (
      <div className={`flex h-full w-full items-center justify-center p-5 ${PHASE_TONES.night.bg}`}>
        <div className={SURFACE.statusBlock}>
          <h2 className={`text-sm font-medium tracking-widest uppercase ${PHASE_TONES.night.accent}`}>밤</h2>
          <h1 className="mt-6 text-2xl font-semibold text-white">{GOMDORI_RULES.firstNight.silentMessage}</h1>
          <p className="mt-4 text-sm text-white/40">첫 밤에는 능력을 사용할 수 없습니다. 아침을 기다리세요.</p>
        </div>
      </div>
    );
  }

  if (!myPlayer || !myPlayer.alive) {
    return (
      <div className="flex h-full w-full items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-lg border border-white/10 bg-white/[0.04] p-10 text-center">
          <h2 className="text-sm font-medium text-white/50 tracking-widest uppercase">밤</h2>
          <h1 className="mt-6 text-2xl font-semibold text-white">관전 모드</h1>
          <p className="mt-4 text-sm text-white/40">당신은 사망했습니다. 다른 플레이어들의 행동을 지켜보세요.</p>
        </div>
      </div>
    );
  }

  if (iAmSuspected) {
    return (
      <div className="flex h-full w-full items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-lg border border-red-500/20 bg-red-900/10 p-10 text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-red-300/70">밤</h2>
          <h1 className="mt-6 text-2xl font-semibold text-red-100">가장 의심받았습니다</h1>
          <p className="mt-4 text-sm text-white/50">이번 밤에는 능력을 사용할 수 없습니다. 아침을 기다리세요.</p>
        </div>
      </div>
    );
  }

  const handleAction = async (actionType: string) => {
    if (!selectedTarget) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await submitAction(match.id, actionType, selectedTarget, gameJwt);
      setSubmitted(true);
      if (res.investigationResult) {
        setInvestigationResult(res.investigationResult);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "행동 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTargets = (
    targets: PlayerSummary[],
    actionType: string,
    buttonText: string
  ) => {
    return (
      <div className="mt-8">
        {suspectedName ? (
          <div className="mb-4 rounded-md border border-amber-500/20 bg-amber-900/10 px-4 py-2 text-sm text-amber-200/80">
            의심 지목: <span className="font-semibold">{suspectedName}</span> — 이번 밤 능력 불가
          </div>
        ) : null}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {targets.map((p) => (
            <button
              key={p.userId}
              onClick={() => !submitted && setSelectedTarget(p.userId)}
              disabled={submitted}
              className={`rounded-md border p-4 text-center transition-colors ${
                selectedTarget === p.userId
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-100"
                  : "border-white/10 bg-black/20 text-white/70 hover:bg-white/5 hover:text-white"
              } ${submitted ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="truncate text-sm font-medium">{p.displayName}</div>
            </button>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => handleAction(actionType)}
            disabled={!selectedTarget || isSubmitting || submitted}
            className="h-12 w-full max-w-xs rounded-md bg-emerald-300 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
          >
            {submitted ? "결정 완료" : isSubmitting ? "전송 중..." : buttonText}
          </button>
        </div>
        {actionError ? (
          <p role="alert" className="mt-4 text-center text-sm text-red-300">{actionError}</p>
        ) : null}
      </div>
    );
  };

  // Roles rendering
  if (role === "citizen") {
    return (
      <div className="flex h-full w-full items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-lg border border-white/10 bg-white/[0.04] p-10 text-center">
          <h2 className="text-sm font-medium text-white/50 tracking-widest uppercase">밤이 되었습니다</h2>
          <h1 className="mt-6 text-2xl font-semibold text-white">당신은 잠들었습니다.</h1>
          <p className="mt-4 text-sm text-white/40">아침이 밝을 때까지 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (role === "doctor") {
    const targets = players.filter((p) => p.alive);
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-900/10 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-emerald-500/70 tracking-widest uppercase">의사</h2>
          <h1 className="mt-2 text-2xl font-semibold text-emerald-100">치료할 대상을 선택하세요</h1>
          <p className="mt-2 text-sm text-emerald-200/50">오늘 밤 마피아의 공격으로부터 보호할 사람을 고르세요. (자기 자신 포함)</p>
          {renderTargets(targets, "doctor_heal", "치료하기")}
        </div>
      </div>
    );
  }

  if (role === "police") {
    const targets = players.filter((p) => p.alive && p.userId !== myPlayer.userId);
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
        <div className="rounded-lg border border-blue-500/20 bg-blue-900/10 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-blue-500/70 tracking-widest uppercase">경찰</h2>
          <h1 className="mt-2 text-2xl font-semibold text-blue-100">조사할 대상을 선택하세요</h1>
          <p className="mt-2 text-sm text-blue-200/50">오늘 밤 정체를 알아볼 사람을 고르세요.</p>
          
          {investigationResult ? (
            <div className={`mt-8 p-6 rounded-lg text-center ${investigationResult === 'demon' ? 'bg-red-900/30 border border-red-500/30' : 'bg-emerald-900/30 border border-emerald-500/30'}`}>
              <div className="text-sm opacity-70 mb-2">조사 결과</div>
              <div className={`text-2xl font-bold ${investigationResult === 'demon' ? 'text-red-400' : 'text-emerald-400'}`}>
                {investigationResult === 'demon' ? '악마입니다!' : '악마가 아닙니다.'}
              </div>
            </div>
          ) : (
            renderTargets(targets, "police_investigate", "조사하기")
          )}
        </div>
      </div>
    );
  }

  if (role === "demon" || role === "helper") {
    const targets = players.filter((p) => p.alive && p.faction !== "demon");
    
    return (
      <div className="flex h-full w-full max-w-6xl mx-auto p-5 gap-5">
        <div className="flex-1 rounded-lg border border-red-500/20 bg-red-900/10 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-red-500/70 tracking-widest uppercase">{role === "demon" ? "악마" : "조력자"}</h2>
          
          {role === "demon" ? (
            <>
              <h1 className="mt-2 text-2xl font-semibold text-red-100">공격할 대상을 선택하세요</h1>
              <p className="mt-2 text-sm text-red-200/50">조력자와 상의하여 오늘 밤 처치할 대상을 고르세요.</p>
              {renderTargets(targets, "demon_kill", "처치하기")}
            </>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-semibold text-red-100">당신은 조력자입니다</h1>
              <p className="mt-2 text-sm text-red-200/50">우측 채팅을 통해 악마와 상의하세요. 직접 공격할 수는 없습니다.</p>
              <div className="mt-8 opacity-50 pointer-events-none">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {targets.map((p) => (
                    <div key={p.userId} className="rounded-md border border-white/10 bg-black/20 p-4 text-center text-white/70">
                      <div className="truncate text-sm font-medium">{p.displayName}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="w-80 rounded-lg border border-red-500/10 bg-black/40 flex flex-col hidden lg:flex">
          <div className="p-4 border-b border-white/5 font-medium text-red-200/80 text-sm">
            악마의 속삭임 (채팅)
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                대화를 시작하세요
              </div>
            ) : (
              chats.map(chat => {
                const isMe = chat.sender_user_id === myPlayer?.userId;
                const sender = players.find(p => p.userId === chat.sender_user_id)?.displayName || "알 수 없음";
                return (
                  <div key={chat.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && <div className="text-[10px] text-white/40 mb-1 pl-1">{sender}</div>}
                    <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] break-words ${
                      isMe ? "bg-red-500/20 text-red-100 rounded-tr-sm" : "bg-white/10 text-white rounded-tl-sm"
                    }`}>
                      {chat.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-white/5">
            {chatError ? (
              <p role="alert" className="mb-2 text-xs text-red-300">{chatError}</p>
            ) : null}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="메시지 입력..."
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
              />
              <button type="submit" disabled={!chatMessage.trim()} className="px-3 rounded bg-red-500/20 text-red-300 disabled:opacity-50 text-sm font-medium whitespace-nowrap">전송</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
