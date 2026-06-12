// Gomdori 직업 매니페스트 — 프론트 표시(라벨/설명/밤 능력)의 single source of truth.
// backend engine(roles.ts)·match-start 분포와 동일 형상 유지(명시적 sync).
// 관련: muel-bot/docs/gomdori-w4-roles-design.md, vault [[Universes/BoW/Lore/Gomdori-마피아-규칙]]

export type GomdoriRoleId =
  // 레거시(미배정)
  | "citizen" | "doctor" | "police" | "helper"
  // 악마 풀
  | "demon" | "phantom" | "malen" | "besto"
  // 조력자 풀
  | "gain" | "luna" | "logen" | "ellen"
  // 천사 풀
  | "romaz" | "rainer" | "dordan" | "habreterus" | "mizlet" | "helen" | "uno" | "arthur" | "seika" | "luru"
  // 중립
  | "pasua" | "converted"
  // 게임 내 변환 산물(배정 풀 아님): 루나 타락(천사 → 악마팀)
  | "corrupted";

export interface GomdoriNightAction {
  actionType: string; // submitAction 으로 보낼 action_type
  label: string; // 제출 버튼
  prompt: string; // 대상 선택 안내
  excludeSelf?: boolean; // 자신 제외 대상
  kind?: "kill"; // 처치형(악마 처치/악몽/혼령 방출 등) — demon 블록 처치-UI 판정
  self?: boolean; // 자기 대상(변신/일식) — 대상 그리드 없이 버튼만, target=null 제출
}

export interface GomdoriRoleMeta {
  label: string; // 한글 직업명
  title?: string; // 원본 직업 타이틀/역할 별칭
  roster?: "angel" | "demon" | "helper" | "neutral"; // 도감 표시 그룹. faction 과 별개로 조력자 탭을 분리한다.
  faction: "angel" | "demon" | "neutral";
  reveal: string; // RoleAssign 설명
  passive?: string; // 상시 효과/조건. 표시 전용이며 엔진 계약은 night/extraNights/action_type 이 담당.
  abilitySummary?: string; // 원본 능력 흐름 요약. 도감/내 역할 패널에서 읽기 쉽게 보강.
  // 악마팀 풀 소속(처치 UI 분기·도감 분류용). 채팅·동료 공개는 이 플래그가 아니라
  // 접선 회로(백엔드 circleChat/circleKnown — 가인·로건 패시브, 팬텀은 통지만)가 결정 (2026-06-12).
  demonTeam?: boolean;
  night?: GomdoriNightAction; // 밤 능동 능력(없으면 패시브/취침)
  // 추가 밤 능동(예: 팬텀 봉인+일식, 베스토 변신). 각각 독립 제출. night2 의 일반화.
  extraNights?: GomdoriNightAction[];
}

