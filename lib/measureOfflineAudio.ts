import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  ENGLISH_TTS_PROVIDERS,
  isTrustedEnglishAudioUrl,
} from "@/lib/englishTts";
import type { Word } from "@/types";

/** Process-lifetime cache of measured remote audio sizes. */
const sizeCache = new Map<string, number>();

const DISK_CACHE_PATH = path.join(os.tmpdir(), "mimo-audio-size-cache.json");
let diskHydrated = false;
let diskWriteTimer: ReturnType<typeof setTimeout> | null = null;

async function hydrateDiskCache() {
  if (diskHydrated) return;
  diskHydrated = true;
  try {
    const raw = await fs.readFile(DISK_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, number>;
    for (const [url, bytes] of Object.entries(parsed)) {
      if (typeof bytes === "number" && bytes > 64 && !sizeCache.has(url)) {
        sizeCache.set(url, bytes);
      }
    }
  } catch {
    // first run / no cache file
  }
}

function scheduleDiskPersist() {
  if (diskWriteTimer) return;
  diskWriteTimer = setTimeout(() => {
    diskWriteTimer = null;
    const obj: Record<string, number> = {};
    for (const [url, bytes] of Array.from(sizeCache.entries())) {
      obj[url] = bytes;
    }
    void fs.writeFile(DISK_CACHE_PATH, JSON.stringify(obj), "utf8").catch(() => undefined);
  }, 400);
}

/** Ensure /tmp size cache is loaded before peeks (call from API handlers). */
export async function ensureAudioSizeCacheReady() {
  await hydrateDiskCache();
}

/** Upstream URL actually downloaded into offline packs (not the relative proxy path). */
function upstreamAudioUrl(word: Word): string {
  const direct = word.audio_url?.trim();
  if (direct && isTrustedEnglishAudioUrl(direct)) return direct;
  return ENGLISH_TTS_PROVIDERS[0]!.buildUrl(word.english);
}

async function measureUrlBytes(url: string): Promise<number> {
  await hydrateDiskCache();
  const cached = sizeCache.get(url);
  if (typeof cached === "number") return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "audio/*,*/*" },
    });
    const headLen = Number(head.headers.get("content-length"));
    if (head.ok && Number.isFinite(headLen) && headLen > 64) {
      sizeCache.set(url, headLen);
      scheduleDiskPersist();
      return headLen;
    }

    const get = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "audio/*,*/*" },
    });
    if (!get.ok) return 0;
    const buf = await get.arrayBuffer();
    const len = buf.byteLength;
    if (len > 64) {
      sizeCache.set(url, len);
      scheduleDiskPersist();
      return len;
    }
    return 0;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Sync peek: only sizes already measured in this process / disk cache (no network).
 * Used so the pack list can respond instantly.
 */
export function peekCachedWordAudioBytes(words: Word[]): {
  totalAudioBytes: number;
  byEnglish: Record<string, number>;
  measuredCount: number;
  totalUnique: number;
} {
  const byEnglish: Record<string, number> = {};
  const unique = new Map<string, Word>();
  for (const word of words) {
    const key = word.english.trim().toLowerCase();
    if (!key || unique.has(key)) continue;
    unique.set(key, word);
  }

  let measuredCount = 0;
  for (const [key, word] of Array.from(unique.entries())) {
    const url = upstreamAudioUrl(word);
    const cached = sizeCache.get(url);
    if (typeof cached === "number") {
      byEnglish[key] = cached;
      measuredCount += 1;
    }
  }

  let totalAudioBytes = 0;
  for (const word of words) {
    const key = word.english.trim().toLowerCase();
    totalAudioBytes += byEnglish[key] ?? 0;
  }

  return {
    totalAudioBytes,
    byEnglish,
    measuredCount,
    totalUnique: unique.size,
  };
}

/**
 * Measure real audio payload sizes for pack words (dictionary URL or TTS source).
 * Results are cached in-memory + /tmp for the server process.
 */
export async function measureWordAudioBytes(words: Word[]): Promise<{
  totalAudioBytes: number;
  byEnglish: Record<string, number>;
}> {
  await hydrateDiskCache();

  const unique = new Map<string, Word>();
  for (const word of words) {
    const key = word.english.trim().toLowerCase();
    if (!key || unique.has(key)) continue;
    unique.set(key, word);
  }

  const entries = Array.from(unique.entries());
  const sizes = await mapPool(entries, 6, async ([key, word]) => {
    const bytes = await measureUrlBytes(upstreamAudioUrl(word));
    return [key, bytes] as const;
  });

  const byEnglish: Record<string, number> = {};
  for (const [key, bytes] of sizes) {
    byEnglish[key] = bytes;
  }

  // Count every word occurrence using measured size (or 0 if unknown).
  let packTotal = 0;
  for (const word of words) {
    const key = word.english.trim().toLowerCase();
    packTotal += byEnglish[key] ?? 0;
  }

  scheduleDiskPersist();
  return { totalAudioBytes: packTotal, byEnglish };
}
