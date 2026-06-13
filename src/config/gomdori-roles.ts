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

export type GomdoriOriginalAbilityKind = "패시브" | "특수 패시브" | "능력" | "능력2";

export interface GomdoriOriginalAbility {
  kind: GomdoriOriginalAbilityKind;
  name: string;
  text: string;
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
      { actionType: "daeakma_dominion", label: "압도적 존재감", prompt: "압도적 존재감 — 이번 밤 전원의 능력을 봉인합니다. (1회, 대상 없음)", self: true },
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
    reveal: "수호신 백호의 소환자. 백호를 소환해 천사팀 카운트를 늘려 마을을 지킵니다.",
    passive: "백호: 소환하면 천사팀 카운트가 늘어납니다(소환 전에는 미보유). canon 은 +3, v1 은 축약된 보너스입니다.",
    abilitySummary: "백호 소환: 한 번 발동해 천사팀 카운트를 영구히 늘립니다(1회).",
    night: {
      actionType: "rainer_summon",
      label: "백호 소환",
      prompt: "백호를 소환해 천사팀 카운트를 늘립니다. (1회, 대상 없음)",
      self: true,
    },
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
    reveal: "달의 사제. 달의 힘을 모아, 가득 차면 천사 하나를 악마팀으로 타락시킵니다.",
    passive: "달빛이 비치는 우물: 당신이 투표·의심한 대상에 달빛이 깃들고 달의 힘이 차오릅니다. 달의 힘이 2 이상일 때 공포를 발동할 수 있습니다.",
    abilitySummary: "고요한 적막: 달의 힘을 +1 모으고, 당신이 투표·의심한 대상에 달빛을 남깁니다. 공포 속에 밀어 넣다: 달의 힘 2 이상에서 천사 한 명을 타락시킵니다(소비).",
    demonTeam: true,
    night: { actionType: "luna_corrupt", label: "공포 속에 밀어 넣다", prompt: "달의 힘이 가득 찼을 때, 악마팀으로 타락시킬 천사를 고르세요. (달의 힘 2 필요)", excludeSelf: true },
    extraNights: [
      { actionType: "luna_moonlight", label: "고요한 적막", prompt: "달의 힘을 +1 모읍니다. 당신이 투표·의심한 대상에 달빛이 깃듭니다.", self: true },
    ],
  },
  logen: {
    label: "로건",
    title: "부서진 펜던트",
    roster: "helper",
    faction: "demon",
    reveal: "부서진 펜던트의 조력자. 한 명을 표식해, 그가 다음에 쓰는 능력을 소멸시킵니다.",
    passive: "부서진 펜던트: 시작 시 악마와 접선하고 악마팀에 지워지지 않는 펜던트 효과를 남깁니다.",
    abilitySummary: "네 안에 없는 것: 대상이 가장 가까운 밤에 발동하는 능력 효과를 소멸시킵니다(표식은 쓸 때까지 남습니다).",
    demonTeam: true,
    night: { actionType: "logen_nullify", label: "네 안에 없는 것", prompt: "다음 능력을 소멸시킬 대상을 고르세요.", excludeSelf: true },
  },
  ellen: {
    label: "엘런",
    title: "박해자",
    roster: "helper",
    faction: "demon",
    reveal: "박해자. 당신이 투표한 사람을 처형대로 몰아갑니다.",
    passive: "박해자/해체된 퍼즐: 원본에서는 홀수날 투표 압박과 자아 해체 상태를 다룹니다. v1은 자기 투표 대상의 무게 증가에 집중합니다.",
    abilitySummary: "박해: 당신이 직전에 투표한 대상이 다음 집계에서 받는 처형 투표 무게를 키웁니다(별도 지목 없이 자기 투표를 따라감).",
    demonTeam: true,
    night: { actionType: "ellen_persecute", label: "박해", prompt: "당신이 직전에 투표한 대상을 처형대로 몰아갑니다. (대상 없음 — 자기 투표를 따라감)", self: true },
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
    abilitySummary: "디저트 선물(부활): 탈락한 한 명을 되살립니다(1회). 디저트 선물(버프): 생존자에게 디저트를 주어 그 밤 보호합니다.",
    night: { actionType: "mizlet_revive", label: "디저트 선물(부활)", prompt: "디저트로 되살릴 탈락자를 고르세요. (1회)" },
    extraNights: [
      { actionType: "mizlet_dessert", label: "디저트 선물", prompt: "디저트를 줄 생존자를 고르세요. 그 밤 보호받습니다." },
    ],
  },
  helen: {
    label: "헬렌",
    title: "황금빛 수면",
    faction: "angel",
    reveal: "황금빛 수면의 천사. 생존자를 재워 지키거나, 탈락한 한 명을 되살립니다.",
    passive: "행복 쉼터: 원본에서는 전원에게 존재가 알려지고 수면 대상과 영혼 기억을 공유합니다.",
    abilitySummary: "황금빛 수면: 생존자를 재우면 그 밤 죽음·부정효과로부터 보호합니다(행동은 봉인). 탈락자에게 쓰면 되살립니다(1회).",
    night: { actionType: "helen_revive", label: "수면(부활)", prompt: "수면으로 되살릴 탈락자를 고르세요. (1회)" },
    extraNights: [
      { actionType: "helen_sleep", label: "황금빛 수면", prompt: "재워서 지킬 생존자를 고르세요. 그 밤 죽음·부정효과를 막지만 행동은 봉인됩니다." },
    ],
  },
  uno: {
    label: "우노",
    title: "명예의 군인",
    faction: "angel",
    reveal: "명예의 군인. 살아있는 한 천사팀 카운트를 더하고, 매일 밤 투쟁으로 한 명의 소속 카운트를 키웁니다.",
    passive: "군인의 사명/명예: 생존 중 천사팀 카운트를 보강하고 악마 효과 제거 흐름을 갖습니다. v1은 카운트 보너스로 축약됩니다.",
    abilitySummary: "투쟁: 대상의 소속 카운트를 더합니다. 용맹함(1회): 자기 부정 효과를 모두 씻고 명예(천사팀 카운트 +1)를 세웁니다.",
    night: { actionType: "uno_struggle", label: "투쟁", prompt: "소속 카운트를 더해줄 대상을 고르세요.", excludeSelf: true },
    extraNights: [
      { actionType: "uno_valor", label: "용맹함", prompt: "용맹함 — 자기 부정 효과를 씻고 명예를 세웁니다. (1회, 대상 없음)", self: true },
    ],
  },
  arthur: {
    label: "아서",
    title: "여명의 기사",
    faction: "angel",
    reveal: "여명의 기사. 자신은 보호막을 지니고, 매일 밤 잔불 대검으로 한 명에게 하루 무적을 부여합니다.",
    passive: "여명의 기사: 원본에서는 탈락 면역을 갖되 결백한 천사들의 희생과 연결됩니다. v1은 자기 보호막 1회로 축약됩니다.",
    abilitySummary: "잔불 대검: 한 명에게 하루 무적을 부여합니다. 단죄: 대상에 폭열을 새기고, 폭열된 자를 다시 베면 소멸시킵니다(부활 불가, 2회).",
    night: { actionType: "arthur_emberblade", label: "잔불 대검", prompt: "오늘 밤 하루 무적을 부여할 대상을 고르세요.", excludeSelf: true },
    extraNights: [
      { actionType: "arthur_judge", label: "단죄", prompt: "단죄할 대상을 고르세요. 처음엔 폭열을 새기고, 폭열된 자를 다시 베면 소멸합니다.", excludeSelf: true },
    ],
  },
  seika: {
    label: "세이카",
    title: "초신성·등대",
    faction: "angel",
    reveal: "초신성·등대의 천사. 대상에게 걸린 효과를 씻어내고 그 밤 능력을 봉인합니다.",
    passive: "별이 떠오른 밤: 같은 대상에게 초신성을 다시 터뜨리면 그 대상은 영구히 봉인됩니다. v1은 효과 제거+봉인에 집중합니다.",
    abilitySummary: "초신성: 대상의 받은 부정 효과를 모두 제거하고 그 밤 능력을 봉인합니다(재적용 시 영구 봉인).",
    night: { actionType: "seika_supernova", label: "초신성", prompt: "효과를 씻고 능력을 봉인할 대상을 고르세요. (같은 대상 재적용 시 영구 봉인)", excludeSelf: true },
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
    abilitySummary: "포교하기: 천사나 조력자를 전향자로 바꿉니다(악마·중립 불가, 연속 포교 불가). 신앙: 대상을 탈락시킵니다(악마는 면역).",
    night: {
      actionType: "pasua_convert",
      label: "포교하기",
      prompt: "포교할 대상을 고르세요. 천사와 조력자만 전향됩니다. (악마·중립 불가)",
      excludeSelf: true,
    },
    extraNights: [
      {
        actionType: "pasua_faith",
        label: "신앙",
        prompt: "신앙으로 탈락시킬 대상을 고르세요. 악마는 신앙으로 탈락하지 않습니다.",
        excludeSelf: true,
        kind: "kill",
      },
    ],
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

// 원본/도감 능력 설명. 엔진 action_type 과 분리된 표시 전용 데이터다.
// 출처: muel-bot/src/gomdoriCodex.ts (vault Universes/BoW/Characters/* 기반).
export const GOMDORI_ORIGINAL_ABILITIES: Record<string, GomdoriOriginalAbility[]> = {
  romaz: [
    { kind: "능력", name: "용의자 색출", text: "대상에게 +5 투표가치 / +10 의심가치를 받는 표로 가산합니다. 다음 집계에 반영됩니다." },
  ],
  rainer: [
    { kind: "패시브", name: "백호", text: "백호 소환 시 천사팀 카운트 +3을 지속합니다. v1에서는 무한게임 방지를 위해 축약 보너스로 적용됩니다." },
  ],
  dordan: [
    { kind: "패시브", name: "침착한 탐정", text: "누군가 탈락하면 투표 대상을 범인으로 지목하고, 범인이 그날 밤 지정하는 대상이 도르단에게 알려집니다." },
    { kind: "능력", name: "단서 수집 / 사건의 전말", text: "대상의 능력 발동을 확인하고 단서를 얻습니다. 단서가 모이면 사건의 전말로 전환됩니다." },
    { kind: "능력2", name: "잠입 수사", text: "대상을 밤 동안 관찰합니다. 탈락과 연결되면 불심검문이 발동해 그 밤 부정 효과를 무시합니다." },
  ],
  habreterus: [
    { kind: "패시브", name: "임종 선언", text: "치료 실패로 탈락한 날 투표가치가 내려가고 소명 효과가 남습니다." },
    { kind: "능력", name: "생명의 언약", text: "대상을 치료합니다. 성공하면 투표가치 보너스와 소명 대기 감소가 붙습니다." },
    { kind: "능력2", name: "삶이 있는 곳으로", text: "게임 시작 시 악마에게 존재가 알려지고, 매 밤 악마와 하브레터스가 서로를 추리하는 서브게임을 엽니다." },
  ],
  mizlet: [
    { kind: "패시브", name: "행복을 파는 가게", text: "탈락자가 생존자보다 많아지면 두 명을 복귀시키고 미즐렛은 탈락합니다. 1회성 역전 패시브입니다." },
    { kind: "능력", name: "디저트 선물", text: "대상에게 쿠키나 푸딩 효과를 부여해 탈락 시점과 밤 능력 발동을 다룹니다." },
    { kind: "능력2", name: "고급 와인", text: "디저트를 받은 대상의 부정 효과를 제거하고 미즐렛과 대화하게 합니다." },
  ],
  helen: [
    { kind: "패시브", name: "행복 쉼터", text: "시작 시 전원에게 헬렌 존재를 알리고, 수면 대상과 영혼 기억을 공유합니다." },
    { kind: "능력", name: "황금빛 수면", text: "대상을 수면 상태로 만들어 부정 효과를 막고 행동을 보류합니다." },
    { kind: "능력2", name: "자유로운 새", text: "다음 아침 탈락자들이 생존 행동을 할 수 있게 만들고, 수면으로 복귀 흐름을 이어갑니다." },
  ],
  uno: [
    { kind: "패시브", name: "군인의 사명", text: "악마 효과를 1회 제거할 수 있는 사명 효과를 가집니다." },
    { kind: "능력", name: "투쟁", text: "대상 소속 카운트 +1과 군인의 사명을 부여합니다. 우노의 명예는 천사팀 카운트와 투표가치를 키웁니다." },
    { kind: "능력2", name: "용맹함", text: "전원에게 투쟁을 발동합니다. 우노가 투표한 대상은 사망 기록과 소속이 공개됩니다. 1회성입니다." },
  ],
  arthur: [
    { kind: "패시브", name: "여명의 기사", text: "어떤 효과로도 탈락하지 않지만, 결백한 천사팀 탈락 조건이 쌓이면 함께 탈락합니다." },
    { kind: "능력", name: "잔불이 꺼지기 전에", text: "대상에게 해오름을 주고 잔불 대검을 충전합니다." },
    { kind: "능력2", name: "잔불 대검", text: "결백자에게 하루 무적을 주고, 타락자에게는 소멸로 이어지는 폭열을 남깁니다." },
  ],
  seika: [
    { kind: "패시브", name: "별이 떠오른 밤", text: "초신성 폭발 다음 밤은 의심을 생략하고 밤 대화가 길어집니다." },
    { kind: "능력", name: "초신성", text: "대상이 받는 부여 효과를 제거하고 그 밤 능력을 봉인합니다. 반복 적용 시 영구 봉인으로 커집니다." },
    { kind: "능력2", name: "자신만 아플 거야", text: "전원 부여 효과를 세이카에게 모읍니다. 악마팀 효과가 충분히 쌓이면 소멸 조건이 됩니다." },
  ],
  luru: [
    { kind: "패시브", name: "아름다운 영혼을 위한 소나타", text: "매료 3명 이상이면 즉시 연주가 시작되고, 하루 동안 전원의 투표 흐름을 바꿉니다." },
    { kind: "능력", name: "영혼을 만지는 음색", text: "대상을 매료해 처형 투표 권한을 루루에게 양도시킵니다." },
    { kind: "능력2", name: "악보 교체", text: "투표를 여러 명에게 행사하고, 악보 변경으로 다음 투표 흐름을 바꿉니다." },
  ],
  demon: [
    { kind: "패시브", name: "사탄의 마", text: "능력 성공 시 전원 투표가치가 내려갑니다. 천사팀 전체가 0이 되면 조사와 취급이 악마로 기웁니다." },
    { kind: "특수 패시브", name: "메피스토의 낙인", text: "투표 대상에게 낙인을 통지하고, 대악마가 직업 삭제와 새 천사 직업 배정을 일으킵니다." },
    { kind: "능력", name: "만악의 근원 / 감시", text: "대상을 탈락시키고, 낙인 적용자가 있으면 감시가 추가됩니다." },
    { kind: "능력2", name: "압도적인 존재감", text: "전원의 지정 대상을 낙인 적용자로 바꾸고, 공포로 횟수 제한과 중첩 효과를 손실시킵니다. 1회성입니다." },
  ],
  phantom: [
    { kind: "패시브", name: "침묵의 밤", text: "밤 종료 시 밤을 연장할 수 있습니다. 팬텀과 조력자는 접선할 수 없지만 서로의 정체와 직업은 통지됩니다." },
    { kind: "특수 패시브", name: "어둠이 내린 도시", text: "매 밤 직업 봉인 대상을 늘려갑니다. 무지목 시 악몽 충전으로 전환됩니다." },
    { kind: "능력", name: "악몽", text: "대상을 악몽에 빠뜨리고, 연속되면 영면으로 격상합니다. 악몽은 아침 탈락으로 이어집니다." },
    { kind: "능력2", name: "일식", text: "다음 아침을 밤으로 변경합니다. 대신 아침이 오면 팬텀은 소멸합니다. 1회성입니다." },
  ],
  malen: [
    { kind: "패시브", name: "악령 마야", text: "매 밤 한 명에게 빙의해 행동을 막고 악마팀 카운트로 셉니다. 마야가 말렌에게 빙의하면 그 밤 모든 효과를 무시합니다." },
    { kind: "특수 패시브", name: "악담", text: "탈락자가 생기면 혼을 생성하고, 혼이 시체로 바뀌어 투표·의심·능력 보조를 합니다." },
    { kind: "능력", name: "혼령 방출", text: "지목 대상을 공격합니다. 반복되면 혼령 표식과 마비, 생존 미취급으로 이어집니다." },
    { kind: "능력2", name: "신출귀몰", text: "혼령 표식을 수거해 다음 밤 시체를 소환합니다. 1회성입니다." },
  ],
  besto: [
    { kind: "패시브", name: "두 번째 자아", text: "밤마다 솔과 하베스토 판정을 바꿉니다. 조사, 투표가치, 의심 지목 조건을 흔듭니다." },
    { kind: "특수 패시브", name: "배후", text: "조력자와 영혼을 교체해 베스토·조력자 대상 능력 효과가 반대로 통지됩니다." },
    { kind: "능력", name: "히든 포지션", text: "미발동 시 강화되고, 다음 아침 토론 중 효과발동자가 언급한 대상을 탈락시킵니다." },
    { kind: "능력2", name: "누명씌우기", text: "대상이 히든 포지션 효과를 받게 합니다. 이 효과로 탈락이 발생하면 강화됩니다." },
  ],
  gain: [
    { kind: "패시브", name: "진실을 가리는 암흑", text: "악마와 접선·대화하고, 악마가 처형 또는 탈락할 때 1회 없던 일로 만듭니다." },
    { kind: "능력", name: "약간의 위선", text: "대상 직업을 통지하고 적용 효과를 다음 밤으로 연기합니다. 조건에 따라 다음 위선이 탈락 효과로 바뀝니다." },
    { kind: "능력2", name: "급습", text: "대상의 통지를 삭제하고 급습을 충전합니다. 다음 아침까지 악마와 대화합니다. 1회성입니다." },
  ],
  luna: [
    { kind: "패시브", name: "달빛이 비치는 우물", text: "루나가 투표·의심한 대상에게 달빛을 남기고, 달의 힘이 가득 차면 효과를 발동합니다." },
    { kind: "능력", name: "고요한 적막", text: "달빛 대상 수에 따라 달의 힘을 충전하고, 가득 차면 토론과 투표 흐름을 바꿉니다." },
    { kind: "능력2", name: "공포 속에 밀어 넣다", text: "대상에게 달빛 저주를 남깁니다. 달의 힘이 가득 차면 대상은 직업을 잃고 악마팀이 됩니다." },
  ],
  logen: [
    { kind: "패시브", name: "부서진 펜던트", text: "시작 시 악마와 접선합니다. 악마팀에 지워지지 않는 펜던트 효과를 남깁니다." },
    { kind: "능력", name: "네 안에 없는 것", text: "대상의 가장 가까운 밤 능력 효과가 소멸한다는 통지와 펜던트를 적용합니다." },
  ],
  ellen: [
    { kind: "패시브", name: "박해자 / 해체된 퍼즐", text: "홀수날 투표 대상은 투표가 진행될 때마다 투표가치가 오릅니다. 자아 상태에 따라 투표·의심·능력 가치가 바뀝니다." },
    { kind: "능력", name: "비치지 않는 자아", text: "후속 다단계 능력입니다. 현재 v1은 박해 투표 무게 증가로 축약되어 있습니다." },
  ],
  pasua: [
    { kind: "패시브", name: "구원자", text: "시작 전 파스아 존재를 전원에게 통지합니다. 생존자 중 파스아 팀이 충분히 커지면 즉시 승리합니다." },
    { kind: "능력", name: "포교", text: "대상을 포교합니다. 악마와 중립은 포교할 수 없고, 전향자는 파스아 승리를 따릅니다." },
    { kind: "능력2", name: "신앙", text: "대상을 탈락시킵니다. 악마는 탈락하지 않습니다." },
  ],
};

export function roleOriginalAbilities(role?: string | null): GomdoriOriginalAbility[] {
  return role ? GOMDORI_ORIGINAL_ABILITIES[role] ?? [] : [];
}

export function roleMeta(role?: string | null): GomdoriRoleMeta | null {
  return role ? GOMDORI_ROLES[role] ?? null : null;
}

export function roleLabel(role?: string | null): string {
  if (!role) return "";
  return GOMDORI_ROLES[role]?.label ?? role;
}

export function roleArchetype(role?: string | null): string {
  switch (role) {
    case "demon":
      return "처치·재배정";
    case "phantom":
      return "지연 처치·봉인";
    case "malen":
      return "처치·빙의";
    case "besto":
      return "처치·변신";
    case "gain":
      return "보호·접선";
    case "luna":
      return "타락·충전";
    case "logen":
      return "무력화·접선";
    case "ellen":
      return "투표 압박";
    case "romaz":
      return "의심·투표 압박";
    case "rainer":
      return "카운트 보강";
    case "dordan":
    case "police":
      return "조사·단서";
    case "doctor":
    case "habreterus":
      return "보호";
    case "mizlet":
    case "helen":
      return "부활";
    case "uno":
      return "카운트 보정";
    case "arthur":
      return "보호·무적";
    case "seika":
      return "봉인";
    case "luru":
      return "투표 위임";
    case "pasua":
      return "포교·단독 승리";
    case "converted":
      return "전향";
    case "corrupted":
      return "타락";
    default: {
      const meta = roleMeta(role);
      if (meta?.roster === "helper") return "접선·보조";
      if (meta?.roster === "neutral" || meta?.faction === "neutral") return "중립";
      return "토론·투표";
    }
  }
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
