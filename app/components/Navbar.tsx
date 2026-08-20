"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(detectDemo);
  const [profile, setProfile] = useState<Profile | null>(() =>
    detectDemo() ? DEMO_PROFILE : null
  );
  const [ready, setReady] = useState(() => detectDemo());
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
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

  useEffect(() => {
    if (!menuOpen) return;

    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    // Defer so the opening click does not immediately close the menu.
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  if (!ready || !profile) {
    return null;
  }

  async function signOut() {
    setMenuOpen(false);
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

          <button
            ref={buttonRef}
            type="button"
            aria-label="Profil menüsü"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className="relative z-[70] flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-[#fd860a]/50 transition hover:ring-[#fd860a]"
          >
            <Image
              src="/mimo-avatar.png"
              alt="Profil"
              width={40}
              height={40}
              className="pointer-events-none h-full w-full object-cover"
            />
          </button>

          {mounted &&
            menuOpen &&
            createPortal(
              <div
                ref={menuRef}
                id={menuId}
                role="menu"
                style={{ top: menuPos.top, right: menuPos.right }}
                className="fixed z-[200] w-48 overflow-hidden rounded-2xl border-2 border-duo-border bg-duo-card shadow-xl"
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
              </div>,
              document.body
            )}
        </div>
      </div>
    </header>
  );
}
