# YUMPICK 프로젝트 정리

> 성균관대 「신인류 AI 사피엔스 경험디자인」 기말 프로젝트
> 배포: https://yumpick.vercel.app · 저장소: https://github.com/kh1211-jeong/YUMPICK

> **최신 KPI·차트·과제 요구사항 검증은 [`FINAL_REPORT.md`](./FINAL_REPORT.md)를 기준으로 보세요.**
> 이 문서는 기능/스키마/작업 과정을 시간순으로 기록한 상세 문서이고, 아래 수치는 작성 시점(8/18~8/19) 스냅샷이라 이후 실사용 데이터로 갱신된 최신 총계와 다를 수 있습니다.

---

## 1. 과제 개요

### 1-1. 과제 목표
바이브 코딩(Vibe Coding)을 활용해 **실제 고객의 문제를 해결하는 MVP**를 개발하고, 데이터로 검증하며 반복 개선하는 과정을 보여주는 것이 핵심 평가 기준. 완성도보다 **가설 → 측정 → 학습 → 수정**의 Iteration 과정이 중요하다.

### 1-2. 문제 정의
- **As-is**: 그룹 단톡방에서 "뭐 먹지?" → "아무거나" → 20분 허비 → 늘 가던 곳 → 아무도 만족 못 함.
- **불편함의 원인**: 누군가 메뉴를 정하면 "왜 거기?"라는 눈치를 받을까 봐 다들 결정을 피함.
- **To-be**: 그룹원 각자 취향 한 줄 입력 → AI가 후보로 좁힘 → 투표 → 자동 확정. 아무도 "내가 정했다"는 부담을 지지 않음.

### 1-3. 페르소나
| 항목 | 내용 |
|---|---|
| 이름 | 정기흔 |
| 나이 | 26세 |
| 상황 | 회사 근처에서 팀원 3명과 매일 점심(식사) 메뉴를 정해야 하는 사회초년생 |
| 불편함 | 본인이 메뉴를 정하면 "왜 거기?" 소리를 들을까 봐 눈치를 봄 |

### 1-4. 솔루션 한 줄 정의
그룹(커플·팀·친구·가족·회사 등)이 각자 "오늘 뭐 먹고 싶다"를 자연어로 입력하면, AI가 위치 기준 근처 식당을 취향에 맞게 추려주고, 후보 중 그룹 투표로 오늘 식사를 확정하는 웹 서비스. **서비스명 YUMPICK** (yum 냠 + pick 고르다).

### 1-5. KPI & 측정
| 이벤트 | 시점 |
|---|---|
| `signup_complete` | 회원가입 완료 |
| `group_create` | 그룹 생성 |
| `invite_click` | 초대 링크로 진입 |
| `prompt_submit` | 취향 프롬프트 제출 (passed 여부 포함) |
| `candidate_view` | 후보가 뜰 때 |
| `vote_click` | 투표할 때 |
| `result_confirm` | 최종 메뉴 확정될 때 |

- **핵심 지표 1**: 투표 완료율 = `vote_click` / `candidate_view`
- **핵심 지표 2 (이 서비스만의 지표)**: 프롬프트 참여율 = `prompt_submit(passed=false)` / 그룹원 수
- **결정 도달 시간**: `session.created_at` → 마지막 `vote.created_at`
- (GA4 측정 ID는 아직 미연동 — 서비스 로직에는 영향 없음, 발표 전 연동 권장)

### 1-6. Iteration 기록
| 회차 | 가설/문제 | 조치 |
|---|---|---|
| 1 | 시연 최소 경로가 없으면 검증 자체가 불가능하다 | 회원가입~그룹~세션~AI후보~투표~결과 전체 스캐폴딩, API 키 없이도 목업으로 동작하게 설계 |
| 2 | 무료 Gemini 모델(`gemini-flash-latest`)이 과부하로 자주 503 | `gemini-flash-lite-latest`로 교체 + 1회 재시도 로직 추가 |
| 3 | 네이버 검색 오픈API가 NAVER API HUB로 이전되어 신규 발급 불가 | 카카오 로컬 API(음식점 카테고리 검색) + 카카오맵 JS SDK로 전면 교체 |
| 4 | "오늘 식사 시작" 버튼이 매번 새 세션을 만들어 그룹원끼리 취향이 다른 세션에 흩어짐 | 그룹당 진행 중 세션 1개만 유지하도록 수정 (`getActiveSessionForGroup`), 기존 흩어진 데이터 수동 병합 |
| 5 | 사용자 피드백: 후보가 3곳뿐이라 아쉬움 / 동점 처리가 AI 추천 순서에 편향 / 로그인이 매번 번거로움 등 | 후보 3곳(AI추천)+더보기 7곳, 동점 시 룰렛 애니메이션으로 랜덤 확정, 닉네임 기반 간편 로그인, 즐겨찾기 그룹, 위치 검색, 공유 버튼, 홈 화면 리디자인 추가 |

