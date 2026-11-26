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
import { WordUploaderAttribution } from "@/app/components/WordUploaderAttribution";
import { DEMO_DUE_WORDS, isDemoMode } from "@/lib/demo";
import { playFeedback } from "@/lib/feedbackSound";
import {
  loadOfflinePackWords,
  wantsForceOfflinePack,
  wordsToDueItems,
} from "@/lib/offlinePractice";
import { playWordAudio, primeWordAudio } from "@/lib/speak";
import type { DueWordItem, Quality, Word } from "@/types";

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
  const [guestMode, setGuestMode] = useState(false);
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

      const forceOfflinePack = wantsForceOfflinePack();

      try {
        // Offline / explicit pack practice: never wait on Supabase.
        if (forceOfflinePack || localDemo) {
          const packWords = await loadOfflinePackWords();
          if (packWords.length > 0) {
            if (!cancelled) {
              setGuestMode(true);
              setItems(wordsToDueItems(packWords, 12));
            }
            return;
          }
          if (localDemo) {
            if (!cancelled) setItems(DEMO_DUE_WORDS);
            return;
          }
          if (forceOfflinePack) {
            if (!cancelled) {
              setGuestMode(true);
              setError(
                "Cihazda kelime paketi yok. Çevrimiçiyken bir paket indir, sonra tekrar dene."
              );
            }
            return;
          }
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
          let guestWords: Word[] = await loadOfflinePackWords();
          if (!guestWords.length && navigator.onLine) {
            try {
              const res = await fetch("/api/offline-packs?pack=words", { cache: "no-store" });
              if (res.ok) {
                const payload = (await res.json()) as { items?: Word[] };
                if (payload.items?.length) guestWords = payload.items;
              }
            } catch {
              // fall back to built-in words below
            }
          }

          if (guestWords.length > 0) {
            if (!cancelled) {
              setGuestMode(true);
              setItems(wordsToDueItems(guestWords, 12));
            }
          } else if (!cancelled) {
            setGuestMode(true);
            setItems(shuffle(DEMO_DUE_WORDS).slice(0, 12));
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
          const packWords = await loadOfflinePackWords();
          if (packWords.length > 0) {
            setGuestMode(true);
            setItems(wordsToDueItems(packWords, 12));
          } else if (localDemo) {
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
    const upcoming = items
      .slice(index, index + 4)
      .map((item) => item.words)
      .filter((w): w is Word => Boolean(w?.english));
    for (const w of upcoming) {
      primeWordAudio(w.english, w.audio_url);
    }
    void import("@/lib/offlineAudio").then(({ warmAudioMemory }) =>
      warmAudioMemory(upcoming.map((w) => w.english))
    );
  }, [items, index]);

  useEffect(() => {
    if (!word || spokenForId.current === word.id) return;
    spokenForId.current = word.id;
    primeWordAudio(word.english, word.audio_url);
    // Local cache should be warm; play ASAP without artificial delay.
    const t = window.setTimeout(() => {
      playWordAudio(word.english, word.audio_url);
    }, 16);
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
      if (!demo && !guestMode) {
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
              {guestMode
                ? "Açık havuzdan bu turu tamamladın. İlerlemeni kalıcı kaydetmek için giriş yapabilirsin."
                : "Bugünlük kelime alıştırmalarını tamamladın."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {guestMode && (
                <PracticeExamGhostLink href="/login">Giriş Yap</PracticeExamGhostLink>
              )}
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
    <PracticeExamMain className="flex min-h-[100dvh] flex-col lg:h-[100dvh] lg:overflow-hidden">
      <div
        className={`mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-5 lg:max-w-5xl lg:min-h-0 ${
          checked ? "pb-28 lg:pb-24" : "pb-8"
        }`}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3 lg:mb-3">
          <p className="rounded-full bg-mimo-surface px-3 py-1.5 text-xs font-extrabold tabular-nums text-mimo-muted ring-1 ring-mimo-border">
            Kelime {Math.min(index + 1, items.length)} / {items.length}
          </p>
          <PracticeExamExitLink href="/" />
        </div>

        <p className="mb-3 shrink-0 text-center text-base font-bold text-mimo-fg lg:mb-4 lg:text-left lg:text-lg">
          Choose the correct Turkish meaning.
        </p>

        <PracticeExamCard className="min-h-0">
          <div className="flex flex-col items-center text-center">
            <WordUploaderAttribution word={word} />

            <div className="mt-4 flex items-center justify-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-mimo-title sm:text-4xl">
                {word.english}
              </h1>
              <button
                type="button"
                onClick={listen}
                aria-label="Kelimeyi dinle"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1cb0f6] text-white shadow-[0_3px_0_#1899d6]"
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

            {word.phonetic && (
              <p className="mt-1 text-sm font-bold text-mimo-muted">{word.phonetic}</p>
            )}
          </div>

          <div className="mt-6 grid gap-2">
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
                  className={`rounded-xl border px-4 py-2.5 text-left text-base font-extrabold transition ${style}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-3 text-center text-sm font-bold text-[#b91c1c]">{error}</p>
          )}
        </PracticeExamCard>
      </div>

      {checked && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-mimo-soft bg-mimo-bg/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 lg:max-w-5xl">
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
