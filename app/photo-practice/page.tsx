"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoEvaluation } from "@/app/api/evaluate-photo/route";
import {
  PracticeExamCard,
  PracticeExamEyebrow,
  PracticeExamExitLink,
  PracticeExamGhostLink,
  PracticeExamMain,
  PracticeExamPrimaryButton,
  PracticeExamTopBar,
} from "@/app/components/PracticeExamChrome";
import { formatTimer } from "@/lib/detCloze";
import { playFeedback } from "@/lib/feedbackSound";
import { getRandomImage, stabilizePicsumUrl } from "@/lib/image-api";

type Phase = "ready" | "running" | "timeup" | "evaluating" | "done";

const WRITE_SECONDS = 60;
const MAX_SKIPS = 3;

const CEFR_COLOR: Record<string, string> = {
  A1: "bg-[#ffe8e8] text-[#b91c1c] border-[#fecaca]",
  A2: "bg-[#fff4e5] text-[#c2410c] border-[#fed7aa]",
  B1: "bg-[#fef9c3] text-[#a16207] border-[#fde68a]",
  B2: "bg-[#ecfce5] text-[#3f6212] border-[#bbf7d0]",
  C1: "bg-[#e8f6fe] text-[#075985] border-[#bae6fd]",
  C2: "bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]",
};

