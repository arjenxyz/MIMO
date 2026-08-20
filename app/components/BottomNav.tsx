"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Öğren", icon: "🏠", match: (p: string) => p === "/" },
  {
    href: "/quiz",
    label: "Kelime",
    icon: "📘",
    match: (p: string) => p.startsWith("/quiz") && !p.includes("grammar"),
  },
  { href: "/sounds", label: "Sesler", icon: "🎧", match: (p: string) => p.startsWith("/sounds") },
  { href: "/reading", label: "Okuma", icon: "📖", match: (p: string) => p.startsWith("/reading") },
];

const HIDDEN = ["/login", "/register", "/onboarding", "/auth", "/sounds/practice"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-duo-border/80 bg-[#0f1a1e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 py-1.5">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-black uppercase tracking-wide transition ${
                  active
                    ? "bg-[#1cb0f6]/15 text-[#1cb0f6]"
                    : "text-duo-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
