import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_DET_READ_COMPLETE, DEMO_DUE_WORDS } from "@/lib/demo";
import {
  ensureAudioSizeCacheReady,
  measureWordAudioBytes,
  peekCachedWordAudioBytes,
} from "@/lib/measureOfflineAudio";
import {
  groupWordsByAuthor,
  type OfflineManifestResponse,
  type OfflinePackId,
  type OfflinePackMeta,
} from "@/lib/offlinePacks";
import type { DETExercise, Word } from "@/types";

/**
 * Instant sizes from in-memory cache only; warm missing clips in the background.
 * Never blocks the pack list on remote audio probes.
 */
async function audioSizesForManifest(words: Word[]) {
  await ensureAudioSizeCacheReady();
  const peeked = peekCachedWordAudioBytes(words);
  const complete =
    peeked.totalUnique === 0 || peeked.measuredCount >= peeked.totalUnique;

  if (!complete) {
    void measureWordAudioBytes(words).catch(() => undefined);
  }

  // Extrapolate from known clips so undownloaded badges stay honest-ish
  // without inventing a flat 24 KB guess.
  let byEnglish: Record<string, number> | null = { ...peeked.byEnglish };
  let totalAudioBytes = peeked.totalAudioBytes;

  if (!complete && peeked.measuredCount > 0) {
    const avg =
      Object.values(peeked.byEnglish).reduce((a, b) => a + b, 0) /
      peeked.measuredCount;
    const unique = new Map<string, Word>();
    for (const w of words) {
      const key = w.english.trim().toLowerCase();
      if (key) unique.set(key, w);
    }
    byEnglish = {};
    totalAudioBytes = 0;
    for (const [key] of Array.from(unique.entries())) {
      const bytes = peeked.byEnglish[key] ?? Math.round(avg);
      byEnglish[key] = bytes;
    }
    for (const w of words) {
      const key = w.english.trim().toLowerCase();
      totalAudioBytes += byEnglish[key] ?? 0;
    }
  } else if (!complete && peeked.measuredCount === 0) {
    // No measurements yet — JSON only; background warm fills next refresh.
    byEnglish = null;
    totalAudioBytes = 0;
  }

  return {
    totalAudioBytes,
    byEnglish,
    audioSizeMeasured: complete,
  };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getPublicSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function byteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

/** Demo words that look like community uploads (have created_by). */
function fallbackCommunityWords(): Word[] {
  return DEMO_DUE_WORDS.filter((d) => d.words?.created_by).map((d) => d.words);
}

async function fetchCommunityWords(
  supabase: SupabaseClient | null,
  options: { sinceId?: number; authorId?: string | null } = {}
): Promise<{ items: Word[]; source: "supabase" | "builtin" }> {
  const sinceId = options.sinceId ?? 0;
  const authorId = options.authorId?.trim() || null;

  if (!supabase) {
    let items = fallbackCommunityWords().filter((w) => w.id > sinceId);
    if (authorId) items = items.filter((w) => w.created_by === authorId);
    return { items, source: "builtin" };
  }

  try {
    const all: Word[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      let query = supabase
        .from("words")
        .select(
          "id, english, turkish, example_sentence, difficulty, phonetic, audio_url, is_global, created_by, uploader_username, uploader_avatar_url"
        )
        .eq("is_global", true)
        .not("created_by", "is", null)
        .gt("id", sinceId)
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (authorId) {
        query = query.eq("created_by", authorId);
      }

      const { data, error } = await query;

      if (error) {
        // Older schemas without visibility columns — fall back to demo community set.
        if (/is_global|created_by|uploader_/i.test(error.message || "")) {
          let items = fallbackCommunityWords().filter((w) => w.id > sinceId);
          if (authorId) items = items.filter((w) => w.created_by === authorId);
          return { items, source: "builtin" };
        }
        throw error;
      }

      const rows = (data ?? []) as unknown as Word[];
      all.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    }

    if (all.length === 0 && sinceId === 0 && !authorId) {
      return { items: fallbackCommunityWords(), source: "builtin" };
    }

    return { items: all, source: "supabase" };
  } catch {
    let items = fallbackCommunityWords().filter((w) => w.id > sinceId);
    if (authorId) items = items.filter((w) => w.created_by === authorId);
    return { items, source: "builtin" };
  }
}

async function fetchPublicDet(
  supabase: SupabaseClient | null
): Promise<{ items: DETExercise[]; source: "supabase" | "builtin" }> {
  if (!supabase) {
    return { items: DEMO_DET_READ_COMPLETE, source: "builtin" };
  }

  try {
    const { data, error } = await supabase
      .from("det_exercises")
      .select("id, question_type_id, question_text, correct_answer, difficulty, topic, created_at")
      .order("id", { ascending: true });

    if (error) throw error;
    const rows = (data ?? []) as DETExercise[];
    if (rows.length === 0) {
      return { items: DEMO_DET_READ_COMPLETE, source: "builtin" };
    }
    return { items: rows, source: "supabase" };
  } catch {
    return { items: DEMO_DET_READ_COMPLETE, source: "builtin" };
  }
}

function buildMeta(
  id: OfflinePackId,
  itemCount: number,
  bytes: number,
  maxId: number,
  source: "supabase" | "builtin",
  extra?: { pendingNewCount?: number; pendingNewBytes?: number }
): OfflinePackMeta {
  return {
    id,
    itemCount,
    byteSize: bytes,
    maxId,
    version: `${itemCount}:${maxId}:${bytes}`,
    source,
    ...extra,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const packParam = searchParams.get("pack") as OfflinePackId | null;
  const authorId = searchParams.get("authorId")?.trim() || null;
  const sinceIdRaw = Number(searchParams.get("sinceId") ?? "0");
  const sinceId = Number.isFinite(sinceIdRaw) && sinceIdRaw > 0 ? Math.floor(sinceIdRaw) : 0;
  const sinceWordIdRaw = Number(searchParams.get("sinceWordId") ?? "0");
  const sinceWordId =
    Number.isFinite(sinceWordIdRaw) && sinceWordIdRaw > 0 ? Math.floor(sinceWordIdRaw) : 0;

  const supabase = getPublicSupabase();

  if (packParam === "words") {
    const { items, source } = await fetchCommunityWords(supabase, { sinceId, authorId });
    const maxId = items.reduce((acc, w) => Math.max(acc, w.id), sinceId);
    const jsonBytes = byteSize(items);
    const audio = await audioSizesForManifest(items);
    const bytes = jsonBytes + audio.totalAudioBytes;

    return NextResponse.json({
      ok: true,
      pack: "words",
      authorId,
      incremental: sinceId > 0,
      sinceId,
      itemCount: items.length,
      byteSize: bytes,
      jsonByteSize: jsonBytes,
      audioByteSize: audio.totalAudioBytes,
      audioSizeMeasured: audio.audioSizeMeasured,
      maxId,
      version: `${items.length}:${maxId}:${jsonBytes}:${audio.totalAudioBytes}`,
      source,
      items,
    });
  }

  if (packParam === "det") {
    const { items, source } = await fetchPublicDet(supabase);
    const bytes = byteSize(items);
    const maxId = items.reduce((acc, d) => Math.max(acc, d.id), 0);

    return NextResponse.json({
      ok: true,
      pack: "det",
      incremental: false,
      itemCount: items.length,
      byteSize: bytes,
      maxId,
      version: `${items.length}:${maxId}:${bytes}`,
      source,
      items,
    });
  }

  const [wordsRes, detRes] = await Promise.all([
    fetchCommunityWords(supabase, { sinceId: 0 }),
    fetchPublicDet(supabase),
  ]);

  const audio = await audioSizesForManifest(wordsRes.items);
  const wordAuthors = groupWordsByAuthor(wordsRes.items, audio.byEnglish);
  const wordsJsonBytes = byteSize(wordsRes.items);
  const wordsBytes = wordsJsonBytes + audio.totalAudioBytes;
  const wordsMaxId = wordsRes.items.reduce((acc, w) => Math.max(acc, w.id), 0);
  const newWords = sinceWordId > 0 ? wordsRes.items.filter((w) => w.id > sinceWordId) : [];

  const detBytes = byteSize(detRes.items);
  const detMaxId = detRes.items.reduce((acc, d) => Math.max(acc, d.id), 0);

  let pendingNewBytes = 0;
  if (newWords.length > 0) {
    const pendingAudio = await audioSizesForManifest(newWords);
    pendingNewBytes = byteSize(newWords) + pendingAudio.totalAudioBytes;
  }

  const packs: Record<OfflinePackId, OfflinePackMeta> = {
    words: buildMeta(
      "words",
      wordsRes.items.length,
      wordsBytes,
      wordsMaxId,
      wordsRes.source,
      {
        pendingNewCount: newWords.length,
        pendingNewBytes,
      }
    ),
    det: buildMeta("det", detRes.items.length, detBytes, detMaxId, detRes.source),
  };

  const anySupabase = Object.values(packs).some((p) => p.source === "supabase");
  const totalBytes =
    wordAuthors.reduce((sum, a) => sum + a.byteSize + a.audioByteSize, 0) + detBytes;

  const manifest: OfflineManifestResponse = {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: anySupabase ? "supabase" : "builtin",
    totalBytes,
    packs,
    wordAuthors,
  };

  return NextResponse.json(manifest);
}
