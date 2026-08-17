import { NextRequest, NextResponse } from "next/server";
import { searchRestaurants } from "@/lib/naver";
import { rankCandidates } from "@/lib/gemini";
import type { ParsedPreference } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { centerLat, centerLng, radiusM, preferences } = (await request.json()) as {
    centerLat: number;
    centerLng: number;
    radiusM?: number;
    preferences: ParsedPreference[];
  };

  if (typeof centerLat !== "number" || typeof centerLng !== "number") {
    return NextResponse.json({ error: "centerLat and centerLng are required" }, { status: 400 });
  }

  const restaurants = await searchRestaurants(centerLat, centerLng, radiusM ?? 3000);
  const candidates = await rankCandidates(preferences ?? [], restaurants);

  return NextResponse.json({ candidates });
}
