"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { OfflinePacksManager } from "@/app/components/OfflinePacksManager";
import { OfflinePracticeCta } from "@/app/components/OfflinePracticeCta";
import { OfflinePracticeLink } from "@/app/components/OfflinePracticeLink";
import { PwaRuntime } from "@/app/components/PwaRuntime";
import { formatMegabytes, type OfflinePackId, type StoredOfflinePack } from "@/lib/offlinePacks";
import { getAllStoredPacks } from "@/lib/offlineStorage";

export default function OfflineHubPage() {
  const [stored, setStored] = useState<Partial<Record<OfflinePackId, StoredOfflinePack>>>({});
  const [online, setOnline] = useState(true);

  useEffect(() => {
    void getAllStoredPacks().then(setStored);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const syncState = () => {
      setOnline(navigator.onLine);
      void getAllStoredPacks().then(setStored);
    };

    window.addEventListener("online", syncState);
    window.addEventListener("offline", syncState);
    window.addEventListener("mimo-offline-packs-updated", syncState);
    return () => {
      window.removeEventListener("online", syncState);
      window.removeEventListener("offline", syncState);
      window.removeEventListener("mimo-offline-packs-updated", syncState);
    };
  }, []);

  const wordsPack = stored.words as StoredOfflinePack<"words"> | undefined;
  const detPack = stored.det as StoredOfflinePack<"det"> | undefined;

  const totalLocalBytes = Object.values(stored).reduce(
    (sum, p) => sum + (p?.byteSize ?? 0),
    0
  );

  const quickActivities = [
    {
      title: "Kelime Testi",
      href: "/offline/quiz",
      forcePack: true,
      meta: wordsPack
        ? `${wordsPack.itemCount} kelime + ses (${formatMegabytes(wordsPack.byteSize)})`
        : "Yazar paketini indirerek aç",
      tone: "bg-[#1cb0f6] shadow-[0_3px_0_#1899d6]",
    },
    {
      title: "Hızlı Eşleştir",
      href: "/offline/match",
      forcePack: true,
      meta: wordsPack
        ? `${wordsPack.itemCount} kelime hazır`
        : "Kelime paketi indirilince zenginleşir",
      tone: "bg-[#58cc02] shadow-[0_3px_0_#46a302]",
    },
    {
      title: "Yazım Doğru mu?",
      href: "/offline/word-check",
      forcePack: true,
      meta: wordsPack ? `${wordsPack.itemCount} kelime hazır` : "Çevrimdışı dene",
      tone: "bg-[#e11d48] shadow-[0_3px_0_#be123c]",
    },
    {
      title: "Listen & Type",
      href: "/offline/listen",
      forcePack: true,
      meta: "Tarayıcı sesi ile internetsiz dikte",
      tone: "bg-[#0284c7] shadow-[0_3px_0_#0369a1]",
    },
    {
      title: "Read & Complete",
      href: "/offline/read",
      forcePack: false,
      meta: detPack
        ? `${detPack.itemCount} pasaj (${formatMegabytes(detPack.byteSize)})`
        : "Yedek pasajlarla hazır",
      tone: "bg-[#fd860a] shadow-[0_3px_0_#c2410c]",
    },
  ];

  return (
    <main className="min-h-[100dvh] bg-mimo-bg text-mimo-fg">
      <header className="sticky top-0 z-40 border-b border-mimo-border bg-mimo-nav backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/mimo-avatar.png"
              alt="MIMO"
              width={34}
              height={34}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-[#fd860a]/35"
            />
            <span className="text-lg font-black text-mimo-title">MIMO · PWA pratik</span>
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-black ${
                online
                  ? "bg-[#ecfce5] text-[#15803d] dark:bg-[#14532d]/40 dark:text-[#86efac]"
                  : "bg-[#fff3e0] text-[#c2410c] dark:bg-[#7c2d12]/40 dark:text-[#fdba74]"
              }`}
            >
              {online ? "Çevrimiçi" : "Çevrimdışı"}
            </span>
            <Link
              href="/"
              className="rounded-xl border border-mimo-border bg-mimo-surface px-3 py-1.5 text-xs font-extrabold text-mimo-fg"
            >
              Ana Sayfa
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section className="rounded-3xl border border-mimo-border bg-mimo-card p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1cb0f6]">
            Yerel depolama · kelime + ses
          </p>
          <h1 className="mt-1 text-2xl font-black text-mimo-title sm:text-3xl">
            PWA çevrimdışı çalışma alanı
          </h1>
          <p className="mt-1 text-sm font-semibold text-mimo-muted">
            Ana ekrana ekle; paket indir; internet kesilince bu sayfadan pratik yap. Cihazda:{" "}
            <strong className="text-mimo-title">{formatMegabytes(totalLocalBytes)}</strong>
          </p>
          <div className="mt-4">
            <PwaRuntime />
          </div>
        </section>

        <OfflinePracticeCta />

        <section className="rounded-3xl border border-mimo-border bg-mimo-card p-6 shadow-sm">
          <h2 className="text-lg font-black text-mimo-title">Hızlı aç</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActivities.map((act) => (
              <OfflinePracticeLink
                key={act.href}
                href={act.href}
                forcePack={act.forcePack}
                className="flex items-center justify-between gap-3 rounded-2xl border border-mimo-border bg-mimo-surface p-4 transition hover:border-[#1cb0f6]/40"
              >
                <div className="min-w-0">
                  <p className="text-base font-black text-mimo-title">{act.title}</p>
                  <p className="mt-0.5 truncate text-xs font-bold text-mimo-muted">{act.meta}</p>
                </div>
                <span
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black text-white ${act.tone}`}
                >
                  Aç
                </span>
              </OfflinePracticeLink>
            ))}
          </div>
        </section>

        <OfflinePacksManager showOfflineWorkspaceLink={false} />
      </div>
    </main>
  );
}
