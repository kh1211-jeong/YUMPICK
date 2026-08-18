# 호칭 규칙
주인님이라고 부르며 극존칭을 사용할 것.

# CLAUDE.md — YUMPICK (그룹 식사 메뉴 결정 서비스)

Claude Code가 이 프로젝트에서 작업할 때 항상 먼저 읽는 지침 파일입니다.
작업 시작 전 이 파일과 `DESIGN.md`를 읽고, 규칙을 지켜 코드를 작성하세요.

---

## 1. 프로젝트 한 줄 정의

그룹(커플·팀·친구)이 **각자 "오늘 뭐 먹고 싶다"를 자연어로 입력하면**,
AI가 위치 기준 근처 식당을 그 취향대로 추려주고,
**후보 3곳으로 좁혀 그룹 투표로 오늘 식사를 확정하는** 웹 서비스.

- 서비스명: **YUMPICK** (yum 냠 + pick 고르다)
- 성격: 대학 강의 기말 MVP 과제. 완성도보다 **가설-측정-개선 반복(Iteration)** 이 평가 핵심.

---

## 2. 핵심 사용자 & 문제

- **페르소나**: 정기흔, 26세. 회사 근처에서 팀원 3명과 매일 식사 메뉴 정하는 데 지친 사회초년생.
  자기가 정하면 "왜 거기?" 소리 들을까 봐 눈치 봄.
- **As-is**: 단톡방 "뭐 먹지 → 아무거나" 20분 → 늘 가던 곳 → 아무도 만족 못 함.
- **To-be**: 그룹에서 각자 취향 한 줄 입력 → AI가 후보 3곳 제시 → 투표 → 자동 확정.

---

## 3. 기능 명세 (Full Scope — 사용자 요구사항 전량 반영)

### 3-1. 회원 / 계정
- 회원가입 입력: **이름 · 생년월일 · 전화번호**. 이메일은 **선택**.
- **고유 식별(Unique)**: (이름 + 생년월일 + 전화번호) 조합으로 중복 판단.
- 가입 시 내부 **user ID(uuid)** 발급·저장.
- 로그인: 전화번호 기반(또는 이름+생년월일 조합). 인증은 MVP 수준으로 간단히.

### 3-2. 그룹
- **그룹 추가 탭**: 그룹 생성(이름 지정, 유형 태그 자유 - 커플/팀플/친구 등).
- 커플(2인)부터 다인(4~5인)까지 모두 지원.
- **그룹 초대 링크**: 토큰 기반 초대 링크 생성 → 링크로 들어온 사람이 그룹 합류.
- 한 사용자가 여러 그룹에 소속 가능.

### 3-3. 메뉴 정하기 세션
- **메뉴 추가 탭**: 그룹 안에서 "오늘 식사" 세션 시작.
- **위치 지정**: 특정 위치/장소를 찍으면, 그 기준 **반경 3km 이내** 식당이 탐색 범위.
- **자연어 프롬프트 입력**: 각 참여자가 취향을 문장으로 입력.
  예) "오늘 매운 건 안 땡기고 일식이 땡겨", "가볍게 면 종류로".
- **AI 해석**: 입력 문장을 구조화(선호 카테고리 / 회피 요소 / 예산 / 무드)로 변환.
- **패스**: 참여자는 입력 대신 패스 가능.
- **마감 조건**: 그룹 전원이 입력 완료 또는 패스하면(또는 제한 시간 종료 시) 후보 단계로.

### 3-4. 후보 제시 & 투표
- AI가 전원 프롬프트를 종합 → **상위 3곳**을 "AI 추천"으로 우선 제시, "더보기"로 최대 7곳을 추가로 볼 수 있음(총 10곳).
- 각 후보에 **별점 · 원본 상세 사이트 링크** 표시.
- 그룹원이 (상위 3곳 포함) 노출된 후보 중 투표(1인 1표) → 최다 득표 메뉴/식당 확정. 동점이면 룰렛 애니메이션으로 무작위 확정.

---

