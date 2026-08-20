"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/app/components/LoadingScreen";
import type { SoundWithProgress } from "@/types";

export function SoundsCatalog() {
  const [loading, setLoading] = useState(true);
  const [vowels, setVowels] = useState<SoundWithProgress[]>([]);
  const [consonants, setConsonants] = useState<SoundWithProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/sounds");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sesler yüklenemedi");
        if (!cancelled) {
          setVowels(data.vowels ?? []);
          setConsonants(data.consonants ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Hata");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (starting) return <LoadingScreen />;
  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="font-bold text-red-500">{error}</p>
        <p className="mt-3 text-sm font-semibold text-duo-muted">
          Supabase SQL Editor’da <code className="rounded bg-duo-surface px-1">schema-sounds.sql</code>{" "}
          dosyasını çalıştır.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-28 lg:pb-16">
      <section className="rounded-3xl border-2 border-duo-border bg-duo-card p-6 text-center sm:p-8">
        <h1 className="text-2xl font-black text-white sm:text-3xl">İngilizce sesleri öğrenelim!</h1>
        <p className="mt-2 font-bold text-duo-muted">
          Kulağını İngilizce seslere alıştır ve telaffuzunu güçlendir.
        </p>
        <Link
          href="/sounds/practice"
          onClick={() => setStarting(true)}
          className="mt-6 inline-flex w-full max-w-sm items-center justify-center rounded-2xl bg-[#1cb0f6] px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[#0b3a4a] shadow-[0_4px_0_#1899d6] transition active:translate-y-1 active:shadow-none sm:w-auto"
        >
          Başlat +10 puan
        </Link>
      </section>

      <SoundSection title="Sesli Harfler" items={vowels} />
      <SoundSection title="Ünsüzler" items={consonants} />
    </main>
  );
}

function SoundSection({ title, items }: { title: string; items: SoundWithProgress[] }) {
  if (!items.length) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-duo-border" />
        <h2 className="text-sm font-black uppercase tracking-wider text-duo-muted">{title}</h2>
        <div className="h-px flex-1 bg-duo-border" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {items.map((sound) => (
          <div
            key={sound.id}
            className="flex flex-col items-center rounded-2xl border-2 border-duo-border bg-duo-card px-2 py-4"
          >
            <span className="text-3xl font-black text-white">{sound.ipa}</span>
            <span className="mt-1 text-xs font-bold text-duo-muted">{sound.example_word}</span>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-duo-border">
              <div
                className="h-full rounded-full bg-[#1cb0f6]"
                style={{ width: `${sound.mastery}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
