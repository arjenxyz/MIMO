"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DailyQuests } from "@/types";

const ITEMS = [
  {
    key: "words" as const,
    title: "5 kelime tekrar et",
    href: "/quiz",
    accent: "#1cb0f6",
    icon: "📘",
  },
  {
    key: "grammar" as const,
    title: "3 gramer sorusu çöz",
    href: "/quiz/grammar",
    accent: "#ce82ff",
    icon: "🧩",
  },
  {
    key: "stories" as const,
    title: "1 hikaye oku",
    href: "/reading",
    accent: "#ff9600",
    icon: "📖",
  },
  {
    key: "sounds" as const,
    title: "1 ses oturumu yap",
    href: "/sounds",
    accent: "#00cd9c",
    icon: "🎧",
  },
];

export function DailyQuests({
  quests,
  bonusJustClaimed,
}: {
  quests: DailyQuests;
  bonusJustClaimed: boolean;
}) {
  const [showBonus, setShowBonus] = useState(bonusJustClaimed);

  useEffect(() => {
    if (bonusJustClaimed) {
      setShowBonus(true);
    }
  }, [bonusJustClaimed]);

  const counts = {
    words: { done: quests.wordsDone, target: quests.wordsTarget },
    grammar: { done: quests.grammarDone, target: quests.grammarTarget },
    stories: { done: quests.storiesDone, target: quests.storiesTarget },
    sounds: { done: quests.soundsDone, target: quests.soundsTarget },
  };

  const completedCount = ITEMS.filter((item) => {
    const c = counts[item.key];
    return c.done >= c.target;
  }).length;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border-2 border-duo-border bg-duo-card">
      <div className="border-b-2 border-duo-border bg-gradient-to-r from-[#24353d] to-transparent px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">Günlük Görevler</h2>
            <p className="text-xs font-bold text-duo-muted">
              {completedCount}/{ITEMS.length} tamamlandı
            </p>
          </div>
          {quests.allComplete ? (
            <span className="rounded-full bg-[#58cc02] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#14260a]">
              Tamam
            </span>
          ) : (
            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-duo-muted">
              Devam et
            </span>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0f1a1e]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#58cc02] to-[#ffc800] transition-all"
            style={{ width: `${(completedCount / ITEMS.length) * 100}%` }}
          />
        </div>
      </div>

      {showBonus && (
        <div className="mx-4 mt-4 rounded-2xl border border-[#58cc02]/30 bg-[#58cc02]/10 px-4 py-3 text-center text-sm font-extrabold text-[#58cc02]">
          Günlük görevler tamam!
        </div>
      )}

      <ul className="space-y-2 p-4">
        {ITEMS.map((item) => {
          const c = counts[item.key];
          const done = c.done >= c.target;
          const pct = Math.min(100, (c.done / c.target) * 100);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl border-2 border-transparent bg-[#0f1a1e]/60 px-3 py-3 transition hover:border-duo-border hover:bg-[#0f1a1e]"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg"
                  style={{ backgroundColor: `${item.accent}22` }}
                >
                  {done ? "✓" : item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-extrabold ${
                      done ? "text-duo-muted line-through" : "text-white"
                    }`}
                  >
                    {item.title}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-duo-border">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: item.accent }}
                      />
                    </div>
                    <span className="text-[10px] font-black tabular-nums text-duo-muted">
                      {c.done}/{c.target}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
