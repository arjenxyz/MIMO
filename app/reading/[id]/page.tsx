"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContinueButton } from "@/app/components/ContinueButton";
import { LevelUpModal } from "@/app/components/LevelUpModal";
import { getProfile, saveStoryResult, updateProfileXP } from "@/lib/db";
import { DEMO_STORIES, isDemoMode } from "@/lib/demo";
import { answersMatch, calculateXP } from "@/lib/srs";
import { createClient } from "@/lib/supabase/client";
import type { Story } from "@/types";

export default function StoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    async function load() {
      const localDemo = isDemoMode(window.location.hostname);
      setDemo(localDemo);
      try {
        if (localDemo) {
          const found = DEMO_STORIES.find((s) => s.id === Number(params.id)) ?? null;
          setStory(found);
          return;
        }
        const supabase = createClient();
        const { data, error: storyError } = await supabase
          .from("stories")
          .select("*")
          .eq("id", Number(params.id))
          .maybeSingle();
        if (storyError) throw storyError;
        setStory(data as Story | null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Hikaye yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!story || saving) return;
    const result =
      (answersMatch(answers[0], story.answer1) ? 1 : 0) +
      (answersMatch(answers[1], story.answer2) ? 1 : 0) +
      (answersMatch(answers[2], story.answer3) ? 1 : 0);
    setScore(result);
    setSaving(true);
    setError("");
    try {
      if (!demo) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }
        await saveStoryResult(supabase, user.id, story.id, result);
        const profile = await getProfile(supabase, user.id);
        if (profile) {
          const xp = calculateXP(3, "story");
          const updated = await updateProfileXP(supabase, profile, xp);
          window.dispatchEvent(new Event("profile-updated"));
          if (updated.leveledUp) {
            setLevelUp(updated.profile.level);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sonuç kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center font-extrabold text-duo-muted">
        Hikaye açılıyor...
      </main>
    );
  }

  if (!story) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-center">
        <h1 className="text-2xl font-black">Hikaye bulunamadı.</h1>
        <div className="mt-6">
          <ContinueButton href="/reading">Geri Dön</ContinueButton>
        </div>
      </main>
    );
  }

  const questions = [story.question1, story.question2, story.question3];
  const expected = [story.answer1, story.answer2, story.answer3];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 pb-28 lg:pb-6">
      <p className="text-sm font-black uppercase text-duo-orange">Level {story.level}</p>
      <h1 className="mt-1 text-3xl font-black">{story.title}</h1>
      <article className="mt-5 whitespace-pre-wrap rounded-3xl border-2 border-duo-border bg-duo-card p-6 text-lg leading-8 font-semibold">
        {story.content}
      </article>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-3xl border-2 border-duo-border bg-duo-card p-6">
        <h2 className="text-xl font-black">3 soruyu cevapla</h2>
        {questions.map((question, i) => (
          <label key={question} className="block">
            <span className="font-extrabold">
              {i + 1}. {question}
            </span>
            <input
              value={answers[i]}
              disabled={score !== null}
              onChange={(e) =>
                setAnswers((prev) => {
                  const next = [...prev];
                  next[i] = e.target.value;
                  return next;
                })
              }
              className="mt-2 w-full rounded-2xl border-2 border-duo-border bg-duo-bg px-4 py-3 font-bold outline-none focus:border-duo-orange"
            />
            {score !== null && (
              <p className={`mt-1 text-sm font-bold ${answersMatch(answers[i], expected[i]) ? "text-duo-green" : "text-red-400"}`}>
                Doğru cevap: {expected[i]}
              </p>
            )}
          </label>
        ))}

        {score === null ? (
          <ContinueButton type="submit" disabled={saving || answers.some((value) => !value.trim())} variant="orange">
            {saving ? "Kaydediliyor..." : "Cevapları Kontrol Et"}
          </ContinueButton>
        ) : (
          <div className="space-y-4">
            <p className="rounded-2xl bg-duo-orange/15 px-4 py-3 text-center font-black text-duo-orange">
              Skor: {score}/3 · +20 XP kazandın
            </p>
            <ContinueButton href="/">Ana Sayfaya Dön</ContinueButton>
          </div>
        )}
        {error && <p className="text-sm font-bold text-red-400">{error}</p>}
      </form>

      {levelUp !== null && <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />}
    </main>
  );
}
