"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContinueButton } from "@/app/components/ContinueButton";
import { saveStoryResult } from "@/lib/db";
import { DEMO_STORIES, isDemoMode } from "@/lib/demo";
import { answersMatch } from "@/lib/srs";
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
        window.dispatchEvent(new Event("profile-updated"));
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
        <h1 className="text-2xl font-black">Hikaye bulunamadı</h1>
        <div className="mt-6">
          <ContinueButton href="/reading">Okumaya dön</ContinueButton>
        </div>
      </main>
    );
  }

  const expected = [story.answer1, story.answer2, story.answer3];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-28 lg:pb-6">
      <p className="text-sm font-black uppercase text-duo-orange">Seviye {story.level}</p>
      <h1 className="mt-1 text-3xl font-black">{story.title}</h1>
      <p className="mt-4 whitespace-pre-wrap text-base font-semibold leading-relaxed text-duo-muted">
        {story.content}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {[story.question1, story.question2, story.question3].map((q, i) => (
          <label key={q} className="block">
            <span className="text-sm font-extrabold text-white">{q}</span>
            <input
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
              disabled={score !== null}
              className="mt-2 w-full rounded-2xl border-2 border-duo-border bg-duo-card px-4 py-3 font-bold outline-none focus:border-duo-orange"
            />
            {score !== null && (
              <p
                className={`mt-1 text-sm font-bold ${
                  answersMatch(answers[i], expected[i]) ? "text-duo-green" : "text-red-400"
                }`}
              >
                Doğru cevap: {expected[i]}
              </p>
            )}
          </label>
        ))}

        {score === null ? (
          <ContinueButton
            type="submit"
            disabled={saving || answers.some((value) => !value.trim())}
            variant="orange"
          >
            {saving ? "Kaydediliyor..." : "Cevapları Kontrol Et"}
          </ContinueButton>
        ) : (
          <div className="space-y-4">
            <p className="rounded-2xl bg-duo-orange/15 px-4 py-3 text-center font-black text-duo-orange">
              Skor: {score}/3
            </p>
            <ContinueButton href="/">Ana Sayfaya Dön</ContinueButton>
          </div>
        )}
        {error && <p className="text-sm font-bold text-red-400">{error}</p>}
      </form>
    </main>
  );
}
