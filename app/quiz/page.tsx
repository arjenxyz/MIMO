"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ContinueButton } from "@/app/components/ContinueButton";
import { LevelUpModal } from "@/app/components/LevelUpModal";
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

  const progressPct = useMemo(() => {
    if (!items.length) return 0;
    return Math.round((index / items.length) * 100);
  }, [index, items.length]);

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
      <main className="flex min-h-[70vh] items-center justify-center font-extrabold text-duo-muted">
        Kelimeler hazırlanıyor...
      </main>
    );
  }

  if (finished) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-black text-white">Bugünlük kelimelerin bitti!</h1>
        <p className="mt-2 text-sm font-bold text-duo-muted">Serini bozma, yarın yine buradayız.</p>
        <div className="mt-6 w-full">
          <ContinueButton href="/">Ana Sayfaya Dön</ContinueButton>
        </div>
      </main>
    );
  }

  if (!word) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-black">Şu an eklenecek kelime kalmadı.</h1>
        <div className="mt-6 w-full">
          <ContinueButton href="/">Ana Sayfaya Dön</ContinueButton>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-5 pb-28 lg:pb-8">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-duo-muted">
          <span>
            {Math.min(index + 1, items.length)} / {items.length}
          </span>
          <button
            type="button"
            onClick={listen}
            className="rounded-xl border-2 border-duo-border bg-duo-card px-3 py-1.5 text-[11px] font-black text-white transition hover:border-[#1cb0f6]"
          >
            Tekrar dinle
          </button>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[#0f1a1e]">
          <div
            className="h-full rounded-full bg-[#58cc02] transition-all duration-300"
            style={{ width: `${Math.max(8, progressPct)}%` }}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-duo-border bg-duo-card">
        <div className="relative h-48 w-full bg-[#0f1a1e] sm:h-56">
          <WordImage
            english={word.english}
            className="h-full w-full object-cover"
            alt={`${word.english} görseli`}
          />
          <button
            type="button"
            onClick={listen}
            aria-label="Kelimeyi dinle"
            className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1cb0f6] text-white shadow-[0_4px_0_#1899d6] transition active:translate-y-1 active:shadow-none"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
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

        <div className="p-5 sm:p-6">
          <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-duo-muted">
            Doğru Türkçe anlamı seç
          </p>
          <h1 className="mt-2 text-center text-3xl font-black tracking-tight text-white sm:text-4xl">
            {word.english}
          </h1>
          {word.phonetic && (
            <p className="mt-1 text-center text-sm font-bold text-duo-muted">{word.phonetic}</p>
          )}

          <div className="mt-5 grid gap-2.5">
            {choices.map((option) => {
              const isPick = selected === option;
              const isRight = option.toLowerCase() === correctLabel.toLowerCase();
              let style =
                "border-duo-border bg-[#0f1a1e] text-white hover:border-white/25 active:translate-y-0.5";
              if (checked) {
                if (isRight) style = "border-[#58cc02] bg-[#58cc02]/15 text-[#58cc02]";
                else if (isPick) style = "border-[#ff4b4b] bg-[#ff4b4b]/15 text-[#ff4b4b]";
                else style = "border-duo-border bg-[#0f1a1e] text-duo-muted opacity-60";
              } else if (isPick) {
                style = "border-[#1cb0f6] bg-[#1cb0f6]/15 text-white";
              }

              return (
                <button
                  key={option}
                  type="button"
                  disabled={checked}
                  onClick={() => pick(option)}
                  className={`rounded-2xl border-2 px-4 py-3.5 text-left text-base font-extrabold transition ${style}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {checked && (
            <div className="mt-5 space-y-3">
              <div
                className={`rounded-2xl px-4 py-3 text-sm font-extrabold ${
                  correct
                    ? "bg-[#58cc02]/15 text-[#58cc02]"
                    : "bg-[#ff4b4b]/15 text-[#ff4b4b]"
                }`}
              >
                {correct ? "Harika! Doğru." : `Yanlış. Doğru cevap: ${correctLabel}`}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void continueNext()}
                className="w-full rounded-2xl bg-[#58cc02] py-4 text-sm font-black uppercase tracking-wide text-[#14260a] shadow-[0_4px_0_#46a302] disabled:opacity-50"
              >
                {saving ? "..." : index + 1 >= items.length ? "Bitir" : "Devam"}
              </button>
            </div>
          )}

          {error && <p className="mt-4 text-sm font-bold text-[#ff4b4b]">{error}</p>}
        </div>
      </section>

      {levelUp !== null && <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />}
    </main>
  );
}
