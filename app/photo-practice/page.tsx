"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PhotoEvaluation } from "@/app/api/evaluate-photo/route";
import { getRandomImage } from "@/lib/image-api";
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  type SpeechRecognitionHandle,
} from "@/lib/speech-recognition";

type Mode = "write" | "speak";
type Phase = "ready" | "running" | "evaluating" | "done";

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
  const [mode, setMode] = useState<Mode>("write");
  const [phase, setPhase] = useState<Phase>("ready");
  const [imageUrl, setImageUrl] = useState("https://picsum.photos/900/600");
  const [answer, setAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState<PhotoEvaluation | null>(null);
  const recognitionRef = useRef<SpeechRecognitionHandle | null>(null);
  const answerRef = useRef("");
  const evaluatingRef = useRef(false);

  const duration = mode === "write" ? 60 : 90;
  const speechOk = useMemo(() => isSpeechRecognitionSupported(), []);
  const progress = phase === "running" ? secondsLeft / duration : phase === "ready" ? 1 : 0;

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    setImageUrl(getRandomImage(900, 600));
  }, []);

  const stopMic = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const runEvaluation = useCallback(
    async (text: string) => {
      if (evaluatingRef.current) return;
      evaluatingRef.current = true;
      stopMic();
      setPhase("evaluating");
      setError("");
      setEvaluation(null);

      try {
        const res = await fetch("/api/evaluate-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: text, mode, imageUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Değerlendirme başarısız");
        setEvaluation(data.evaluation as PhotoEvaluation);
        setPhase("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Değerlendirme başarısız");
        setPhase("done");
      } finally {
        evaluatingRef.current = false;
      }
    },
    [imageUrl, mode, stopMic]
  );

  useEffect(() => {
    if (phase !== "running") return;

    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          void runEvaluation(answerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, runEvaluation]);

  function startSession() {
    setError("");
    setEvaluation(null);
    setAnswer("");
    answerRef.current = "";
    setSecondsLeft(duration);
    setPhase("running");
    evaluatingRef.current = false;
  }

  function startMic() {
    setError("");
    if (!speechOk) {
      setError("Tarayıcınız konuşma tanımayı desteklemiyor. Lütfen Chrome kullanın.");
      return;
    }
    stopMic();
    const handle = startSpeechRecognition(
      (text) => {
        setAnswer(text);
        answerRef.current = text;
      },
      () => setListening(false),
      (message) => setError(message)
    );
    if (handle) {
      recognitionRef.current = handle;
      setListening(true);
    }
  }

  function resetWithNewImage() {
    stopMic();
    setPhase("ready");
    setAnswer("");
    setEvaluation(null);
    setError("");
    setSecondsLeft(duration);
    setImageUrl(getRandomImage(900, 600));
    evaluatingRef.current = false;
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-10 pt-5">
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

      <div className="overflow-hidden rounded-[1.75rem] border-2 border-duo-border bg-[#0f1a1e]">
        <div className="relative aspect-[4/3] w-full bg-black/40 sm:aspect-[16/10]">
          <Image
            src={imageUrl}
            alt="Practice photo"
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>
      </div>

      {phase === "ready" && (
        <section className="mt-5 space-y-4 rounded-[1.75rem] border-2 border-duo-border bg-duo-card p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-duo-muted">Mod</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ["write", "✍️ Yaz", "60 sn"],
                  ["speak", "🎤 Konuş", "90 sn"],
                ] as const
              ).map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMode(id);
                    setSecondsLeft(id === "write" ? 60 : 90);
                  }}
                  className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
                    mode === id
                      ? "border-[#fd860a] bg-[#fd860a]/15 text-white"
                      : "border-duo-border text-duo-muted hover:border-white/20"
                  }`}
                >
                  <p className="text-sm font-black">{label}</p>
                  <p className="mt-0.5 text-xs font-bold opacity-80">{hint}</p>
                </button>
              ))}
            </div>
          </div>

          {mode === "speak" && !speechOk && (
            <p className="text-sm font-bold text-[#ff9600]">
              Konuşma tanıma bu tarayıcıda yok. Chrome ile dene veya Yaz modunu kullan.
            </p>
          )}

          <button
            type="button"
            onClick={startSession}
            className="w-full rounded-2xl bg-[#58cc02] py-4 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_4px_0_#46a302]"
          >
            Başlat ({duration}s)
          </button>
        </section>
      )}

      {(phase === "running" || phase === "evaluating") && (
        <section className="mt-5 space-y-4 rounded-[1.75rem] border-2 border-duo-border bg-duo-card p-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-black">
              <span className="text-duo-muted">{mode === "write" ? "Yazma" : "Konuşma"}</span>
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
              rows={7}
              placeholder={
                mode === "write"
                  ? "Describe the photo in English…"
                  : "Mikrofonu başlat, konuşman burada görünecek…"
              }
              className="mt-1 w-full resize-none rounded-2xl border-2 border-duo-border bg-[#0f1a1e] px-4 py-3 text-sm font-bold leading-relaxed text-white outline-none placeholder:text-duo-muted focus:border-[#1cb0f6] disabled:opacity-70"
            />
          </label>

          {mode === "speak" && phase === "running" && (
            <button
              type="button"
              onClick={() => (listening ? stopMic() : startMic())}
              className={`w-full rounded-2xl py-3.5 text-sm font-black uppercase tracking-wide ${
                listening
                  ? "bg-[#ff4b4b] text-white shadow-[0_4px_0_#ea2b2b]"
                  : "bg-[#1cb0f6] text-white shadow-[0_4px_0_#1899d6]"
              }`}
            >
              {listening ? "Mikrofonu Durdur" : "Mikrofonu Başlat"}
            </button>
          )}

          {phase === "running" && (
            <button
              type="button"
              onClick={() => void runEvaluation(answer)}
              disabled={answer.trim().length < 8}
              className="w-full rounded-2xl bg-[#58cc02] py-3.5 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_4px_0_#46a302] disabled:opacity-50"
            >
              Bitir ve Değerlendir
            </button>
          )}

          {phase === "evaluating" && (
            <p className="text-center text-sm font-black uppercase tracking-widest text-[#fd860a]">
              Değerlendiriliyor…
            </p>
          )}
        </section>
      )}

      {phase === "done" && (
        <section className="mt-5 space-y-4">
          {error && (
            <p className="rounded-2xl border-2 border-[#ff4b4b]/40 bg-[#ff4b4b]/10 px-4 py-3 text-sm font-bold text-[#ff4b4b]">
              {error}
            </p>
          )}

          {evaluation && (
            <div className="space-y-4 rounded-[1.75rem] border-2 border-duo-border bg-duo-card p-5">
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
    </main>
  );
}
