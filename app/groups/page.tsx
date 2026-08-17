"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserGroups, createGroup } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import type { GroupRow, UserRow } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

const TYPE_EMOJI: Record<string, string> = {
  couple: "💑",
  team: "👥",
  friends: "🍻",
};

function typeEmoji(type: string) {
  return TYPE_EMOJI[type] ?? "🍚";
}

function GroupsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewMode = searchParams.get("new") === "1";

  const [user, setUser] = useState<UserRow | null | undefined>(undefined);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [showForm, setShowForm] = useState(isNewMode);
  const [name, setName] = useState("");
  const [type, setType] = useState("friends");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.replace("/signup?next=/groups");
        return;
      }
      setUser(u);
      getUserGroups(u.id).then(setGroups);
    });
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const group = await createGroup({ name: name.trim(), type, ownerId: user.id });
      trackEvent("group_create", { group_id: group.id, type });
      router.push(`/groups/${group.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (user === undefined) return null;

  return (
    <main className="flex flex-1 flex-col px-5 py-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">내 그룹</h1>

      {isNewMode && !showForm ? (
        <p className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          오늘 점심을 시작할 그룹을 골라주세요.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {groups.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-text-muted">
            아직 그룹이 없어요. 첫 그룹을 만들어보세요.
          </p>
        ) : (
          groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="card flex items-center gap-3 px-4 py-4">
              <span aria-hidden className="text-2xl">
                {typeEmoji(g.type)}
              </span>
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold text-text">{g.name}</span>
                <span className="text-xs text-text-muted">{g.type}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleCreate} className="card mt-4 flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-muted">그룹 이름</span>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="점심메이트"
              autoFocus
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-muted">유형</span>
            <div className="flex gap-2">
              {[
                { value: "couple", label: "커플" },
                { value: "team", label: "팀플" },
                { value: "friends", label: "친구" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`pill ${type === opt.value ? "pill-active" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </label>
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || submitting}>
            {submitting ? "만드는 중..." : "그룹 만들기"}
          </button>
        </form>
      ) : (
        <button className="btn btn-primary mt-6" onClick={() => setShowForm(true)}>
          + 그룹 만들기
        </button>
      )}

      <div className="flex-1" />
      <BottomNav />
    </main>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={null}>
      <GroupsList />
    </Suspense>
  );
}
