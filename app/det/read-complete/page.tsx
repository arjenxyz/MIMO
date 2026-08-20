"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_DET_READ_COMPLETE, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/client";
import type { DETExercise } from "@/types";

const QUESTION_SECONDS = 30;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function renderCloze(text: string) {
  const parts = text.split("___");
  if (parts.length === 1) return <span>{text}</span>;
  return (
    <span>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 && (
            <span className="mx-1 inline-block min-w-[4.5rem] border-b-2 border-[#1cb0f6] px-1 text-center text-[#1cb0f6]">
              ???
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export default function ReadCompletePage() {
  const [exercises, setExercises] = useState<DETExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const answerRef = useRef("");

  const finished = exercises.length > 0 && index >= exercises.length;
  const current = !finished ? exercises[index] : null;

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const localDemo = isDemoMode(
      typeof window !== "undefined" ? window.location.hostname : null
    );
    setDemo(localDemo);

    try {
      if (localDemo) {
        setExercises(shuffle(DEMO_DET_READ_COMPLETE));
        setUserId(null);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: typeRow, error: typeError } = await supabase
        .from("det_question_types")
        .select("id")
        .eq("type_name", "read_complete")
        .maybeSingle();

      if (typeError) throw typeError;
      if (!typeRow) throw new Error("read_complete tipi bulunamadı. schema-det.sql çalıştır.");

      const { data, error: exError } = await supabase
        .from("det_exercises")
        .select("*")
        .eq("question_type_id", typeRow.id);

      if (exError) throw exError;
      const list = (data as DETExercise[]) ?? [];
      if (list.length === 0) {
        setExercises([]);
        setError("Henüz soru yok. `npm run generate-cloze` ile üret veya schema örneklerini ekle.");
        return;
      }
      setExercises(shuffle(list));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sorular yüklenemedi");
      setExercises(shuffle(DEMO_DET_READ_COMPLETE));
      setDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitAnswer = useCallback(
    async (raw: string, timedOut = false) => {
      if (!current || checked || submittingRef.current) return;
      submittingRef.current = true;

      const normalized = normalizeAnswer(raw);
      const correct =
        !timedOut &&
        normalized.length > 0 &&
        normalized === normalizeAnswer(current.correct_answer);

      setChecked(true);
      setWasCorrect(correct);
      setCorrectCount((n) => n + (correct ? 1 : 0));
      setWrongCount((n) => n + (correct ? 0 : 1));

      if (!demo && userId) {
        try {
          const supabase = createClient();
          await supabase.from("user_det_answers").insert({
            user_id: userId,
            exercise_id: current.id,
            user_answer: timedOut ? raw || "(süre doldu)" : raw,
            is_correct: correct,
          });
        } catch {
          // UI devam etsin
        }
      }

      submittingRef.current = false;

      if (timedOut) {
        window.setTimeout(() => {
          setAnswer("");
          setChecked(false);
          setWasCorrect(false);
          setSecondsLeft(QUESTION_SECONDS);
          setIndex((i) => i + 1);
        }, 900);
      }
    },
    [checked, current, demo, userId]
  );

  useEffect(() => {
    if (loading || finished || checked || !current) return;

    setSecondsLeft(QUESTION_SECONDS);
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          void submitAnswer(answerRef.current, true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [checked, current, finished, index, loading, submitAnswer]);

  function goNext() {
    setAnswer("");
    setChecked(false);
    setWasCorrect(false);
    setSecondsLeft(QUESTION_SECONDS);
    submittingRef.current = false;
    setIndex((i) => i + 1);
  }

  const accuracy = useMemo(() => {
    const total = correctCount + wrongCount;
    if (total === 0) return 0;
    return Math.round((correctCount / total) * 100);
  }, [correctCount, wrongCount]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4">
        <p className="text-sm font-black uppercase tracking-widest text-duo-muted">Yükleniyor…</p>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-4 pb-10 pt-6">
        <section className="rounded-[1.75rem] border-2 border-[#58cc02]/40 bg-gradient-to-br from-[#58cc02]/15 to-duo-card p-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#58cc02]">
            Read and Complete
          </p>
          <h1 className="mt-3 text-2xl font-black text-white">Tebrikler!</h1>
          <p className="mt-2 text-sm font-bold text-duo-muted">
            Bugünkü Read and Complete alıştırmalarını tamamladın.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border-2 border-duo-border bg-[#0f1a1e] p-3">
              <p className="text-[10px] font-black uppercase text-duo-muted">Doğru</p>
              <p className="mt-1 text-2xl font-black text-[#58cc02]">{correctCount}</p>
            </div>
            <div className="rounded-2xl border-2 border-duo-border bg-[#0f1a1e] p-3">
              <p className="text-[10px] font-black uppercase text-duo-muted">Yanlış</p>
              <p className="mt-1 text-2xl font-black text-[#ff4b4b]">{wrongCount}</p>
            </div>
            <div className="rounded-2xl border-2 border-duo-border bg-[#0f1a1e] p-3">
              <p className="text-[10px] font-black uppercase text-duo-muted">Başarı</p>
              <p className="mt-1 text-2xl font-black text-white">%{accuracy}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setCorrectCount(0);
                setWrongCount(0);
                setAnswer("");
                setChecked(false);
                void load();
              }}
              className="rounded-2xl bg-[#58cc02] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_4px_0_#46a302]"
            >
              Tekrar çöz
            </button>
            <Link
              href="/"
              className="rounded-2xl border-2 border-duo-border px-4 py-3 text-sm font-black uppercase tracking-wide text-duo-muted"
            >
              Ana sayfa
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-10 pt-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1cb0f6]">
            DET · Read and Complete
          </p>
          <h1 className="mt-1 text-xl font-black text-white">Boşluk doldur</h1>
        </div>
        <Link
          href="/"
          className="rounded-xl border-2 border-duo-border bg-duo-card px-3 py-2 text-xs font-black uppercase tracking-wide text-duo-muted"
        >
          Ana sayfa
        </Link>
      </div>

      {demo && (
        <p className="mb-4 rounded-2xl border border-[#ffc800]/40 bg-[#ffc800]/10 px-3 py-2 text-center text-xs font-extrabold text-[#ffc800]">
          Demo sorular — canlıda Supabase havuzundan gelir
        </p>
      )}

      {error && !exercises.length && (
        <p className="mb-4 text-sm font-bold text-[#ff4b4b]">{error}</p>
      )}

      {current && (
        <section className="rounded-[1.75rem] border-2 border-duo-border bg-duo-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-wide text-duo-muted">
              Soru {index + 1} / {exercises.length}
            </p>
            <p
              className={`rounded-xl px-3 py-1 text-sm font-black tabular-nums ${
                secondsLeft <= 5 ? "bg-[#ff4b4b]/20 text-[#ff4b4b]" : "bg-[#1cb0f6]/15 text-[#1cb0f6]"
              }`}
            >
              {secondsLeft}s
            </p>
          </div>

          {current.topic && (
            <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-[#ce82ff]">
              {current.topic}
            </p>
          )}

          <p className="mt-4 text-lg font-extrabold leading-relaxed text-white">
            {renderCloze(current.question_text)}
          </p>

          <label className="mt-5 block">
            <span className="text-[10px] font-black uppercase tracking-wide text-duo-muted">
              Cevabın
            </span>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={checked}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !checked) {
                  e.preventDefault();
                  void submitAnswer(answer);
                }
              }}
              placeholder="Eksik kelimeyi yaz"
              className="mt-1 w-full rounded-2xl border-2 border-duo-border bg-[#0f1a1e] px-4 py-3 text-base font-bold text-white outline-none placeholder:text-duo-muted focus:border-[#1cb0f6] disabled:opacity-70"
              autoFocus
            />
          </label>

          {!checked ? (
            <button
              type="button"
              disabled={!answer.trim()}
              onClick={() => void submitAnswer(answer)}
              className="mt-4 w-full rounded-2xl bg-[#1cb0f6] py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_4px_0_#1899d6] disabled:opacity-50"
            >
              Kontrol Et
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <p
                className={`rounded-2xl border-2 px-4 py-3 text-sm font-extrabold ${
                  wasCorrect
                    ? "border-[#58cc02]/50 bg-[#58cc02]/15 text-[#58cc02]"
                    : "border-[#ff4b4b]/50 bg-[#ff4b4b]/15 text-[#ff4b4b]"
                }`}
              >
                {wasCorrect
                  ? "Doğru!"
                  : `Yanlış. Doğru cevap: ${current.correct_answer}`}
              </p>
              <button
                type="button"
                onClick={goNext}
                className="w-full rounded-2xl bg-[#58cc02] py-3.5 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_4px_0_#46a302]"
              >
                {index + 1 >= exercises.length ? "Sonuçları gör" : "Sonraki Soru"}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
