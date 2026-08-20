"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  PracticeExamCard,
  PracticeExamEyebrow,
  PracticeExamGhostLink,
  PracticeExamMain,
  PracticeExamPrimaryButton,
  PracticeExamTopBar,
} from "@/app/components/PracticeExamChrome";
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
      <PracticeExamMain>
        <div className="mx-auto max-w-xl px-4 py-8">
          <PracticeExamCard className="text-center">
            <p className="font-bold text-[#b91c1c]">{error}</p>
            <p className="mt-2 text-sm font-semibold text-[#64748b]">
              Supabase’de schema-sounds.sql çalıştırıldığından emin ol.
            </p>
            <div className="mt-6">
              <PracticeExamGhostLink href="/sounds">Geri dön</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  if (!questions.length) {
    return (
      <PracticeExamMain>
        <div className="mx-auto max-w-xl px-4 py-8">
          <PracticeExamCard className="text-center">
            <p className="font-bold text-[#64748b]">Henüz soru yok. Seed verisini yükle.</p>
            <div className="mt-6">
              <PracticeExamGhostLink href="/sounds">Geri dön</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  if (done) {
    return (
      <PracticeExamMain>
        <div className="mx-auto max-w-xl px-4 py-8">
          <PracticeExamCard className="text-center">
            <PracticeExamEyebrow>Listen and Select</PracticeExamEyebrow>
            <h1 className="mt-3 text-2xl font-black">Well done!</h1>
            <p className="mt-2 text-sm font-semibold text-[#64748b]">
              {correctCount}/{questions.length} doğru · +{xpAwarded} XP
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <PracticeExamGhostLink href="/sounds">Seslere dön</PracticeExamGhostLink>
              <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  return (
    <PracticeExamMain>
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-5">
        <PracticeExamTopBar
          exitHref="/sounds"
          left={
            <p className="text-sm font-bold text-[#64748b]">
              Ses {Math.min(index + 1, questions.length)} / {questions.length}
            </p>
          }
        />

        <p className="mb-5 text-center text-base font-bold text-[#0f172a] sm:text-lg">
          Listen carefully and choose what you hear.
        </p>

        <PracticeExamCard>
          <div className="flex justify-center">
            <button
              type="button"
              aria-label="Sesi çal"
              onClick={() => speak(current.playWord)}
              className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#1cb0f6] text-white shadow-[0_3px_0_#1899d6] transition active:translate-y-0.5 active:shadow-none"
            >
              <svg viewBox="0 0 24 24" className="h-10 w-10 fill-current" aria-hidden>
                <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.3-3.9v7.8A4.5 4.5 0 0 0 16.5 12zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
              </svg>
            </button>
          </div>

          <div className="mt-8 space-y-2.5">
            {current.options.map((option) => {
              const isSelected = selected === option;
              const isAnswer = option === current.correct;
              let style =
                "border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:border-[#cbd5e1]";
              if (checked) {
                if (isAnswer) style = "border-[#58cc02] bg-[#ecfce5] text-[#15803d]";
                else if (isSelected) style = "border-[#ff4b4b] bg-[#ffe8e8] text-[#b91c1c]";
                else style = "border-[#e2e8f0] bg-white text-[#94a3b8]";
              } else if (isSelected) {
                style = "border-[#1cb0f6] bg-[#e8f6fe] text-[#0f172a]";
              }

              return (
                <button
                  key={option}
                  type="button"
                  disabled={checked}
                  onClick={() => setSelected(option)}
                  className={`flex w-full items-center justify-center rounded-xl border px-4 py-3.5 text-lg font-extrabold transition ${style}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            {!checked ? (
              <PracticeExamPrimaryButton
                disabled={!selected}
                onClick={() => void submitAnswer()}
                variant="green"
              >
                Kontrol et
              </PracticeExamPrimaryButton>
            ) : (
              <>
                {selected !== current.correct && (
                  <p className="text-center text-sm font-bold text-[#64748b]">
                    Doğru cevap: <span className="text-[#0369a1]">{current.correct}</span>
                  </p>
                )}
                <PracticeExamPrimaryButton onClick={() => void goNext()} variant="green">
                  {index + 1 >= questions.length ? "Sonuçlar" : "Devam"}
                </PracticeExamPrimaryButton>
              </>
            )}
          </div>
        </PracticeExamCard>

        <p className="mt-4 text-center text-xs font-semibold text-[#94a3b8]">
          <Link href="/sounds" className="hover:text-[#64748b]">
            Seslere dön
          </Link>
        </p>
      </div>
    </PracticeExamMain>
  );
}
