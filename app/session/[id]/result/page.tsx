"use client";

import { useEffect, useRef, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import type { SessionRow, Candidate, VoteRow } from "@/lib/types";
import StarRating from "@/components/StarRating";
import KakaoMap from "@/components/KakaoMap";

function pickWinner(candidates: Candidate[], votes: VoteRow[]): Candidate {
  const tally = new Map<string, number>();
  for (const v of votes) tally.set(v.restaurant, (tally.get(v.restaurant) ?? 0) + 1);

  let winner = candidates[0];
  let winnerVotes = -1;
  for (const c of candidates) {
    const count = tally.get(c.name) ?? 0;
    if (count > winnerVotes) {
      winner = c;
      winnerVotes = count;
    }
  }
  return winner;
}

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const tracked = useRef(false);

  const [session, setSession] = useState<SessionRow | null | undefined>(undefined);
  const [votes, setVotes] = useState<VoteRow[]>([]);

  useEffect(() => {
    getSession(id).then(async (s) => {
      setSession(s);
      if (!s) return;
      if (s.status !== "closed") {
        router.replace(s.status === "voting" ? `/session/${id}/vote` : `/session/${id}`);
        return;
      }
      const res = await fetch(`/api/vote?sessionId=${id}`);
      const json = await res.json();
      setVotes(json.votes ?? []);
      if (!tracked.current) {
        trackEvent("result_confirm", { session_id: id });
        tracked.current = true;
      }
    });
  }, [id, router]);

  if (session === undefined) return null;
  if (session === null || !session.candidates) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <p className="text-text-muted">결과를 찾을 수 없어요.</p>
      </main>
    );
  }

  const winner = pickWinner(session.candidates, votes);

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-10 text-center">
      <p className="text-[15px] text-text-muted">결정! 오늘은 여기예요 🎉</p>

      <div className="card mt-4 flex w-full flex-col items-center gap-2 border-2 border-yum p-6">
        <span className="text-[24px] font-bold tracking-[-0.02em] text-text">{winner.name}</span>
        <span className="text-sm text-text-muted">{winner.category}</span>
        <StarRating rating={winner.rating} />
        <a
          href={winner.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-sm text-accent underline underline-offset-2"
        >
          상세 페이지 보기
        </a>
      </div>

      <div className="card mt-4 flex w-full flex-col items-start gap-2 p-4">
        <span className="text-[13px] font-medium text-text-muted">위치</span>
        <span className="text-sm text-text">{winner.address}</span>
        <KakaoMap lat={winner.lat} lng={winner.lng} className="mt-1 h-40 w-full" />
        <a
          href={winner.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-xs text-accent underline underline-offset-2"
        >
          카카오맵에서 열기
        </a>
      </div>

      <button className="btn btn-primary mt-8 w-full" onClick={() => router.push("/groups")}>
        내 그룹으로 돌아가기
      </button>
    </main>
  );
}
