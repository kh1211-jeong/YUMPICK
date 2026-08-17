import { NextRequest, NextResponse } from "next/server";
import { interpretPreference } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { rawText } = await request.json();
  if (typeof rawText !== "string") {
    return NextResponse.json({ error: "rawText is required" }, { status: 400 });
  }
  const parsed = await interpretPreference(rawText);
  return NextResponse.json({ parsed });
}