---

## 2. 기능 정리

### 2-1. 계정
- 회원가입: 닉네임(고유) · 이름 · 생년월일 · 전화번호 · 이메일(선택)
- 고유 식별: (이름 + 생년월일 + 전화번호) 조합, 닉네임도 별도로 유니크
- 닉네임 기반 간편 로그인 — 최초 1회 회원가입 후에는 닉네임만 입력하면 재접속
- 내 정보 화면: 닉네임/이름/생년월일/전화번호(마스킹)/이메일 확인, **최근 선택한 식당** · **자주 가는 식당 TOP3** 표시

### 2-2. 그룹
- 그룹 생성: 이름 + 유형(커플/팀플/친구/가족/회사)
- 초대 링크(토큰 기반) → 링크로 그룹 합류
- 그룹별 **즐겨찾기(⭐)** 토글 + 전체/즐겨찾기 필터 탭
- 한 사용자가 여러 그룹에 소속 가능

### 2-3. 식사 세션
- 그룹당 진행 중 세션은 항상 1개 (중복 생성 방지, 이어서 참여 가능)
- **위치 지정**: 기본은 브라우저 현재 위치, 카카오 장소 검색으로 기준점을 직접 바꿀 수 있음 → 반경 3km 이내가 탐색 범위
- 참여자별 자연어 취향 입력 또는 패스, 실시간 진행 현황(n/총원) 표시
- Gemini가 입력 문장을 `{like, avoid, budget, mood}`로 구조화 (실패 시 규칙 기반 파서로 폴백)

### 2-4. 후보 & 투표
- 카카오 로컬 API로 반경 내 음식점 최대 15곳 조회 → Gemini가 전원 취향을 종합해 최대 10곳을 적합도 순으로 랭킹
- 화면에는 **상위 3곳을 "AI 추천" 배지**로 우선 노출, 나머지는 "더보기"로 펼침(스크롤 가능) — 모두 투표 가능
- 1인 1표, 실시간 득표 현황 표시
- **동점 시 룰렛 애니메이션**으로 공정하게 무작위 확정 (결과는 DB에 저장돼 누가 보든 동일하게 표시)

### 2-5. 결과
- 확정 식당명·카테고리·별점·카카오맵 임베드·상세 링크 표시
- **공유하기** 버튼 (Web Share API, 미지원 브라우저는 링크 클립보드 복사로 대체)

### 2-6. 디자인 시스템
- `DESIGN.md` 기반 토큰(테라코타 accent, 골든옐로 포인트, Pretendard 폰트) 전 화면 적용
- 홈 화면: 그라데이션 블롭 배경, 3단계 사용 흐름 시각 가이드, 순차 페이드인 애니메이션

---

## 3. 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| DB/백엔드 | Supabase (Postgres + PostgREST) |
| AI (자연어 해석·랭킹) | Google Gemini API (`gemini-flash-lite-latest`) |
| 식당 검색 · 지도 | 카카오 로컬 API + 카카오맵 JavaScript SDK |
| 거리 계산 | 하버사인 공식 직접 구현 |
| 측정 | Google Analytics 4 (연동 코드는 준비됨, 측정 ID 미설정) |
| 배포 | Vercel (GitHub 연동 자동 배포) |

**키 없이도 동작하는 구조**: Supabase/Gemini/카카오 키가 없으면 각각 브라우저 localStorage, 규칙 기반 파서, 목업 식당 데이터로 자동 폴백 — 개발 중 언제든 실제 서비스로 전환 가능.

---

## 4. DB 스키마 구조 (Supabase / Postgres)

