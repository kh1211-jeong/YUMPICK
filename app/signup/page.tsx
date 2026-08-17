"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createUser, setCurrentUser } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/groups";

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && birthdate && phone.trim() && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await createUser({
        name: name.trim(),
        birthdate,
        phone: phone.trim(),
        email: email.trim() || null,
      });
      setCurrentUser(user);
      trackEvent("signup_complete", { user_id: user.id });
      router.push(next);
    } catch {
      setError("가입 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-10">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-text">시작하기</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
        이름·생년월일·전화번호로 간단히 시작해요. 이미 가입했다면 그대로 로그인돼요.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
          {submitting ? "처리 중..." : "시작하기"}
        </button>

        <p className="text-center text-xs text-text-muted">
          점심 정할 때만 써요. 전화번호는 공개되지 않아요.
        </p>
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
