"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { xpInCurrentLevel } from "@/lib/srs";
import type { Profile } from "@/types";

const HIDDEN_PATHS = ["/login", "/register", "/onboarding", "/auth", "/sounds/practice"];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setReady(true);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile((data as Profile | null) ?? null);
    } catch {
      setProfile(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const onUpdate = () => loadProfile();
    window.addEventListener("profile-updated", onUpdate);
    return () => window.removeEventListener("profile-updated", onUpdate);
  }, [loadProfile, pathname]);

  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  if (!ready || !profile) {
    return null;
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const xpNow = xpInCurrentLevel(profile.xp);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-duo-border bg-duo-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          <Image
            src="/mimo-avatar.png"
            alt="Mimo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-duo-orange/40"
          />
          <span className="text-xl">MIMO</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
          <span className="rounded-xl bg-duo-surface px-3 py-1.5 text-duo-purple">Lv {profile.level}</span>
          <span className="rounded-xl bg-duo-surface px-3 py-1.5 text-duo-gold">
            {profile.xp} XP · {xpNow}/100
          </span>
          <span className="rounded-xl bg-duo-surface px-3 py-1.5 text-duo-orange">
            🔥 {profile.daily_streak}
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <Link
            href="/quiz"
            className="rounded-xl bg-duo-blue px-3 py-2 text-sm font-extrabold shadow-duo-blue active:translate-y-1 active:shadow-none"
          >
            Quiz
          </Link>
          <Link
            href="/quiz/grammar"
            className="rounded-xl bg-duo-purple px-3 py-2 text-sm font-extrabold text-[#3b0764] shadow-duo-purple active:translate-y-1 active:shadow-none"
          >
            Gramer
          </Link>
          <Link
            href="/sounds"
            className="rounded-xl bg-[#1cb0f6] px-3 py-2 text-sm font-extrabold text-white shadow-[0_3px_0_#1899d6] active:translate-y-1 active:shadow-none"
          >
            Sesler
          </Link>
          <Link
            href="/reading"
            className="rounded-xl bg-duo-orange px-3 py-2 text-sm font-extrabold shadow-duo-orange active:translate-y-1 active:shadow-none"
          >
            Okuma
          </Link>
          <button
            onClick={signOut}
            className="rounded-xl border-2 border-duo-border px-3 py-2 text-sm font-extrabold text-duo-muted"
          >
            Çıkış Yap
          </button>
        </nav>
      </div>
    </header>
  );
}
