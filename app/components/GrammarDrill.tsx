"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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

type ApiItem = {
  question: string;
  correct_answer: string;
  explanation?: string;
  example?: string;
  difficulty?: number;
};

function cacheKey(slug: string) {
  return `mimo-grammar-q:${slug}`;
}

function readCache(slug: string): GrammarItem[] | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items?: GrammarItem[]; at?: number };
    if (!parsed.items?.length) return null;
    // Keep for 2 hours in this tab session
    if (parsed.at && Date.now() - parsed.at > 2 * 60 * 60 * 1000) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeCache(slug: string, items: GrammarItem[]) {
  try {
    sessionStorage.setItem(cacheKey(slug), JSON.stringify({ items, at: Date.now() }));
  } catch {
    // ignore quota
  }
}

function mapApiItems(topicId: number, rows: ApiItem[]): GrammarItem[] {
  return rows.map((row, j) => ({
    id: topicId * 1000 + j + 1,
    topic_id: topicId,
    question: row.question,
    correct_answer: row.correct_answer,
    explanation: row.explanation ?? null,
    example: row.example ?? null,
    difficulty: row.difficulty ?? 1,
    sort_order: j + 1,
  }));
}

export function GrammarDrill({ topic }: { topic: GrammarTopicDetail }) {
  const [items, setItems] = useState<GrammarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const loadQuestions = useCallback(
    async (forceAi = false) => {
      setLoading(true);
      setError(null);
      setFinished(false);
      setIndex(0);
      setAnswer("");
      setChecked(false);
      setCorrect(false);
      setCorrectCount(0);

      if (!forceAi) {
        const cached = readCache(topic.slug);
        if (cached?.length) {
          setItems(cached);
          setLoading(false);
          return;
        }
        // Hazır paket varsa API'ye bile gitme
        if (topic.items.length > 0) {
          setItems(topic.items);
          writeCache(topic.slug, topic.items);
          setLoading(false);
          return;
        }
      } else {
        try {
          sessionStorage.removeItem(cacheKey(topic.slug));
        } catch {
          // ignore
        }
      }

      try {
        const res = await fetch("/api/grammar/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: topic.slug,
            count: 10,
            forceAi,
          }),
        });
        const data = (await res.json()) as { items?: ApiItem[]; error?: string };
        if (!res.ok) {
          throw new Error(data.error || `Soru alınamadı (${res.status})`);
        }
        if (!data.items?.length) {
          throw new Error("Bu konu için soru gelmedi");
        }
        const mapped = mapApiItems(topic.id, data.items);
        writeCache(topic.slug, mapped);
        setItems(mapped);
      } catch (err) {
        if (topic.items.length > 0) {
          setItems(topic.items);
          setError(null);
        } else {
          setItems([]);
          setError(err instanceof Error ? err.message : "Soru alınamadı");
        }
      } finally {
        setLoading(false);
      }
    },
    [topic.id, topic.items, topic.slug]
  );

  useEffect(() => {
    void loadQuestions(false);
  }, [loadQuestions]);

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

  if (loading) {
    return (
      <PracticeExamMain className="px-4 pb-10">
        <PracticeExamStickyBar
          maxWidthClass="max-w-lg lg:max-w-3xl"
          left={<p className="text-sm font-extrabold text-mimo-title">{topic.title}</p>}
          exitHref="/grammar"
          exitLabel="Konular"
        />
        <PracticeExamStickySpacer />
        <div className="mx-auto max-w-lg lg:max-w-3xl space-y-3">
          <PracticeExamCard>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ce82ff]">Kural özeti</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-mimo-fg">{topic.summary}</p>
            {topic.tip_tr && (
              <p className="mt-3 rounded-xl bg-mimo-surface px-3 py-2 text-sm font-bold text-mimo-title">
                {topic.tip_tr}
              </p>
            )}
          </PracticeExamCard>
          <PracticeExamCard>
            <p className="text-center text-sm font-bold text-mimo-muted">
              {topic.title} için sorular hazırlanıyor…
            </p>
            <div
              className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-mimo-surface"
              aria-hidden
            >
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[#ce82ff]" />
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  if (error && !items.length) {
    return (
      <PracticeExamMain className="px-4 pb-10">
        <PracticeExamStickyBar
          maxWidthClass="max-w-lg lg:max-w-3xl"
          left={<p className="text-sm font-extrabold text-mimo-title">{topic.title}</p>}
          exitHref="/grammar"
          exitLabel="Konular"
        />
        <PracticeExamStickySpacer />
        <div className="mx-auto max-w-lg lg:max-w-3xl space-y-3">
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
            <p className="text-center text-sm font-bold text-[#b91c1c]">{error}</p>
            <div className="mt-4 flex flex-col gap-2">
              <PracticeExamPrimaryButton
                type="button"
                onClick={() => void loadQuestions(true)}
                className="w-full"
              >
                Tekrar dene
              </PracticeExamPrimaryButton>
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
          maxWidthClass="max-w-lg lg:max-w-3xl"
          left={<p className="text-sm font-extrabold text-mimo-title">{topic.title}</p>}
        />
        <PracticeExamStickySpacer />
        <div className="mx-auto max-w-lg lg:max-w-3xl text-center">
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
              <PracticeExamPrimaryButton
                type="button"
                onClick={() => void loadQuestions(true)}
                className="w-full"
              >
                AI ile yeni sorular
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
        maxWidthClass="max-w-lg lg:max-w-3xl"
        left={
          <p className="text-sm font-extrabold tabular-nums text-mimo-title">
            {index + 1} / {total}
          </p>
        }
        exitHref="/grammar"
      />
      <PracticeExamStickySpacer />

      <div className="mx-auto max-w-lg lg:max-w-3xl space-y-4">
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
          <button
            type="button"
            onClick={() => void loadQuestions(true)}
            className="underline-offset-2 hover:underline"
          >
            AI ile yeni sorular
          </button>
          {" · "}
          <Link href="/grammar" className="underline-offset-2 hover:underline">
            Tüm konular
          </Link>
        </p>
      </div>
    </PracticeExamMain>
  );
}
