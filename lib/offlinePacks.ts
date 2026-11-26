import { englishTtsProxyUrl, isTrustedEnglishAudioUrl } from "@/lib/englishTts";
import type { DETExercise, Word } from "@/types";

export { englishTtsProxyUrl as englishTtsFallbackUrl, isTrustedEnglishAudioUrl } from "@/lib/englishTts";

export type OfflinePackId = "words" | "det";

export type OfflinePackDescriptor = {
  id: OfflinePackId;
  title: string;
  subtitle: string;
  badge: string;
  accent: "blue" | "orange";
  supportsIncremental: boolean;
};

export const OFFLINE_PACK_DESCRIPTORS: OfflinePackDescriptor[] = [
  {
    id: "words",
    title: "Sınıf Kelime Paketleri",
    subtitle:
      "Öğretmen veya arkadaşların paylaştığı kelimeler; kim eklediyse görünür, telaffuz sesleriyle birlikte.",
    badge: "Kelime + ses",
    accent: "blue",
    supportsIncremental: true,
  },
  {
    id: "det",
    title: "Okuma Pasaj Paketi",
    subtitle: "Boşluk doldurma pasajları — hazırlık okuma pratiği için.",
    badge: "Okuma pratiği",
    accent: "orange",
    supportsIncremental: false,
  },
];

export type OfflineWordAuthorPack = {
  authorId: string;
  username: string;
  avatarUrl: string | null;
  itemCount: number;
  /** JSON size of word rows (without audio blobs). */
  byteSize: number;
  audioUrlCount: number;
  /** Measured remote audio payload size (bytes). */
  audioByteSize: number;
  /** @deprecated alias of audioByteSize for older clients */
  estimatedAudioBytes: number;
  /** True when audioByteSize came from Content-Length / blob measure. */
  audioSizeMeasured: boolean;
  maxId: number;
  version: string;
};

export type OfflinePackDataMap = {
  words: Word[];
  det: DETExercise[];
};

export type OfflinePackMeta = {
  id: OfflinePackId;
  itemCount: number;
  byteSize: number;
  maxId: number;
  version: string;
  source: "supabase" | "builtin";
  pendingNewCount?: number;
  pendingNewBytes?: number;
};

export type OfflineManifestResponse = {
  ok: boolean;
  generatedAt: string;
  source: "supabase" | "builtin";
  totalBytes: number;
  packs: Record<OfflinePackId, OfflinePackMeta>;
  /** Community word packs grouped by uploader. */
  wordAuthors: OfflineWordAuthorPack[];
};

export type StoredOfflinePack<K extends OfflinePackId = OfflinePackId> = {
  id: K;
  data: OfflinePackDataMap[K];
  itemCount: number;
  byteSize: number;
  maxId: number;
  version: string;
  syncedAt: string;
  source: "supabase" | "builtin";
  /** Extra bytes from cached pronunciation blobs (words pack). */
  audioByteSize?: number;
  /** Author IDs included in this local words merge. */
  authorIds?: string[];
};

export const ESTIMATED_AUDIO_BYTES_PER_CLIP = 24_000;

export function formatMegabytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const safe = Math.max(0, bytes);
  if (safe < 1024 * 1024) {
    const kb = safe / 1024;
    if (kb < 10) return `${kb.toFixed(1)} KB`;
    return `${Math.round(kb)} KB`;
  }
  const mb = safe / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export function formatExactDataSize(bytes: number): { mbLabel: string; kbLabel: string } {
  const safe = Math.max(0, Number.isFinite(bytes) ? bytes : 0);
  const kb = safe / 1024;
  return {
    mbLabel: formatMegabytes(safe),
    kbLabel: kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`,
  };
}

export function utf8ByteLength(value: unknown): number {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(json).length;
  }
  return json.length;
}

export function groupWordsByAuthor(
  words: Word[],
  audioBytesByEnglish?: Record<string, number> | null
): OfflineWordAuthorPack[] {
  const map = new Map<
    string,
    {
      authorId: string;
      username: string;
      avatarUrl: string | null;
      items: Word[];
    }
  >();

  for (const word of words) {
    const authorId = word.created_by?.trim();
    if (!authorId) continue;
    const existing = map.get(authorId);
    if (existing) {
      existing.items.push(word);
      if (!existing.avatarUrl && word.uploader_avatar_url) {
        existing.avatarUrl = word.uploader_avatar_url;
      }
      if (
        (!existing.username || existing.username === "Bir kullanıcı") &&
        word.uploader_username?.trim()
      ) {
        existing.username = word.uploader_username.trim();
      }
    } else {
      map.set(authorId, {
        authorId,
        username: word.uploader_username?.trim() || "Bir kullanıcı",
        avatarUrl: word.uploader_avatar_url ?? null,
        items: [word],
      });
    }
  }

  const packs: OfflineWordAuthorPack[] = Array.from(map.values()).map((group) => {
    const maxId = group.items.reduce((acc: number, w: Word) => Math.max(acc, w.id), 0);
    const byteSize = utf8ByteLength(group.items);
    const audioUrlCount = group.items.filter((w: Word) => Boolean(w.audio_url?.trim())).length;
    // Prefer measured map; never invent a flat per-clip guess (caused 1 MB → real KB jumps).
    const audioByteSize =
      audioBytesByEnglish != null
        ? group.items.reduce((sum, w) => {
            const key = w.english.trim().toLowerCase();
            return sum + (audioBytesByEnglish[key] ?? 0);
          }, 0)
        : 0;
    return {
      authorId: group.authorId,
      username: group.username,
      avatarUrl: group.avatarUrl,
      itemCount: group.items.length,
      byteSize,
      audioUrlCount,
      audioByteSize,
      estimatedAudioBytes: audioByteSize,
      audioSizeMeasured: audioBytesByEnglish != null,
      maxId,
      version: `${group.items.length}:${maxId}:${byteSize}:${audioByteSize}`,
    };
  });

  return packs.sort(
    (a, b) => b.itemCount - a.itemCount || a.username.localeCompare(b.username, "tr")
  );
}

/** @deprecated use groupWordsByAuthor(words, audioMap) */
export function groupWordsByAuthorLegacy(words: Word[]): OfflineWordAuthorPack[] {
  return groupWordsByAuthor(words);
}

export function audioSourceForWord(word: Pick<Word, "english" | "audio_url">): string {
  const direct = word.audio_url?.trim();
  if (direct && isTrustedEnglishAudioUrl(direct)) {
    return englishTtsProxyUrl(word.english, direct);
  }
  return englishTtsProxyUrl(word.english);
}
