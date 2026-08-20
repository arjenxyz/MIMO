"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DailyQuests } from "@/types";

const ITEMS = [
  {
    key: "words" as const,
    title: "5 kelime tekrar et",
    href: "/quiz",
    xp: "+10 XP",
    color: "border-duo-blue",
  },
  {
    key: "grammar" as const,
    title: "3 gramer sorusu çöz",
    href: "/quiz/grammar",
    xp: "+15 XP",
    color: "border-duo-purple",
  },
  {
    key: "stories" as const,
    title: "1 hikaye oku",
    href: "/reading",
    xp: "+20 XP",
    color: "border-duo-orange",
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

  const progress = {
    words: `${quests.wordsDone}/${quests.wordsTarget}`,
    grammar: `${quests.grammarDone}/${quests.grammarTarget}`,
    stories: `${quests.storiesDone}/${quests.storiesTarget}`,
  };

  const done = {
    words: quests.wordsDone >= quests.wordsTarget,
    grammar: quests.grammarDone >= quests.grammarTarget,
    stories: quests.storiesDone >= quests.storiesTarget,
  };

  return (
    <section className="rounded-3xl border-2 border-duo-border bg-duo-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">Bugünkü Görevler</h2>
        {quests.allComplete && (
          <span className="rounded-full bg-duo-green px-3 py-1 text-xs font-black text-duo-greenText">
            TAMAMLANDI
          </span>
        )}
      </div>

      {showBonus && (
        <div className="mb-4 rounded-2xl bg-duo-green/15 px-4 py-3 text-center font-extrabold text-duo-green">
          Günlük Görev Tamamlandı! 🎉 +50 XP bonus
        </div>
      )}

      <div className="space-y-3">
        {ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`flex items-center justify-between rounded-2xl border-2 ${item.color} bg-duo-bg px-4 py-3`}
          >
            <div>
              <p className="font-extrabold">{item.title}</p>
              <p className="text-sm font-bold text-duo-muted">
                {progress[item.key]} · {item.xp}
              </p>
            </div>
            <span className="text-2xl">{done[item.key] ? "✅" : "▶️"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
