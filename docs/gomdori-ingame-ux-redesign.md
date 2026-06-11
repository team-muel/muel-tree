# Gomdori 인게임 UI/UX 재설계 — 작업 설계

작성: 2026-06-11 · 대상: muel-tree `src/components/game/**`, `src/app/(activities)/game/**`
근거: `/game/preview` 작업대에서 식별한 5건 요구 (생강, 2026-06-11)

---

## 0. 전제 — 무엇 위에 얹는가

지금 구조의 척추는 이미 정해져 있다. **무대(GameStage)가 페이즈와 무관하게 상시 유지되고, 그 위에 창(ActionModal)·아래에 독(StatusDock)이 얹히는** Feign식 단일 공간이다. 5건 요구는 새 화면이 아니라 **이 척추의 세 지점에 붙는 부착물**로 전부 환원된다:

```
GameFrame (상시 셸)                         page.tsx:422
├─ NightSky / PhaseSweep   (배경·전환)
├─ children = PhaseComponent
│   └─ GameStage           (상시 무대)      ui/GameStage.tsx
│       └─ PlayerToken[]   (아바타 단위)    ui/PlayerToken.tsx
│   └─ ActionModal         (무대 위 창)     ui/ActionModal.tsx
└─ StatusDock              (하단 독)        ui/StatusDock.tsx
```

| 요구 | 부착 지점 | 성격 |
|---|---|---|
| R1 투표창 | ActionModal + GameStage | 수정 (배치·어포던스) |
| R2 배회 타이머 | GameStage (새 레이어) | 신규 (장난 상호작용) |
| R3 직업 추측 | PlayerToken (보조 인터랙션) | 준비 (스캐폴딩) |
| R4 로비 설정 | LobbyPhase (분리) | 재배치 (톱니 모달) |
| R5 자기 프로필 독 | StatusDock 확장 | 오버홀 (Discord 차용) |

원칙: 무대는 건드리지 않는다. 모든 부착물은 무대의 **위(창)·아래(독)·곁(레이어)**에 산다.

---

## R1 — 투표창: 중앙 고정 + 흰 글자 어포던스

### 현상
- `ActionModal`은 `fixed inset-0 … sm:items-center` — 데스크톱에서 **항상 화면 정중앙 고정**. 무대 위 인물을 지목하려는데 창이 무대를 덮는다. (`ui/ActionModal.tsx:37`)
- VotePhase의 실제 클릭 대상은 **무대 위 토큰**이지만(`VotePhase.tsx:115` `selectable`), 창은 "무대 위 인물을 지목하세요"라고만 말한다. 토큰 이름은 `mood="light"`에서 어두운 잉크지만, 토큰이 **버튼이라는 신호(테두리·hover·커서)가 약해** 무엇을 클릭해야 하는지 안 보인다. = "흰 글자라 클릭 지점을 모르겠다"의 정체는 **색이 아니라 어포던스 부재**.

### 목표
창은 무대를 가리지 않고, 클릭 가능한 대상이 한눈에 보이게.

### 설계
1. **창을 중앙에서 하단으로 내린다.** 데스크톱도 `items-end`로 통일하고 독 위에 안착(`bottom-24`). 무대 = 위 60%, 창 = 아래 띠. 모바일은 이미 하단이므로 데스크톱만 바뀐다. (`ActionModal.tsx:37` 한 줄 수정 + `raised` 재정의)
2. **지목 어포던스를 토큰에 명시한다.** `selectable && !selected` 토큰에:
   - 점선 → 실선 테두리 hover 전이, `cursor-pointer`(이미 button이나 시각 신호 강화),
   - 미세 호버 리프트(`hover:-translate-y-0.5`),
   - 선택 전 은은한 펄스 링 1회(주의 유도, reduced-motion 존중).
   `PlayerToken.tsx:118` 버튼 분기의 className에 `selectable` 전용 토큰 추가.
3. **창 카피를 행동 지시형으로.** "무대 위 인물을 지목하세요" → 미선택 시 무대 토큰에 화살표/하이라이트가 동기 점멸하도록 창과 무대를 같은 상태(`selectedTarget==null`)로 연결.

### 영향 파일
`ui/ActionModal.tsx`, `ui/PlayerToken.tsx`, (확인용) `VotePhase.tsx`. NightPhase·SuspicionPhase도 같은 ActionModal·토큰을 쓰므로 **무료로 함께 개선**된다.

### 리스크
ActionModal 위치 변경은 vote/night/suspect 전 페이즈에 영향 → preview 작업대 4개 섹션 동시 검토 필수.

