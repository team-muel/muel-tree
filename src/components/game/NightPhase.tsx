"use client";

/**
 * NightPhase — 밤도 무대다 (무대화, 2026-06-11).
 *
 * 능력 지정 = 무대(GameStage) 위 인물 직접 지목 + 창(ActionModal)에서 확정.
 * 다중 능력(팬텀 봉인·일식, 말렌 빙의, 베스토 변신)은 창 안의 능력 칩으로 전환 —
 * 각 능력은 독립 제출(기존 SecondaryAbility 의미 보존). 악마 채팅은 BottomSheet
 * (데스크톱 사이드 / 모바일 하단 시트). 서버 로직·복원·조사 결과 처리 동일.
 */

import { useState, useEffect, useRef } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction, sendChat } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { GLOW } from "@/config/design-tokens";
import { roleLabel, roleMeta, isDemonTeamRole } from "@/config/gomdori-roles";
import { SpectatorFeed } from "@/components/game/ui/SpectatorFeed";
import { Button } from "@/components/game/ui/Button";
import { GameStage } from "@/components/game/ui/GameStage";
import { ActionModal } from "@/components/game/ui/ActionModal";
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

/** 직업 → 밤 능력 목록 (manifest 기반, 의미는 기존 NightPhase 분기와 동일). */
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
  // 의심 투표 결과(W1): events 는 최신순이라 첫 suspicion_revealed 가 이번 밤 것.
  const suspicionEvent = (events ?? []).find((e) => e.event_type === "suspicion_revealed");
  const suspectedUserId = (suspicionEvent?.payload?.user_id as string | null | undefined) ?? null;
  const suspectedName = suspectedUserId
    ? players.find((p) => p.userId === suspectedUserId)?.displayName ?? null
    : null;
  const iAmSuspected = !!suspectedUserId && suspectedUserId === myPlayer?.userId;

  const role = myPlayer?.role;
  const abilities = buildAbilities(role, myPlayer?.userId);
  const mainType = abilities[0]?.actionType ?? null;

  const [activeType, setActiveType] = useState<string | null>(null);
  const currentType = activeType ?? mainType;
  const current = abilities.find((a) => a.actionType === currentType) ?? null;

  const [selectedMap, setSelectedMap] = useState<Record<string, string | null>>({});
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);
  const [isFirstNight, setIsFirstNight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [investigationResult, setInvestigationResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState("");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async (ability: NightAbility, target: string | null) => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await submitAction(match.id, ability.actionType, target, gameJwt);
      setDoneMap((m) => ({ ...m, [ability.actionType]: true }));
      setConfirming(false);
      if (res.investigationResult) {
        setInvestigationResult(res.investigationResult);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "행동 실패");
    } finally {
      setBusy(false);
    }
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
                {!isMe && <div className="mb-1 pl-1 text-[10px] text-white/40">{sender}</div>}
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

  const shell = (modal: React.ReactNode, opts?: { selectable?: boolean }) => (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center p-5 pb-24">
      <GameStage
        players={players}
        myUserId={myPlayer?.userId}
        mood="dark"
        selectable={opts?.selectable ?? false}
        canSelect={opts?.selectable && current ? current.eligible : undefined}
        selectedId={currentType ? selectedMap[currentType] ?? null : null}
        selectedGlow={GLOW.selectNight}
        disabled={busy || (currentType ? doneMap[currentType] : false)}
        onSelect={(id) => {
          if (!currentType) return;
          if (doneMap[currentType]) return;
          setSelectedMap((m) => ({ ...m, [currentType]: id }));
          setConfirming(false);
        }}
      />
      {modal}
      {demonChat ? <BottomSheet title="악마의 속삭임">{chatPanel}</BottomSheet> : null}
    </div>
  );

  // --- 특수 상태들 (무대는 유지, 창만 바뀐다) ---

  if (isFirstNight) {
    return shell(
      <ActionModal eyebrow="밤" title={GOMDORI_RULES.firstNight.silentMessage} mood="dark">
        <p className="mt-2 text-sm text-white/40">첫 밤에는 능력을 사용할 수 없습니다. 아침을 기다리세요.</p>
      </ActionModal>,
    );
  }

  if (!myPlayer || !myPlayer.alive) {
    return (
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center p-5 pb-24">
        <GameStage players={players} myUserId={myPlayer?.userId} mood="dark" />
        <BottomSheet title="관전 피드">
          <p className="text-sm text-white/55">당신은 사망했습니다. 다른 플레이어들의 행동을 지켜보세요.</p>
          <SpectatorFeed events={events} players={players} />
        </BottomSheet>
      </div>
    );
  }

  if (iAmSuspected) {
    return shell(
      <ActionModal eyebrow="밤" title="가장 의심받았습니다" mood="dark">
        <p className="mt-2 text-sm text-white/50">이번 밤에는 능력을 사용할 수 없습니다. 아침을 기다리세요.</p>
      </ActionModal>,
    );
  }

  const SLEEP_ROLES = ["citizen", "rainer", "converted"];
  if (role && SLEEP_ROLES.includes(role)) {
    return shell(
      <ActionModal eyebrow="밤이 되었습니다" title="당신은 잠들었습니다." mood="dark">
        <p className="mt-2 text-sm text-white/40">아침이 밝을 때까지 기다려주세요.</p>
      </ActionModal>,
    );
  }

  // --- 채팅 전용 조력자 (가인 등 — 밤 능동 없음) ---
  if (abilities.length === 0) {
    if (demonChat) {
      return shell(
        <ActionModal eyebrow={roleLabel(role)} title={`당신은 ${roleLabel(role)}입니다`} mood="dark" raised>
          <p className="mt-2 text-sm text-rose-200/60">
            직접 공격할 수는 없습니다. 채팅으로 악마와 상의하세요.
          </p>
        </ActionModal>,
      );
    }
    return shell(
      <ActionModal eyebrow="밤" title="조용한 밤입니다" mood="dark">
        <p className="mt-2 text-sm text-white/40">아침이 밝을 때까지 기다려주세요.</p>
      </ActionModal>,
    );
  }

  // --- 능력 행동 (무대 지목 + 창 확정) ---

  const sel = currentType ? selectedMap[currentType] ?? null : null;
  const done = currentType ? Boolean(doneMap[currentType]) : false;
  const selName = sel ? players.find((p) => p.userId === sel)?.displayName ?? null : null;
  const eligibleCount = current ? players.filter(current.eligible).length : 0;
  const showInvestigation = (role === "police" || role === "dordan") && investigationResult;

  const modalTitle = showInvestigation
    ? "조사 결과"
    : done
      ? "결정 완료"
      : current?.self
        ? current.label
        : selName
          ? `${selName} — ${current?.label}`
          : current?.prompt ?? "";

  const footer = showInvestigation ? null : current ? (
    current.self ? (
      <Button
        variant="primary"
        onClick={() => handleSubmit(current, null)}
        disabled={busy || done}
        className="w-full"
      >
        {done ? "완료" : busy ? "전송 중..." : current.label}
      </Button>
    ) : current.confirm ? (
      confirming && sel && !done ? (
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => handleSubmit(current, sel)} disabled={busy} className="flex-1">
            {busy ? "전송 중..." : "확정"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy} className="flex-1">
            취소
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={() => setConfirming(true)}
          disabled={!sel || busy || done || eligibleCount === 0}
          className="w-full"
        >
          {done ? "결정 완료" : current.label}
        </Button>
      )
    ) : (
      <Button
        variant="primary"
        onClick={() => handleSubmit(current, sel)}
        disabled={!sel || busy || done}
        className="w-full"
      >
        {done ? "완료" : busy ? "전송 중..." : current.label}
      </Button>
    )
  ) : null;

  return shell(
    <ActionModal eyebrow={roleLabel(role)} title={modalTitle} mood="dark" raised={Boolean(demonChat)} footer={footer}>
      {abilities.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {abilities.map((a) => (
            <button
              key={a.actionType}
              type="button"
              onClick={() => {
                setActiveType(a.actionType);
                setConfirming(false);
                setActionError(null);
              }}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                a.actionType === currentType
                  ? "border-rose-400/50 bg-rose-400/15 text-rose-100"
                  : "border-white/15 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
              }`}
            >
              {a.label}
              {doneMap[a.actionType] ? " ✓" : ""}
            </button>
          ))}
        </div>
      ) : null}

      {showInvestigation ? (
        <div
          className={`mt-4 rounded-xl border p-5 text-center ${
            investigationResult === "demon"
              ? "border-rose-400/25 bg-rose-950/40"
              : "border-emerald-400/25 bg-emerald-950/40"
          }`}
        >
          <div
            className={`text-xl font-bold ${
              investigationResult === "demon" ? "text-rose-300" : "text-emerald-300"
            }`}
          >
            {investigationResult === "demon" ? "악마입니다!" : "악마가 아닙니다."}
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-white/50">{current?.prompt}</p>
          {suspectedName ? (
            <p className="mt-2 rounded-md border border-amber-400/15 bg-amber-950/25 px-3 py-1.5 text-xs text-amber-200/80">
              의심 지목: <span className="font-semibold">{suspectedName}</span> — 이번 밤 능력 불가
            </p>
          ) : null}
          {current && !current.self && eligibleCount === 0 ? (
            <p className="mt-3 text-sm text-white/40">{current.emptyNote ?? "지목할 수 있는 대상이 없습니다."}</p>
          ) : null}
          {confirming && selName && !done ? (
            <p className="mt-3 rounded-md border border-amber-400/20 bg-amber-950/25 px-3 py-2 text-sm text-amber-100">
              <span className="font-semibold">{selName}</span> — 제출하면 되돌릴 수 없어요.
            </p>
          ) : null}
          {actionError ? (
            <p role="alert" className="mt-3 text-sm text-rose-300">
              {actionError}
            </p>
          ) : null}
        </>
      )}
    </ActionModal>,
    { selectable: !done && !showInvestigation },
  );
}
