"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PracticeExamCard,
  PracticeExamEyebrow,
  PracticeExamGhostLink,
  PracticeExamMain,
  PracticeExamPrimaryButton,
  PracticeExamStickyBar,
  PracticeExamStickySpacer,
  PracticeExamTimerLabel,
} from "@/app/components/PracticeExamChrome";
import { formatTimer } from "@/lib/detCloze";
import { playFeedback } from "@/lib/feedbackSound";
import { buildRealWordRound, type RealWordItem } from "@/lib/realWordQuiz";

const QUESTION_SECONDS = 5;
const QUESTION_COUNT = 12;

type Feedback = "correct" | "wrong" | "timeout" | null;

export function RealWordGame({ seedWords }: { seedWords: string[] }) {
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const [items, setItems] = useState<RealWordItem[]>([]);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const answeringRef = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = items[index] ?? null;

  const clearAdvance = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  const startRound = useCallback(() => {
    clearAdvance();
    answeringRef.current = false;
    setItems(buildRealWordRound(seedWords, QUESTION_COUNT));
    setIndex(0);
    setSecondsLeft(QUESTION_SECONDS);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setPhase("running");
  }, [seedWords]);

  const goNext = useCallback(() => {
    clearAdvance();
    answeringRef.current = false;
    setFeedback(null);
    setIndex((i) => {
      const next = i + 1;
      if (next >= QUESTION_COUNT) {
        setPhase("done");
        return i;
      }
      setSecondsLeft(QUESTION_SECONDS);
      return next;
    });
  }, []);

  const resolve = useCallback(
    (answer: boolean | null) => {
      if (phase !== "running" || answeringRef.current || !current) return;
      answeringRef.current = true;

      const timedOut = answer === null;
      const correct = !timedOut && answer === current.isReal;
      playFeedback(correct);

      if (correct) {
        setScore((s) => s + 1);
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
        setFeedback("correct");
      } else {
        setStreak(0);
        setFeedback(timedOut ? "timeout" : "wrong");
      }

      advanceTimer.current = setTimeout(goNext, 900);
    },
    [phase, current, goNext]
  );

  useEffect(() => {
    if (phase !== "running" || feedback) return;
    if (secondsLeft <= 0) {
      resolve(null);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft, feedback, resolve]);

  useEffect(() => () => clearAdvance(), []);

  if (phase === "ready") {
    return (
      <PracticeExamMain className="flex flex-col items-center justify-center px-4 py-10">
        <PracticeExamCard className="w-full max-w-md text-center">
          <PracticeExamEyebrow>Kelime doğrulama</PracticeExamEyebrow>
          <h1 className="mt-2 text-2xl font-black text-mimo-title">Yazım doğru mu?</h1>
          <p className="mt-3 text-sm font-semibold text-mimo-muted">
            Öğrendiğin kelimelerden biri çıkar — bazen doğru, bazen yanlış yazılmış
            (friend → firiend gibi). Gerçek yazım mı, değil mi? Her soru için{" "}
            {QUESTION_SECONDS} saniyen var.
          </p>
          <PracticeExamPrimaryButton className="mt-6 w-full" onClick={startRound}>
            Başla
          </PracticeExamPrimaryButton>
          <div className="mt-4">
            <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
          </div>
        </PracticeExamCard>
      </PracticeExamMain>
    );
  }

  if (phase === "done") {
    return (
      <PracticeExamMain className="flex flex-col items-center justify-center px-4 py-10">
        <PracticeExamCard className="w-full max-w-md text-center">
          <PracticeExamEyebrow>Tur bitti</PracticeExamEyebrow>
          <h1 className="mt-2 text-3xl font-black text-mimo-title">
            {score}/{QUESTION_COUNT}
          </h1>
          <p className="mt-2 text-sm font-semibold text-mimo-muted">
            En uzun seri: {bestStreak}
          </p>
          <PracticeExamPrimaryButton className="mt-6 w-full" onClick={startRound}>
            Tekrar oyna
          </PracticeExamPrimaryButton>
          <div className="mt-4">
            <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
          </div>
        </PracticeExamCard>
      </PracticeExamMain>
    );
  }

  const feedbackTint =
    feedback === "correct"
      ? "border-[#86efac] bg-[#f0fdf4] dark:border-[#166534] dark:bg-[#052e16]"
      : feedback === "wrong" || feedback === "timeout"
        ? "border-[#fca5a5] bg-[#fef2f2] dark:border-[#991b1b] dark:bg-[#450a0a]"
        : "border-mimo-border bg-mimo-card";

  return (
    <PracticeExamMain className="px-4 pb-10">
      <PracticeExamStickyBar
        left={
          <PracticeExamTimerLabel
            time={formatTimer(secondsLeft)}
            urgent={secondsLeft <= 2}
          />
        }
      />
      <PracticeExamStickySpacer />
      <div className="mx-auto w-full max-w-lg lg:max-w-4xl">
        <div className="mb-4 flex items-center justify-between text-xs font-black uppercase tracking-wide text-mimo-muted lg:mb-6 lg:text-sm">
          <span>
            {index + 1}/{QUESTION_COUNT}
          </span>
          <span>
            Skor {score} · Seri {streak}
          </span>
        </div>

        <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-stretch lg:gap-6">
          <section
            className={`rounded-2xl border px-5 py-12 text-center shadow-sm transition-colors sm:px-8 lg:flex lg:flex-col lg:justify-center lg:py-16 ${feedbackTint}`}
          >
            <p className="text-lg font-black text-mimo-title sm:text-xl lg:text-2xl">
              Bu yazım doğru mu?
            </p>
            <p className="mt-6 text-4xl font-semibold tracking-tight text-mimo-fg sm:text-5xl lg:mt-8 lg:text-6xl">
              {current?.word}
            </p>

            {feedback && (
              <p
                className={`mt-5 text-sm font-black lg:text-base ${
                  feedback === "correct" ? "text-[#15803d]" : "text-[#b91c1c]"
                }`}
              >
                {feedback === "correct"
                  ? current?.isReal
                    ? "Doğru — yazım doğru."
                    : `Doğru — yanlış yazılmış. Doğrusu: ${current?.sourceWord}`
                  : feedback === "timeout"
                    ? current?.isReal
                      ? `Süre bitti — doğru yazımdı: ${current?.sourceWord}`
                      : `Süre bitti — yanlış yazımdı. Doğrusu: ${current?.sourceWord}`
                    : current?.isReal
                      ? `Yanlış — yazım doğruydu: ${current?.sourceWord}`
                      : `Yanlış — yanlış yazımdı. Doğrusu: ${current?.sourceWord}`}
              </p>
            )}
          </section>

          <div className="mt-8 grid grid-cols-2 gap-4 lg:mt-0 lg:grid-cols-1 lg:gap-4">
            <button
              type="button"
              disabled={Boolean(feedback)}
              onClick={() => resolve(true)}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-mimo-soft bg-mimo-card shadow-[0_4px_0_rgba(0,0,0,0.06)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-60 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)] lg:aspect-auto lg:min-h-[9.5rem] lg:flex-row lg:gap-3"
            >
              <span className="text-[#1cb0f6]" aria-hidden>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5 10 17.5 19 7" />
                </svg>
              </span>
              <span className="text-base font-black text-mimo-title lg:text-lg">Evet</span>
            </button>
            <button
              type="button"
              disabled={Boolean(feedback)}
              onClick={() => resolve(false)}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-mimo-soft bg-mimo-card shadow-[0_4px_0_rgba(0,0,0,0.06)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-60 dark:shadow-[0_4px_0_rgba(0,0,0,0.35)] lg:aspect-auto lg:min-h-[9.5rem] lg:flex-row lg:gap-3"
            >
              <span className="text-[#1cb0f6]" aria-hidden>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </span>
              <span className="text-base font-black uppercase tracking-wide text-mimo-title lg:text-lg">
                Hayır
              </span>
            </button>
          </div>
        </div>
      </div>
    </PracticeExamMain>
  );
}
