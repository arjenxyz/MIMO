"use client";

import { getStoredPack } from "@/lib/offlineStorage";
import type { DueWordItem, Word } from "@/types";

const FORCE_PACK_KEY = "mimo-force-offline-pack";

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
 * Remember that the next practice session should use the device pack.
 * Prefer this over `?source=offline` — query strings miss the SW page cache.
 */
export function markForceOfflinePack() {
  try {
    sessionStorage.setItem(FORCE_PACK_KEY, "1");
  } catch {
    // private mode
  }
}

export function clearForceOfflinePack() {
  try {
    sessionStorage.removeItem(FORCE_PACK_KEY);
  } catch {
    // ignore
  }
}

/** True when offline, flagged, or legacy ?source=offline. */
export function wantsForceOfflinePack() {
  if (isBrowserOffline()) return true;
  try {
    if (sessionStorage.getItem(FORCE_PACK_KEY) === "1") return true;
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    try {
      if (new URLSearchParams(window.location.search).get("source") === "offline") {
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

/**
 * Prefer device pack when offline / flagged.
 * Returns null if no pack is installed.
 */
export async function resolvePracticeWords(options?: {
  forceLocal?: boolean;
  limit?: number;
}): Promise<Word[] | null> {
  const forceLocal = options?.forceLocal ?? wantsForceOfflinePack();
  if (!forceLocal) return null;
  const words = await loadOfflinePackWords();
  if (!words.length) return null;
  if (options?.limit && options.limit > 0) return shuffle(words).slice(0, options.limit);
  return shuffle(words);
}

/** Strip offline query so SW can match the cached shell. */
export function cleanPracticeHref(href: string) {
  try {
    const url = new URL(href, "https://mimo.local");
    url.searchParams.delete("source");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href.replace(/([?&])source=offline&?/g, "$1").replace(/[?&]$/, "");
  }
}
