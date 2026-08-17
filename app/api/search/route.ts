import { NextRequest, NextResponse } from "next/server";
import { searchRestaurants } from "@/lib/naver";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const radius = Number(request.nextUrl.searchParams.get("radius") ?? 3000);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const restaurants = await searchRestaurants(lat, lng, radius);
  return NextResponse.json({ restaurants });
}
