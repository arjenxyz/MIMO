"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContinueButton } from "@/app/components/ContinueButton";
import { LevelUpModal } from "@/app/components/LevelUpModal";
import { QualityButtons } from "@/app/components/QualityButtons";
import {
  assignNewWords,
  getDueWords,
  getProfile,
  updateProfileXP,
  updateWordProgress,
} from "@/lib/db";
import { DEMO_DUE_WORDS, isDemoMode } from "@/lib/demo";
import { answersMatch, calculateXP } from "@/lib/srs";
import { playWordAudio, speak } from "@/lib/speak";
import { WordImage } from "@/app/components/WordImage";
import { createClient } from "@/lib/supabase/client";
import type { DueWordItem, Quality } from "@/types";

export default function WordQuizPage() {
  const router = useRouter();
  const [items, setItems] = useState<DueWordItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [demo, setDemo] = useState(false);

  const current = items[index];
  const word = current?.words;

  useEffect(() => {
    async function boot() {
      const localDemo = isDemoMode(window.location.hostname);
      setDemo(localDemo);
      try {
        if (localDemo) {
          setItems(DEMO_DUE_WORDS);
          setLoading(false);
          return;
        }
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }
        let due = await getDueWords(supabase, user.id);
        if (due.length === 0) {
          await assignNewWords(supabase, user.id, 5);
          due = await getDueWords(supabase, user.id);
        }
        setItems(due);
      } catch (e) {
        if (localDemo) {
          setItems(DEMO_DUE_WORDS);
        } else {
          setError(e instanceof Error ? e.message : "Yüklenemedi");
        }
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [router]);

  const progressLabel = useMemo(() => {
    if (!items.length) return "0/0";
    return `${Math.min(index + 1, items.length)}/${items.length}`;
  }, [index, items.length]);

  function listen() {
    if (!word) return;
    setRevealed(true);
    playWordAudio(word.english, word.audio_url);
  }

  function listenExample() {
    if (!word?.example_sentence) return;
    speak(word.example_sentence);
  }

  function check(event: FormEvent) {
    event.preventDefault();
    if (!word) return;
    const ok = answersMatch(answer, word.turkish);
    setCorrect(ok);
    setChecked(true);
    setRevealed(true);
  }

  async function rate(quality: Quality) {
    if (!current || saving) return;
    setSaving(true);
    setError("");
    try {
      if (!demo) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        await updateWordProgress(supabase, current, quality, correct);
        const profile = await getProfile(supabase, user.id);
        if (profile) {
          const xp = calculateXP(quality, "word");
          const result = await updateProfileXP(supabase, profile, xp);
          window.dispatchEvent(new Event("profile-updated"));
          if (result.leveledUp) {
            setLevelUp(result.profile.level);
          }
        }
      }
      const nextIndex = index + 1;
      if (nextIndex >= items.length) {
        setFinished(true);
      } else {
        setIndex(nextIndex);
        setAnswer("");
        setChecked(false);
        setCorrect(false);
        setRevealed(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center font-extrabold text-duo-muted">
        Kelimeler hazırlanıyor...
      </main>
    );
  }

  if (finished) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <p className="text-6xl">🎯</p>
        <h1 className="mt-4 text-3xl font-black">Bugünlük kelimelerin bitti!</h1>
        <div className="mt-6 w-full">
          <ContinueButton href="/">Ana Sayfaya Dön</ContinueButton>
        </div>
      </main>
    );
  }

  if (!word) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-black">Şu an eklenecek kelime kalmadı.</h1>
        <div className="mt-6 w-full">
          <ContinueButton href="/">Ana Sayfaya Dön</ContinueButton>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-6 pb-28 lg:pb-6">
      <p className="mb-4 text-center text-sm font-extrabold text-duo-muted">{progressLabel}</p>
      <section className="rounded-3xl border-2 border-duo-border bg-duo-card p-6">
        <div className="mb-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={listen}
            className="rounded-2xl bg-duo-blue px-5 py-3 font-black shadow-duo-blue active:translate-y-1 active:shadow-none"
          >
            🔊 Dinle
          </button>
          {word.example_sentence && (
            <button
              type="button"
              onClick={listenExample}
              className="rounded-2xl border-2 border-duo-border px-5 py-3 font-black text-duo-muted"
            >
              Cümle
            </button>
          )}
        </div>

        <p className="text-center text-sm font-bold uppercase tracking-wide text-duo-muted">
          Türkçe karşılığını yaz
        </p>
        <h1 className="mt-2 min-h-16 text-center text-4xl font-black">
          {revealed ? word.english : "••••••"}
        </h1>
        {revealed && (
          <div className="mx-auto mt-4 max-w-sm overflow-hidden rounded-2xl border-2 border-duo-border">
            <WordImage english={word.english} className="h-40 w-full object-cover" alt="" />
          </div>
        )}
        {revealed && word.example_sentence && (
          <p className="mt-3 text-center font-semibold text-duo-muted">{word.example_sentence}</p>
        )}

        <form onSubmit={check} className="mt-6 space-y-4">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={checked}
            placeholder="Türkçe anlam"
            className="w-full rounded-2xl border-2 border-duo-border bg-duo-bg px-4 py-4 text-center text-lg font-bold outline-none focus:border-duo-green"
          />
          {!checked && (
            <ContinueButton type="submit" disabled={!answer.trim()}>
              GÖNDER
            </ContinueButton>
          )}
        </form>

        {checked && (
          <div className="mt-6 space-y-4">
            <div
              className={`rounded-2xl px-4 py-3 font-extrabold ${
                correct ? "bg-duo-green/15 text-duo-green" : "bg-red-500/15 text-red-400"
              }`}
            >
              {correct ? "Doğru!" : `Yanlış. Doğru cevap: ${word.turkish}`}
            </div>
            <QualityButtons onSelect={rate} disabled={saving} />
          </div>
        )}
        {error && <p className="mt-4 text-sm font-bold text-red-400">{error}</p>}
      </section>

      {levelUp !== null && <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />}
    </main>
  );
}
