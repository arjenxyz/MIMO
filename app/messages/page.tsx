"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Thread = {
  otherId: string;
  otherUsername: string;
  lastBody: string;
  lastAt: string;
  unlockedAsAuthor: boolean;
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/messages", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Mesajlar alınamadı");
        if (!cancelled) setThreads(data.threads ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Mesajlar alınamadı");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-[100dvh] bg-mimo-bg text-mimo-fg">
      <header className="sticky top-0 z-40 border-b border-mimo-border bg-mimo-nav/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <h1 className="text-base font-black text-mimo-title">Mesajlar</h1>
          <Link
            href="/#offline-packs"
            className="rounded-xl border border-mimo-border bg-mimo-surface px-3 py-1.5 text-xs font-extrabold text-mimo-fg"
          >
            Paketler
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        <p className="text-sm font-semibold text-mimo-muted">
          Bir yazarın paketinden sınavı geçince o kişiyle yazışabilirsin.
        </p>

        {loading ? (
          <p className="text-sm font-bold text-mimo-muted">Yükleniyor…</p>
        ) : null}
        {error ? (
          <p className="rounded-2xl border border-[#ff4b4b]/30 bg-[#ffe8e8] px-4 py-3 text-sm font-bold text-[#b91c1c]">
            {error}
          </p>
        ) : null}

        {!loading && !error && threads.length === 0 ? (
          <div className="rounded-3xl border border-mimo-border bg-mimo-card p-5 shadow-sm">
            <p className="text-sm font-extrabold text-mimo-title">Henüz sohbet yok</p>
            <p className="mt-1 text-sm font-semibold text-mimo-muted">
              Paylaşılan bir paketten sınav ol; %80 geçince mesaj kilidi açılır.
            </p>
            <Link
              href="/#offline-packs"
              className="mt-4 inline-flex rounded-2xl bg-[#fd860a] px-4 py-2.5 text-sm font-black text-white"
            >
              Paketlere git →
            </Link>
          </div>
        ) : null}

        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.otherId}>
              <Link
                href={`/messages/${t.otherId}`}
                className="flex items-start justify-between gap-3 rounded-2xl border border-mimo-border bg-mimo-card px-4 py-3 shadow-sm transition hover:border-[#1cb0f6]/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-mimo-title">
                    @{t.otherUsername}
                    {t.unlockedAsAuthor ? (
                      <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wide text-[#fd860a]">
                        paketini açtı
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-mimo-muted">
                    {t.lastBody}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-black text-[#1cb0f6]">Aç →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
