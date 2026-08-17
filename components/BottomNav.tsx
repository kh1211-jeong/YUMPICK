"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/groups", label: "그룹", emoji: "🍚" },
  { href: "/groups?new=1", label: "메뉴추가", emoji: "🍜" },
  { href: "/me", label: "내정보", emoji: "🙂" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 mx-auto flex w-full max-w-[420px] border-t border-border bg-surface px-4 py-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href.split("?")[0];
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-medium ${
              active ? "text-accent" : "text-text-muted"
            }`}
          >
            <span aria-hidden className="text-lg leading-none">
              {tab.emoji}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
