"use client";

import Link from "next/link";
import { OfflinePracticeLink } from "@/app/components/OfflinePracticeLink";

/**
 * next-pwa document fallback (`/~offline`).
 * Served when a navigation request fails offline instead of Chrome's
 * English "You are offline" interstitial.
 */
export default function OfflineFallbackPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center gap-6 px-5 py-10 text-mimo-fg">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fd860a]">
          Çevrimdışı
        </p>
        <h1 className="mt-2 text-3xl font-black text-mimo-title">İnternet yok</h1>
        <p className="mt-2 text-sm font-semibold text-mimo-muted">
          Site yine de çalışabilir — daha önce açtığın sayfalar ve indirdiğin
          paketler cihazında duruyor.
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href="/offline"
          className="rounded-2xl bg-[#fd860a] px-5 py-3.5 text-center text-sm font-black text-white shadow-[0_4px_0_#c2410c]"
        >
          Çevrimdışı alana git
        </Link>
        <OfflinePracticeLink
          href="/offline/quiz"
          className="rounded-2xl border border-mimo-border bg-mimo-card px-5 py-3.5 text-center text-sm font-black text-mimo-title"
        >
          Kelime testi
        </OfflinePracticeLink>
        <Link
          href="/"
          className="rounded-2xl border border-mimo-border bg-mimo-card px-5 py-3.5 text-center text-sm font-black text-mimo-title"
        >
          Ana sayfa
        </Link>
      </div>

      <p className="text-xs font-bold text-mimo-muted">
        İlk kez mi deniyorsun? Bir kez internetle siteyi aç, kelime paketini
        indir — sonra çevrimdışı kullanabilirsin.
      </p>
    </main>
  );
}
