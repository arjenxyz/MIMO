"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PracticeExamCard,
  PracticeExamExitLink,
  PracticeExamEyebrow,
  PracticeExamMain,
  PracticeExamPrimaryButton,
} from "@/app/components/PracticeExamChrome";
import { playFeedback } from "@/lib/feedbackSound";
import { playWordAudio, primeWordAudio } from "@/lib/speak";
import { PACK_QUIZ_MIN_QUESTIONS, PACK_QUIZ_PASS_SCORE } from "@/lib/packUnlock";
import type { Word } from "@/types";

const DISTRACTOR_POOL = [
  "mutlu",
  "hızlı",
  "sessiz",
  "büyük",
  "küçük",
  "güzel",
  "zor",
  "kolay",
  "sıcak",
  "soğuk",
  "eski",
  "yeni",
  "doğru",
  "yanlış",
  "güçlü",
  "zayıf",
];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function primaryMeaning(turkish: string) {
  return turkish.split(/[/|,;]/)[0]?.trim() || turkish.trim();
}

function buildChoices(correctTurkish: string, peers: string[]) {
  const correct = primaryMeaning(correctTurkish);
  const fromPeers = peers
    .map(primaryMeaning)
    .filter((t) => t && t.toLowerCase() !== correct.toLowerCase());
  const fromPool = DISTRACTOR_POOL.filter(
    (t) => t.toLowerCase() !== correct.toLowerCase() && !fromPeers.includes(t)
  );
  const distractors = shuffle([...fromPeers, ...fromPool]).slice(0, 3);
  while (distractors.length < 3) {
    distractors.push(`seçenek ${distractors.length + 1}`);
  }
  return shuffle([correct, ...distractors.slice(0, 3)]);
}

type QuizWord = Pick<
  Word,
  | "id"
  | "english"
  | "turkish"
  | "phonetic"
  | "audio_url"
  | "created_by"
  | "uploader_username"
  | "uploader_avatar_url"
  | "is_global"
>;

