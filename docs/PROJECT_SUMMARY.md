# YUMPICK 프로젝트 정리

> 성균관대 「신인류 AI 사피엔스 경험디자인」 기말 프로젝트
> 배포: https://yumpick.vercel.app · 저장소: https://github.com/kh1211-jeong/YUMPICK

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
