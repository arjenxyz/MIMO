"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/app/components/ThemeProvider";
import {
  APP_LANGUAGES,
  getAppLanguage,
  setAppLanguage,
  type AppLanguage,
} from "@/lib/appLanguage";
import {
  isFeedbackSoundMuted,
  playCorrect,
  setFeedbackSoundMuted,
} from "@/lib/feedbackSound";
import { isShowGlobalWords, setShowGlobalWords } from "@/lib/showGlobalWords";

const COPY = {
  tr: {
    title: "Ayarlar",
    subtitle: "MIMO’yu kendine göre ayarla.",
    back: "Geri",
    dark: "Koyu mod",
    darkHint: "Gece daha rahat okumak için",
    sfx: "Ses efektleri",
    sfxHint: "Doğru ve yanlış geri bildirimleri",
    global: "Global kelimeler",
    globalHint: "Topluluğun eklediği kelimeleri göster",
    language: "Dil",
    languageHint: "Uygulama dilini seç",
  },
  hu: {
    title: "Beállítások",
    subtitle: "Állítsd be a MIMO-t magadnak.",
    back: "Vissza",
    dark: "Sötét mód",
    darkHint: "Kényelmesebb olvasás este",
    sfx: "Hanghatások",
    sfxHint: "Helyes / helytelen visszajelzés",
    global: "Globális szavak",
    globalHint: "A közösség által hozzáadott szavak",
    language: "Nyelv",
    languageHint: "Válaszd ki az alkalmazás nyelvét",
  },
} as const;

function SwitchRow({
  title,
  hint,
  on,
  onToggle,
  icon,
}: {
  title: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 border-b border-mimo-soft px-1 py-4 text-left last:border-b-0"
      aria-pressed={on}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff3e0] text-lg dark:bg-[#3a2208]"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-mimo-title">{title}</p>
        <p className="mt-0.5 text-xs font-semibold text-mimo-muted">{hint}</p>
      </div>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          on ? "bg-[#58cc02]" : "bg-[#cbd5e1] dark:bg-[#475569]"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            on ? "left-[1.35rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [sfxMuted, setSfxMuted] = useState(false);
  const [showGlobalWords, setShowGlobalWordsState] = useState(true);
  const [lang, setLang] = useState<AppLanguage>("tr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSfxMuted(isFeedbackSoundMuted());
    setShowGlobalWordsState(isShowGlobalWords());
    setLang(getAppLanguage());
    setReady(true);
  }, []);

  const t = COPY[lang];

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-mimo-bg text-mimo-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(253,134,10,0.16),_transparent_52%),radial-gradient(ellipse_at_bottom,_rgba(28,176,246,0.1),_transparent_48%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/mimo-avatar.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-[#fd860a]/35"
              priority
            />
            <div className="min-w-0 text-left">
              <h1 className="text-lg font-black tracking-tight text-mimo-title">{t.title}</h1>
              <p className="text-xs font-semibold text-mimo-muted">{t.subtitle}</p>
            </div>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-xl border border-mimo-soft bg-mimo-card px-3 py-2 text-sm font-extrabold text-mimo-muted transition hover:border-mimo-border hover:text-mimo-fg"
          >
            {t.back}
          </Link>
        </div>

        <section className="mt-5 rounded-3xl border border-mimo-border bg-mimo-card px-4 py-2 shadow-[0_8px_0_rgba(15,23,42,0.06)] dark:shadow-[0_8px_0_rgba(0,0,0,0.35)]">
          {!ready ? (
            <p className="py-8 text-center text-sm font-bold text-mimo-muted">…</p>
          ) : (
            <>
              <SwitchRow
                icon="🌙"
                title={t.dark}
                hint={t.darkHint}
                on={theme === "dark"}
                onToggle={toggleTheme}
              />
              <SwitchRow
                icon="🔊"
                title={t.sfx}
                hint={t.sfxHint}
                on={!sfxMuted}
                onToggle={() => {
                  const next = !sfxMuted;
                  setFeedbackSoundMuted(next);
                  setSfxMuted(next);
                  if (!next) playCorrect();
                }}
              />
              <SwitchRow
                icon="🌐"
                title={t.global}
                hint={t.globalHint}
                on={showGlobalWords}
                onToggle={() => {
                  const next = !showGlobalWords;
                  setShowGlobalWords(next);
                  setShowGlobalWordsState(next);
                }}
              />

              <div className="flex items-start gap-3 px-1 py-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff3e0] text-lg dark:bg-[#3a2208]"
                  aria-hidden
                >
                  🗣️
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-mimo-title">{t.language}</p>
                  <p className="mt-0.5 text-xs font-semibold text-mimo-muted">{t.languageHint}</p>
                  <div
                    role="radiogroup"
                    aria-label={t.language}
                    className="mt-3 grid grid-cols-2 gap-1.5"
                  >
                    {APP_LANGUAGES.map((option) => {
                      const selected = lang === option.id;
                      const label = lang === "hu" ? option.labelHu : option.labelTr;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => {
                            setAppLanguage(option.id);
                            setLang(option.id);
                          }}
                          className={`rounded-xl px-3 py-2.5 text-center text-xs font-extrabold transition ${
                            selected
                              ? "bg-[#fff3e0] text-[#c2410c] ring-1 ring-[#fd860a]/45 dark:bg-[#3a2208] dark:text-[#fdba74]"
                              : "bg-mimo-surface text-mimo-muted ring-1 ring-mimo-soft hover:text-mimo-fg"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
