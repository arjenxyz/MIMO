"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/app/components/LoadingScreen";
import type { SoundSessionQuestion } from "@/types";

function speak(word: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = "en-US";
  utter.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const en = voices.find((v) => v.lang.startsWith("en"));
  if (en) utter.voice = en;
  window.speechSynthesis.speak(utter);
}

export function SoundListenQuiz() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<SoundSessionQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/sounds/session?count=8");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Oturum yüklenemedi");
        if (!cancelled) {
          setQuestions(data.questions ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Hata");
          setLoading(false);
        }
      }
    }
    // Short delay so loading screen feels intentional
    const t = setTimeout(load, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const current = questions[index];

  useEffect(() => {
    if (!current || loading || done) return;
    const t = setTimeout(() => speak(current.playWord), 350);
    return () => clearTimeout(t);
  }, [current, loading, done, index]);

  const submitAnswer = useCallback(async () => {
    if (!current || !selected || checked) return;
    const isCorrect = selected === current.correct;
    setChecked(true);
    if (isCorrect) setCorrectCount((c) => c + 1);

    await fetch("/api/sounds/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundId: current.soundId, isCorrect }),
    });
  }, [checked, current, selected]);

  async function goNext() {
    if (index + 1 >= questions.length) {
      const res = await fetch("/api/sounds/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completeSession: true }),
      });
      const data = await res.json();
      setXpAwarded(data.xpAwarded ?? 10);
      setDone(true);
      window.dispatchEvent(new Event("profile-updated"));
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setChecked(false);
  }

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <p className="font-bold text-red-500">{error}</p>
        <p className="mt-2 text-sm font-semibold text-duo-muted">
          Supabase’de <code className="rounded bg-duo-surface px-1">schema-sounds.sql</code> çalıştırıldığından emin ol.
        </p>
        <Link href="/sounds" className="mt-6 font-extrabold text-[#fd860a]">
          Geri dön
        </Link>
      </main>
    );
  }

  if (!questions.length) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <p className="font-bold text-duo-muted">Henüz soru yok. Seed verisini yükle.</p>
        <Link href="/sounds" className="mt-6 font-extrabold text-[#fd860a]">
          Geri dön
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-black text-[#1f2937]">Harika!</h1>
        <p className="mt-2 font-bold text-[#6b7280]">
          {correctCount}/{questions.length} doğru · +{xpAwarded} XP
        </p>
        <Link
          href="/sounds"
          className="mt-8 rounded-full bg-[#fd860a] px-8 py-3 text-sm font-black text-white shadow-[0_4px_0_#d66f08]"
        >
          Seslere dön
        </Link>
      </main>
    );
  }

  const progress = ((index + (checked ? 1 : 0)) / questions.length) * 100;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col px-4 py-4">
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/sounds"
          aria-label="Kapat"
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl font-black text-[#9ca3af]"
        >
          ×
        </Link>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#e5e7eb]">
          <div
            className="h-full rounded-full bg-[#58cc02] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h1 className="text-center text-2xl font-black text-[#1f2937] sm:text-3xl">
        Ne duyuyorsun?
      </h1>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          aria-label="Sesi çal"
          onClick={() => speak(current.playWord)}
          className="flex h-28 w-28 items-center justify-center rounded-[1.75rem] bg-[#1cb0f6] text-white shadow-[0_6px_0_#1899d6] transition active:translate-y-1 active:shadow-none"
        >
          <svg viewBox="0 0 24 24" className="h-12 w-12 fill-current" aria-hidden>
            <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.3-3.9v7.8A4.5 4.5 0 0 0 16.5 12zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
          </svg>
        </button>
      </div>

      <div className="mt-10 space-y-3">
        {current.options.map((option) => {
          const isSelected = selected === option;
          const isAnswer = option === current.correct;
          let border = "border-[#e5e7eb]";
          let bg = "bg-white";
          if (checked) {
            if (isAnswer) {
              border = "border-[#58cc02]";
              bg = "bg-[#d7ffb8]";
            } else if (isSelected) {
              border = "border-[#ff4b4b]";
              bg = "bg-[#ffdfe0]";
            }
          } else if (isSelected) {
            border = "border-[#1cb0f6]";
            bg = "bg-[#ddf4ff]";
          }

          return (
            <button
              key={option}
              type="button"
              disabled={checked}
              onClick={() => setSelected(option)}
              className={`flex w-full items-center justify-center rounded-2xl border-2 ${border} ${bg} px-4 py-4 text-lg font-extrabold text-[#1f2937] transition disabled:opacity-100`}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pb-6 pt-8">
        {!checked ? (
          <button
            type="button"
            disabled={!selected}
            onClick={submitAnswer}
            className="w-full rounded-2xl bg-[#58cc02] py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_4px_0_#46a302] disabled:bg-[#e5e7eb] disabled:text-[#afafaf] disabled:shadow-none"
          >
            Kontrol et
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="w-full rounded-2xl bg-[#58cc02] py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_4px_0_#46a302]"
          >
            {index + 1 >= questions.length ? "Bitir" : "Devam"}
          </button>
        )}
      </div>
    </main>
  );
}
