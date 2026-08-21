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
import {
  buildListenTypeRound,
  isDictationCorrect,
  type ListenTypePrompt,
} from "@/lib/listenType";
import { speak } from "@/lib/speak";

const QUESTION_SECONDS = 55;
const MAX_PLAYS = 3;
const QUESTION_COUNT = 8;

type SeedWord = {
  english: string;
  example_sentence?: string | null;
  audio_url?: string | null;
};

type Phase = "ready" | "answering" | "feedback" | "done";

export function ListenTypeGame({ seedWords }: { seedWords: SeedWord[] }) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [prompts, setPrompts] = useState<ListenTypePrompt[]>([]);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [playsLeft, setPlaysLeft] = useState(MAX_PLAYS);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(false);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = prompts[index] ?? null;

  const stopAudio = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    playingRef.current = false;
  }, []);

  const playPrompt = useCallback(
    (prompt: ListenTypePrompt, consumePlay: boolean) => {
      if (consumePlay && playsLeft <= 0) return;
      stopAudio();
      if (consumePlay) setPlaysLeft((n) => Math.max(0, n - 1));

      playingRef.current = true;
      if (prompt.audioUrl) {
        try {
          const audio = new Audio(prompt.audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            playingRef.current = false;
          };
          audio.play().catch(() => {
            speak(prompt.text, 0.85);
            playingRef.current = false;
          });
          return;
        } catch {
          // fall through
        }
      }
      speak(prompt.text, 0.85);
      playingRef.current = false;
    },
    [playsLeft, stopAudio]
  );

  const startRound = useCallback(() => {
    stopAudio();
    const round = buildListenTypeRound(seedWords, QUESTION_COUNT);
    setPrompts(round);
    setIndex(0);
    setSecondsLeft(QUESTION_SECONDS);
    setPlaysLeft(MAX_PLAYS);
    setAnswer("");
    setScore(0);
    setLastCorrect(false);
    setPhase("answering");
  }, [seedWords, stopAudio]);

  // Auto-play once when a new question starts
  useEffect(() => {
    if (phase !== "answering" || !current) return;
    const t = setTimeout(() => playPrompt(current, true), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on question change
  }, [phase, index, current?.id]);

  useEffect(() => {
    if (phase !== "answering") return;
    if (secondsLeft <= 0) {
      // auto-submit empty / current
      const correct = current ? isDictationCorrect(answer, current.text) : false;
      playFeedback(correct);
      if (correct) setScore((s) => s + 1);
      setLastCorrect(correct);
      setPhase("feedback");
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft, answer, current]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  function onReplay() {
    if (!current || phase !== "answering" || playsLeft <= 0) return;
    playPrompt(current, true);
  }

  function onSubmit() {
    if (!current || phase !== "answering" || !answer.trim()) return;
    stopAudio();
    const correct = isDictationCorrect(answer, current.text);
    playFeedback(correct);
    if (correct) setScore((s) => s + 1);
    setLastCorrect(correct);
    setPhase("feedback");
  }

  function onNext() {
    stopAudio();
    const next = index + 1;
    if (next >= prompts.length) {
      setPhase("done");
      return;
    }
    setIndex(next);
    setSecondsLeft(QUESTION_SECONDS);
    setPlaysLeft(MAX_PLAYS);
    setAnswer("");
    setLastCorrect(false);
    setPhase("answering");
  }

  if (phase === "ready") {
    return (
      <PracticeExamMain className="flex flex-col items-center justify-center px-4 py-10">
        <PracticeExamCard className="w-full max-w-md text-center">
          <PracticeExamEyebrow>Listen & Type</PracticeExamEyebrow>
          <h1 className="mt-2 text-2xl font-black text-mimo-title">Duyduğunu yaz</h1>
          <p className="mt-3 text-sm font-semibold text-mimo-muted">
            Kısa bir cümle duyacaksın. Dinle, yaz, gönder. Her soruda {QUESTION_SECONDS} saniye
            ve {MAX_PLAYS} dinleme hakkın var.
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
            {score}/{prompts.length || QUESTION_COUNT}
          </h1>
          <p className="mt-2 text-sm font-semibold text-mimo-muted">
            Dinlediğin cümleleri ne kadar doğru yazdın.
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

  return (
    <PracticeExamMain className="flex flex-col px-4 pb-6">
      <PracticeExamStickyBar
        onExitClick={stopAudio}
        maxWidthClass="max-w-lg lg:max-w-5xl"
        left={
          <PracticeExamTimerLabel
            time={formatTimer(secondsLeft)}
            urgent={secondsLeft <= 10}
          />
        }
      />
      <PracticeExamStickySpacer />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col lg:max-w-2xl">
        <div className="flex flex-1 flex-col items-center pt-2 lg:justify-center lg:pt-0">
          <div className="flex flex-col items-center">
            <p className="text-center text-xl font-black text-mimo-title sm:text-2xl lg:text-3xl">
              Duyduğunu yaz
            </p>
            <button
              type="button"
              onClick={onReplay}
              disabled={phase !== "answering" || playsLeft <= 0}
              className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1cb0f6] text-white shadow-[0_4px_0_#1899d6] transition enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:opacity-40 lg:mt-5 lg:h-20 lg:w-20"
              aria-label="Sesi çal"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3 9v6h4l5 4V5L7 9H3z" />
                <path d="M16.5 12a2.5 2.5 0 0 0-1.5-2.3v4.6a2.5 2.5 0 0 0 1.5-2.3z" opacity=".9" />
                <path
                  d="M14.5 6.1a6 6 0 0 1 0 11.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="mt-3 rounded-full bg-[#e8f6fe] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#0369a1] dark:bg-[#0c4a6e] dark:text-[#7dd3fc]">
              Kalan tekrar: {playsLeft}
            </span>
          </div>

          <div className="mt-6 w-full lg:mt-8">
            {phase === "answering" ? (
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Yanıtın"
                rows={4}
                className="mx-auto w-full resize-none rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-3 text-base font-semibold text-mimo-fg outline-none placeholder:font-medium placeholder:text-mimo-muted focus:border-[#1cb0f6] lg:min-h-[9rem] lg:text-lg"
                autoFocus
              />
            ) : (
              <div
                className={`mx-auto w-full rounded-xl border px-4 py-4 text-left ${
                  lastCorrect
                    ? "border-[#86efac] bg-[#f0fdf4] dark:border-[#166534] dark:bg-[#052e16]"
                    : "border-[#fca5a5] bg-[#fef2f2] dark:border-[#991b1b] dark:bg-[#450a0a]"
                }`}
              >
                <p
                  className={`text-sm font-black ${
                    lastCorrect ? "text-[#15803d]" : "text-[#b91c1c]"
                  }`}
                >
                  {lastCorrect ? "Doğru!" : "Yanlış veya eksik"}
                </p>
                <p className="mt-2 text-sm font-semibold text-mimo-fg">
                  <span className="text-mimo-muted">Doğru cümle: </span>
                  {current?.text}
                </p>
                {answer.trim() && !lastCorrect && (
                  <p className="mt-2 text-sm font-semibold text-mimo-muted">
                    Senin yazdığın: {answer.trim()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-mimo-soft pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wide text-mimo-muted">
              {index + 1}/{prompts.length}
            </span>
            {phase === "answering" ? (
              <button
                type="button"
                disabled={!answer.trim()}
                onClick={onSubmit}
                className="rounded-xl bg-[#1cb0f6] px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_3px_0_#1899d6] disabled:bg-mimo-soft disabled:text-mimo-muted disabled:shadow-none"
              >
                Gönder
              </button>
            ) : (
              <PracticeExamPrimaryButton onClick={onNext}>
                {index + 1 >= prompts.length ? "Bitir" : "Devam"}
              </PracticeExamPrimaryButton>
            )}
          </div>
        </div>
      </div>
    </PracticeExamMain>
  );
}
