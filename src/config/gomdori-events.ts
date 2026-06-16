// Gomdori match_events → 화면 카피의 single source of truth (2026-06-12).
//
// 구조 원칙:
// - 컴포넌트(SpectatorFeed/DayPhase 등)는 이벤트 타입별 switch 를 갖지 않는다.
//   카피·톤·노출 대상은 전부 이 레지스트리가 결정 — 항목을 빼면 그 이벤트는
//   화면에서 사라진다 (밸런스 튜닝 지점이 코드 한 곳).
// - audience "public"  = 공개 이벤트 (관전 피드·진행 기록).
//   audience "personal" = 백엔드가 당사자 recipient 의 private 으로 보낸 이벤트
//   (muel-bot#127) — RLS 가 본인에게만 내려주므로, 내 피드에 있으면 곧 내 것.
// - "필요할지 모르는" 당사자 정보(봉인·매료 등)는 일단 모두 노출한다 — 빼고
//   싶어지면 여기서 항목만 제거 (사용자 결정 2026-06-12).

export type GomdoriEventTone = "danger" | "warn" | "good" | "info";

export type GomdoriEventCopy = {
  audience: "public" | "personal";
  tone: GomdoriEventTone;
  icon: string;
  /** 한 줄 카피. nameOf 는 user_id → 표시명 해석기. null 반환 시 숨김. */
  line: (payload: Record<string, unknown>, nameOf: (id: unknown) => string) => string | null;
};

