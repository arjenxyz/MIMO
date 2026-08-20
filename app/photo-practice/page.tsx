"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoEvaluation } from "@/app/api/evaluate-photo/route";
import { getRandomImage, stabilizePicsumUrl } from "@/lib/image-api";

type Phase = "ready" | "running" | "evaluating" | "done";

const WRITE_SECONDS = 60;

const CEFR_COLOR: Record<string, string> = {
  A1: "bg-[#ff4b4b]/15 text-[#ff4b4b] border-[#ff4b4b]/40",
  A2: "bg-[#ff9600]/15 text-[#ff9600] border-[#ff9600]/40",
  B1: "bg-[#ffc800]/15 text-[#ffc800] border-[#ffc800]/40",
  B2: "bg-[#58cc02]/15 text-[#58cc02] border-[#58cc02]/40",
  C1: "bg-[#1cb0f6]/15 text-[#1cb0f6] border-[#1cb0f6]/40",
  C2: "bg-[#ce82ff]/15 text-[#ce82ff] border-[#ce82ff]/40",
};

function isB2OrAbove(level: string) {
  return level === "B2" || level === "C1" || level === "C2";
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
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

  const progress =
    phase === "running" ? secondsLeft / WRITE_SECONDS : phase === "ready" ? 1 : 0;

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

  const runEvaluation = useCallback(async (text: string) => {
    if (evaluatingRef.current || sessionEvalStartedRef.current) return;
    if (text.trim().length < 20) {
      setError("Değerlendirme için biraz daha uzun yaz (en az birkaç cümle).");
      return;
    }

    const sinceLast = Date.now() - lastEvalAtRef.current;
    if (lastEvalAtRef.current && sinceLast < 20_000) {
      const wait = Math.ceil((20_000 - sinceLast) / 1000);
      setCooldownSec(wait);
      setError(`Token koruması: ${wait} sn sonra yeni değerlendirme yapabilirsin.`);
      return;
    }

    sessionEvalStartedRef.current = true;
    evaluatingRef.current = true;
    lastEvalAtRef.current = Date.now();
    setCooldownSec(20);
    setPhase("evaluating");
    setError("");
    setEvaluation(null);

    const imageForAi = lockedImageRef.current || imageUrl;

    try {
      const res = await fetch("/api/evaluate-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text, mode: "write", imageUrl: imageForAi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Değerlendirme başarısız");
      setEvaluation(data.evaluation as PhotoEvaluation);
      setPhase("done");
    } catch (e) {
      sessionEvalStartedRef.current = false;
      setError(e instanceof Error ? e.message : "Değerlendirme başarısız");
      setPhase("running");
    } finally {
      evaluatingRef.current = false;
    }
  }, [imageUrl]);

  useEffect(() => {
    if (phase !== "running") return;
    if (secondsLeft <= 0) {
      void runEvaluation(answerRef.current);
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, secondsLeft, runEvaluation]);

  function startSession() {
    setError("");
    setEvaluation(null);
    setAnswer("");
    setSecondsLeft(WRITE_SECONDS);
    sessionEvalStartedRef.current = false;
    evaluatingRef.current = false;
    setPhase("running");
  }

  function resetWithNewImage() {
    const next = getRandomImage(900, 600);
    setPhase("ready");
    setAnswer("");
    setEvaluation(null);
    setError("");
    setSecondsLeft(WRITE_SECONDS);
    setImageUrl(next);
    lockedImageRef.current = next;
    sessionEvalStartedRef.current = false;
    evaluatingRef.current = false;
  }

  const photoPanel = (
    <div className="overflow-hidden rounded-[1.75rem] border-2 border-duo-border bg-[#0f1a1e] lg:self-start">
      <div className="relative h-[220px] w-full bg-black/40 sm:h-[260px] lg:h-[min(300px,40dvh)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Practice photo"
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover"
            priority
            onLoadingComplete={(img) => {
              const stable = stabilizePicsumUrl(img.currentSrc || img.src, 900, 600);
              lockedImageRef.current = stable;
              if (stable !== imageUrl) setImageUrl(stable);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-duo-muted">
            Görsel yükleniyor…
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-10 pt-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#fd860a]">
            DET · Photo
          </p>
          <h1 className="mt-1 text-2xl font-black text-white">Görsel Betimleme</h1>
        </div>
        <Link
          href="/"
          className="rounded-xl border-2 border-duo-border bg-duo-card px-3 py-2 text-xs font-black uppercase tracking-wide text-duo-muted"
        >
          Ana sayfa
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-8">
        {photoPanel}

        <div className="min-w-0">
          {phase === "ready" && (
            <section className="space-y-4 rounded-[1.75rem] border-2 border-duo-border bg-duo-card p-5 sm:p-6">
              <div>
                <p className="text-base font-black text-white">Fotoğrafı İngilizce anlat</p>
                <p className="mt-1 text-sm font-semibold text-duo-muted">
                  60 saniye içinde gördüğünü yaz. Gemini B2 seviyesini değerlendirir.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startSession}
                  disabled={!imageUrl || cooldownSec > 0}
                  className="flex-1 rounded-2xl bg-[#58cc02] py-4 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_4px_0_#46a302] disabled:opacity-50"
                >
                  {cooldownSec > 0 ? `Bekle (${cooldownSec}s)` : `Başlat (${WRITE_SECONDS}s)`}
                </button>
                <button
                  type="button"
                  onClick={resetWithNewImage}
                  disabled={!imageUrl}
                  className="shrink-0 rounded-2xl border-2 border-duo-border px-5 py-4 text-sm font-black uppercase tracking-wide text-duo-muted transition hover:border-white/25 hover:text-white disabled:opacity-50"
                >
                  Geç
                </button>
              </div>
            </section>
          )}

          {(phase === "running" || phase === "evaluating") && (
            <section className="space-y-4 rounded-[1.75rem] border-2 border-duo-border bg-duo-card p-5 sm:p-6">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm font-black">
                  <span className="text-duo-muted">Yazma</span>
                  <span className={secondsLeft <= 10 ? "text-[#ff4b4b]" : "text-white"}>
                    {secondsLeft}s
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#0f1a1e]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      secondsLeft <= 10 ? "bg-[#ff4b4b]" : "bg-[#1cb0f6]"
                    }`}
                    style={{ width: `${Math.max(0, progress * 100)}%` }}
                  />
                </div>
              </div>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wide text-duo-muted">
                  Cevabın ({wordCount(answer)} kelime)
                </span>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={phase !== "running"}
                  rows={8}
                  placeholder="Describe the photo in English…"
                  className="mt-1 w-full resize-none rounded-2xl border-2 border-duo-border bg-[#0f1a1e] px-4 py-3 text-sm font-bold leading-relaxed text-white outline-none placeholder:text-duo-muted focus:border-[#1cb0f6] disabled:opacity-70"
                />
              </label>

              {error && phase === "running" && (
                <p className="text-sm font-bold text-[#ff9600]">{error}</p>
              )}

              {phase === "running" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void runEvaluation(answer)}
                    disabled={answer.trim().length < 20 || sessionEvalStartedRef.current}
                    className="flex-1 rounded-2xl bg-[#58cc02] py-3.5 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_4px_0_#46a302] disabled:opacity-50"
                  >
                    Bitir ve Değerlendir
                  </button>
                  <button
                    type="button"
                    onClick={resetWithNewImage}
                    className="shrink-0 rounded-2xl border-2 border-duo-border px-5 py-3.5 text-sm font-black uppercase tracking-wide text-duo-muted transition hover:border-white/25 hover:text-white"
                  >
                    Geç
                  </button>
                </div>
              )}

              {phase === "evaluating" && (
                <p className="text-center text-sm font-black uppercase tracking-widest text-[#fd860a]">
                  Değerlendiriliyor…
                </p>
              )}
            </section>
          )}

          {phase === "done" && (
            <section className="space-y-4">
              {error && (
                <p className="rounded-2xl border-2 border-[#ff4b4b]/40 bg-[#ff4b4b]/10 px-4 py-3 text-sm font-bold text-[#ff4b4b]">
                  {error}
                </p>
              )}

              {evaluation && (
                <div className="space-y-4 rounded-[1.75rem] border-2 border-duo-border bg-duo-card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border-2 px-4 py-1.5 text-sm font-black ${
                        CEFR_COLOR[evaluation.cefr_level] || CEFR_COLOR.B1
                      }`}
                    >
                      {evaluation.cefr_level}
                    </span>
                    <p className="text-2xl font-black text-white">
                      {evaluation.score}
                      <span className="text-sm font-extrabold text-duo-muted"> / 10</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border-2 border-duo-border bg-[#0f1a1e] p-3">
                      <p className="text-[10px] font-black uppercase text-duo-muted">Kelime</p>
                      <p className="mt-1 text-xl font-black text-[#1cb0f6]">
                        {evaluation.vocabulary_score}/10
                      </p>
                    </div>
                    <div className="rounded-2xl border-2 border-duo-border bg-[#0f1a1e] p-3">
                      <p className="text-[10px] font-black uppercase text-duo-muted">Tutarlılık</p>
                      <p className="mt-1 text-xl font-black text-[#ce82ff]">
                        {evaluation.coherence_score}/10
                      </p>
                    </div>
                  </div>

                  <p className="text-sm font-semibold leading-relaxed text-duo-muted">
                    {evaluation.feedback}
                  </p>

                  {evaluation.grammar_errors.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#ff4b4b]">
                        Gramer hataları
                      </p>
                      <ul className="mt-2 space-y-1">
                        {evaluation.grammar_errors.map((item) => (
                          <li key={item} className="text-sm font-bold text-white">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!isB2OrAbove(evaluation.cefr_level) && (
                    <div className="rounded-2xl border-2 border-[#ff9600]/40 bg-[#ff9600]/10 p-4">
                      <p className="text-sm font-black text-[#ff9600]">
                        B2 seviyesine ulaşmak için şu gelişim alanlarına odaklanmalısın:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {evaluation.suggestions.map((item) => (
                          <li key={item} className="text-sm font-bold text-white">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {isB2OrAbove(evaluation.cefr_level) && evaluation.suggestions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#58cc02]">
                        Öneriler
                      </p>
                      <ul className="mt-2 space-y-1">
                        {evaluation.suggestions.map((item) => (
                          <li key={item} className="text-sm font-bold text-white">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluation.improved_version && (
                    <div className="rounded-2xl border-2 border-[#58cc02]/35 bg-[#58cc02]/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#58cc02]">
                        Şöyle yazabilirdin
                      </p>
                      <p className="mt-2 text-sm font-bold leading-relaxed text-white">
                        {evaluation.improved_version}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={resetWithNewImage}
                className="w-full rounded-2xl bg-[#1cb0f6] py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_4px_0_#1899d6]"
              >
                Yeni Görsel
              </button>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
