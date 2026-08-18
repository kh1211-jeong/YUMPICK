"use client";

import { useEffect, useRef, useState } from "react";
import type { Candidate } from "@/lib/types";

export default function TieBreakRoulette({
  candidates,
  onDone,
}: {
  candidates: Candidate[];
  onDone: (winner: Candidate) => void;
}) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [landed, setLanded] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const totalSteps = candidates.length * 3 + winnerIndex + 1;
    let step = 0;
    let delay = 90;
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      setHighlightIndex(step % candidates.length);
      step++;
      if (step >= totalSteps) {
        setLanded(true);
        timer = setTimeout(() => onDoneRef.current(candidates[winnerIndex]), 900);
        return;
      }
      delay *= 1.12;
      timer = setTimeout(tick, delay);
    }
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
      <span aria-hidden className="text-4xl">
        🎰
      </span>
      <h1 className="mt-3 text-xl font-bold tracking-[-0.02em] text-text">동점이에요!</h1>
      <p className="mt-1 text-[15px] text-text-muted">공평하게 랜덤으로 골라드릴게요…</p>

      <div className="mt-6 flex w-full flex-col gap-3">
        {candidates.map((c, i) => (
          <div
            key={c.name}
            className={`card p-4 transition-all duration-150 ${
              i === highlightIndex
                ? `border-2 border-accent bg-accent-soft ${landed ? "scale-105" : ""}`
                : ""
            }`}
          >
            <span className="text-[16px] font-semibold text-text">{c.name}</span>
            <span className="ml-2 text-xs text-text-muted">{c.category}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
