import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/kakao";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  const places = await searchPlaces(query);
  return NextResponse.json({ places });
}
