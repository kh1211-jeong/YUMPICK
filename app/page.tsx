"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/db";
import type { UserRow } from "@/lib/types";

export default function Home() {
  const [user, setUser] = useState<UserRow | null | undefined>(undefined);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return (
    <main className="flex flex-1 flex-col justify-between px-5 py-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <span aria-hidden className="text-5xl">
          🍽️
        </span>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">
          오늘 점심, <span className="text-accent">냠</span> 하고 정해요
        </h1>
        <p className="max-w-xs text-[15px] leading-relaxed text-text-muted">
          각자 취향 한 줄이면 충분해요. AI가 근처 후보 3곳으로 좁히고,
          투표로 딱 정해드릴게요.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {user === undefined ? null : user ? (
          <Link href="/groups" className="btn btn-primary w-full text-center">
            {user.name}님, 내 그룹으로 이동
          </Link>
        ) : (
          <>
            <Link href="/signup" className="btn btn-primary w-full text-center">
              시작하기
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
