"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClozePassage, scoreCloze } from "@/app/components/det/ClozePassage";
import { extractGaps, formatTimer, parseClozePassage } from "@/lib/detCloze";
import { DEMO_DET_READ_COMPLETE, isDemoMode } from "@/lib/demo";
import { playFeedback } from "@/lib/feedbackSound";
import type { DETExercise } from "@/types";

const PASSAGE_SECONDS = 3 * 60;
const SESSION_SIZE = 4;
const RECENT_TOPICS_KEY = "mimo-det-rc-topics";
const RECENT_IDS_KEY = "mimo-det-rc-recent";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function readRecentTopics(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_TOPICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function writeRecentTopics(topics: string[]) {
  try {
    sessionStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(topics.slice(-16)));
  } catch {
    // ignore
  }
}

function readRecentIds(): number[] {
  try {
    const raw = sessionStorage.getItem(RECENT_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function writeRecentIds(ids: number[]) {
  try {
    sessionStorage.setItem(RECENT_IDS_KEY, JSON.stringify(ids.slice(-24)));
  } catch {
    // ignore
  }
}

function pickSession(pool: DETExercise[], count = SESSION_SIZE) {
  const recent = new Set(readRecentIds());
  const fresh = pool.filter((ex) => !recent.has(ex.id));
  const source = fresh.length >= count ? fresh : pool;
  const picked = shuffle(source).slice(0, Math.min(count, source.length));
  writeRecentIds([...readRecentIds(), ...picked.map((ex) => ex.id)]);
  return picked;
}

function detectDemoClient() {
  if (typeof window === "undefined") return isDemoMode(null);
  return isDemoMode(window.location.hostname);
}

function isSyntheticId(id: number) {
  return id < 0;
}

export default function ReadCompletePage() {
  const [mounted, setMounted] = useState(false);
  const [exercises, setExercises] = useState<DETExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PASSAGE_SECONDS);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [aiSource, setAiSource] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const timedOutRef = useRef(false);
  const loadGenRef = useRef(0);

  const finished = exercises.length > 0 && index >= exercises.length;
  const current = !finished ? exercises[index] : null;

  const gaps = useMemo(() => {
    if (!current) return [];
    return extractGaps(parseClozePassage(current.question_text, current.correct_answer));
  }, [current]);

  const startSession = useCallback((list: DETExercise[], opts?: { demo?: boolean; ai?: boolean; message?: string }) => {
    setExercises(list);
    setIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setValues({});
    setChecked(false);
    setPaused(false);
    setSecondsLeft(PASSAGE_SECONDS);
    timedOutRef.current = false;
    setDemo(Boolean(opts?.demo));
    setAiSource(Boolean(opts?.ai));
    setError(opts?.message ?? "");
    setReady(true);
    setGenerating(false);

    const topics = list.map((ex) => ex.topic).filter((t): t is string => Boolean(t));
    if (topics.length > 0) {
      writeRecentTopics([...readRecentTopics(), ...topics]);
    }
  }, []);

  const loadAiSession = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setGenerating(true);
    setError("");
    setReady(true);

    const localDemo = detectDemoClient();
    if (!localDemo) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        setUserId(data.user?.id ?? null);
      } catch {
        setUserId(null);
      }
    } else {
      setUserId(null);
    }

    try {
      const res = await fetch("/api/det/generate-cloze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: SESSION_SIZE,
          avoidTopics: readRecentTopics(),
        }),
      });

      const payload = (await res.json()) as {
        exercises?: DETExercise[];
        error?: string;
      };

      if (gen !== loadGenRef.current) return;

      if (!res.ok || !payload.exercises?.length) {
        throw new Error(payload.error || "Yeni pasaj üretilemedi");
      }

      startSession(payload.exercises, { ai: true });
    } catch (e) {
      if (gen !== loadGenRef.current) return;
      const message = e instanceof Error ? e.message : "Yeni pasaj üretilemedi";
      startSession(pickSession(DEMO_DET_READ_COMPLETE), {
        demo: true,
        message: `${message} — yedek pasajlar gösteriliyor.`,
      });
    }
  }, [startSession]);

  useEffect(() => {
    setMounted(true);
    void loadAiSession();
  }, [loadAiSession]);

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
      playFeedback(score.wrong === 0 && score.total > 0);

      // AI-generated rows use negative ids — no FK in det_exercises.
      if (!demo && userId && !isSyntheticId(current.id)) {
        try {
          const { createClient } = await import("@/lib/supabase/client");
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
    if (!ready || generating || finished || checked || paused || !current) return;

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
  }, [checked, current, finalize, finished, generating, paused, ready]);

  function goNext() {
    setIndex((i) => i + 1);
  }

  const accuracy = useMemo(() => {
    const total = correctCount + wrongCount;
    if (total === 0) return 0;
    return Math.round((correctCount / total) * 100);
  }, [correctCount, wrongCount]);

  if (!mounted || !ready) {
    return (
      <main className="min-h-screen bg-mimo-bg text-mimo-fg">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-5">
          <div className="text-center text-sm font-bold text-mimo-muted">Loading…</div>
        </div>
      </main>
    );
  }

  if (generating) {
    return (
      <main className="min-h-screen bg-mimo-bg text-mimo-fg">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">
            Read and Complete
          </p>
          <h1 className="mt-3 text-xl font-black">Yeni pasajlar hazırlanıyor…</h1>
          <p className="mt-2 text-sm font-semibold text-mimo-muted">
            Yapay zeka her seferinde farklı cümleler üretiyor.
          </p>
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-mimo-bg px-4 py-8 text-mimo-fg">
        <div className="mx-auto max-w-xl rounded-2xl border border-mimo-soft bg-mimo-card p-6 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">
            Read and Complete
          </p>
          <h1 className="mt-3 text-2xl font-black">Well done!</h1>
          <p className="mt-2 text-sm font-semibold text-mimo-muted">
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
                void loadAiSession();
              }}
              className="rounded-2xl bg-[#1cb0f6] px-4 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              Yeni pasajlar
            </button>
            <Link
              href="/"
              className="rounded-2xl border border-mimo-soft px-4 py-3 text-sm font-bold text-mimo-muted"
            >
              Ana sayfa
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mimo-bg text-mimo-fg">
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-5">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p
              className={`text-2xl font-black tabular-nums tracking-tight ${
                secondsLeft <= 30 ? "text-[#ff4b4b]" : "text-mimo-title"
              }`}
            >
              {formatTimer(secondsLeft)}
            </p>
            <button
              type="button"
              aria-label={paused ? "Devam" : "Duraklat"}
              onClick={() => setPaused((p) => !p)}
              disabled={checked}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-mimo-border bg-mimo-card text-mimo-title shadow-sm disabled:opacity-50"
            >
              {paused ? "▶" : "❚❚"}
            </button>
          </div>
          <Link href="/" className="text-sm font-bold text-mimo-muted hover:text-mimo-fg">
            Çık
          </Link>
        </div>

        <p className="mb-5 text-center text-base font-bold text-mimo-fg sm:text-lg">
          Type the missing letters to complete the text below.
        </p>

        {(error || aiSource) && (
          <p className="mb-4 text-center text-xs font-semibold text-mimo-muted">
            {error || "Yapay zeka ile üretilen yeni pasajlar"}
          </p>
        )}

        {current && (
          <section className="rounded-2xl border border-mimo-border bg-mimo-card px-5 py-6 shadow-sm sm:px-8 sm:py-8">
            <h1 className="mb-5 text-center text-lg font-black text-mimo-title sm:text-xl">
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

            <div className="mt-8 flex flex-col items-center gap-3">
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
                  {(() => {
                    const score = scoreCloze(gaps, values);
                    return (
                      <p className="text-center text-sm font-bold text-mimo-muted">
                        {timedOutRef.current ? "Süre doldu. " : ""}
                        Bu pasajda {score.correct}/{gaps.length} boşluk doğru.
                        {score.wrong > 0
                          ? " Yanlışlarda doğru kelime gösterildi — öğrenip devam et."
                          : ""}
                      </p>
                    );
                  })()}
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

        <p className="mt-4 text-center text-xs font-semibold text-mimo-muted">
          Pasaj {Math.min(index + 1, Math.max(exercises.length, 1))} / {exercises.length || 1}
        </p>
      </div>
    </main>
  );
}