```
users
  id            uuid pk (gen_random_uuid)
  name          text not null
  birthdate     date not null
  phone         text not null
  email         text null
  nickname      text unique                -- 간편 로그인용
  created_at    timestamptz not null default now()
  -- unique (name, birthdate, phone)

groups
  id            uuid pk
  name          text not null
  type          text not null default 'friends'   -- couple | team | friends | family | company (자유 텍스트)
  owner_id      uuid fk -> users.id (on delete cascade)
  invite_token  text unique not null
  created_at    timestamptz not null default now()

group_members
  id            uuid pk
  group_id      uuid fk -> groups.id (on delete cascade)
  user_id       uuid fk -> users.id (on delete cascade)
  joined_at     timestamptz not null default now()
  is_favorite   boolean not null default false     -- 즐겨찾기
  -- unique (group_id, user_id)

sessions                                            -- '오늘 식사' 한 판
  id                 uuid pk
  group_id           uuid fk -> groups.id (on delete cascade)
  center_lat         double precision not null
  center_lng         double precision not null
  radius_m           int not null default 3000
  status             text not null default 'collecting'  -- collecting | voting | closed
  candidates         jsonb                          -- Candidate[] (최대 10곳)
  winner_restaurant  text null                       -- 확정 식당명 (동점 룰렛 결과 포함, 영구 저장)
  created_at         timestamptz not null default now()

preferences                                          -- 참여자별 취향 입력
  id            uuid pk
  session_id    uuid fk -> sessions.id (on delete cascade)
  user_id       uuid fk -> users.id (on delete cascade)
  raw_text      text not null default ''
  parsed        jsonb                                -- { like: string[], avoid: string[], budget, mood }
  passed        boolean not null default false
  created_at    timestamptz not null default now()
  -- unique (session_id, user_id)

votes
  id            uuid pk
  session_id    uuid fk -> sessions.id (on delete cascade)
  user_id       uuid fk -> users.id (on delete cascade)
  restaurant    text not null
  created_at    timestamptz not null default now()
  -- unique (session_id, user_id)  -- 1인 1표
```

### 관계 다이어그램 (요약)
```
users ─┬─< group_members >─┬─ groups ─< sessions ─┬─< preferences >─ users
       │                   │                      └─< votes >─ users
       └───────────────────┘ (owner_id)
```

### RLS 정책
MVP 단계에서는 모든 테이블에 `anon` 키 기준 전체 read/write 허용 정책(`using (true)`)을 적용. 실제 서비스로 확장 시 사용자별 접근 제어로 강화 필요.

### 마이그레이션 이력
- `0001_init.sql` — 최초 스키마 (users/groups/group_members/sessions/preferences/votes)
- `0002_favorites_nickname_winner.sql` — `sessions.winner_restaurant`, `group_members.is_favorite`, `users.nickname` 추가

---

## 5. 시연 최소 경로 (Demo-Critical Path)

```
그룹 링크 열기 → 위치 지정(검색 가능) → 취향 한 줄 입력 → AI가 후보 제시(3+더보기7)
→ 투표(동점 시 룰렛) → 확정 화면 → 공유하기
```

발표 5분 안에 이 흐름만 보여줘도 문제정의 → 솔루션 → 실사용 검증까지 충분히 전달 가능.

---

## 6. 실사용 데이터 분석 (2026-08-18 ~ 08-19, Supabase 실 데이터)

지인 대상 설문조사가 아니라, 실제 배포 링크(`yumpick.vercel.app`)를 통해 들어온 **행동 데이터**입니다. 약 19시간 동안의 자연 유입 기록.

### 핵심 지표
| 지표 | 값 |
|---|---|
| 가입자 수 | **40명** (2026-08-18 16:36 ~ 08-19 11:56) |
| 그룹 수 | 9개 — 유형 분포: 팀 3 · 친구 4 · 가족 1 · 회사 1 |
| 그룹 멤버십 총합 | 47건, 최대 그룹 규모 **31명** ("신인류 팀플") |
| 세션(식사 판) 수 | 13개 — collecting 7 · voting 1 · **closed 5** |
| 취향 입력 | 46건 (제출 39 · 패스 7) → **패스율 15%**, 대부분 실제 자연어로 취향을 적음 |
| 투표 | 9건, 5개 세션에서 발생 |
| **동점 발생률** | 투표가 이뤄진 5개 세션 중 **3개가 정확히 1:1 동점** → 룰렛 애니메이션이 실제로 3번 작동해 공정하게 확정됨 (설계 의도가 실사용에서 바로 검증된 사례) |
| 세션 완료율(closed/생성) | 5/13 ≈ 38% — 대형 그룹(31명)일수록 전원 완료 전에 세션이 열려 있는 시간이 길어짐을 시사 |

