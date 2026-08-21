"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/app/components/ThemeProvider";
import {
  isFeedbackSoundMuted,
  playCorrect,
  setFeedbackSoundMuted,
} from "@/lib/feedbackSound";
import { isShowGlobalWords, setShowGlobalWords } from "@/lib/showGlobalWords";

function SettingToggle({
  title,
  description,
  on,
  onToggle,
  onLabel,
  offLabel,
}: {
  title: string;
  description: string;
  on: boolean;
  onToggle: () => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-2xl border border-mimo-soft bg-mimo-surface px-4 py-3.5 text-left transition hover:border-mimo-border"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-mimo-title">{title}</p>
        <p className="mt-0.5 text-xs font-semibold text-mimo-muted">{description}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
          on
            ? "bg-[#ecfce5] text-[#15803d] ring-1 ring-[#bbf7d0]"
            : "bg-mimo-card text-mimo-muted ring-1 ring-mimo-soft"
        }`}
      >
        {on ? onLabel : offLabel}
      </span>
    </button>
  );
}

export function SettingsPanel() {
  const { theme, toggleTheme } = useTheme();
  const [sfxMuted, setSfxMuted] = useState(false);
  const [showGlobalWords, setShowGlobalWordsState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSfxMuted(isFeedbackSoundMuted());
    setShowGlobalWordsState(isShowGlobalWords());
    setReady(true);
  }, []);

  if (!ready) {
    return <p className="py-6 text-center text-sm font-bold text-mimo-muted">Yükleniyor…</p>;
  }

  const dark = theme === "dark";

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-mimo-muted">
        Görünüm ve ses
      </p>

      <SettingToggle
        title="Koyu mod"
        description="Gece okuması için koyu arayüz."
        on={dark}
        onToggle={toggleTheme}
        onLabel="Açık"
        offLabel="Kapalı"
      />

      <SettingToggle
        title="Ses efektleri"
        description="Doğru / yanlış geri bildirim sesleri."
        on={!sfxMuted}
        onToggle={() => {
          const next = !sfxMuted;
          setFeedbackSoundMuted(next);
          setSfxMuted(next);
          if (!next) playCorrect();
        }}
        onLabel="Açık"
        offLabel="Kapalı"
      />

      <p className="pt-2 text-[10px] font-black uppercase tracking-[0.14em] text-mimo-muted">
        Kelime havuzu
      </p>

      <SettingToggle
        title="Global kelimeler"
        description="Topluluğun yüklediği kelimeleri listende göster."
        on={showGlobalWords}
        onToggle={() => {
          const next = !showGlobalWords;
          setShowGlobalWords(next);
          setShowGlobalWordsState(next);
        }}
        onLabel="Açık"
        offLabel="Kapalı"
      />
    </div>
  );
}