function isB2OrAbove(level: string) {
  return level === "B2" || level === "C1" || level === "C2";
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Keep the writing UI inside the visible area when the mobile keyboard opens. */
function useVisualViewportBox() {
  const [box, setBox] = useState({ top: 0, height: 0 });

  useEffect(() => {
    const sync = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setBox({ top: 0, height: window.innerHeight });
        return;
      }
      setBox({ top: Math.max(0, vv.offsetTop), height: Math.max(260, vv.height) });
    };
    sync();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return box;
}

export default function PhotoPracticePage() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [imageUrl, setImageUrl] = useState("");
  const [answer, setAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(WRITE_SECONDS);
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState<PhotoEvaluation | null>(null);
  const answerRef = useRef("");
  const evaluatingRef = useRef(false);
  const lockedImageRef = useRef("");
  const sessionEvalStartedRef = useRef(false);
  const lastEvalAtRef = useRef(0);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [skipsLeft, setSkipsLeft] = useState(MAX_SKIPS);
  const [emptyTimeout, setEmptyTimeout] = useState(false);
  const viewport = useVisualViewportBox();

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    const next = getRandomImage(900, 600);
    setImageUrl(next);
    lockedImageRef.current = next;
  }, []);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = window.setTimeout(() => setCooldownSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [cooldownSec]);

  // Writing mode: lock page scroll so the keyboard cannot shove the photo away.
  useEffect(() => {
    const writingNow = phase === "running" || phase === "timeup" || phase === "evaluating";
    if (!writingNow) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [phase]);

  const runEvaluation = useCallback(
    async (text: string, opts?: { force?: boolean }) => {
      const force = Boolean(opts?.force);
      if (evaluatingRef.current || sessionEvalStartedRef.current) return;

      const trimmed = text.trim();
      if (!force && trimmed.length < 20) {
        setError("Değerlendirme için biraz daha uzun yaz (en az birkaç cümle).");
        return;
      }

      // Timed-out empty / tiny answers: skip API, show timeout-only result.
      if (force && trimmed.length < 8) {
        sessionEvalStartedRef.current = true;
        setEmptyTimeout(true);
        setEvaluation(null);
        setError("");
        playFeedback(false);
        setPhase("done");
        return;
      }

      if (!force) {
        const sinceLast = Date.now() - lastEvalAtRef.current;
        if (lastEvalAtRef.current && sinceLast < 20_000) {
          const wait = Math.ceil((20_000 - sinceLast) / 1000);
          setCooldownSec(wait);
          setError(`Token koruması: ${wait} sn sonra yeni değerlendirme yapabilirsin.`);
          return;
        }
      }

      sessionEvalStartedRef.current = true;
      evaluatingRef.current = true;
      lastEvalAtRef.current = Date.now();
      setCooldownSec(20);
      setPhase("evaluating");
      setError("");
      setEvaluation(null);

      const imageForAi = lockedImageRef.current || imageUrl;
      const payloadText =
        trimmed.length > 0
          ? trimmed
          : "The student wrote almost nothing before the timer ended.";

      try {
        const res = await fetch("/api/evaluate-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: payloadText, mode: "write", imageUrl: imageForAi }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Değerlendirme başarısız");
        const next = data.evaluation as PhotoEvaluation;
        setEvaluation(next);
        playFeedback(isB2OrAbove(next.cefr_level));
        setPhase("done");
      } catch (e) {
        sessionEvalStartedRef.current = false;
        setError(e instanceof Error ? e.message : "Değerlendirme başarısız");
        // On forced timeout, still leave writing mode so the student isn't stuck at 00:00.
        if (force) {
          setEmptyTimeout(true);
          setEvaluation(null);
          setPhase("done");
        } else {
          setPhase("running");
        }
      } finally {
        evaluatingRef.current = false;
      }
    },
    [imageUrl]
  );

  useEffect(() => {
    if (phase !== "running") return;
    if (secondsLeft <= 0) {
      // Do not call Gemini here — wait for explicit "Bitir ve Değerlendir".
      setPhase("timeup");
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, secondsLeft]);

  function startSession() {
    setError("");
    setEvaluation(null);
    setEmptyTimeout(false);
    setAnswer("");
    setSecondsLeft(WRITE_SECONDS);
    sessionEvalStartedRef.current = false;
    evaluatingRef.current = false;
    setPhase("running");
  }

  function resetWithNewImage() {
    if (skipsLeft <= 0) return;
    const next = getRandomImage(900, 600);
    setPhase("ready");
    setAnswer("");
    setEvaluation(null);
    setEmptyTimeout(false);
    setError("");
    setSecondsLeft(WRITE_SECONDS);
    setImageUrl(next);
    lockedImageRef.current = next;
    sessionEvalStartedRef.current = false;
    evaluatingRef.current = false;
    setSkipsLeft((n) => Math.max(0, n - 1));
  }

  function nextRoundWithNewImage() {
    const next = getRandomImage(900, 600);
    setPhase("ready");
    setAnswer("");
    setEvaluation(null);
    setEmptyTimeout(false);
    setError("");
    setSecondsLeft(WRITE_SECONDS);
    setImageUrl(next);
    lockedImageRef.current = next;
    sessionEvalStartedRef.current = false;
    evaluatingRef.current = false;
  }

  function onImageReady(img: HTMLImageElement) {
    const stable = stabilizePicsumUrl(img.currentSrc || img.src, 900, 600);
    lockedImageRef.current = stable;
    if (stable !== imageUrl) setImageUrl(stable);
  }

  const writing = phase === "running" || phase === "timeup" || phase === "evaluating";

  if (writing) {
    const shellStyle =
      viewport.height > 0
        ? {
            position: "fixed" as const,
            top: viewport.top,
            left: 0,
            right: 0,
            height: viewport.height,
          }
        : undefined;

    const answerPanel = (
      <div className="flex h-full min-h-0 flex-col rounded-2xl border border-mimo-border bg-mimo-card px-4 py-4 shadow-sm sm:px-6">
        <label className="flex min-h-0 flex-1 flex-col text-left">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-mimo-muted">
            Cevabın · {wordCount(answer)} kelime
          </span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={phase !== "running"}
            rows={6}
            enterKeyHint="done"
            placeholder="Describe the photo in English…"
            className="mt-2 min-h-0 w-full flex-1 resize-none rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-3 text-sm font-semibold leading-relaxed text-mimo-fg outline-none placeholder:text-mimo-muted focus:border-[#1cb0f6] disabled:opacity-70 lg:min-h-[16rem]"
          />
        </label>

        {error && (phase === "running" || phase === "timeup") && (
          <p className="mt-3 shrink-0 text-center text-sm font-bold text-[#b45309]">{error}</p>
        )}

        {phase === "timeup" && (
          <p className="mt-3 shrink-0 text-center text-sm font-bold text-[#b45309]">
            Süre bitti. Değerlendirme için butona bas — AI ancak o zaman çalışır.
          </p>
        )}

        {(phase === "running" || phase === "timeup") && (
          <div className="mt-4 flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
            <PracticeExamPrimaryButton
              onClick={() => void runEvaluation(answer, { force: phase === "timeup" })}
              disabled={
                (phase === "running" && answer.trim().length < 20) ||
                sessionEvalStartedRef.current
              }
              variant="green"
              className="w-full sm:w-auto"
            >
              Bitir ve Değerlendir
            </PracticeExamPrimaryButton>
            {phase === "running" && (
              <button
                type="button"
                onClick={resetWithNewImage}
                disabled={skipsLeft <= 0}
                className="w-full rounded-2xl border border-mimo-soft px-6 py-3 text-sm font-bold text-mimo-muted disabled:opacity-50 sm:w-auto"
              >
                {skipsLeft > 0 ? `Geç (${skipsLeft})` : "Geç hakkı bitti"}
              </button>
            )}
          </div>
        )}

        {phase === "evaluating" && (
          <p className="mt-4 shrink-0 text-center text-sm font-bold text-mimo-muted">
            Değerlendiriliyor…
          </p>
        )}
      </div>
    );

    return (
      <main
        className="z-40 flex flex-col overflow-hidden bg-mimo-bg text-mimo-fg"
        style={shellStyle}
      >
        <header className="shrink-0 border-b border-mimo-border/70 bg-mimo-bg/95 px-4 py-3 backdrop-blur-md supports-[padding:env(safe-area-inset-top)]:pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <p
              className={`text-2xl font-black tabular-nums tracking-tight ${
                secondsLeft <= 10 ? "text-[#ff4b4b]" : "text-mimo-title"
              }`}
            >
              {formatTimer(secondsLeft)}
            </p>
            <PracticeExamExitLink href="/" />
          </div>
        </header>

        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center px-4 py-3 lg:py-6">
          {/* Mobile: photo stays pinned under the timer while typing */}
          <div className="mb-3 shrink-0 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="relative h-[4.75rem] w-[8.25rem] shrink-0 overflow-hidden rounded-xl border border-mimo-border bg-[#e2e8f0] shadow-sm">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="Practice photo"
                    fill
                    unoptimized
                    sizes="140px"
                    className="object-cover"
                    priority
                    onLoadingComplete={onImageReady}
                  />
                ) : null}
              </div>
              <p className="min-w-0 text-left text-xs font-bold leading-snug text-mimo-muted">
                Fotoğrafa bakarak yaz.
                <span className="mt-0.5 block font-semibold text-mimo-fg/80">
                  Görsel üstte sabit kalır.
                </span>
              </p>
            </div>
          </div>

          {/* Desktop: equal photo + answer panels, centered */}
          <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6">
            <div className="relative min-h-[22rem] overflow-hidden rounded-2xl border border-mimo-border bg-[#e2e8f0] shadow-sm">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt="Practice photo"
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                  priority
                  onLoadingComplete={onImageReady}
                />
              ) : null}
            </div>
            <div className="flex min-h-[22rem] flex-col">
              <p className="mb-2 shrink-0 text-right text-sm font-bold text-mimo-muted">
                Fotoğrafa bakarak yaz.
              </p>
              <div className="min-h-0 flex-1">{answerPanel}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 lg:hidden">{answerPanel}</div>
        </div>
      </main>
    );
  }

  return (
    <PracticeExamMain>
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <PracticeExamTopBar
          maxWidthClass="max-w-3xl"
          left={<PracticeExamEyebrow>Write About the Photo</PracticeExamEyebrow>}
        />

        <p className="mb-5 text-center text-base font-bold text-mimo-fg sm:text-lg">
          Describe the photo in English. Be clear and specific.
        </p>

        <PracticeExamCard className="!px-0 !py-0 overflow-hidden sm:!px-0 sm:!py-0">
          <div className="relative h-[220px] w-full bg-[#e2e8f0] sm:h-[280px]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt="Practice photo"
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
                onLoadingComplete={onImageReady}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-bold text-mimo-muted">
                Görsel yükleniyor…
              </div>
            )}
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {phase === "ready" && (
              <div className="space-y-5 text-center">
                <div>
                  <h1 className="text-lg font-black text-mimo-title sm:text-xl">
                    Fotoğrafı İngilizce anlat
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-mimo-muted">
                    60 saniye içinde gördüğünü yaz. AI yalnızca &quot;Bitir ve Değerlendir&quot;
                    dediğinde çalışır.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <PracticeExamPrimaryButton
                    onClick={startSession}
                    disabled={!imageUrl || cooldownSec > 0}
                    variant="green"
                    className="w-full sm:w-auto"
                  >
                    {cooldownSec > 0 ? `Bekle (${cooldownSec}s)` : `Başlat (${WRITE_SECONDS}s)`}
                  </PracticeExamPrimaryButton>
                  <button
                    type="button"
                    onClick={resetWithNewImage}
                    disabled={!imageUrl || skipsLeft <= 0}
                    className="w-full rounded-2xl border border-mimo-soft px-6 py-3 text-sm font-bold text-mimo-muted disabled:opacity-50 sm:w-auto"
                  >
                    {skipsLeft > 0 ? `Geç (${skipsLeft})` : "Geç hakkı bitti"}
                  </button>
                </div>
              </div>
            )}

            {phase === "done" && emptyTimeout && (
              <div className="space-y-5 text-center">
                <p className="text-sm font-semibold leading-relaxed text-mimo-muted">
                  Süre doldu ve yeterli bir cevap yazılmadı. Bir sonraki turda fotoğrafa bakarak
                  birkaç cümle yazmayı dene.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <PracticeExamPrimaryButton onClick={nextRoundWithNewImage} className="w-full">
                    Yeni Görsel
                  </PracticeExamPrimaryButton>
                  <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
                </div>
              </div>
            )}

            {phase === "done" && evaluation && !emptyTimeout && (
              <div className="space-y-5 text-left">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span
                    className={`rounded-full border px-4 py-1.5 text-sm font-black ${
                      CEFR_COLOR[evaluation.cefr_level] || CEFR_COLOR.B1
                    }`}
                  >
                    {evaluation.cefr_level}
                  </span>
                  <p className="text-2xl font-black text-mimo-title">
                    {evaluation.score}
                    <span className="text-sm font-bold text-mimo-muted"> / 10</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#e8f6fe] p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-[#075985]">Kelime</p>
                    <p className="mt-1 text-xl font-black text-[#0ea5e9]">
                      {evaluation.vocabulary_score}/10
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f3e8ff] p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-[#6b21a8]">Tutarlılık</p>
                    <p className="mt-1 text-xl font-black text-[#7c3aed]">
                      {evaluation.coherence_score}/10
                    </p>
                  </div>
                </div>

                <p className="text-sm font-semibold leading-relaxed text-mimo-muted">
                  {evaluation.feedback}
                </p>

                {evaluation.grammar_errors.length > 0 && (
                  <div className="rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b91c1c]">
                      Gramer hataları
                    </p>
                    <ul className="mt-2 space-y-1">
                      {evaluation.grammar_errors.map((item) => (
                        <li key={item} className="text-sm font-semibold text-mimo-fg">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.suggestions.length > 0 && (
                  <div className="rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-mimo-muted">
                      {isB2OrAbove(evaluation.cefr_level) ? "Öneriler" : "B2 için gelişim"}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {evaluation.suggestions.map((item) => (
                        <li key={item} className="text-sm font-semibold text-mimo-fg">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.improved_version && (
                  <div className="rounded-xl border border-[#bbf7d0] bg-[#ecfce5] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#3f6212]">
                      Şöyle yazabilirdin
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-[#14532d]">
                      {evaluation.improved_version}
                    </p>
                  </div>
                )}

                {error && <p className="text-center text-sm font-bold text-[#b91c1c]">{error}</p>}

                <div className="flex flex-col gap-2 pt-1">
                  <PracticeExamPrimaryButton onClick={nextRoundWithNewImage} className="w-full">
                    Yeni Görsel
                  </PracticeExamPrimaryButton>
                  <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
                </div>
              </div>
            )}
          </div>
        </PracticeExamCard>
      </div>
    </PracticeExamMain>
  );
}
