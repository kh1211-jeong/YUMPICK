"use client";

import { useCallback, useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getSession, getGroupMembers, closeSessionWithWinner } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import type { SessionRow, UserRow, VoteRow, Candidate } from "@/lib/types";
import StarRating from "@/components/StarRating";
import TieBreakRoulette from "@/components/TieBreakRoulette";

export default function VotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();

  const [user, setUser] = useState<UserRow | null | undefined>(undefined);
  const [session, setSession] = useState<SessionRow | null | undefined>(undefined);
  const [memberCount, setMemberCount] = useState(0);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [voting, setVoting] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [tieBreakCandidates, setTieBreakCandidates] = useState<Candidate[] | null>(null);
  const [showMore, setShowMore] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getSession(id);
    setSession(s);
    if (!s) return;
    const members = await getGroupMembers(s.group_id);
    setMemberCount(members.length);
    const res = await fetch(`/api/vote?sessionId=${id}`);
    const json = await res.json();
    setVotes(json.votes ?? []);
  }, [id]);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.replace(`/signup?next=/session/${id}/vote`);
        return;
      }
      setUser(u);
    });
  }, [id, router]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (session?.status === "closed") router.replace(`/session/${id}/result`);
  }, [session, id, router]);

  const myVote = user ? votes.find((v) => v.user_id === user.id) : undefined;

  async function handleVote(restaurant: string) {
    if (!user) return;
    setVoting(restaurant);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, userId: user.id, restaurant }),
      });
      const json = await res.json();
      setVotes(json.votes ?? []);
      trackEvent("vote_click", { session_id: id, restaurant });
    } finally {
      setVoting(null);
    }
  }

  async function handleConfirmResult() {
    if (!session?.candidates) return;
    setClosing(true);
    try {
      const tally = new Map<string, number>();
      for (const v of votes) tally.set(v.restaurant, (tally.get(v.restaurant) ?? 0) + 1);
      const maxVotes = Math.max(...session.candidates.map((c) => tally.get(c.name) ?? 0));
      const tied = session.candidates.filter((c) => (tally.get(c.name) ?? 0) === maxVotes);

      if (tied.length > 1) {
        setTieBreakCandidates(tied);
        return;
      }
      await closeSessionWithWinner(id, tied[0].name);
      router.push(`/session/${id}/result`);
    } finally {
      setClosing(false);
    }
  }

  async function handleRouletteDone(winner: Candidate) {
    await closeSessionWithWinner(id, winner.name);
    router.push(`/session/${id}/result`);
  }

  if (user === undefined || session === undefined) return null;
  if (session === null || !session.candidates) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <p className="text-text-muted">후보를 찾을 수 없어요.</p>
      </main>
    );
  }

  if (tieBreakCandidates) {
    return <TieBreakRoulette candidates={tieBreakCandidates} onDone={handleRouletteDone} />;
  }

  const allVoted = memberCount > 0 && votes.length >= memberCount;
  const primaryCandidates = session.candidates.slice(0, 3);
  const moreCandidates = session.candidates.slice(3);

  function renderCard(c: Candidate, primary: boolean) {
    const voteCount = votes.filter((v) => v.restaurant === c.name).length;
    const selected = myVote?.restaurant === c.name;
    return (
      <div
        key={c.name}
        className={`card flex flex-col gap-2 p-4 ${selected ? "border-accent bg-accent-soft" : ""}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {primary ? (
                <span className="rounded-full bg-yum-soft px-2 py-0.5 text-[11px] font-semibold text-yum">
                  AI 추천
                </span>
              ) : null}
              <span className="text-[18px] font-semibold text-text">{c.name}</span>
            </div>
            <span className="text-xs text-text-muted">{c.category}</span>
            <StarRating rating={c.rating} />
          </div>
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent underline underline-offset-2"
          >
            상세보기
          </a>
        </div>
        <button
          onClick={() => handleVote(c.name)}
          disabled={voting !== null}
          className={`pill w-fit ${selected ? "pill-active" : ""}`}
        >
          {selected ? `투표함 (${voteCount}표)` : `투표하기 (${voteCount}표)`}
        </button>
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">
        3곳으로 좁혔어요. 한 곳만 골라주세요
      </h1>

      <div className="mt-6 flex flex-col gap-3">
        {primaryCandidates.map((c) => renderCard(c, true))}
      </div>

      {moreCandidates.length > 0 ? (
        <>
          {!showMore ? (
            <button
              className="pill mt-4 w-fit self-center"
              onClick={() => setShowMore(true)}
            >
              더보기 (+{moreCandidates.length})
            </button>
          ) : (
            <div className="mt-4 flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
              {moreCandidates.map((c) => renderCard(c, false))}
            </div>
          )}
        </>
      ) : null}

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-muted">
        <span className="tabular-nums">
          {votes.length}/{memberCount}명 투표 완료
        </span>
      </div>

      {allVoted ? (
        <button className="btn btn-primary mt-6" onClick={handleConfirmResult} disabled={closing}>
          {closing ? "확정하는 중..." : "결과 확인하기"}
        </button>
      ) : null}
    </main>
  );
}
