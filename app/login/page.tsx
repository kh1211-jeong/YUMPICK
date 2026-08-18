"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { findUserByNickname, setCurrentUser } from "@/lib/db";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/groups";

  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await findUserByNickname(nickname.trim());
      if (!user) {
        setError("존재하지 않는 닉네임이에요.");
        return;
      }
      setCurrentUser(user);
      router.push(next);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-10">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">닉네임으로 로그인</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
        가입할 때 정한 닉네임만 입력하면 바로 들어가요.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-muted">닉네임</span>
          <input
            className="input-field"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="가입할 때 정한 닉네임"
            autoFocus
            required
          />
        </label>

        {error ? <p className="text-sm text-accent">{error}</p> : null}

        <button type="submit" className="btn btn-primary mt-2" disabled={!nickname.trim() || submitting}>
          {submitting ? "확인 중..." : "로그인"}
        </button>

        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="text-center text-xs text-accent underline underline-offset-2"
        >
          아직 가입 전이신가요? 회원가입
        </Link>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
