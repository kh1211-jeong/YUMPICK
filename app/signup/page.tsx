"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createUser, setCurrentUser } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/groups";

  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = nickname.trim() && name.trim() && birthdate && phone.trim() && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await createUser({
        nickname: nickname.trim(),
        name: name.trim(),
        birthdate,
        phone: phone.trim(),
        email: email.trim() || null,
      });
      setCurrentUser(user);
      trackEvent("signup_complete", { user_id: user.id });
      router.push(next);
    } catch (err) {
      if (err instanceof Error && err.message === "NICKNAME_TAKEN") {
        setError("이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.");
      } else {
        setError("가입 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-10">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">회원가입</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
        닉네임으로 다음에 바로 로그인할 수 있어요.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-muted">닉네임</span>
          <input
            className="input-field"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="다음부터 이걸로 바로 로그인해요"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-muted">이름</span>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-muted">생년월일</span>
          <input
            className="input-field"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-muted">전화번호</span>
          <input
            className="input-field"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01012345678"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-muted">이메일 (선택)</span>
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        {error ? <p className="text-sm text-accent">{error}</p> : null}

        <button type="submit" className="btn btn-primary mt-2" disabled={!canSubmit}>
          {submitting ? "처리 중..." : "가입하고 시작하기"}
        </button>

        <p className="text-center text-xs text-text-muted">
          식사 정할 때만 써요. 전화번호는 공개되지 않아요.
        </p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-center text-xs text-accent underline underline-offset-2">
          이미 닉네임이 있으신가요? 로그인
        </Link>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
