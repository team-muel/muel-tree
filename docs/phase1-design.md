---
source: C:\Users\fancy\Downloads\phase1-design.md.docx
canonicalized_at: 2026-05-13
status: canonicalized-from-docx
---

# Gomdori 마피아 — Phase 1 MVP 설계서

대상 레포


C:\Users\fancy\muel-tree — Discord Activity (게임 UI)

C:\Users\fancy\Documents\Codex\2026-05-05\obsidian-rag-memory-eval-observer-crm\muel-bot — Gomdori 봇 (오케스트레이션)

Supabase — 게임 데이터


원본 설계서: 컨트롤 F 사용을 권장합니다.docx (1,524줄, 68직업)


천사팀 33 (대천사~비따르지앙)

악마팀 28 = 악마 14 (대악마베스토) + 조력자 14 (가인아델)

중립 7 (렌~캐서린, 각자 고유 승리조건) 범위: Phase 1만. 5 archetype(시민/의사/경찰/악마/조력자)으로 게임 루프를 완성한다. 직업 추가는 Phase 2 이후 데이터 + 핸들러 플러그인으로 점진적.



## 0. 설계 원칙

엔진 먼저, 콘텐츠 나중. Phase 1은 "직업이 더 늘어나도 깨지지 않는 게임 엔진"을 만드는 게 목표. 5 archetype은 그 엔진을 검증하는 가장 작은 슬라이스다.

웹앱 중심 / 멀티 플랫폼. 게임은 한 벌의 웹앱(muel-tree)과 그것을 권위적으로 운영하는 게임 서버(API)로 굴러간다. Discord 봇은 이 시스템의 얇은 launcher일 뿐이지 권위(authoritative) 주체가 아니다. 같은 웹앱이 Discord Activity와 토스 미니앱 두 컨테이너에서 모두 동작해야 한다.

권위는 게임 서버가 가진다. 모든 상태 전환·검증·결과 결정은 게임 서버(stateless API + Supabase). 클라이언트(웹앱)는 표시와 입력만. 봇은 자신의 도메인(Discord 슬래시 커맨드, Activity URL 발급, 매치 종료 알림 푸시)에만 한정된다.

플랫폼 비종속 게임 코어 + 얇은 어댑터. 게임 룰·상태·룰엔진은 플랫폼을 모른다. Discord와 토스의 차이(인증 방법, 음성/텍스트, 푸시 채널)는 어댑터 레이어에서만 다룬다. 이 분리가 향후 Discord Social SDK 이전의 비용을 결정한다.

이벤트 소싱. 모든 행동은 match_events에 append-only. UI는 이벤트 스트림을 구독해서 그린다. 디버깅·관전·재현 모두 같은 채널. 플랫폼이 바뀌어도 이벤트 모델은 그대로.

챗봇은 1차 인터랙션이 아니다. 게임 진행을 봇 채팅으로 끌어가지 않는다. 모든 게임 인터랙션은 웹앱 안에서. 봇은 입구 문(Open Activity)과 매치 결과 통지(선택적)만.

Discord 보이스 채널이 1차 토론 채팅(Discord 컨텍스트 한정). 토스 컨텍스트에선 보이스가 없을 수 있으므로 Phase 2에 텍스트 토론 채널이 필요해질 수 있다. Phase 1엔 Discord만 안전하게 동작.

참조 모델: 마피아 42. 직업 메커니즘·게임 흐름·UX 패턴은 마피아 42의 검증된 사례를 1차 참조점으로 사용한다. 단 그대로 복제하지 않고, 원본 설계서의 비대칭 구조(악마 1 + 조력자 0~2, 천사 다수)와 직업 풀(68종)을 유지한 채 단순화·확장한다. 특히 중립 진영의 첫 도입(Phase 4)은 마피아 42의 "교주" archetype = 파스아부터.



## 1. 게임 흐름

### 1.1 페이즈 다이어그램

[Lobby]


   |  host가 "시작" 클릭 (≥5명, ≤12명)


   v


[RoleAssign]  (3초, 자동)


   |


   v


[Night N=1]  (60초)


   |  악마: kill 1, 조력자: 채팅만, 의사: heal 1, 경찰: investigate 1


   v


[NightResolve]  (3초)


   |  서버에서 행동 적용, 사망자 계산


   v


[Day N]  (180초 = 3분)


   |  공개: 누가 죽었는지, 직업은 비공개


   v


[Vote N]  (60초)


   |  alive 전원 투표 1표 (기권 가능)


   v


[Verdict N]  (5초)


   |  최다 득표자 처형, 직업 공개. 동률이면 처형 없음.


   v


[WinCheck]


   |  종료 조건 충족? -> [End]


   |  아니면 -> [Night N+1]


   v


[Night N+1] ...


[End]


   |  결과 화면 30초, 모든 직업 공개


   v


[Cleanup]  (Supabase 기록 마무리)

### 1.2 인원별 직업 분포

핵심 메커니즘: 특별한 경우가 아니면 악마는 한 명. 그 악마에게 조력자가 0~2명까지 붙는다. 이게 원본 설계의 비대칭 구조이고, Phase 1은 이걸 그대로 보존한다.



권장: 812. 57은 "최소 동작" 검증용.


밸런스 주의: Phase 1엔 직업 능력이 단순화되어 있어 인원이 많을수록 (시민이 많을수록) 천사팀이 압승할 가능성이 높다. 원본 설계서는 악마팀 직업의 강력한 능력으로 이 인원 격차를 메우는 구조이므로, Phase 1 밸런스는 "엔진 검증을 위한 임시값"이라고 봐야 한다.

### 1.3 직업 능력 명세 (Phase 1 한정)


