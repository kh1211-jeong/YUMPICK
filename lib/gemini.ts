import type { ParsedPreference, Candidate } from "./types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
// gemini-flash-latest currently returns frequent 503 "high demand" errors on
// the free tier; the lite alias has more headroom and is plenty for this task.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

const AVOID_MARKERS = ["말고", "빼고", "안 ", "싫", "제외"];
const CATEGORY_KEYWORDS = [
  "한식", "일식", "중식", "양식", "분식", "카페", "디저트",
  "고기", "회", "초밥", "라멘", "우동", "국수", "면", "찌개",
  "샐러드", "샌드위치", "버거", "치킨", "피자", "타코", "베트남", "태국",
];
const MOOD_KEYWORDS: Record<string, string> = {
  "가볍게": "가벼운", "든든하게": "든든한", "매콤": "매콤한",
  "얼큰": "얼큰한", "시원하게": "시원한", "따뜻하게": "따뜻한",
};
const BUDGET_KEYWORDS: Record<string, string> = {
  "저렴": "저가", "가성비": "저가", "비싼": "고가", "든든한": "보통",
};

function ruleBasedInterpret(rawText: string): ParsedPreference {
  const like: string[] = [];
  const avoidedKeywords = new Set<string>();
  let budget: string | null = null;
  let mood: string | null = null;

  const allKeywords = [...CATEGORY_KEYWORDS, "매운", "매워"];

  // avoid markers only attach to the nearest keyword immediately BEFORE them
  // (e.g. "매운 건 말고 일식" -> "말고" attaches to "매운", not "일식")
  for (const marker of AVOID_MARKERS) {
    let searchFrom = 0;
    let markerIdx: number;
    while ((markerIdx = rawText.indexOf(marker, searchFrom)) !== -1) {
      const before = rawText.slice(Math.max(0, markerIdx - 6), markerIdx);
      for (const kw of allKeywords) {
        if (before.includes(kw)) avoidedKeywords.add(kw);
      }
      searchFrom = markerIdx + marker.length;
    }
  }

  for (const kw of CATEGORY_KEYWORDS) {
    if (!rawText.includes(kw)) continue;
    if (avoidedKeywords.has(kw)) continue;
    like.push(kw);
  }

  for (const [kw, label] of Object.entries(MOOD_KEYWORDS)) {
    if (rawText.includes(kw)) mood = label;
  }
  for (const [kw, label] of Object.entries(BUDGET_KEYWORDS)) {
    if (rawText.includes(kw)) budget = label;
  }
  if (rawText.includes("매운") || rawText.includes("매워")) {
    if (avoidedKeywords.has("매운") || avoidedKeywords.has("매워")) {
      avoidedKeywords.add("매운맛");
    } else {
      like.push("매운맛");
    }
  }

  const avoid = [...avoidedKeywords].map((kw) => (kw === "매운" || kw === "매워" ? "매운맛" : kw));

  return { like, avoid, budget, mood };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(systemText: string, userText: string): Promise<string> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ parts: [{ text: userText }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(500);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body }
      );
      if (!res.ok) {
        // 503 = model temporarily overloaded on Google's side, worth one retry
        if (res.status === 503 && attempt === 0) {
          lastError = new Error(`Gemini call failed: ${res.status}`);
          continue;
        }
        throw new Error(`Gemini call failed: ${res.status}`);
      }
      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function interpretPreference(rawText: string): Promise<ParsedPreference> {
  if (!GEMINI_API_KEY || !rawText.trim()) {
    return ruleBasedInterpret(rawText);
  }

  try {
    const text = await callGemini(
      "너는 점심 메뉴 취향 문장을 구조화하는 파서다. 반드시 JSON만 출력하고 설명이나 마크다운을 절대 포함하지 마라. 스키마: { \"like\": string[], \"avoid\": string[], \"budget\": string|null, \"mood\": string|null }",
      rawText
    );
    const parsed = JSON.parse(text) as ParsedPreference;
    return {
      like: parsed.like ?? [],
      avoid: parsed.avoid ?? [],
      budget: parsed.budget ?? null,
      mood: parsed.mood ?? null,
    };
  } catch (err) {
    console.error("Gemini interpret error, falling back to rule-based parser:", err);
    return ruleBasedInterpret(rawText);
  }
}

function ruleBasedRank(
  preferences: ParsedPreference[],
  restaurants: Candidate[],
  count: number
): Candidate[] {
  const likeSet = new Set(preferences.flatMap((p) => p.like));
  const avoidSet = new Set(preferences.flatMap((p) => p.avoid));

  const scored = restaurants.map((r) => {
    let score = r.rating;
    if ([...avoidSet].some((a) => r.category.includes(a) || r.name.includes(a))) score -= 100;
    if ([...likeSet].some((l) => r.category.includes(l) || r.name.includes(l))) score += 10;
    return { r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.r);
}

// Returns up to `count` restaurants, best match first -- the caller shows the
// first 3 as the primary pick and the rest behind a "더보기" reveal.
export async function rankCandidates(
  preferences: ParsedPreference[],
  restaurants: Candidate[],
  count = 10
): Promise<Candidate[]> {
  if (restaurants.length <= count) return restaurants.slice(0, count);
  if (!GEMINI_API_KEY) return ruleBasedRank(preferences, restaurants, count);

  try {
    const text = await callGemini(
      `너는 그룹 점심 메뉴 추천 엔진이다. 참가자 전원의 취향(like/avoid/mood/budget)과 후보 식당 목록을 보고, avoid에 걸리는 곳은 제외하고 겹치는 선호를 우선해 최대 ${count}곳의 식당 이름을 가장 적합한 순서로 정렬해라. 반드시 JSON 배열(["식당명1","식당명2",...])만 출력하고 다른 텍스트는 포함하지 마라.`,
      JSON.stringify({
        preferences,
        restaurants: restaurants.map((r) => ({ name: r.name, category: r.category, rating: r.rating })),
      })
    );
    const names = JSON.parse(text) as string[];
    const picked = names
      .map((n) => restaurants.find((r) => r.name === n))
      .filter((r): r is Candidate => Boolean(r));
    if (picked.length < count) {
      const rest = restaurants.filter((r) => !picked.includes(r));
      picked.push(...ruleBasedRank(preferences, rest, count - picked.length));
    }
    return picked.slice(0, count);
  } catch (err) {
    console.error("Gemini rank error, falling back to rule-based ranking:", err);
    return ruleBasedRank(preferences, restaurants, count);
  }
}
