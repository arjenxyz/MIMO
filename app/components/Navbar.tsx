"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DEMO_PROFILE, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

const HIDDEN_PATHS = ["/login", "/register", "/onboarding", "/auth", "/sounds/practice"];

function detectDemo() {
  if (typeof window !== "undefined") {
    return isDemoMode(window.location.hostname);
  }
  return isDemoMode(null);
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [demo, setDemo] = useState(detectDemo);
  const [profile, setProfile] = useState<Profile | null>(() =>
    detectDemo() ? DEMO_PROFILE : null
  );
  const [ready, setReady] = useState(() => detectDemo());
  const [menuOpen, setMenuOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    const localDemo = detectDemo();
    setDemo(localDemo);

    if (localDemo) {
      setProfile(DEMO_PROFILE);
      setReady(true);
      return;
    }

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  if (!ready || !profile) {
    return null;
  }

  async function signOut() {
    if (demo) {
      router.push("/login");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b-2 border-duo-border/80 bg-[#0f1a1e]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:bg-white/5"
        >
          <Image
            src="/mimo-avatar.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-[#fd860a]/45"
          />
          <span className="text-xl font-black tracking-tight text-white">
            MIMO
          </span>
          {demo && (
            <span className="rounded-full bg-[#ffc800]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#ffc800]">
              Demo
            </span>
          )}
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <div
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-black text-[#ff9600]"
            title="Günlük seri"
          >
            <span className="text-lg" aria-hidden>
              🔥
            </span>
            <span className="text-sm tabular-nums">{profile.daily_streak}</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-black text-[#ffc800]"
            title="Toplam XP"
          >
            <span className="text-lg" aria-hidden>
              ⚡
            </span>
            <span className="text-sm tabular-nums">{profile.xp}</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-black text-[#ce82ff]"
            title="Seviye"
          >
            <span className="text-sm">Lv</span>
            <span className="text-sm tabular-nums">{profile.level}</span>
          </div>

          <div className="relative ml-1">
            <button
              type="button"
              aria-label="Profil menüsü"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-[#fd860a]/50 transition hover:ring-[#fd860a]"
            >
              <Image
                src="/mimo-avatar.png"
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Menüyü kapat"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-2xl border-2 border-duo-border bg-duo-card shadow-xl">
                  <p className="border-b border-duo-border px-4 py-3 text-sm font-extrabold text-duo-muted">
                    {profile.username || "Öğrenci"}
                  </p>
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full px-4 py-3 text-left text-sm font-extrabold text-[#ff4b4b] hover:bg-white/5"
                  >
                    {demo ? "Giriş ekranı" : "Çıkış yap"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