---

## R2 — 무대 위 배회 타이머 (장난 상호작용)

### 현상
타이머는 지금 `StatusDock` 안의 `PhaseTimer` 텍스트뿐이다(`StatusDock.tsx:74`). 무대 위에는 없다. 토큰 배회 애니메이션 시스템은 이미 있다(`globals.css` `@keyframes gomdori-roam-a/b/c`, `gomdori-stage-idle`).

### 목표
무대 위를 **자율적으로 떠다니는 타이머 오브젝트**. 건드리면(클릭/드래그) 튕겨나가고 다시 부유 — "장난치듯" 차고 노는 무해한 상호작용. 게임 로직과 분리된 순수 장식.

### 설계
- 새 컴포넌트 `ui/StageTimerOrb.tsx` — GameStage 내부 `absolute` 레이어(토큰과 같은 좌표계, `pointer-events` 살림). 남은 시간을 작은 원반/달 모양으로 표시.
- **부유**: CSS 배회를 재사용하되, 차임(kick)은 물리가 필요하므로 경량 자체 루프(`requestAnimationFrame`)로 위치·속도 보유. 평상시 느린 드리프트(벽 반사), 클릭/드래그 시 임펄스 부여 → 마찰로 감속 → 다시 드리프트.
- **무해 보장**: 타이머 값은 `phaseEndsAt` 표시만, 클릭이 게임 상태를 바꾸지 않음. 지목 무대(selectable)에서는 조준 방해를 막기 위해 **오브를 비활성/투명도↓** 또는 토큰 위를 피하도록 충돌 회피.
- `prefers-reduced-motion`: 물리 끄고 고정 표시.
- 모바일: 터치=탭 임펄스. 작은 무대에선 크기 축소.

### 영향 파일
신규 `ui/StageTimerOrb.tsx`, `globals.css`(필요 시 키프레임), `GameStage.tsx`(레이어 슬롯 1개 주입; `timerOrb?: ReactNode` prop). GameStage의 무대 좌표계를 건드리므로 **R1보다 뒤**에 둔다.

### 결정 필요 (→ §결정 1)
물리 모델을 쓸지(차고 노는 손맛 ↑, 코드량 ↑) vs CSS 드리프트 + 클릭 시 단발 반동(가벼움)인지.

---

## R3 — 프로필 좌/우클릭 → 직업 추측 (지금은 준비만)

### 현상
PlayerToken의 `onClick`은 **지목(선택)에 이미 점유**돼 있다(`PlayerToken.tsx:118`). 직업 추측은 별개 인터랙션이 필요하고, 데이터(추측 저장/집계)는 백엔드가 아직 없다.

### 목표
나중에 "다른 사람 프로필을 눌러 그의 직업을 추리·메모/추측"하는 기능. **지금은 충돌 없는 자리와 빈 배선만 깔아둔다.**

### 지금 준비할 스캐폴딩 (코드 변경 최소, 미노출)
1. **보조 인터랙션 채널 분리.** PlayerToken에 `onInspect?: (userId) => void` prop 신설. 트리거 후보:
   - 데스크톱 = **우클릭**(`onContextMenu`, preventDefault) 또는 좌클릭 **롱프레스**,
   - 모바일 = 롱프레스.
   `onClick`(지목)과 절대 겹치지 않게 채널 자체를 분리. 지금은 prop만 받고 미사용(no-op) → 향후 활성.
2. **추측 UI 자리.** `ui/PlayerInspectSheet.tsx`(빈 껍데기) — 대상 이름·아바타 + "직업 추측" 드롭다운(GOMDORI_ROLES 풀에서 선택) + 메모. 지금은 라우팅 안 함.
3. **데이터 형상 합의(문서만).** 추측은 **로컬(내 화면 한정) 메모**로 시작할지, 서버 집계(추리 정확도 통계)까지 갈지 결정 후 테이블 설계. 1단계는 클라이언트 로컬(`useState`/localStorage 금지 → 메모리/컨텍스트) 추천 — 백엔드 의존 0.

### 영향 파일
`ui/PlayerToken.tsx`(prop 추가, 동작 미연결), 신규 `ui/PlayerInspectSheet.tsx`(스텁). GameStage에 `onInspect` 패스스루.

### 리스크
우클릭은 Discord Activity iframe에서 컨텍스트 메뉴와 충돌 가능 → **롱프레스 우선** 권장(§결정 2).

---

## R4 — 로비 설정: 난잡한 펼침 → 톱니 모달

