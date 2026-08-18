"use client";

import { useCallback, useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getSession,
  getGroupMembers,
  getPreferences,
  submitPreference,
  setSessionCandidates,
} from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import type { SessionRow, UserRow, PreferenceRow } from "@/lib/types";
import KakaoMap from "@/components/KakaoMap";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();

  const [user, setUser] = useState<UserRow | null | undefined>(undefined);
  const [session, setSession] = useState<SessionRow | null | undefined>(undefined);
  const [memberCount, setMemberCount] = useState(0);
  const [preferences, setPreferences] = useState<PreferenceRow[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState<"idle" | "submit" | "pass">("idle");
  const [findingCandidates, setFindingCandidates] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getSession(id);
    setSession(s);
    if (!s) return;
    const [members, prefs] = await Promise.all([
      getGroupMembers(s.group_id),
      getPreferences(id),
    ]);
    setMemberCount(members.length);
    setPreferences(prefs);
  }, [id]);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.replace(`/signup?next=/session/${id}`);
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
    if (!session) return;
    if (session.status === "voting") router.replace(`/session/${id}/vote`);
    if (session.status === "closed") router.replace(`/session/${id}/result`);
  }, [session, id, router]);

  const myPreference = user ? preferences.find((p) => p.user_id === user.id) : undefined;

  async function handleSubmit(passed: boolean) {
    if (!user) return;
    setSubmitting(passed ? "pass" : "submit");
    try {
      let parsed = null;
      if (!passed && text.trim()) {
        const res = await fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: text.trim() }),
        });
        const json = await res.json();
        parsed = json.parsed;
      }
      await submitPreference({
        sessionId: id,
        userId: user.id,
        rawText: passed ? "" : text.trim(),
        passed,
        parsed,
      });
      trackEvent("prompt_submit", { passed });
      await refresh();
    } finally {
      setSubmitting("idle");
    }
  }

  async function handleFindCandidates() {
    if (!session) return;
    setFindingCandidates(true);
    try {
      const latestPrefs = await getPreferences(id);
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerLat: session.center_lat,
          centerLng: session.center_lng,
          radiusM: session.radius_m,
          preferences: latestPrefs.filter((p) => !p.passed).map((p) => p.parsed).filter(Boolean),
        }),
      });
      const json = await res.json();
      await setSessionCandidates(id, json.candidates);
      trackEvent("candidate_view", { session_id: id });
      router.push(`/session/${id}/vote`);
    } finally {
      setFindingCandidates(false);
    }
  }

  if (user === undefined || session === undefined) return null;
  if (session === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <p className="text-text-muted">세션을 찾을 수 없어요.</p>
      </main>
    );
  }

  const doneCount = preferences.length;
  const allDone = memberCount > 0 && doneCount >= memberCount;

  if (findingCandidates) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <span aria-hidden className="text-4xl">
          🍜
        </span>
        <p className="mt-4 text-[15px] text-text-muted">취향 모아서 세 곳으로 좁히는 중…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">오늘 뭐 땡겨요?</h1>

      <div className="card mt-4 flex flex-col gap-2 p-4">
        <span className="text-[13px] font-medium text-text-muted">
          이 위치 기준 {(session.radius_m / 1000).toFixed(0)}km 이내
        </span>
        <KakaoMap
          lat={session.center_lat}
          lng={session.center_lng}
          radiusM={session.radius_m}
          className="h-40 w-full"
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="progress-track flex-1">
          <div
            className="progress-fill"
            style={{ width: `${memberCount ? (doneCount / memberCount) * 100 : 0}%` }}
          />
        </div>
        <span className="tabular-nums text-xs text-text-muted">
          {doneCount}/{memberCount}
        </span>
      </div>

      {myPreference ? (
        <p className="mt-6 rounded-xl bg-surface-alt px-4 py-3 text-sm text-text-muted">
          {myPreference.passed ? "패스했어요." : `제출했어요: "${myPreference.raw_text}"`} 친구들이
          고르는 중이에요 ({doneCount}/{memberCount})
        </p>
      ) : (
        <>
          <textarea
            className="input-field mt-6 min-h-[120px]"
            placeholder="오늘 뭐 땡겨요? 예: 매운 건 말고 일식"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              className="btn btn-primary flex-1"
              onClick={() => handleSubmit(false)}
              disabled={!text.trim() || submitting !== "idle"}
            >
              {submitting === "submit" ? "제출 중..." : "입력 완료"}
            </button>
            <button
              className="btn btn-secondary flex-1"
              onClick={() => handleSubmit(true)}
              disabled={submitting !== "idle"}
            >
              {submitting === "pass" ? "처리 중..." : "패스"}
            </button>
          </div>
        </>
      )}

      {allDone ? (
        <button className="btn btn-primary mt-8" onClick={handleFindCandidates}>
          후보 3곳 보기
        </button>
      ) : null}
    </main>
  );
}
