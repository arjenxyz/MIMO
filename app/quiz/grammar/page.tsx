"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LevelUpModal } from "@/app/components/LevelUpModal";
import {
  PracticeExamCard,
  PracticeExamEyebrow,
  PracticeExamGhostLink,
  PracticeExamMain,
  PracticeExamPrimaryButton,
  PracticeExamTopBar,
} from "@/app/components/PracticeExamChrome";
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
    if (!items.length) return "0 / 0";
    return `${Math.min(index + 1, items.length)} / ${items.length}`;
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
      <PracticeExamMain>
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-16 text-center">
          <p className="text-sm font-bold text-mimo-muted">Gramer soruları hazırlanıyor…</p>
        </div>
      </PracticeExamMain>
    );
  }

  if (finished) {
    return (
      <PracticeExamMain>
        <div className="mx-auto max-w-xl px-4 py-8">
          <PracticeExamCard className="text-center">
            <PracticeExamEyebrow>Grammar</PracticeExamEyebrow>
            <h1 className="mt-3 text-2xl font-black">Well done!</h1>
            <p className="mt-2 text-sm font-semibold text-mimo-muted">
              Bugünlük gramer alıştırmalarını tamamladın.
            </p>
            <div className="mt-6">
              <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  if (!rule) {
    return (
      <PracticeExamMain>
        <div className="mx-auto max-w-xl px-4 py-8">
          <PracticeExamCard className="text-center">
            <h1 className="text-2xl font-black">Şu an eklenecek gramer kalmadı.</h1>
            <div className="mt-6">
              <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  return (
    <PracticeExamMain>
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-5">
        <PracticeExamTopBar
          left={<p className="text-sm font-bold text-mimo-muted">Soru {progressLabel}</p>}
        />

        <p className="mb-5 text-center text-base font-bold text-mimo-fg sm:text-lg">
          Complete the grammar exercise below.
        </p>

        <PracticeExamCard>
          <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-mimo-muted">
            {rule.title}
          </p>
          <h1 className="mt-4 text-center text-xl font-black leading-snug text-mimo-title sm:text-2xl">
            {rule.question}
          </h1>

          <form onSubmit={check} className="mt-6 space-y-4">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={checked}
              placeholder="Cevabı yaz"
              className="w-full rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-4 text-center text-lg font-bold text-mimo-fg outline-none placeholder:text-mimo-muted focus:border-[#1cb0f6] disabled:opacity-70"
            />
            {!checked && (
              <div className="flex justify-center">
                <PracticeExamPrimaryButton type="submit" disabled={!answer.trim()}>
                  Kontrol Et
                </PracticeExamPrimaryButton>
              </div>
            )}
          </form>

          {checked && (
            <div className="mt-6 space-y-4">
              <div
                className={`rounded-xl px-4 py-3 text-center text-sm font-extrabold ${
                  correct
                    ? "bg-[#ecfce5] text-[#15803d]"
                    : "bg-[#ffe8e8] text-[#b91c1c]"
                }`}
              >
                {correct ? "Doğru!" : `Yanlış. Doğru cevap: ${rule.correct_answer}`}
              </div>
              {rule.explanation && (
                <div className="rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-3 text-sm font-semibold text-mimo-muted">
                  {rule.explanation}
                </div>
              )}
              {rule.example && (
                <p className="text-center text-sm font-bold text-[#0369a1]">
                  Örnek: {rule.example}
                </p>
              )}
              <QualityButtons onSelect={rate} disabled={saving} />
            </div>
          )}
          {error && <p className="mt-4 text-center text-sm font-bold text-[#b91c1c]">{error}</p>}
        </PracticeExamCard>
      </div>

      {levelUp !== null && <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />}
    </PracticeExamMain>
  );
}
