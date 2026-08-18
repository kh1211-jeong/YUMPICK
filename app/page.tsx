"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/db";
import type { UserRow } from "@/lib/types";

const STEPS = [
  { emoji: "🔗", label: "그룹 링크 열기" },
  { emoji: "💬", label: "취향 한 줄 입력" },
  { emoji: "🎉", label: "투표로 확정" },
];

export default function Home() {
  const [user, setUser] = useState<UserRow | null | undefined>(undefined);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return (
    <main className="relative flex flex-1 flex-col justify-between overflow-hidden px-5 py-10">
      <div aria-hidden className="hero-blob h-56 w-56 bg-accent-soft" style={{ top: -40, left: -60 }} />
      <div aria-hidden className="hero-blob h-64 w-64 bg-yum-soft" style={{ top: 40, right: -80 }} />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="fade-up flex h-20 w-20 items-center justify-center rounded-full bg-surface shadow-[0_8px_24px_rgba(232,112,58,0.18)]">
          <span aria-hidden className="text-4xl">
            🍽️
          </span>
        </div>

        <h1 className="fade-up-delay-1 text-2xl font-bold tracking-[-0.02em] text-text">
          오늘 점심, <span className="text-accent">냠</span> 하고 정해요
        </h1>
        <p className="fade-up-delay-1 max-w-xs text-[15px] leading-relaxed text-text-muted">
          각자 취향 한 줄이면 충분해요. AI가 근처 후보로 좁히고,
          투표로 딱 정해드릴게요.
        </p>

        <div className="fade-up-delay-2 mt-2 flex items-center gap-3">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-lg">
                  {s.emoji}
                </div>
                <span className="text-[11px] font-medium text-text-muted">{s.label}</span>
              </div>
              {i < STEPS.length - 1 ? (
                <span aria-hidden className="mb-4 text-border">
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="fade-up-delay-3 relative flex flex-col gap-3">
        {user === undefined ? null : user ? (
          <Link href="/groups" className="btn btn-primary w-full text-center">
            {user.name}님, 내 그룹으로 이동
          </Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-primary w-full text-center">
              닉네임으로 로그인
            </Link>
            <Link href="/signup" className="btn btn-secondary w-full text-center">
              처음이에요, 회원가입
            </Link>
            <p className="text-center text-xs text-text-muted">
              점심 정할 때만 써요. 전화번호는 공개되지 않아요.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
