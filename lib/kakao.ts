import type { Candidate } from "./types";
import { haversineDistanceM } from "./distance";

const REST_API_KEY = process.env.KAKAO_REST_API_KEY;

// Kakao Local API doesn't return star ratings, so this stands in for one.
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
      url: `https://map.kakao.com/link/search/${encodeURIComponent(t.name)}`,
      address: "목업 주소 (카카오 키 연동 전)",
      lat: rLat,
      lng: rLng,
    };
  }).filter((r) => haversineDistanceM(lat, lng, r.lat, r.lng) <= radiusM);
}

type KakaoDocument = {
  place_name: string;
  category_name: string;
  category_group_name: string;
  address_name: string;
  place_url: string;
  x: string; // longitude
  y: string; // latitude
};

export type PlaceResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const MOCK_PLACES: PlaceResult[] = [
  { name: "서울시청", address: "서울 중구 세종대로 110", lat: 37.5665, lng: 126.978 },
  { name: "강남역", address: "서울 강남구 강남대로 396", lat: 37.4979, lng: 127.0276 },
  { name: "성균관대학교", address: "서울 종로구 성균관로 25-2", lat: 37.5886, lng: 126.9936 },
];

// General place/address search (not restricted to restaurants) -- used to let
// people pick a session's 3km center point by searching instead of only
// relying on browser geolocation.
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (!REST_API_KEY) {
    return MOCK_PLACES.filter((p) => p.name.includes(query));
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`,
      { headers: { Authorization: `KakaoAK ${REST_API_KEY}` } }
    );
    if (!res.ok) throw new Error(`Kakao place search failed: ${res.status}`);
    const json = await res.json();
    const documents: KakaoDocument[] = json.documents ?? [];
    return documents.map((doc) => ({
      name: doc.place_name,
      address: doc.address_name,
      lat: Number(doc.y),
      lng: Number(doc.x),
    }));
  } catch (err) {
    console.error("Kakao place search error, falling back to mock places:", err);
    return MOCK_PLACES.filter((p) => p.name.includes(query));
  }
}

export async function searchRestaurants(
  lat: number,
  lng: number,
  radiusM: number
): Promise<Candidate[]> {
  if (!REST_API_KEY) {
    return mockRestaurants(lat, lng, radiusM);
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=${lng}&y=${lat}&radius=${Math.min(radiusM, 20000)}&size=15&sort=distance`,
      { headers: { Authorization: `KakaoAK ${REST_API_KEY}` } }
    );
    if (!res.ok) throw new Error(`Kakao local search failed: ${res.status}`);
    const json = await res.json();
    const documents: KakaoDocument[] = json.documents ?? [];

    return documents.map((doc) => {
      const category = doc.category_name.split(">").pop()?.trim() || doc.category_group_name || "음식점";
      return {
        name: doc.place_name,
        category,
        rating: pseudoRating(doc.place_name),
        url: doc.place_url,
        address: doc.address_name,
        lat: Number(doc.y),
        lng: Number(doc.x),
      };
    });
  } catch (err) {
    console.error("Kakao local search error, falling back to mock restaurants:", err);
    return mockRestaurants(lat, lng, radiusM);
  }
}
