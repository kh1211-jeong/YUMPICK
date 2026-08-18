"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout, getUserMealHistory } from "@/lib/db";
import type { UserRow } from "@/lib/types";
import type { MealHistoryEntry } from "@/lib/db";
import BottomNav from "@/components/BottomNav";

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserRow | null | undefined>(undefined);
  const [history, setHistory] = useState<MealHistoryEntry[]>([]);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.replace("/signup?next=/me");
        return;
      }
      setUser(u);
      getUserMealHistory(u.id).then(setHistory);
    });
  }, [router]);

  if (!user) return null;

  const frequent = Object.entries(
    history.reduce<Record<string, number>>((acc, h) => {
      acc[h.restaurant] = (acc[h.restaurant] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <main className="flex flex-1 flex-col px-5 py-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">내 정보</h1>

      <div className="card mt-6 flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-text-muted">닉네임</span>
          <span className="text-[15px] font-semibold text-text">{user.nickname ?? "-"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-text-muted">이름</span>
          <span className="text-[15px] font-semibold text-text">{user.name}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-text-muted">생년월일</span>
          <span className="text-[15px] font-semibold text-text">{user.birthdate}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-text-muted">전화번호</span>
          <span className="text-[15px] font-semibold text-text tabular-nums">
            {maskPhone(user.phone)}
          </span>
        </div>
        {user.email ? (
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-text-muted">이메일</span>
            <span className="text-[15px] font-semibold text-text">{user.email}</span>
          </div>
        ) : null}
      </div>

      {frequent.length > 0 ? (
        <div className="card mt-4 flex flex-col gap-2 p-4">
          <span className="text-[13px] font-medium text-text-muted">⭐ 자주 가는 식당</span>
          <div className="flex flex-col gap-2">
            {frequent.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-[14px] text-text">{name}</span>
                <span className="tabular-nums text-xs text-text-muted">{count}번</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="card mt-4 flex flex-col gap-2 p-4">
          <span className="text-[13px] font-medium text-text-muted">🕒 최근 선택한 식당</span>
          <div className="flex flex-col gap-2">
            {history.slice(0, 5).map((h, i) => (
              <div key={`${h.restaurant}-${h.created_at}-${i}`} className="flex items-center justify-between">
                <span className="text-[14px] text-text">{h.restaurant}</span>
                <span className="tabular-nums text-xs text-text-muted">{formatDate(h.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted">
          아직 확정된 식사 기록이 없어요.
        </p>
      )}

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