### 현상
LobbyPhase 우측(`sheetContent`)에 초대·구성·**중립설정·규칙요약·직업안내·참가자관리**가 전부 세로로 쌓여 있다(`LobbyPhase.tsx:174-300`). 데스크톱은 우측 패널, 모바일은 BottomSheet — 둘 다 한 통에 다 들어가 난잡.

### 목표
규칙·설정을 **별도 창**으로 빼고, **우측 상단 톱니(⚙) 아이콘**으로 연다 — 친숙한 패턴.

### 설계
1. **분류.** sheetContent를 둘로 가른다:
   - *항상 보임(로비 본문)*: 초대 링크, 이번 판 구성 미리보기, 시작 조건/버튼.
   - *톱니 모달로*: 중립 등장 설정, 규칙 요약, 직업 안내, 참가자 관리(방장).
2. **톱니 배치.** 로비 헤더 배너(`LobbyPhase.tsx:317`) 우측 상단에 `⚙` 버튼. 클릭 시 `SettingsModal`(ActionModal 문법 재사용 또는 신규 `ui/SettingsSheet.tsx`) 오픈.
3. **모달 내부 탭/섹션.** 「설정 · 규칙 · 직업 · 인원관리」 4탭 또는 아코디언. 방장만 설정/강퇴 가변, 그 외 읽기 전용(현재 권한 분기 그대로 이식).
4. 모바일도 동일 톱니 → 전체화면 시트. BottomSheet의 잡다한 적재를 비운다.

### 영향 파일
`LobbyPhase.tsx`(sheetContent 분해·톱니 추가), 신규 `ui/SettingsSheet.tsx`(or 모달). 로직(중립설정·강퇴·준비)은 **이동만**, 변경 없음.

### 리스크
없음에 가깝다 — 순수 재배치. 데스크톱 그리드(`grid-cols-[1.6fr_0.9fr]`)에서 우측 패널이 비므로 무대를 넓히거나 단일 컬럼으로 전환할지 결정(§결정 3).

---

## R5 — Discord식 하단 자기 프로필 독 (직업/능력/패시브/설명)

### 현상
StatusDock은 페이즈 라벨 + 상태 한 줄 + 일차 + 타이머 + **직업 칩(라벨 텍스트뿐)**이다(`StatusDock.tsx:67`). 내 능력·패시브·설명은 RoleAssignPhase에서 한 번 보여주고 사라진다.

### 목표
Discord 좌하단 자기 프로필(아바타+이름+상태)을 차용해 **하단 독을 "나" 중심으로 재구성**. 펼치면 내 **직업·능동 능력·패시브·설명**을 언제든 다시 읽는다.

### 설계
1. **접힘 상태(기본) = Discord 프로필 바.** 좌측에 내 아바타 + 이름 + 진영색 직업 라벨, 우측에 페이즈/타이머. 지금 StatusDock 정보를 "나" 정렬로 재배치.
2. **펼침 상태 = 내 역할 카드.** 프로필 바 탭 시 위로 슬라이드업되는 패널:
   - 직업명 + RoleEmblem(이미 있음, `ui/RoleEmblem.tsx`),
   - **능동 능력**: `roleMeta.night.label` + `night.prompt`, 추가 능력은 `extraNights[]`,
   - **설명**: `roleMeta.reveal`,
   - **패시브**: ⚠ 현재 데이터 모델에 별도 필드 없음 — passive는 reveal 문장에 섞여 있다(예: 라이너 "천사팀 카운트를 늘립니다"). §데이터 모델 참조.
3. **데이터 출처.** `myPlayer.role`/`myPlayer.faction`은 이미 GameFrame까지 내려온다(`page.tsx:452`). StatusDock에 `myRole`만 오던 것을 `roleMeta(myRole)` 전체로 확장.
4. **노출 규칙.** 로비/직업배정/종료 페이즈에선 직업 비노출(현행 유지). 인게임에서만 자기 직업 패널 활성.

### 영향 파일
`ui/StatusDock.tsx`(독 오버홀 — 접힘/펼침 2상태), 신규 `ui/MyRolePanel.tsx`(펼침 내용), `page.tsx`(myPlayer 아바타/이름 추가 전달). 데이터 모델 확장 시 `config/gomdori-roles.ts` + 엔진 동기화.

### 리스크
독은 **모든 인게임 페이즈에 상시** 떠 있다 → 펼침 패널이 ActionModal(R1)·BottomSheet와 겹치지 않게 z축·여백 조율 필요. R1과 같은 PR에서 같이 보는 게 안전.

