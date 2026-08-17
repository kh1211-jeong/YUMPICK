"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getGroupByInviteToken, isGroupMember, joinGroup, getGroupMembers } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import type { GroupRow, UserRow } from "@/lib/types";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = usePromise(params);
  const router = useRouter();

  const [user, setUser] = useState<UserRow | null | undefined>(undefined);
  const [group, setGroup] = useState<GroupRow | null | undefined>(undefined);
  const [memberCount, setMemberCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    getGroupByInviteToken(token).then(async (g) => {
      setGroup(g);
      if (g) {
        setMemberCount((await getGroupMembers(g.id)).length);
        if (!tracked) {
          trackEvent("invite_click", { group_id: g.id });
          setTracked(true);
        }
      }
    });
    getCurrentUser().then(setUser);
  }, [token, tracked]);

  async function handleJoin() {
    if (!group) return;
    if (!user) {
      router.push(`/signup?next=/invite/${token}`);
      return;
    }
    setJoining(true);
    try {
      const already = await isGroupMember(group.id, user.id);
      if (!already) await joinGroup(group.id, user.id);
      router.push(`/groups/${group.id}`);
    } finally {
      setJoining(false);
    }
  }

  if (group === undefined || user === undefined) return null;

  if (group === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <p className="text-text-muted">유효하지 않은 초대 링크예요.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
      <span aria-hidden className="text-5xl">
        🍽️
      </span>
      <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-text">{group.name}</h1>
      <p className="mt-2 text-[15px] text-text-muted">{memberCount}명이 함께하고 있어요</p>

      <button className="btn btn-primary mt-8 w-full" onClick={handleJoin} disabled={joining}>
        {joining ? "합류하는 중..." : "그룹에 합류하기"}
      </button>
    </main>
  );
}
