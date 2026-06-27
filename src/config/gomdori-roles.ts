// Gomdori 직업 매니페스트 — 프론트 표시(라벨/설명/밤 능력)의 single source of truth.
// backend engine(roles.ts)·match-start 분포와 동일 형상 유지(명시적 sync).
// 관련: muel-bot/docs/gomdori-w4-roles-design.md, vault [[Universes/BoW/Lore/Gomdori-마피아-규칙]]

export type GomdoriRoleId =
  // 레거시(미배정)
  | "citizen" | "doctor" | "police" | "helper"
  // 악마 풀
  | "demon" | "phantom" | "malen"
  // 조력자 풀
  | "gain" | "luna" | "logen" | "ellen"
  // 천사 풀
  | "romaz" | "rainer" | "dordan" | "habreterus" | "mizlet" | "helen" | "uno" | "arthur" | "seika" | "luru"
  // 중립
  | "pasua" | "rosanne" | "converted"
  // 게임 내 변환 산물(배정 풀 아님): 루나 타락(천사 → 악마팀)
  | "corrupted";

export interface GomdoriNightAction {
  actionType: string; // submitAction 으로 보낼 action_type
  label: string; // 제출 버튼
  prompt: string; // 대상 선택 안내
  excludeSelf?: boolean; // 자신 제외 대상
  kind?: "kill"; // 처치형(악마 처치/악몽/혼령 방출 등) — demon 블록 처치-UI 판정
  self?: boolean; // 자기 대상(변신/일식) — 대상 그리드 없이 버튼만, target=null 제출
  targetDead?: boolean; // 탈락자 대상(헬렌 자유로운 새 등 추가 부활) — 무대에 죽은 자만 노출
  allowDeadTarget?: boolean; // 생존자 OR 탈락자 모두 대상 가능(미즐렛 쿠키 — 탈락자 직접 지정 허용)
  maxTargets?: number; // 멀티타깃 지정 수(아서 잔불이 꺼지기 전에=3). 미지정/1=단일 대상.
  // 동적 상한(팬텀 어둠이 내린 도시=매 아침 +1). UI 상한 = maxTargets + maxTargetsPerDay*(dayNumber-1).
  // dayNumber 기반 하한 근사 — 추가 밤(일식·침묵의 밤)으로 실제 상한이 더 커질 수 있으나 백엔드가
  // 실제 상한을 강제하므로 과대 선택→거부가 아니라, UI 가 항상 실제 이하만 허용(안전).
  maxTargetsPerDay?: number;
  // 본인 동적 보너스를 상한에 더한다(로건 부서진 펜던트 3+ → +2). 값은 myPlayer.targetBonus
  // (뷰 target_bonus, 본인 전용)에서 온다. 엔진 ActiveAbility.targetCountCounter 와 짝.
  maxTargetsSelfBonus?: boolean;
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
  // 추가 밤 능동(예: 팬텀 봉인+일식, 로잔느 만들어가는 미래). 각각 독립 제출. night2 의 일반화.
  extraNights?: GomdoriNightAction[];
}

export type GomdoriOriginalAbilityKind = "패시브" | "특수 패시브" | "능력" | "능력2";