---

## 횡단 — 데이터 모델 공백 (R5·R3가 공유)

`GomdoriRoleMeta`에는 `label/faction/reveal/night/extraNights`만 있고 **`passive`(상시 효과)와 `ability`(능동 요약)의 구조적 분리가 없다**(`gomdori-roles.ts:28`). R5의 "능력·패시브·설명 분리 표시"를 제대로 하려면 둘 중 하나:

- **(A, 권장 1단계)** 데이터 무변경 — `reveal`을 설명으로, `night/extraNights`를 능력으로 표시하고 패시브는 "설명에 포함"으로 둔다. 빠르고 엔진 동기화 불필요.
- **(B, 후속)** `GomdoriRoleMeta`에 `passive?: string`, `abilitySummary?: string` 추가. 프론트 표시 품질 ↑ 그러나 20+ 직업 카피 작성 + 엔진 매니페스트 동기화(muel-bot) 필요 → 별도 트랜치.

권장: R5는 (A)로 출시하고, (B)는 "직업 도감"(이미 메모에 있는 `/도감` 작업)과 묶어 후속.

---

## PR 시퀀싱

무대 좌표계를 건드리는 순서로, 충돌 면적이 작은 것부터.

1. **PR-1 (R4 로비 설정 모달)** — 독립적, 무대 무관, 리스크 최저. 톱니 패턴 먼저 안착.
2. **PR-2 (R1 투표창 + 어포던스)** — ActionModal·PlayerToken. vote/night/suspect 동시 개선. preview 4섹션 검증.
3. **PR-3 (R5 자기 프로필 독)** — StatusDock 오버홀 + MyRolePanel, 데이터 (A). R1의 창 위치와 z축 함께 확정되므로 PR-2 직후.
4. **PR-4 (R3 스캐폴딩)** — PlayerToken `onInspect` + InspectSheet 스텁. 미노출 배선만.
5. **PR-5 (R2 배회 타이머)** — StageTimerOrb. 무대 좌표계 최종 확정 후, 가장 마지막. 순수 장식이라 늦어도 무방.

각 PR은 `npm run typecheck` + `/game/preview` 시각 검토를 게이트로. 기존 muel-tree PR 흐름(master 분기·gpgsign 우회) 동일.

---

## 열린 결정 3건 (내 권장 표기, 확인 요망)

**결정 1 — R2 타이머 상호작용 깊이.**
→ 권장: 경량 물리(rAF, 벽 반사 + 클릭 임펄스). "차고 논다"는 손맛이 핵심 요구라 단발 반동보다 물리가 맞다. 단 지목 무대에선 비활성.

**결정 2 — R3 트리거.**
→ 권장: **롱프레스 통일**(데스크톱·모바일). 우클릭은 Discord iframe 컨텍스트 메뉴와 충돌 위험. 추측 데이터는 1단계 로컬 메모(백엔드 0).

**결정 3 — R4 후 로비 레이아웃.**
→ 권장: 데스크톱 우측 패널 제거 후 **무대 단일 컬럼 확장**(중앙 무대 강조, Feign 일관). 초대/시작만 무대 아래 중앙.

이 3건은 설계를 바꾸지 않고 구현 디테일만 가르므로, 별도 확인 없으면 위 권장으로 진행한다.

---

# 2차 배치 (2026-06-12) — 흐름 가시화 · 검사 · 테이블 모델

