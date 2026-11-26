"use client";

import {
  cacheWordAudioClips,
  clearAllCachedAudio,
  removeCachedAudioForWords,
  sumCachedAudioBytes,
  type AudioDownloadProgress,
} from "@/lib/offlineAudio";
import {
  utf8ByteLength,
  type OfflineManifestResponse,
  type OfflinePackDataMap,
  type OfflinePackId,
  type StoredOfflinePack,
} from "@/lib/offlinePacks";
import type { Word } from "@/types";

const DB_NAME = "mimo-offline-packs-v1";
const DB_VERSION = 2;
const STORE_NAME = "packs";
const AUDIO_STORE = "audio";
const LS_PREFIX = "mimo-offline-pack:";
/** Must match next.config.mjs NetworkFirst cacheName for public shells. */
const OFFLINE_SHELL_CACHE = "mimo-public-pages-v1";
/** Legacy cache name from earlier warmers — still checked by OfflineSmartLink. */
const LEGACY_OFFLINE_SHELL_CACHE = "mimo-offline-pages-v1";

const OFFLINE_PAGE_URLS = [
  "/",
  "/offline",
  "/offline/quiz",
  "/offline/match",
  "/offline/word-check",
  "/offline/listen",
  "/offline/read",
  "/~offline",
  "/about",
  "/nasil-kullanilir",
  "/quiz",
  "/quiz/match",
  "/quiz/word-check",
  "/det/listen-type",
  "/det/read-complete",
  "/grammar",
  "/reading",
];

export type DownloadProgress = AudioDownloadProgress & {
  authorId?: string | null;
};

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<K extends OfflinePackId>(id: K): Promise<StoredOfflinePack<K> | null> {
  const db = await openDb();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          db.close();
          resolve((req.result as StoredOfflinePack<K> | undefined) ?? null);
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    });
  }

  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${id}`);
    return raw ? (JSON.parse(raw) as StoredOfflinePack<K>) : null;
  } catch {
    return null;
  }
}

async function idbSet<K extends OfflinePackId>(pack: StoredOfflinePack<K>): Promise<void> {
  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(pack);
        req.onsuccess = () => {
          db.close();
          resolve();
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      } catch (err) {
        db.close();
        reject(err);
      }
    }).catch(() => {
      // fallback below
    });
  }

  try {
    if (pack.byteSize < 2_500_000) {
      localStorage.setItem(`${LS_PREFIX}${pack.id}`, JSON.stringify(pack));
    }
  } catch {
    // ignore localStorage quota errors when IndexedDB holds the pack
  }
}

async function idbDelete(id: OfflinePackId): Promise<void> {
  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => {
          db.close();
          resolve();
        };
        req.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }
  try {
    localStorage.removeItem(`${LS_PREFIX}${id}`);
  } catch {
    // ignore
  }
}

export async function getStoredPack<K extends OfflinePackId>(
  id: K
): Promise<StoredOfflinePack<K> | null> {
  if (typeof window === "undefined") return null;
  return idbGet(id);
}

export async function getAllStoredPacks(): Promise<Partial<Record<OfflinePackId, StoredOfflinePack>>> {
  const ids: OfflinePackId[] = ["words", "det"];
  const results = await Promise.all(ids.map((id) => getStoredPack(id)));
  const map: Partial<Record<OfflinePackId, StoredOfflinePack>> = {};
  ids.forEach((id, idx) => {
    const res = results[idx];
    if (res) map[id] = res;
  });
  return map;
}

export async function removeStoredPack(id: OfflinePackId): Promise<void> {
  if (id === "words") {
    const existing = await getStoredPack("words");
    if (existing?.data?.length) {
      await removeCachedAudioForWords(existing.data);
    } else {
      await clearAllCachedAudio();
    }
  }
  await idbDelete(id);
  emitOfflinePacksUpdated();
}

/** Remove one author's words (and their audio) from the merged words pack. */
export async function removeAuthorFromWordsPack(authorId: string): Promise<void> {
  const existing = await getStoredPack("words");
  if (!existing) return;

  const keep = existing.data.filter((w) => w.created_by !== authorId);
  const removed = existing.data.filter((w) => w.created_by === authorId);
  if (removed.length === 0) return;

  // Only drop audio for English keys no other remaining author still needs.
  const keepEnglish = new Set(keep.map((w) => w.english.trim().toLowerCase()));
  const audioToRemove = removed.filter(
    (w) => !keepEnglish.has(w.english.trim().toLowerCase())
  );
  await removeCachedAudioForWords(audioToRemove);

  if (keep.length === 0) {
    await idbDelete("words");
    emitOfflinePacksUpdated();
    return;
  }

  const jsonBytes = utf8ByteLength(keep);
  const audioByteSize = await sumCachedAudioBytes(keep.map((w) => w.english));
  const maxId = keep.reduce((acc, w) => Math.max(acc, w.id), 0);
  const authorIds = Array.from(
    new Set(keep.map((w) => w.created_by).filter((id): id is string => Boolean(id)))
  );

  const updated: StoredOfflinePack<"words"> = {
    id: "words",
    data: keep,
    itemCount: keep.length,
    byteSize: jsonBytes + audioByteSize,
    audioByteSize,
    maxId,
    version: `${keep.length}:${maxId}:${jsonBytes}`,
    syncedAt: new Date().toISOString(),
    source: existing.source,
    authorIds,
  };
  await idbSet(updated);
  emitOfflinePacksUpdated();
}

export async function warmOfflineRouteCache(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  try {
    const cache = await caches.open(OFFLINE_SHELL_CACHE);
    await Promise.allSettled(
      OFFLINE_PAGE_URLS.map(async (url) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          // Same-origin navigate shells for the SW NetworkFirst cache.
          const res = await fetch(url, {
            credentials: "same-origin",
            cache: "no-cache",
            signal: controller.signal,
            headers: { Accept: "text/html" },
          });
          if (res.ok) {
            await cache.put(url, res.clone());
            // Absolute key helps some SW matchers.
            await cache.put(new URL(url, window.location.origin).href, res.clone());
          }
        } finally {
          clearTimeout(timer);
        }
      })
    );
    // Drop legacy cache so OfflineSmartLink + SW agree on one store.
    await caches.delete(LEGACY_OFFLINE_SHELL_CACHE).catch(() => false);
  } catch {
    // non-fatal
  }
}

export function emitOfflinePacksUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mimo-offline-packs-updated"));
  }
}

export async function fetchOfflineManifest(
  sinceWordId = 0,
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<OfflineManifestResponse> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Çevrimdışı");
  }

  const qs = sinceWordId > 0 ? `?mode=manifest&sinceWordId=${sinceWordId}` : "?mode=manifest";
  // Manifest is cache-peek only for audio sizes — keep a tight client budget.
  const timeoutMs = options?.timeoutMs ?? 6000;
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onOuterAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`/api/offline-packs${qs}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error("Paket bilgileri alınamadı");
    }
    return (await res.json()) as OfflineManifestResponse;
  } finally {
    clearTimeout(timer);
    options?.signal?.removeEventListener("abort", onOuterAbort);
  }
}

