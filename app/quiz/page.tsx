"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { WordImage } from "@/app/components/WordImage";
import {
  assignNewWords,
  getDueWords,
  getProfile,
  updateProfileXP,
  updateWordProgress,
} from "@/lib/db";
import { DEMO_DUE_WORDS, isDemoMode } from "@/lib/demo";
import { calculateXP } from "@/lib/srs";
import { playWordAudio } from "@/lib/speak";
import { createClient } from "@/lib/supabase/client";
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
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [demo, setDemo] = useState(false);
  const spokenForId = useRef<number | null>(null);

  const current = items[index];
  const word = current?.words;
  const correctLabel = word ? primaryMeaning(word.turkish) : "";

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
    void boot();
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
  }, [word?.id, items]);

  useEffect(() => {
    if (!word || spokenForId.current === word.id) return;
    spokenForId.current = word.id;
    const t = window.setTimeout(() => {
      playWordAudio(word.english, word.audio_url);
    }, 350);
    return () => window.clearTimeout(t);
  }, [word?.id, word?.english, word?.audio_url]);

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
  }

  async function continueNext() {
    if (!current || saving || !checked) return;
    setSaving(true);
    setError("");
    try {
      const quality: Quality = correct ? 2 : 0;
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
          if (result.leveledUp) setLevelUp(result.profile.level);
        }
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
          <p className="text-sm font-bold text-[#64748b]">Kelimeler hazırlanıyor…</p>
        </div>
      </PracticeExamMain>
    );
  }

  if (finished) {
    return (
      <PracticeExamMain>
        <div className="mx-auto max-w-xl px-4 py-8">
          <PracticeExamCard className="text-center">
            <PracticeExamEyebrow>Word Quiz</PracticeExamEyebrow>
            <h1 className="mt-3 text-2xl font-black">Well done!</h1>
            <p className="mt-2 text-sm font-semibold text-[#64748b]">
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
      <PracticeExamMain>
        <div className="mx-auto max-w-xl px-4 py-8">
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
    <PracticeExamMain>
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-5">
        <PracticeExamTopBar
          left={
            <p className="text-sm font-bold text-[#64748b]">
              Kelime {Math.min(index + 1, items.length)} / {items.length}
            </p>
          }
        />

        <p className="mb-5 text-center text-base font-bold text-[#0f172a] sm:text-lg">
          Choose the correct Turkish meaning.
        </p>

        <PracticeExamCard className="!px-0 !py-0 overflow-hidden sm:!px-0 sm:!py-0">
          <div className="relative h-48 w-full bg-[#e2e8f0] sm:h-56">
            <WordImage
              english={word.english}
              className="h-full w-full object-cover"
              alt={`${word.english} görseli`}
            />
            <button
              type="button"
              onClick={listen}
              aria-label="Kelimeyi dinle"
              className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#1cb0f6] text-white shadow-[0_3px_0_#1899d6]"
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

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <h1 className="text-center text-3xl font-black tracking-tight text-[#1e3a5f] sm:text-4xl">
              {word.english}
            </h1>
            {word.phonetic && (
              <p className="mt-1 text-center text-sm font-bold text-[#64748b]">{word.phonetic}</p>
            )}

            <div className="mt-6 grid gap-2.5">
              {choices.map((option) => {
                const isPick = selected === option;
                const isRight = option.toLowerCase() === correctLabel.toLowerCase();
                let style =
                  "border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:border-[#cbd5e1]";
                if (checked) {
                  if (isRight) style = "border-[#58cc02] bg-[#ecfce5] text-[#15803d]";
                  else if (isPick) style = "border-[#ff4b4b] bg-[#ffe8e8] text-[#b91c1c]";
                  else style = "border-[#e2e8f0] bg-white text-[#94a3b8]";
                } else if (isPick) {
                  style = "border-[#1cb0f6] bg-[#e8f6fe] text-[#0f172a]";
                }

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={checked}
                    onClick={() => pick(option)}
                    className={`rounded-xl border px-4 py-3.5 text-left text-base font-extrabold transition ${style}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {checked && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <p
                  className={`text-center text-sm font-bold ${
                    correct ? "text-[#15803d]" : "text-[#b91c1c]"
                  }`}
                >
                  {correct ? "Harika! Doğru." : `Yanlış. Doğru cevap: ${correctLabel}`}
                </p>
                <PracticeExamPrimaryButton
                  disabled={saving}
                  onClick={() => void continueNext()}
                  variant="green"
                >
                  {saving ? "..." : index + 1 >= items.length ? "Sonuçlar" : "Devam"}
                </PracticeExamPrimaryButton>
              </div>
            )}

            {error && <p className="mt-4 text-center text-sm font-bold text-[#b91c1c]">{error}</p>}
          </div>
        </PracticeExamCard>

        <p className="mt-4 text-center text-xs font-semibold text-[#94a3b8]">
          <Link href="/" className="hover:text-[#64748b]">
            Ana sayfa
          </Link>
        </p>
      </div>

      {levelUp !== null && <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />}
    </PracticeExamMain>
  );
}