1차(R1~R5)는 머지됨(PR #83). 2차는 "실제로 접선할 수 있느냐"를 가르는 인터랙션과 작업대 가시성.

## B1 — 프리뷰 상호작용화 + 시점 전환 (구현·머지)
작업대 카드가 전부 `pointer-events:none` + 고정 시점(시민)이라 독 펼침·악마챗·관전·능력 UI 가 안 보였다. → 상단 컨트롤로 **내 직업/생존** 전환 + **상호작용 토글**. me/players 를 상태로 만들어 전 페이즈 재구성. 서버 필요한 버튼만 무동작, 로컬 인터랙션(독·시트·탭=검사·드래그·타이머)은 동작. `preview/page.tsx`.

## B2 — 아바타 드래그 이동 (구현·머지)
무대 토큰을 커서/터치로 끌어 위치 이동 — 순수 장식. `PlayerToken` 통합 제스처 상태머신: **끌기=이동 / 짧은 탭=지목 / 롱프레스=검사**. 지목 무대(selectable)에선 드래그 비활성(조준 보호). `movable` prop, GameStage 가 비지목 무대에 주입.

## B3 — 정체 추측: 진영 + 직업 + 저장 (구현·머지)
프로필 탭(비지목 무대)·롱프레스(지목 무대) → `PlayerInspectSheet` 가 올라온다. **진영(천사/악마/중립) + 직업 + 메모**를 입력·저장 — `useInspectGuesses`(matchId 범위 localStorage, 백엔드 0). GameStage 가 인터랙션을 소유(`inspectable matchId`). 서버 집계(추리 정확도)는 후속.

## B4 — 시트 미열람 배지 (구현·머지)
`BottomSheet` 에 `badge` + `onOpenChange`. NightPhase 악마챗: 시트가 닫힌 동안 들어온 메시지 수를 핸들에 "N" 으로. 관전 피드 배지는 같은 prop 으로 후속 확장 가능.

## B5 — 테이블=스테이지 모델 (★ 백엔드 결정 필요 — 미구현)

요구: "게임 만들기 = Stage 하나 생성, 참여 = 열린 Stage 중 선택."

**현 모델과의 충돌.** 게임 백엔드는 muel-bot 엣지 함수이고 매치는 **Discord Activity 인스턴스/채널에 1:1**(`match-resolve` = `findOpenMatchByInstance`/`ByDiscordChannel`). 한 음성 채널의 Activity 인스턴스는 하나라, "여러 열린 스테이지를 고른다"는 흐름은 **인스턴스=한 테이블** 모델과 정면으로 어긋난다.

**필요 변경(전부 cross-repo / muel-bot + Supabase):**
- `mafia.matches`: 채널당 복수 open 매치 허용(현 unique/resolve 가정 해제), 또는 매치를 채널이 아닌 **길드 범위 "테이블"** 으로 재정의.
- 신규 엣지 `match-list`: 열린(lobby) 테이블 목록 반환(길드/채널 범위).
- `match-create`: 항상 새 테이블 생성(현재는 채널 open 매치 재사용 가능).
- 프론트 `LandingScreen`: 단일 만들기/참가 → **만들기 + 열린 테이블 목록 선택**.

### 결정 (2026-06-12, 생강)
- **범위 = 같은 음성 채널 안 복수 테이블.** 인스턴스 모델은 두되 *채널당 복수 open 매치*를 허용. 한 채널에서 "테이블 만들기 / 열린 테이블 골라 앉기".
- **향후 = 크로스-서버 실시간 매칭** — 다른 서버의 많은 플레이어와 매칭하는 구조를 별도 단계로 구상(아래 §향후).

### B5 구현 계획 (채널 내 복수 테이블)
1. **스키마(`mafia.matches`)**: 채널당 open 매치 1개 제약 해제. `findOpenMatchByDiscordChannel`(단건) → `listOpenMatchesByChannel`(복수). 테이블 식별용 `label`(옵션, 예 "테이블 2") 또는 host 표시명으로 라벨링. RLS: 같은 채널 참가자가 목록 조회 가능.
2. **엣지(muel-bot)**: 신규 `match-list`(채널의 lobby 매치 목록 + 인원/방장). `match-create` = 항상 새 매치. `match-resolve` 는 "내가 이미 앉은 테이블"만 반환(없으면 null → 목록 화면).
3. **프론트**: `LandingScreen` = 「테이블 만들기」 + **열린 테이블 카드 목록**(각 카드 = 미니 무대/인원/방장, 탭하면 join). `page.tsx` boot: resolve 로 내 자리 확인 → 없으면 목록.
4. **정리(presence GC)** — *유령 문제의 진짜 해결*: 로비 시각 필터(이번 PR)는 임시. 백엔드는 (a) 클라 heartbeat(주기적 `lastSeenAt` 갱신) + (b) sweep(일정시간 미갱신 lobby 플레이어 제거, 빈 테이블 자동 소멸). 채널 복수 테이블이라 방치 테이블 GC 가 더 중요.

순서: muel-bot(스키마 마이그레이션 + `match-list` + create-new + GC) PR → muel-tree(목록 UI) PR. 프로토콜은 supabase-ops(드리프트 0)·gomdori-deploy-autonomy 따름.

### 향후 — 크로스-서버 실시간 매칭
채널 경계를 넘어 임의 플레이어를 한 테이블에 모으는 매치메이킹. 인스턴스/채널 결속을 푼 **글로벌 로비 + 큐** 모델 — Activity 진입점·신원·지역/지연·악용 방지·매치 수명까지 별도 설계. B5(채널 내)가 안정화된 뒤 착수.