type PackApiResponse<K extends OfflinePackId> = {
  ok: boolean;
  pack: K;
  authorId?: string | null;
  incremental?: boolean;
  itemCount: number;
  byteSize: number;
  maxId: number;
  version: string;
  source: "supabase" | "builtin";
  items: OfflinePackDataMap[K];
};

function mergeWords(existing: Word[], incoming: Word[]): Word[] {
  const map = new Map<number, Word>();
  for (const w of existing) map.set(w.id, w);
  for (const w of incoming) map.set(w.id, w);
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
}

async function persistWordsPack(
  words: Word[],
  source: "supabase" | "builtin",
  audioByteSize: number
): Promise<StoredOfflinePack<"words">> {
  const jsonBytes = utf8ByteLength(words);
  const maxId = words.reduce((acc, w) => Math.max(acc, w.id), 0);
  const authorIds = Array.from(
    new Set(words.map((w) => w.created_by).filter((id): id is string => Boolean(id)))
  );
  const stored: StoredOfflinePack<"words"> = {
    id: "words",
    data: words,
    itemCount: words.length,
    byteSize: jsonBytes + audioByteSize,
    audioByteSize,
    maxId,
    version: `${words.length}:${maxId}:${jsonBytes}`,
    syncedAt: new Date().toISOString(),
    source,
    authorIds,
  };
  await idbSet(stored);
  return stored;
}

