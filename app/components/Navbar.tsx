"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_PROFILE, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

const FALLBACK_AVATAR = "/mimo-avatar.png";

function detectDemo() {
  if (typeof window !== "undefined") {
    return isDemoMode(window.location.hostname);
  }
  return isDemoMode(null);
}

function avatarFromUser(user: {
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{ identity_data?: Record<string, unknown> | null }> | null;
} | null) {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const identity = user.identities?.[0]?.identity_data ?? {};
  const candidates = [
    meta.avatar_url,
    meta.picture,
    meta.avatar,
    identity.avatar_url,
    identity.picture,
    identity.avatar,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.startsWith("http")) return value;
  }
  return null;
}

function UserAvatar({
  src,
  name,
  size,
  className = "",
}: {
  src: string | null;
  name: string;
  size: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  if (showImage && src) {
    if (src.startsWith("http")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className={`pointer-events-none h-full w-full object-cover ${className}`}
        />
      );
    }
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`pointer-events-none h-full w-full object-cover ${className}`}
      />
    );
  }

  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <span
      aria-hidden
      className={`flex h-full w-full items-center justify-center bg-[#fd860a] text-sm font-black text-[#2a1600] ${className}`}
      style={{ fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [demo, setDemo] = useState(detectDemo);
  const [profile, setProfile] = useState<Profile | null>(() =>
    detectDemo() ? DEMO_PROFILE : null
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(() => detectDemo());

  const loadProfile = useCallback(async () => {
    const localDemo = detectDemo();
    setDemo(localDemo);

    if (localDemo) {
      setProfile(DEMO_PROFILE);
      setAvatarUrl(null);
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
        setAvatarUrl(null);
        setReady(true);
        return;
      }
      setAvatarUrl(avatarFromUser(user));
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile((data as Profile | null) ?? null);
    } catch {
      setProfile(null);
      setAvatarUrl(null);
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

  const path =
    pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  if (path !== "/") {
    return null;
  }

  if (!ready || !profile) {
    return (
      <>
        <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-mimo-border bg-mimo-nav" />
        <div className="h-14 shrink-0" aria-hidden />
      </>
    );
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

  const displayName = profile.username || "Öğrenci";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-mimo-border bg-mimo-nav backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:bg-mimo-surface"
          >
            <Image
              src={FALLBACK_AVATAR}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-[#1cb0f6]/35"
            />
            <span className="text-xl font-black tracking-tight text-mimo-title">MIMO</span>
            {demo && (
              <span className="rounded-full bg-[#fffbeb] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#a16207] dark:bg-[#422006]/40 dark:text-[#fbbf24]">
                Demo
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-black text-[#ea580c]"
              title="Günlük seri"
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
                className="text-[#ea580c]"
              >
                <path d="M12 2c1.5 3.5-.5 5.5-2 7.2C8.2 11 7 12.8 7 15.2 7 18.4 9.2 21 12 21s5-2.6 5-5.8c0-2.8-1.4-4.6-3.2-6.5C12.2 7 11 5.2 12 2z" />
              </svg>
              <span className="text-sm tabular-nums">{profile.daily_streak}</span>
            </div>

            <details ref={detailsRef} className="relative">
              <summary
                aria-label="Profil menüsü"
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full ring-2 ring-mimo-border transition hover:ring-[#1cb0f6] [&::-webkit-details-marker]:hidden"
              >
                <UserAvatar src={avatarUrl} name={displayName} size={40} />
              </summary>
              <div
                role="menu"
                className="absolute right-0 top-12 z-[200] w-56 overflow-hidden rounded-2xl border border-mimo-border bg-mimo-card shadow-lg"
              >
                <div className="flex items-center gap-3 border-b border-mimo-border px-4 py-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-mimo-soft">
                    <UserAvatar src={avatarUrl} name={displayName} size={36} />
                  </div>
                  <p className="truncate text-sm font-extrabold text-mimo-muted">{displayName}</p>
                </div>
                <Link
                  href="/settings"
                  role="menuitem"
                  className="block border-b border-mimo-border px-4 py-3 text-sm font-extrabold text-mimo-fg hover:bg-mimo-surface"
                  onClick={() => detailsRef.current?.removeAttribute("open")}
                >
                  Ayarlar
                </Link>
                <Link
                  href="/friends"
                  role="menuitem"
                  className="block border-b border-mimo-border px-4 py-3 text-sm font-extrabold text-[#7c3aed] hover:bg-mimo-surface"
                  onClick={() => detailsRef.current?.removeAttribute("open")}
                >
                  Arkadaşlar
                </Link>
                <Link
                  href="/words/add"
                  role="menuitem"
                  className="block border-b border-mimo-border px-4 py-3 text-sm font-extrabold text-[#0369a1] hover:bg-mimo-surface dark:text-[#38bdf8]"
                  onClick={() => detailsRef.current?.removeAttribute("open")}
                >
                  Kelime ekle
                </Link>
                <Link
                  href="/status"
                  role="menuitem"
                  className="block border-b border-mimo-border px-4 py-3 text-sm font-extrabold text-mimo-fg hover:bg-mimo-surface"
                  onClick={() => detailsRef.current?.removeAttribute("open")}
                >
                  Sistem durumu
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  className="w-full px-4 py-3 text-left text-sm font-extrabold text-[#b91c1c] hover:bg-mimo-surface dark:text-[#f87171]"
                >
                  {demo ? "Giriş ekranı" : "Çıkış yap"}
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <div className="h-14 shrink-0" aria-hidden />
    </>
  );
}
