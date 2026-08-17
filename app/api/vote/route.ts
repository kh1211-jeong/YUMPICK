import { NextRequest, NextResponse } from "next/server";
import { castVote, getVotes } from "@/lib/voteStore";

export async function POST(request: NextRequest) {
  const { sessionId, userId, restaurant } = await request.json();
  if (!sessionId || !userId || !restaurant) {
    return NextResponse.json({ error: "sessionId, userId, restaurant are required" }, { status: 400 });
  }
  const vote = await castVote(sessionId, userId, restaurant);
  const votes = await getVotes(sessionId);
  return NextResponse.json({ vote, votes });
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  const votes = await getVotes(sessionId);
  return NextResponse.json({ votes });
}
