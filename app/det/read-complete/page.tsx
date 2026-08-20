"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClozePassage, scoreCloze } from "@/app/components/det/ClozePassage";
import { extractGaps, formatTimer, parseClozePassage } from "@/lib/detCloze";
import { DEMO_DET_READ_COMPLETE, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/client";
import type { DETExercise } from "@/types";

const PASSAGE_SECONDS = 3 * 60;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ReadCompletePage() {
  const [exercises, setExercises] = useState<DETExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PASSAGE_SECONDS);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const timedOutRef = useRef(false);

  const finished = exercises.length > 0 && index >= exercises.length;
  const current = !finished ? exercises[index] : null;

  const gaps = useMemo(() => {
    if (!current) return [];
    return extractGaps(parseClozePassage(current.question_text, current.correct_answer));
  }, [current]);

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
        setExercises(shuffle(DEMO_DET_READ_COMPLETE));
        setDemo(true);
        setError("Havuz boş — demo pasajlar gösteriliyor.");
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

  useEffect(() => {
    setValues({});
    setChecked(false);
    setPaused(false);
    setSecondsLeft(PASSAGE_SECONDS);
    timedOutRef.current = false;
  }, [index, current?.id]);

  const finalize = useCallback(
    async (timedOut = false) => {
      if (!current || checked) return;
      setChecked(true);
      timedOutRef.current = timedOut;

      const score = scoreCloze(gaps, values);
      setCorrectCount((n) => n + score.correct);
      setWrongCount((n) => n + score.wrong);

      if (!demo && userId) {
        try {
          const supabase = createClient();
          const userAnswer = gaps
            .map((g) => `${g.answer.slice(0, g.shown)}${(values[g.id] || "").replace(/·/g, "")}`)
            .join(" | ");
          await supabase.from("user_det_answers").insert({
            user_id: userId,
            exercise_id: current.id,
            user_answer: timedOut ? `${userAnswer} (süre doldu)` : userAnswer,
            is_correct: score.wrong === 0 && score.total > 0,
          });
        } catch {
          // ignore
        }
      }
    },
    [checked, current, demo, gaps, userId, values]
  );

  useEffect(() => {
    if (loading || finished || checked || paused || !current) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          void finalize(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [checked, current, finalize, finished, loading, paused]);

  function goNext() {
    setIndex((i) => i + 1);
  }

  const accuracy = useMemo(() => {
    const total = correctCount + wrongCount;
    if (total === 0) return 0;
    return Math.round((correctCount / total) * 100);
  }, [correctCount, wrongCount]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#64748b]">
        <p className="text-sm font-bold uppercase tracking-widest">Loading…</p>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-[#f3f4f6] px-4 py-8 text-[#0f172a]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#e2e8f0] bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">
            Read and Complete
          </p>
          <h1 className="mt-3 text-2xl font-black">Well done!</h1>
          <p className="mt-2 text-sm font-semibold text-[#64748b]">
            Bugünkü Read and Complete alıştırmalarını tamamladın.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#ecfce5] p-3">
              <p className="text-[10px] font-bold uppercase text-[#3f6212]">Doğru</p>
              <p className="mt-1 text-2xl font-black text-[#58cc02]">{correctCount}</p>
            </div>
            <div className="rounded-xl bg-[#ffe8e8] p-3">
              <p className="text-[10px] font-bold uppercase text-[#9f1239]">Yanlış</p>
              <p className="mt-1 text-2xl font-black text-[#ff4b4b]">{wrongCount}</p>
            </div>
            <div className="rounded-xl bg-[#e8f6fe] p-3">
              <p className="text-[10px] font-bold uppercase text-[#075985]">Başarı</p>
              <p className="mt-1 text-2xl font-black text-[#0ea5e9]">%{accuracy}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setCorrectCount(0);
                setWrongCount(0);
                void load();
              }}
              className="rounded-2xl bg-[#1cb0f6] px-4 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              Tekrar çöz
            </button>
            <Link
              href="/"
              className="rounded-2xl border border-[#e2e8f0] px-4 py-3 text-sm font-bold text-[#64748b]"
            >
              Ana sayfa
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-5">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p
              className={`text-2xl font-black tabular-nums tracking-tight ${
                secondsLeft <= 30 ? "text-[#ff4b4b]" : "text-[#1e3a5f]"
              }`}
            >
              {formatTimer(secondsLeft)}
            </p>
            <button
              type="button"
              aria-label={paused ? "Devam" : "Duraklat"}
              onClick={() => setPaused((p) => !p)}
              disabled={checked}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d0d7de] bg-white text-[#1e3a5f] shadow-sm disabled:opacity-50"
            >
              {paused ? "▶" : "❚❚"}
            </button>
          </div>
          <Link href="/" className="text-sm font-bold text-[#64748b] hover:text-[#0f172a]">
            Çık
          </Link>
        </div>

        <p className="mb-5 text-center text-base font-bold text-[#0f172a] sm:text-lg">
          Type the missing letters to complete the text below.
        </p>

        {(demo || error) && (
          <p className="mb-4 text-center text-xs font-semibold text-[#b45309]">
            {error || "Demo pasaj — canlıda Supabase havuzundan gelir"}
          </p>
        )}

        {current && (
          <section className="rounded-2xl border border-[#e5e7eb] bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
            <h1 className="mb-5 text-center text-lg font-black text-[#1e3a5f] sm:text-xl">
              {current.topic || "Read and Complete"}
            </h1>

            <ClozePassage
              questionText={current.question_text}
              fallbackAnswer={current.correct_answer}
              values={values}
              onChange={(id, value) => setValues((prev) => ({ ...prev, [id]: value }))}
              disabled={checked || paused}
              showResults={checked}
            />

            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {!checked ? (
                <button
                  type="button"
                  onClick={() => void finalize(false)}
                  className="rounded-2xl bg-[#1cb0f6] px-8 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_3px_0_#1899d6]"
                >
                  Kontrol Et
                </button>
              ) : (
                <>
                  <p className="mb-2 w-full text-center text-sm font-bold text-[#64748b] sm:mb-0">
                    {timedOutRef.current ? "Süre doldu. " : ""}
                    Bu pasajda {scoreCloze(gaps, values).correct}/{gaps.length} boşluk doğru.
                  </p>
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-2xl bg-[#58cc02] px-8 py-3 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_3px_0_#46a302]"
                  >
                    {index + 1 >= exercises.length ? "Sonuçlar" : "Sonraki pasaj"}
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        <p className="mt-4 text-center text-xs font-semibold text-[#94a3b8]">
          Pasaj {Math.min(index + 1, exercises.length)} / {exercises.length}
        </p>
      </div>
    </main>
  );
}
