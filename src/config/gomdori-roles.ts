// Gomdori 직업 매니페스트 — 프론트 표시(라벨/설명/밤 능력)의 single source of truth.
// backend engine(roles.ts)·match-start 분포와 동일 형상 유지(명시적 sync).
// 관련: muel-bot/docs/gomdori-w4-roles-design.md, vault [[Universes/BoW/Lore/Gomdori-마피아-규칙]]

export type GomdoriRoleId =
  | "citizen" | "doctor" | "police" | "demon" | "helper"
  | "rainer" | "romaz" | "gain";

export interface GomdoriNightAction {
  actionType: string; // submitAction 으로 보낼 action_type
  label: string; // 제출 버튼
  prompt: string; // 대상 선택 안내
  excludeSelf?: boolean; // 자신 제외 대상
}

export interface GomdoriRoleMeta {
  label: string; // 한글 직업명
  faction: "angel" | "demon";
  reveal: string; // RoleAssign 설명
  demonTeam?: boolean; // 악마 회로(동료 공개·악마 채팅) 포함
  night?: GomdoriNightAction; // 밤 능동 능력(없으면 패시브/취침)
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
    label: "악마",
    faction: "demon",
    reveal: "악마로서 마을 사람들을 모두 처치하세요.",
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
