"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/db";
import type { UserRow } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserRow | null | undefined>(undefined);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.replace("/signup?next=/me");
        return;
      }
      setUser(u);
    });
  }, [router]);

  if (!user) return null;

  return (
    <main className="flex flex-1 flex-col px-5 py-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">내 정보</h1>

      <div className="card mt-6 flex flex-col gap-1 p-4">
        <span className="text-[13px] text-text-muted">이름</span>
        <span className="text-[15px] font-semibold text-text">{user.name}</span>
      </div>

      <div className="flex-1" />

      <button
        className="btn btn-secondary"
        onClick={() => {
          logout();
          router.replace("/");
        }}
      >
        로그아웃
      </button>

      <BottomNav />
    </main>
  );
}