export const GOMDORI_ROLES: Record<string, GomdoriRoleMeta> = {
  citizen: {
    label: "시민",
    title: "마을 주민",
    faction: "angel",
    reveal: "시민으로서 마을에 숨은 악마를 찾아내세요.",
    abilitySummary: "밤 능력은 없습니다. 토론, 추리, 투표가 핵심 행동입니다.",
  },
  doctor: {
    label: "의사",
    title: "치료자",
    faction: "angel",
    reveal: "의사로서 매일 밤 한 명을 치료할 수 있습니다.",
    abilitySummary: "치료하기: 오늘 밤 공격받을 수 있는 사람을 보호합니다.",
    night: {
      actionType: "doctor_heal",
      label: "치료하기",
      prompt: "오늘 밤 마피아의 공격으로부터 보호할 사람을 고르세요. (자기 자신 포함)",
    },
  },
  police: {
    label: "경찰",
    title: "조사자",
    faction: "angel",
    reveal: "경찰로서 매일 밤 한 명을 조사할 수 있습니다.",
    abilitySummary: "조사하기: 한 명을 골라 악마인지 아닌지 확인합니다.",
    night: {
      actionType: "police_investigate",
      label: "조사하기",
      prompt: "오늘 밤 정체를 알아볼 사람을 고르세요.",
      excludeSelf: true,
    },
  },
  demon: {
    label: "대악마",
    title: "만악의 근원",
    roster: "demon",
    faction: "demon",
    reveal: "만악의 근원, 대악마. 처치하고, 메피스토 낙인으로 한 명의 정체를 뒤바꿉니다.",
    passive: "사탄의 마/메피스토의 낙인: 원본에서는 능력 성공과 투표 흐름이 전역 판정을 흔듭니다. v1은 낙인 재배정과 처치에 집중합니다.",
    abilitySummary: "처치로 한 명을 제거하고, 메피스토 낙인으로 대상의 직업을 비밀리에 재배정합니다.",
    demonTeam: true,
    night: {
      actionType: "demon_kill",
      label: "처치하기",
      prompt: "조력자와 상의하여 오늘 밤 처치할 대상을 고르세요.",
      excludeSelf: true,
      kind: "kill",
    },
    extraNights: [
      { actionType: "daeakma_brand", label: "메피스토 낙인", prompt: "낙인을 찍을 대상을 고르세요. 그 직업이 삭제되고 다른 정체로 비밀리에 재배정됩니다.", excludeSelf: true },
    ],
  },
  helper: {
    label: "조력자",
    title: "악마의 협력자",
    faction: "demon",
    reveal: "조력자로서 악마를 도와 마을을 혼란에 빠뜨리세요.",
    abilitySummary: "직접 밤 능력은 없습니다. 악마팀의 접선, 정보, 투표 보조가 핵심입니다.",
    demonTeam: true,
  },
  // --- W4 v1 ---
  rainer: {
    label: "라이너",
    title: "백호의 소환자",
    faction: "angel",
    reveal: "수호신 백호의 소환자. 천사팀 카운트를 늘려 마을을 지킵니다. (밤 능동 능력 없음)",
    passive: "백호: 천사팀 카운트를 늘립니다. v1에서는 무한게임 방지를 위해 축약된 카운트 보너스로 적용됩니다.",
    abilitySummary: "밤 능동 능력은 없습니다. 토론과 투표에서 백호 카운트 압박을 근거로 악마를 찾아야 합니다.",
  },
  romaz: {
    label: "로마즈",
    title: "용의자 색출 경찰",
    faction: "angel",
    reveal: "정의로운 경찰. 매일 밤 용의자를 지목해 다음 투표에서 그 대상의 무게를 키웁니다.",
    abilitySummary: "용의자 색출: 대상이 다음 투표와 의심 집계에서 더 많은 압박을 받게 합니다.",
    night: {
      actionType: "romaz_suspect",
      label: "용의자 색출",
      prompt: "용의자로 지목할 대상을 고르세요. 다음 투표에서 그 대상의 투표·의심 가치가 올라갑니다.",
      excludeSelf: true,
    },
  },
  gain: {
    label: "가인",
    title: "진실을 가리는 암흑",
    roster: "helper",
    faction: "demon",
    reveal: "진실을 가리는 조력자. 악마를 살해·처형 1회로부터 보호합니다.",
    passive: "진실을 가리는 암흑: 악마와 접선하고 악마의 첫 치명적 탈락을 보호합니다. v1에서는 보호막 1회로 축약됩니다.",
    abilitySummary: "직접 밤 능동 능력은 없습니다. 악마 생존을 보존하고 접선 정보로 판을 흔드는 조력자입니다.",
    demonTeam: true,
  },
  // --- 기본 로스터: 악마 풀 (전부 v1 처치) ---
  phantom: {
    label: "팬텀",
    title: "침묵의 밤",
    roster: "demon",
    faction: "demon",
    reveal: "침묵의 밤의 악마. 악몽으로 빠뜨리고(아침에 탈락), 어둠으로 봉인하며, 일식으로 아침을 삼킵니다.",
    passive: "침묵의 밤: 원본에서는 밤 연장과 접선 제한을 갖습니다. 현재 게임에서는 팬텀-조력자 접선 제한과 다중 밤 능력으로 핵심을 반영합니다.",
    abilitySummary: "악몽으로 지연 탈락을 만들고, 봉인으로 능력을 막고, 일식으로 다음 아침을 밤으로 바꿉니다.",
    demonTeam: true,
    night: { actionType: "phantom_nightmare", label: "악몽", prompt: "악몽에 빠뜨릴 대상을 고르세요. 아침이 되면 탈락합니다(밤 보호로 막지 못함).", excludeSelf: true, kind: "kill" },
    extraNights: [
      { actionType: "phantom_seal", label: "봉인하기", prompt: "어둠이 내린 도시 — 오늘 밤 능력을 봉인할 대상을 고르세요.", excludeSelf: true },
      { actionType: "phantom_eclipse", label: "일식", prompt: "일식 — 다음 아침을 밤으로 바꿉니다. 단, 그 아침에 당신은 소멸합니다. (1회)", self: true },
    ],
  },
  malen: {
    label: "말렌",
    title: "강령술사",
    roster: "demon",
    faction: "demon",
    reveal: "악령 마야의 강령술사. 혼령을 방출해 처치하고, 한 명에게 빙의해 묶습니다.",
    passive: "악령 마야: 원본에서는 빙의와 혼/시체 축적을 다룹니다. v1은 빙의의 행동 봉인과 악마팀 카운트 전환에 집중합니다.",
    abilitySummary: "혼령 방출로 처치하고, 빙의로 대상의 밤 행동을 막으며 그 라운드 악마팀으로 셉니다.",
    demonTeam: true,
    night: { actionType: "malen_release", label: "혼령 방출", prompt: "혼령으로 처치할 대상을 고르세요.", excludeSelf: true, kind: "kill" },
    extraNights: [
      { actionType: "malen_possess", label: "빙의", prompt: "빙의할 대상을 고르세요. 그 밤 행동을 못 하고 악마팀으로 셈됩니다.", excludeSelf: true },
    ],
  },
  besto: {
    label: "베스토",
    title: "히든 포지션",
    roster: "demon",
    faction: "demon",
    reveal: "히든 포지션의 악마. 히든 포지션으로 처치하고, 변신으로 조사를 회피합니다.",
    passive: "두 번째 자아: 솔과 하베스토 사이를 오가며 조사와 투표 판정을 흔듭니다. 배후 효과는 후속 확장 대상입니다.",
    abilitySummary: "히든 포지션으로 처치하고, 변신으로 조사 결과를 회피하는 자기 상태를 전환합니다.",
    demonTeam: true,
    night: { actionType: "besto_hidden", label: "히든 포지션", prompt: "조력자와 상의하여 오늘 밤 처치할 대상을 고르세요.", excludeSelf: true, kind: "kill" },
    extraNights: [
      { actionType: "besto_shift", label: "변신", prompt: "변신 — 솔(조사 시 천사로 보임) ↔ 하베스토(악마)로 전환합니다.", self: true },
    ],
  },
  // --- 기본 로스터: 조력자 풀 (악마 회로 패시브) ---
  luna: {
    label: "루나",
    title: "달의 사제",
    roster: "helper",
    faction: "demon",
    reveal: "달의 사제. 매일 밤 천사 하나를 악마팀으로 타락시킵니다.",
    passive: "달빛이 비치는 우물: 원본에서는 투표·의심으로 달의 힘을 충전합니다. v1은 핵심 변환 능력에 집중합니다.",
    abilitySummary: "공포 속에 밀어 넣다: 천사 한 명을 악마팀 타락자로 바꿉니다.",
    demonTeam: true,
    night: { actionType: "luna_corrupt", label: "공포 속에 밀어 넣다", prompt: "악마팀으로 타락시킬 천사를 고르세요.", excludeSelf: true },
  },
  logen: {
    label: "로건",
    title: "부서진 펜던트",
    roster: "helper",
    faction: "demon",
    reveal: "부서진 펜던트의 조력자. 매일 밤 한 명의 능력을 무력화합니다.",
    passive: "부서진 펜던트: 시작 시 악마와 접선하고 악마팀에 지워지지 않는 펜던트 효과를 남깁니다.",
    abilitySummary: "네 안에 없는 것: 그 밤 대상의 능력 발동을 무력화합니다.",
    demonTeam: true,
    night: { actionType: "logen_nullify", label: "네 안에 없는 것", prompt: "오늘 밤 능력을 무력화할 대상을 고르세요.", excludeSelf: true },
  },
  ellen: {
    label: "엘런",
    title: "박해자",
    roster: "helper",
    faction: "demon",
    reveal: "박해자. 매일 밤 한 명에게 투표 무게를 실어 처형대로 몰아갑니다.",
    passive: "박해자/해체된 퍼즐: 원본에서는 홀수날 투표 압박과 자아 해체 상태를 다룹니다. v1은 투표 무게 증가에 집중합니다.",
    abilitySummary: "박해: 대상이 받는 처형 투표 무게를 그 라운드 동안 키웁니다.",
    demonTeam: true,
    night: { actionType: "ellen_persecute", label: "박해", prompt: "투표 무게를 실어 처형대로 몰 대상을 고르세요.", excludeSelf: true },
  },
  // --- 기본 로스터: 천사 풀 ---
  dordan: {
    label: "도르단",
    title: "탐정",
    faction: "angel",
    reveal: "탐정. 매일 밤 한 명의 정체를 조사할 수 있습니다.",
    passive: "침착한 탐정: 원본에서는 탈락 사건의 범인을 추적하는 단서 흐름을 갖습니다.",
    abilitySummary: "조사하기: 한 명을 골라 악마인지 아닌지 확인합니다. v1은 정체 조사로 축약됩니다.",
    night: { actionType: "police_investigate", label: "조사하기", prompt: "오늘 밤 정체를 알아볼 사람을 고르세요.", excludeSelf: true },
  },
  habreterus: {
    label: "하브레터스",
    title: "치료자",
    faction: "angel",
    reveal: "생명의 언약을 맺는 치료자. 매일 밤 한 명을 보호할 수 있습니다.",
    passive: "임종 선언/소명: 원본에서는 치료 실패와 소명 쿨다운이 연결됩니다. v1은 밤 보호에 집중합니다.",
    abilitySummary: "치료하기: 오늘 밤 공격받을 수 있는 사람을 보호합니다.",
    night: { actionType: "doctor_heal", label: "치료하기", prompt: "오늘 밤 공격으로부터 보호할 사람을 고르세요. (자기 자신 포함)" },
  },
  mizlet: {
    label: "미즐렛",
    title: "행복을 파는 가게",
    faction: "angel",
    reveal: "행복을 파는 가게의 주인. 매일 밤 탈락한 한 명을 되살릴 수 있습니다.",
    passive: "행복을 파는 가게: 원본에서는 탈락자가 생존자보다 많아지면 다수 복귀를 일으킵니다.",
    abilitySummary: "디저트 선물: 탈락한 한 명을 되살립니다. 현재 밸런스에서는 부활 사용 횟수가 중요한 축입니다.",
    night: { actionType: "mizlet_revive", label: "디저트 선물", prompt: "디저트로 되살릴 탈락자를 고르세요." },
  },
  helen: {
    label: "헬렌",
    title: "황금빛 수면",
    faction: "angel",
    reveal: "황금빛 수면의 천사. 매일 밤 탈락한 한 명을 되살릴 수 있습니다.",
    passive: "행복 쉼터: 원본에서는 전원에게 존재가 알려지고 수면 대상과 영혼 기억을 공유합니다.",
    abilitySummary: "황금빛 수면: 탈락한 한 명을 수면에서 깨워 되살립니다.",
    night: { actionType: "helen_revive", label: "황금빛 수면", prompt: "수면으로 되살릴 탈락자를 고르세요." },
  },
  uno: {
    label: "우노",
    title: "명예의 군인",
    faction: "angel",
    reveal: "명예의 군인. 살아있는 한 천사팀 카운트를 더하고, 매일 밤 투쟁으로 한 명의 소속 카운트를 키웁니다.",
    passive: "군인의 사명/명예: 생존 중 천사팀 카운트를 보강하고 악마 효과 제거 흐름을 갖습니다. v1은 카운트 보너스로 축약됩니다.",
    abilitySummary: "투쟁: 대상의 소속 카운트를 더해 승리 판정의 무게를 바꿉니다.",
    night: { actionType: "uno_struggle", label: "투쟁", prompt: "소속 카운트를 더해줄 대상을 고르세요.", excludeSelf: true },
  },
  arthur: {
    label: "아서",
    title: "여명의 기사",
    faction: "angel",
    reveal: "여명의 기사. 자신은 보호막을 지니고, 매일 밤 잔불 대검으로 한 명에게 하루 무적을 부여합니다.",
    passive: "여명의 기사: 원본에서는 탈락 면역을 갖되 결백한 천사들의 희생과 연결됩니다. v1은 자기 보호막 1회로 축약됩니다.",
    abilitySummary: "잔불 대검: 한 명에게 하루 동안 무적 보호를 부여합니다.",
    night: { actionType: "arthur_emberblade", label: "잔불 대검", prompt: "오늘 밤 하루 무적을 부여할 대상을 고르세요.", excludeSelf: true },
  },
  seika: {
    label: "세이카",
    title: "초신성·등대",
    faction: "angel",
    reveal: "초신성·등대의 천사. 매일 밤 한 명의 능력을 봉인할 수 있습니다.",
    passive: "별이 떠오른 밤: 원본에서는 초신성 이후 밤 흐름이 바뀝니다. v1은 능력 봉인에 집중합니다.",
    abilitySummary: "초신성: 그 밤 대상의 능력 발동을 봉인합니다.",
    night: { actionType: "seika_supernova", label: "초신성", prompt: "오늘 밤 능력을 봉인할 대상을 고르세요.", excludeSelf: true },
  },
  luru: {
    label: "루루",
    title: "연주자",
    faction: "angel",
    reveal: "영혼을 만지는 연주자. 매일 밤 한 명을 매료해 그 처형 투표를 당신에게 양도받습니다.",
    passive: "아름다운 영혼을 위한 소나타: 원본에서는 매료가 쌓이면 전원 투표 흐름을 뒤흔드는 연주가 시작됩니다.",
    abilitySummary: "영혼을 만지는 음색: 대상의 처형 투표 권한을 루루에게 양도시킵니다.",
    night: { actionType: "luru_charm", label: "영혼을 만지는 음색", prompt: "매료해 처형 투표를 양도받을 대상을 고르세요.", excludeSelf: true },
  },
  // --- W6 v1 중립 ---
  pasua: {
    label: "파스아",
    title: "사이비 교주",
    roster: "neutral",
    faction: "neutral",
    reveal: "사이비 교주(중립). 매일 밤 한 명을 포교해 당신의 교세로 끌어들이세요. 3명을 전향시키면 당신만의 승리입니다.",
    passive: "구원자: 파스아 교세가 충분히 커지면 천사·악마와 별개로 단독 승리를 노립니다.",
    abilitySummary: "포교하기: 천사나 조력자를 전향자로 바꿉니다. 악마와 중립은 포교할 수 없습니다.",
    night: {
      actionType: "pasua_convert",
      label: "포교하기",
      prompt: "포교할 대상을 고르세요. 천사와 조력자만 전향됩니다. (악마·중립 불가)",
      excludeSelf: true,
    },
  },
  converted: {
    label: "전향자",
    faction: "neutral",
    reveal: "당신은 파스아의 교세에 전향되었습니다. 이제 파스아의 승리가 당신의 승리입니다.",
  },
  corrupted: {
    label: "타락자",
    faction: "demon",
    reveal: "공포 속에서 타락했습니다. 이제 악마팀의 승리가 당신의 승리입니다.",
  },
};

export function roleMeta(role?: string | null): GomdoriRoleMeta | null {
  return role ? GOMDORI_ROLES[role] ?? null : null;
}

export function roleLabel(role?: string | null): string {
  if (!role) return "";
  return GOMDORI_ROLES[role]?.label ?? role;
}

export function isDemonTeamRole(role?: string | null): boolean {
  return !!(role && GOMDORI_ROLES[role]?.demonTeam);
}

// 진영 표기 단일 출처 — 화면 로컬 사본 금지 (2026-06-12 컨벤션, muel-tree#86 후속).
// helper 는 논리 진영상 악마팀으로 표기한다.
export const FACTION_LABELS: Record<string, string> = {
  angel: "천사팀",
  demon: "악마팀",
  helper: "악마팀",
  neutral: "중립",
};

export function factionLabel(faction?: string | null): string {
  return FACTION_LABELS[faction ?? ""] ?? "중립";
}

/** 추측·도감용 배정 풀 직업 목록 (레거시·변환 산물 제외). */
export const ASSIGNABLE_ROLE_IDS = Object.keys(GOMDORI_ROLES).filter(
  (id) => !["citizen", "doctor", "police", "helper", "converted", "corrupted"].includes(id),
);
