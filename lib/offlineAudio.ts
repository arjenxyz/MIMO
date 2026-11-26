"use client";

import { audioSourceForWord } from "@/lib/offlinePacks";
import type { Word } from "@/types";

const DB_NAME = "mimo-offline-packs-v1";
const DB_VERSION = 2;
const AUDIO_STORE = "audio";

export type OfflineAudioRecord = {
  key: string;
  wordId: number;
  english: string;
  sourceUrl: string;
  blob: Blob;
  byteSize: number;
  cachedAt: string;
};

export type AudioDownloadProgress = {
  phase: "words" | "audio";
  done: number;
  total: number;
};

/** In-memory hot cache — avoids IndexedDB open + objectURL recreate on every play. */
const memoryBlobs = new Map<string, Blob>();
const memoryObjectUrls = new Map<string, string>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function audioKey(english: string) {
  return english.trim().toLowerCase();
}

function openAudioDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("packs")) {
          db.createObjectStore("packs", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

function rememberBlob(english: string, blob: Blob): string {
  const key = audioKey(english);
  memoryBlobs.set(key, blob);
  const existingUrl = memoryObjectUrls.get(key);
  if (existingUrl) return existingUrl;
  const url = URL.createObjectURL(blob);
  memoryObjectUrls.set(key, url);
  return url;
}

export function getMemoryAudioObjectUrl(english: string): string | null {
  return memoryObjectUrls.get(audioKey(english)) ?? null;
}

export async function getCachedAudioBlob(english: string): Promise<Blob | null> {
  const key = audioKey(english);
  const hot = memoryBlobs.get(key);
  if (hot) return hot;

  const db = await openAudioDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE, "readonly");
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const row = req.result as OfflineAudioRecord | undefined;
        if (row?.blob) {
          memoryBlobs.set(key, row.blob);
          resolve(row.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getCachedAudioObjectUrl(english: string): Promise<string | null> {
  const key = audioKey(english);
  const hotUrl = memoryObjectUrls.get(key);
  if (hotUrl) return hotUrl;

  const blob = await getCachedAudioBlob(english);
  if (!blob) return null;
  return rememberBlob(english, blob);
}

async function putAudioRecord(record: OfflineAudioRecord): Promise<void> {
  rememberBlob(record.english, record.blob);
  const db = await openAudioDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE, "readwrite");
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function removeCachedAudioForWords(words: Word[]): Promise<void> {
  for (const word of words) {
    const key = audioKey(word.english);
    memoryBlobs.delete(key);
    const url = memoryObjectUrls.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      memoryObjectUrls.delete(key);
    }
  }

  const db = await openAudioDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE, "readwrite");
      const store = tx.objectStore(AUDIO_STORE);
      for (const word of words) {
        store.delete(audioKey(word.english));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearAllCachedAudio(): Promise<void> {
  Array.from(memoryObjectUrls.values()).forEach((url) => {
    URL.revokeObjectURL(url);
  });
  memoryBlobs.clear();
  memoryObjectUrls.clear();

  const db = await openAudioDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(AUDIO_STORE, "readwrite");
      tx.objectStore(AUDIO_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function sumCachedAudioBytes(englishList: string[]): Promise<number> {
  let total = 0;
  for (const english of englishList) {
    const blob = await getCachedAudioBlob(english);
    if (blob) total += blob.size;
  }
  return total;
}

async function fetchAudioBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: "force-cache",
      headers: { Accept: "audio/*,*/*" },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size < 64) return null;
    return blob;
  } catch {
    return null;
  }
}

/**
 * Download pronunciation clips into IndexedDB via same-origin proxy
 * (browser CORS blocks most TTS hosts directly).
 */
export async function cacheWordAudioClips(
  words: Word[],
  onProgress?: (progress: AudioDownloadProgress) => void
): Promise<{ cached: number; byteSize: number }> {
  let cached = 0;
  let byteSize = 0;
  const total = words.length;

  // Warm DB once up front.
  await openAudioDb();

  const concurrency = 4;
  let index = 0;

  async function worker() {
    while (index < words.length) {
      const i = index;
      index += 1;
      const word = words[i];
      onProgress?.({ phase: "audio", done: i, total });

      const existing = await getCachedAudioBlob(word.english);
      if (existing) {
        cached += 1;
        byteSize += existing.size;
        continue;
      }

      // Same-origin proxy fetches only trusted English TTS providers.
      const sourceUrl = audioSourceForWord(word);
      const blob = await fetchAudioBlob(sourceUrl);
      if (!blob) continue;

      await putAudioRecord({
        key: audioKey(word.english),
        wordId: word.id,
        english: word.english,
        sourceUrl,
        blob,
        byteSize: blob.size,
        cachedAt: new Date().toISOString(),
      });
      cached += 1;
      byteSize += blob.size;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, words.length)) }, () => worker())
  );

  onProgress?.({ phase: "audio", done: total, total });
  return { cached, byteSize };
}

/** Prefetch next words into memory so play starts instantly. */
export async function warmAudioMemory(englishList: string[]): Promise<void> {
  await openAudioDb();
  await Promise.all(
    englishList.slice(0, 8).map(async (english) => {
      const url = await getCachedAudioObjectUrl(english);
      if (!url) return;
      // Decode ahead of time.
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = url;
    })
  );
}
