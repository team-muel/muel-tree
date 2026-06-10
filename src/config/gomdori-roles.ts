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
  | "pasua" | "converted";

export interface GomdoriNightAction {
  actionType: string; // submitAction 으로 보낼 action_type
  label: string; // 제출 버튼
  prompt: string; // 대상 선택 안내
  excludeSelf?: boolean; // 자신 제외 대상
}

export interface GomdoriRoleMeta {
  label: string; // 한글 직업명
  faction: "angel" | "demon" | "neutral";
  reveal: string; // RoleAssign 설명
  demonTeam?: boolean; // 악마 회로(동료 공개·악마 채팅) 포함
  night?: GomdoriNightAction; // 밤 능동 능력(없으면 패시브/취침)
  night2?: GomdoriNightAction; // 두 번째 밤 능동(예: 팬텀 처치+봉인). 독립 제출.
}

export const GOMDORI_ROLES: Record<string, GomdoriRoleMeta> = {
  citizen: {
    label: "시민",
    faction: "angel",
    reveal: "시민으로서 마을에 숨은 악마를 찾아내세요.",
  },
  doctor: {
    label: "의사",
    faction: "angel",
    reveal: "의사로서 매일 밤 한 명을 치료할 수 있습니다.",
    night: {
      actionType: "doctor_heal",
      label: "치료하기",
      prompt: "오늘 밤 마피아의 공격으로부터 보호할 사람을 고르세요. (자기 자신 포함)",
    },
  },
  police: {
    label: "경찰",
    faction: "angel",
    reveal: "경찰로서 매일 밤 한 명을 조사할 수 있습니다.",
    night: {
      actionType: "police_investigate",
      label: "조사하기",
      prompt: "오늘 밤 정체를 알아볼 사람을 고르세요.",
      excludeSelf: true,
    },
  },
  demon: {
    label: "대악마",
    faction: "demon",
    reveal: "대악마. 마을 사람들을 모두 처치하세요.",
    demonTeam: true,
    night: {
      actionType: "demon_kill",
      label: "처치하기",
      prompt: "조력자와 상의하여 오늘 밤 처치할 대상을 고르세요.",
      excludeSelf: true,
    },
  },
  helper: {
    label: "조력자",
    faction: "demon",
    reveal: "조력자로서 악마를 도와 마을을 혼란에 빠뜨리세요.",
    demonTeam: true,
  },
  // --- W4 v1 ---
  rainer: {
    label: "라이너",
    faction: "angel",
    reveal: "수호신 백호의 소환자. 천사팀 카운트를 늘려 마을을 지킵니다. (밤 능동 능력 없음)",
  },
  romaz: {
    label: "로마즈",
    faction: "angel",
    reveal: "정의로운 경찰. 매일 밤 용의자를 지목해 다음 투표에서 그 대상의 무게를 키웁니다.",
    night: {
      actionType: "romaz_suspect",
      label: "용의자 색출",
      prompt: "용의자로 지목할 대상을 고르세요. 다음 투표에서 그 대상의 투표·의심 가치가 올라갑니다.",
      excludeSelf: true,
    },
  },
  gain: {
    label: "가인",
    faction: "demon",
    reveal: "진실을 가리는 조력자. 악마를 살해·처형 1회로부터 보호합니다.",
    demonTeam: true,
  },
  // --- 기본 로스터: 악마 풀 (전부 v1 처치) ---
  phantom: {
    label: "팬텀",
    faction: "demon",
    reveal: "침묵의 밤의 악마. 처치하고, 어둠으로 한 명의 능력을 봉인합니다.",
    demonTeam: true,
    night: { actionType: "demon_kill", label: "처치하기", prompt: "조력자와 상의하여 오늘 밤 처치할 대상을 고르세요.", excludeSelf: true },
    night2: { actionType: "phantom_seal", label: "봉인하기", prompt: "어둠이 내린 도시 — 오늘 밤 능력을 봉인할 대상을 고르세요.", excludeSelf: true },
  },
  malen: {
    label: "말렌",
    faction: "demon",
    reveal: "악령 마야의 강령술사. 오늘 밤 처치할 대상을 고르세요.",
    demonTeam: true,
    night: { actionType: "demon_kill", label: "처치하기", prompt: "조력자와 상의하여 오늘 밤 처치할 대상을 고르세요.", excludeSelf: true },
  },
  besto: {
    label: "베스토",
    faction: "demon",
    reveal: "히든 포지션의 악마. 오늘 밤 처치할 대상을 고르세요.",
    demonTeam: true,
    night: { actionType: "demon_kill", label: "처치하기", prompt: "조력자와 상의하여 오늘 밤 처치할 대상을 고르세요.", excludeSelf: true },
  },
  // --- 기본 로스터: 조력자 풀 (악마 회로 패시브) ---
  luna: {
    label: "루나",
    faction: "demon",
    reveal: "달의 사제. 매일 밤 천사 하나를 악마팀으로 타락시킵니다.",
    demonTeam: true,
    night: { actionType: "luna_corrupt", label: "공포 속에 밀어 넣다", prompt: "악마팀으로 타락시킬 천사를 고르세요.", excludeSelf: true },
  },
  logen: {
    label: "로건",
    faction: "demon",
    reveal: "부서진 펜던트의 조력자. 매일 밤 한 명의 능력을 무력화합니다.",
    demonTeam: true,
    night: { actionType: "logen_nullify", label: "네 안에 없는 것", prompt: "오늘 밤 능력을 무력화할 대상을 고르세요.", excludeSelf: true },
  },
  ellen: {
    label: "엘런",
    faction: "demon",
    reveal: "박해자. 악마를 도와 마을을 혼란에 빠뜨리세요.",
    demonTeam: true,
  },
  // --- 기본 로스터: 천사 풀 ---
  dordan: {
    label: "도르단",
    faction: "angel",
    reveal: "탐정. 매일 밤 한 명의 정체를 조사할 수 있습니다.",
    night: { actionType: "police_investigate", label: "조사하기", prompt: "오늘 밤 정체를 알아볼 사람을 고르세요.", excludeSelf: true },
  },
  habreterus: {
    label: "하브레터스",
    faction: "angel",
    reveal: "생명의 언약을 맺는 치료자. 매일 밤 한 명을 보호할 수 있습니다.",
    night: { actionType: "doctor_heal", label: "치료하기", prompt: "오늘 밤 공격으로부터 보호할 사람을 고르세요. (자기 자신 포함)" },
  },
  mizlet: {
    label: "미즐렛",
    faction: "angel",
    reveal: "행복을 파는 가게의 주인. 매일 밤 탈락한 한 명을 되살릴 수 있습니다.",
    night: { actionType: "mizlet_revive", label: "디저트 선물", prompt: "디저트로 되살릴 탈락자를 고르세요." },
  },
  helen: {
    label: "헬렌",
    faction: "angel",
    reveal: "황금빛 수면의 천사. 매일 밤 탈락한 한 명을 되살릴 수 있습니다.",
    night: { actionType: "helen_revive", label: "황금빛 수면", prompt: "수면으로 되살릴 탈락자를 고르세요." },
  },
  uno: {
    label: "우노",
    faction: "angel",
    reveal: "명예의 군인. 살아있는 한 천사팀의 카운트를 더합니다. (밤 능동 능력 없음)",
  },
  arthur: {
    label: "아서",
    faction: "angel",
    reveal: "여명의 기사. 밤의 살해·처형을 한 번 막아내는 보호막을 지닙니다. (밤 능동 능력 없음)",
  },
  seika: {
    label: "세이카",
    faction: "angel",
    reveal: "초신성·등대의 천사. 매일 밤 한 명의 능력을 봉인할 수 있습니다.",
    night: { actionType: "seika_supernova", label: "초신성", prompt: "오늘 밤 능력을 봉인할 대상을 고르세요.", excludeSelf: true },
  },
  luru: {
    label: "루루",
    faction: "angel",
    reveal: "영혼을 만지는 연주자. (밤 능동 능력 없음 — v1)",
  },
  // --- W6 v1 중립 ---
  pasua: {
    label: "파스아",
    faction: "neutral",
    reveal: "사이비 교주(중립). 매일 밤 한 명을 포교해 당신의 교세로 끌어들이세요. 3명을 전향시키면 당신만의 승리입니다.",
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