export interface GomdoriOriginalAbility {
  kind: GomdoriOriginalAbilityKind;
  name: string;
  text: string;
  /** 엔진에 배선된 action_type — 있으면 인게임에서 이 능력으로 직접 플레이된다. */
  actionType?: string;
  /**
   * 구현 상태(원본 대비). live=원본대로 인게임 반영 / partial=핵심만 / planned=예정.
   * 미지정이면 '원본'으로만 표시(구현 주장 없음). 엔진 심화가 배치별로 이 값을 올린다.
   * 목표: 전 능력 live → 별도 "현재 게임 액션" 층 소멸.
   */
  status?: "live" | "partial" | "planned";
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
    passive: "사탄의 마: 처치 성공 시 자신을 제외한 전원의 투표가치 -1 — 마을은 표로 악마를 처형할 수 없습니다(투표 독점). 생존 천사팀 전체의 투표가치가 0 이하로 떨어지면 모든 조사·취급 효과가 '악마'로 판정되어 카운트와 승리 판정에도 자동 반영됩니다(살아있는 대악마가 영역을 유지하는 동안). 메피스토 낙인으로 직업을 재배정합니다.",
    abilitySummary: "처치로 한 명을 제거하며 전원의 투표가치를 깎고(사탄의 마 — 천사팀 0 시 전 효과·승리에서도 악마 판정), 메피스토 낙인으로 대상의 직업을 비밀리에 재배정합니다. 낙인 적용자가 있으면 처치 시 감시가 추가되어 다음 아침 2표를 행사합니다.",
    demonTeam: true,
    night: {
      actionType: "demon_kill",
      label: "처치하기",
      prompt: "조력자와 상의하여 오늘 밤 처치할 대상을 고르세요. 처치에 성공하면 사탄의 마로 자신을 제외한 전원의 투표가치가 깎입니다. 낙인 적용자가 있으면 감시가 추가되어 다음 아침 2표를 행사합니다.",
      excludeSelf: true,
      kind: "kill",
    },
    extraNights: [
      { actionType: "daeakma_brand", label: "메피스토 낙인", prompt: "낙인을 찍을 대상을 고르세요. 그 직업이 삭제되고 다른 정체로 비밀리에 재배정됩니다.", excludeSelf: true },
      { actionType: "daeakma_dominion", label: "압도적 존재감", prompt: "압도적 존재감 — 이번 밤 전원의 능력을 봉인합니다. (1회, 대상 없음)", self: true },
      { actionType: "demon_deduce", label: "역추리", prompt: "삶이 있는 곳으로 — 하브레터스로 의심되는 대상을 지목합니다. 적중하면 하브레터스가 다음 처치로 탈락하며 치료 효과를 무시합니다.", excludeSelf: true },
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
    reveal: "수호신 백호의 소환자. 백호 소환으로 천사팀 카운트를 늘리고, 강한 의지로 대상을 관찰해 백호의 거친 포효를 충전합니다.",
    passive: "수호신 백호: 1회 소환으로 천사팀 카운트 +3을 영구 획득(생존 무관). 거친 포효: 강한 의지 2회 누적 시 2명을 직접 지목해 백호 발톱을 새깁니다 — 천사팀 카운트 -1, 강한 의지 2 소비(지목 대상은 다음 아침 투표가치 3 이상 얻으면 소멸). 지목하지 않으면 그 밤 강한 의지 대상 중 최대 2명을 자동으로 할퀴는 폴백이 유지됩니다.",
    abilitySummary: "백호 소환(1회): 천사팀 카운트 +3. 강한 의지: 한 명을 관찰하고 강한 의지 +1(같은 대상 연속 지목 불가). 관찰 대상이 그 밤 탈락하면 강한 의지 +2 추가. 거친 포효: 강한 의지 2회 누적 시 2명을 지목해 백호 발톱. 그날의 저항(1회, 첫 밤 불가): 백호 한 마리 추가 소환 — 천사팀 카운트 +1 + 강한 의지 +1.",
    night: {
      actionType: "rainer_summon",
      label: "백호 소환",
      prompt: "백호를 소환해 천사팀 카운트를 늘립니다. (1회, 대상 없음)",
      self: true,
    },
    extraNights: [
      { actionType: "rainer_resolve", label: "강한 의지", prompt: "관찰할 대상을 고르세요(같은 대상 연속 지목 불가). 강한 의지 +1, 관찰 대상이 그 밤 탈락하면 추가 +2.", excludeSelf: true },
      { actionType: "rainer_roar", label: "거친 포효", prompt: "강한 의지 2회 누적 시 2명을 지목해 백호 발톱을 새깁니다(천사팀 카운트 -1, 강한 의지 2 소비). 발톱이 새겨진 대상은 다음 아침 투표가치 3 이상 얻으면 소멸합니다.", excludeSelf: true, maxTargets: 2 },
      { actionType: "rainer_resistance", label: "그날의 저항", prompt: "그날의 저항 — 백호 한 마리 추가 소환합니다. 천사팀 카운트 +1, 강한 의지 +1. (1회)", self: true },
    ],
  },
  romaz: {
    label: "로마즈",
    title: "용의자 색출 경찰",
    faction: "angel",
    reveal: "정의로운 경찰. 매일 밤 용의자를 지목해 압박을 키우고, 조사장으로 악마를 색출해 신념으로 처단합니다.",
    abilitySummary: "용의자 색출: 대상을 용의자로 지목하고 조사장을 모읍니다(조사장 보유 시 악마 여부 통지, 3장이면 악마팀 무조건 구금). 신념(1회): 용의자였던 대상 1명을 탈락시킵니다(천사팀이면 봉인).",
    night: {
      actionType: "romaz_suspect",
      label: "용의자 색출",
      prompt: "용의자로 지목할 대상을 고르세요. 투표·의심 가치가 오르고 조사장 1장을 얻습니다(조사장 보유 시 악마 여부 통지, 3장이면 악마팀 무조건 구금).",
      excludeSelf: true,
    },
    extraNights: [
      { actionType: "romaz_conviction", label: "신념", prompt: "신념 — 용의자로 지목됐던 대상 1명을 탈락시킵니다(무시 불가). 천사팀이면 신념이 봉인됩니다. (1회)", excludeSelf: true },
    ],
  },
  gain: {
    label: "가인",
    title: "진실을 가리는 암흑",
    roster: "helper",
    faction: "demon",
    reveal: "진실을 가리는 조력자. 악마를 살해·처형 1회로부터 보호하고, 두 번째 밤 동안 정체를 알아내며 마지막엔 급습으로 통지를 가립니다.",
    passive: "진실을 가리는 암흑: 악마와 접선하고 악마의 첫 치명적 탈락을 보호합니다. 보호막은 세 번째 밤 종료 시 자동 만료됩니다(canon — 가인 생존 여부 무관).",
    abilitySummary: "약간의 위선: 대상의 직업(진영)을 알아내고 그 밤 능력의 발동을 취소시킵니다. 악마가 그 대상을 투표했었다면 다음 위선은 능력을 봉인시키는 효과로 강화됩니다. 급습(1회): 대상에 통지 차단 표식을 남기고 다음 아침까지 악마와 대화하는 회로를 엽니다.",
    demonTeam: true,
    night: { actionType: "gain_hypocrisy", label: "약간의 위선", prompt: "정체를 알아낼 대상을 고르세요. 그 진영이 통지되고 대상의 그 밤 능력이 취소됩니다.", excludeSelf: true },
    extraNights: [
      { actionType: "gain_raid", label: "급습", prompt: "급습으로 대상의 통지를 한 라운드 차단합니다. (1회) 가인은 급습 충전을 얻고, 회로가 열리면 악마와 다음 아침까지 대화할 수 있습니다.", excludeSelf: true },
    ],
  },
  // --- 기본 로스터: 악마 풀 (전부 v1 처치) ---
  phantom: {
    label: "팬텀",
    title: "침묵의 밤",
    roster: "demon",
    faction: "demon",
    reveal: "침묵의 밤의 악마. 어둠으로 다수를 봉인하고, 악몽으로 빠뜨리며(아침 탈락), 영면을 쌓아 일괄 처치하고, 침묵의 밤으로 밤을 연장합니다.",
    passive: "침묵의 밤: 밤 종료 시 밤을 한 번 더 연장(악마팀 재행동). 대가로 생존 천사팀 소속 카운트 +1, 밤 대화 +1분. 팬텀-조력자는 접선(밤 채팅) 불가하나 서로의 정체·직업은 통지받습니다.",
    abilitySummary: "어둠이 내린 도시(매 아침 봉인 가능 수 +1)로 능력을 막고, 악몽(5회 제한, 미봉인 시 +2 충전)으로 지연 탈락을 만들며, 같은 대상 재지정으로 영면을 쌓아 원할 때 일괄 처치합니다. 침묵의 밤으로 밤을 연장하고, 일식으로 아침을 밤으로 바꿉니다.",
    demonTeam: true,
    night: { actionType: "phantom_nightmare", label: "악몽", prompt: "악몽에 빠뜨릴 대상을 고르세요. 아침이 되면 탈락합니다(밤 보호로 막지 못함). 이미 악몽인 대상을 재지정하면 영면이 됩니다. 사용 5회 제한.", excludeSelf: true, kind: "kill" },
    extraNights: [
      { actionType: "phantom_seal", label: "어둠이 내린 도시", prompt: "오늘 밤 능력을 봉인할 대상을 고르세요(아침마다 +1명, 같은 대상 연속 지목 불가). 봉인은 그 밤만 유효합니다.", excludeSelf: true, maxTargets: 2, maxTargetsPerDay: 1 },
      { actionType: "phantom_reap", label: "영면 발동", prompt: "쌓아둔 영면 대상을 전원 일괄 처치합니다.", self: true },
      { actionType: "phantom_silentnight", label: "침묵의 밤", prompt: "밤을 한 번 더 연장합니다(악마팀 재행동). 대가로 생존 천사팀 카운트 +1, 밤 대화 +1분.", self: true },
      { actionType: "phantom_eclipse", label: "일식", prompt: "일식 — 다음 아침을 밤으로 바꿉니다. 단, 그 아침에 당신은 소멸합니다. (1회)", self: true },
    ],
  },
  malen: {
    label: "말렌",
    title: "강령술사",
    roster: "demon",
    faction: "demon",
    reveal: "악령 마야의 강령술사. 혼령을 방출하고, 빙의로 묶고, 신출귀몰로 시체를 부립니다.",
    passive: "악령 마야: 빙의와 혼/시체 축적을 다룹니다. 혼 2개는 시체로 바뀌고, 신출귀몰은 혼령 표식을 다음 밤 시체로 소환합니다.",
    abilitySummary: "혼령 방출로 표식을 남기거나 잠식시키고, 빙의로 대상의 밤 행동을 막으며 그 라운드 악마팀으로 셉니다. 신출귀몰은 혼령 표식을 수거해 다음 밤 시체를 소환합니다.",
    demonTeam: true,
    night: { actionType: "malen_release", label: "혼령 방출", prompt: "혼령으로 처치할 대상을 고르세요.", excludeSelf: true, kind: "kill" },
    extraNights: [
      { actionType: "malen_possess", label: "빙의", prompt: "빙의할 대상을 고르세요. 그 밤 행동을 못 하고 악마팀으로 셈됩니다.", excludeSelf: true },
      { actionType: "malen_elusive", label: "신출귀몰", prompt: "무대의 혼령 표식을 수거해 다음 밤 시체를 소환합니다. (1회, 대상 없음)", self: true },
    ],
  },
  rosanne: {
    label: "로잔느",
    title: "백일몽 / 세헤라자드",
    roster: "demon",
    faction: "demon",
    reveal: "악마 진영(캐논 [악마]5)의 세헤라자드 — 악마팀과 함께 승리합니다. 더해, 아침을 일곱 번 맞이하면 백일몽으로 홀로도 단독 승리할 수 있습니다. 대신 토론은 짧아지고 무투에 참여할 수 없습니다.",
    passive: "백일몽: 아침을 일곱 번 맞이하면 즉시 단독 승리합니다. 증오: 지목한 대상의 투표가치를 1 낮추고, 투표가치가 0이 되면 즉시 처형합니다. 조망: 로잔느가 살아있는 동안 타인에게 능력을 적용한 플레이어는 그 밤 투표가치가 낮아집니다(1 미만으로는 내려가지 않음).",
    abilitySummary: "증오: 지목 대상의 투표가치를 깎고 0이 되면 처형합니다. 만들어가는 미래: 대상에 원한을 새기고 로잔느의 아침을 한 번 더 끌어옵니다(르상티망). 라포르: 두 사람의 운명을 묶어 한쪽이 죽으면 다른 쪽도 죽습니다. 외현기억: 탈락자를 매 아침 되살려 그 날 끝에 처형합니다. 건너뛰기: 이번 밤의 다른 모든 효과와 통지를 전부 다음 밤으로 넘깁니다(다음 밤 시작에 다시 발동).",
    night: { actionType: "rosanne_hatred", label: "증오", prompt: "투표가치를 깎을 대상을 고르세요. 0이 되면 즉시 처형됩니다.", excludeSelf: true },
    extraNights: [
      { actionType: "rosanne_resentment", label: "만들어가는 미래", prompt: "원한을 새길 대상을 고르세요(르상티망). 로잔느의 아침이 한 번 더 늘어납니다. ('만들어가는 미래' 충전 1 소비)", excludeSelf: true },
      { actionType: "rosanne_rapport", label: "라포르", prompt: "운명을 묶을 두 사람을 고르세요. 한쪽이 처형·탈락·소멸하면 다른 쪽도 같은 운명을 맞습니다. ('만들어가는 미래' 충전 1 소비)", excludeSelf: true },
      { actionType: "rosanne_manifest", label: "외현기억", prompt: "되살릴 탈락자를 고르세요. 매 아침 되살아나 그 날의 끝에 처형됩니다. 투표로 한 번 더 처형되면 효과가 사라집니다. ('만들어가는 미래' 충전 1 소비)", excludeSelf: true },
      { actionType: "rosanne_skip", label: "건너뛰기", prompt: "이번 밤에 발동한 다른 모든 효과와 통지를 전부 다음 밤으로 넘깁니다(다음 밤 시작에 다시 발동). (1회, 대상 없음)", self: true },
    ],
  },
  // --- 기본 로스터: 조력자 풀 (악마 회로 패시브) ---
  luna: {
    label: "루나",
    title: "달의 사제",
    roster: "helper",
    faction: "demon",
    reveal: "달의 사제. 달의 힘을 모아 가득 차면 셋 중 하나를 선택합니다 — 천사 타락(공포), 능력 보너스 부호 반전(해가 저문다), 달빛 cascade 처치(달이 차오른다).",
    passive: "달빛이 비치는 우물: 당신이 투표·의심한 대상에 달빛이 깃들고 달의 힘이 차오릅니다(천사·중립 +1, 악마 +3, 100% = 10). 100% 달성 시 효과 셋 중 하나를 선택 — 충전은 공유 풀이라 셋 중 한 번만 발동됩니다.",
    abilitySummary: "고요한 적막: 달의 힘을 비례 충전. 공포 속에 밀어 넣다(1회): 천사 한 명을 악마팀으로 타락. 해가 저문다(1회): 다음 처형 투표에서 능력으로 증가한 표(우노 명예·아서 위용 등) 부호 반전. 달이 차오른다(1회): 그 밤 악마 처치가 달빛 대상에 발동하면 모든 달빛 대상 cascade.",
    demonTeam: true,
    night: { actionType: "luna_corrupt", label: "공포 속에 밀어 넣다", prompt: "달의 힘이 가득 찼을 때, 악마팀으로 타락시킬 천사를 고르세요. (달의 힘 10 소비, 1회)", excludeSelf: true },
    extraNights: [
      { actionType: "luna_moonlight", label: "고요한 적막", prompt: "달의 힘을 비례 충전합니다(달빛 대상 1명당 천사 +1·악마 +3). 당신이 투표·의심한 대상에 달빛이 깃듭니다.", self: true },
      { actionType: "luna_dawn", label: "해가 저문다", prompt: "해가 저문다 — 다음 처형/찬반 투표에서 능력으로 증가한 투표가치(우노 명예 +10·아서 위용 등)를 마이너스로 판정합니다. (달의 힘 10 소비, 1회)", self: true },
      { actionType: "luna_moonrise", label: "달이 차오른다", prompt: "달이 차오른다 — 이번 밤 악마의 처치가 달빛 대상에 발동하면 모든 달빛 대상에 같은 효과로 cascade됩니다. (달의 힘 10 소비, 1회)", self: true },
    ],
  },
  logen: {
    label: "로건",
    title: "부서진 펜던트",
    roster: "helper",
    faction: "demon",
    reveal: "부서진 펜던트의 조력자. 한 명을 표식해, 그가 다음에 쓰는 능력을 소멸시킵니다.",
    passive: "부서진 펜던트: 시작 시 악마와 접선하고 악마팀에 지워지지 않는 펜던트 효과를 남깁니다.",
    abilitySummary: "네 안에 없는 것: 대상이 가장 가까운 밤에 발동하는 능력 효과를 소멸시킵니다(표식은 쓸 때까지 남습니다). 전부 괜찮을 거야(1회): 펜던트 적용자는 무적, 비적용자는 파멸 1중첩 — 파멸 2중첩이면 소멸합니다.",
    demonTeam: true,
    night: { actionType: "logen_nullify", label: "네 안에 없는 것", prompt: "다음 능력을 소멸시킬 대상을 고르세요(펜던트 3+ 시 여러 명).", excludeSelf: true, maxTargets: 1, maxTargetsSelfBonus: true },
    extraNights: [
      { actionType: "logen_allwell", label: "전부 괜찮을 거야", prompt: "전부 괜찮을 거야 — 펜던트가 적용된 자는 그 밤 무적이 되고, 적용되지 않은 자는 파멸 1중첩(2중첩 시 소멸)을 받습니다. (1회, 대상 없음)", self: true },
    ],
  },
  ellen: {
    label: "엘런",
    title: "박해자",
    roster: "helper",
    faction: "demon",
    reveal: "박해자. 당신이 투표한 사람을 처형대로 몰아갑니다. 비치지 않는 자아로 대상의 자아를 망가뜨려 2밤 가치를 빼앗고, 자아가 회복되면 박해가 자해로 전환됩니다.",
    passive: "박해자/해체된 퍼즐: 홀수날 박해는 직전 투표 대상의 받는 표를 +3/+6/+9 누진. 비치지 않는 자아로 자아가 망가진 대상은 2밤 동안 투표·의심·능력 가치를 모두 상실하고, 그 carrier를 투표하면 다음 아침 회복됩니다. 누군가 자아를 되찾으면 이후 박해는 엘런 자신을 대상으로 누진됩니다.",
    abilitySummary: "박해: 자기 투표 대상의 받는 표를 누진합니다. 비치지 않는 자아: 대상(타인)의 자아를 망가뜨려 2밤 가치 상실 + 자아를 투표가치 최고 carrier에게 이전 — 대상이 carrier를 투표하면 회복하고, 한 번 망가진 대상은 재차 불가합니다. 혼탁해진 정의(2회): 대상의 다음 밤 능력을 봉인하고, 이미 박해에 찍힌 대상이면 탈락시킵니다.",
    demonTeam: true,
    night: { actionType: "ellen_persecute", label: "박해", prompt: "당신이 직전에 투표한 대상을 처형대로 몰아갑니다. 누군가 자아를 되찾은 뒤엔 자기 자신이 박해 대상이 됩니다.", self: true },
    extraNights: [
      { actionType: "ellen_shatter", label: "비치지 않는 자아", prompt: "비치지 않는 자아 — 대상의 자아를 망가뜨립니다. 그 대상은 2밤 동안 투표·의심·능력 가치를 모두 잃고, 자아가 투표가치 최고 carrier에게 이전됩니다. 대상이 carrier를 투표하면 회복하며, 한 번 망가진 대상은 다시 고를 수 없습니다.", excludeSelf: true },
      { actionType: "ellen_chaos", label: "혼탁해진 정의", prompt: "혼탁해진 정의 — 대상의 다음 밤 능력을 봉인합니다. 이미 박해에 찍힌 대상이라면 그 대상을 탈락시킵니다. (2회)", excludeSelf: true },
    ],
  },
  // --- 기본 로스터: 천사 풀 ---
  dordan: {
    label: "도르단",
    title: "탐정",
    faction: "angel",
    reveal: "탐정. 매일 밤 한 명의 정체를 조사할 수 있습니다.",
    passive: "침착한 탐정: 누군가 탈락할 때마다 단서가 쌓입니다. 단서가 3개 모이면 조사가 정확한 직업까지 밝혀냅니다(정밀 조사).",
    abilitySummary: "조사하기: 악마인지 확인합니다. 단서 3개부터는 정확한 직업까지 알아냅니다. 잠입 수사: 관찰 대상이 그 밤 탈락하면 그 밤 부정 효과를 모두 무시합니다(불심검문).",
    night: { actionType: "police_investigate", label: "조사하기", prompt: "오늘 밤 정체를 알아볼 사람을 고르세요. (단서 3개부터 정밀 조사)", excludeSelf: true },
    extraNights: [
      { actionType: "dordan_infiltrate", label: "잠입 수사", prompt: "밤 동안 관찰할 대상을 고르세요. 그 대상이 그 밤 탈락하면 불심검문 발동 — 당신은 그 밤 부정 효과를 모두 무시합니다.", excludeSelf: true },
    ],
  },
  habreterus: {
    label: "하브레터스",
    title: "치료자",
    faction: "angel",
    reveal: "생명의 언약을 맺는 치료자. 매일 밤 한 명을 보호합니다. 삶이 있는 곳으로 — 악마와 서로 정체를 추리하는 위험한 양방향 게임을 펼칩니다.",
    passive: "임종 선언/소명: 그 라운드 누군가 탈락하면 자기 투표가치 -1 + 천사팀 카운트 +1 + 부정효과 정화 + 소명 3일 쿨다운(생명의 언약 성공 시 -1일). 삶이 있는 곳으로: 매 밤 양방향 추리 — 하브 적중 시 그 밤 악마 효과 면역, 악마 적중 시 다음 처치(치료 무시)로 하브 탈락.",
    abilitySummary: "치료하기: 오늘 밤 공격으로부터 보호합니다. 성공 시 투표가치 +3 + 소명 쿨다운 -1. 삶이 있는 곳으로: 의심 가는 악마를 지목 — 적중하면 그 밤 악마 효과 면역.",
    night: { actionType: "doctor_heal", label: "치료하기", prompt: "오늘 밤 공격으로부터 보호할 사람을 고르세요. (자기 자신 포함) 성공 시 투표가치 +3 + 소명 쿨다운 -1." },
    extraNights: [
      { actionType: "habreterus_deduce", label: "삶이 있는 곳으로", prompt: "악마라 의심되는 대상을 지목하세요. 적중하면(악마 처치자) 그 밤 받은 부정 효과를 모두 무시합니다.", excludeSelf: true },
    ],
  },
  mizlet: {
    label: "미즐렛",
    title: "행복을 파는 가게",
    faction: "angel",
    reveal: "행복을 파는 가게의 주인. 디저트로 위로하고, 와인으로 정화하며, 어둠이 깊어지면 다수를 부활시킵니다.",
    passive: "행복을 파는 가게: 탈락자가 생존자보다 많아지면 가장 최근 탈락 2명을 복귀시키고 미즐렛은 탈락합니다(소멸·부활불가 무시, 1회). 디저트를 준 대상과는 다과회 채팅 회로가 열리고, 고급 와인 발동 시 디저트 보유자 전원이 미즐렛과 회식 채팅(현재 backend 이벤트 신호 — Discord plumbing 후속).",
    abilitySummary: "디저트 선물(부활): 탈락한 한 명을 되살립니다(1회). 쿠키: 보호 + 보유자가 탈락해도 그 밤 능력을 발동합니다. 푸딩: 보호 + 단일 대상 능력을 봉인·지목 무시하고 발동합니다('무시 불가'). 고급 와인(1회): 전원 정화 + 디저트 미제공자 투표가치 -1 + 디저트 보유자 전원과 와인 회식 채팅.",
    night: { actionType: "mizlet_revive", label: "디저트 선물(부활)", prompt: "디저트로 되살릴 탈락자를 고르세요. (1회)" },
    extraNights: [
      { actionType: "mizlet_cookie", label: "디저트 선물(쿠키)", prompt: "쿠키를 줄 대상을 고르세요(탈락자도 가능). 그 밤 보호받고, 쿠키 보유자는 탈락해도 그 밤 능력이 발동됩니다. 이미 탈락한 대상은 가장 가까운 밤 활동에 참여합니다. 미즐렛과의 다과회 채팅 회로가 열립니다.", allowDeadTarget: true },
      { actionType: "mizlet_pudding", label: "디저트 선물(푸딩)", prompt: "푸딩을 줄 생존자를 고르세요. 그 밤 보호받고, 푸딩 보유자가 단일 대상 능력을 쓰면 봉인·지목을 무시하고 발동합니다('무시 불가'). 처형으로 탈락하면 탈락 시점이 밤으로 조정됩니다." },
      { actionType: "mizlet_wine", label: "고급 와인", prompt: "고급 와인 — 전원의 부정 효과를 씻어내고 디저트 보유자 전원과 와인 회식 채팅을 엽니다. 디저트를 받지 못한 사람은 투표가치 -1. (1회, 대상 없음)", self: true },
    ],
  },
  helen: {
    label: "헬렌",
    title: "황금빛 수면",
    faction: "angel",
    reveal: "황금빛 수면의 천사. 생존자를 재워 지키고, 한 번 잠들었던 자는 죽음 이후에도 다시 재워 되살릴 수 있습니다.",
    passive: "행복 쉼터/추억을 간직하는 법: 황금빛 수면을 받은 자는 영혼이 기억되어, 탈락 후에도 같은 헬렌의 수면을 다시 받을 수 있습니다. 추억된 탈락자에게 수면을 발동하면 그 자리에서 부활합니다(소멸은 부활 불가).",
    abilitySummary: "황금빛 수면: 생존자를 재우면 그 밤 죽음·부정효과로부터 보호합니다(행동은 봉인). 한 번 잠들었던 추억된 탈락자에게 다시 쓰면 부활시킵니다(canon 수면으로 깨면 복귀). 자유로운 새(1회): 탈락한 한 명을 추가로 되살립니다.",
    night: { actionType: "helen_revive", label: "수면(부활)", prompt: "수면으로 되살릴 탈락자를 고르세요. (1회)" },
    extraNights: [
      { actionType: "helen_sleep", label: "황금빛 수면", prompt: "재워서 지킬 대상을 고르세요. 처음 잠든 자는 영혼이 기억되어 이후 탈락해도 다시 재울 수 있고, 추억된 탈락자는 수면이 발동되면 부활합니다." },
      { actionType: "helen_freebird", label: "자유로운 새", prompt: "자유로운 새 — 탈락한 한 명을 추가로 되살립니다. (1회)", targetDead: true },
    ],
  },
  uno: {
    label: "우노",
    title: "명예의 군인",
    faction: "angel",
    reveal: "명예의 군인. 살아있는 한 천사팀 카운트를 더하고, 매일 밤 투쟁으로 한 명의 소속 카운트를 키웁니다.",
    passive: "명예: 살아있는 한 천사팀 카운트 +5와 투표가치 +5를 갖습니다(사탄의 마 -1 을 뚫는 표 경로). 군인의 사명: 투쟁 2회로 충전된 대상은 악마 효과 1회를 제거합니다.",
    abilitySummary: "투쟁: 대상의 소속 카운트를 더합니다. 용맹함(1회): 자기 부정 효과를 모두 씻고 전원에게 투쟁을 발동합니다.",
    night: { actionType: "uno_struggle", label: "투쟁", prompt: "소속 카운트를 더해줄 대상을 고르세요.", excludeSelf: true },
    extraNights: [
      { actionType: "uno_valor", label: "용맹함", prompt: "용맹함 — 자기 부정 효과를 씻고 명예를 세웁니다. (1회, 대상 없음)", self: true },
    ],
  },
  arthur: {
    label: "아서",
    title: "여명의 기사",
    faction: "angel",
    reveal: "여명의 기사. 어떤 효과로도 밤에 탈락하지 않으며, 충전한 잔불 대검으로 타락자를 식별해 소멸시키거나 결백자를 지킵니다.",
    passive: "여명의 기사: 밤 효과로 탈락하지 않습니다. 단 결백한 천사팀이 3명 이상 탈락하면 다음 아침 함께 탈락합니다. 결백 천사 탈락 1명당 잔불 대검이 1 충전되고, 충전이 3 이상이면 위용(해오름 결백 천사 1명당 투표가치 +3)이 켜집니다.",
    abilitySummary: "잔불이 꺼지기 전에: 대상에게 해오름을 부여해 결백/타락을 식별하고 잔불 대검을 충전합니다. 잔불 대검: 충전을 1 써서 결백자에겐 하루 무적, 타락자에겐 폭열(다시 베면 소멸). 결백/타락은 진영이 아니라 '부정 효과를 쓴 적 있는가'로 가립니다.",
    night: { actionType: "arthur_judge", label: "잔불이 꺼지기 전에", prompt: "해오름으로 식별할 대상을 고르세요(최대 3명). 결백/타락을 통지받고 잔불 대검이 1 충전됩니다. ", excludeSelf: true, maxTargets: 3 },
    extraNights: [
      { actionType: "arthur_emberblade", label: "잔불 대검", prompt: "충전을 1 써서 한 명을 벱니다. 부정 효과를 쓴 적 있는 '타락자'면 폭열(다시 베면 소멸), 그렇지 않은 '결백자'면 하루 무적을 부여합니다. 충전이 없으면 발동되지 않습니다.", excludeSelf: true },
    ],
  },
  seika: {
    label: "세이카",
    title: "초신성·등대",
    faction: "angel",
    reveal: "초신성·등대의 천사. 대상에게 걸린 효과를 씻어내고 그 밤 능력을 봉인합니다.",
    passive: "별이 떠오른 밤: 같은 대상에게 초신성을 다시 터뜨리면 그 대상은 영구히 봉인됩니다. v1은 효과 제거+봉인에 집중합니다.",
    abilitySummary: "초신성: 대상의 받은 부정 효과를 모두 제거하고 그 밤 능력을 봉인합니다(재적용 시 영구 봉인, 다음 밤 의심 생략). 자신만 아플 거야(1회): 전원의 부여 효과를 모두 씻어냅니다.",
    night: { actionType: "seika_supernova", label: "초신성", prompt: "효과를 씻고 능력을 봉인할 대상을 고르세요. (같은 대상 재적용 시 영구 봉인)", excludeSelf: true },
    extraNights: [
      { actionType: "seika_absorb", label: "자신만 아플 거야", prompt: "자신만 아플 거야 — 전원에게 걸린 부여 효과를 모두 씻어냅니다. (1회, 대상 없음)", self: true },
    ],
  },
  luru: {
    label: "루루",
    title: "연주자",
    faction: "angel",
    reveal: "영혼을 만지는 연주자. 매일 밤 한 명을 매료해 그 처형 투표를 당신에게 양도받습니다.",
    passive: "아름다운 영혼을 위한 소나타: 매료가 3명 쌓이면 연주를 시작할 수 있습니다 — 전원의 부정 효과를 씻고 루루는 그 밤 무적이 됩니다.",
    abilitySummary: "영혼을 만지는 음색: 대상의 처형 투표 권한을 양도받습니다. 소나타(매료 3 누적): 전원 부정 효과를 제거하고 자신은 그 밤 무적이 됩니다(소비).",
    night: { actionType: "luru_charm", label: "영혼을 만지는 음색", prompt: "매료해 처형 투표를 양도받을 대상을 고르세요.", excludeSelf: true },
    extraNights: [
      { actionType: "luru_sonata", label: "소나타", prompt: "아름다운 영혼을 위한 소나타 — 전원의 부정 효과를 씻고 그 밤 무적이 됩니다. (매료 3 필요, 대상 없음)", self: true },
      { actionType: "luru_score", label: "악보 교체(자투)", prompt: "악보 교체(자투) — 당신의 투표가치가 +1 됩니다. (1회, 대상 없음)", self: true },
      { actionType: "luru_mute", label: "악보 교체(무투)", prompt: "악보 교체(무투) — 다음 아침의 처형·찬반 투표를 2배 행사합니다. (1회, 대상 없음)", self: true },
    ],
  },
  // --- W6 v1 중립 ---
  pasua: {
    label: "파스아",
    title: "사이비 교주",
    roster: "neutral",
    faction: "neutral",
    reveal: "사이비 교주(중립). 한 명씩 포교해 당신의 교세로 끌어들이세요. 파스아 팀(당신 + 전향자)이 4명이 되면 당신만의 승리입니다.",
    passive: "구원자: 파스아 팀(교주 본인 + 전향자)이 4명 이상이면 천사·악마와 별개로 단독 승리합니다.",
    abilitySummary: "포교하기: 천사나 조력자를 전향자로 바꿉니다(악마·중립 불가). 2회 제한이며 포교 대상이 사망하면 1회 충전됩니다. 신앙: 대상을 탈락시킵니다(악마는 면역).",
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
    { kind: "패시브", name: "정의로운 경찰", text: "용의자로 지목한 대상은 +5 투표가치 / +10 의심가치를 받는 표로 가산합니다.", status: "live" },
    { kind: "능력", name: "용의자 색출", text: "대상을 하루 '용의자'로 지목하고 조사장 1장을 얻습니다. 조사장을 가진 채 색출하면 용의자가 악마인지 통지받습니다. 조사장 3장이면 용의자가 악마팀일 때 조건을 무시하고 구금(능력·효과 차단)합니다.", actionType: "romaz_suspect", status: "live" },
    { kind: "능력2", name: "신념", text: "용의자로 지목됐던 대상 중 1명을 탈락시킵니다(무시 불가). 이 탈락자가 천사팀이면 신념이 봉인되고 이후 구금할 수 없게 됩니다. 1회성입니다.", actionType: "romaz_conviction", status: "live" },
  ],
  rainer: [
    { kind: "패시브", name: "수호신 백호", text: "백호 소환 시 천사팀 카운트 +3을 얻고, 탈락 뒤에도 사후 지속 +3을 남깁니다. 1회성입니다.", actionType: "rainer_summon", status: "live" },
    { kind: "능력", name: "거친 포효", text: "'강한 의지'를 2회 모으면(willCount≥2) 2명을 직접 지목해 백호 발톱을 새깁니다 — 천사팀 카운트 -1, 강한 의지 2 소비. 발톱이 새겨진 대상은 다음 아침 투표가치를 3 이상 얻으면 소멸합니다. (지목하지 않으면 그 밤 강한 의지 대상 중 최대 2명을 자동으로 할퀴는 폴백이 유지됩니다.)", actionType: "rainer_roar", status: "live" },
    { kind: "능력", name: "강한 의지", text: "대상을 관찰하고 강한 의지 +1을 얻습니다(같은 대상 연속 지목 불가). 관찰 대상이 그 밤 탈락하면 강한 의지 +2가 추가됩니다.", actionType: "rainer_resolve", status: "live" },
    { kind: "능력2", name: "그날의 저항", text: "백호 한 마리를 추가 소환합니다 — 천사팀 카운트 +1 + 강한 의지 +1. 1회성이며 첫 밤에는 발동되지 않습니다.", actionType: "rainer_resistance", status: "live" },
  ],
  dordan: [
    { kind: "패시브", name: "침착한 탐정", text: "누군가 탈락하면 투표 대상을 범인으로 지목하고, 범인이 그날 밤 지정한 대상이 도르단에게 비공개로 알려집니다.", status: "live" },
    { kind: "능력", name: "단서 수집 / 사건의 전말", text: "단서 3개 이상에서 정밀 조사로 악마를 정확히 식별하면 사건의 전말이 발동 — 다음 아침을 생략하고 그 악마를 곧장 판결대에 세웁니다.", actionType: "police_investigate", status: "live" },
    { kind: "능력2", name: "잠입 수사", text: "대상을 밤 동안 관찰합니다. 탈락과 연결되면 불심검문이 발동해 그 밤 부정 효과를 무시합니다.", actionType: "dordan_infiltrate", status: "live" },
  ],
  habreterus: [
    { kind: "패시브", name: "임종 선언", text: "그 라운드 누군가 탈락하면 하브레터스의 투표가치가 -1, 천사팀 카운트가 +1, 부정 효과가 모두 씻기고 소명 3일 쿨다운에 들어갑니다. 생명의 언약 성공 시 쿨다운이 추가로 -1 단축됩니다.", status: "live" },
    { kind: "능력", name: "생명의 언약", text: "대상을 치료합니다. 그 밤 실제 공격을 막아내면(소명) 하브레터스의 투표가치가 +3 오르고 소명 대기가 -1일 단축됩니다.", actionType: "doctor_heal", status: "live" },
    { kind: "능력2", name: "삶이 있는 곳으로", text: "악마라 의심되는 대상을 지목합니다. 적중하면(악마 처치자) 그 밤 받은 부정 효과를 모두 무시합니다. 악마측은 대악마의 역추리로 하브레터스를 적중시키면 치료를 무시하고 다음 처치로 탈락시킵니다.", actionType: "habreterus_deduce", status: "live" },
  ],
  mizlet: [
    { kind: "패시브", name: "행복을 파는 가게", text: "탈락자가 생존자보다 많아지면 가장 최근 탈락 2명을 복귀(소멸·부활불가 무시)시키고 미즐렛은 탈락합니다. 1회성 역전 패시브입니다.", status: "live" },
    { kind: "능력", name: "디저트 선물(부활)", text: "탈락한 한 명을 디저트로 되살립니다. 1회성입니다.", actionType: "mizlet_revive", status: "live" },
    { kind: "능력", name: "디저트 선물(쿠키)", text: "대상에게 쿠키(보호 + cookie 표식)를 부여하고 미즐렛과의 채팅 회로를 엽니다. 쿠키 보유자는 그 밤 탈락해도 그 밤 능력이 발동됩니다.", actionType: "mizlet_cookie", status: "live" },
    { kind: "능력", name: "디저트 선물(푸딩)", text: "대상에게 푸딩(보호 + pudding 표식)을 부여합니다. 푸딩 보유자의 단일 대상 능력은 봉인·지목을 무시하고 발동합니다('무시 불가').", actionType: "mizlet_pudding", status: "live" },
    { kind: "능력2", name: "고급 와인", text: "전원의 부정 효과를 제거하고 디저트 보유자 전원과 와인 회식 채팅을 엽니다. 디저트를 받지 못한 대상은 투표가치 -1. 1회성입니다.", actionType: "mizlet_wine", status: "live" },
  ],
  helen: [
    { kind: "패시브", name: "행복 쉼터 / 추억을 간직하는 법", text: "황금빛 수면을 받은 자는 영혼이 기억되어 탈락 후에도 다시 수면을 받을 수 있으며, 그때 발동되면 부활합니다. 소멸(annihilated)은 부활 불가입니다.", status: "live" },
    { kind: "능력", name: "황금빛 수면(부활)", text: "한 번 잠들었던 추억된 탈락자를 다시 재워 부활시킵니다. 1회성입니다.", actionType: "helen_revive", status: "live" },
    { kind: "능력", name: "황금빛 수면", text: "대상을 수면 상태로 만들어 부정 효과·죽음을 막고 영혼을 기억시킵니다. 한 번 기억된 자는 탈락 후에도 다시 잠들어 부활할 수 있습니다.", actionType: "helen_sleep", status: "live" },
    { kind: "능력2", name: "자유로운 새", text: "탈락자 한 명을 추가로 되살립니다. 1회성입니다.", actionType: "helen_freebird", status: "live" },
  ],
  uno: [
    { kind: "패시브", name: "명예", text: "우노는 살아있는 한 천사팀 카운트 +5와 행사 투표가치 +5를 갖습니다. 이 투표가치는 사탄의 마(-1)를 뚫고 살아남아, 악마가 투표를 독점해도 우노만은 표를 행사할 수 있습니다.", status: "live" },
    { kind: "패시브", name: "군인의 사명", text: "투쟁 2회로 충전된 대상은 악마 효과 1회를 제거합니다.", status: "live" },
    { kind: "능력", name: "투쟁", text: "대상 소속 카운트 +1과 사명 충전 +1을 부여합니다.", actionType: "uno_struggle", status: "live" },
    { kind: "능력2", name: "용맹함", text: "자신을 정화하고 전원에게 투쟁을 발동합니다. 우노가 투표한 대상은 사망 기록과 소속이 공개·처형되고, 천사를 죽이면 우노가 다음 밤 봉인됩니다. 1회성입니다.", actionType: "uno_valor", status: "live" },
  ],
  arthur: [
    { kind: "패시브", name: "여명의 기사", text: "어떤 효과로도 밤에 탈락하지 않습니다. 단 결백한 천사팀이 3명 이상 탈락하면 다음 아침 함께 탈락합니다. 결백 천사 탈락 1명당 잔불 대검 +1 충전, 충전 3 이상이면 위용(해오름 결백 천사 1명당 투표가치 +3)이 켜집니다.", status: "live" },
    { kind: "능력", name: "잔불이 꺼지기 전에", text: "대상(최대 3명)에게 해오름을 부여해 결백/타락을 식별하고, 잔불 대검을 1 충전합니다.", actionType: "arthur_judge", status: "live" },
    { kind: "능력2", name: "잔불 대검", text: "충전을 1 써서 한 명을 벱니다. 부정 효과를 쓴 적 있는 '타락자'에게는 폭열(다시 베면 소멸, 부활 불가), 그렇지 않은 '결백자'에게는 하루 무적. 결백/타락은 진영이 아니라 행위 이력으로 가립니다.", actionType: "arthur_emberblade", status: "live" },
  ],
  seika: [
    { kind: "패시브", name: "별이 떠오른 밤", text: "초신성을 터뜨린 다음 밤은 의심 투표를 생략하고 곧장 밤으로 넘어갑니다.", status: "live" },
    { kind: "능력", name: "초신성", text: "대상이 받는 부여 효과를 제거하고 그 밤 능력을 봉인합니다. 반복 적용 시 영구 봉인으로 커집니다.", actionType: "seika_supernova", status: "live" },
    { kind: "능력2", name: "자신만 아플 거야", text: "전원에게 걸린 부여 효과를 모두 씻어냅니다(전원 정화, 1회). 악마팀 효과를 흡수하면 소멸과 악마팀 공개 카운트다운이 함께 걸립니다.", actionType: "seika_absorb", status: "live" },
  ],
  luru: [
    { kind: "패시브", name: "아름다운 영혼을 위한 소나타", text: "매료 3명 이상이면 즉시 연주가 시작되어 전원을 정화하고, 그 밤 루루를 무적으로 만듭니다.", actionType: "luru_sonata", status: "live" },
    { kind: "능력", name: "영혼을 만지는 음색", text: "대상을 매료해 처형 투표 권한을 루루에게 양도시킵니다.", actionType: "luru_charm", status: "live" },
    { kind: "능력2", name: "악보 교체 (자투)", text: "자투 악보로 자신의 투표가치를 +1 올립니다. 1회성입니다.", actionType: "luru_score", status: "live" },
    { kind: "능력2", name: "악보 교체 (무투)", text: "무투 악보로 다음 아침의 처형·찬반 투표를 2배 행사합니다. 1회성입니다.", actionType: "luru_mute", status: "live" },
  ],
  demon: [
    { kind: "패시브", name: "사탄의 마", text: "처치 성공 시 자신을 제외한 전원의 투표가치가 -1 내려갑니다(악마 투표 독점 — 마을은 표로 악마를 처형할 수 없습니다). 생존 천사팀 전체의 투표가치가 0 이하로 떨어지면 모든 조사·취급 효과가 '악마' 로 판정되어 카운트와 승리 판정에도 자동 반영됩니다(살아있는 대악마가 영역을 유지하는 동안).", status: "live" },
    { kind: "특수 패시브", name: "메피스토의 낙인", text: "투표 대상에게 낙인을 통지하고, 대악마가 직업 삭제와 새 천사 직업 배정을 일으킵니다. 낙인을 받은 대상은 '낙인 적용자' 표식이 남아 감시의 조건이 됩니다.", actionType: "daeakma_brand", status: "live" },
    { kind: "능력", name: "만악의 근원 / 감시", text: "대상을 탈락시킵니다. 낙인 적용자가 존재하면 감시가 추가되어 대악마가 다음 아침 2표를 행사합니다. (같은 대상 2표 시 무조건 반론은 후속)", actionType: "demon_kill", status: "partial" },
    { kind: "능력2", name: "압도적인 존재감", text: "자신을 제외한 전원을 압도해 그 밤 능력을 봉인합니다. 1회성입니다.", actionType: "daeakma_dominion", status: "live" },
    { kind: "능력2", name: "역추리 (삶이 있는 곳으로)", text: "하브레터스로 의심되는 대상을 지목합니다. 적중하면 그 밤 치료 효과를 무시하고 다음 처치로 하브레터스를 탈락시킵니다.", actionType: "demon_deduce", status: "live" },
  ],
  phantom: [
    { kind: "패시브", name: "침묵의 밤", text: "밤 종료 시 능력 사용 가능 밤을 한 번 더 열고, 생존 천사팀 카운트를 +1 보상합니다. 팬텀과 조력자는 접선할 수 없지만 서로의 정체와 직업은 통지됩니다.", actionType: "phantom_silentnight", status: "live" },
    { kind: "특수 패시브", name: "어둠이 내린 도시", text: "매 밤 직업 봉인 대상을 늘려갑니다. 전날 같은 대상은 연속 봉인할 수 없고, 무지목 시 악몽 충전으로 전환됩니다.", actionType: "phantom_seal", status: "live" },
    { kind: "능력", name: "악몽", text: "대상을 악몽에 빠뜨리고, 연속되면 영면으로 격상합니다. 악몽은 아침 탈락으로 이어집니다.", actionType: "phantom_nightmare", status: "live" },
    { kind: "능력2", name: "영면 발동", text: "쌓아둔 영면 대상을 한꺼번에 탈락시킵니다.", actionType: "phantom_reap", status: "live" },
    { kind: "능력2", name: "일식", text: "다음 아침을 밤으로 변경합니다. 대신 아침이 오면 팬텀은 소멸합니다. 1회성입니다.", actionType: "phantom_eclipse", status: "live" },
  ],
  malen: [
    { kind: "패시브", name: "악령 마야", text: "매 밤 한 명에게 빙의해 그 밤 행동을 막고, 다음 밤 마비를 남기며 악마팀 카운트로 셉니다. 마야가 말렌에게 빙의하면 그 밤 모든 효과를 무시합니다.", actionType: "malen_possess", status: "live" },
    { kind: "특수 패시브", name: "악담", text: "탈락자가 생기면 혼을 생성하고, 혼이 2개 쌓이면 시체와 악마팀 카운트로 바뀝니다.", status: "live" },
    { kind: "능력", name: "혼령 방출", text: "1회차에는 혼령 표식을 남기고, 표식이 있는 대상을 다시 방출하면 영에게 잠식되어 탈락 + 그 투표가치가 말렌에게 조공됩니다.", actionType: "malen_release", status: "live" },
    { kind: "능력2", name: "신출귀몰", text: "혼령 표식을 수거해 다음 밤 시체를 소환합니다. 1회성입니다.", actionType: "malen_elusive", status: "live" },
  ],
  rosanne: [
    { kind: "패시브", name: "백일몽", text: "아침을 일곱 번 맞이하면 즉시 단독 승리합니다. 대신 토론은 1분으로 짧아지고 무투에 참여할 수 없습니다.", status: "live" },
    { kind: "특수 패시브", name: "증오", text: "로잔느가 지목한 대상의 투표가치를 1 낮추고, 투표가치가 0이 되면 그 대상을 즉시 처형합니다.", actionType: "rosanne_hatred", status: "live" },
    { kind: "특수 패시브", name: "조망", text: "로잔느가 살아있는 동안, 타인에게 능력을 적용한 플레이어는 그 밤 투표가치가 1 낮아집니다(지정한 타인 수만큼 추가로 낮아지며, 이 효과로 1 미만으로는 내려가지 않습니다).", status: "live" },
    { kind: "능력", name: "만들어가는 미래", text: "원한을 새깁니다(르상티망). 대상에 원한 표식을 남기고 로잔느의 아침을 한 번 더 끌어옵니다('만들어가는 미래' 충전 1 소비).", actionType: "rosanne_resentment", status: "live" },
    { kind: "능력", name: "라포르", text: "두 사람의 운명을 묶습니다. 한쪽이 처형·탈락·소멸하면 다른 쪽도 같은 운명을 맞습니다('만들어가는 미래' 충전 1 소비).", actionType: "rosanne_rapport", status: "live" },
    { kind: "능력", name: "외현기억", text: "탈락자 한 명을 지목해 매 아침 되살리고 그 날의 끝에 다시 처형합니다. 투표로 한 번 더 처형되면 효과가 사라지고 다시 지목할 수 없습니다('만들어가는 미래' 충전 1 소비).", actionType: "rosanne_manifest", status: "live" },
    { kind: "능력2", name: "건너뛰기", text: "이번 밤에 발동한 다른 모든 효과와 통지를 전부 다음 밤으로 넘겨버립니다(1회성, 최우선). 미뤄진 액션은 다음 밤 시작에 그대로 다시 발동됩니다. 게임 종료 시까지 건너뛰기를 남긴 채 승리하면 조력자가 패배로 판정됩니다.", actionType: "rosanne_skip", status: "live" },
  ],
  gain: [
    { kind: "패시브", name: "진실을 가리는 암흑", text: "악마와 접선·대화하고, 악마가 처형 또는 탈락할 때 1회 없던 일로 만듭니다. 세 번째 밤 종료 시 보호막이 자동 만료됩니다(가인 생존 여부 무관).", status: "live" },
    { kind: "능력", name: "약간의 위선", text: "대상의 직업(진영)을 통지받고 그 밤 능력의 발동을 취소시킵니다. 악마가 그 대상을 투표했었다면 다음 발동하는 약간의 위선이 능력을 봉인시키는 효과로 강화됩니다.", actionType: "gain_hypocrisy", status: "live" },
    { kind: "능력2", name: "급습", text: "대상의 통지를 한 라운드 차단하고 가인의 급습을 1 충전합니다. 다음 아침까지 악마와 대화하는 채팅 회로는 후속이며 현재는 이벤트 신호만 발사됩니다. 1회성입니다.", actionType: "gain_raid", status: "live" },
  ],
  luna: [
    { kind: "패시브", name: "달빛이 비치는 우물", text: "루나가 투표·의심한 대상에게 달빛을 남기고, 달의 힘이 10 이상 차면 셋 중 하나(공포·해가 저문다·달이 차오른다) 효과를 발동합니다.", status: "live" },
    { kind: "능력", name: "고요한 적막", text: "달빛 대상 수에 따라 달의 힘을 충전합니다(천사·중립 +1, 악마 +3). 100% 달성 시 셋 중 하나로 분기 발동합니다.", actionType: "luna_moonlight", status: "live" },
    { kind: "능력2", name: "공포 속에 밀어 넣다", text: "대상에게 달빛 저주를 남깁니다. 달의 힘이 가득 차면 대상은 직업을 잃고 악마팀이 됩니다. 1회 제한입니다.", actionType: "luna_corrupt", status: "live" },
    { kind: "능력2", name: "해가 저문다", text: "다음 처형/찬반 투표에서 능력으로 증가한 투표가치(우노 명예·아서 위용 등)를 마이너스로 판정합니다. 1회 제한이며 달의 힘 10을 소비합니다.", actionType: "luna_dawn", status: "live" },
    { kind: "능력2", name: "달이 차오른다", text: "이번 밤 한정 — 악마의 처치가 달빛 대상에 발동하면 모든 달빛 대상에 같은 효과로 cascade됩니다. 1회 제한이며 달의 힘 10을 소비합니다.", actionType: "luna_moonrise", status: "live" },
  ],
  logen: [
    { kind: "패시브", name: "부서진 펜던트", text: "시작 시 악마와 접선합니다. 악마팀에 지워지지 않는 펜던트 효과를 남기고, 펜던트가 3개 이상 쌓이면 대상 수 보너스를 얻습니다.", status: "live" },
    { kind: "능력", name: "네 안에 없는 것", text: "대상의 가장 가까운 밤 능력 효과가 소멸한다는 통지와 펜던트를 적용합니다.", actionType: "logen_nullify", status: "live" },
    { kind: "능력2", name: "전부 괜찮을 거야", text: "펜던트(또는 부서진 펜던트)가 적용된 자는 그 밤 무적이 되고, 적용되지 않은 자는 파멸 1중첩을 받습니다. 파멸 2중첩이 되면 소멸합니다. 1회성입니다.", actionType: "logen_allwell", status: "live" },
  ],
  ellen: [
    { kind: "패시브", name: "박해자 / 해체된 퍼즐", text: "홀수날에만, 엘런이 직전에 투표한 대상의 받는-투표가치를 올려 처형대로 밀어냅니다. 같은 대상을 다시 박해하면 +3/+6/+9로 누진됩니다. 누군가 자아를 되찾으면 박해는 자해 박해로 영구 전환됩니다.", actionType: "ellen_persecute", status: "live" },
    { kind: "능력", name: "비치지 않는 자아", text: "대상(타인)의 자아를 망가뜨려 2밤 동안 투표·의심·능력 가치를 모두 상실시킵니다. 자아는 투표가치 최고 carrier에게 이전되며, 대상이 carrier를 투표하면 다음 아침 회복됩니다. 한 번 망가진 대상은 재차 해체할 수 없습니다.", actionType: "ellen_shatter", status: "live" },
    { kind: "능력2", name: "혼탁해진 정의", text: "대상의 다음 밤 능력 발동을 봉인합니다. 이미 박해에 찍힌 대상이라면 그 대상을 탈락시킵니다. 2회 제한입니다.", actionType: "ellen_chaos", status: "live" },
  ],
  pasua: [
    { kind: "패시브", name: "구원자", text: "시작 전 파스아 존재를 전원에게 통지합니다. 파스아 팀(교주 본인 + 전향자)이 4명 이상이면 즉시 승리합니다.", status: "live" },
    { kind: "능력", name: "포교", text: "대상을 포교합니다. 악마와 중립은 포교할 수 없고, 전향자는 파스아 승리를 따릅니다. 2회 제한이며, 포교 대상이 사망하면 1회 충전됩니다.", actionType: "pasua_convert", status: "live" },
    { kind: "능력2", name: "신앙", text: "대상을 탈락시킵니다. 악마는 탈락하지 않습니다.", actionType: "pasua_faith", status: "live" },
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
    case "rosanne":
      return "단독 승리·처형";
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