export async function downloadOfflinePack<K extends OfflinePackId>(
  id: K,
  options?: {
    authorId?: string | null;
    onProgress?: (progress: DownloadProgress) => void;
  }
): Promise<{ pack: StoredOfflinePack<K>; addedCount: number }> {
  const authorId = options?.authorId?.trim() || null;
  const onProgress = options?.onProgress;
  const existing = await getStoredPack(id);

  if (id === "det") {
    onProgress?.({ phase: "words", done: 0, total: 1 });
    const res = await fetch(`/api/offline-packs?pack=det`, { cache: "no-store" });
    if (!res.ok) throw new Error("DET paketi indirilemedi");
    const payload = (await res.json()) as PackApiResponse<"det">;
    const stored: StoredOfflinePack<"det"> = {
      id: "det",
      data: payload.items,
      itemCount: payload.items.length,
      byteSize: payload.byteSize || utf8ByteLength(payload.items),
      maxId: payload.maxId,
      version: payload.version,
      syncedAt: new Date().toISOString(),
      source: payload.source,
    };
    await idbSet(stored);
    void warmOfflineRouteCache();
    emitOfflinePacksUpdated();
    onProgress?.({ phase: "words", done: 1, total: 1 });
    return { pack: stored as StoredOfflinePack<K>, addedCount: payload.items.length };
  }

  // words pack (optionally scoped to one author)
  onProgress?.({ phase: "words", done: 0, total: 1, authorId });

  const qs = new URLSearchParams({ pack: "words" });
  if (authorId) qs.set("authorId", authorId);

  const res = await fetch(`/api/offline-packs?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Kelime paketi indirilemedi");
  const payload = (await res.json()) as PackApiResponse<"words">;

  onProgress?.({ phase: "words", done: 1, total: 1, authorId });

  const prevWords = (existing as StoredOfflinePack<"words"> | null)?.data ?? [];
  let merged: Word[];

  if (authorId) {
    const withoutAuthor = prevWords.filter((w) => w.created_by !== authorId);
    merged = mergeWords(withoutAuthor, payload.items);
  } else {
    merged = mergeWords([], payload.items);
  }

  const audioResult = await cacheWordAudioClips(payload.items, (p) =>
    onProgress?.({ ...p, authorId })
  );

  // Recompute audio size across the whole merged set when possible.
  const audioByteSize = await sumCachedAudioBytes(merged.map((w) => w.english));
  const stored = await persistWordsPack(
    merged,
    payload.source,
    audioByteSize || audioResult.byteSize
  );

  void warmOfflineRouteCache();
  emitOfflinePacksUpdated();

  const addedCount = authorId
    ? payload.items.length
    : Math.max(0, stored.itemCount - (existing?.itemCount ?? 0));

  return { pack: stored as StoredOfflinePack<K>, addedCount };
}

export type SyncResult = {
  checked: boolean;
  updatedPacks: OfflinePackId[];
  addedWords: number;
  addedBytes: number;
};

let inflightSync: Promise<SyncResult> | null = null;

export async function syncDownloadedPacksIfOnline(
  onProgress?: (progress: DownloadProgress) => void
): Promise<SyncResult> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { checked: false, updatedPacks: [], addedWords: 0, addedBytes: 0 };
  }

  if (inflightSync) return inflightSync;

  inflightSync = (async () => {
    try {
      const stored = await getAllStoredPacks();
      const downloadedIds = Object.keys(stored) as OfflinePackId[];
      if (downloadedIds.length === 0) {
        return { checked: false, updatedPacks: [], addedWords: 0, addedBytes: 0 };
      }

      const wordsPack = stored.words as StoredOfflinePack<"words"> | undefined;
      const manifest = await fetchOfflineManifest(wordsPack?.maxId ?? 0);

      const updatedPacks: OfflinePackId[] = [];
      let addedWords = 0;
      let addedBytes = 0;

      if (wordsPack && manifest.packs.words) {
        const remote = manifest.packs.words;
        const localAuthors = new Set(wordsPack.authorIds ?? []);
        const authorsToRefresh = (manifest.wordAuthors ?? []).filter((a) =>
          localAuthors.has(a.authorId)
        );

        const needsFullRefresh =
          localAuthors.size === 0 ||
          wordsPack.version !== remote.version ||
          wordsPack.itemCount !== remote.itemCount ||
          wordsPack.maxId !== remote.maxId;

        if (needsFullRefresh && authorsToRefresh.length > 0) {
          const prevBytes = wordsPack.byteSize;
          let added = 0;
          for (const author of authorsToRefresh) {
            const result = await downloadOfflinePack("words", {
              authorId: author.authorId,
              onProgress,
            });
            added = result.addedCount;
          }
          updatedPacks.push("words");
          const after = await getStoredPack("words");
          addedBytes += Math.max(0, (after?.byteSize ?? 0) - prevBytes);
          addedWords += added;
        } else if (needsFullRefresh && localAuthors.size === 0) {
          const prevBytes = wordsPack.byteSize;
          const result = await downloadOfflinePack("words", { onProgress });
          updatedPacks.push("words");
          addedBytes += Math.max(0, result.pack.byteSize - prevBytes);
          addedWords += result.addedCount;
        }
      }

      if (stored.det && manifest.packs.det) {
        const local = stored.det;
        const remote = manifest.packs.det;
        if (
          local.version !== remote.version ||
          local.itemCount !== remote.itemCount ||
          local.maxId !== remote.maxId
        ) {
          const prevBytes = local.byteSize;
          const result = await downloadOfflinePack("det", { onProgress });
          updatedPacks.push("det");
          addedBytes += Math.max(0, result.pack.byteSize - prevBytes);
        }
      }

      return { checked: true, updatedPacks, addedWords, addedBytes };
    } catch {
      return { checked: false, updatedPacks: [], addedWords: 0, addedBytes: 0 };
    } finally {
      inflightSync = null;
    }
  })();

  return inflightSync;
}
