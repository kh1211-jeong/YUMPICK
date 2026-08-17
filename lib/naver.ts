import type { Candidate } from "./types";
import { haversineDistanceM } from "./distance";

const CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function pseudoRating(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return Math.round((3.6 + (hash % 130) / 100) * 10) / 10;
}

const MOCK_TEMPLATES: { name: string; category: string; dLat: number; dLng: number }[] = [
  { name: "정성한상 한식당", category: "한식", dLat: 0.004, dLng: 0.003 },
  { name: "이치방 라멘", category: "일식", dLat: -0.006, dLng: 0.002 },
  { name: "홍유방 마라탕", category: "중식", dLat: 0.002, dLng: -0.005 },
  { name: "브릭오븐 파스타", category: "양식", dLat: -0.003, dLng: -0.004 },
  { name: "김밥천사 분식", category: "분식", dLat: 0.001, dLng: 0.006 },
  { name: "온기 두부찌개", category: "한식", dLat: -0.002, dLng: 0.005 },
  { name: "스시노노 초밥", category: "일식", dLat: 0.005, dLng: -0.002 },
  { name: "그린볼 샐러드", category: "샐러드", dLat: -0.005, dLng: 0.001 },
  { name: "숯불애 고깃집", category: "고기", dLat: 0.003, dLng: -0.006 },
  { name: "카페 온도", category: "카페", dLat: -0.001, dLng: -0.001 },
];

function mockRestaurants(lat: number, lng: number, radiusM: number): Candidate[] {
  return MOCK_TEMPLATES.map((t) => {
    const rLat = lat + t.dLat;
    const rLng = lng + t.dLng;
    return {
      name: t.name,
      category: t.category,
      rating: pseudoRating(t.name),
      url: `https://map.naver.com/v5/search/${encodeURIComponent(t.name)}`,
      address: "목업 주소 (네이버 키 연동 전)",
      lat: rLat,
      lng: rLng,
    };
  }).filter((r) => haversineDistanceM(lat, lng, r.lat, r.lng) <= radiusM);
}

export async function searchRestaurants(
  lat: number,
  lng: number,
  radiusM: number,
  query = "맛집"
): Promise<Candidate[]> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return mockRestaurants(lat, lng, radiusM);
  }

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=20&sort=comment`,
      {
        headers: {
          "X-Naver-Client-Id": CLIENT_ID,
          "X-Naver-Client-Secret": CLIENT_SECRET,
        },
      }
    );
    if (!res.ok) throw new Error(`Naver search failed: ${res.status}`);
    const json = await res.json();
    const items: Array<{
      title: string;
      category: string;
      address: string;
      link: string;
      mapx: string;
      mapy: string;
    }> = json.items ?? [];

    return items
      .map((item) => {
        const name = stripTags(item.title);
        return {
          name,
          category: item.category || "기타",
          rating: pseudoRating(name),
          url: item.link || `https://map.naver.com/v5/search/${encodeURIComponent(name)}`,
          address: item.address,
          lat: Number(item.mapy) / 10000000,
          lng: Number(item.mapx) / 10000000,
        };
      })
      .filter((r) => haversineDistanceM(lat, lng, r.lat, r.lng) <= radiusM);
  } catch (err) {
    console.error("Naver search error, falling back to mock restaurants:", err);
    return mockRestaurants(lat, lng, radiusM);
  }
}