### 실제 입력 예시 (Gemini 파싱 스트레스 테스트)
- "마라탕은 너무 싫고, 빵도 싫어. 일식 먹고 싶어. 신선한 초밥이 좋겠어. 면 요리도 같이 팔면 좋겠어" — 복합 회피+선호 문장도 정상 처리
- "카츠, 일식 돈까스\n마라탕이랑 중식 제외" — 줄바꿈 포함 입력도 정상 처리
- 31명 그룹 세션 하나에서 28건의 취향이 접수됨(매운 국물류/카레/한식/일식/떡볶이/육회비빔밥/양식/닭발/마라샹궈/중식/마라탕/돈까스/서브웨이/샤브샤브/초밥/회/짜장면 등) — 서로 충돌하는 취향을 AI가 종합해야 하는 실제 최악의 케이스가 자연 발생함

### 데이터로 발견하고 고친 버그 (Iteration 근거)
사용자가 "세션끼리 안 붙는 것 같다"고 보고 → DB 직접 조회로 같은 그룹에 세션이 3개씩 중복 생성되어 있는 것을 확인 → 원인(참여자마다 "오늘 식사 시작"을 누를 때마다 새 세션이 생성됨)을 특정 → 그룹당 활성 세션 1개만 유지하도록 수정 → 기존에 흩어진 실제 데이터(두 사용자의 서로 다른 세션에 있던 취향)를 수동 병합해 복구. **가설(버그 의심) → 측정(DB 조회) → 학습(원인 특정) → 수정(코드+데이터 복구)**의 전형적인 사이클.

---

## 7. 과제 요구사항 체크리스트 대조

「기말고사 과제 수행 가이드」 기준 자가 점검.

| 요구사항 | 충족 여부 | 근거 |
|---|---|---|
| 문제 정의 | ✅ | 1-2절 |
| 페르소나(단 한 명) | ✅ | 1-3절 — 정기흔 단일 인물 |
| 시나리오 (As-is/To-be) | ✅ | 1-2절 |
| 솔루션 (MVP) | ✅ | 실제 배포된 서비스, 2절 기능 정리 |
| KPI | ✅ | 1-5절, GA 이벤트 7종 코드 삽입 완료 |
| Iteration 최소 2회 | ✅ (5회 이상) | 1-6절 |
| GA 태그 정상 삽입 | ✅ | `NEXT_PUBLIC_GA_ID=G-VQW7ZLTV9Q` 연동 완료, 로컬/프로덕션 모두 `g/collect` 요청 발사 직접 확인함 |
| Supabase 실 데이터 저장 | ✅ | 6절 — 40명 실사용 데이터 확보 |
| 지인 설문조사에 의존 X | ✅ | 구글폼 없음, 전부 서비스 내 행동 로그 |
| 실제 타겟 고객에게 배포 | ✅ | 수업 팀원 다수가 실제 링크로 자연 유입 (31명 규모 그룹 형성) |
| MVP가 "스케이트보드"인가 (완결된 최소 제품) | ✅ | 시연 경로 단독으로 완결된 사용자 여정 |
| 발표 영상 5분 이내 | ⬜ **아직 제작 전** | 별도 촬영 필요 |

### 제출 전 남은 액션
1. 5분 발표 영상 촬영 (시연 최소 경로 + 6절 실사용 데이터 화면 캡처를 근거 자료로 활용 추천) — 유일하게 남은 항목

---

## 8. 최종 산출물

| 산출물 | 위치 |
|---|---|
| 배포된 서비스 | https://yumpick.vercel.app |
| 소스코드 저장소 | https://github.com/kh1211-jeong/YUMPICK |
| 프로젝트 정리 문서 (본 파일) | `docs/PROJECT_SUMMARY.md` |
| 기획/코딩 지침 | `CLAUDE.md` |
| 디자인 시스템 | `DESIGN.md` |
| DB 스키마 마이그레이션 | `supabase/migrations/0001_init.sql`, `0002_favorites_nickname_winner.sql` |
| 실사용 데이터 | Supabase 프로젝트(`hafhterrfilxaahcsqfe`) — users/groups/sessions/preferences/votes 테이블, 6절 분석 |
| 발표 영상 | 미제작 — 촬영 필요 |
