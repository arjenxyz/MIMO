"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [demo, setDemo] = useState(detectDemo);
  const [profile, setProfile] = useState<Profile | null>(() =>
    detectDemo() ? DEMO_PROFILE : null
  );
  const [ready, setReady] = useState(() => detectDemo());

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
    detailsRef.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const root = detailsRef.current;
      if (!root?.open) return;
      if (root.contains(event.target as Node)) return;
      root.removeAttribute("open");
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  if (!ready || !profile) {
    return null;
  }

  async function signOut() {
    detailsRef.current?.removeAttribute("open");
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
          <span className="text-xl font-black tracking-tight text-white">MIMO</span>
          {demo && (
            <span className="rounded-full bg-[#ffc800]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#ffc800]">
              Demo
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-black text-[#ff9600]"
            title="Günlük seri"
          >
            <span className="text-lg" aria-hidden>
              🔥
            </span>
            <span className="text-sm tabular-nums">{profile.daily_streak}</span>
          </div>

          <details ref={detailsRef} className="relative">
            <summary
              aria-label="Profil menüsü"
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full ring-2 ring-[#fd860a]/50 transition hover:ring-[#fd860a] [&::-webkit-details-marker]:hidden"
            >
              <Image
                src="/mimo-avatar.png"
                alt=""
                width={40}
                height={40}
                className="pointer-events-none h-full w-full object-cover"
              />
            </summary>
            <div
              role="menu"
              className="absolute right-0 top-12 z-[200] w-48 overflow-hidden rounded-2xl border-2 border-duo-border bg-duo-card shadow-xl"
            >
              <p className="border-b border-duo-border px-4 py-3 text-sm font-extrabold text-duo-muted">
                {profile.username || "Öğrenci"}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="w-full px-4 py-3 text-left text-sm font-extrabold text-[#ff4b4b] hover:bg-white/5"
              >
                {demo ? "Giriş ekranı" : "Çıkış yap"}
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