★ 조력자가 경찰 조사에서 "악마 아님"으로 통지되는 게 핵심. 경찰의 정보가 절대적이지 않게 만드는 메커니즘. 조사 결과는 "조력자 가능성"이라는 의심을 동반해야만 의미가 있다.

### 1.4 처리 순서 (NightResolve)

밤 행동들은 결정론적 순서로 적용:


악마 공격 대상 결정 (악마 단독). 조력자는 채팅으로 협의는 가능하나 결정권 없음. 악마가 미선택/AFK면 그날 공격 없음.

의사 치료 대상 결정

악마 공격 대상 == 의사 치료 대상이면 사망 무효 (살아남)

경찰 조사 결과 통지 (조사 자체는 사망과 무관)

대상이 악마: "악마"

대상이 조력자/시민/의사/경찰: "악마 아님"

사망자 발생 시 match_players.alive=false, eliminated_at=now, eliminated_phase 기록


규칙: 경찰이 악마에게 죽어도 그날 밤 조사 결과는 통지된다 (본인이 마지막 메시지를 봄).

### 1.5 승리 조건

천사 승리: 살아있는 악마 수 == 0. 조력자만 남고 악마가 죽으면 즉시 천사 승리. (조력자는 단독으론 승리 불가)

악마 승리: 살아있는 천사진영(시민·의사·경찰) 수 ≤ 살아있는 악마진영(악마+조력자) 수. 단, 악마가 살아있어야 한다.

종료 즉시 모든 직업 공개


이 조건은 "악마를 보호하는 게 조력자의 일"이라는 게임 핵심을 만든다.

### 1.6 엣지 케이스 (Phase 1)



## 2. muel-tree — Activity UI

### 2.1 라우팅


Activity는 Discord에서 voice channel 안에서 띄우는 iframe. URL은 봇이 /게임 명령에 응답할 때 생성.

### 2.2 화면 구성

#### (1) Lobby

상단: "마피아 — 마을명 (게임 #1234)"

중앙: 참가자 카드 그리드 (Discord avatar + nickname + 준비 상태)

하단: 인원별 직업 미리보기 ("8명: 시민4 / 악마1 / 조력자1 / 의사1 / 경찰1")

호스트만: [시작] 버튼. 호스트 외에는 [준비/대기 토글].

우측 사이드: 보이스 채널 활성 여부 표시 ("# 보이스에 6명 / Activity에 5명")

#### (2) Role Reveal (3초 모달)

본인 직업 카드 풀스크린 — 큰 일러스트 자리, 직업명, 진영 색(천사 흰/금, 악마 검/빨), 한 줄 설명, 능력 한 줄

악마라면 추가: "당신의 조력자: @A (또는 없음 / @A, @B)"

조력자라면 추가: "당신은 악마를 돕는 역할입니다. 악마: @X. 다른 조력자: @Y" — 그리고 한 줄 설명: "당신은 직접 행동하지 않지만, 경찰 조사에 천사로 보입니다."

"확인" 버튼이 눌리거나 3초 후 자동으로 다음 페이즈

#### (3) Night

상단: "밤 N — 60초 남음" 카운트다운

중앙: 본인 직업의 행동 UI

시민: "당신은 잠들었습니다." 일러스트 + 대기 텍스트

악마: "공격할 대상을 선택하세요." 살아있는 비악마진영 그리드 + 우측 사이드에 [악마/조력자 채팅] 패널(채팅 기록 + 현재 본인 선택 표시). 결정 버튼은 악마에게만 활성화.

조력자: "당신은 악마를 돕습니다." 본인 행동 입력 영역은 비활성. 우측 [악마/조력자 채팅] 패널만 활성. 악마의 현재 후보 선택을 볼 수 있고 채팅으로 의견 제시.

의사: "치료할 대상을 선택하세요." 살아있는 전원 그리드(자기 포함)

경찰: "조사할 대상을 선택하세요." 살아있는 비본인 그리드

선택 후 [확정] 버튼. 확정 후 변경 불가.

죽은 플레이어: 모든 행동을 관전 가능 (Spectator 모드)

#### (4) Day

상단: "낮 N — 3분"

알림 영역: "어젯밤 @C 가 사망했습니다." (또는 "어젯밤 아무 일도 없었습니다.")

살아있는 플레이어 그리드 + 사망자는 흑백 처리

"보이스 채널에서 토론하세요" 가이드 문구

우상단 작은 [투표로] 버튼 — 호스트가 토론 단축 가능

#### (5) Vote

상단: "투표 — 60초"

살아있는 플레이어 그리드 (자기 자신 포함)

본인이 투표한 대상 하이라이트, [기권] 버튼

다른 사람의 투표는 60초 종료 시점에 한꺼번에 공개 (불안 줄이기)

#### (6) Verdict

처형된 플레이어 카드 큰 화면 + 직업 공개

"{닉네임} 은 {직업} 이었습니다."

진영 색 배경

동률이라면 "동률 — 처형 없음" 화면

#### (7) Result (게임 종료)

상단: 승리 진영 큰 배너 ("천사 승리" / "악마 승리")

모든 플레이어 카드 그리드, 각자의 직업 공개, 살아있는지 죽었는지

하단 버튼: [재대국] (호스트), [돌아가기], [공유]

#### Spectator (사망자 공통)

모든 페이즈 정보 풀 가시. 행동 변경은 불가.

다른 사망자들과 별도 채팅(Phase 1엔 X — Phase 2)

### 2.3 인터랙션 원칙

항상 카운트다운 보임. "지금 뭐 해야 하지?"는 절대 발생 X.

