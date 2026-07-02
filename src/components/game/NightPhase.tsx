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

import { useState, useEffect } from "react";
import type { MatchSummary, PlayerSummary } from "@/lib/game/api";
import { submitAction } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { GOMDORI_RULES } from "@/config/gomdori-rules";
import { GLOW } from "@/config/design-tokens";
import { roleMeta, isDemonTeamRole, roleOriginalAbilities } from "@/config/gomdori-roles";
import { resolveMyStatusEffects } from "@/config/status-effects";
import { GameStage } from "@/components/game/ui/GameStage";
import { BottomSheet } from "@/components/game/ui/BottomSheet";
import { MyRolePanel } from "@/components/game/ui/MyRolePanel";
import { StatusDock } from "@/components/game/ui/StatusDock";
import { MatchChat } from "@/components/game/ui/MatchChat";
import { TownChat } from "@/components/game/ui/TownChat";

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

  // 치료 계열 — 자기 자신 포함 보호. 하브레터스는 상호추리(extraNights) 보조 능력도.
  if (role === "doctor" || role === "habreterus") {
    const main: NightAbility = {
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      confirm: true,
      eligible: (p) => p.alive,
    };
    const extras: NightAbility[] = (meta.extraNights ?? []).map((extra) => ({
      actionType: extra.actionType,
      label: extra.label,
      prompt: extra.prompt,
      self: extra.self,
      confirm: true,
      eligible: aliveNotMe, // 상호추리 = 생존 대상(자기 제외)
    }));
    return [main, ...extras];
  }

  // 부활 계열 — 메인(부활)은 탈락자만. 헬렌은 생존자 수면(extraNights) 보조 능력도.
  if (role === "mizlet" || role === "helen") {
    const revive: NightAbility = {
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      confirm: true,
      eligible: (p) => !p.alive,
      emptyNote: "아직 되살릴 탈락자가 없습니다.",
    };
    const extras: NightAbility[] = (meta.extraNights ?? []).map((extra) => ({
      actionType: extra.actionType,
      label: extra.label,
      prompt: extra.prompt,
      confirm: true,
      self: extra.self, // 미즐렛 고급 와인 = 무대상(전원)
      // 탈락자 대상(헬렌 자유로운 새)은 죽은 자만, 임의 탈락자 허용(미즐렛 쿠키)은 생존자+탈락자,
      // 그 외 보조(수면/와인)는 생존자.
      eligible: extra.targetDead
        ? (p) => !p.alive
        : extra.allowDeadTarget
          ? (p) => p.userId !== myUserId
          : aliveNotMe,
      emptyNote: extra.targetDead ? "아직 되살릴 탈락자가 없습니다." : undefined,
    }));
    return [revive, ...extras];
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
  // 보조 능동(루나 고요한 적막 = self 충전)도 extraNights 로 표면화.
  if (isDemonTeamRole(role) && meta?.night) {
    const main: NightAbility = {
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      self: meta.night.self, // 엘런 박해 = 무대상(자기 투표 대상 따라감)
      eligible: aliveNotMe,
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

  // 일반 밤 능동(조사/용의자/잔불/투쟁/초신성/매료/포교 등) — manifest 단일 능력 + 보조 능력.
  // self 능동(라이너 백호 소환)과 비악마 듀얼 액션(파스아 포교+신앙, extraNights)도 표면화한다.
  // 모두 매니페스트 단일 출처.
  if (meta?.night) {
    const main: NightAbility = {
      actionType: meta.night.actionType,
      label: meta.night.label,
      prompt: meta.night.prompt,
      self: meta.night.self,
      confirm: true,
      eligible: aliveNotMe,
    };
    const extras: NightAbility[] = (meta.extraNights ?? []).map((extra) => ({
      actionType: extra.actionType,
      label: extra.label,
      prompt: extra.prompt,
      self: extra.self,
      confirm: true,
      eligible: aliveNotMe,
    }));
    return [main, ...extras];
  }

  return [];
}

export function NightPhase({ match, players, myPlayer, gameJwt, events, phaseEndsAt, dayNumber, statusDockInline = false }: NightPhaseProps) {
  // 의심 투표 결과(W1)
  const suspicionEvent = (events ?? []).find((e) => e.event_type === "suspicion_revealed");
  const suspectedUserId = (suspicionEvent?.payload?.user_id as string | null | undefined) ?? null;
  const iAmSuspected = !!suspectedUserId && suspectedUserId === myPlayer?.userId;

  // 일식의 밤 (vault canon 팬텀): backend phase_started 가 eclipse_active 를 실어 보낸다.
  // events 는 최신 우선 정렬이라 가장 가까운 phase_started 한 건만 읽으면 된다.
  const lastPhaseStarted = (events ?? []).find((e) => e.event_type === "phase_started");
  const eclipseNight = lastPhaseStarted?.payload?.eclipse_active === true;

  const role = myPlayer?.role;
  const abilities = buildAbilities(role, myPlayer?.userId);

  // 멀티타깃 지정 수 — manifest(maxTargets)에서만 끌어온다. 직업/숫자 하드코딩 없이 재사용.
  // 동적 상한(maxTargetsPerDay)은 dayNumber 로 성장(팬텀 어둠이 내린 도시 = 2 + (day-1)). dayNumber
  // 기반 하한 근사라 백엔드 실제 상한 이하만 허용 → 과대 선택 거부 없음(안전).
  const nightMeta = role ? roleMeta(role) : null;
  const dayIdx = Math.max(0, (dayNumber ?? 1) - 1);
  // 본인 동적 보너스(로건 부서진 펜던트 3+ → +2). 뷰 target_bonus(본인 전용)에서 온다.
  const selfTargetBonus = myPlayer?.targetBonus ?? 0;
  // 소나타(루루): '능력 지정 +1 전원' — 전역 1일 보너스(모든 능력 maxTargets 에 가산).
  const selfDayTargetBonus = myPlayer?.dayTargetBonus ?? 0;
  const dynMax = (m?: { maxTargets?: number; maxTargetsPerDay?: number; maxTargetsSelfBonus?: boolean }) =>
    m?.maxTargets ? m.maxTargets + (m.maxTargetsPerDay ?? 0) * dayIdx + (m.maxTargetsSelfBonus ? selfTargetBonus : 0) : undefined;
  const maxTargetsByAction: Record<string, number> = {};
  { const v = dynMax(nightMeta?.night); if (v) maxTargetsByAction[nightMeta!.night!.actionType] = v; }
  for (const ex of nightMeta?.extraNights ?? []) {
    const v = dynMax(ex);
    if (v) maxTargetsByAction[ex.actionType] = v;
  }
  const maxTargetsFor = (actionType: string) => (maxTargetsByAction[actionType] ?? 1) + selfDayTargetBonus;
  // C — 동적 타깃수 피드백: 현재 상한이 능력 '기본'보다 늘었으면 그 차이를 드러낸다.
  // 기본 = manifest maxTargets(없으면 1). 보너스 = 일자성장 + 본인강화(펜던트) + 소나타 등.
  // 직업/숫자 하드코딩 없이 일반 도출 — 늘어난 사실 자체를 무대에서 읽히게.
  const baseMaxByAction: Record<string, number> = {};
  if (nightMeta?.night?.maxTargets) baseMaxByAction[nightMeta.night.actionType] = nightMeta.night.maxTargets;
  for (const ex of nightMeta?.extraNights ?? []) {
    if (ex.maxTargets) baseMaxByAction[ex.actionType] = ex.maxTargets;
  }
  const baseMaxFor = (actionType: string) => baseMaxByAction[actionType] ?? 1;
  const targetBonusFor = (actionType: string) => Math.max(0, maxTargetsFor(actionType) - baseMaxFor(actionType));

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
  // 멀티타깃 능력의 누적 선택(actionType → 대상 userId 배열). 확정 버튼으로 한 번에 제출.
  const [multiSelected, setMultiSelected] = useState<Record<string, string[]>>({});

  const [chatOpen, setChatOpen] = useState(false);
  const [circleUnread, setCircleUnread] = useState(0);

  // 하룻밤 1택(원문 "이변이 없으면 하룻밤에 능력 하나") — 서버 규칙(match-action
  // one_ability_per_night)을 선제 반영해 다른 카드의 버튼을 잠근다. 카드 단위는 도감
  // (GOMDORI_ORIGINAL_ABILITIES actionTypes 묶음) 그대로: 같은 카드 분기·재제출(대상
  // 교체)은 열어두고, 패시브/특수 패시브 카드(낙인·어둠이 내린 도시 등)는 1택 밖.
  const abilityCardOf = (actionType: string) =>
    roleOriginalAbilities(role).find(
      (c) => c.actionType === actionType || c.actionTypes?.includes(actionType),
    ) ?? null;
  const isPassiveCardKind = (kind?: string) => kind === "패시브" || kind === "특수 패시브";
  const lockedCard =
    Object.entries(doneMap)
      .filter(([, done]) => done)
      .map(([t]) => abilityCardOf(t))
      .find((c) => c && !isPassiveCardKind(c.kind)) ?? null;
  const isCardLocked = (actionType: string) => {
    if (!lockedCard) return false;
    const c = abilityCardOf(actionType);
    if (!c || isPassiveCardKind(c.kind)) return false;
    return c !== lockedCard;
  };

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

  // 회로 채팅 미읽음 카운트 — 시트 닫혀 있을 때만 누적, 열면 0. demon_circle 채널 한정.
  useEffect(() => {
    if (!circleChat || !match.id || !gameJwt) return;
    let cancelled = false;
    const supabase = getGameSupabase(gameJwt);
    const channel = supabase.channel(`night-chat-unread-${match.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "mafia", table: "match_chats", filter: `match_id=eq.${match.id}` }, (payload) => {
        const row = payload.new as { channel?: string };
        if (cancelled || row.channel !== "demon_circle") return;
        setCircleUnread((n) => n + 1);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [match.id, circleChat, gameJwt]);

  useEffect(() => {
    if (chatOpen) setCircleUnread(0);
  }, [chatOpen]);

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

  // 멀티타깃 확정 제출(아서 잔불이 꺼지기 전에 등). 대표 대상=첫째, 전체는 targetUserIds 로 전송.
  const handleSubmitMulti = async (ability: NightAbility, targets: string[]) => {
    if (!targets.length) return;
    setBusy(true);
    setActionError(null);
    try {
      await submitAction(match.id, ability.actionType, targets[0], gameJwt, targets);
      setDoneMap((m) => ({ ...m, [ability.actionType]: true }));
      setSelectedMap((m) => ({ ...m, [ability.actionType]: targets[0] }));
      setPendingTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "행동 실패");
    } finally {
      setBusy(false);
    }
  };

  const demonChat = circleChat && myPlayer?.alive;

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

    // 멀티타깃은 능력 선택만으로 제출하지 않는다 — 대상을 토글로 누적한 뒤 확정 버튼으로 제출.
    if (maxTargetsFor(ability.actionType) > 1) return;

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

    // 멀티타깃: 대상을 토글로 누적(상한까지). 즉시 발동하지 않고 확정 버튼을 기다린다.
    const maxT = maxTargetsFor(current.actionType);
    if (maxT > 1) {
      const actionType = current.actionType;
      setMultiSelected((m) => {
        const cur = m[actionType] ?? [];
        const next = cur.includes(id)
          ? cur.filter((x) => x !== id)
          : (cur.length >= maxT ? cur : [...cur, id]);
        return { ...m, [actionType]: next };
      });
      setActionError(null);
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

  // #4 접선 로그(당사자=회로 보유자에게만 — '악마의 속삭임' 채팅 안에 표시): 누구와 접선했는지
  // 채팅 로그로 남긴다. createdAt=매치 생성 시각이라 채팅 맨 위(접선 안내)로 정렬된다.
  const contactNotices = circleChat
    ? players
        .filter((p) => p.userId !== myPlayer?.userId && p.faction === "demon" && p.role)
        .map((a) => ({
          id: `contact-${a.userId}`,
          text: `🤝 ${a.displayName}(${roleMeta(a.role)?.label ?? a.role})님과 접선했습니다`,
          createdAt: match.createdAt,
        }))
    : [];

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

      {eclipseNight && !isFirstNight ? (
        <div className="rounded-xl border border-violet-400/25 bg-violet-950/40 px-3 py-2 text-xs text-violet-100/90">
          <span aria-hidden="true" className="mr-1.5">🌑</span>
          일식 — 팬텀이 아침을 밀어내고 밤을 한 번 더 열었습니다. 다음 아침엔 팬텀이 소멸합니다.
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
          {/* 진행바 제거(2026-06-22): 마운트 기준 8s 애니메이션이라 프로필을 닫았다 열면 매번
              0부터 다시 줄어 의미가 없었다. 실제 남은 시간은 하단 독의 PhaseTimer(서버 권위)가
              보여준다 — 단일 출처로 일원화. */}
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
                  const cardLocked = isCardLocked(ability.actionType);
                  return (
                    <button
                      key={ability.actionType}
                      type="button"
                      disabled={busy || isNightLocked || cardLocked}
                      onClick={() => selectAbility(ability)}
                      className={`relative w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-rose-400/50 bg-rose-400/10 text-rose-100"
                          : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/[0.06]"
                      } ${busy || isNightLocked || cardLocked ? "opacity-45 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold">{ability.label}</span>
                        {isNightLocked ? (
                          <span className="shrink-0 text-[0.625rem] font-semibold text-rose-300">
                            🔒 잠김
                          </span>
                        ) : cardLocked ? (
                          <span className="shrink-0 text-[0.625rem] font-semibold text-white/40">
                            다음 밤에
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
            {lockedCard ? (
              <p className="mt-2 text-[0.6875rem] leading-4 text-white/40">
                이변이 없으면 하룻밤에 능력은 하나 — 이번 밤은 {lockedCard.name}을(를) 선택했습니다. 대상 교체는 가능합니다.
              </p>
            ) : null}
          </div>

          {current && maxTargetsFor(current.actionType) > 1 ? (
            <div className="rounded-xl border border-amber-300/20 bg-amber-400/[0.05] p-3 text-xs text-white/70">
              <div className="mb-2">
                선택한 대상 {(multiSelected[current.actionType] ?? []).length} / {maxTargetsFor(current.actionType)}
                {targetBonusFor(current.actionType) > 0 ? (
                  <span
                    className="ml-2 text-[0.625rem] font-semibold text-amber-200 motion-safe:animate-in motion-safe:fade-in"
                    title={`기본 ${baseMaxFor(current.actionType)}명 + 보너스 ${targetBonusFor(current.actionType)}명 (능력 강화로 이 밤 더 지목)`}
                  >
                    오늘 밤 +{targetBonusFor(current.actionType)}
                  </span>
                ) : null}
                {(multiSelected[current.actionType] ?? []).length ? (
                  <span className="ml-1 font-semibold text-amber-200">
                    {(multiSelected[current.actionType] ?? [])
                      .map((id) => players.find((p) => p.userId === id)?.displayName)
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                ) : (
                  <span className="ml-1 text-white/40">무대에서 대상을 눌러 추가/해제하세요.</span>
                )}
              </div>
              <button
                type="button"
                disabled={busy || isNightLocked || isCardLocked(current.actionType) || (multiSelected[current.actionType] ?? []).length === 0}
                onClick={() => void handleSubmitMulti(current, multiSelected[current.actionType] ?? [])}
                className="w-full rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                확정 ({(multiSelected[current.actionType] ?? []).length}명 지정)
              </button>
            </div>
          ) : null}

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
        <TownChat
          matchId={match.id}
          gameJwt={gameJwt}
          myPlayer={myPlayer}
          players={players}
          events={events}
          defaultOpen={false}
          alivePlaceholder="밤의 단서를 남기세요..."
          aliveEmptyHint="아직 밤 이야기가 없습니다."
        />
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
        <BottomSheet title="악마의 속삭임" badge={circleUnread} onOpenChange={setChatOpen}>
          <MatchChat
            matchId={match.id}
            gameJwt={gameJwt}
            myPlayer={myPlayer}
            players={players}
            channels={["demon_circle"]}
            accent="circle"
            placeholder="악마끼리 속삭임..."
            emptyHint="대화를 시작하세요"
            systemNotices={contactNotices}
          />
        </BottomSheet>
      ) : null}
      {nightDock}
    </div>
  );
}
