"use client";

import { useState, useEffect, useRef } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction, sendChat } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { PHASE_TONES, SURFACE } from "@/config/design-tokens";
import { roleLabel, roleMeta, isDemonTeamRole } from "@/config/gomdori-roles";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";
import { Button } from "@/components/game/ui/Button";

type NightPhaseProps = {
  match: MatchSummary;
  players: PlayerSummary[];
  myPlayer: PlayerSummary | null;
  gameJwt: string;
  events?: Array<{ id: string; event_type: string; created_at: string; payload?: Record<string, unknown> }>;
};

type ChatRow = { id: string; sender_user_id: string; message: string; created_at?: string; };

// 보조 밤 능동(예: 팬텀 처치+봉인) — 메인 액션과 독립된 상태/제출. 자기 선택·확정만 관리.
function SecondaryAbility({
  matchId, gameJwt, targets, actionType, label, prompt,
}: {
  matchId: string;
  gameJwt: string;
  targets: PlayerSummary[];
  actionType: string;
  label: string;
  prompt: string;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!sel) return;
    setBusy(true);
    setErr(null);
    try {
      await submitAction(matchId, actionType, sel, gameJwt);
      setDone(true);
    } catch {
      setErr("전송 실패. 다시 시도해줘.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <h3 className="text-sm font-semibold text-indigo-200/80">{label}</h3>
      <p className="mt-1 text-xs text-indigo-200/45">{prompt}</p>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {targets.map((p) => (
          <button
            key={p.userId}
            type="button"
            onClick={() => { if (!done) setSel(p.userId); }}
            disabled={done}
            className={`rounded-md border p-3 text-center text-sm transition-colors ${
              sel === p.userId ? "border-indigo-400 bg-indigo-400/20 text-indigo-100" : "border-white/10 bg-black/20 text-white/70 hover:bg-white/5"
            } ${done ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="truncate">{p.displayName}</span>
          </button>
        ))}
      </div>
      {err ? <p role="alert" className="mt-3 text-sm text-rose-300">{err}</p> : null}
      <Button variant="primary" onClick={submit} disabled={!sel || busy || done} className="mt-4 w-full max-w-xs">
        {done ? "완료" : busy ? "전송 중..." : label}
      </Button>
    </div>
  );
}

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
  const [confirming, setConfirming] = useState(false);

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

      setSelectedTarget(actionData.target_user_id);
      setSubmitted(true);

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
          <SpectatorFeed events={events} players={players} />
        </div>
      </div>
    );
  }

  if (iAmSuspected) {
    return (
      <div className="flex h-full w-full items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-lg border border-rose-400/15 bg-rose-950/25 p-10 text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-rose-300/70">밤</h2>
          <h1 className="mt-6 text-2xl font-semibold text-rose-100">가장 의심받았습니다</h1>
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
          <div className="mb-4 rounded-md border border-amber-400/15 bg-amber-950/25 px-4 py-2 text-sm text-amber-200/80">
            의심 지목: <span className="font-semibold">{suspectedName}</span> — 이번 밤 능력 불가
          </div>
        ) : null}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {targets.map((p) => (
            <button
              key={p.userId}
              onClick={() => { if (!submitted) { setSelectedTarget(p.userId); setConfirming(false); } }}
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
        <div className="mt-8 flex flex-col items-center gap-3">
          {confirming && selectedTarget && !submitted ? (
            <div className="w-full max-w-xs rounded-md border border-amber-400/20 bg-amber-950/25 p-3 text-center">
              <p className="text-sm text-amber-100">
                <span className="font-semibold">{players.find((p) => p.userId === selectedTarget)?.displayName}</span> — 제출하면 되돌릴 수 없어요.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="primary" onClick={() => handleAction(actionType)} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "전송 중..." : "확정"}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={isSubmitting} className="flex-1">
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={() => setConfirming(true)}
              disabled={!selectedTarget || isSubmitting || submitted}
              className="w-full max-w-xs"
            >
              {submitted ? "결정 완료" : buttonText}
            </Button>
          )}
        </div>
        {actionError ? (
          <p role="alert" className="mt-4 text-center text-sm text-rose-300">{actionError}</p>
        ) : null}
      </div>
    );
  };

  // Roles rendering
  // 밤 능동 능력 없는 직업(취침): 시민/라이너/전향자 + 우노·아서·세이카·루루(패시브 천사).
  const SLEEP_ROLES = ["citizen", "rainer", "converted", "arthur", "luru"];
  if (role && SLEEP_ROLES.includes(role)) {
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

  // 치료 계열(의사 레거시 + 하브레터스) — 생존자 보호(doctor_heal).
  if (role === "doctor" || role === "habreterus") {
    const meta = roleMeta(role);
    const targets = players.filter((p) => p.alive);
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
        <div className="rounded-lg border border-emerald-400/15 bg-emerald-950/25 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-emerald-300/70 tracking-widest uppercase">{roleLabel(role)}</h2>
          <h1 className="mt-2 text-2xl font-semibold text-emerald-100">보호할 대상을 선택하세요</h1>
          <p className="mt-2 text-sm text-emerald-200/45">{meta?.night?.prompt ?? "오늘 밤 공격으로부터 보호할 사람을 고르세요. (자기 자신 포함)"}</p>
          {renderTargets(targets, "doctor_heal", meta?.night?.label ?? "치료하기")}
        </div>
      </div>
    );
  }

  // 부활(미즐렛/헬렌, v2) — 탈락한 대상을 되살린다.
  if (role === "mizlet" || role === "helen") {
    const meta = roleMeta(role);
    const targets = players.filter((p) => !p.alive);
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
        <div className="rounded-lg border border-emerald-400/15 bg-emerald-950/25 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-emerald-300/70 tracking-widest uppercase">{roleLabel(role)}</h2>
          <h1 className="mt-2 text-2xl font-semibold text-emerald-100">되살릴 대상을 선택하세요</h1>
          <p className="mt-2 text-sm text-emerald-200/45">{meta?.night?.prompt ?? "되살릴 탈락자를 고르세요."}</p>
          {targets.length === 0 ? (
            <p className="mt-6 text-sm text-white/40">아직 되살릴 탈락자가 없습니다.</p>
          ) : (
            renderTargets(targets, meta?.night?.actionType ?? "mizlet_revive", meta?.night?.label ?? "되살리기")
          )}
        </div>
      </div>
    );
  }

  // 투쟁(우노, v2) — 대상의 소속 카운트를 더한다.
  if (role === "uno") {
    const meta = roleMeta("uno");
    const targets = players.filter((p) => p.alive && p.userId !== myPlayer.userId);
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
        <div className="rounded-lg border border-amber-400/15 bg-amber-950/25 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-amber-300/70 tracking-widest uppercase">우노</h2>
          <h1 className="mt-2 text-2xl font-semibold text-amber-100">투쟁할 대상을 선택하세요</h1>
          <p className="mt-2 text-sm text-amber-200/50">{meta?.night?.prompt}</p>
          {renderTargets(targets, "uno_struggle", meta?.night?.label ?? "투쟁")}
        </div>
      </div>
    );
  }

  // 봉인(세이카 초신성, v2) — 그 밤 대상의 능력을 막는다.
  if (role === "seika") {
    const meta = roleMeta("seika");
    const targets = players.filter((p) => p.alive && p.userId !== myPlayer.userId);
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
        <div className="rounded-lg border border-indigo-400/15 bg-indigo-950/25 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-indigo-300/70 tracking-widest uppercase">세이카</h2>
          <h1 className="mt-2 text-2xl font-semibold text-indigo-100">봉인할 대상을 선택하세요</h1>
          <p className="mt-2 text-sm text-indigo-200/50">{meta?.night?.prompt}</p>
          {renderTargets(targets, "seika_supernova", meta?.night?.label ?? "초신성")}
        </div>
      </div>
    );
  }

  // 조사 계열(경찰 레거시 + 도르단 탐정) — 같은 police_investigate 액션.
  if (role === "police" || role === "dordan") {
    const targets = players.filter((p) => p.alive && p.userId !== myPlayer.userId);
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
        <div className="rounded-lg border border-sky-400/15 bg-sky-950/25 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-sky-300/70 tracking-widest uppercase">{roleLabel(role)}</h2>
          <h1 className="mt-2 text-2xl font-semibold text-sky-100">조사할 대상을 선택하세요</h1>
          <p className="mt-2 text-sm text-sky-200/50">오늘 밤 정체를 알아볼 사람을 고르세요.</p>
          
          {investigationResult ? (
            <div className={`mt-8 p-6 rounded-lg text-center ${investigationResult === 'demon' ? 'bg-rose-950/30 border border-rose-400/25' : 'bg-emerald-950/30 border border-emerald-400/25'}`}>
              <div className="text-sm opacity-70 mb-2">조사 결과</div>
              <div className={`text-2xl font-bold ${investigationResult === 'demon' ? 'text-rose-300' : 'text-emerald-400'}`}>
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

  if (role === "romaz") {
    const meta = roleMeta("romaz");
    const targets = players.filter((p) => p.alive && p.userId !== myPlayer.userId);
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
        <div className="rounded-lg border border-amber-400/15 bg-amber-950/25 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-amber-300/70 tracking-widest uppercase">로마즈</h2>
          <h1 className="mt-2 text-2xl font-semibold text-amber-100">용의자를 지목하세요</h1>
          <p className="mt-2 text-sm text-amber-200/50">{meta?.night?.prompt}</p>
          {renderTargets(targets, "romaz_suspect", meta?.night?.label ?? "용의자 색출")}
        </div>
      </div>
    );
  }

  if (role === "pasua") {
    const meta = roleMeta("pasua");
    const targets = players.filter((p) => p.alive && p.userId !== myPlayer.userId);
    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-5">
        <div className="rounded-lg border border-violet-400/15 bg-violet-950/25 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-violet-300/70 tracking-widest uppercase">파스아</h2>
          <h1 className="mt-2 text-2xl font-semibold text-violet-100">포교할 대상을 선택하세요</h1>
          <p className="mt-2 text-sm text-violet-200/50">{meta?.night?.prompt}</p>
          {renderTargets(targets, "pasua_convert", meta?.night?.label ?? "포교하기")}
        </div>
      </div>
    );
  }

  if (isDemonTeamRole(role)) {
    const targets = players.filter((p) => p.alive && p.faction !== "demon");
    
    return (
      <div className="flex flex-col lg:flex-row h-full w-full max-w-6xl mx-auto p-5 gap-5">
        <div className="flex-1 rounded-lg border border-rose-400/15 bg-rose-950/25 p-6 sm:p-10">
          <h2 className="text-sm font-medium text-rose-300/70 tracking-widest uppercase">{roleLabel(role)}</h2>
          
          {roleMeta(role)?.night?.actionType === "demon_kill" ? (
            <>
              <h1 className="mt-2 text-2xl font-semibold text-rose-100">공격할 대상을 선택하세요</h1>
              <p className="mt-2 text-sm text-rose-200/50">조력자와 상의하여 오늘 밤 처치할 대상을 고르세요.</p>
              {renderTargets(targets, "demon_kill", "처치하기")}
              {roleMeta(role)?.night2 ? (
                <SecondaryAbility
                  matchId={match.id}
                  gameJwt={gameJwt}
                  targets={players.filter((p) => p.alive && p.userId !== myPlayer.userId)}
                  actionType={roleMeta(role)!.night2!.actionType}
                  label={roleMeta(role)!.night2!.label}
                  prompt={roleMeta(role)!.night2!.prompt}
                />
              ) : null}
            </>
          ) : roleMeta(role)?.night ? (
            // 능동 조력자(루나 변환·로건 무력화) — 처치는 못 하지만 자기 능력을 쓴다.
            <>
              <h1 className="mt-2 text-2xl font-semibold text-rose-100">당신은 {roleLabel(role)}입니다</h1>
              <p className="mt-2 text-sm text-rose-200/50">직접 공격할 수는 없지만, 당신의 능력을 사용하세요.</p>
              <SecondaryAbility
                matchId={match.id}
                gameJwt={gameJwt}
                targets={players.filter((p) => p.alive && p.userId !== myPlayer.userId)}
                actionType={roleMeta(role)!.night!.actionType}
                label={roleMeta(role)!.night!.label}
                prompt={roleMeta(role)!.night!.prompt}
              />
            </>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-semibold text-rose-100">당신은 {roleLabel(role)}입니다</h1>
              <p className="mt-2 text-sm text-rose-200/50">우측 채팅을 통해 악마와 상의하세요. 직접 공격할 수는 없습니다.</p>
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
        
        <div className="w-full lg:w-80 h-80 lg:h-auto rounded-lg border border-rose-500/15 bg-black/40 flex flex-col">
          <div className="p-4 border-b border-white/5 font-medium text-rose-200/80 text-sm">
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
                      isMe ? "bg-rose-500/20 text-rose-100 rounded-tr-sm" : "bg-white/10 text-white rounded-tl-sm"
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
              <p role="alert" className="mb-2 text-xs text-rose-300">{chatError}</p>
            ) : null}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="메시지 입력..."
                aria-label="악마 팀 채팅 메시지"
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
              />
              <button type="submit" disabled={!chatMessage.trim()} className="px-3 rounded bg-rose-500/20 text-rose-300 disabled:opacity-50 text-sm font-medium whitespace-nowrap">전송</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