선택은 한 번에. 행동 입력은 큰 카드 버튼. 모달, 드롭다운 X.

결과는 화려하게, 정보는 짧게. 처형/사망은 1초 페이드인 + 큰 텍스트. 설명 텍스트는 한 문장.

비문학 금지. UI에 등장하는 텍스트는 9살이 읽어도 이해되도록. "취급 변경" 같은 용어 Phase 1에는 없음.



## 3. 시스템 아키텍처 — 웹앱 + 게임 서버 + 얇은 launcher

                +-----------------------------+


                |     Game Server (API)       |   ← 권위


                |  - Match state machine      |


                |  - Phase scheduler          |


                |  - Action validator         |


                |  - Win check                |


                |  - service_role 으로 DB 쓰기 |


                +-------+--------+------------+


                        |        |


                        |        | (REST/RPC)


                        |        |


   +--------------------+        +------------------+


   |                                                |


   v                                                v


+---------------+                          +-------------------+


|  muel-tree    |                          |  muel-bot         |


| (웹앱 / 게임 UI) |                          | (Discord launcher)|


| -- Discord    |                          | -- /게임 슬래시    |


|    Activity   |                          | -- 매치 결과 푸시  |


|    어댑터      |                          | (그게 전부)        |


| -- 토스 미니앱  |                          +-------------------+


|    어댑터      |


| -- (장차)      |


|    Discord    |


|    Social SDK |


|    어댑터      |


+-------+-------+


        |


        | Supabase Realtime 구독


        v


+-----------------------------+


|   Supabase Postgres         |


|  - matches, players,        |


|    phases, actions, events  |


|  - RLS                       |


+-----------------------------+

### 3.1 게임 서버 (API)

책임:


매치 라이프사이클 (lobby/role_assign/night/.../ended) 상태 머신

페이즈 스케줄러 (밤 60s, 낮 180s, 투표 60s 타이머)

모든 행동의 검증 (권한, 타이밍, 중복, 타깃 유효성)

NightResolve, Verdict, WinCheck 결정론적 적용

Supabase에 service_role 키로 쓰기 — 클라이언트는 anon 키로 read만


채택: Supabase Edge Functions. 이미 Supabase를 쓰니 추가 인프라 없이 시작 가능. 페이즈 타이머는 pg_cron으로 보완.


페이즈 타이머 처리 (Edge Functions에서):


Cloudflare DO 같은 매치별 alarm은 없음 → 대신 pg_cron 스케줄러가 1~2초 간격으로 활성 매치를 스캔하고 expected_ended_at < now() 인 페이즈가 있으면 다음 단계로 advance.

구체적으로: PG 함수 advance_expired_phases() 를 만들고 pg_cron으로 주기 실행. 함수 내에서 phase_type별 분기 처리(NightResolve, Verdict 등). 모든 비즈니스 로직을 PL/pgSQL로 짜는 건 무거우니 — pg_cron이 발견한 만료 페이즈에 대해 supabase functions 호출하는 방식도 가능.

권장 패턴: pg_cron이 만료 페이즈를 발견하면 pg_notify로 신호, 또는 match_phase_advance_queue 테이블에 row 삽입 → Edge Function이 트리거(database webhook)로 깨어나 advance 처리.


Edge Functions 트레이드오프 인지:


12초 cron 해상도 = 페이즈 종료가 12초 늦어질 수 있음. UX엔 큰 문제 없음(60초 페이즈 기준 약 2% 오차).

Cold start 우려가 있지만 Phase 1 트래픽 수준에선 무시 가능.

만약 페이즈 정확도가 큰 문제가 되면 Phase 2~3에서 Cloudflare Workers + DO로 마이그레이션 가능. 게임 룰 코드는 그대로 가져갈 수 있도록 비즈니스 로직을 TS로 짜고 PL/pgSQL은 trigger 수준으로만 둔다.


중요: 게임 서버 코드(Edge Functions)는 muel-bot 코드와 별도 디렉토리/배포 단위. muel-bot은 게임 서버의 HTTP 클라이언트일 뿐이다.

### 3.2 muel-bot — Discord 측 thin launcher

이전 안에서 게임 권위 주체였던 봇이, 이제는 Discord 컨텍스트의 어댑터 역할만 한다.


책임 (전부):


/게임 [maxPlayers?] 슬래시 커맨드 처리

호출자가 보이스 채널에 있는지 검증

게임 서버에 POST /api/match/create 요청 (호스트 Discord ID, guild/channel 정보 전달)

게임 서버가 응답한 Activity URL을 Discord에 Activity 임베드로 게시

(선택) 매치 종료 시 게임 서버가 봇 webhook을 호출 → 봇이 보이스 채널에 결과 메시지("천사팀 승리!") 게시

(선택) /게임-종료 슬래시 — 호스트가 강제 종료. 게임 서버 호출.


책임 아닌 것:


게임 상태 보관 ❌

페이즈 진행 ❌

행동 검증 ❌

DB 직접 쓰기 ❌


봇은 stateless. 재시작해도 게임은 멀쩡히 진행됨.

### 3.3 muel-tree — 웹앱 (게임 UI 본체)

§2 화면들을 담는 SPA. 라우트 진입 시 다음 순서로 부팅:


플랫폼 어댑터 초기화 — Discord Activity SDK / Toss 미니앱 SDK / (Phase 4+) Discord Social SDK 중 환경에 맞춰 1개 로드

인증 토큰 획득 — 어댑터로부터 Discord OAuth 토큰 / 토스 인증 토큰 받음 → 게임 서버에 POST /api/auth/exchange → 게임 전용 JWT 받음

Supabase 클라이언트 초기화 — 게임 JWT로 Supabase Realtime 구독

