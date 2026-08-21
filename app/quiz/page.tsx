"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PracticeExamCard,
  PracticeExamExitLink,
  PracticeExamEyebrow,
  PracticeExamGhostLink,
  PracticeExamMain,
  PracticeExamPrimaryButton,
} from "@/app/components/PracticeExamChrome";
import { WordImage } from "@/app/components/WordImage";
import { WordUploaderAttribution } from "@/app/components/WordUploaderAttribution";
import { DEMO_DUE_WORDS, isDemoMode } from "@/lib/demo";
import { playFeedback } from "@/lib/feedbackSound";
import { playWordAudio } from "@/lib/speak";
import type { DueWordItem, Quality } from "@/types";

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
  "açık",
  "kapalı",
  "doğru",
  "yanlış",
  "güçlü",
  "zayıf",
  "temiz",
  "kirli",
  "uzak",
  "yakın",
  "derin",
  "sığ",
  "kalabalık",
  "tenha",
  "pahalı",
  "ucuz",
  "parlak",
  "karanlık",
  "yumuşak",
  "sert",
  "tatlı",
  "acı",
  "taze",
  "bayat",
  "cesur",
  "korkak",
  "sakin",
  "sinirli",
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

export default function WordQuizPage() {
  const router = useRouter();
  const [items, setItems] = useState<DueWordItem[]>([]);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [demo, setDemo] = useState(false);
  const spokenForId = useRef<number | null>(null);

  const current = items[index];
  const word = current?.words;
  const correctLabel = word ? primaryMeaning(word.turkish) : "";

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const localDemo = isDemoMode(
        typeof window !== "undefined" ? window.location.hostname : null
      );
      if (!cancelled) setDemo(localDemo);

      try {
        if (localDemo) {
          if (!cancelled) {
            setItems(DEMO_DUE_WORDS);
            setLoading(false);
          }
          return;
        }

        const [{ createClient }, { assignNewWords, getDueWords, getUserWords }] = await Promise.all([
          import("@/lib/supabase/client"),
          import("@/lib/db"),
        ]);
        const supabase = createClient();
        const {
          data: { user },
        } = await Promise.race([
          supabase.auth.getUser(),
          new Promise<{ data: { user: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { user: null } }), 2500)
          ),
        ]);

        if (!user) {
          if (!cancelled) {
            setLoading(false);
            router.replace("/login");
          }
          return;
        }

        let due = await getDueWords(supabase, user.id);
        if (due.length === 0) {
          // Only seed when the list is empty — don't keep pulling pool words
          // just because nothing is due today.
          const owned = await getUserWords(supabase, user.id);
          if (owned.length === 0) {
            await assignNewWords(supabase, user.id, 5);
            due = await getDueWords(supabase, user.id);
          }
        }
        if (!cancelled) setItems(due);
      } catch (err) {
        if (!cancelled) {
          if (localDemo) {
            setDemo(true);
            setItems(DEMO_DUE_WORDS);
          } else {
            setError(err instanceof Error ? err.message : "Kelimeler yüklenemedi.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!word) return;
    const peers = items
      .map((item) => item.words?.turkish)
      .filter((t): t is string => Boolean(t));
    setChoices(buildChoices(word.turkish, peers));
    setSelected(null);
    setChecked(false);
    setCorrect(false);
  }, [word, items]);

  useEffect(() => {
    if (!word || spokenForId.current === word.id) return;
    spokenForId.current = word.id;
    const t = window.setTimeout(() => {
      playWordAudio(word.english, word.audio_url);
    }, 350);
    return () => window.clearTimeout(t);
  }, [word]);

  function listen() {
    if (!word) return;
    playWordAudio(word.english, word.audio_url);
  }

  function pick(option: string) {
    if (!word || checked || saving) return;
    const ok = option.toLowerCase() === correctLabel.toLowerCase();
    setSelected(option);
    setCorrect(ok);
    setChecked(true);
    playFeedback(ok);

    // Last word: skip the extra "Sonuçlar" tap — go straight to summary.
    if (index + 1 >= items.length) {
      window.setTimeout(() => {
        void continueNext(ok);
      }, 750);
    }
  }

  async function continueNext(forcedCorrect?: boolean) {
    // When auto-advancing after the last answer, `forcedCorrect` is set from `pick`
    // before React has re-rendered — do not rely on the stale `checked` closure.
    if (!current || saving) return;
    if (forcedCorrect === undefined && !checked) return;
    setSaving(true);
    setError("");
    try {
      const wasCorrect = forcedCorrect ?? correct;
      const quality: Quality = wasCorrect ? 2 : 0;
      if (!demo) {
        const [{ createClient }, { updateWordProgress }] = await Promise.all([
          import("@/lib/supabase/client"),
          import("@/lib/db"),
        ]);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Oturum bulunamadı. Yeniden giriş yap.");
          return;
        }
        await updateWordProgress(supabase, current, quality, wasCorrect);
        window.dispatchEvent(new Event("profile-updated"));
      }
      const nextIndex = index + 1;
      if (nextIndex >= items.length) {
        setFinished(true);
      } else {
        setIndex(nextIndex);
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
          <p className="text-sm font-bold text-mimo-muted">Kelimeler hazırlanıyor…</p>
        </div>
      </PracticeExamMain>
    );
  }

  if (finished) {
    return (
      <PracticeExamMain className="flex min-h-[100dvh] items-center justify-center">
        <div className="mx-auto w-full max-w-xl px-4 py-8">
          <PracticeExamCard className="text-center">
            <PracticeExamEyebrow>Word Quiz</PracticeExamEyebrow>
            <h1 className="mt-3 text-2xl font-black">Well done!</h1>
            <p className="mt-2 text-sm font-semibold text-mimo-muted">
              Bugünlük kelime alıştırmalarını tamamladın.
            </p>
            <div className="mt-6">
              <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  if (!word) {
    return (
      <PracticeExamMain className="flex min-h-[100dvh] items-center justify-center">
        <div className="mx-auto w-full max-w-xl px-4 py-8">
          <PracticeExamCard className="text-center">
            <h1 className="text-2xl font-black">Şu an eklenecek kelime kalmadı.</h1>
            <div className="mt-6">
              <PracticeExamGhostLink href="/">Ana sayfa</PracticeExamGhostLink>
            </div>
          </PracticeExamCard>
        </div>
      </PracticeExamMain>
    );
  }

  return (
    <PracticeExamMain className="flex min-h-screen flex-col">
      <div
        className={`mx-auto w-full max-w-3xl flex-1 px-4 pt-5 lg:max-w-6xl ${
          checked ? "pb-36" : "pb-10"
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="rounded-full bg-mimo-surface px-3 py-1.5 text-xs font-extrabold tabular-nums text-mimo-muted ring-1 ring-mimo-border">
            Kelime {Math.min(index + 1, items.length)} / {items.length}
          </p>
          <PracticeExamExitLink href="/" />
        </div>

        <p className="mb-4 text-center text-base font-bold text-mimo-fg lg:mb-6 lg:text-left lg:text-lg">
          Choose the correct Turkish meaning.
        </p>

        <PracticeExamCard className="!px-0 !py-0 overflow-hidden sm:!px-0 sm:!py-0 lg:grid lg:grid-cols-2 lg:items-stretch">
          <div className="relative h-36 w-full bg-[#e2e8f0] sm:h-44 lg:h-auto lg:min-h-full">
            <WordImage
              english={word.english}
              className="h-full w-full object-cover"
              alt={`${word.english} görseli`}
            />
            <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-4.5rem)]">
              <WordUploaderAttribution word={word} overlay />
            </div>
            <button
              type="button"
              onClick={listen}
              aria-label="Kelimeyi dinle"
              className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#1cb0f6] text-white shadow-[0_3px_0_#1899d6]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M11 5 6 9H2v6h4l5 4V5z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-col justify-center px-5 py-5 sm:px-8 sm:py-6 lg:px-8 lg:py-8">
            <h1 className="text-center text-3xl font-black tracking-tight text-mimo-title lg:text-left sm:text-4xl">
              {word.english}
            </h1>
            {word.phonetic && (
              <p className="mt-1 text-center text-sm font-bold text-mimo-muted lg:text-left">
                {word.phonetic}
              </p>
            )}

            <div className="mt-5 grid gap-2">
              {choices.map((option) => {
                const isPick = selected === option;
                const isRight = option.toLowerCase() === correctLabel.toLowerCase();
                let style =
                  "border-mimo-soft bg-mimo-surface text-mimo-fg hover:border-mimo-border";
                if (checked) {
                  if (isRight) style = "border-[#58cc02] bg-[#ecfce5] text-[#15803d]";
                  else if (isPick) style = "border-[#ff4b4b] bg-[#ffe8e8] text-[#b91c1c]";
                  else style = "border-mimo-soft bg-mimo-card text-mimo-muted";
                } else if (isPick) {
                  style = "border-[#1cb0f6] bg-[#e8f6fe] text-mimo-fg";
                }

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={checked}
                    onClick={() => pick(option)}
                    className={`rounded-xl border px-4 py-3 text-left text-base font-extrabold transition ${style}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="mt-4 text-center text-sm font-bold text-[#b91c1c] lg:text-left">
                {error}
              </p>
            )}
          </div>
        </PracticeExamCard>
      </div>

      {checked && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-mimo-soft bg-mimo-bg/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 lg:max-w-6xl">
            <p
              className={`text-center text-sm font-bold ${
                correct ? "text-[#15803d]" : "text-[#b91c1c]"
              }`}
            >
              {correct ? "Harika! Doğru." : `Yanlış. Doğru cevap: ${correctLabel}`}
            </p>
            {index + 1 >= items.length ? (
              <p className="py-2 text-sm font-bold text-mimo-muted">
                {saving ? "Kaydediliyor…" : "Sonuçlar açılıyor…"}
              </p>
            ) : (
              <PracticeExamPrimaryButton
                className="w-full max-w-sm"
                disabled={saving}
                onClick={() => void continueNext()}
                variant="green"
              >
                {saving ? "..." : "Devam"}
              </PracticeExamPrimaryButton>
            )}
          </div>
        </div>
      )}

    </PracticeExamMain>
  );
}