export default function AuthorPackQuizPage() {
  const params = useParams();
  const router = useRouter();
  const authorId = typeof params.authorId === "string" ? params.authorId : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("öğrenci");
  const [alreadyUnlocked, setAlreadyUnlocked] = useState(false);
  const [canAttempt, setCanAttempt] = useState(false);
  const [passScore, setPassScore] = useState(PACK_QUIZ_PASS_SCORE);
  const [words, setWords] = useState<QuizWord[]>([]);
  const [peers, setPeers] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<
    Array<{ wordId: number; selectedTurkish: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    unlocked: boolean;
    correctCount: number;
    total: number;
  } | null>(null);

  const current = words[index] ?? null;
  const progress = useMemo(
    () => (words.length ? Math.round(((index + (checked ? 1 : 0)) / words.length) * 100) : 0),
    [words.length, index, checked]
  );

  const load = useCallback(async () => {
    if (!authorId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers([]);
    setIndex(0);
    setSelected(null);
    setChecked(false);
    try {
      const res = await fetch(`/api/pack-unlock?authorId=${encodeURIComponent(authorId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Paket yüklenemedi");
      setAuthorName(data.author?.username || "öğrenci");
      setAlreadyUnlocked(Boolean(data.unlock));
      setCanAttempt(Boolean(data.canAttempt));
      if (typeof data.passScore === "number") setPassScore(data.passScore);
      const quizWords = (data.words ?? []) as QuizWord[];
      setWords(quizWords);
      setPeers((data.peerMeanings ?? []) as string[]);
      if (quizWords[0]) {
        setChoices(buildChoices(quizWords[0].turkish, data.peerMeanings ?? []));
        primeWordAudio(quizWords[0].english, quizWords[0].audio_url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [authorId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!current || checked) return;
    playWordAudio(current.english, current.audio_url);
  }, [current, checked, index]);

  function choose(option: string) {
    if (checked || !current) return;
    setSelected(option);
    setChecked(true);
    const correct = primaryMeaning(current.turkish);
    const ok = option.toLowerCase() === correct.toLowerCase();
    playFeedback(ok ? "correct" : "wrong");
    setAnswers((prev) => [
      ...prev.filter((a) => a.wordId !== current.id),
      { wordId: current.id, selectedTurkish: option },
    ]);
  }

  async function goNext() {
    if (!checked) return;
    if (index + 1 < words.length) {
      const next = words[index + 1]!;
      setIndex((i) => i + 1);
      setSelected(null);
      setChecked(false);
      setChoices(buildChoices(next.turkish, peers));
      primeWordAudio(next.english, next.audio_url);
      return;
    }
    await finish();
  }

  async function finish() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pack-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sonuç kaydedilemedi");
      setResult({
        score: data.score,
        passed: data.passed,
        unlocked: data.unlocked,
        correctCount: data.correctCount,
        total: data.total,
      });
      if (data.unlocked) playFeedback("correct");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sonuç kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PracticeExamMain className="mx-auto max-w-lg px-4 py-8">
        <PracticeExamCard>
          <p className="text-sm font-bold text-mimo-muted">Paket sınavı hazırlanıyor…</p>
        </PracticeExamCard>
      </PracticeExamMain>
    );
  }

  if (result) {
    return (
      <PracticeExamMain className="mx-auto max-w-lg px-4 py-8">
        <PracticeExamCard>
          <PracticeExamEyebrow>
            {result.passed ? "Kilit açıldı" : "Eşik altında"}
          </PracticeExamEyebrow>
          <h1 className="mt-2 text-2xl font-black text-mimo-title">
            @{authorName} paketi · %{Math.round(result.score)}
          </h1>
          <p className="mt-2 text-sm font-semibold text-mimo-muted">
            {result.correctCount}/{result.total} doğru. Geçme eşiği %{passScore}.
          </p>
          {result.unlocked ? (
            <p className="mt-3 rounded-2xl bg-[#ecfce5] px-3 py-2 text-sm font-extrabold text-[#15803d] dark:bg-[#14532d]/40 dark:text-[#86efac]">
              Artık mesajlaşabilir ve hazırlık anısını okuyabilirsin.
            </p>
          ) : (
            <p className="mt-3 rounded-2xl bg-[#fff3e0] px-3 py-2 text-sm font-extrabold text-[#c2410c] dark:bg-[#7c2d12]/40 dark:text-[#fdba74]">
              Tekrar dene — en az {PACK_QUIZ_MIN_QUESTIONS} soruda %{passScore} gerekir.
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {result.unlocked ? (
              <PracticeExamPrimaryButton onClick={() => router.push(`/messages/${authorId}`)}>
                Mesajlaş →
              </PracticeExamPrimaryButton>
            ) : (
              <PracticeExamPrimaryButton onClick={() => void load()}>
                Tekrar dene
              </PracticeExamPrimaryButton>
            )}
            <PracticeExamExitLink href="/#offline-packs" label="Paketlere dön" />
          </div>
        </PracticeExamCard>
      </PracticeExamMain>
    );
  }

  if (error && words.length === 0) {
    return (
      <PracticeExamMain className="mx-auto max-w-lg px-4 py-8">
        <PracticeExamCard>
          <PracticeExamEyebrow>Paket sınavı</PracticeExamEyebrow>
          <p className="mt-2 text-sm font-bold text-[#b91c1c]">{error}</p>
          <div className="mt-4">
            <PracticeExamExitLink href="/login" label="Giriş yap" />
          </div>
        </PracticeExamCard>
      </PracticeExamMain>
    );
  }

  if (!canAttempt) {
    return (
      <PracticeExamMain className="mx-auto max-w-lg px-4 py-8">
        <PracticeExamCard>
          <PracticeExamEyebrow>@{authorName}</PracticeExamEyebrow>
          <h1 className="mt-2 text-2xl font-black text-mimo-title">Paket henüz yetersiz</h1>
          <p className="mt-2 text-sm font-semibold text-mimo-muted">
            Mesaj kilidini açmak için pakette en az {PACK_QUIZ_MIN_QUESTIONS} kelime olmalı.
          </p>
          {alreadyUnlocked ? (
            <Link
              href={`/messages/${authorId}`}
              className="mt-4 inline-flex rounded-2xl bg-[#1cb0f6] px-4 py-3 text-sm font-black text-white"
            >
              Mesajlara git →
            </Link>
          ) : null}
        </PracticeExamCard>
      </PracticeExamMain>
    );
  }

  if (!current) {
    return (
      <PracticeExamMain className="mx-auto max-w-lg px-4 py-8">
        <PracticeExamCard>
          <p className="text-sm font-bold text-mimo-muted">Kelime yok.</p>
        </PracticeExamCard>
      </PracticeExamMain>
    );
  }

  const correct = primaryMeaning(current.turkish);

  return (
    <PracticeExamMain className="mx-auto max-w-lg px-4 py-8">
      <PracticeExamCard>
        <div className="flex items-center justify-between gap-3">
          <PracticeExamEyebrow>@{authorName} · paket sınavı</PracticeExamEyebrow>
          <span className="text-xs font-black text-mimo-muted">
            {index + 1}/{words.length}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-mimo-surface">
          <div
            className="h-full rounded-full bg-[#58cc02] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-bold text-mimo-muted">
          Geçmek için %{passScore} · {alreadyUnlocked ? "Kilit zaten açık" : "Kilit kapalı"}
        </p>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => playWordAudio(current.english, current.audio_url)}
            className="text-3xl font-black text-mimo-title"
          >
            {current.english}
          </button>
          {current.phonetic ? (
            <p className="mt-1 text-sm font-semibold text-mimo-muted">{current.phonetic}</p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-2">
          {choices.map((option) => {
            const isCorrect = option.toLowerCase() === correct.toLowerCase();
            const isSelected = selected === option;
            let tone =
              "border-mimo-border bg-mimo-surface text-mimo-fg hover:border-[#1cb0f6]/50";
            if (checked && isCorrect) {
              tone = "border-[#58cc02] bg-[#ecfce5] text-[#15803d]";
            } else if (checked && isSelected && !isCorrect) {
              tone = "border-[#ff4b4b] bg-[#ffe8e8] text-[#b91c1c]";
            }
            return (
              <button
                key={option}
                type="button"
                disabled={checked}
                onClick={() => choose(option)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-extrabold transition ${tone}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-3 text-sm font-bold text-[#b91c1c]">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <PracticeExamPrimaryButton
            disabled={!checked || submitting}
            onClick={() => void goNext()}
          >
            {submitting
              ? "Kaydediliyor…"
              : index + 1 < words.length
                ? "Sonraki →"
                : "Bitir ve kontrol et"}
          </PracticeExamPrimaryButton>
          <PracticeExamExitLink href="/#offline-packs" label="Çık" />
        </div>
      </PracticeExamCard>
    </PracticeExamMain>
  );
}