매치 join — POST /api/match/{id}/join

이후 매치 이벤트 구독 + 화면 렌더링


웹앱은 권위 없음. 모든 행동은 게임 서버 API로 보내고, 결과는 Realtime 구독으로 받는다.

### 3.4 플랫폼 어댑터 레이어

웹앱 안에서 플랫폼별 차이를 흡수하는 얇은 모듈. Phase 1엔 Discord 어댑터만 완성, 토스는 인터페이스 정의만.


interface PlatformAdapter {


  // 인증


  getAuthToken(): Promise<{ token: string; provider: 'discord' | 'toss' }>;


  // 사용자 정체


  getUserIdentity(): Promise<{


    platformUserId: string;       // 디스코드 ID 또는 토스 ID


    displayName: string;


    avatarUrl?: string;


  }>;


  // 컨텍스트 (Discord: 보이스 채널 / Toss: 친구 그룹 등)


  getSessionContext(): Promise<{


    contextType: 'discord_voice' | 'toss_group' | 'standalone';


    contextId?: string;


  }>;


  // 통지 채널 (게임 서버가 외부 푸시할 때 사용 가능한 식별자)


  getNotificationHandle(): Promise<{ kind: 'discord_channel' | 'toss_push' | 'none'; id?: string }>;


  // 닫기 / 결과 공유


  closeOrFinish(result?: { win: 'angels' | 'demons'; ... }): Promise<void>;


}


### 3.5 Activity ↔ 게임 서버 프로토콜

#### Client → Server (REST/RPC, 게임 JWT 인증)

POST /api/match/create — 매치 생성 (봇 또는 직접 호출)

POST /api/match/{id}/join

POST /api/match/{id}/ready — body: { ready }

POST /api/match/{id}/start — host only

POST /api/match/{id}/action — body: { phase_id, action_type, target_user_id? }

POST /api/match/{id}/vote — body: { phase_id, target_user_id | null }

POST /api/match/{id}/leave

POST /api/match/{id}/abort — host only


각 엔드포인트는 게임 JWT의 sub(internal user_id)와 매치 시점 권한을 검증.

#### Server → Client

Supabase Realtime (Postgres CDC) — 모든 클라이언트가 본인이 속한 매치 row를 구독

게임 서버는 직접 클라이언트에 푸시하지 않음. 모든 변화는 DB write → CDC로 흐름.

비밀(개인 조사 결과, 동료 정체)은 match_events.visibility=private + recipient_user_id 로만 RLS 통과.

### 3.6 보안 / RLS

모든 클라이언트 access는 anon key + 게임 JWT 조합. service_role은 게임 서버만.

match_actions: 본인이 actor인 row만 read 가능

match_events.visibility=private: recipient_user_id == auth.uid() 만 read

match_events.visibility=public: 매치 참가자 전원 read

직업 정보: match_players.role 은 본인 + 악마진영(악마+조력자)끼리만 read (Phase 1 한정). 즉 악마와 조력자는 서로의 정체를 모두 안다.

게임 종료 후: 모든 정보 read 가능

write는 service_role만 — 즉 게임 서버를 거치지 않으면 클라이언트는 절대로 매치 상태를 바꿀 수 없다.

### 3.7 구현 시 주의점 (Phase 1에서 놓치면 며칠 날림)

설계 점검에서 발견한, 무심코 넘어가면 코드를 다시 짜야 하는 디테일들.


