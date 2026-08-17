"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getGroup,
  getGroupMembers,
  isGroupMember,
  createSession,
} from "@/lib/db";
import { getCurrentLocation } from "@/lib/geo";
import type { GroupRow, UserRow } from "@/lib/types";

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = usePromise(params);
  const router = useRouter();

  const [user, setUser] = useState<UserRow | null | undefined>(undefined);
  const [group, setGroup] = useState<GroupRow | null | undefined>(undefined);
  const [members, setMembers] = useState<UserRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.replace(`/signup?next=/groups/${groupId}`);
        return;
      }
      setUser(u);

      const g = await getGroup(groupId);
      if (!g) {
        setGroup(null);
        return;
      }
      const member = await isGroupMember(groupId, u.id);
      if (!member) {
        router.replace(`/invite/${g.invite_token}`);
        return;
      }
      setGroup(g);
      setMembers(await getGroupMembers(groupId));
    });
  }, [groupId, router]);

  async function handleCopyInvite() {
    if (!group) return;
    const url = `${window.location.origin}/invite/${group.invite_token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleStartSession() {
    if (!group) return;
    setStarting(true);
    try {
      const { lat, lng } = await getCurrentLocation();
      const session = await createSession(group.id, lat, lng);
      router.push(`/session/${session.id}`);
    } finally {
      setStarting(false);
    }
  }

  if (user === undefined || group === undefined) return null;
  if (group === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <p className="text-text-muted">그룹을 찾을 수 없어요.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">{group.name}</h1>
      <p className="mt-1 text-sm text-text-muted">{group.type} · {members.length}명</p>

      <div className="card mt-6 flex flex-col gap-2 p-4">
        <span className="text-[13px] font-medium text-text-muted">멤버</span>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <span key={m.id} className="pill">
              {m.name}
            </span>
          ))}
        </div>
      </div>

      <button onClick={handleCopyInvite} className="pill mt-4 w-fit">
        {copied ? "복사됐어요!" : "초대 링크 복사"}
      </button>

      <div className="flex-1" />

      <button className="btn btn-primary" onClick={handleStartSession} disabled={starting}>
        {starting ? "위치 확인 중..." : "오늘 점심 시작"}
      </button>
    </main>
  );
}
