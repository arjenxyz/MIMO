"use client";

import { useEffect, useState } from "react";
import { OfflinePracticeLink } from "@/app/components/OfflinePracticeLink";
import { loadOfflinePackWords } from "@/lib/offlinePractice";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

/**
 * Primary entry into practicing with downloaded packs via /offline/* PWA shells.
 */
export function OfflinePracticeCta({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const online = useOnlineStatus();
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadOfflinePackWords().then((words) => {
      if (!cancelled) setWordCount(words.length);
    });
    const refresh = () => {
      void loadOfflinePackWords().then((words) => {
        if (!cancelled) setWordCount(words.length);
      });
    };
    window.addEventListener("mimo-offline-packs-updated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("mimo-offline-packs-updated", refresh);
    };
  }, []);

  if (wordCount <= 0) {
    if (!online) {
      return (
        <p
          className={`rounded-2xl border border-mimo-border bg-mimo-surface px-4 py-3 text-center text-sm font-extrabold text-mimo-muted ${className}`}
        >
          Pratik için önce çevrimiçiyken bir kelime paketi indir.
        </p>
      );
    }
    return null;
  }

  if (compact) {
    return (
      <OfflinePracticeLink
        href="/offline/quiz"
        className={`inline-flex items-center justify-center rounded-2xl bg-[#58cc02] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-[0_3px_0_#46a302] ${className}`}
      >
        Çevrimdışı pratik ({wordCount})
      </OfflinePracticeLink>
    );
  }

  return (
    <div
      className={`rounded-3xl border border-[#58cc02]/35 bg-mimo-card p-5 shadow-sm ${className}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#58cc02]">
        {online ? "PWA · cihazındaki paket" : "Çevrimdışı PWA pratik"}
      </p>
      <h3 className="mt-1 text-lg font-black text-mimo-title sm:text-xl">
        İndirdiğin {wordCount} kelimeyle çalış
      </h3>
      <p className="mt-1 text-sm font-semibold text-mimo-muted">
        Bu kısayollar `/offline` kabuğunda açılır — internet olmadan PWA ile çalışır.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <OfflinePracticeLink
          href="/offline/quiz"
          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#58cc02] px-4 py-3 text-sm font-black text-white shadow-[0_3px_0_#46a302]"
        >
          Kelime testi
        </OfflinePracticeLink>
        <OfflinePracticeLink
          href="/offline/match"
          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-mimo-border bg-mimo-surface px-4 py-3 text-sm font-black text-mimo-title"
        >
          Eşleştir
        </OfflinePracticeLink>
        <OfflinePracticeLink
          href="/offline/word-check"
          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-mimo-border bg-mimo-surface px-4 py-3 text-sm font-black text-mimo-title"
        >
          Yazım
        </OfflinePracticeLink>
        <OfflinePracticeLink
          href="/offline/listen"
          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-mimo-border bg-mimo-surface px-4 py-3 text-sm font-black text-mimo-title"
        >
          Dinle &amp; yaz
        </OfflinePracticeLink>
      </div>
    </div>
  );
}
