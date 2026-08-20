"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContinueButton } from "@/app/components/ContinueButton";
import { LevelUpModal } from "@/app/components/LevelUpModal";
import { QualityButtons } from "@/app/components/QualityButtons";
import {
  assignNewGrammar,
  getDueGrammar,
  getProfile,
  updateGrammarProgress,
  updateProfileXP,
} from "@/lib/db";
import { DEMO_DUE_GRAMMAR, isDemoMode } from "@/lib/demo";
import { answersMatch, calculateXP } from "@/lib/srs";
import { createClient } from "@/lib/supabase/client";
import type { DueGrammarItem, Quality } from "@/types";

export default function GrammarQuizPage() {
  const router = useRouter();
  const [items, setItems] = useState<DueGrammarItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [demo, setDemo] = useState(false);

  const current = items[index];
  const rule = current?.grammar_rules;

  useEffect(() => {
    async function boot() {
      const localDemo = isDemoMode(window.location.hostname);
      setDemo(localDemo);
      try {
        if (localDemo) {
          setItems(DEMO_DUE_GRAMMAR);
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
        let due = await getDueGrammar(supabase, user.id);
        if (due.length === 0) {
          await assignNewGrammar(supabase, user.id, 3);
          due = await getDueGrammar(supabase, user.id);
        }
        setItems(due);
      } catch (err) {
        if (localDemo) setItems(DEMO_DUE_GRAMMAR);
        else setError(err instanceof Error ? err.message : "Gramer yüklenemedi.");
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

  function check(event: FormEvent) {
    event.preventDefault();
    if (!rule) return;
    setCorrect(answersMatch(answer, rule.correct_answer));
    setChecked(true);
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
        await updateGrammarProgress(supabase, current, quality, correct);
        const profile = await getProfile(supabase, user.id);
        if (profile) {
          const xp = calculateXP(quality, "grammar");
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
        Gramer soruları hazırlanıyor...
      </main>
    );
  }

  if (finished) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <p className="text-6xl">📘</p>
        <h1 className="mt-4 text-3xl font-black">Bugünlük gramer bitti!</h1>
        <div className="mt-6 w-full">
          <ContinueButton href="/">Ana Sayfaya Dön</ContinueButton>
        </div>
      </main>
    );
  }

  if (!rule) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-black">Şu an eklenecek gramer kalmadı.</h1>
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
        <p className="text-center text-sm font-black uppercase tracking-wide text-duo-purple">
          {rule.title}
        </p>
        <h1 className="mt-4 text-center text-2xl font-black leading-snug">{rule.question}</h1>

        <form onSubmit={check} className="mt-6 space-y-4">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={checked}
            placeholder="Cevabı yaz"
            className="w-full rounded-2xl border-2 border-duo-border bg-duo-bg px-4 py-4 text-center text-lg font-bold outline-none focus:border-duo-purple"
          />
          {!checked && (
            <ContinueButton type="submit" disabled={!answer.trim()} variant="purple">
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
              {correct ? "Doğru!" : `Yanlış. Doğru cevap: ${rule.correct_answer}`}
            </div>
            {rule.explanation && (
              <p className="rounded-2xl bg-duo-bg px-4 py-3 font-semibold text-duo-muted">
                {rule.explanation}
              </p>
            )}
            {rule.example && (
              <p className="font-bold text-duo-blue">Örnek: {rule.example}</p>
            )}
            <QualityButtons onSelect={rate} disabled={saving} />
          </div>
        )}
        {error && <p className="mt-4 text-sm font-bold text-red-400">{error}</p>}
      </section>

      {levelUp !== null && <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />}
    </main>
  );
}
