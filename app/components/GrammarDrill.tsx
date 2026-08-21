"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  PracticeExamCard,
  PracticeExamGhostLink,
  PracticeExamMain,
  PracticeExamPrimaryButton,
  PracticeExamStickyBar,
  PracticeExamStickySpacer,
} from "@/app/components/PracticeExamChrome";
import { playFeedback } from "@/lib/feedbackSound";
import type { GrammarItem, GrammarTopicDetail } from "@/lib/grammarTopics";
import { answersMatch } from "@/lib/srs";

export function GrammarDrill({ topic }: { topic: GrammarTopicDetail }) {
  const items = useMemo(() => topic.items, [topic.items]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const current: GrammarItem | undefined = items[index];
  const total = items.length;

  function check(event: FormEvent) {
    event.preventDefault();
    if (!current || checked) return;
    const ok = answersMatch(answer, current.correct_answer);
    setCorrect(ok);
    setChecked(true);
    playFeedback(ok);
    if (ok) setCorrectCount((n) => n + 1);
  }

  function goNext() {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setAnswer("");
    setChecked(false);
    setCorrect(false);
  }

  function restart() {
    setIndex(0);
    setAnswer("");
    setChecked(false);
    setCorrect(false);
    setCorrectCount(0);
    setFinished(false);
  }

  if (!items.length) {
    return (
      <PracticeExamMain className="px-4 pb-10">
        <PracticeExamStickyBar
          maxWidthClass="max-w-lg"
          left={<p className="text-sm font-extrabold text-mimo-title">{topic.title}</p>}
          exitHref="/grammar"
          exitLabel="Konular"
        />
        <PracticeExamStickySpacer />
        <div className="mx-auto max-w-lg space-y-3">
          <PracticeExamCard>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ce82ff]">Kural özeti</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-mimo-fg">{topic.summary}</p>
            {topic.tip_tr && (
              <p className="mt-3 rounded-xl bg-mimo-surface px-3 py-2 text-sm font-bold text-mimo-title">
                {topic.tip_tr}
              </p>
            )}
            {topic.example && (
              <p className="mt-3 text-sm font-semibold italic text-mimo-muted">Örnek: {topic.example}</p>
            )}
          </PracticeExamCard>
          <PracticeExamCard>
            <p className="text-center text-sm font-bold text-mimo-muted">
              Bu konuda alıştırma soruları yakında eklenecek.
            </p>
            <div className="mt-4">
              <PracticeExamGhostLink href="/grammar">Tüm konulara dön</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  if (finished) {
    const wrong = total - correctCount;
    return (
      <PracticeExamMain className="px-4 pb-10">
        <PracticeExamStickyBar
          maxWidthClass="max-w-lg"
          left={<p className="text-sm font-extrabold text-mimo-title">{topic.title}</p>}
        />
        <PracticeExamStickySpacer />
        <div className="mx-auto max-w-lg text-center">
          <PracticeExamCard>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1cb0f6]">Tur bitti</p>
            <h1 className="mt-2 text-2xl font-black text-mimo-title">Özet</h1>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#ecfce5] p-3">
                <p className="text-[10px] font-bold uppercase text-[#3f6212]">Doğru</p>
                <p className="mt-1 text-2xl font-black text-[#58cc02]">{correctCount}</p>
              </div>
              <div className="rounded-xl bg-[#ffe8e8] p-3">
                <p className="text-[10px] font-bold uppercase text-[#9f1239]">Yanlış</p>
                <p className="mt-1 text-2xl font-black text-[#ff4b4b]">{wrong}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <PracticeExamPrimaryButton onClick={restart} variant="green" className="w-full">
                Tekrar çöz
              </PracticeExamPrimaryButton>
              <PracticeExamGhostLink href="/grammar">Konulara dön</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  return (
    <PracticeExamMain className="px-4 pb-10">
      <PracticeExamStickyBar
        maxWidthClass="max-w-lg"
        left={
          <p className="text-sm font-extrabold tabular-nums text-mimo-title">
            {index + 1} / {total}
          </p>
        }
        exitHref="/grammar"
      />
      <PracticeExamStickySpacer />

      <div className="mx-auto max-w-lg space-y-4">
        <section className="rounded-2xl border border-mimo-border bg-mimo-card px-4 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1cb0f6]">
            Kural
          </p>
          <h1 className="mt-1 text-lg font-black text-mimo-title">{topic.title}</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-mimo-muted">
            {topic.summary}
          </p>
          {topic.tip_tr && (
            <p className="mt-2 rounded-xl bg-mimo-surface px-3 py-2 text-xs font-bold text-mimo-fg">
              {topic.tip_tr}
            </p>
          )}
          {topic.example && (
            <p className="mt-2 text-xs font-semibold italic text-mimo-muted">
              Örn: {topic.example}
            </p>
          )}
        </section>

        <PracticeExamCard>
          <form onSubmit={check} className="space-y-4">
            <p className="text-base font-bold leading-relaxed text-mimo-fg sm:text-lg">
              {current?.question}
            </p>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={checked}
              autoComplete="off"
              placeholder="Cevabını yaz…"
              className="w-full rounded-xl border border-mimo-soft bg-mimo-surface px-4 py-3 text-sm font-semibold text-mimo-fg outline-none placeholder:text-mimo-muted focus:border-[#1cb0f6] disabled:opacity-70"
            />

            {!checked ? (
              <PracticeExamPrimaryButton type="submit" disabled={!answer.trim()} className="w-full">
                Kontrol et
              </PracticeExamPrimaryButton>
            ) : (
              <div className="space-y-3">
                <p
                  className={`rounded-xl px-3 py-2 text-sm font-bold ${
                    correct
                      ? "bg-[#ecfce5] text-[#15803d]"
                      : "bg-[#e8f6fe] text-[#0369a1]"
                  }`}
                >
                  {correct ? "Doğru!" : `Doğru cevap: ${current?.correct_answer}`}
                </p>
                {current?.explanation && (
                  <p className="text-sm font-semibold text-mimo-muted">{current.explanation}</p>
                )}
                <PracticeExamPrimaryButton
                  type="button"
                  onClick={goNext}
                  variant="green"
                  className="w-full"
                >
                  {index + 1 >= total ? "Özet" : "Devam"}
                </PracticeExamPrimaryButton>
              </div>
            )}
          </form>
        </PracticeExamCard>

        <p className="text-center text-xs font-semibold text-mimo-muted">
          <Link href="/grammar" className="underline-offset-2 hover:underline">
            Tüm konular
          </Link>
        </p>
      </div>
    </PracticeExamMain>
  );
}