(a) Discord Activity URL은 매치별로 다르지 않다. Activity 앱 URL은 Discord 개발자 포털에 고정 등록된다(https://muel-tree.app/game 같은 한 개의 URL). 봇이 매치를 만들고 그 매치의 URL을 응답할 수는 없다. 대신 흐름은:


/게임 슬래시 호출 시 봇이 게임 서버에 매치 생성 요청 → 매치 row 생성 + 호출자의 voice channel id 기록

봇이 Discord에 Activity 시작 메시지를 게시 (POST /channels/{id}/messages 또는 Activity 시작 API)

사용자가 클릭하면 Discord가 고정 Activity URL을 iframe으로 연다

muel-tree가 부팅 시 Discord Embedded App SDK의 instance_id/channel_id 를 받아 게임 서버에 POST /api/match/resolve { discord_channel_id } → 활성 매치 id 반환

그 매치에 join


따라서 §3.5 /api/match/create 응답엔 매치 id만 들어가지, 매치별 URL은 없다. Activity URL은 환경변수(또는 Discord 설정)로 박아둔다.


(b) 클라이언트 카운트다운은 서버 권위 시각으로 동기화한다. Supabase Realtime은 50~300ms 정도 지연이 있다. 클라이언트가 자체 setInterval로 카운트다운하면 서버의 페이즈 종료와 어긋난다. 해결: match_phases에 expected_ended_at(timestamptz)를 두고, 클라이언트는 그 절대 시각을 기준으로 (now - drift) 표시. 페이즈 실제 종료는 서버 DO alarm이 트리거 → ended_at 업데이트 → CDC.


(c) 자동 진행 페이즈도 서버 타이머다. RoleAssign(3s), Verdict(5s), End(30s) 같은 자동 페이즈도 클라이언트가 결정하지 않고 서버에서 advance한다. Edge Functions 환경에선 pg_cron이 1~2초 간격으로 만료 페이즈를 발견해 처리. 클라이언트는 단지 페이즈 인입 시 카운트다운을 표시할 뿐.


(d) 악마/조력자 야간 채팅은 별도 테이블. match_chats 테이블이 필요하다(§4 추가). action_type='helper_chat'으로 우겨넣으면 메시지가 늘어났을 때 작동하지 않는다. 채팅은 다대다 메시지 스트림이지 단일 행동이 아니다. Phase 1엔 채널이 'demon_circle' 하나뿐.


(e) Lobby idle timeout. 매치 생성 후 호스트가 시작도 안 하고 모두 떠나면? 30분 후 자동 abort. DO alarm 또는 Supabase pg_cron.


(f) Supabase Auth와 자체 JWT. RLS의 auth.jwt()는 Supabase가 서명을 검증한 JWT를 가정한다. Phase 1 기준 결정은 다음과 같다.


권장 경로: 자체 JWT를 Supabase Dashboard의 Legacy JWT Secret으로 서명한다. 게임 서버가 JWT를 발급하지만 Supabase가 같은 legacy secret으로 검증할 수 있어 RLS가 자연스럽게 동작한다. claims에는 sub = users.id (uuid)를 넣는다.

환경변수 이름은 `GAME_JWT_SECRET`을 사용한다. `SUPABASE_JWT_SECRET` 같은 `SUPABASE_*` prefix는 Supabase Edge Function secrets에서 reserved prefix 충돌을 만들 수 있으므로 게임용 secret에는 쓰지 않는다.


Phase 1에서는 Standby Key를 만들거나 JWT signing key를 회전하지 않는다. Dashboard의 Legacy JWT Secret 값을 복사해서 게임 서버/Edge Functions secret에 등록한다. Phase 2에서 비대칭 키로 넘어갈 때 알고리즘과 변수명을 함께 재설계한다.

(대안) Supabase Auth의 Anonymous Sign-In으로 임시 Supabase 사용자를 만들고 별도 매핑 테이블로 internal users.id를 연결할 수 있지만, Phase 1에서는 복잡도가 크므로 보류한다.


(g) 직업 가시성 view + Realtime의 미묘한 충돌. Supabase Realtime의 postgres_changes는 base table 변경을 push한다. view를 구독해도 base table 이벤트가 그대로 와서, 클라이언트는 자기 권한에 없는 role 정보까지 받을 위험이 있다. 해결책 둘:


클라이언트는 view를 query하되 Realtime은 events·phases·matches만 구독. role 변화는 별도 match_events(event_type='role_assigned', private)로 푸시.

또는 RLS를 view 하부의 base table(match_players)에 더 엄격히 걸기.


Phase 1엔 첫 번째 방식으로 — match_players.role이 채워지는 시점에 각 플레이어에게 private event로 본인 role을 통지하고, 악마+조력자에게는 추가로 동료 정보를 통지. 클라이언트는 events만 구독하면 됨.



## 4. Supabase 스키마

플랫폼 비종속 user 모델. Discord ID와 토스 ID는 외부 식별자일 뿐, 게임 내부에서는 항상 internal users.id(UUID)를 쓴다.


-- 사용자 (플랫폼 비종속)


create table users (


  id uuid primary key default gen_random_uuid(),


  primary_display_name text not null,


  primary_avatar_url text,


  created_at timestamptz not null default now()


);


-- 플랫폼별 정체 매핑 (한 user는 여러 플랫폼 ID를 가질 수 있음)


create table user_platform_identities (


  user_id uuid not null references users(id) on delete cascade,


  platform text not null,        -- 'discord' | 'toss' | 'discord_social_sdk' (Phase 4+)


  platform_user_id text not null,


  display_name text,              -- 플랫폼별 닉네임 (스냅샷)


  avatar_url text,


  linked_at timestamptz not null default now(),


  primary key (platform, platform_user_id)


);


create index on user_platform_identities (user_id);


-- 매치


create table matches (


  id uuid primary key default gen_random_uuid(),


  -- Discord 컨텍스트 (선택, 토스 매치면 NULL)


  discord_guild_id text,


  discord_channel_id text,


  -- 토스 컨텍스트 (선택)


  toss_context_id text,


  -- 진입 플랫폼 (어디서 만든 매치인지)


  origin_platform text not null,  -- 'discord' | 'toss' | 'standalone'


  host_user_id uuid not null references users(id),


  status text not null default 'lobby',  -- lobby|role_assign|night|day|vote|verdict|ended|aborted


  current_phase_number int not null default 0,


  winner text,  -- 'angels' | 'demons' | null


  config jsonb not null default '{}'::jsonb,  -- timers, max_players 등


  created_at timestamptz not null default now(),


  started_at timestamptz,


  ended_at timestamptz


);


-- 매치 참가자


create table match_players (


  match_id uuid references matches(id) on delete cascade,


  user_id uuid not null references users(id),


  display_name text not null,    -- 스냅샷 (게임 시작 시점)


  role text,  -- 'citizen' | 'demon' | 'helper' | 'doctor' | 'police' | null (배정 전)


  faction text,  -- 'angels' | 'demons' (role에서 파생되지만 자주 조회되니 캐시)


  alive boolean not null default true,


  joined_at timestamptz not null default now(),


  ready boolean not null default false,


  eliminated_at timestamptz,


  eliminated_phase_number int,


  eliminated_cause text,  -- 'demon_kill' | 'lynch' | 'disconnect_timeout'


  primary key (match_id, user_id)


);


-- 페이즈 (밤/낮/투표 각각이 하나의 row)


create table match_phases (


  id uuid primary key default gen_random_uuid(),


  match_id uuid references matches(id) on delete cascade,


  phase_number int not null,  -- 1, 2, 3...


  phase_type text not null,   -- 'role_assign' | 'night' | 'day' | 'vote' | 'verdict'


  started_at timestamptz not null default now(),


  expected_ended_at timestamptz not null,  -- 클라이언트 카운트다운 동기화용 서버 권위 시각


  ended_at timestamptz,                     -- 실제 종료 시각 (DO alarm이 채움)


  unique (match_id, phase_number, phase_type)


);


-- 행동 (밤 행동, 투표)


create table match_actions (


  id uuid primary key default gen_random_uuid(),


  phase_id uuid references match_phases(id) on delete cascade,


  match_id uuid references matches(id) on delete cascade,


  actor_user_id uuid not null references users(id),


  action_type text not null,  -- 'demon_kill' | 'doctor_heal' | 'police_investigate' | 'vote' (채팅은 match_chats로)


  target_user_id uuid references users(id),  -- null = abstain (vote)


  result jsonb,                 -- 결과 페이로드 (예: 조사: {is_mafia: true})


  submitted_at timestamptz not null default now(),


  unique (phase_id, actor_user_id, action_type)


);


-- 야간 채팅 (Phase 1: 악마/조력자 그룹 채팅만)


create table match_chats (


  id uuid primary key default gen_random_uuid(),


  match_id uuid references matches(id) on delete cascade,


  phase_id uuid references match_phases(id),


  channel text not null,  -- 'demon_circle' (Phase 1 한정). Phase 2: 'spectator', etc.


  sender_user_id uuid not null references users(id),


  message text not null,


  created_at timestamptz not null default now()


);


create index on match_chats (match_id, created_at);


create index on match_chats (phase_id);


-- 이벤트 (UI 구독용)


create table match_events (


  id uuid primary key default gen_random_uuid(),


  match_id uuid references matches(id) on delete cascade,


  phase_id uuid references match_phases(id),


  event_type text not null,  -- phase_started, player_died, lynch, investigate_result, mafia_intro, game_ended ...


  visibility text not null default 'public',  -- 'public' | 'private'


  recipient_user_id uuid references users(id),  -- visibility=private 일 때 필수


  payload jsonb not null default '{}'::jsonb,


  created_at timestamptz not null default now()


);


create index on match_players (match_id);


create index on match_phases (match_id, phase_number);


create index on match_actions (phase_id);


create index on match_events (match_id, created_at);


create index on match_events (recipient_user_id) where visibility = 'private';


match_chats RLS — 본인이 그 채널에 속한 경우에만 read. Phase 1엔 'demon_circle' 채널은 악마+조력자만:


alter table match_chats enable row level security;


create policy mc_read on match_chats for select


  using (


    channel = 'demon_circle'


    and exists (


      select 1 from match_players mp


      where mp.match_id = match_chats.match_id


        and mp.user_id = (auth.jwt()->>'sub')::uuid


        and mp.role in ('demon', 'helper')


    )


  );

### RLS 정책 (요약)

alter table matches enable row level security;


alter table match_players enable row level security;


alter table match_phases enable row level security;


alter table match_actions enable row level security;


alter table match_events enable row level security;


-- 매치: 참가자만 read


create policy match_read on matches for select


  using (exists (select 1 from match_players where match_id = matches.id and user_id = (auth.jwt()->>'sub')::uuid));


-- 참가자: 같은 매치 참가자끼리 read. role 컬럼은 view로 마스킹.


create policy mp_read on match_players for select


  using (exists (select 1 from match_players mp2 where mp2.match_id = match_players.match_id and mp2.user_id = (auth.jwt()->>'sub')::uuid));


-- 행동: 본인 것만 read (게임 종료 후 확장)


create policy ma_read on match_actions for select


  using (actor_user_id = (auth.jwt()->>'sub')::uuid);


-- 이벤트: public이면 참가자 전원, private면 recipient만


create policy me_read on match_events for select


  using (


    visibility = 'public' and exists (select 1 from match_players where match_id = match_events.match_id and user_id = (auth.jwt()->>'sub')::uuid)


    or (visibility = 'private' and recipient_user_id = (auth.jwt()->>'sub')::uuid)


  );


-- write는 service_role(게임 서버)만. anon은 read-only.


직업 가시성은 view로 처리 (PostgreSQL 15+ 의 SECURITY INVOKER로 base table RLS가 그대로 적용되도록):


create view match_players_visible


with (security_invoker = true) as


select


  mp.match_id, mp.user_id, mp.display_name, mp.alive, mp.joined_at, mp.ready,


  mp.eliminated_at, mp.eliminated_phase_number, mp.eliminated_cause,


  case


    when mp.user_id = (auth.jwt()->>'sub')::uuid then mp.role


    when (select status from matches where id = mp.match_id) = 'ended' then mp.role


    when mp.role in ('demon', 'helper') and exists (


      select 1 from match_players self


      where self.match_id = mp.match_id


        and self.user_id = (auth.jwt()->>'sub')::uuid


        and self.role in ('demon', 'helper')


    ) then mp.role


    else null


  end as role


from match_players mp;



## 5. 68직업 → 5 archetype 매핑

설계서의 각 직업이 Phase 1의 어느 archetype(시민/의사/경찰/악마/조력자)에 가장 단순화된 형태로 들어맞는지. Phase 2+ 추가 우선순위 결정용이지 Phase 1에 다 구현하는 건 아니다.

### 5.1 천사팀 33 → archetype

### 5.2 악마 14 → archetype

매 게임에 1명만 등장하는 악마 풀(pool). Phase 1엔 모두 단일 "악마" archetype으로 단순화 — 1명 죽이기, 조력자 채팅 결정권.



(앞서 §5.2 초안에서 로잔느·케오베를 "조력자"로 본 건 정정 — 이들은 악마팀 소속이지만 〈악마〉 카테고리. 실제 조력자는 §5.3.)

### 5.3 조력자 14 → archetype ★

매 게임에 0~2명이 뽑히는 조력자 풀. Phase 1엔 단일 "조력자" archetype으로 단순화 — 행동 없음, 악마 채팅 가시, 경찰 조사에 천사로 보임.


### 5.4 중립 7 → archetype (마피아 42 참조)

중립은 Phase 1에서 전부 제외. 중립은 자체 승리조건이 직업마다 달라서 승리조건 다중화 시스템이 도입되어야 함 → Phase 4+.


원본 설계서의 중립 7직업은 마피아 42(Mafia42)의 검증된 중립 archetype들과 메커니즘 측면에서 직접·간접적으로 매핑된다. 가장 원본적이고 검증된 모델은 "교주(Cult Leader)"이며, 파스아가 그 직접 매핑. Phase 4의 첫 번째 중립 도입은 파스아부터 — 다른 직업들과 가장 적게 얽히고, "포교"라는 메커니즘이 깔끔히 모듈화 가능하기 때문.



참조 정확도 주의: 위 마피아 42 archetype 라벨은 일반적인 마피아 42 직업 풀에 대한 통상적 분류를 기반으로 하며, 마피아 42의 패치·서버별 룰 차이가 있을 수 있다. 이 문서는 "원본 설계서를 어떤 검증된 모델로 단순화할까"의 사고 보조용 매핑이지 마피아 42 룰의 그대로 복제가 아니다.


파스아 ↔ 교주 매핑의 정밀 비교:



파스아는 "교주 + 정체 공개 + 강제 통지" 트레이드오프가 더해진 변형. Phase 4 도입 시엔 이 차이를 어떻게 살릴지(공개 정도를 호스트 옵션으로?) 결정.

### 5.5 Phase 로드맵 시사점

이 매핑에서 보이는 것:


천사팀 33개 중 절반 이상은 단순 시민. 단순 시민은 능력이 없는 게 본질이지만 직업명·일러스트·플레이버는 다양하게 살릴 수 있다 (= "이름만 다르고 메커니즘은 같은" 시민 30종은 데이터로 처리 가능).

악마팀 28개는 "악마 풀 14 + 조력자 풀 14"의 비대칭 구조. Phase 1에서 이 분리를 그대로 보존했기 때문에 Phase 2 이후 직업을 추가할 때 "어느 풀에 들어가는가"가 명확.

메커니즘 추가 우선순위 (Phase 2): 조사 변형(도르단/에릭), 치료 변형(헬렌), 조력자 변형(일레인 등 단순한 것부터). 기존 5 archetype에 1~2 룰만 추가하면 된다.

Phase 3에서 도입할 시스템: 투표가치, 의심가치, 직업 변경(취급), 악령 빙의(말렌).

Phase 4에서 도입: 중립 7개 (각자 승리조건), 부활/소환, 양면(아델), 시간 분기(케오베/로잔느 일부).

첫 도입 권장: 파스아 — "교주(Cult Leader)" archetype의 직접 매핑이고, 마피아 42에서 검증된 메커니즘이라 가장 위험이 적다. 포교 시스템(match_players.faction 동적 변경 + 개인 승리조건 부여)이 그 위에 다른 중립을 얹을 인프라가 된다.

그 다음 도입 순서 권장: 렌(혼자 살아남기 — 메커니즘 단순) → 제니(모방 — 능력 카피 시스템 필요) → 파커/캐서린(양면 분기) → 베이즈(사냥/조사 복합) → 아렌(별실 토론 — 토론 시스템 분기 필요, 가장 무거움).

Phase 5+: 시간/미래/메타(카르티에, 레페덴티아 등 특수 천사).



## 6. 빌드 우선순위 (Phase 1 안)

웹앱 중심 아키텍처에 맞춘 순서. 가장 먼저 게임 서버 + 인증 + 스키마가 안정되어야 그 위로 UI를 쌓을 수 있다.

### 6a. 백엔드 토대

Supabase 스키마 + RLS — §4 SQL 실행 (users, identities, matches, players, phases, actions, chats, events). RLS 정책까지 한꺼번에.

게임 서버 스켈레톤 — Supabase Edge Functions 프로젝트 디렉토리 (supabase/functions/) 설정. /health 만 작동. pg_cron extension 활성화.

JWT 발급/서명 결정 — Supabase Legacy JWT Secret을 `GAME_JWT_SECRET`으로 게임 서버/Edge Functions에 공유한다 (§3.7-f). 자체 발급 JWT가 RLS와 자연스럽게 동작하는지 작은 read 쿼리로 검증한다. Standby Key 생성/회전은 Phase 1에서 금지.

인증 교환 — POST /api/auth/exchange — Discord OAuth 토큰 검증 → users 매핑/생성 → 게임 JWT 발급. (토스 토큰 검증은 Phase 2.)

매치 생성 + resolve + join — POST /api/match/create, /api/match/resolve (channel_id → 활성 매치), /api/match/{id}/join, /leave. RLS가 정상 동작하는지 함께 검증.

### 6b. Discord 진입 경로

Discord Activity 앱 등록 — Discord 개발자 포털에 Activity 앱 만들기. 고정 URL 등록(https://muel-tree.app/game). 개발용은 ngrok 또는 Cloudflare Tunnel.

muel-bot /게임 슬래시 커맨드 — 보이스 채널 검증 → 게임 서버 match/create 호출 → Activity 시작 메시지 게시. 봇은 이게 끝.

muel-tree 부팅 시퀀스 — DiscordActivityAdapter 로드 → SDK에서 channel_id 받기 → match/resolve 호출 → 인증 교환 → Supabase Realtime 구독.

muel-tree Lobby 화면 — 참가자 표시, ready 토글, 시작 버튼. Lobby idle 30분 timeout 동작 확인.

### 6c. 게임 루프

게임 서버: 매치 시작 + 역할 배정 — 인원 검증(5~12), 분포 적용(§1.2), match_players.role 채우기, 각 플레이어에게 role private event emit (§3.7-g 방식).

muel-tree: Role Reveal.

게임 서버: 페이즈 스케줄러 — pg_cron이 1~2초마다 advance_expired_phases() 함수 실행. 만료 페이즈를 다음 상태로 전환. 매 페이즈 row에 expected_ended_at 정확히 기록. 60s/180s/60s + 자동 페이즈(3s/5s) 모두 같은 메커니즘.

muel-tree: Night UI — 시민/악마/조력자/의사/경찰 5종 + 악마/조력자 채팅(match_chats write, Realtime read).

게임 서버: NightResolve — 행동 적용, 사망자 결정, 사적 통지(경찰 결과) emit.

muel-tree: Day + Vote + Verdict UI. 카운트다운은 expected_ended_at 기준.

게임 서버: WinCheck + 종료 — 매치 status='ended', winner 기록, 봇 webhook 호출(선택).

muel-tree: Result 화면.

### 6d. 검증

통합 테스트 — 헤드리스 클라이언트 5~8개로 한 게임을 끝까지 시뮬레이션. CI에 포함.

혼돈 테스트 — disconnect 중간 발생, 봇 재시작, 게임 서버 재배포(DO 마이그레이션 포함) 시에도 진행되는지.

### 6e. 토스 어댑터 자리만 마련 (Phase 1 한정)

TossMiniAppAdapter 인터페이스만 정의. 실제 SDK 호출은 Phase 2. 단 어댑터 분리가 코드에 반영되어 Phase 2 추가 시 게임 코어 수정 없이 들어갈 수 있어야 함.


각 단계 종료 시점에 "동작하는 부분"이 있어야 한다.



## 7. 측정·모니터링 (Phase 1)

매치당 평균 길이 (ended_at - started_at)

매치당 페이즈 수

AFK / disconnect 비율

천사 vs 악마 승률

직업별 승률 (불균형 감지)

사용자별 매치 참여 횟수, 완주율


이 메트릭을 Supabase에서 쿼리할 수 있도록 위 스키마는 충분.



## 8. Phase 1에서 의도적으로 빠진 것

컴플레인 받지 않으려면 시작할 때 사용자에게 명시적으로 "Phase 1입니다" 라고 안내. UI에 (베타) 마크.


뺀 것 목록:


직업 63종 (5종 archetype만 — 시민/의사/경찰/악마/조력자)

중립 진영 7종 (각자 승리조건 시스템 부재)

투표가치 / 의심가치 시스템

취급 변경, 영혼 이동, 소환, 부활

정책 투표, 흥정, 책략가

미래 촬영, 시간 조작

텍스트 채팅 (보이스만)

사망자 채팅

관전자 모드 디테일 (사망자 동등 가시만 제공)

매치 리플레이 UI (데이터는 전부 저장됨)

매칭메이킹 / 랭크 시스템


이것들이 들어가야 "원본 설계서"가 된다. 그래서 Phase 2~5 로드맵이 따로 필요.



## 9. 다음 세션에서 할 것

이 문서는 설계까지. 구현은 다음 세션에서:


(a) Supabase SQL을 실제 프로젝트에 적용 (users, identities, matches 등)

(b) 게임 서버 (Cloudflare Workers + DO) 스켈레톤 — 인증 교환 + 매치 생성/join

(c) muel-bot의 /게임 핸들러 코드 작성 (게임 서버 호출 → Activity URL 응답)

(d) muel-tree 부팅 시퀀스 (DiscordActivityAdapter + 인증 교환 + Realtime 구독)

(e) muel-tree Lobby 화면 컴포넌트


각각 별도 세션으로 분리 권장. 한 번에 한 컴포넌트.



## 10. 향후 마이그레이션 경로 — Discord Social SDK

언제 검토하는가: Phase 4+ 또는 다음 신호가 나타날 때.


Discord Activity의 보이스 채널 의존성이 게임 흐름의 발목을 잡을 때 (보이스가 없는 곳에서도 플레이하길 원하는 사용자 비율이 높아질 때)

토스 미니앱 외에도 모바일 OS 네이티브 등 추가 플랫폼이 필요해질 때

Discord가 Activity 모델을 deprecate하거나 Social SDK를 강력히 권장하는 정책 변화가 생길 때


무엇이 바뀌고 무엇이 안 바뀌는가:



비용 추정: 어댑터 추가 + 봇 launcher 코드 제거 + 인증 분기. 게임 코어가 건드려지지 않으므로 수일~2주 수준 예상. 단, Phase 1에서 어댑터 레이어 분리를 제대로 했을 때.


Phase 1에 미리 해두어야 할 것 (= Phase 1 비용으로 미래를 사두는 것):


플랫폼 어댑터 인터페이스를 처음부터 만들기. Discord 만 쓰더라도. ★ 이게 미래 마이그레이션 비용을 결정짓는 단일 가장 큰 결정.

봇 코드와 게임 서버 코드 분리. 한 리포에 같이 두지 말 것.

사용자 식별을 internal users.id(UUID)로 통일. Discord ID를 직접 PK로 쓰면 마이그레이션이 지옥이 됨.

모든 외부 통지를 abstract notification handle로 (§3.4). Discord 채널 ID를 코드에 박지 말 것.


이 네 가지를 지키면 Discord Social SDK 이전은 옵션으로 열려 있고, 안 지키면 게임을 다시 짜야 한다.