## 4. 시연용 최소 경로 (Demo-Critical Path) ★가장 중요

시간이 부족하면 아래 경로만 확실히 동작하게 하세요. 발표 5분은 이 흐름만으로 충분합니다.
로그인 강화·다중 그룹 관리 등은 후순위로 미뤄도 됩니다.

```
그룹 링크 열기 → 위치 찍기 → 취향 한 줄 입력 → AI가 후보 3곳 → 투표 → 확정 화면
```

- 이 경로의 각 액션에 GA 이벤트가 다 붙어 있어야 함(8번 참조). 측정 없으면 과제 감점.

---

## 5. 기술 스택

```
프론트엔드 : Next.js (App Router) + TypeScript + Tailwind CSS
DB/백엔드  : Supabase (@supabase/supabase-js) — 계정·그룹·세션·투표 저장
AI (자연어): Google Gemini API (무료 티어, aistudio.google.com에서 키 발급)
             * OpenAI는 무료 API 없음 → Gemini Flash로 프롬프트 해석.
             * OpenAI 호환 형식이라 추후 교체 용이.
식당 검색  : 카카오 로컬 API (카테고리 검색 FD6) — 서버 사이드에서만 호출
지도/좌표  : 카카오맵 JavaScript SDK
거리 계산  : 하버사인 공식 직접 구현 (lib/distance.ts) — 3km 반경 필터
측정       : Google Analytics 4 (GA4)
배포       : Vercel
```

---

## 6. 폴더 구조

```
yumvote/
├─ app/
│  ├─ page.tsx                      # 홈 / 로그인·가입 진입
│  ├─ signup/page.tsx               # 회원가입 (이름·생년월일·전화·이메일선택)
│  ├─ groups/page.tsx               # 내 그룹 목록 + 그룹 추가
│  ├─ groups/[groupId]/page.tsx     # 그룹 상세 + 초대 링크 + 세션 시작
│  ├─ invite/[token]/page.tsx       # 초대 링크로 그룹 합류
│  ├─ session/[id]/page.tsx         # 위치 지정 + 취향 프롬프트 입력
│  ├─ session/[id]/vote/page.tsx    # 후보 3곳 투표
│  ├─ session/[id]/result/page.tsx  # 확정 결과 + 지도
│  └─ api/
│     ├─ interpret/route.ts         # Gemini 호출: 프롬프트 → 구조화 (키 숨김)
│     ├─ search/route.ts            # 카카오 로컬 API 호출 (키 숨김)
│     ├─ candidates/route.ts        # 전원 취향 종합 → 후보 3곳 선정
│     └─ vote/route.ts              # 투표 저장/집계
├─ lib/
│  ├─ supabase.ts
│  ├─ distance.ts                   # 하버사인 3km 필터
│  ├─ gemini.ts                     # Gemini 클라이언트 래퍼
│  ├─ kakao.ts                      # 카카오 로컬 API 래퍼
│  └─ analytics.ts                  # GA 이벤트 헬퍼
├─ DESIGN.md
├─ CLAUDE.md
└─ .env.local                       # 키 (git 커밋 금지)
```

---

## 7. 데이터 모델 (Supabase)

```
users
  id            uuid pk
  name          text
  birthdate     date
  phone         text
  email         text null            -- 선택
  created_at    timestamptz
  -- unique: (name, birthdate, phone)

groups
  id            uuid pk
  name          text
  type          text                 -- 'couple' | 'team' | 'friends' 등 (자유)
  owner_id      uuid fk -> users.id
  invite_token  text unique          -- 초대 링크용 토큰
  created_at    timestamptz

group_members
  id            uuid pk
  group_id      uuid fk -> groups.id
  user_id       uuid fk -> users.id
  joined_at     timestamptz
  -- unique: (group_id, user_id)

sessions                             -- '오늘 식사' 한 판
  id            uuid pk
  group_id      uuid fk -> groups.id
  center_lat    double precision      -- 위치 기준점
  center_lng    double precision
  radius_m      int default 3000      -- 3km
  status        text                  -- 'collecting' | 'voting' | 'closed'
  candidates    jsonb                 -- 후보 3곳 [{name, category, rating, url, lat, lng}]
  created_at    timestamptz

preferences                          -- 참여자별 취향 입력
  id            uuid pk
  session_id    uuid fk -> sessions.id
  user_id       uuid fk -> users.id
  raw_text      text                  -- 원문 "매운거 말고 일식"
  parsed        jsonb                 -- Gemini 구조화 {like:[], avoid:[], budget, mood}
  passed        bool default false
  created_at    timestamptz

votes
  id            uuid pk
  session_id    uuid fk -> sessions.id
  user_id       uuid fk -> users.id
  restaurant    text                  -- 후보 식당명
  created_at    timestamptz
  -- unique: (session_id, user_id)     // 1인 1표
```

