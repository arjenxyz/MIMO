"use client";

import { getStoredPack } from "@/lib/offlineStorage";
import type { DueWordItem, Word } from "@/types";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Words from the downloaded offline pack (IndexedDB), if any. */
export async function loadOfflinePackWords(): Promise<Word[]> {
  const pack = await getStoredPack("words");
  return pack?.data?.length ? [...pack.data] : [];
}

export function wordsToDueItems(words: Word[], limit = 12): DueWordItem[] {
  const today = new Date().toISOString().slice(0, 10);
  return shuffle(words)
    .slice(0, limit)
    .map((w, idx) => ({
      id: w.id || idx + 1,
      user_id: "offline",
      word_id: w.id,
      ease_factor: 2.5,
      repetition: 0,
      interval: 1,
      next_review: today,
      correct_count: 0,
      wrong_count: 0,
      last_answered: today,
      words: w,
    }));
}

export function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Prefer device pack when offline, or when caller asks to force local.
 * Returns null if no pack is installed.
 */
export async function resolvePracticeWords(options?: {
  forceLocal?: boolean;
  limit?: number;
}): Promise<Word[] | null> {
  const forceLocal = options?.forceLocal ?? isBrowserOffline();
  if (!forceLocal && !isBrowserOffline()) {
    // Still allow pack when online if nothing else — callers decide.
  }
  const words = await loadOfflinePackWords();
  if (!words.length) return null;
  if (options?.limit && options.limit > 0) return shuffle(words).slice(0, options.limit);
  return shuffle(words);
}