export const GOMDORI_EVENT_COPY: Record<string, GomdoriEventCopy> = {
  // ── 공개: 마을 전체가 보는 결과 ─────────────────────────────────
  player_died: {
    audience: "public", tone: "danger", icon: "🌑",
    line: (p, n) => `${n(p.user_id)} 님이 밤에 사망`,
  },
  player_revived: {
    audience: "public", tone: "good", icon: "🌅",
    line: (p, n) => `${n(p.user_id)} 님이 되살아남`,
  },
  nightmare_death: {
    audience: "public", tone: "danger", icon: "😱",
    line: (p, n) => `${n(p.user_id)} 님이 악몽에서 깨어나지 못함`,
  },
  eclipse_annihilation: {
    audience: "public", tone: "danger", icon: "🌒",
    line: (p, n) => `${n(p.user_id)} 님이 일식과 함께 소멸`,
  },
  player_eliminated: {
    audience: "public", tone: "danger", icon: "⚖️",
    line: (p, n) => `${n(p.user_id)} 님이 처형됨`,
  },
  // execution_blocked_shield (구) — vault canon §8 회귀로 폐지. shield 는 능력 기반
  // 탈락에만 적용되고 vote 처형은 막지 못한다(아서 여명의 기사 패시브 포함). backend 가
  // 이 이벤트를 더 이상 발행하지 않으므로 레지스트리에서도 제거.
  suspicion_revealed: {
    audience: "public", tone: "info", icon: "🔎",
    line: (p, n) => (p.user_id ? `의심 지목: ${n(p.user_id)}` : "의심 부결"),
  },
  vote_resolved: {
    audience: "public", tone: "info", icon: "🗳️",
    line: (p, n) => (p.candidateUserId ? `최다 득표: ${n(p.candidateUserId)}` : "투표 부결"),
  },
  verdict_resolved: {
    audience: "public", tone: "info", icon: "⚖️",
    line: (p) => (p.executed ? "처형 가결" : "처형 부결"),
  },
  first_night_silent: {
    audience: "public", tone: "info", icon: "🌙",
    line: () => "조용한 첫 밤이 지났다",
  },
  game_ended: {
    audience: "public", tone: "info", icon: "🏁",
    line: () => "게임 종료",
  },

  // ── 당사자 전용: 어젯밤 나에게 일어난 일 ────────────────────────
  silenced: {
    audience: "personal", tone: "warn", icon: "🔇",
    line: () => "어둠이 당신을 봉인했습니다 — 그 밤의 능력이 막혔습니다.",
  },
  charmed: {
    audience: "personal", tone: "warn", icon: "🎶",
    line: () => "당신은 매료되었습니다 — 다음 처형 투표가 연주자에게 양도됩니다.",
  },
  possessed: {
    audience: "personal", tone: "warn", icon: "👻",
    line: () => "혼령이 당신에게 빙의했습니다 — 그 밤 행동이 막혔습니다.",
  },
  nightmare_marked: {
    audience: "personal", tone: "danger", icon: "😱",
    line: () => "악몽이 당신을 덮쳤습니다 — 아침에 깨어나지 못합니다.",
  },
  faction_changed: {
    audience: "personal", tone: "danger", icon: "🌀",
    line: (p) =>
      p.new_faction === "neutral"
        ? "당신은 파스아의 교세에 전향되었습니다 — 프로필에서 새 정체를 확인하세요."
        : "당신은 공포 속에서 타락했습니다 — 이제 악마팀입니다. 프로필을 확인하세요.",
  },
  rebranded: {
    audience: "personal", tone: "danger", icon: "🔥",
    line: () => "메피스토 낙인 — 당신의 정체가 재배정되었습니다. 프로필에서 새 직업을 확인하세요.",
  },
  attack_prevented: {
    audience: "personal", tone: "good", icon: "🛡️",
    line: () => "어젯밤 누군가의 공격이 당신을 노렸지만 무산되었습니다.",
  },
  shield_blocked: {
    audience: "personal", tone: "good", icon: "🛡️",
    line: () => "보호막이 어젯밤의 공격을 막아냈습니다.",
  },
  count_granted: {
    audience: "personal", tone: "good", icon: "✊",
    line: () => "투쟁의 가호 — 당신의 소속 카운트가 커졌습니다.",
  },
  vote_bias_applied: {
    audience: "personal", tone: "warn", icon: "📣",
    line: () => "박해의 낙인 — 다음 투표에서 당신이 받는 표의 무게가 커집니다.",
  },
  suspicion_bias_applied: {
    audience: "personal", tone: "warn", icon: "📣",
    line: () => "용의선상 — 다음 투표·의심에서 당신의 무게가 커집니다.",
  },
  disguise_toggled: {
    audience: "personal", tone: "info", icon: "🎭",
    line: (p) => (p.disguised ? "변신 완료 — 조사에 천사로 보입니다." : "변신 해제 — 본모습으로 돌아왔습니다."),
  },
  eclipse_cast: {
    audience: "personal", tone: "warn", icon: "🌒",
    line: () => "일식 시전 — 다음 아침이 밤이 됩니다. 그 아침에 당신은 소멸합니다.",
  },
  action_blocked_suspected: {
    audience: "personal", tone: "warn", icon: "🚫",
    line: () => "의심 지목으로 어젯밤 능력이 발동하지 못했습니다.",
  },
  action_blocked_silenced: {
    audience: "personal", tone: "warn", icon: "🚫",
    line: () => "봉인당해 어젯밤 능력이 발동하지 못했습니다.",
  },
  action_blocked_exhausted: {
    audience: "personal", tone: "warn", icon: "🚫",
    line: () => "이미 소진한 능력이라 발동하지 못했습니다.",
  },
  action_delayed: {
    audience: "personal", tone: "info", icon: "⏳",
    line: () => "능력이 예약되었습니다 — 효력은 다음 해소 때 나타납니다.",
  },

  // ── 접선 회로 (정본 2026-06-12) — 변종 확정 직후 당사자에게만 ────────
  circle_contact: {
    audience: "personal", tone: "info", icon: "🤝",
    line: (p, n) =>
      `접선 — ${n(p.user_id)}님이 당신의 동료입니다. 악마의 속삭임이 열렸습니다.${
        typeof p.expires_after_night === "number" ? ` (밤 ${p.expires_after_night} 종료 시 대화가 끊깁니다)` : ""
      }`,
  },
  circle_notify: {
    audience: "personal", tone: "info", icon: "👁️",
    line: (p, n) => `통지 — ${n(p.user_id)}님이 같은 편입니다. 접선(대화)은 불가능합니다.`,
  },
  circle_expired: {
    audience: "personal", tone: "warn", icon: "🌫️",
    line: () => "진실을 가리는 암흑이 걷혔습니다 — 악마와의 대화가 끊겼습니다.",
  },
};

export type GomdoriEventLine = { id: string; icon: string; tone: GomdoriEventTone; text: string };

/** 이벤트 배열 → 표시 줄. audience 로 거르고, 레지스트리에 없는 타입은 숨김. */
export function eventLines(
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown> }>,
  audience: "public" | "personal",
  nameOf: (id: unknown) => string,
): GomdoriEventLine[] {
  const out: GomdoriEventLine[] = [];
  for (const ev of events) {
    const copy = GOMDORI_EVENT_COPY[ev.event_type];
    if (!copy || copy.audience !== audience) continue;
    const text = copy.line(ev.payload ?? {}, nameOf);
    if (text) out.push({ id: ev.id, icon: copy.icon, tone: copy.tone, text });
  }
  return out;
}