---

## 8. KPI & GA 이벤트 (과제 핵심 — 반드시 심을 것)

측정 없는 MVP는 감점. 시연 경로의 각 액션마다 이벤트 발생.

```
signup_complete     회원가입 완료
group_create        그룹 생성
invite_click        초대 링크로 진입
prompt_submit       취향 프롬프트 제출     (param: passed 여부)
candidate_view      후보 3곳이 뜰 때
vote_click          투표할 때
result_confirm      최종 메뉴 확정될 때
```

- 핵심 지표 **투표 완료율 = vote_click / candidate_view**
- **프롬프트 참여율 = prompt_submit(passed=false) / 그룹원 수**  ← 이 서비스만의 핵심 지표
- 결정 도달 시간 = session.created_at → 마지막 vote.created_at (Supabase 계산)
- `lib/analytics.ts` 의 `trackEvent(name, params)` 헬퍼로 재사용.

---

## 9. 보안 규칙 (엄수)

- API 키 하드코딩 금지. 전부 환경변수.
- **서버 사이드에서만** 쓸 키(브라우저 노출 금지): Gemini 키, 카카오 REST API 키.
  → 반드시 `app/api/*/route.ts` 안에서만 사용.
- `NEXT_PUBLIC_` 접두사는 노출돼도 되는 값에만 (카카오맵 JavaScript 키, Supabase anon key, GA ID).
- 전화번호 등 개인정보는 최소 수집·표시. 화면엔 이름만 노출, 전화번호는 인증 용도로만.
- `.env.local` 은 `.gitignore` 에 포함. 배포 값은 Vercel 환경변수로.

환경변수:
```
NEXT_PUBLIC_KAKAO_JS_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GA_ID
KAKAO_REST_API_KEY            # 서버 전용
GEMINI_API_KEY                # 서버 전용
```

---

## 10. AI(Gemini) 사용 규칙

- 용도 1 — **프롬프트 해석**: 참여자 문장 → `{ like:[카테고리], avoid:[요소], budget, mood }` JSON.
  - 반드시 "JSON만 출력, 설명·마크다운 금지" 시스템 지시. 응답 파싱 실패 대비 try-catch.
- 용도 2 — **후보 선정 보조**: 카카오 로컬 API로 받은 식당 목록 + 전원 취향을 종합해 3곳 랭킹.
  - 회피 요소(매운거 등) 걸린 곳은 제외. 겹치는 선호를 우선.
- 무료 티어 rate limit 있음 → 호출 최소화(세션당 해석 배치 1회 + 후보 선정 1회).

---

## 11. 코딩 작업 원칙

- 시연 경로(4번)를 먼저 완성 → 그다음 계정/그룹 관리 보강. 순서 지킬 것.
- 후보는 **상위 3곳을 우선 노출**(AI 추천 배지), 나머지는 "더보기"로 접어둘 것. 처음부터 다 펼쳐서 선택지 과다로 결정 피로를 주지 말 것.
- 모든 UI는 `DESIGN.md` 준수. 임의 색·폰트·그림자 금지.
- 동작하는 최소 코드 우선. 과한 추상화 지양.
- 커밋 전 `.env.local` 이 스테이징에 없는지 확인.
